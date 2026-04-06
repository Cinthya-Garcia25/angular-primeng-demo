import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PermissionsService {

    private userPermissions  = signal<string[]>([]);
    private groupPermissions = signal<string[]>([]);

    constructor() {
        // Ya no usamos sessionStorage, dependemos del DynamicPermissionsService
    }

    // ── Permisos globales ──────────────────────────────────────────────────

    setPermissions(perms: string[]) {
        this.userPermissions.set(perms);
    }

    clearPermissions() {
        this.userPermissions.set([]);
        this.clearGroupPermissions();
    }

    getPermissions(): string[] {
        return this.userPermissions();
    }

    // ── Permisos por grupo ─────────────────────────────────────────────────

    setGroupPermissions(perms: string[]) {
        this.groupPermissions.set(perms);
    }

    clearGroupPermissions() {
        this.groupPermissions.set([]);
    }

    getGroupPermissions(): string[] {
        return this.groupPermissions();
    }

    // ── Verificación (global OR grupo) ────────────────────────────────────

    hasPermission(permiso: string): boolean {
        return this.userPermissions().includes(permiso) ||
               this.groupPermissions().includes(permiso);
    }

    hasAnyPermission(perms: string[]): boolean {
        return perms.some(p => this.hasPermission(p));
    }

    hasAllPermissions(perms: string[]): boolean {
        return perms.every(p => this.hasPermission(p));
    }

    /** Unión de permisos globales + permisos del grupo activo */
    getEffectivePermissions(): string[] {
        return [...new Set([...this.userPermissions(), ...this.groupPermissions()])];
    }

    // ── Computed para sidebar ──────────────────────────────────────────────

    readonly canViewDashboard = computed(() => true);

    readonly canViewGroups = computed(() =>
        this.hasAnyPermission(['group:edit', 'group:add', 'group:delete'])
    );

    readonly canViewGroupSettings = computed(() =>
        this.hasPermission('group:edit')
    );

    readonly canViewUserManagement = computed(() =>
        this.hasAnyPermission(['users:manage', 'users:view', 'user:add', 'user:delete'])
    );

    readonly canViewTickets = computed(() =>
        this.hasAnyPermission(['ticket:view', 'tickets:view', 'ticket:add', 'ticket:edit', 'ticket:delete', 'ticket:edit_state'])
    );

    readonly canViewAdmin = computed(() =>
        this.canViewGroups() || this.canViewUserManagement() || this.canViewGroupSettings()
    );
}
