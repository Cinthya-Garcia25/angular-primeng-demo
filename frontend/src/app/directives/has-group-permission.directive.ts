import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { GroupsService } from '../services/groups.service';

@Directive({
  selector: '[hasGroupPermission]',
  standalone: true
})
export class HasGroupPermissionDirective {
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly groupsService = inject(GroupsService);

  private currentGroupId: string | null = null;
  private currentPermission: string | null = null;

  @Input() set hasGroupPermission(permission: string) {
    this.currentPermission = permission;
    this.updateView();
  }

  @Input() set hasGroupPermissionIn(groupId: string) {
    this.currentGroupId = groupId;
    this.updateView();
  }

  private updateView(): void {
    if (!this.currentGroupId || !this.currentPermission) {
      this.viewContainer.clear();
      return;
    }

    const hasPermission = this.groupsService.hasGroupPermission(this.currentGroupId, this.currentPermission);
    
    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
