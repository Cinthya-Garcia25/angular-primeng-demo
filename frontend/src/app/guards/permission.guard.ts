import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { PermissionsService } from '../services/permissions.service';
import { DynamicPermissionsService } from '../services/dynamic-permissions.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionsSvc  = inject(PermissionsService);
  const dynamicPermsSvc = inject(DynamicPermissionsService);
  const router          = inject(Router);

  const required: string[] = route.data['permissions'] ?? [];

  // Si la ruta no declara permisos requeridos, se permite el acceso
  if (required.length === 0) return true;

  // Esperar a que los permisos estén cargados desde la DB antes de evaluar
  return dynamicPermsSvc.isReady().pipe(
    map(() => {
      const hasAccess = permissionsSvc.hasAnyPermission(required);
      return hasAccess ? true : router.createUrlTree(['/unauthorized']);
    })
  );
};
