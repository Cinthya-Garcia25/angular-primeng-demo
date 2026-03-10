import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PermissionsService } from '../../services/permissions.service';
import { Permission } from '../../models/permissions.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ButtonModule, HasPermissionDirective],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private readonly permissionsService = inject(PermissionsService);

  @Input() collapsed = false;
  @Output() logoutRequested = new EventEmitter<void>();

  readonly isLoggedIn = !!sessionStorage.getItem('authUser');
  readonly appVersion = 'v1.0.0';

  requestLogout(): void {
    this.logoutRequested.emit();
  }
}
