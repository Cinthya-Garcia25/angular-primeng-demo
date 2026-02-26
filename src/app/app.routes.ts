import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pages/auth/login' },
  {
    path: 'pages/auth/login',
    loadComponent: () => import('./pages/auth/login/login.page').then((m) => m.LoginPageComponent)
  },
  {
    path: 'pages/auth/register',
    loadComponent: () => import('./pages/auth/register/register.page').then((m) => m.RegisterPageComponent)
  },
  {
    path: 'pages/landing',
    loadComponent: () => import('./pages/landing/landing.page').then((m) => m.LandingPageComponent)
  },
  {
    path: 'pages',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/layout/main-layout/main-layout').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePageComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'pages/auth/login' }
];

