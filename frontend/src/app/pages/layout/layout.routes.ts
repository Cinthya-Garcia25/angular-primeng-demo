import { Routes } from '@angular/router';
import { permissionGuard } from '../../guards/permission.guard';
import { Permission } from '../../models/permissions.model';

// Rutas hijas del layout principal (autenticadas)
export const layoutRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('../group-dashboard/group-dashboard.page').then(m => m.GroupDashboardPageComponent)
  },
  {
    path: 'group-tickets',
    loadComponent: () => import('../group-tickets/group-tickets.component').then(m => m.GroupTicketsComponent),
    canActivate: [permissionGuard],
    data: { permissions: [Permission.TICKET_VIEW, Permission.TICKETS_VIEW, Permission.TICKET_EDIT, Permission.TICKET_DELETE, Permission.TICKET_EDIT_STATE] }
  },
  {
    path: 'admin-group',
    loadComponent: () => import('../groups/groups.page').then(m => m.GroupsPageComponent),
    canActivate: [permissionGuard],
    data: { permissions: [Permission.GROUP_EDIT, Permission.GROUP_ADD, Permission.GROUP_DELETE] }
  },
  {
    path: 'admin-user',
    loadComponent: () => import('../user-management/user-management.page').then(m => m.UserManagementPageComponent),
    canActivate: [permissionGuard],
    data: { permissions: [Permission.USER_VIEW_ALL, Permission.USER_EDIT, Permission.USER_ADD, Permission.USER_REMOVE] }
  },
  {
    path: 'profile',
    loadComponent: () => import('../profile/profile.page').then(m => m.ProfilePageComponent),
    canActivate: [permissionGuard],
    data: { permissions: [Permission.USER_VIEW] }
  },
  { path: '',       pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**',     redirectTo: 'dashboard' }
];
