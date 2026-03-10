import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PermissionsService } from '../../services/permissions.service';
import { Permission } from '../../models/permissions.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

interface GroupUser {
  email: string;
  addedAt: string;
}

const GROUP_SETTINGS_KEY = 'groupSettingsDataV2';

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
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './group-settings.page.html',
  styleUrl: './group-settings.page.css'
})
export class GroupSettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  
  currentGroupId = '';
  groupName = '';
  
  users: GroupUser[] = [];
  
  addUserDialogVisible = false;
  
  readonly groupForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]]
  });

  readonly addUserForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  ngOnInit(): void {
    this.currentGroupId = sessionStorage.getItem('selectedGroupId') || '1';
    this.groupName = sessionStorage.getItem('selectedGroupName') || 'Equipo Dev';
    this.groupForm.patchValue({ name: this.groupName });
    this.loadUsers();
  }

  saveGroupSettings(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }
    
    const newName = this.groupForm.value.name?.trim() || '';
    this.groupName = newName;
    sessionStorage.setItem('selectedGroupName', newName);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Configuración guardada',
      detail: 'El nombre del grupo ha sido actualizado.'
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
    
    const email = this.addUserForm.value.email?.trim().toLowerCase() || '';
    
    if (this.users.some(u => u.email === email)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Usuario existente',
        detail: 'Este usuario ya pertenece al grupo.'
      });
      return;
    }
    
    this.users = [
      ...this.users,
      {
        email,
        addedAt: new Date().toLocaleDateString('es-MX')
      }
    ];
    
    this.persistUsers();
    this.closeAddUserDialog();
    
    this.messageService.add({
      severity: 'success',
      summary: 'Usuario añadido',
      detail: `Se ha añadido a ${email} al grupo.`
    });
  }

  removeUser(user: GroupUser): void {
    this.users = this.users.filter(u => u.email !== user.email);
    this.persistUsers();
    
    this.messageService.add({
      severity: 'info',
      summary: 'Usuario eliminado',
      detail: `Se ha eliminado a ${user.email} del grupo.`
    });
  }

  private loadUsers(): void {
    const rawData = localStorage.getItem(`${GROUP_SETTINGS_KEY}_${this.currentGroupId}`);
    if (rawData) {
      try {
        this.users = JSON.parse(rawData);
      } catch {
        this.seedUsers();
      }
    } else {
      this.seedUsers();
    }
  }

  private persistUsers(): void {
    localStorage.setItem(`${GROUP_SETTINGS_KEY}_${this.currentGroupId}`, JSON.stringify(this.users));
  }

  private seedUsers(): void {
    this.users = [
      { email: 'admin@demo.com', addedAt: '01/01/2026' },
      { email: 'usuario1@demo.com', addedAt: '15/02/2026' },
      { email: 'usuario2@demo.com', addedAt: '20/02/2026' }
    ];
    this.persistUsers();
  }
}

