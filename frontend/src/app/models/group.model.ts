// Modelo de grupo para el sistema ERP de tickets
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
