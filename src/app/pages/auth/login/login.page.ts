import { Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PermissionsService } from '../../../services/permissions.service';
import { Permission } from '../../../models/permissions.model';

export interface UserGroup {
  id: string;
  name: string;
}

interface AuthCredential {
  username: string;
  password: string;
  isActive?: boolean;
  permissions: Permission[];
  groups: UserGroup[];
}

const REGISTERED_USERS_KEY = 'registeredUsers';

@Component({
  selector: 'app-login-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly permissionsService = inject(PermissionsService);

  private readonly defaultCredentials: AuthCredential[] = [
    {
      username: 'superadmin',
      password: 'Superadmin@1234',
      permissions: [
        Permission.GROUP_VIEW, Permission.GROUP_EDIT, Permission.GROUP_ADD, Permission.GROUP_DELETE,
        Permission.TICKET_VIEW, Permission.TICKET_EDIT, Permission.TICKET_ADD, Permission.TICKET_DELETE, Permission.TICKET_EDIT_STATE,
        Permission.USER_VIEW, Permission.USERS_VIEW, Permission.USER_EDIT, Permission.USER_ADD, Permission.USER_DELETE
      ],
      groups: [
        { id: '1', name: 'Equipo Dev' },
        { id: '2', name: 'Soporte' },
        { id: '3', name: 'UX/UI' },
        { id: '4', name: 'Ventas Corporativas' },
        { id: '5', name: 'Marketing Digital' },
        { id: '6', name: 'Product Management' },
        { id: '7', name: 'Quality Assurance' }
      ]
    },
    {
      username: 'ids15',
      password: 'Ids15@2026',
      permissions: [
        Permission.GROUP_VIEW,
        Permission.TICKET_VIEW,
        Permission.TICKET_EDIT_STATE,
        Permission.USER_VIEW,
        Permission.USER_EDIT
      ],
      groups: [
        { id: '1', name: 'Equipo Dev' },
        { id: '2', name: 'Soporte' },
        { id: '4', name: 'Ventas Corporativas' },
        { id: '5', name: 'Marketing Digital' }
      ]
    },
    {
      username: 'cinthya',
      password: 'Cinthya@2026',
      permissions: [
        Permission.GROUP_VIEW,
        Permission.TICKET_VIEW,
        Permission.TICKET_EDIT_STATE,
        Permission.USER_VIEW,
        Permission.USER_EDIT
      ],
      groups: [
        { id: '3', name: 'UX/UI' },
        { id: '6', name: 'Product Management' },
        { id: '7', name: 'Quality Assurance' }
      ]
    }
  ];

  readonly loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const loggedUser = sessionStorage.getItem('authUser');
    if (loggedUser) {
      this.router.navigate(['/pages/home']);
    }
  }

  controlHasError(controlName: 'username' | 'password'): boolean {
    const control = this.loginForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private getStoredCredentials(): AuthCredential[] {
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!rawUsers) return [];

    try {
      const parsedUsers = JSON.parse(rawUsers);
      if (!Array.isArray(parsedUsers)) return [];

      return parsedUsers
        .filter((user) => typeof user?.username === 'string' && typeof user?.password === 'string')
        .map((user): AuthCredential => ({
          username: user.username,
          password: user.password,
          isActive: user.isActive !== false,
          permissions: Array.isArray(user.permissions) ? user.permissions : [],
          groups: Array.isArray(user.groups) ? user.groups : []
        }));
    } catch {
      return [];
    }
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Debes completar usuario y contrasena.'
      });
      return;
    }

    const username = this.loginForm.controls.username.value?.trim().toLowerCase() ?? '';
    const password = this.loginForm.controls.password.value ?? '';
    const credentialPool = [...this.defaultCredentials, ...this.getStoredCredentials()];
    const credentialMatch = credentialPool.find(
      (credential) => credential.username === username && credential.password === password
    );

    if (credentialMatch?.isActive === false) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cuenta desactivada',
        detail: 'Tu cuenta esta desactivada. Debes restaurarla para volver a ingresar.'
      });
      return;
    }

    if (credentialMatch) {
      sessionStorage.setItem('authUser', credentialMatch.username);
      sessionStorage.setItem('authGroups', JSON.stringify(credentialMatch.groups));

      this.permissionsService.setPermissions(credentialMatch.permissions);

      this.messageService.add({
        severity: 'success',
        summary: 'Ingreso exitoso',
        detail: `Bienvenido, ${username}. Por favor, selecciona un grupo.`
      });

      this.router.navigate(['/pages/auth/group-selection']);
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Credenciales invalidas',
      detail: 'Usuario o contrasena incorrectos.'
    });
  }
}