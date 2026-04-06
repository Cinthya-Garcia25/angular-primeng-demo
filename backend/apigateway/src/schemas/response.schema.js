// Esquemas de respuesta estándar del gateway
const errorSchema = {
  type: 'object',
  properties: {
    error:   { type: 'string' },
    detail:  { type: 'string' }
  }
};

const successSchema = {
  type: 'object',
  properties: {
    message: { type: 'string' }
  }
};

const paginatedSchema = {
  type: 'object',
  properties: {
    data:  { type: 'array' },
    total: { type: 'number' },
    page:  { type: 'number' }
  }
};

module.exports = { errorSchema, successSchema, paginatedSchema };
