import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Group {
  id: string;
  nombre: string;
  descripcion: string | null;
  creado_en: string;
}

export interface GroupDetail extends Group {
  miembros: {
    fecha_unido: string;
    usuarios: {
      id: string;
      username: string;
      nombre_completo: string | null;
      email: string;
    };
  }[];
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
    return this.http.get<Group[]>('/api/groups');
  }

  getById(id: string) {
    return this.http.get<GroupDetail>(`/api/groups/${id}`);
  }

  create(payload: CreateGroupPayload) {
    return this.http.post<Group>('/api/groups', payload);
  }

  update(id: string, payload: UpdateGroupPayload) {
    return this.http.put<Group>(`/api/groups/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`/api/groups/${id}`);
  }
}
