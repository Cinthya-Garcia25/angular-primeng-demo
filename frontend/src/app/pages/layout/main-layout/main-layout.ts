import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuItem } from 'primeng/api';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, ButtonModule, AvatarModule, MenuModule, ToolbarModule, SidebarComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayoutComponent implements OnInit {
  private readonly router  = inject(Router);
  private readonly authSvc = inject(AuthService);

  isSidebarCollapsed = false;
  userName = '';
  userInitials = '';
  userMenuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.userName = sessionStorage.getItem('authUser') || 'Usuario';
    this.userInitials = this.userName.substring(0, 2).toUpperCase();

    this.userMenuItems = [
      { label: 'Mi Perfil', icon: 'pi pi-user', command: () => this.router.navigate(['/profile']) },
      { separator: true },
      { label: 'Cerrar Sesión', icon: 'pi pi-sign-out', command: () => this.logout() }
    ];
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.authSvc.logout();
    this.router.navigate(['/login']);
  }
}
