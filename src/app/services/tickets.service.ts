import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Ticket {
  id: string;
  titulo: string;
  descripcion: string | null;
  creado_en: string;
  fecha_final: string | null;
  estados: { id: string; codigo: string; nombre: string; color: string };
  prioridades: { id: string; codigo: string; nombre: string; orden: number };
  autor: { id: string; username: string; nombre_completo: string | null };
  asignado: { id: string; username: string; nombre_completo: string | null } | null;
  grupos: { id: string; nombre: string };
  comentarios: {
    id: string;
    contenido: string;
    creado_en: string;
    autor: { username: string };
  }[];
  historial_tickets: {
    id: string;
    accion: string;
    creado_en: string;
    usuario: { username: string };
  }[];
}

export interface CreateTicketPayload {
  grupo_id: string;
  titulo: string;
  descripcion?: string;
  estado_id: string;
  prioridad_id: string;
  asignado_id?: string;
  fecha_final?: string;
}

export interface UpdateTicketPayload {
  titulo?: string;
  descripcion?: string;
  estado_id?: string;
  prioridad_id?: string;
  asignado_id?: string;
  fecha_final?: string;
}

@Injectable({ providedIn: 'root' })
export class TicketsService {

  constructor(private http: HttpClient) {}

  getAll(grupo_id?: string) {
    const params = grupo_id ? { grupo_id } : {};
    return this.http.get<Ticket[]>('/api/tickets', { params });
  }

  getById(id: string) {
    return this.http.get<Ticket>(`/api/tickets/${id}`);
  }

  create(payload: CreateTicketPayload) {
    return this.http.post<{ id: string; titulo: string; creado_en: string }>('/api/tickets', payload);
  }

  update(id: string, payload: UpdateTicketPayload) {
    return this.http.put<{ id: string; titulo: string; creado_en: string }>(`/api/tickets/${id}`, payload);
  }

  updateStatus(id: string, estado_id: string) {
    return this.http.patch<{ id: string; estado_id: string }>(`/api/tickets/${id}/status`, { estado_id });
  }

  addComment(id: string, text: string) {
    return this.http.post<{ id: string; contenido: string; creado_en: string }>(
      `/api/tickets/${id}/comments`,
      { text }
    );
  }

  delete(id: string) {
    return this.http.delete<{ message: string }>(`/api/tickets/${id}`);
  }
}
