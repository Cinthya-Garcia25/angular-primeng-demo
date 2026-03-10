

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const permissionsSvc = inject(PermissionsService);
    const router = inject(Router);

    const permisos: string[] = route.data['permissions'] ?? [];

    if (permissionsSvc.hasAnyPermission(permisos)) {
        return true;
    }

    router.navigate(['/unauthorized']);
    return false;
};