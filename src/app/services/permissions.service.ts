import { Injectable, signal, computed } from '@angular/core';

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

    readonly canViewDashboard = computed(() => true);

    readonly canViewGroups = computed(() =>
        this.hasAnyPermission(['group:edit', 'group:add', 'group:delete'])
    );

    readonly canViewGroupSettings = computed(() =>
        this.hasPermission('group:edit')
    );

    readonly canViewUserManagement = computed(() =>
        this.hasAnyPermission(['users:view', 'user:add', 'user:delete'])
    );

    readonly canViewTickets = computed(() =>
        this.hasAnyPermission(['ticket:view', 'tickets:view', 'ticket:edit', 'ticket:delete', 'ticket:edit_state'])
    );
}
