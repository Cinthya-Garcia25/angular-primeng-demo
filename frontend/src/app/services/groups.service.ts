import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class GroupsService {

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<Group>>('/api/groups').pipe(
      map(res => res.data ?? [])
    );
  }

  getById(id: string) {
    return this.http.get<ApiResponse<GroupDetail>>(`/api/groups/${id}`).pipe(
      map(res => res.data?.[0] ?? null)
    );
  }

  create(payload: CreateGroupPayload) {
    return this.http.post<ApiResponse<Group>>('/api/groups', payload).pipe(
      map(res => res.data?.[0] ?? null)
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
    return this.http.post<ApiResponse<null>>(`/api/groups/${groupId}/members`, { userId });
  }

  removeMember(groupId: string, userId: string) {
    return this.http.delete<ApiResponse<null>>(`/api/groups/${groupId}/members/${userId}`);
  }

  updateMemberPermissions(groupId: string, userId: string, permissions: string[]) {
    return this.http.put<ApiResponse<null>>(
      `/api/groups/${groupId}/members/${userId}/permissions`,
      { permissions }
    );
  }

  /** Permisos del usuario actual dentro de un grupo específico */
  getMyGroupPermissions(groupId: string) {
    return this.http
      .get<ApiResponse<{ permissions: string[] }>>(`/api/groups/${groupId}/members/me`)
      .pipe(map(res => res.data?.[0]?.permissions ?? []));
  }
}
