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
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DynamicPermissionsService } from '../../services/dynamic-permissions.service';
import { PermissionsService } from '../../services/permissions.service';
import { GroupsService } from '../../services/groups.service';

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

// Permisos globales: aplican al usuario independientemente del grupo.
const ALL_GLOBAL_PERMISSIONS: { label: string; value: string }[] = [
  { label: 'Ver perfil propio',   value: 'user:view'        },
  { label: 'Editar perfil propio', value: 'user:edit'       },
  { label: 'Desactivar cuenta',   value: 'user:deactivated' },
  { label: 'Activar cuenta',      value: 'user:activated'   },
];

// Permisos asignables por grupo: solo acciones dentro del workspace.
// Los permisos de administración global (groups:manage, users:manage, group:add, etc.)
// se asignan a nivel de usuario, no por grupo.
const ALL_GROUP_PERMISSIONS: { label: string; value: string; group: string }[] = [
  { label: 'Ver grupo',              value: 'group:view',          group: 'Grupos'    },
  { label: 'Ver tickets',            value: 'ticket:view',         group: 'Tickets'   },
  { label: 'Ver todos los tickets',  value: 'tickets:view',        group: 'Tickets'   },
  { label: 'Crear tickets',          value: 'ticket:add',          group: 'Tickets'   },
  { label: 'Editar tickets',         value: 'ticket:edit',         group: 'Tickets'   },
  { label: 'Cambiar estado',         value: 'ticket:edit:state',   group: 'Tickets'   },
  { label: 'Eliminar tickets',       value: 'ticket:delete',  group: 'Tickets'   },
  { label: 'Gestionar grupos',       value: 'groups:manage',       group: 'Sistema'   },
  { label: 'Gestionar usuarios',     value: 'users:manage',        group: 'Sistema'   },
  { label: 'Gestionar permisos',     value: 'permissions:manage',  group: 'Sistema'   },
];

