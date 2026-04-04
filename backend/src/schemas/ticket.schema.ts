export const createTicketSchema = {
  type: 'object',
  required: ['grupo_id', 'titulo', 'estado_id', 'prioridad_id'],
  additionalProperties: false,
  properties: {
    grupo_id:    { type: 'string', format: 'uuid' },
    titulo:      { type: 'string', minLength: 1, maxLength: 500 },
    descripcion: { type: 'string', maxLength: 1000 },
    estado_id:   { type: 'string', format: 'uuid' },
    prioridad_id:{ type: 'string', format: 'uuid' },
    asignado_id: { type: 'string', format: 'uuid' },
    fecha_final: { type: 'string', format: 'date-time' }
  }
};

export const updateTicketSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    titulo:      { type: 'string', minLength: 1, maxLength: 500 },
    descripcion: { type: 'string', maxLength: 1000 },
    estado_id:   { type: 'string', format: 'uuid' },
    prioridad_id:{ type: 'string', format: 'uuid' },
    asignado_id: { type: 'string', format: 'uuid' },
    fecha_final: { type: 'string', format: 'date-time' }
  }
};

export const addCommentSchema = {
  type: 'object',
  required: ['text'],
  additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500 }
  }
};
