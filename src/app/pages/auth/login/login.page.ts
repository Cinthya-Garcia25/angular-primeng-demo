import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

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
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  private readonly allowedCredentials = [
    { username: 'admin', password: 'Admin@1234' },
    { username: 'juan', password: 'Juan*2026#' },
    { username: 'maria', password: 'Maria$Secure9' }
  ];

  readonly loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  controlHasError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
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
    const credentialMatch = this.allowedCredentials.find(
      (credential) => credential.username === username && credential.password === password
    );

    if (credentialMatch) {
      this.messageService.add({
        severity: 'success',
        summary: 'Ingreso exitoso',
        detail: `Bienvenido, ${username}.`
      });
      this.router.navigate(['/pages/landing']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Credenciales invalidas',
      detail: 'Usuario o contrasena incorrectos.'
    });
  }
}
