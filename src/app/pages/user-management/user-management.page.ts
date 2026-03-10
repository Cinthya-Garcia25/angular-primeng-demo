import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { PasswordModule } from 'primeng/password';
import { Permission } from '../../models/permissions.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

interface ManagedUser {
  username: string;
  email: string;
  isActive: boolean;
  permissions: Permission[];
}

const REGISTERED_USERS_KEY = 'registeredUsers';

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
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './user-management.page.html',
  styleUrl: './user-management.page.css'
})
export class UserManagementPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  users: ManagedUser[] = [];
  
  userDialogVisible = false;
  isEditing = false;
  editingUsername = '';

  readonly allPermissions = Object.values(Permission);
  
  readonly userForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    isActive: [true],
    permissions: this.fb.control<Permission[]>([])
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    if (rawUsers) {
      try {
        const parsed = JSON.parse(rawUsers);
        this.users = parsed.map((u: any) => ({
          username: u.username,
          email: u.email || `${u.username}@demo.com`,
          isActive: u.isActive !== false,
          permissions: Array.isArray(u.permissions) ? u.permissions : []
        }));
      } catch {
        this.users = [];
      }
    } else {
      this.users = [
        {
          username: 'superadmin',
          email: 'superadmin@demo.com',
          isActive: true,
          permissions: Object.values(Permission)
        },
        {
          username: 'ids15',
          email: 'ids15@demo.com',
          isActive: true,
          permissions: [
            Permission.TICKET_VIEW,
            Permission.TICKET_EDIT_STATE,
            Permission.GROUP_VIEW,
            Permission.USER_VIEW,
            Permission.USER_EDIT
          ]
        },
        {
          username: 'cinthya',
          email: 'cinthya@demo.com',
          isActive: true,
          permissions: [
            Permission.TICKET_VIEW,
            Permission.TICKET_EDIT_STATE,
            Permission.GROUP_VIEW,
            Permission.USER_VIEW,
            Permission.USER_EDIT
          ]
        }
      ];
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(this.users.map(u => ({...u, password: 'Password@1234'}))));
    }
  }

  private saveUsersToStorage(usersToSave: any[]): void {
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(usersToSave));
    this.loadUsers();
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.editingUsername = '';
    this.userForm.reset({
      username: '',
      email: '',
      password: '',
      isActive: true,
      permissions: [
        Permission.GROUP_VIEW,
        Permission.TICKET_VIEW,
        Permission.TICKET_EDIT_STATE,
        Permission.USER_VIEW,
        Permission.USER_EDIT
      ]
    });
    this.userForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.controls.password.updateValueAndValidity();
    
    this.userDialogVisible = true;
  }

  openEditDialog(user: ManagedUser): void {
    this.isEditing = true;
    this.editingUsername = user.username;
    this.userForm.reset({
      username: user.username,
      email: user.email,
      password: '',
      isActive: user.isActive,
      permissions: [...user.permissions]
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
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.getRawValue();
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    let allUsers = [];
    
    try {
      allUsers = rawUsers ? JSON.parse(rawUsers) : [];
    } catch {
      allUsers = [];
    }

    if (this.isEditing) {
      const index = allUsers.findIndex((u: any) => u.username === this.editingUsername);
      if (index !== -1) {
        allUsers[index] = {
          ...allUsers[index],
          email: formValue.email,
          isActive: formValue.isActive,
          permissions: formValue.permissions
        };
        if (formValue.password) {
          allUsers[index].password = formValue.password;
        }
        
        this.messageService.add({ severity: 'success', summary: 'Usuario actualizado', detail: `Se actualizó a ${this.editingUsername}` });
      }
    } else {
      const username = formValue.username?.toLowerCase() || '';
      
      if (allUsers.some((u: any) => u.username === username)) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'El nombre de usuario ya existe' });
        return;
      }
      
      allUsers.push({
        username,
        email: formValue.email,
        password: formValue.password,
        isActive: formValue.isActive,
        permissions: formValue.permissions && formValue.permissions.length > 0 
          ? formValue.permissions 
          : [
              Permission.GROUP_VIEW,
              Permission.TICKET_VIEW,
              Permission.TICKET_EDIT_STATE,
              Permission.USER_VIEW,
              Permission.USER_EDIT
            ],
        groups: []
      });
      
      this.messageService.add({ severity: 'success', summary: 'Usuario creado', detail: `Se creó a ${username}` });
    }

    this.saveUsersToStorage(allUsers);
    this.closeDialog();
  }

  deleteUser(user: ManagedUser): void {
    if (user.username === 'superadmin') {
      this.messageService.add({ severity: 'error', summary: 'Acción denegada', detail: 'No se puede eliminar al superadmin' });
      return;
    }
    
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!rawUsers) return;
    
    try {
      let allUsers = JSON.parse(rawUsers);
      allUsers = allUsers.filter((u: any) => u.username !== user.username);
      this.saveUsersToStorage(allUsers);
      this.messageService.add({ severity: 'info', summary: 'Usuario eliminado', detail: `Se eliminó a ${user.username}` });
    } catch (e) {
      console.error(e);
    }
  }

  togglePermission(permission: Permission): void {
    const currentPerms = this.userForm.value.permissions || [];
    const index = currentPerms.indexOf(permission);
    
    let newPerms: Permission[];
    if (index === -1) {
      newPerms = [...currentPerms, permission];
    } else {
      newPerms = currentPerms.filter(p => p !== permission);
    }
    
    this.userForm.patchValue({ permissions: newPerms });
  }

  hasPermissionSelected(permission: Permission): boolean {
    const currentPerms = this.userForm.value.permissions || [];
    return currentPerms.includes(permission);
  }
}

