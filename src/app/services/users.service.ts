import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: string;
  username: string;
  email: string;
  nombre_completo: string | null;
  permisos_globales: string[];
  is_active: boolean;
  creado_en: string;
  groups?: { id: string; name: string }[];
}

export interface UpdateUserPayload {
  username?: string;
  email?: string;
  password?: string;
  nombre_completo?: string;
  telefono?: string;
  direccion?: string;
  permissions?: string[];
  group_ids?: string[];
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<User[]>('/api/users');
  }

  getById(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }

  update(id: string, payload: UpdateUserPayload) {
    return this.http.put<User>(`/api/users/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`/api/users/${id}`);
  }
}
