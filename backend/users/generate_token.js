const { signToken } = require('./src/utils/jwt');

const payload = {
  userId: '970d4fa7-0c62-4c3e-b59d-d7045f9209bf',
  username: 'superadmin',
  permissions: ['group:view', 'group:edit', 'group:add', 'group:delete', 'ticket:view', 'tickets:view', 'ticket:edit', 'ticket:add', 'ticket:delete', 'ticket:edit_state', 'user:view', 'users:view', 'user:edit', 'user:add', 'user:delete', 'permissions:manage', 'users:manage']
};

const newToken = signToken(payload);
console.log('Nuevo token válido:');
console.log(newToken);
