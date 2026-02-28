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

interface RegisteredUser {
  username: string;
  email: string;
  password: string;
}

const SPECIAL_CHARACTERS = '!@#$%^&*';
const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[${SPECIAL_CHARACTERS.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]).{10,}$`
);
const PHONE_PATTERN = /^\d{10}$/;
const NO_WHITESPACE_PATTERN = /^\S+$/;
const REGISTERED_USERS_KEY = 'registeredUsers';

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

  private getStoredUsers(): RegisteredUser[] {
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
        (user): user is RegisteredUser =>
          typeof user?.username === 'string' &&
          typeof user?.email === 'string' &&
          typeof user?.password === 'string'
      );
    } catch {
      return [];
    }
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

    const username = this.registerForm.controls.username.value?.trim().toLowerCase() ?? '';
    const email = this.registerForm.controls.email.value?.trim().toLowerCase() ?? '';
    const password = this.registerForm.controls.password.value ?? '';

    const storedUsers = this.getStoredUsers();
    const existsUser = storedUsers.some((user) => user.username === username || user.email === email);

    if (existsUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Usuario existente',
        detail: 'El usuario o correo ya esta registrado.'
      });
      return;
    }

    const nextUsers: RegisteredUser[] = [...storedUsers, { username, email, password }];
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(nextUsers));

    this.messageService.add({
      severity: 'success',
      summary: 'Registro exitoso',
      detail: 'Cuenta creada correctamente. Ya puedes iniciar sesion.'
    });
    this.registerForm.reset({ isAdult: false });
    this.router.navigate(['/pages/auth/login']);
  }
}
