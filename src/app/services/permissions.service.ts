import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PermissionsService {

    private userPermissions = signal<string[]>([]);

    constructor() {
        const savedPerms = sessionStorage.getItem('userPermissions');
        if (savedPerms) {
            try {
                this.userPermissions.set(JSON.parse(savedPerms));
            } catch (e) {
                console.error('Error parsing permissions', e);
            }
        }
    }

    setPermissions(perms: string[]) {
        this.userPermissions.set(perms);
        sessionStorage.setItem('userPermissions', JSON.stringify(perms));
    }

    hasPermission(permiso: string): boolean {
        return this.userPermissions().includes(permiso);
    }

    hasAnyPermission(perms: string[]): boolean {
        return perms.some(p => this.hasPermission(p));
    }

    hasAllPermissions(perms: string[]): boolean {
        return perms.every(p => this.hasPermission(p));
    }

    getPermissions(): string[] {
        return this.userPermissions();
    }

    clearPermissions() {
        this.userPermissions.set([]);
        sessionStorage.removeItem('userPermissions');
    }
}