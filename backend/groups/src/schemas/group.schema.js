// Migrado desde backend/src/schemas/group.schema.ts
const createGroupSchema = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 }
  }
};

const updateGroupSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 }
  }
};

module.exports = { createGroupSchema, updateGroupSchema };
