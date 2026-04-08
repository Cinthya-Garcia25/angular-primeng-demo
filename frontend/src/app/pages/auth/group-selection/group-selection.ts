import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { PermissionsService } from '../../../services/permissions.service';
import { DynamicPermissionsService } from '../../../services/dynamic-permissions.service';
import { AuthService } from '../../../services/auth.service';
import { GroupsService } from '../../../services/groups.service';

export interface UserGroup {
  id: string;
  name: string;
}

/** Componente para seleccionar grupo */
@Component({
  selector: 'app-group-selection',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './group-selection.html',
  styleUrl: './group-selection.css'
})
export class GroupSelection implements OnInit {
  private readonly router = inject(Router);
  private readonly permissionsService = inject(PermissionsService);
  private readonly dynamicPermsSvc   = inject(DynamicPermissionsService);
  private readonly authService = inject(AuthService);
  private readonly groupsService = inject(GroupsService);

  groups: UserGroup[] = [];
  username = '';

  ngOnInit(): void {
    const authUser = sessionStorage.getItem('authUser');

    if (!authUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.username = authUser;

    const rawAuthGroups = sessionStorage.getItem('authGroups');
    if (rawAuthGroups) {
      try {
        this.groups = JSON.parse(rawAuthGroups);
      } catch {
        this.groups = [];
      }
    }
  }

  selectGroup(group: UserGroup): void {
    sessionStorage.setItem('selectedGroupId', group.id);
    sessionStorage.setItem('selectedGroupName', group.name);

    // Recargar permisos globales + de grupo desde DB en una sola llamada.
    // El interceptor ya añade x-group-id automáticamente desde sessionStorage.
    this.dynamicPermsSvc.refreshPermissions().subscribe({
      next:  () => {
        // Cargar automáticamente los permisos específicos del grupo
        this.groupsService.loadGroupPermissions(group.id);
        this.navigateToDashboard();
      },
      error: () => {
        this.permissionsService.clearGroupPermissions();
        this.navigateToDashboard();
      }
    });
  }

  groupIcon(groupId: string): string {
    const icons = ['pi-code', 'pi-comments', 'pi-desktop', 'pi-chart-bar', 'pi-globe', 'pi-box', 'pi-shield', 'pi-palette', 'pi-wallet', 'pi-id-card'];
    const index = (parseInt(groupId, 10) || 1) % icons.length;
    return `pi ${icons[index]}`;
  }

  groupColor(groupId: string): string {
    const colors = ['#4f46e5', '#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb', '#c026d3', '#065f46', '#92400e'];
    const index = (parseInt(groupId, 10) || 1) % colors.length;
    return colors[index];
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private navigateToDashboard(): void {
    // Siempre llevamos al usuario al dashboard del grupo.
    // Los permisos internos del dashboard se encargan de decidir si puede ver tickets o no.
    this.router.navigate(['/dashboard']);
  }
}
