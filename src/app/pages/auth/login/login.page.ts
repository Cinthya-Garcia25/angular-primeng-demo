import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

interface AuthCredential {
  username: string;
  password: string;
}

const REGISTERED_USERS_KEY = 'registeredUsers';

@Component({
  selector: 'app-login-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  private readonly defaultCredentials: AuthCredential[] = [
    { username: 'admin', password: 'Admin@1234' },
    { username: 'ids15', password: 'Ids15@2026' },
    { username: 'cinthya', password: 'Invitado#2026' }
  ];

  readonly loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const loggedUser = sessionStorage.getItem('authUser');
    if (loggedUser) {
      this.router.navigate(['/pages/home']);
    }
  }

  controlHasError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private getStoredCredentials(): AuthCredential[] {
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!rawUsers) {
      return [];
    }

    try {
      const parsedUsers = JSON.parse(rawUsers);
      if (!Array.isArray(parsedUsers)) {
        return [];
      }

      return parsedUsers.filter(
        (user): user is AuthCredential =>
          typeof user?.username === 'string' && typeof user?.password === 'string'
      );
    } catch {
      return [];
    }
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Debes completar usuario y contrasena.'
      });
      return;
    }

    const username = this.loginForm.controls.username.value?.trim().toLowerCase() ?? '';
    const password = this.loginForm.controls.password.value ?? '';
    const credentialPool = [...this.defaultCredentials, ...this.getStoredCredentials()];
    const credentialMatch = credentialPool.find(
      (credential) => credential.username === username && credential.password === password
    );

    if (credentialMatch) {
      sessionStorage.setItem('authUser', credentialMatch.username);
      this.messageService.add({
        severity: 'success',
        summary: 'Ingreso exitoso',
        detail: `Bienvenido, ${username}.`
      });
      this.router.navigate(['/pages/home']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Credenciales invalidas',
      detail: 'Usuario o contrasena incorrectos.'
    });
  }
}
