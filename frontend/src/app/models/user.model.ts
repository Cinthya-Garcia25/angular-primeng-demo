// Modelo de usuario para el sistema ERP de tickets
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

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  permissions?: string[];
  group_ids?: string[];
}
