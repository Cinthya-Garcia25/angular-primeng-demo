-- Actualizar permisos del administrador con sintaxis correcta para PostgreSQL/Supabase
UPDATE usuarios 
SET permisos_globales = ARRAY[
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
]::text[]
WHERE username = 'admin';

-- Verificar resultado
SELECT username, permisos_globales FROM usuarios WHERE username = 'admin';
