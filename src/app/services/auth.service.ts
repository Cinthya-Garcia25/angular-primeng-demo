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

    login(email: string, password: string) {
        return this.http.post<AuthResponse>('/api/auth/login', { email, password }).pipe(
            tap(res => {
                localStorage.setItem('token', res.token);
                this.permissionsSvc.setPermissions(res.user.permissions);
            })
        );
    }

    logout() {
        localStorage.removeItem('token');
        this.permissionsSvc.clearPermissions();
    }
}
