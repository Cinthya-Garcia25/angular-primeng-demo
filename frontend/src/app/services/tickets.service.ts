import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { ApiResponse } from '../models/auth.model';

export interface Ticket {
  id: string;
  titulo: string;
  descripcion: string | null;
  creado_en: string;
  fecha_final: string | null;
  estados:    { id: string; codigo: string; nombre: string; color: string };
  prioridades:{ id: string; codigo: string; nombre: string; orden: number };
  autor:      { id: string; username: string; nombre_completo: string | null };
  asignado:   { id: string; username: string; nombre_completo: string | null } | null;
  grupos:     { id: string; nombre: string };
  comentarios: { id: string; contenido: string; creado_en: string; autor: { username: string } }[];
  historial_tickets: { id: string; accion: string; creado_en: string; usuario: { username: string } }[];
  tags?: string[];
}

export interface CreateTicketPayload {
  grupo_id:         string;
  titulo:           string;
  descripcion?:     string;
  estado_id?:       string;
  estado_codigo?:   string;
  prioridad_id?:    string;
  prioridad_codigo?: string;
  asignado_id?:     string;
  fecha_final?:     string;
}

export interface UpdateTicketPayload {
  titulo?:           string;
  descripcion?:      string;
  estado_id?:        string;
  estado_codigo?:    string;
  prioridad_id?:     string;
  prioridad_codigo?: string;
  asignado_id?:      string;
  fecha_final?:      string;
}

@Injectable({ providedIn: 'root' })
export class TicketsService {

  constructor(private http: HttpClient) {}

  getAll(grupo_id?: string) {
    let params = new HttpParams();
    if (grupo_id) params = params.set('grupo_id', grupo_id);
    return this.http.get<ApiResponse<Ticket>>('/api/tickets', { params })
      .pipe(map(res => res.data ?? []));
  }

  getById(id: string) {
    return this.http.get<ApiResponse<Ticket>>(`/api/tickets/${id}`)
      .pipe(map(res => res.data?.[0] ?? null));
  }

  create(payload: CreateTicketPayload) {
    return this.http.post<ApiResponse<{ id: string; titulo: string; creado_en: string }>>('/api/tickets', payload)
      .pipe(map(res => res.data?.[0]));
  }

  update(id: string, payload: UpdateTicketPayload) {
    return this.http.put<ApiResponse<{ id: string; titulo: string; creado_en: string }>>(`/api/tickets/${id}`, payload)
      .pipe(map(res => res.data?.[0]));
  }

  updateStatus(id: string, estadoCodigo: string) {
    return this.http.patch<ApiResponse<{ id: string; estado_id: string }>>(
      `/api/tickets/${id}/status`,
      { estado_codigo: estadoCodigo }
    ).pipe(map(res => res.data?.[0]));
  }

  addComment(id: string, text: string) {
    return this.http.post<ApiResponse<{ id: string; contenido: string; creado_en: string }>>(
      `/api/tickets/${id}/comments`, { text }
    ).pipe(map(res => res.data?.[0]));
  }

  delete(id: string) {
    return this.http.delete<ApiResponse<null>>(`/api/tickets/${id}`);
  }
}
