import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';

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

interface UsersResponse { statusCode: number; intOpCode: string; data: User[] | null; }
interface UserResponse  { statusCode: number; intOpCode: string; data: User[]  | null; }

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
    return this.http.get<UsersResponse>('/api/users')
      .pipe(map(res => res.data ?? []));
  }

  getById(id: string) {
    return this.http.get<UserResponse>(`/api/users/${id}`)
      .pipe(map(res => res.data?.[0] ?? null));
  }

  update(id: string, payload: UpdateUserPayload) {
    return this.http.put<User>(`/api/users/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`/api/users/${id}`);
  }
}
