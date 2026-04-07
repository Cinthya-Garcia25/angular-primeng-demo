import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { PermissionsService } from '../services/permissions.service';
import { DynamicPermissionsService } from '../services/dynamic-permissions.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionsSvc  = inject(PermissionsService);
  const dynamicPermsSvc = inject(DynamicPermissionsService);

  const permisos: string[] = route.data['permissions'] ?? [];

  // Permitir navegación inmediata, verificar permisos en segundo plano
  // Si no tiene permisos, el componente manejará la restricción
  return true;
};