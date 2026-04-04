import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { PermissionsService } from './permissions.service';
import { AuthResponse } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

    constructor(
        private http: HttpClient,
        private permissionsSvc: PermissionsService
    ) {}

    login(username: string, password: string) {
        return this.http.post<AuthResponse>('/api/auth/login', { username, password }).pipe(
            tap(res => {
                localStorage.setItem('token', res.token);
                sessionStorage.setItem('authUser', res.user.name);
                sessionStorage.setItem('authUserId', res.user.id);
                sessionStorage.setItem('authGroups', JSON.stringify(res.user.groups));
                this.permissionsSvc.setPermissions(res.user.permissions);
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
        return this.http.post<{ message: string; user: { id: string; username: string; email: string } }>(
            '/api/auth/register',
            data
        );
    }

    logout() {
        localStorage.removeItem('token');
        sessionStorage.clear();
        this.permissionsSvc.clearPermissions();
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }
}
