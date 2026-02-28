import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';

interface UserProfile {
  username: string;
  email: string;
  phone: string;
  password: string;
  fullName: string;
  address: string;
  isAdult: boolean;
}

const SPECIAL_CHARACTERS = '!@#$%^&*';
const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[${SPECIAL_CHARACTERS.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]).{10,}$`
);
const PHONE_PATTERN = /^\d{10}$/;
const USER_PROFILE_KEY = 'userProfile';

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value ?? '';
    const confirmPassword = control.get('confirmPassword')?.value ?? '';
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  };
}

@Component({
  selector: 'app-user-page',
  imports: [
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
  templateUrl: './user.page.html',
  styleUrl: './user.page.css'
})
export class UserPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  readonly profileForm = this.fb.group(
    {
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', [Validators.required]],
      fullName: ['', [Validators.required, Validators.minLength(5)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      isAdult: [false, [Validators.requiredTrue]]
    },
    { validators: passwordsMatchValidator() }
  );

  ngOnInit(): void {
    this.loadProfile();
  }

  controlHasError(controlName: keyof typeof this.profileForm.controls): boolean {
    const control = this.profileForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  get hasPasswordMismatch(): boolean {
    return (
      this.profileForm.hasError('passwordMismatch') &&
      (this.profileForm.controls.confirmPassword.dirty || this.profileForm.controls.confirmPassword.touched)
    );
  }

  private loadProfile(): void {
    const rawProfile = localStorage.getItem(USER_PROFILE_KEY);
    if (rawProfile) {
      try {
        const profile = JSON.parse(rawProfile) as Partial<UserProfile>;
        this.profileForm.patchValue({
          username: profile.username ?? '',
          email: profile.email ?? '',
          phone: profile.phone ?? '',
          password: profile.password ?? '',
          confirmPassword: profile.password ?? '',
          fullName: profile.fullName ?? '',
          address: profile.address ?? '',
          isAdult: profile.isAdult ?? false
        });
        return;
      } catch {
        localStorage.removeItem(USER_PROFILE_KEY);
      }
    }

    const authUsername = sessionStorage.getItem('authUser') ?? '';
    if (authUsername) {
      this.profileForm.patchValue({ username: authUsername });
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Perfil incompleto',
        detail: 'Debes completar todos los campos del perfil.'
      });
      return;
    }

    const value = this.profileForm.getRawValue();
    const profile: UserProfile = {
      username: value.username?.trim().toLowerCase() ?? '',
      email: value.email?.trim().toLowerCase() ?? '',
      phone: value.phone ?? '',
      password: value.password ?? '',
      fullName: value.fullName?.trim() ?? '',
      address: value.address?.trim() ?? '',
      isAdult: value.isAdult ?? false
    };

    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    this.profileForm.patchValue({ confirmPassword: profile.password });
    this.messageService.add({
      severity: 'success',
      summary: 'Perfil actualizado',
      detail: 'Tus datos se guardaron correctamente.'
    });
  }
}
