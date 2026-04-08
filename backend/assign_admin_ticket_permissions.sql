-- Asignar permisos de tickets al administrador en todos los grupos
-- Esto permite que el admin pueda ver y gestionar tickets en cualquier grupo

-- Actualizar permisos del admin en cada grupo donde es miembro
UPDATE grupo_miembros 
SET permisos = ARRAY[
    'ticket:view',
    'ticket:edit',
    'ticket:add',
    'ticket:delete',
    'ticket:edit_state'
]
WHERE usuario_id = (SELECT id FROM usuarios WHERE username = 'admin');

-- Verificar los permisos asignados
SELECT 
    g.nombre as grupo,
    u.username,
    gm.permisos
FROM grupo_miembros gm
JOIN grupos g ON gm.grupo_id = g.id
JOIN usuarios u ON gm.usuario_id = u.id
WHERE u.username = 'admin'
ORDER BY g.nombre;
