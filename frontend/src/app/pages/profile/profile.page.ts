import { Component, ChangeDetectorRef, DestroyRef, OnInit, inject, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
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
import { PermissionsService } from '../../services/permissions.service';
import { DynamicPermissionsService } from '../../services/dynamic-permissions.service';
import { Permission } from '../../models/permissions.model';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface UserProfile {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  address: string;
  isAdult: boolean;
  isActive: boolean;
  hasPassword: boolean; // Nuevo campo para indicar si tiene contraseña
}

interface RegisteredUser {
  username: string;
  email: string;
  password: string;
  isActive?: boolean;
}

const SPECIAL_CHARACTERS = '!@#$%^&*';
const PASSWORD_PATTERN = new RegExp(`^(?=.*[${SPECIAL_CHARACTERS.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}]).{10,}$`);
const PHONE_PATTERN = /^\d{10}$/;
const NO_WHITESPACE_PATTERN = /^\S+$/;
const USER_PROFILE_KEY = 'userProfile';
const REGISTERED_USERS_KEY = 'registeredUsers';

function passwordsMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value ?? '';
    const confirmPassword = control.get('confirmPassword')?.value ?? '';
    
    // Solo validar si hay contenido en el campo password
    if (!password) {
      return null; // No validar si password está vacío
    }
    
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
  private readonly permissionsService = inject(PermissionsService);
  private readonly dynamicPermissionsService = inject(DynamicPermissionsService);
  private readonly http = inject(HttpClient);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly sub = new Subscription();

  hasPasswordSet = false; // Indica si el usuario tiene contraseña establecida
  passwordHint = ''; // Sugerencia visual de la contraseña (últimos caracteres)
  isAccountActive = true;
  deactivateDialogVisible = false;

  userTickets: Ticket[] = [];
  openTicketsCount = 0;
  inProgressTicketsCount = 0;
  closedTicketsCount = 0;

  readonly profileForm = this.fb.group({
      username:        ['', [Validators.required, Validators.minLength(3), Validators.pattern(NO_WHITESPACE_PATTERN)]],
      email:           ['', [Validators.required, Validators.email, Validators.pattern(NO_WHITESPACE_PATTERN)]],
      phone:           ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
      password:        ['', []], // Opcional - solo validar si tiene contenido
      confirmPassword: ['', []], // Opcional - solo validar si password tiene contenido
      fullName:        ['', [Validators.required, Validators.minLength(5)]],
      address:         ['', [Validators.required, Validators.minLength(10)]],
      isAdult:         [true, [Validators.requiredTrue]]
    }, { validators: passwordsMatchValidator() });

  constructor() {
    this.enforceNoWhitespace('username');
    this.enforceNoWhitespace('email');
  }

  ngOnInit(): void {
    this.dynamicPermissionsService.isReady().subscribe(() => {
      this.loadProfile();
      this.loadUserTickets();
    });

    // Recargar perfil cuando los permisos cambien (ej. tras un poll de 15 s)
    this.dynamicPermissionsService.onPermissionsChanged().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.loadProfile();
    });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get canViewProfile(): boolean {
    // El perfil siempre debe ser visible para usuarios autenticados
    return true;
  }

  get canEditProfile(): boolean {
    return this.permissionsService.hasPermission(Permission.USER_EDIT);
  }

  get canDeactivateAccount(): boolean {
    return this.permissionsService.hasPermission(Permission.USER_DEACTIVATED);
  }

  get canActivateAccount(): boolean {
    return this.permissionsService.hasPermission(Permission.USER_ACTIVATED);
  }

  controlHasError(controlName: keyof typeof this.profileForm.controls): boolean {
    const control = this.profileForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  get hasPasswordMismatch(): boolean {
    return !!this.profileForm.hasError('passwordMismatch') &&
      !!(this.profileForm.get('confirmPassword')?.dirty || this.profileForm.get('confirmPassword')?.touched);
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
    const map: Record<string, string> = { pendiente: 'Pendiente', en_progreso: 'En Progreso', revision: 'Revisión', hecho: 'Hecho', bloqueado: 'Bloqueado' };
    return map[status] || status;
  }

  priorityLabel(priority: string): string {
    const map: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };
    return map[priority] || priority;
  }

  private loadProfile(): void {
    // Primero intentar obtener datos del usuario desde el backend
    const authUserId = sessionStorage.getItem('authUserId');
    
    if (authUserId) {
      this.http.get<any>(`/api/users/${authUserId}`).pipe(
        catchError(error => {
          // Si falla el backend, intentar con localStorage como fallback
          this.loadProfileFromStorage();
          return of(null);
        })
      ).subscribe(userData => {
        if (userData && userData.data && userData.data.length > 0) {
          // El backend devuelve { statusCode, intOpCode, data: [{ ...user, groups }] }
          const userInfo = userData.data[0];
          this.loadProfileFromBackend(userInfo);
        } else {
          // Si no hay datos del backend, usar localStorage
          this.loadProfileFromStorage();
        }
      });
    } else {
      // Si no hay authUserId, usar localStorage
      this.loadProfileFromStorage();
    }
  }

  private loadProfileFromBackend(userData: any): void {
    // Verificar si el usuario tiene contraseña (si tiene password_hash, significa que tiene contraseña)
    this.hasPasswordSet = !!userData.password_hash;
    
    const formData = {
      username: userData.username ?? '', 
      email: userData.email ?? '', 
      phone: userData.telefono || '', 
      password: '', // No cargar contraseña desde backend
      confirmPassword: '', 
      fullName: userData.nombre_completo || '', 
      address: userData.direccion || '', 
      isAdult: true // Por defecto siempre marcado para facilitar el uso
    };
    
    // Actualizar el formulario directamente sin setTimeout
    this.profileForm.patchValue(formData);
    
    // Forzar actualización de la vista
    this.profileForm.updateValueAndValidity();
    this.changeDetectorRef.detectChanges();
    
    this.isAccountActive = userData.is_active ?? true;
    this.toggleFormByStatus();
  }

  private loadProfileFromStorage(): void {
    const rawProfile = localStorage.getItem(USER_PROFILE_KEY);
    if (rawProfile) {
      try {
        const profile = JSON.parse(rawProfile) as Partial<UserProfile>;
        this.profileForm.patchValue({ username: profile.username ?? '', email: profile.email ?? '', phone: profile.phone ?? '', password: profile.password ?? '', confirmPassword: profile.password ?? '', fullName: profile.fullName ?? '', address: profile.address ?? '', isAdult: profile.isAdult ?? false });
        this.isAccountActive = profile.isActive ?? true;
        this.hasPasswordSet = profile.hasPassword ?? false;
        this.toggleFormByStatus();
        return;
      } catch { localStorage.removeItem(USER_PROFILE_KEY); }
    }
    
    // Intentar obtener datos básicos del login almacenado en sessionStorage
    const authUser = sessionStorage.getItem('authUser');
    const authUserId = sessionStorage.getItem('authUserId');
    
    if (authUser && authUserId) {
      this.profileForm.patchValue({ username: authUser });
      
      // Intentar obtener datos adicionales del localStorage de auth
      try {
        const authUserData = localStorage.getItem('authUserData');
        if (authUserData) {
          const userData = JSON.parse(authUserData);
          this.profileForm.patchValue({
            email: userData.email || '',
            phone: userData.telefono || '',
            fullName: userData.nombre_completo || authUser,
            address: userData.direccion || ''
          });
        }
      } catch (e) {
        // No additional user data found
      }
      
      this.isAccountActive = true;
      this.hasPasswordSet = false;
      this.toggleFormByStatus();
    }
  }

  saveProfile(): void {
    if (!this.isAccountActive) return;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Perfil incompleto', detail: 'Debes completar todos los campos del perfil.' });
      return;
    }
    
    const authUserId = sessionStorage.getItem('authUserId');
    
    if (!authUserId) {
      return;
    }
    
    const value = this.profileForm.getRawValue();
    
    // Preparar datos para el backend
    const backendData: { nombre_completo?: string; telefono?: string; direccion?: string; password?: string } = {
      nombre_completo: value.fullName?.trim(),
      telefono: value.phone?.trim(),
      direccion: value.address?.trim()
    };
    
    // Solo incluir contraseña si se proporciona una nueva
    if (value.password && value.password.trim()) {
      backendData.password = value.password.trim();
    }
    
    // Actualizar en el backend
    if (authUserId) {
      this.http.put(`/api/users/${authUserId}`, backendData).subscribe({
        next: (response) => {
          // Actualizar el estado de hasPasswordSet si se cambió la contraseña
          if (value.password && value.password.trim()) {
            this.hasPasswordSet = true;
          }
          
          // También guardar en localStorage como backup
          const currentAuthUser = (sessionStorage.getItem('authUser') ?? '').toLowerCase();
          const profile: UserProfile = { 
            username: value.username?.trim().toLowerCase() ?? currentAuthUser, 
            email: value.email?.trim().toLowerCase() ?? '', 
            phone: value.phone ?? '', 
            password: value.password ?? '', 
            confirmPassword: value.confirmPassword ?? '',
            fullName: value.fullName?.trim() ?? '', 
            address: value.address?.trim() ?? '', 
            isAdult: value.isAdult ?? false, 
            isActive: this.isAccountActive,
            hasPassword: this.hasPasswordSet
          };
          localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
          this.updateRegisteredUser(profile, currentAuthUser);
          sessionStorage.setItem('authUser', profile.username);
          this.profileForm.patchValue({ confirmPassword: profile.password });
          
          this.messageService.add({ severity: 'success', summary: 'Perfil actualizado', detail: 'Tus datos se guardaron correctamente.' });
        },
        error: (error) => {
          const errorMsg = error?.error?.message ?? 'No se pudo actualizar el perfil.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
        }
      });
    }
  }

  openDeactivateDialog(): void { this.deactivateDialogVisible = true; }
  closeDeactivateDialog(): void { this.deactivateDialogVisible = false; }

  deactivateAccount(): void {
    this.isAccountActive = false;
    this.persistCurrentStatusOnly();
    this.toggleFormByStatus();
    this.closeDeactivateDialog();
    this.messageService.add({ severity: 'warn', summary: 'Cuenta desactivada', detail: 'Tu cuenta quedo en estado logico desactivado.' });
  }

  activateAccount(): void {
    this.isAccountActive = true;
    this.persistCurrentStatusOnly();
    this.toggleFormByStatus();
    this.messageService.add({ severity: 'success', summary: 'Cuenta restaurada', detail: 'Tu cuenta esta activa nuevamente.' });
  }

  private getStoredUsers(): RegisteredUser[] {
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!rawUsers) return [];
    try {
      const parsed = JSON.parse(rawUsers);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((u): u is RegisteredUser => typeof u?.username === 'string' && typeof u?.email === 'string' && typeof u?.password === 'string');
    } catch { return []; }
  }

  private updateRegisteredUser(profile: UserProfile, currentAuthUser: string): void {
    const users = this.getStoredUsers();
    const idx = users.findIndex(u => u.username === currentAuthUser);
    const entry = { username: profile.username, email: profile.email, password: profile.password, isActive: profile.isActive };
    if (idx >= 0) users[idx] = entry; else users.push(entry);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
  }

  private enforceNoWhitespace(controlName: 'username' | 'email'): void {
    const control = this.profileForm.controls[controlName];
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      const sanitized = (value ?? '').replace(/\s+/g, '');
      if (value !== sanitized) control.setValue(sanitized, { emitEvent: false });
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
      confirmPassword: value.confirmPassword ?? '',
      fullName: value.fullName?.trim() ?? '', 
      address: value.address?.trim() ?? '', 
      isAdult: value.isAdult ?? false, 
      isActive: this.isAccountActive,
      hasPassword: this.hasPasswordSet
    };
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    this.updateRegisteredUser(profile, currentAuthUser);
  }

  private toggleFormByStatus(): void {
    if (this.isAccountActive) { this.profileForm.enable({ emitEvent: false }); return; }
    this.profileForm.disable({ emitEvent: false });
  }
}
