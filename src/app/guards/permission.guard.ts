

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionsSvc = inject(PermissionsService);

  const permisos: string[] = route.data['permissions'] ?? [];

  // Si tiene al menos uno de los permisos requeridos, se permite la navegación.
  if (permissionsSvc.hasAnyPermission(permisos)) {
    return true;
  }

  // Si NO tiene permisos, simplemente se cancela la navegación.
  // No se redirige al login ni a una página de "Acceso denegado".
  return false;
};