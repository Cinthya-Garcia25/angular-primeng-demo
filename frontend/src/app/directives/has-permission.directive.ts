import { Directive, effect, Input, OnChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionsService } from '../services/permissions.service';

/**
 * Directiva estructural reactiva.
 * Se re-evalúa automáticamente cada vez que cambian los signals de PermissionsService
 * (por ejemplo, tras un poll de DynamicPermissionsService que actualiza permisos desde DB).
 *
 * Uso:
 *   <div *ifHasPermission="'ticket:add'">…</div>
 *   <div *ifHasPermission="['ticket:add', 'ticket:edit']">…</div>
 */
@Directive({
    selector: '[ifHasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnChanges {

    @Input('ifHasPermission') permisos: string | string[] = '';

    private hasView = false;

    constructor(
        private permissionsSvc: PermissionsService,
        private templateRef: TemplateRef<any>,
        private viewContainer: ViewContainerRef
    ) {
        // effect() se re-ejecuta cada vez que un signal leído dentro cambia.
        // hasAnyPermission() lee userPermissions() y groupPermissions() internamente,
        // por lo que este effect reacciona a cualquier cambio de permisos.
        effect(() => this.updateView());
    }

    // También reacciona si el input @Input cambia en runtime
    ngOnChanges() {
        this.updateView();
    }

    private updateView(): void {
        const permisosArray = Array.isArray(this.permisos)
            ? this.permisos
            : [this.permisos];

        const shouldShow = this.permissionsSvc.hasAnyPermission(permisosArray);

        if (shouldShow && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!shouldShow && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }
}
