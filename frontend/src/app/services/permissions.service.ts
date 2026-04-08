import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

/** Claves de cache — deben coincidir con las de DynamicPermissionsService */
const CACHE_USER  = 'perm_cache_user';
const CACHE_GROUP = 'perm_cache_group';

function readCache(key: string): string[] {
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {

    /**
     * Inicializamos los signals directamente desde el cache de sessionStorage.
     * Esto garantiza que NUNCA partan de [] tras un page-refresh:
     * el valor correcto está disponible antes del primer render,
     * evitando ExpressionChangedAfterItHasBeenCheckedError (NG0100).
     */
    private permissions = signal<string[]>([]);
    private userPermissions  = signal<string[]>(readCache(CACHE_USER));
    private groupPermissions = signal<string[]>(readCache(CACHE_GROUP));

    /** Emite cada vez que los permisos cambian — la directiva se suscribe a esto. */
    private readonly _changed$ = new Subject<void>();
    readonly changed$ = this._changed$.asObservable();

    constructor() {}

    // ── Permisos administrativos globales ─────────────────────────────────────────────────

    setPermissions(perms: string[]) {
        this.permissions.set(perms);
        this.userPermissions.set(perms);
        this._changed$.next();
    }

    clearPermissions() {
        this.userPermissions.set([]);
        this.clearGroupPermissions();
    }

    getPermissions(): string[] {
        return this.permissions();
    }

    // ── Permisos por grupo ─────────────────────────────────────────────────

    setGroupPermissions(perms: string[]) {
        this.groupPermissions.set(perms);
        this._changed$.next();
    }

    clearGroupPermissions() {
        this.groupPermissions.set([]);
        this._changed$.next();
    }

    getGroupPermissions(): string[] {
        return this.groupPermissions();
    }

    // ── Verificación (híbrido: globales + de grupo) ────────────────────────────────────

    hasPermission(permission: string): boolean {
        const globalPerms = this.permissions();
        const groupPerms = this.groupPermissions();
        return globalPerms.includes(permission) || groupPerms.includes(permission);
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
        this.hasAnyPermission(['group:view', 'groups:manage', 'group:edit', 'group:add', 'group:delete'])
    );

    readonly canViewGroupSettings = computed(() =>
        this.hasPermission('group:edit')
    );

    readonly canViewUserManagement = computed(() =>
        this.hasAnyPermission(['users:manage', 'user:add', 'user:edit', 'user:delete', 'permissions:manage'])
    );

    readonly canViewTickets = computed(() =>
        this.hasAnyPermission(['ticket:view', 'tickets:view', 'ticket:edit', 'ticket:add', 'ticket:delete', 'ticket:edit_state'])
    );

    readonly canViewAdmin = computed(() =>
        this.hasAnyPermission(['groups:manage', 'users:manage', 'permissions:manage', 'user:add', 'user:delete', 'group:add', 'group:delete'])
    );
}
