import { Component, inject, Input, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { PermissionsService } from '../../services/permissions.service';
import { DynamicPermissionsService } from '../../services/dynamic-permissions.service';
import { Permission } from '../../models/permissions.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  imports: [PanelMenuModule, ButtonModule, TooltipModule, DividerModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  private readonly perms  = inject(PermissionsService);
  private readonly dynamicPerms = inject(DynamicPermissionsService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly permissionsChanged$ = new Subject<void>();

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
    const canProfile = this.perms.hasPermission('user:view');

    this.updateMenuItems(canAdmin, canGroups, canUsers, canProfile);

    // Escuchar cambios de permisos para actualizar el menú dinámicamente
    this.dynamicPerms.onPermissionsChanged().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.updateMenuItems(
        this.perms.canViewAdmin(),
        this.perms.canViewGroups(),
        this.perms.canViewUserManagement(),
        this.perms.hasPermission('user:view')
      );
    });
  }

  ngOnDestroy(): void {
    this.permissionsChanged$.complete();
  }

  private updateMenuItems(canAdmin: boolean, canGroups: boolean, canUsers: boolean, canProfile: boolean): void {
    // Preserve the current expanded state so permission refreshes don't collapse the menu
    const adminExpanded = this.menuItems.find(i => i.label === 'Administración')?.expanded ?? false;

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
        expanded: adminExpanded,
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
        routerLink: '/profile',
        visible: canProfile
      }
    ];

    // Modo colapsado: aplanamos los hijos visibles del bloque Admin
    this.collapsedItems = [];
    for (const item of this.menuItems) {
      if (item.items?.length) {
        for (const child of item.items) {
          if (child.visible) this.collapsedItems.push(child);
        }
      } else {
        if (item.visible) this.collapsedItems.push(item);
      }
    }
  }

  navigate(link: string | string[] | undefined): void {
    if (!link) return;
    const path = Array.isArray(link) ? link : [link];
    this.router.navigate(path);
  }
}
