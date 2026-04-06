import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs';
import { PermissionsService } from './permissions.service';
import { DynamicPermissionsService } from './dynamic-permissions.service';
import { ApiResponse, AuthData, AuthResponse } from '../models/auth.model';

const TOKEN_COOKIE   = 'auth_token';
const COOKIE_TTL_HRS = 8;

@Injectable({ providedIn: 'root' })
export class AuthService {

    constructor(
        private http: HttpClient,
        private permissionsSvc: PermissionsService,
        private dynamicPermsSvc: DynamicPermissionsService
    ) {}

    // ── Cookie helpers ──────────────────────────────────────────────────────
    private setCookie(name: string, value: string, hours = COOKIE_TTL_HRS): void {
        const expires = new Date(Date.now() + hours * 3600 * 1000).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
    }

    private getCookie(name: string): string | null {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : null;
    }

    private deleteCookie(name: string): void {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    // ── Auth methods ────────────────────────────────────────────────────────
    login(username: string, password: string) {
        return this.http.post<AuthResponse>('/api/auth/login', { username, password }).pipe(
            map(res => {
                const payload = res.data?.[0];
                if (!payload) throw new Error('Respuesta inesperada del servidor');
                return payload;
            }),
            tap((payload: AuthData) => {
                this.setCookie(TOKEN_COOKIE, payload.token);

                sessionStorage.setItem('authUser',   payload.user.name);
                sessionStorage.setItem('authUserId', payload.user.id);
                sessionStorage.setItem('authGroups', JSON.stringify(payload.user.groups));

                // Cargar permisos del JWT como estado inicial
                this.permissionsSvc.setPermissions(payload.user.permissions as string[]);

                // Forzar recarga inmediata desde DB para tener permisos frescos
                this.dynamicPermsSvc.forceReload();
            })
        );
    }

    register(data: {
        username: string;
        email: string;
        password: string;
        nombre_completo?: string;
        telefono?: string;
        direccion?: string;
    }) {
        return this.http.post<ApiResponse<{ id: string; username: string; email: string }>>(
            '/api/auth/register',
            data
        );
    }

    logout(): void {
        this.deleteCookie(TOKEN_COOKIE);
        sessionStorage.clear();
        this.permissionsSvc.clearPermissions();
    }

    getToken(): string | null {
        return this.getCookie(TOKEN_COOKIE);
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }
}
