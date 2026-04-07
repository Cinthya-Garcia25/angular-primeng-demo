import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, BehaviorSubject } from 'rxjs';
import { ApiResponse } from '../models/auth.model';

export interface Group {
  id: string;
  nombre: string;
  descripcion: string | null;
  creado_en: string;
}

export interface GroupMember {
  fecha_unido: string;
  permisos: string[];
  usuarios: {
    id: string;
    username: string;
    nombre_completo: string | null;
    email: string;
  };
}

export interface GroupDetail extends Group {
  miembros: GroupMember[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/groups';

  // Caché de permisos por grupo
  private groupPermissionsCache = new BehaviorSubject<Map<string, string[]>>(new Map());
  public groupPermissions$ = this.groupPermissionsCache.asObservable();

  getAll() {
    return this.http.get<ApiResponse<Group>>(`${this.baseUrl}`).pipe(
      map((res: ApiResponse<Group>) => res.data ?? [])
    );
  }

  getById(id: string) {
    return this.http.get<ApiResponse<GroupDetail>>(`${this.baseUrl}/${id}`).pipe(
      map((res: ApiResponse<GroupDetail>) => res.data?.[0] ?? null)
    );
  }

  create(payload: CreateGroupPayload) {
    return this.http.post<ApiResponse<Group>>('/api/groups', payload).pipe(
      map((res: ApiResponse<Group>) => res.data?.[0] ?? null)
    );
  }

  update(id: string, payload: UpdateGroupPayload) {
    return this.http.put<ApiResponse<Group>>(`/api/groups/${id}`, payload).pipe(
      map(res => res.data?.[0] ?? null)
    );
  }

  delete(id: string) {
    return this.http.delete<ApiResponse<null>>(`/api/groups/${id}`);
  }

  // ── Member management ──────────────────────────────────────────────────────

  addMember(groupId: string, userId: string) {
    const headers = new HttpHeaders().set('x-group-id', groupId);
    return this.http.post<ApiResponse<null>>(`/api/groups/${groupId}/members`, { userId }, { headers });
  }

  removeMember(groupId: string, userId: string) {
    const headers = new HttpHeaders().set('x-group-id', groupId);
    return this.http.delete<ApiResponse<null>>(`/api/groups/${groupId}/members/${userId}`, { headers });
  }

  updateMemberPermissions(groupId: string, userId: string, permissions: string[]) {
    const headers = new HttpHeaders().set('x-group-id', groupId);
    return this.http.put<ApiResponse<null>>(
      `/api/groups/${groupId}/members/${userId}/permissions`,
      { permissions },
      { headers }
    );
  }

  /** Permisos del usuario actual dentro de un grupo específico */
  getMyGroupPermissions(groupId: string) {
    return this.http
      .get<ApiResponse<{ permissions: string[] }>>(`/api/groups/${groupId}/members/me`)
      .pipe(map((res: ApiResponse<{ permissions: string[] }>) => res.data?.[0]?.permissions ?? []));
  }

  /** Obtener permisos de un usuario específico en un grupo */
  getMemberPermissions(groupId: string, userId: string) {
    return this.http
      .get<ApiResponse<{ permissions: string[] }>>(`/api/groups/${groupId}/members/${userId}/permissions`)
      .pipe(map((res: ApiResponse<{ permissions: string[] }>) => res.data?.[0]?.permissions ?? []));
  }

  /** Obtener todos los permisos disponibles para asignar en un grupo */
  getAvailablePermissions(groupId: string) {
    return this.http
      .get<ApiResponse<{ codigo: string; nombre: string; descripcion: string }[]>>(`/api/groups/${groupId}/permissions`)
      .pipe(map((res: ApiResponse<{ codigo: string; nombre: string; descripcion: string }[]>) => res.data ?? []));
  }

  /** Obtener historial de cambios de permisos de un grupo */
  getPermissionAudit(groupId: string) {
    return this.http
      .get<ApiResponse<any[]>>(`/api/groups/${groupId}/permissions/audit`)
      .pipe(map((res: ApiResponse<any[]>) => res.data ?? []));
  }

  // ── Métodos para permisos por grupo ─────────────────────────────────────────────

  /** Cargar y cachear permisos del usuario para un grupo específico */
  loadGroupPermissions(groupId: string): void {
    this.getMyGroupPermissions(groupId).subscribe((permissions: string[]) => {
      const currentCache = this.groupPermissionsCache.value;
      currentCache.set(groupId, permissions);
      this.groupPermissionsCache.next(new Map(currentCache));
    });
  }

  /** Verificar si el usuario tiene un permiso específico en un grupo */
  hasGroupPermission(groupId: string, permission: string): boolean {
    const cache = this.groupPermissionsCache.value;
    const groupPerms = cache.get(groupId) || [];
    return groupPerms.includes(permission);
  }

  /** Obtener todos los permisos del usuario para un grupo */
  getGroupPermissions(groupId: string): string[] {
    const cache = this.groupPermissionsCache.value;
    return cache.get(groupId) || [];
  }

  /** Actualizar permisos en caché (después de modificaciones) */
  updateGroupPermissionsCache(groupId: string, permissions: string[]): void {
    const currentCache = this.groupPermissionsCache.value;
    currentCache.set(groupId, permissions);
    this.groupPermissionsCache.next(new Map(currentCache));
  }

  /** Limpiar caché de permisos de un grupo */
  clearGroupPermissions(groupId: string): void {
    const currentCache = this.groupPermissionsCache.value;
    currentCache.delete(groupId);
    this.groupPermissionsCache.next(new Map(currentCache));
  }

  /** Limpiar toda la caché de permisos por grupo */
  clearAllGroupPermissions(): void {
    this.groupPermissionsCache.next(new Map());
  }
}
