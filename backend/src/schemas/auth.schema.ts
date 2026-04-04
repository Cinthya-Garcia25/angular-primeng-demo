export const loginSchema = {
  type: 'object',
  required: ['username', 'password'],
  additionalProperties: false,
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 1 }
  }
};

export const registerSchema = {
  type: 'object',
  required: ['username', 'password', 'email'],
  additionalProperties: false,
  properties: {
    username:       { type: 'string', minLength: 3, maxLength: 50 },
    password:       { type: 'string', minLength: 6 },
    email:          { type: 'string', format: 'email' },
    nombre_completo:{ type: 'string', minLength: 5, maxLength: 255 },
    telefono:       { type: 'string', maxLength: 20 },
    direccion:      { type: 'string', maxLength: 500 }
  }
};

export const addUserSchema = {
  type: 'object',
  required: ['username', 'password', 'email'],
  additionalProperties: false,
  properties: {
    username:    { type: 'string', minLength: 3, maxLength: 50 },
    password:    { type: 'string', minLength: 6 },
    email:       { type: 'string', format: 'email' },
    permissions: {
      type: 'array',
      items: { type: 'string' },
      default: []
    },
    group_ids: {
      type: 'array',
      items: { type: 'string' },
      default: []
    }
  }
};
