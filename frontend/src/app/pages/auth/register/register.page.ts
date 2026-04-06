import { Component, DestroyRef, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';

import { AuthService } from '../../../services/auth.service';

const SPECIAL_CHARACTERS = '!@#$%^&*';
const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[${SPECIAL_CHARACTERS.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]).{10,}$`
);
const PHONE_PATTERN = /^\d{10}$/;
const NO_WHITESPACE_PATTERN = /^\S+$/;

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value ?? '';
    const confirmPassword = control.get('confirmPassword')?.value ?? '';
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  };
}

@Component({
  selector: 'app-register-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
    KeyFilterModule,
    MessageModule,
    PasswordModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './register.page.html',
  styleUrl: './register.page.css'
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  loading = false;

  readonly registerForm = this.fb.group(
    {
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(NO_WHITESPACE_PATTERN)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(NO_WHITESPACE_PATTERN)]],
      phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', [Validators.required]],
      fullName: ['', [Validators.required, Validators.minLength(5)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      isAdult: [false, [Validators.requiredTrue]]
    },
    { validators: passwordsMatchValidator() }
  );

  constructor() {
    this.enforceNoWhitespace('username');
    this.enforceNoWhitespace('email');
  }

  controlHasError(controlName: keyof typeof this.registerForm.controls): boolean {
    const control = this.registerForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  get hasPasswordMismatch(): boolean {
    return (
      this.registerForm.hasError('passwordMismatch') &&
      (this.registerForm.controls.confirmPassword.dirty || this.registerForm.controls.confirmPassword.touched)
    );
  }

  private enforceNoWhitespace(controlName: 'username' | 'email'): void {
    const control = this.registerForm.controls[controlName];
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const sanitizedValue = (value ?? '').replace(/\s+/g, '');
      if (value !== sanitizedValue) {
        control.setValue(sanitizedValue, { emitEvent: false });
      }
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Datos incompletos',
        detail: 'Corrige los errores antes de registrarte.'
      });
      return;
    }

    this.loading = true;

    const { username, email, password, fullName, phone, address } = this.registerForm.value;

    this.authService.register({
      username: username!.trim().toLowerCase(),
      email: email!.trim().toLowerCase(),
      password: password!,
      nombre_completo: fullName ?? undefined,
      telefono: phone ?? undefined,
      direccion: address ?? undefined
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Registro exitoso',
          detail: 'Cuenta creada correctamente. Ya puedes iniciar sesion.'
        });
        this.registerForm.reset({ isAdult: false });
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        const msg = err.error?.message ?? err.message ?? 'Error al registrar. Intenta de nuevo.';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg });
        this.loading = false;
      },
      complete: () => { this.loading = false; }
    });
  }
}
