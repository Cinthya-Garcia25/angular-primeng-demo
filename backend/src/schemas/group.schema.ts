export const createGroupSchema = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 }
  }
};

export const updateGroupSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 }
  }
};