@Component({
  selector: 'app-user-management-page',
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    CardModule, ButtonModule, InputTextModule, TableModule,
    DialogModule, ToastModule, CheckboxModule, PasswordModule,
    TagModule, ChipModule, DividerModule, IconFieldModule, InputIconModule
  ],
  providers: [MessageService],
  templateUrl: './user-management.page.html',
  styleUrl:    './user-management.page.css'
})
export class UserManagementPageComponent implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly msgSvc      = inject(MessageService);
  private readonly http        = inject(HttpClient);
  private readonly cdr         = inject(ChangeDetectorRef);
  private readonly dynPerms    = inject(DynamicPermissionsService);
  private readonly permsSvc    = inject(PermissionsService);
  private readonly groupsSvc   = inject(GroupsService);

  users: ManagedUser[] = [];
  loading           = false;
  userDialogVisible = false;
  isEditing         = false;
  editingUserId     = '';
  editingUsername   = '';
  searchValue       = '';

  // Permisos globales del usuario en edición
  editingUserGlobalPerms: string[] = [];
  readonly allGlobalPermissions = ALL_GLOBAL_PERMISSIONS;

  // Permisos por grupo del usuario en edición
  editingUserGroups: GroupWithPerms[] = [];
  groupPermissions: Record<string, string[]> = {};
  loadingGroupPerms = false;

  readonly allGroupPermissions = ALL_GROUP_PERMISSIONS;
  readonly permCategories = [...new Set(ALL_GROUP_PERMISSIONS.map(p => p.group))];

  permsByCategory(cat: string) {
    return ALL_GROUP_PERMISSIONS.filter(p => p.group === cat);
  }

  /** Solo visible si el admin tiene users:manage */
  get canManageGroupPerms(): boolean {
    return this.permsSvc.hasAnyPermission(['users:manage', 'permissions:manage']);
  }

  private readonly permLabels: Record<string, string> = {
    'group:view': 'Ver grupos', 'group:edit': 'Editar grupos',
    'group:add': 'Crear grupos', 'group:remove': 'Eliminar grupos',
    'ticket:view': 'Ver ticket', 'tickets:view': 'Ver todos los tickets',
    'ticket:add': 'Crear tickets', 'ticket:edit': 'Editar tickets',
    'ticket:edit:state': 'Cambiar estado', 'ticket:delete': 'Eliminar tickets',
    'user:view': 'Ver usuario', 'users:view': 'Ver todos los usuarios',
    'user:add': 'Crear usuarios', 'user:edit': 'Editar usuarios',
    'user:remove': 'Eliminar usuarios', 'permissions:manage': 'Gestionar permisos',
    'user:delete': 'Eliminar usuarios',
    'group:delete': 'Eliminar grupos',
    'ticket:edit_state': 'Cambiar estado', 'users:manage': 'Administrar usuarios',
  };

  getPermissionLabel(perm: string): string {
    return this.permLabels[perm] ?? perm;
  }

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

  readonly userForm = this.fb.group({
    username:        ['', [Validators.required, Validators.minLength(3)]],
    nombre_completo: [''],
    email:           ['', [Validators.required, Validators.email]],
    password:        [''],
  });

  ngOnInit(): void {
    this.dynPerms.isReady().subscribe(() => this.loadUsers());
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<{ data: ManagedUser[] }>('/api/users').subscribe({
      next: (res) => {
        this.users   = res.data ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.users   = [];
        this.loading = false;
        const msg = err?.error?.message ?? `Error ${err?.status ?? ''}`;
        this.msgSvc.add({ severity: 'error', summary: 'Error al cargar usuarios', detail: msg });
        this.cdr.detectChanges();
      }
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

  hasGlobalPerm(perm: string): boolean {
    return this.editingUserGlobalPerms.includes(perm);
  }

  toggleGlobalPerm(perm: string): void {
    const idx = this.editingUserGlobalPerms.indexOf(perm);
    if (idx >= 0) this.editingUserGlobalPerms.splice(idx, 1);
    else          this.editingUserGlobalPerms.push(perm);
  }

  openCreateDialog(): void {
    this.isEditing     = false;
    this.editingUserId = '';
    this.editingUserGlobalPerms = [];
    this.editingUserGroups = [];
    this.groupPermissions  = {};
    this.userForm.reset({ username: '', nombre_completo: '', email: '', password: '' });
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.controls.password.updateValueAndValidity();
    this.userDialogVisible = true;
  }

  openEditDialog(user: ManagedUser): void {
    this.isEditing       = true;
    this.editingUserId   = user.id;
    this.editingUsername = user.username;
    this.editingUserGlobalPerms = [...(user.permisos_globales ?? [])].filter(
      p => ALL_GLOBAL_PERMISSIONS.some(g => g.value === p)
    );
    this.editingUserGroups = [];
    this.groupPermissions  = {};

    this.userForm.reset({
      username:        user.username,
      nombre_completo: user.nombre_completo ?? '',
      email:           user.email,
      password:        '',
    });
    this.userForm.controls.password.clearValidators();
    this.userForm.controls.password.updateValueAndValidity();
    this.userDialogVisible = true;

    // Cargar grupos + permisos del usuario
    if (this.canManageGroupPerms) {
      this.loadingGroupPerms = true;
      this.http.get<any>(`/api/users/${user.id}`).subscribe({
        next: (res) => {
          const data = res?.data?.[0] ?? res;
          this.editingUserGroups = (data.groups ?? []).map((g: any) => ({
            id:      g.id,
            name:    g.name,
            permisos: g.permisos ?? []
          }));
          const permsMap: Record<string, string[]> = {};
          for (const g of this.editingUserGroups) {
            permsMap[g.id] = [...g.permisos];
          }
          this.groupPermissions  = permsMap;
          this.loadingGroupPerms = false;
          this.cdr.detectChanges();
        },
        error: () => { this.loadingGroupPerms = false; }
      });
    }
  }

  closeDialog(): void {
    this.userDialogVisible      = false;
    this.editingUserGlobalPerms = [];
    this.editingUserGroups      = [];
    this.groupPermissions       = {};
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  saveUser(): void {
    if (this.userForm.invalid) { this.userForm.markAllAsTouched(); return; }
    const { username, nombre_completo, email, password } = this.userForm.getRawValue();

    if (this.isEditing) {
      const body: any = { username, email, nombre_completo: nombre_completo?.trim() || null };
      this.http.put(`/api/users/${this.editingUserId}`, body).subscribe({
        next: () => {
          this.saveGlobalPermissions();
          this.saveGroupPermissions();
          this.msgSvc.add({ severity: 'success', summary: 'Actualizado', detail: `Se actualizó ${username}` });
          this.loadUsers();
          this.closeDialog();
        },
        error: (err) => this.msgSvc.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Error al actualizar' })
      });
    } else {
      this.http.post('/api/auth/users', { username, nombre_completo: nombre_completo?.trim() || null, email, password }).subscribe({
        next: () => {
          this.msgSvc.add({ severity: 'success', summary: 'Creado', detail: `Se creó ${username}` });
          this.loadUsers();
          this.closeDialog();
        },
        error: (err) => this.msgSvc.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Error al crear usuario' })
      });
    }
  }

  private saveGlobalPermissions(): void {
    // Toma los permisos globales actuales del usuario y reemplaza solo los del perfil
    const user = this.users.find(u => u.id === this.editingUserId);
    const currentGlobal = user?.permisos_globales ?? [];
    const profilePerms  = ALL_GLOBAL_PERMISSIONS.map(p => p.value);
    const otherPerms    = currentGlobal.filter(p => !profilePerms.includes(p));
    const merged        = [...new Set([...otherPerms, ...this.editingUserGlobalPerms])];
    this.http.put(`/api/users/${this.editingUserId}/permissions`, { permissions: merged }).subscribe();
  }

  private saveGroupPermissions(): void {
    for (const [groupId, perms] of Object.entries(this.groupPermissions)) {
      this.groupsSvc.updateMemberPermissions(groupId, this.editingUserId, perms).subscribe();
    }
  }

  deleteUser(user: ManagedUser): void {
    if (user.username === 'superadmin') {
      this.msgSvc.add({ severity: 'error', summary: 'Acción denegada', detail: 'No se puede eliminar al superadmin' });
      return;
    }
    this.http.delete(`/api/users/${user.id}`).subscribe({
      next: () => {
        this.msgSvc.add({ severity: 'info', summary: 'Eliminado', detail: `Se eliminó a ${user.username}` });
        this.loadUsers();
      },
      error: (err) => this.msgSvc.add({ severity: 'error', summary: 'Error', detail: err.error?.message ?? 'Error al eliminar' })
    });
  }
}
