import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { GroupsService } from '../services/groups.service';
import { PermissionsService } from '../services/permissions.service';

@Directive({
  selector: '[hasGroupPermission]',
  standalone: true
})
export class HasGroupPermissionDirective implements OnInit, OnDestroy {
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly groupsService = inject(GroupsService);
  private readonly permissionsService = inject(PermissionsService);

  private destroy$ = new Subject<void>();
  private currentGroupId: string | null = null;
  private currentPermission: string | null = null;

  // Main input for the permission
  @Input() set hasGroupPermission(permission: string) {
    this.currentPermission = permission;
    this.updateView();
  }

  // Additional input for group context
  @Input('hasGroupPermissionGroup') set group(groupId: string) {
    this.currentGroupId = groupId;
    this.updateView();
  }

  ngOnInit(): void {
    // Escuchar cambios de permisos para actualizar la vista automáticamente
    this.permissionsService.changed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    this.viewContainer.clear();

    if (!this.currentGroupId || !this.currentPermission) {
      return;
    }

    // Verificar si tiene el permiso específico del grupo
    const hasGroupPermission = this.groupsService.hasGroupPermission(this.currentGroupId, this.currentPermission);
    
    // También verificar si tiene el permiso global (para mayor flexibilidad)
    const hasGlobalPermission = this.permissionsService.hasPermission(this.currentPermission);

    if (hasGroupPermission || hasGlobalPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
