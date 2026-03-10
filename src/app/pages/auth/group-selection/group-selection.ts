import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { PermissionsService } from '../../../services/permissions.service';
import { Permission } from '../../../models/permissions.model';

export interface UserGroup {
  id: string;
  name: string;
}

/** Componente para seleccionar grupo */
@Component({
  selector: 'app-group-selection',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, RouterLink],
  templateUrl: './group-selection.html',
  styleUrl: './group-selection.css'
})
export class GroupSelection implements OnInit {
  private readonly router = inject(Router);
  private readonly permissionsService = inject(PermissionsService);

  groups: UserGroup[] = [];
  username = '';

  ngOnInit(): void {
    const authUser = sessionStorage.getItem('authUser');

    if (!authUser) {
      this.router.navigate(['/pages/auth/login']);
      return;
    }

    this.username = authUser;

    let userAssignedGroups: UserGroup[] = [];
    const rawAuthGroups = sessionStorage.getItem('authGroups');
    if (rawAuthGroups) {
      try {
        userAssignedGroups = JSON.parse(rawAuthGroups);
      } catch {
        userAssignedGroups = [];
      }
    }

    const canViewAllGroups = this.permissionsService.hasPermission(Permission.GROUP_VIEW);

    const rawGroups = localStorage.getItem('groupsCrudDataV3');
    if (rawGroups) {
      try {
        const parsed = JSON.parse(rawGroups);
        if (Array.isArray(parsed)) {
          let allGroups = parsed.map(g => ({
            id: String(g.id),
            name: g.name
          }));

          if (canViewAllGroups) {
            this.groups = allGroups;
          } else {
            this.groups = allGroups.filter(g => 
              userAssignedGroups.some(ug => ug.name === g.name || ug.id === g.id)
            );
          }
        }
      } catch {
        this.loadDefaultGroups(canViewAllGroups, userAssignedGroups);
      }
    } else {
      this.loadDefaultGroups(canViewAllGroups, userAssignedGroups);
    }
  }

  private loadDefaultGroups(canViewAllGroups: boolean, userAssignedGroups: UserGroup[]): void {
    const defaultGroups = [
      { id: '1', name: 'Equipo Dev' },
      { id: '2', name: 'Soporte' },
      { id: '3', name: 'UX/UI' },
      { id: '4', name: 'Ventas Corporativas' },
      { id: '5', name: 'Marketing Digital' },
      { id: '6', name: 'Product Management' },
      { id: '7', name: 'Quality Assurance' }
    ];
    
    if (canViewAllGroups) {
      this.groups = defaultGroups;
    } else {
      this.groups = defaultGroups.filter(g => 
        userAssignedGroups.some(ug => ug.name === g.name || ug.id === g.id)
      );
    }
  }

  selectGroup(group: UserGroup): void {
    sessionStorage.setItem('selectedGroupId', group.id);
    sessionStorage.setItem('selectedGroupName', group.name);
    this.navigateToDashboard();
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

  private navigateToDashboard(): void {
    if (this.permissionsService.hasPermission(Permission.TICKET_VIEW)) {
      this.router.navigate(['/pages/group-dashboard']);
      return;
    }
    if (this.permissionsService.hasPermission(Permission.USERS_VIEW)) {
      this.router.navigate(['/pages/home']);
      return;
    }
    this.router.navigate(['/pages/tickets']);
  }
}
