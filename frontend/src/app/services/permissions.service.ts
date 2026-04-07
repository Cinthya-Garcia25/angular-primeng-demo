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
    private userPermissions  = signal<string[]>(readCache(CACHE_USER));
    private groupPermissions = signal<string[]>(readCache(CACHE_GROUP));

    /** Emite cada vez que los permisos cambian — la directiva se suscribe a esto. */
    private readonly _changed$ = new Subject<void>();
    readonly changed$ = this._changed$.asObservable();

    constructor() {}

    // ── Permisos globales ──────────────────────────────────────────────────

    setPermissions(perms: string[]) {
        this.userPermissions.set(perms);
        this._changed$.next();
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
        this._changed$.next();
    }

    clearGroupPermissions() {
        this.groupPermissions.set([]);
        this._changed$.next();
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
        this.hasAnyPermission(['group:view', 'group:edit', 'group:add', 'group:remove'])
    );

    readonly canViewGroupSettings = computed(() =>
        this.hasPermission('group:edit')
    );

    readonly canViewUserManagement = computed(() =>
        this.hasAnyPermission(['user:view:all', 'user:edit', 'user:add', 'user:remove', 'permissions:manage'])
    );

    readonly canViewTickets = computed(() =>
        this.hasAnyPermission(['ticket:view', 'tickets:view', 'ticket:add', 'ticket:edit', 'ticket:edit:delete', 'ticket:edit:state'])
    );

    readonly canViewAdmin = computed(() =>
        this.canViewGroups() || this.canViewUserManagement() || this.canViewGroupSettings()
    );
}
