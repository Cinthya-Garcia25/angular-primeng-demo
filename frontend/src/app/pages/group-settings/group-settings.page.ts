import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MultiSelectModule } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { PermissionsService } from '../../services/permissions.service';
import { GroupsService, GroupDetail, GroupMember } from '../../services/groups.service';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

interface PermissionOption {
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface MemberWithPermissions extends GroupMember {
  availablePermissions: PermissionOption[];
  selectedPermissions: string[];
}

@Component({
  selector: 'app-group-settings-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    DialogModule,
    ToastModule,
    MultiSelectModule,
    CheckboxModule,
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './group-settings.page.html',
  styleUrl: './group-settings.page.css'
})
export class GroupSettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly permissionsSvc = inject(PermissionsService);
  private readonly groupsSvc = inject(GroupsService);
  
  currentGroupId = '';
  groupName = '';
  groupDescription = '';
  
  groupDetail: GroupDetail | null = null;
  members: MemberWithPermissions[] = [];
  availablePermissions: PermissionOption[] = [];
  
  loading = false;
  addUserDialogVisible = false;
  editPermissionsDialogVisible = false;
  selectedMember: MemberWithPermissions | null = null;
  
  readonly groupForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['']
  });

  readonly addUserForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly permissionsForm = this.fb.group({
    permissions: [[] as string[]]
  });

  ngOnInit(): void {
    this.currentGroupId = sessionStorage.getItem('selectedGroupId') || '';
    if (this.currentGroupId) {
      this.loadGroupData();
    }
  }

  loadGroupData(): void {
    this.loading = true;
    
    // Load group details and available permissions in parallel
    this.groupsSvc.getById(this.currentGroupId).subscribe(groupDetail => {
      if (groupDetail) {
        this.groupDetail = groupDetail;
        this.groupName = groupDetail.nombre;
        this.groupDescription = groupDetail.descripcion || '';
        this.groupForm.patchValue({ 
          name: this.groupName,
          description: this.groupDescription
        });
        
        // Transform members to include permission management
        this.members = groupDetail.miembros.map(member => ({
          ...member,
          availablePermissions: [],
          selectedPermissions: member.permisos || []
        }));
      }
      
      this.loading = false;
    });

    this.groupsSvc.getAvailablePermissions(this.currentGroupId).subscribe(permissions => {
      this.availablePermissions = permissions as unknown as PermissionOption[];
      // Update available permissions for all members
      this.members.forEach(member => {
        member.availablePermissions = permissions as unknown as PermissionOption[];
      });
    });
  }

  saveGroupSettings(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }
    
    const { name, description } = this.groupForm.value;
    this.loading = true;
    
    this.groupsSvc.update(this.currentGroupId, { name: name || undefined, description: description || undefined }).subscribe({
      next: () => {
        this.groupName = name || '';
        this.groupDescription = description || '';
        sessionStorage.setItem('selectedGroupName', this.groupName);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Configuración guardada',
          detail: 'La información del grupo ha sido actualizada.'
        });
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar la información del grupo.'
        });
        this.loading = false;
      }
    });
  }

  openAddUserDialog(): void {
    this.addUserForm.reset();
    this.addUserDialogVisible = true;
  }

  closeAddUserDialog(): void {
    this.addUserDialogVisible = false;
  }

  addUser(): void {
    if (this.addUserForm.invalid) {
      this.addUserForm.markAllAsTouched();
      return;
    }
    
    const email = this.addUserForm.value.email;
    if (!email) return;
    
    this.loading = true;
    
    this.groupsSvc.addMember(this.currentGroupId, email).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Usuario añadido',
          detail: 'El usuario ha sido añadido al grupo exitosamente.'
        });
        this.closeAddUserDialog();
        this.loadGroupData(); // Reload to show new member
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo añadir el usuario al grupo.'
        });
        this.loading = false;
      }
    });
  }

  removeUser(member: MemberWithPermissions): void {
    this.loading = true;
    
    this.groupsSvc.removeMember(this.currentGroupId, member.usuarios.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Usuario eliminado',
          detail: `${member.usuarios.username} ha sido eliminado del grupo.`
        });
        this.loadGroupData(); // Reload to update member list
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar al usuario del grupo.'
        });
        this.loading = false;
      }
    });
  }

  openEditPermissionsDialog(member: MemberWithPermissions): void {
    this.selectedMember = member;
    this.permissionsForm.patchValue({
      permissions: member.selectedPermissions
    });
    this.editPermissionsDialogVisible = true;
  }

  closeEditPermissionsDialog(): void {
    this.editPermissionsDialogVisible = false;
    this.selectedMember = null;
  }

  saveMemberPermissions(): void {
    if (!this.selectedMember || this.permissionsForm.invalid) return;
    
    const permissions = this.permissionsForm.value.permissions || [];
    this.loading = true;
    
    this.groupsSvc.updateMemberPermissions(
      this.currentGroupId,
      this.selectedMember.usuarios.id,
      permissions
    ).subscribe({
      next: () => {
        if (this.selectedMember) {
          // Update local data
          this.selectedMember.selectedPermissions = permissions;
          this.selectedMember.permisos = permissions;
          
          // Update groups service cache
          this.groupsSvc.updateGroupPermissionsCache(this.currentGroupId, permissions);
          
          this.messageService.add({
            severity: 'success',
            summary: 'Permisos actualizados',
            detail: `Los permisos de ${this.selectedMember.usuarios.username} han sido actualizados.`
          });
        }
        this.closeEditPermissionsDialog();
        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron actualizar los permisos del usuario.'
        });
        this.loading = false;
      }
    });
  }

  getPermissionName(codigo: string): string {
    const permission = this.availablePermissions.find(p => p.codigo === codigo);
    return permission ? permission.nombre : codigo;
  }

  getPermissionDescription(codigo: string): string {
    const permission = this.availablePermissions.find(p => p.codigo === codigo);
    return permission ? permission.descripcion : '';
  }
}

