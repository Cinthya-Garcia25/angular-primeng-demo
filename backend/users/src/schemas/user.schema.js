// Migrado desde backend/src/schemas/auth.schema.ts y user.schema.ts
const loginSchema = {
  type: 'object',
  required: ['username', 'password'],
  additionalProperties: false,
  properties: {
    username: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 1 }
  }
};

const registerSchema = {
  type: 'object',
  required: ['username', 'password', 'email'],
  additionalProperties: false,
  properties: {
    username:        { type: 'string', minLength: 3, maxLength: 50 },
    password:        { type: 'string', minLength: 6 },
    email:           { type: 'string', format: 'email' },
    nombre_completo: { type: 'string', minLength: 5, maxLength: 255 },
    telefono:        { type: 'string', maxLength: 20 },
    direccion:       { type: 'string', maxLength: 500 }
  }
};

const addUserSchema = {
  type: 'object',
  required: ['username', 'password', 'email'],
  additionalProperties: false,
  properties: {
    username:    { type: 'string', minLength: 3, maxLength: 50 },
    password:    { type: 'string', minLength: 6 },
    email:       { type: 'string', format: 'email' },
    permissions: { type: 'array', items: { type: 'string' }, default: [] },
    group_ids:   { type: 'array', items: { type: 'string' }, default: [] }
  }
};

const updateUserSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    username:        { type: 'string', minLength: 3, maxLength: 50 },
    email:           { type: 'string', format: 'email' },
    password:        { type: 'string', minLength: 6 },
    nombre_completo: { type: 'string', minLength: 2, maxLength: 255 },
    is_active:       { type: 'boolean' },
    permissions:     { type: 'array', items: { type: 'string' } },
    group_ids:       { type: 'array', items: { type: 'string' } }
  }
};

module.exports = { loginSchema, registerSchema, addUserSchema, updateUserSchema };
