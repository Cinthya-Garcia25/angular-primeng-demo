export const updateUserSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    username:    { type: 'string', minLength: 3, maxLength: 50 },
    email:       { type: 'string', format: 'email' },
    password:    { type: 'string', minLength: 6 },
    is_active:   { type: 'boolean' },
    permissions: { type: 'array', items: { type: 'string' } },
    group_ids:   { type: 'array', items: { type: 'string' } }
  }
};
