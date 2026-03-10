import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { Permission } from './models/permissions.model';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pages/auth/login' },
  {
    path: 'pages/auth/login',
    loadComponent: () => import('./pages/auth/login/login.page').then((m) => m.LoginPageComponent)
  },
  {
    path: 'pages/auth/register',
    loadComponent: () => import('./pages/auth/register/register.page').then((m) => m.RegisterPageComponent)
  },
  {
    path: 'pages/auth/group-selection',
    loadComponent: () => import('./pages/auth/group-selection/group-selection').then((m) => m.GroupSelection)
  },
  {
    path: 'pages/landing',
    loadComponent: () => import('./pages/landing/landing.page').then((m) => m.LandingPageComponent)
  },
  {
    path: 'pages',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/layout/main-layout/main-layout').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'group-dashboard' },
      {
        path: 'home',
        redirectTo: 'group-dashboard'
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePageComponent),
        canActivate: [permissionGuard],
        data: { permissions: [Permission.USER_VIEW] }
      },
      {
        path: 'user',
        redirectTo: 'profile'
      },
      {
        path: 'groups',
        loadComponent: () => import('./pages/groups/groups.page').then((m) => m.GroupsPageComponent),
        canActivate: [permissionGuard],
        data: { permissions: [Permission.GROUP_VIEW] }
      },
      {
        path: 'tickets',
        loadComponent: () => import('./pages/tickets/tickets.page').then((m) => m.TicketsPageComponent),
        canActivate: [permissionGuard],
        data: { permissions: [Permission.TICKET_VIEW] }
      },
      {
        path: 'group-dashboard',
        loadComponent: () => import('./pages/group-dashboard/group-dashboard.page').then((m) => m.GroupDashboardPageComponent),
        canActivate: [permissionGuard],
        data: { permissions: [Permission.TICKET_VIEW] }
      },
      {
        path: 'group-settings',
        loadComponent: () => import('./pages/group-settings/group-settings.page').then((m) => m.GroupSettingsPageComponent),
        canActivate: [permissionGuard],
        data: { permissions: [Permission.GROUP_EDIT] }
      },
      {
        path: 'user-management',
        loadComponent: () => import('./pages/user-management/user-management.page').then((m) => m.UserManagementPageComponent),
        canActivate: [permissionGuard],
        data: { permissions: [Permission.USERS_VIEW] }
      },
      {
        path: 'kanban',
        loadComponent: () => import('./pages/kanban/kanban-board.page').then((m) => m.KanbanBoardPageComponent),
        canActivate: [permissionGuard],
        data: { permissions: [Permission.TICKET_VIEW] }
      }
    ]
  },
  { path: '**', redirectTo: 'pages/auth/login' }
];