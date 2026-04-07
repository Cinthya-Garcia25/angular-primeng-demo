import { Directive, DestroyRef, Input, OnChanges, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PermissionsService } from '../services/permissions.service';

/**
 * Directiva estructural que muestra/oculta contenido según permisos.
 *
 * Usa una suscripción explícita a PermissionsService.changed$ en lugar de
 * effect() de signals, para evitar que la re-evaluación se encadene al ciclo
 * de change-detection de Angular y destruya el elemento justo cuando el usuario
 * hace clic (causa del bug de "doble clic").
 *
 * Uso:
 *   <div *ifHasPermission="'ticket:add'">…</div>
 *   <div *ifHasPermission="['ticket:add', 'ticket:edit']">…</div>
 */
@Directive({
    selector: '[ifHasPermission]',
    standalone: true
})
export class HasPermissionDirective implements OnInit, OnChanges {

    @Input('ifHasPermission') permisos: string | string[] = '';

    private hasView = false;

    private readonly permissionsSvc = inject(PermissionsService);
    private readonly templateRef    = inject(TemplateRef<any>);
    private readonly viewContainer  = inject(ViewContainerRef);
    private readonly destroyRef     = inject(DestroyRef);

    ngOnInit(): void {
        // Evaluación inicial
        this.updateView();

        // Re-evaluar solo cuando los permisos cambian explícitamente,
        // sin depender del scheduler de signals/effects de Angular.
        this.permissionsSvc.changed$.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => this.updateView());
    }

    ngOnChanges(): void {
        this.updateView();
    }

    private updateView(): void {
        const list = Array.isArray(this.permisos) ? this.permisos : [this.permisos];
        const shouldShow = this.permissionsSvc.hasAnyPermission(list);

        if (shouldShow && !this.hasView) {
            this.viewContainer.createEmbeddedView(this.templateRef);
            this.hasView = true;
        } else if (!shouldShow && this.hasView) {
            this.viewContainer.clear();
            this.hasView = false;
        }
    }
}
