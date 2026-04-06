import { Component, inject, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { PermissionsService } from '../../services/permissions.service';

@Component({
  selector: 'app-sidebar',
  imports: [PanelMenuModule, ButtonModule, TooltipModule, DividerModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  private readonly perms  = inject(PermissionsService);
  private readonly router = inject(Router);

  @Input() collapsed = false;
  readonly appVersion = 'v1.0.0';

  menuItems: MenuItem[]      = [];
  collapsedItems: MenuItem[] = [];

  ngOnInit(): void {
    // Evaluamos visibilidad leyendo los signals ya cargados en memoria —
    // sin ninguna llamada HTTP adicional.
    const canAdmin  = this.perms.canViewAdmin();
    const canGroups = this.perms.canViewGroups();
    const canUsers  = this.perms.canViewUserManagement();

    this.menuItems = [
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: '/dashboard'
      },
      {
        label: 'Administración',
        icon: 'pi pi-shield',
        visible: canAdmin,
        expanded: false,
        items: [
          {
            label: 'Grupos',
            icon: 'pi pi-sitemap',
            routerLink: '/admin/groups',
            visible: canGroups
          },
          {
            label: 'Usuarios',
            icon: 'pi pi-id-card',
            routerLink: '/admin/users',
            visible: canUsers
          }
        ]
      },
      {
        label: 'Perfil',
        icon: 'pi pi-user',
        routerLink: '/profile'
      }
    ];

    // Modo colapsado: aplanamos los hijos visibles del bloque Admin
    this.collapsedItems = [];
    for (const item of this.menuItems) {
      if (item.items?.length) {
        for (const child of item.items) {
          if (child.visible !== false) this.collapsedItems.push(child);
        }
      } else {
        if (item.visible !== false) this.collapsedItems.push(item);
      }
    }
  }

  navigate(link: string | string[] | undefined): void {
    if (!link) return;
    const path = Array.isArray(link) ? link : [link];
    this.router.navigate(path);
  }
}
