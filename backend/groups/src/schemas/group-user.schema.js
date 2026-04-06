// Schema para la relación grupo-usuario (grupo_miembros)
const addMemberSchema = {
  type: 'object',
  required: ['usuario_id'],
  additionalProperties: false,
  properties: {
    usuario_id: { type: 'string', format: 'uuid' }
  }
};

const removeMemberSchema = {
  type: 'object',
  required: ['usuario_id'],
  additionalProperties: false,
  properties: {
    usuario_id: { type: 'string', format: 'uuid' }
  }
};

module.exports = { addMemberSchema, removeMemberSchema };
