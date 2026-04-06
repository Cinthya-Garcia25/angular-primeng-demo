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
import { AuthService } from '../../../services/auth.service';

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
  private readonly fb            = inject(FormBuilder);
  private readonly router        = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly authService   = inject(AuthService);

  loading = false;

  readonly loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

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
        detail: 'Debes completar usuario y contraseña.'
      });
      return;
    }

    this.loading = true;
    const username = this.loginForm.controls.username.value?.trim().toLowerCase() ?? '';
    const password = this.loginForm.controls.password.value ?? '';

    this.authService.login(username, password).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ingreso exitoso',
          detail: `Bienvenido, ${username}. Por favor, selecciona un grupo.`
        });
        setTimeout(() => this.router.navigate(['/dashboard']), 800);
      },
      error: (err) => {
        const msg = err.error?.message ?? err.message ?? 'Usuario o contraseña incorrectos.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        this.loading = false;
      },
      complete: () => { this.loading = false; }
    });
  }
}
