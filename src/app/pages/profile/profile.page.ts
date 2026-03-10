import { Component, DestroyRef, OnInit, inject, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TicketsMockService } from '../../services/tickets-mock.service';
import { Ticket } from '../../models/ticket.model';
import { Subscription } from 'rxjs';
import { DatePipe } from '@angular/common';

interface UserProfile {
  username: string;
  email: string;
  phone: string;
  password: string;
  fullName: string;
  address: string;
  isAdult: boolean;
  isActive: boolean;
}

interface RegisteredUser {
  username: string;
  email: string;
  password: string;
  isActive?: boolean;
}

const SPECIAL_CHARACTERS = '!@#$%^&*';
const PASSWORD_PATTERN = new RegExp(
  `^(?=.*[${SPECIAL_CHARACTERS.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]).{10,}$`
);
const PHONE_PATTERN = /^\d{10}$/;
const NO_WHITESPACE_PATTERN = /^\S+$/;
const USER_PROFILE_KEY = 'userProfile';
const REGISTERED_USERS_KEY = 'registeredUsers';

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value ?? '';
    const confirmPassword = control.get('confirmPassword')?.value ?? '';
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  };
}

@Component({
  selector: 'app-profile-page',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    KeyFilterModule,
    MessageModule,
    PasswordModule,
    ToastModule,
    TableModule,
    TagModule,
    DatePipe
  ],
  providers: [MessageService],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css'
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ticketsMockService = inject(TicketsMockService);
  private readonly sub = new Subscription();

  isAccountActive = true;
  deactivateDialogVisible = false;

  userTickets: Ticket[] = [];
  openTicketsCount = 0;
  inProgressTicketsCount = 0;
  closedTicketsCount = 0;

  readonly profileForm = this.fb.group(
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

  ngOnInit(): void {
    this.loadProfile();
    this.loadUserTickets();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
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

  private loadUserTickets(): void {
    this.sub.add(
      this.ticketsMockService.getAll().subscribe((allTickets) => {
        const currentAuthUser = (sessionStorage.getItem('authUser') ?? '').toLowerCase();
        const fullName = (this.profileForm.get('fullName')?.value ?? '').toLowerCase();

        this.userTickets = allTickets.filter(ticket => {
          const assignee = (ticket.assignee || '').toLowerCase();
          return assignee === currentAuthUser || (fullName && assignee === fullName) || assignee.includes(currentAuthUser);
        });

        this.openTicketsCount = this.userTickets.filter(t => t.status === 'pendiente').length;
        this.inProgressTicketsCount = this.userTickets.filter(t => t.status === 'en_progreso' || t.status === 'revision').length;
        this.closedTicketsCount = this.userTickets.filter(t => t.status === 'hecho' || t.status === 'bloqueado').length;
      })
    );
  }

  stateSeverity(state: string): 'danger' | 'warn' | 'success' | 'info' | 'secondary' {
    if (state === 'hecho') return 'success';
    if (state === 'pendiente') return 'info';
    if (state === 'en_progreso') return 'warn';
    if (state === 'revision') return 'secondary';
    return 'danger';
  }

  prioritySeverity(priority: string): 'danger' | 'warn' | 'success' | 'info' {
    if (priority === 'alta') return 'danger';
    if (priority === 'media') return 'warn';
    if (priority === 'baja') return 'success';
    return 'info';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      en_progreso: 'En Progreso',
      revision: 'Revisión',
      hecho: 'Hecho',
      bloqueado: 'Bloqueado'
    };
    return map[status] || status;
  }

  priorityLabel(priority: string): string {
    const map: Record<string, string> = {
      alta: 'Alta',
      media: 'Media',
      baja: 'Baja'
    };
    return map[priority] || priority;
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
        this.isAccountActive = profile.isActive ?? true;
        this.toggleFormByStatus();
        return;
      } catch {
        localStorage.removeItem(USER_PROFILE_KEY);
      }
    }

    const authUsername = sessionStorage.getItem('authUser') ?? '';
    if (authUsername) {
      this.profileForm.patchValue({ username: authUsername });
      const userFromStorage = this.getStoredUsers().find((user) => user.username === authUsername.toLowerCase());
      this.isAccountActive = userFromStorage?.isActive ?? true;
      this.toggleFormByStatus();
    }
  }

  saveProfile(): void {
    if (!this.isAccountActive) {
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Perfil incompleto',
        detail: 'Debes completar todos los campos del perfil.'
      });
      return;
    }

    const currentAuthUser = (sessionStorage.getItem('authUser') ?? '').toLowerCase();
    const value = this.profileForm.getRawValue();
    const profile: UserProfile = {
      username: value.username?.trim().toLowerCase() ?? '',
      email: value.email?.trim().toLowerCase() ?? '',
      phone: value.phone ?? '',
      password: value.password ?? '',
      fullName: value.fullName?.trim() ?? '',
      address: value.address?.trim() ?? '',
      isAdult: value.isAdult ?? false,
      isActive: this.isAccountActive
    };

    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    this.updateRegisteredUser(profile, currentAuthUser);
    sessionStorage.setItem('authUser', profile.username);
    this.profileForm.patchValue({ confirmPassword: profile.password });
    this.messageService.add({
      severity: 'success',
      summary: 'Perfil actualizado',
      detail: 'Tus datos se guardaron correctamente.'
    });
  }

  openDeactivateDialog(): void {
    this.deactivateDialogVisible = true;
  }

  closeDeactivateDialog(): void {
    this.deactivateDialogVisible = false;
  }

  deactivateAccount(): void {
    this.isAccountActive = false;
    this.persistCurrentStatusOnly();
    this.toggleFormByStatus();
    this.closeDeactivateDialog();
    this.messageService.add({
      severity: 'warn',
      summary: 'Cuenta desactivada',
      detail: 'Tu cuenta quedo en estado logico desactivado.'
    });
  }

  activateAccount(): void {
    this.isAccountActive = true;
    this.persistCurrentStatusOnly();
    this.toggleFormByStatus();
    this.messageService.add({
      severity: 'success',
      summary: 'Cuenta restaurada',
      detail: 'Tu cuenta esta activa nuevamente.'
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

  private updateRegisteredUser(profile: UserProfile, currentAuthUser: string): void {
    const users = this.getStoredUsers();
    const targetIndex = users.findIndex((user) => user.username === currentAuthUser);

    if (targetIndex >= 0) {
      users[targetIndex] = {
        username: profile.username,
        email: profile.email,
        password: profile.password,
        isActive: profile.isActive
      };
    } else {
      users.push({
        username: profile.username,
        email: profile.email,
        password: profile.password,
        isActive: profile.isActive
      });
    }

    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  }

  private enforceNoWhitespace(controlName: 'username' | 'email'): void {
    const control = this.profileForm.controls[controlName];
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const sanitizedValue = (value ?? '').replace(/\s+/g, '');
      if (value !== sanitizedValue) {
        control.setValue(sanitizedValue, { emitEvent: false });
      }
    });
  }

  private persistCurrentStatusOnly(): void {
    const value = this.profileForm.getRawValue();
    const currentAuthUser = (sessionStorage.getItem('authUser') ?? '').toLowerCase();
    const profile: UserProfile = {
      username: value.username?.trim().toLowerCase() ?? currentAuthUser,
      email: value.email?.trim().toLowerCase() ?? '',
      phone: value.phone ?? '',
      password: value.password ?? '',
      fullName: value.fullName?.trim() ?? '',
      address: value.address?.trim() ?? '',
      isAdult: value.isAdult ?? false,
      isActive: this.isAccountActive
    };

    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    this.updateRegisteredUser(profile, currentAuthUser);
  }

  private toggleFormByStatus(): void {
    if (this.isAccountActive) {
      this.profileForm.enable({ emitEvent: false });
      return;
    }
    this.profileForm.disable({ emitEvent: false });
  }
}
