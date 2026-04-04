import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { PasswordModule } from 'primeng/password';
import { MultiSelectModule } from 'primeng/multiselect';
import { Permission } from '../../models/permissions.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  permisos_globales: Permission[];
}

interface GroupOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-user-management-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    DialogModule,
    ToastModule,
    CheckboxModule,
    PasswordModule,
    MultiSelectModule,
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './user-management.page.html',
  styleUrl: './user-management.page.css'
})
export class UserManagementPageComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly http           = inject(HttpClient);

  users: ManagedUser[] = [];
  availableGroups: GroupOption[] = [];
  loading = false;
  userDialogVisible = false;
  isEditing = false;
  editingUserId = '';
  editingUsername = '';

  readonly allPermissions = Object.values(Permission);

  getPermissionLabel(perm: string): string {
    const labels: Record<string, string> = {
      'group:view': 'Ver grupos',         'group:edit': 'Editar grupos',
      'group:add': 'Crear grupos',         'group:delete': 'Eliminar grupos',
      'ticket:view': 'Ver tickets',        'tickets:view': 'Ver todos los tickets',
      'ticket:edit': 'Editar tickets',     'ticket:add': 'Crear tickets',
      'ticket:delete': 'Eliminar tickets', 'ticket:edit_state': 'Cambiar estado',
      'user:view': 'Ver usuario',          'users:view': 'Ver todos los usuarios',
      'user:edit': 'Editar usuarios',      'user:add': 'Crear usuarios',
      'user:delete': 'Eliminar usuarios',  'permissions:manage': 'Gestionar permisos'
    };
    return labels[perm] || perm;
  }

  readonly userForm = this.fb.group({
    username:    ['', [Validators.required, Validators.minLength(3)]],
    email:       ['', [Validators.required, Validators.email]],
    password:    [''],
    is_active:   [true],
    permissions: this.fb.control<Permission[]>([]),
    group_ids:   this.fb.control<string[]>([])
  });

  private get authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadGroups();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<ManagedUser[]>('/api/users', { headers: this.authHeaders }).subscribe({
      next: (data) => { this.users = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadGroups(): void {
    this.http.get<GroupOption[]>('/api/groups', { headers: this.authHeaders }).subscribe({
      next: (data) => { this.availableGroups = data; },
      error: () => {}
    });
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.editingUserId = '';
    this.userForm.reset({
      username: '', email: '', password: '', is_active: true,
      permissions: [
        Permission.GROUP_VIEW, Permission.TICKET_VIEW,
        Permission.TICKET_EDIT_STATE, Permission.USER_VIEW, Permission.USER_EDIT
      ],
      group_ids: []
    });
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.controls.password.updateValueAndValidity();
    this.userDialogVisible = true;
  }

  openEditDialog(user: ManagedUser): void {
    this.isEditing = true;
    this.editingUserId = user.id;
    this.editingUsername = user.username;

    // Cargar grupos actuales del usuario
    this.http.get<any>(`/api/users/${user.id}`, { headers: this.authHeaders }).subscribe({
      next: (data) => {
        const currentGroupIds = (data.groups ?? []).map((g: any) => g.id);
        this.userForm.reset({
          username: user.username, email: user.email,
          password: '', is_active: user.is_active,
          permissions: [...user.permisos_globales],
          group_ids: currentGroupIds
        });
      },
      error: () => {
        this.userForm.reset({
          username: user.username, email: user.email,
          password: '', is_active: user.is_active,
          permissions: [...user.permisos_globales],
          group_ids: []
        });
      }
    });

    this.userForm.controls.password.clearValidators();
    this.userForm.controls.password.updateValueAndValidity();
    this.userForm.controls.username.disable();
    this.userDialogVisible = true;
  }

  closeDialog(): void {
    this.userDialogVisible = false;
    this.userForm.controls.username.enable();
  }

  saveUser(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }

    const { username, email, password, is_active, permissions, group_ids } = this.userForm.getRawValue();

    if (this.isEditing) {
      const body: any = { email, is_active, permissions, group_ids };
      if (password) body.password = password;

      this.http.put(`/api/users/${this.editingUserId}`, body, { headers: this.authHeaders }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Usuario actualizado', detail: `Se actualizó ${username}` });
          this.loadUsers();
          this.closeDialog();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error ?? 'Error al actualizar' })
      });
    } else {
      this.http.post('/api/auth/users', { username, email, password, permissions, group_ids }, { headers: this.authHeaders }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Usuario creado', detail: `Se creó ${username}` });
          this.loadUsers();
          this.closeDialog();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error ?? 'Error al crear usuario' })
      });
    }
  }

  deleteUser(user: ManagedUser): void {
    if (user.username === 'superadmin') {
      this.messageService.add({ severity: 'error', summary: 'Acción denegada', detail: 'No se puede eliminar al superadmin' });
      return;
    }
    this.http.delete(`/api/users/${user.id}`, { headers: this.authHeaders }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Se eliminó a ${user.username}` });
        this.loadUsers();
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error ?? 'Error al eliminar' })
    });
  }

  togglePermission(permission: Permission): void {
    const current = this.userForm.value.permissions ?? [];
    const idx = current.indexOf(permission);
    this.userForm.patchValue({ permissions: idx === -1 ? [...current, permission] : current.filter(p => p !== permission) });
  }

  hasPermissionSelected(permission: Permission): boolean {
    return (this.userForm.value.permissions ?? []).includes(permission);
  }
}
