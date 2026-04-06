import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PermissionsService {

    private userPermissions  = signal<string[]>([]);
    private groupPermissions = signal<string[]>([]);

    constructor() {
        const savedGlobal = sessionStorage.getItem('userPermissions');
        if (savedGlobal) {
            try { this.userPermissions.set(JSON.parse(savedGlobal)); } catch { /* ignore */ }
        }
        const savedGroup = sessionStorage.getItem('groupPermissions');
        if (savedGroup) {
            try { this.groupPermissions.set(JSON.parse(savedGroup)); } catch { /* ignore */ }
        }
    }

    // ── Permisos globales ──────────────────────────────────────────────────

    setPermissions(perms: string[]) {
        this.userPermissions.set(perms);
        sessionStorage.setItem('userPermissions', JSON.stringify(perms));
    }

    clearPermissions() {
        this.userPermissions.set([]);
        sessionStorage.removeItem('userPermissions');
        this.clearGroupPermissions();
    }

    getPermissions(): string[] {
        return this.userPermissions();
    }

    // ── Permisos por grupo ─────────────────────────────────────────────────

    setGroupPermissions(perms: string[]) {
        this.groupPermissions.set(perms);
        sessionStorage.setItem('groupPermissions', JSON.stringify(perms));
    }

    clearGroupPermissions() {
        this.groupPermissions.set([]);
        sessionStorage.removeItem('groupPermissions');
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
        this.hasAnyPermission(['users:view', 'user:add', 'user:delete'])
    );

    readonly canViewTickets = computed(() =>
        this.hasAnyPermission(['ticket:view', 'tickets:view', 'ticket:edit', 'ticket:delete', 'ticket:edit_state'])
    );

    readonly canViewAdmin = computed(() =>
        this.canViewGroups() || this.canViewUserManagement() || this.canViewGroupSettings()
    );
}
