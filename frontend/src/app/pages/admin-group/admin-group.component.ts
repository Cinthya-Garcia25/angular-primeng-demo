import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { GroupsService, Group, GroupMember } from '../../services/groups.service';
import { UsersService, User } from '../../services/users.service';
import { DynamicPermissionsService } from '../../services/dynamic-permissions.service';
import { PermissionsService } from '../../services/permissions.service';

const ALL_PERMISSIONS: { label: string; value: string; group: string }[] = [
  { label: 'Ver grupo',              value: 'group:view',          group: 'Grupos'  },
  { label: 'Ver tickets',            value: 'ticket:view',         group: 'Tickets' },
  { label: 'Ver todos los tickets',  value: 'tickets:view',        group: 'Tickets' },
  { label: 'Crear tickets',          value: 'ticket:add',          group: 'Tickets' },
  { label: 'Editar tickets',         value: 'ticket:edit',         group: 'Tickets' },
  { label: 'Cambiar estado',         value: 'ticket:edit:state',   group: 'Tickets' },
  { label: 'Eliminar tickets',       value: 'ticket:delete',       group: 'Tickets' },
  { label: 'Gestionar grupos',       value: 'groups:manage',       group: 'Sistema'  },
  { label: 'Gestionar usuarios',     value: 'users:manage',        group: 'Sistema'  },
  { label: 'Gestionar permisos',     value: 'permissions:manage',  group: 'Sistema'  },
];

@Component({
  selector: 'app-admin-group',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    AvatarModule, ButtonModule, CardModule, ChipModule,
    DialogModule, DividerModule, IconFieldModule, InputIconModule,
    InputTextModule, MessageModule, SelectModule, TableModule,
    TagModule, TextareaModule, ToastModule, TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './admin-group.component.html',
  styleUrl:    './admin-group.component.css',
})
export class AdminGroupComponent implements OnInit {
  private readonly groupsSvc    = inject(GroupsService);
  private readonly usersSvc     = inject(UsersService);
  private readonly msgSvc       = inject(MessageService);
  private readonly fb           = inject(FormBuilder);
  private readonly cdr          = inject(ChangeDetectorRef);
  private readonly dynPermsSvc  = inject(DynamicPermissionsService);
  private readonly permsSvc     = inject(PermissionsService);

  get canCreateGroup(): boolean {
    return this.permsSvc.hasAnyPermission(['groups:manage', 'group:add']);
  }
  get canEditGroup(): boolean {
    return this.permsSvc.hasAnyPermission(['groups:manage', 'group:edit']);
  }
  get canDeleteGroup(): boolean {
    return this.permsSvc.hasAnyPermission(['groups:manage', 'group:remove', 'group:delete']);
  }
  get canManageMembers(): boolean {
    return this.permsSvc.hasAnyPermission(['groups:manage', 'group:edit', 'group:add']);
  }

  groups: Group[]  = [];
  loading          = false;
  searchValue      = '';

  groupDialogVisible       = false;
  deleteGroupDialogVisible = false;
  isEditingGroup           = false;
  editingGroupId: string | null = null;
  groupToDelete: Group | null   = null;

