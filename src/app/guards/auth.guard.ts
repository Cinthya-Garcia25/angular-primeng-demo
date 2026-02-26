import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAuthenticated = !!sessionStorage.getItem('authUser');

  if (isAuthenticated) {
    return true;
  }

  return router.createUrlTree(['/pages/auth/login']);
};
