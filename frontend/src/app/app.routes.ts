import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { Permission } from './models/permissions.model';

export const routes: Routes = [
  // ── Redirección raíz ─────────────────────────────────────────────────────
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // ── Rutas públicas (sin layout) ──────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.page').then((m) => m.LoginPageComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.page').then((m) => m.RegisterPageComponent)
  },
  {
    path: 'group-selection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/auth/group-selection/group-selection').then((m) => m.GroupSelection)
  },

  // ── Rutas protegidas (con layout) ────────────────────────────────────────
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/layout/main-layout/main-layout').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      // Dashboard principal: selección de grupo
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/group-dashboard/group-dashboard.page').then(
            (m) => m.GroupDashboardPageComponent
          )
      },

      // Lista de tickets del grupo seleccionado
      {
        path: 'groups/:id/list',
        canActivate: [permissionGuard],
        data: { permissions: [Permission.TICKET_VIEW] },
        loadComponent: () =>
          import('./pages/tickets/tickets.page').then((m) => m.TicketsPageComponent)
      },

      // Admin: Grupos
      {
        path: 'admin/groups',
        canActivate: [permissionGuard],
        data: { permissions: [Permission.GROUP_EDIT, Permission.GROUP_ADD, Permission.GROUP_DELETE] },
        loadComponent: () =>
          import('./pages/admin-group/admin-group.component').then((m) => m.AdminGroupComponent)
      },

      // Admin: Usuarios
      {
        path: 'admin/users',
        canActivate: [permissionGuard],
        data: { permissions: [Permission.USER_VIEW_ALL, Permission.USER_ADD, Permission.USER_REMOVE] },
        loadComponent: () =>
          import('./pages/user-management/user-management.page').then(
            (m) => m.UserManagementPageComponent
          )
      },

      // Perfil
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.page').then((m) => m.ProfilePageComponent)
      }
    ]
  },

  // ── Fallback ─────────────────────────────────────────────────────────────
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./pages/unauthorized/unauthorized.page').then((m) => m.UnauthorizedPageComponent)
  },
  { path: '**', redirectTo: 'login' }
];
