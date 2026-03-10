import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';

@Directive({
    selector: '[ifHasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnInit {

    @Input('ifHasPermission') permisos: string | string[] = '';

    constructor(
        private permissionsSvc: PermissionsService,
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef
    ) {}

    ngOnInit() {
        const permisosArray = Array.isArray(this.permisos)
            ? this.permisos
            : [this.permisos];

        if (this.permissionsSvc.hasAnyPermission(permisosArray)) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
            this.viewContainer.clear();
        }
    }
}