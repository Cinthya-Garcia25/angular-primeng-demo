-- SQL para diagnosticar por qué el usuario no puede eliminar tickets
-- Reemplaza 'TU_USER_ID' con el ID real del usuario
-- Reemplaza 'TU_GROUP_ID' con el ID del grupo activo

-- 1. Verificar permisos globales del usuario
SELECT 
    u.id,
    u.username,
    u.permisos_globales
FROM usuarios u
WHERE u.id = 'TU_USER_ID';

-- 2. Verificar permisos del usuario en el grupo
SELECT 
    gm.usuario_id,
    gm.grupo_id,
    g.nombre as grupo_nombre,
    gm.permisos
FROM grupo_miembros gm
JOIN grupos g ON gm.grupo_id = g.id
WHERE gm.usuario_id = 'TU_USER_ID'
  AND gm.grupo_id = 'TU_GROUP_ID';

-- 3. Verificar si el ticket existe y a qué grupo pertenece
SELECT 
    t.id,
    t.titulo,
    t.grupo_id,
    g.nombre as grupo_nombre
FROM tickets t
JOIN grupos g ON t.grupo_id = g.id
WHERE t.id = 'ID_DEL_TICKET';

-- 4. Verificar todos los permisos disponibles
SELECT codigo, nombre, descripcion 
FROM permisos 
WHERE codigo LIKE '%ticket%' OR codigo LIKE '%delete%';

-- 5. Verificación completa del usuario
SELECT 
    u.username,
    u.is_active,
    u.permisos_globales,
    -- Permisos combinados (globales + de grupo)
    ARRAY_CAT(u.permisos_globales, COALESCE(gm.permisos, ARRAY[]::TEXT[])) as permisos_efectivos
FROM usuarios u
LEFT JOIN grupo_miembros gm ON u.id = gm.usuario_id AND gm.grupo_id = 'TU_GROUP_ID'
WHERE u.id = 'TU_USER_ID';
