-- Verificar y actualizar permisos del superadministrador
SELECT username, permisos_globales FROM usuarios WHERE username = 'admin';

-- Si los permisos no están completos, actualizarlos
UPDATE usuarios 
SET permisos_globales = [
    'group:view',
    'group:edit',
    'group:add',
    'group:delete',
    'ticket:view',
    'tickets:view',
    'ticket:edit',
    'ticket:add',
    'ticket:delete',
    'ticket:edit_state',
    'user:view',
    'users:view',
    'user:edit',
    'user:add',
    'user:delete',
    'permissions:manage'
]
WHERE username = 'admin';

-- Verificar resultado
SELECT username, permisos_globales FROM usuarios WHERE username = 'admin';
