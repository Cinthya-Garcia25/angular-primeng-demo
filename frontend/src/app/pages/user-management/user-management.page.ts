import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DynamicPermissionsService } from '../../services/dynamic-permissions.service';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  nombre_completo: string | null;
  is_active: boolean;
  permisos_globales: string[];
}

interface GroupWithPerms {
  id: string;
  name: string;
  permisos: string[];
}

interface GroupOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-user-management-page',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    CardModule, ButtonModule, InputTextModule, TableModule,
    DialogModule, ToastModule, CheckboxModule, PasswordModule,
    MultiSelectModule, TagModule, ChipModule, DividerModule,
    IconFieldModule, InputIconModule
  ],
  providers: [MessageService],
  templateUrl: './user-management.page.html',
  styleUrl:    './user-management.page.css'
})
export class UserManagementPageComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly http           = inject(HttpClient);
  private readonly cdr            = inject(ChangeDetectorRef);
  private readonly dynPermsSvc    = inject(DynamicPermissionsService);

  users: ManagedUser[]       = [];
  availableGroups: GroupOption[] = [];
  loading      = false;
  userDialogVisible = false;
  isEditing    = false;
  editingUserId   = '';
  editingUsername = '';
  searchValue  = '';

  // Permisos por grupo del usuario que se está editando
  editingUserGroups: GroupWithPerms[] = [];
  groupPermissions: Record<string, string[]> = {};
  loadingGroupPerms = false;

  readonly allPermissions = [
    'group:view', 'group:add', 'group:edit', 'group:remove',
    'ticket:view', 'tickets:view', 'ticket:add', 'ticket:edit', 'ticket:edit:state', 'ticket:edit:delete',
    'user:view', 'user:view:all', 'user:add', 'user:edit', 'user:remove',
    'permissions:manage'
  ];

  getPermissionLabel(perm: string): string {
    const labels: Record<string, string> = {
      'group:view':       'Ver grupos',           'group:edit':         'Editar grupos',
      'group:add':        'Crear grupos',          'group:remove':       'Eliminar grupos',
      'ticket:view':      'Ver tickets',           'tickets:view':       'Ver todos los tickets',
      'ticket:edit':      'Editar tickets',        'ticket:add':         'Crear tickets',
      'ticket:edit:delete': 'Eliminar tickets',      'ticket:edit:state':  'Cambiar estado',
      'user:view':        'Ver usuario',           'user:view:all':       'Ver todos los usuarios',
      'permissions:manage': 'Gestionar permisos',    'user:edit':          'Editar usuarios',
      'user:add':         'Crear usuarios',        'user:remove':        'Eliminar usuarios'
    };
    return labels[perm] || perm;
  }

  readonly userForm = this.fb.group({
    username:        ['', [Validators.required, Validators.minLength(3)]],
    nombre_completo: [''],
    email:           ['', [Validators.required, Validators.email]],
    password:        [''],
    is_active:       [true],
    permissions:     this.fb.control<string[]>([]),
    group_ids:       this.fb.control<string[]>([])
  });

  ngOnInit(): void {
    this.dynPermsSvc.isReady().subscribe(() => {
        this.loadUsers();
        this.loadGroups();
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<{ data: ManagedUser[] }>('/api/users').subscribe({
        next: (res) => {
            this.users = res.data ?? [];
            this.loading = false;
            this.cdr.detectChanges();
        },
        error: () => {
            this.users = [];
            this.loading = false;
            this.cdr.detectChanges();
        }
    });
  }

  loadGroups(): void {
    this.http.get<{ data: GroupOption[] }>('/api/groups').subscribe({
      next:  (res) => { this.availableGroups = res.data ?? []; },
      error: ()    => {}
    });
  }

  get filteredUsers(): ManagedUser[] {
    const q = this.searchValue.trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u =>
      [u.username, u.email, u.nombre_completo ?? ''].join(' ').toLowerCase().includes(q)
    );
  }

  // ── Dialogs ──────────────────────────────────────────────────────────────

  openCreateDialog(): void {
    this.isEditing    = false;
    this.editingUserId = '';
    this.editingUserGroups = [];
    this.groupPermissions  = {};
    this.userForm.reset({
      username: '', nombre_completo: '', email: '', password: '', is_active: true,
      permissions: [
        'group:view', 'ticket:view',
        'ticket:edit:state', 'user:view', 'user:edit'
      ],
      group_ids: []
    });
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.controls.password.updateValueAndValidity();
    this.userForm.controls.username.enable();
    this.userDialogVisible = true;
  }

  openEditDialog(user: ManagedUser): void {
    this.isEditing      = true;
    this.editingUserId   = user.id;
    this.editingUsername = user.username;
    this.editingUserGroups = [];
    this.groupPermissions  = {};
    this.loadingGroupPerms = true;

    // Abrir diálogo inmediatamente
    this.userDialogVisible = true;
    
    // Resetear formulario con datos básicos
    this.userForm.reset({
      username:        user.username,
      nombre_completo: user.nombre_completo ?? '',
      email:           user.email,
      password:        '',
      is_active:       user.is_active,
      permissions:     [...user.permisos_globales],
      group_ids:       []
    });

    // Cargar datos adicionales en segundo plano
    this.http.get<any>(`/api/users/${user.id}`).subscribe({
      next: (res) => {
        const data: any = res?.data?.[0] ?? res;
        const currentGroupIds: string[] = (data.groups ?? []).map((g: any) => g.id);

        this.editingUserGroups = data.groups ?? [];
        const initialPerms: Record<string, string[]> = {};
        for (const g of this.editingUserGroups) {
          initialPerms[g.id] = [...(g.permisos ?? [])];
        }
        this.groupPermissions = initialPerms;
        this.loadingGroupPerms = false;

        // Actualizar formulario con grupos si ya está abierto el diálogo
        this.userForm.patchValue({ group_ids: currentGroupIds });
      },
      error: () => {
        this.loadingGroupPerms = false;
      }
    });

    this.userForm.controls.password.clearValidators();
    this.userForm.controls.password.updateValueAndValidity();
    this.userForm.controls.username.disable();
  }

  closeDialog(): void {
    this.userDialogVisible = false;
    this.userForm.controls.username.enable();
    this.editingUserGroups = [];
    this.groupPermissions  = {};
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  saveUser(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }
    const { username, nombre_completo, email, password, is_active, permissions, group_ids }
      = this.userForm.getRawValue();

    if (this.isEditing) {
      const body: any = { email, nombre_completo: nombre_completo?.trim() || null, is_active, permissions, group_ids };
      if (password) body.password = password;

      this.http.put(`/api/users/${this.editingUserId}`, body).subscribe({
        next: () => {
          this.saveGroupPermissions();
          this.messageService.add({ severity: 'success', summary: 'Usuario actualizado', detail: `Se actualizó ${this.editingUsername}` });
          this.loadUsers();
          this.closeDialog();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Error al actualizar' })
      });
    } else {
      this.http.post('/api/auth/users', { username, nombre_completo: nombre_completo?.trim() || null, email, password, permissions, group_ids }).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Usuario creado', detail: `Se creó ${username}` });
          this.loadUsers();
          this.closeDialog();
        },
        error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Error al crear usuario' })
      });
    }
  }

  /** Persiste los permisos por grupo del usuario que se está editando */
  private saveGroupPermissions(): void {
    for (const [groupId, perms] of Object.entries(this.groupPermissions)) {
      this.http.put(
        `/api/groups/${groupId}/members/${this.editingUserId}/permissions`,
        { permissions: perms }
      ).subscribe();
    }
  }

  deleteUser(user: ManagedUser): void {
    if (user.username === 'superadmin') {
      this.messageService.add({ severity: 'error', summary: 'Acción denegada', detail: 'No se puede eliminar al superadmin' });
      return;
    }
    this.http.delete(`/api/users/${user.id}`).subscribe({
      next: () => {
        this.messageService.add({ severity: 'info', summary: 'Eliminado', detail: `Se eliminó a ${user.username}` });
        this.loadUsers();
      },
      error: (err) => this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Error al eliminar' })
    });
  }

  // ── Helpers permisos globales ─────────────────────────────────────────────

  togglePermission(permission: string): void {
    const current = this.userForm.value.permissions ?? [];
    const idx = current.indexOf(permission);
    this.userForm.patchValue({
      permissions: idx === -1 ? [...current, permission] : current.filter(p => p !== permission)
    });
  }

  hasPermissionSelected(permission: string): boolean {
    return (this.userForm.value.permissions ?? []).includes(permission);
  }

  // ── Helpers permisos por grupo ────────────────────────────────────────────

  hasGroupPerm(groupId: string, perm: string): boolean {
    return (this.groupPermissions[groupId] ?? []).includes(perm);
  }

  toggleGroupPerm(groupId: string, perm: string): void {
    if (!this.groupPermissions[groupId]) this.groupPermissions[groupId] = [];
    const idx = this.groupPermissions[groupId].indexOf(perm);
    if (idx >= 0) this.groupPermissions[groupId].splice(idx, 1);
    else          this.groupPermissions[groupId].push(perm);
  }

  groupPermCount(groupId: string): number {
    return (this.groupPermissions[groupId] ?? []).length;
  }
}
