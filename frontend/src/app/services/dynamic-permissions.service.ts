import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, EMPTY, Subject, BehaviorSubject, interval, switchMap, startWith, tap, catchError, map, filter, take } from 'rxjs';
import { PermissionsService } from './permissions.service';

interface PermissionsApiResponse {
    data: {
        permissions: string[];
        groupPermissions: string[];
    };
}

@Injectable({ providedIn: 'root' })
export class DynamicPermissionsService {
    private readonly permissionsUrl = '/api/users/permissions';

    private readonly CACHE_USER  = 'perm_cache_user';
    private readonly CACHE_GROUP = 'perm_cache_group';

    /** Emite cada vez que los permisos se actualizan desde la DB */
    private readonly changed$ = new Subject<void>();

    /**
     * true en cuanto los permisos están disponibles (cache o primer poll).
     * Los guards esperan este valor antes de evaluar acceso.
     */
    private readonly ready$ = new BehaviorSubject<boolean>(false);

    constructor(
        private http: HttpClient,
        private permissionsSvc: PermissionsService,
        private ngZone: NgZone
    ) {
        // Si PermissionsService ya arrancó con permisos cacheados, los guards
        // pueden evaluar de inmediato sin esperar el primer poll.
        if (sessionStorage.getItem(this.CACHE_USER)) {
            this.ready$.next(true);
        }

        // Correr el polling DENTRO de la zona de Angular para que cada
        // respuesta HTTP dispare change detection automáticamente.
        this.ngZone.run(() => {
            interval(15_000).pipe(
                startWith(0),
                switchMap(() => this.poll())
            ).subscribe();
        });
    }

    // ── Internos ─────────────────────────────────────────────────────────────

    private buildHeaders(): HttpHeaders {
        const groupId = sessionStorage.getItem('selectedGroupId');
        let headers = new HttpHeaders();
        if (groupId) headers = headers.set('x-group-id', groupId);
        return headers;
    }

    private applyPermissions(res: PermissionsApiResponse): void {
        const perms      = res?.data?.permissions      ?? []; // Permisos administrativos globales
        const groupPerms = res?.data?.groupPermissions ?? []; // Permisos funcionales del grupo

        // Modelo híbrido: permisos globales + permisos de grupo
        this.permissionsSvc.setPermissions(perms);
        this.permissionsSvc.setGroupPermissions(groupPerms);

        sessionStorage.setItem(this.CACHE_USER,  JSON.stringify(perms));
        sessionStorage.setItem(this.CACHE_GROUP, JSON.stringify(groupPerms));

        this.changed$.next();
        if (!this.ready$.value) this.ready$.next(true);
    }

    private poll(): Observable<void> {
        if (!sessionStorage.getItem('authUserId')) return EMPTY;

        return this.http
            .get<PermissionsApiResponse>(this.permissionsUrl, { headers: this.buildHeaders() })
            .pipe(
                tap(res => this.applyPermissions(res)),
                map(() => void 0),
                catchError(() => EMPTY)
            );
    }

    // ── API pública ──────────────────────────────────────────────────────────

    /** Fuerza una recarga inmediata desde la DB. Retorna Observable para que el caller sepa cuándo terminó. */
    forceReload(): Observable<void> {
        return this.poll();
    }

    /**
     * Recarga permisos desde DB y actualiza PermissionsService.
     * Retorna Observable<void> — callers solo necesitan next/error.
     */
    refreshPermissions(): Observable<void> {
        return this.http
            .get<PermissionsApiResponse>(this.permissionsUrl, { headers: this.buildHeaders() })
            .pipe(
                tap(res => this.applyPermissions(res)),
                map(() => void 0)
            );
    }

    /** Observable que emite cada vez que los permisos cambian */
    onPermissionsChanged(): Observable<void> {
        return this.changed$.asObservable();
    }

    /**
     * Emite una vez en cuanto el primer poll haya completado.
     * Los guards lo usan para no evaluar permisos antes de que carguen.
     */
    isReady(): Observable<boolean> {
        return this.ready$.pipe(filter(v => v), take(1));
    }
}
