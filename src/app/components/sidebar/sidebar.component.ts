import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private readonly permissionsService = inject(PermissionsService);

  @Input() collapsed = false;
  @Output() logoutRequested = new EventEmitter<void>();

  readonly isLoggedIn = !!sessionStorage.getItem('authUser');
  readonly appVersion = 'v1.0.0';

  // Permisos reactivos del sidebar
  readonly canViewDashboard = this.permissionsService.canViewDashboard;
  readonly canViewGroups = this.permissionsService.canViewGroups;
  readonly canViewGroupSettings = this.permissionsService.canViewGroupSettings;
  readonly canViewUserManagement = this.permissionsService.canViewUserManagement;
  readonly canViewTickets = this.permissionsService.canViewTickets;

  requestLogout(): void {
    this.logoutRequested.emit();
  }
}