  readonly groupForm = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
  });

  membersDialogVisible = false;
  selectedGroup: Group | null = null;
  members: GroupMember[] = [];
  loadingMembers = false;

  addMemberDialogVisible = false;
  allUsers: User[]       = [];
  loadingUsers           = false;
  selectedUserId         = '';

  get userOptions() {
    const memberIds = new Set(this.members.map(m => m.usuarios.id));
    return this.allUsers
      .filter(u => !memberIds.has(u.id))
      .map(u => ({ label: `${u.username} (${u.email})`, value: u.id }));
  }

  permsDialogVisible = false;
  editingMember: GroupMember | null = null;
  selectedPerms: string[] = [];
  savingPerms = false;

  readonly allPermissions = ALL_PERMISSIONS;
  readonly permGroups = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

  permsByGroup(group: string) {
    return ALL_PERMISSIONS.filter(p => p.group === group);
  }

  get filteredGroups(): Group[] {
    const q = this.searchValue.trim().toLowerCase();
    if (!q) return this.groups;
    return this.groups.filter(g =>
      (g.nombre + ' ' + (g.descripcion ?? '')).toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    this.dynPermsSvc.isReady().subscribe(() => {
        this.loadGroups();
    });
  }

  loadGroups(): void {
    this.loading = true;
    this.groupsSvc.getAllGroups().subscribe({
        next: (data: any) => {
            this.groups = data;
            this.loading = false;
            this.cdr.detectChanges();
        },
        error: () => {
            this.toast('error', 'Error', 'No se pudieron cargar los grupos');
            this.loading = false;
            this.cdr.detectChanges();
        }
    });
  }

  openCreateGroup(): void {
    this.isEditingGroup = false;
    this.editingGroupId = null;
    this.groupForm.reset({ name: '', description: '' });
    this.groupDialogVisible = true;
  }

  openEditGroup(group: Group): void {
    this.isEditingGroup = true;
    this.editingGroupId = group.id;
    this.groupForm.reset({ name: group.nombre, description: group.descripcion ?? '' });
    this.groupDialogVisible = true;
  }

  saveGroup(): void {
    if (this.groupForm.invalid) { this.groupForm.markAllAsTouched(); return; }
    const v = this.groupForm.getRawValue();
    const payload = { name: v.name!.trim(), description: v.description?.trim() };

    const obs = this.isEditingGroup && this.editingGroupId
      ? this.groupsSvc.update(this.editingGroupId, payload)
      : this.groupsSvc.create(payload);

    obs.subscribe({
      next: () => {
        this.toast('success', 'Guardado', `Grupo ${this.isEditingGroup ? 'actualizado' : 'creado'}`);
        this.groupDialogVisible = false;
        this.loadGroups();
      },
      error: () => this.toast('error', 'Error', 'No se pudo guardar el grupo'),
    });
  }

  askDeleteGroup(group: Group): void { this.groupToDelete = group; this.deleteGroupDialogVisible = true; }

  confirmDeleteGroup(): void {
    if (!this.groupToDelete) return;
    this.groupsSvc.delete(this.groupToDelete.id).subscribe({
      next: () => {
        this.toast('success', 'Eliminado', 'Grupo eliminado');
        this.deleteGroupDialogVisible = false;
        this.groupToDelete = null;
        this.loadGroups();
      },
      error: () => this.toast('error', 'Error', 'No se pudo eliminar el grupo'),
    });
  }

  openMembersDialog(group: Group): void {
    this.selectedGroup = group;
    this.membersDialogVisible = true;
    this.refreshMembers();
  }

  refreshMembers(): void {
    if (!this.selectedGroup) return;
    this.loadingMembers = true;
    this.groupsSvc.getById(this.selectedGroup.id).subscribe({
      next: (detail: any) => {
        this.members = detail?.miembros ?? [];
        this.loadingMembers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast('error', 'Error', 'No se pudieron cargar los miembros');
        this.loadingMembers = false;
        this.cdr.detectChanges();
      },
    });
  }

  openAddMember(): void {
    this.selectedUserId = '';
    this.loadingUsers   = true;
    this.addMemberDialogVisible = true;

    this.usersSvc.getAll().subscribe({
      next: (res: any) => {
        this.allUsers = Array.isArray(res) ? res : (res?.data ?? []);
        this.loadingUsers = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.allUsers = [];
        this.loadingUsers = false;
        this.cdr.detectChanges();
      },
    });
  }

  confirmAddMember(): void {
    if (!this.selectedUserId || !this.selectedGroup) return;
    this.groupsSvc.addMember(this.selectedGroup.id, this.selectedUserId).subscribe({
      next: () => {
        this.toast('success', 'Agregado', 'Usuario agregado al grupo');
        this.addMemberDialogVisible = false;
        this.refreshMembers();
      },
      error: (err: any) => this.toast('error', 'Error', err?.error?.message ?? 'No se pudo agregar el usuario'),
    });
  }

  removeMember(member: GroupMember): void {
    if (!this.selectedGroup) return;
    this.groupsSvc.removeMember(this.selectedGroup.id, member.usuarios.id).subscribe({
      next: () => {
        this.toast('info', 'Eliminado', `${member.usuarios.username} eliminado del grupo`);
        this.refreshMembers();
      },
      error: () => this.toast('error', 'Error', 'No se pudo eliminar el miembro'),
    });
  }

  openPermsDialog(member: GroupMember): void {
    this.editingMember  = member;
    this.selectedPerms  = [...(member.permisos ?? [])];
    this.permsDialogVisible = true;
  }

  togglePerm(value: string): void {
    const idx = this.selectedPerms.indexOf(value);
    if (idx >= 0) this.selectedPerms.splice(idx, 1);
    else          this.selectedPerms.push(value);
  }

  hasPerm(value: string): boolean { return this.selectedPerms.includes(value); }

  savePerms(): void {
    if (!this.editingMember || !this.selectedGroup) return;
    this.savingPerms = true;
    const permissionsToSave = [...this.selectedPerms];
    this.groupsSvc
      .updateMemberPermissions(this.selectedGroup.id, this.editingMember.usuarios.id, permissionsToSave)
      .subscribe({
        next: () => {
          this.toast('success', 'Guardado', 'Permisos de grupo actualizados');
          this.editingMember!.permisos = permissionsToSave;
          this.permsDialogVisible = false;
          this.savingPerms = false;

          if (this.selectedGroup) {
            this.groupsSvc.updateGroupPermissionsCache(this.selectedGroup.id, permissionsToSave);
          }

          this.cdr.detectChanges();
        },
        error: () => {
          this.toast('error', 'Error', 'No se pudieron guardar los permisos');
          this.savingPerms = false;
          this.cdr.detectChanges();
        },
      });
  }

  initial(name: string): string { return (name ?? '?').charAt(0).toUpperCase(); }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-MX');
  }

  permLabel(value: string): string {
    return ALL_PERMISSIONS.find(p => p.value === value)?.label ?? value;
  }

  controlHasError(name: 'name' | 'description'): boolean {
    const c = this.groupForm.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  private toast(severity: string, summary: string, detail: string): void {
    this.msgSvc.add({ severity, summary, detail, life: 3500 });
  }
}
