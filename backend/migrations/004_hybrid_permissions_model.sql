-- Migración: Implementar modelo híbrido de permisos
-- Permisos administrativos globales + permisos funcionales por grupo

-- 1. Restaurar columna permisos_globales para permisos administrativos
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos_globales TEXT[] DEFAULT '{}';

-- 2. Definir permisos administrativos que deben ser globales
WITH admin_permissions AS (
    SELECT unnest(ARRAY[
        'users:manage',      -- Administrar usuarios del sistema
        'user:add',          -- Crear usuarios
        'user:remove',        -- Eliminar usuarios
        'user:deactivated',   -- Desactivar usuarios
        'user:activated',     -- Activar usuarios
        'groups:manage',     -- Administrar grupos del sistema
        'group:add',         -- Crear grupos
        'group:remove',       -- Eliminar grupos
        'permissions:manage', -- Gestionar permisos
        'user:view',         -- Ver perfil propio (base)
        'group:view'         -- Ver grupos disponibles (base)
    ]) as permiso
),

-- 3. Identificar usuarios que deberían tener permisos administrativos globales
-- (usuarios que actualmente tienen permisos de gestión en algún grupo)
admin_users AS (
    SELECT DISTINCT gm.usuario_id
    FROM grupo_miembros gm
    WHERE EXISTS (
        SELECT 1 FROM unnest(gm.permisos) p 
        WHERE p IN ('groups:manage', 'users:manage', 'permissions:manage')
    )
)

-- 4. Asignar permisos administrativos globales a los usuarios identificados
UPDATE usuarios u
SET permisos_globales = (
    SELECT ARRAY_AGG(ap.permiso)
    FROM admin_permissions ap
)
WHERE EXISTS (SELECT 1 FROM admin_users au WHERE au.usuario_id = u.id);

-- 5. Crear índice para optimizar consultas de permisos globales
CREATE INDEX IF NOT EXISTS idx_usuarios_permisos_globales ON usuarios USING GIN(permisos_globales);

-- 6. Actualizar vista combinada
DROP VIEW IF EXISTS vista_permisos_completos;

CREATE VIEW vista_permisos_completos AS
SELECT 
    u.id as usuario_id,
    u.username,
    u.email,
    u.is_active,
    u.permisos_globales,
    g.id as grupo_id,
    g.nombre as grupo_nombre,
    gm.permisos as grupo_permisos,
    gm.rol,
    gm.fecha_union
FROM usuarios u
LEFT JOIN grupo_miembros gm ON u.id = gm.usuario_id
LEFT JOIN grupos g ON gm.grupo_id = g.id
WHERE u.is_active = true;

-- 7. Registrar cambios en auditoría
INSERT INTO permisos_auditoria (usuario_id, grupo_id, permiso_anterior, permiso_nuevo, accion, creado_por, creado_en)
SELECT 
    u.id,
    NULL, -- No aplica a grupo específico
    NULL,
    ap.permiso,
    'granted_as_global_admin',
    u.id,
    CURRENT_TIMESTAMP
FROM usuarios u
CROSS JOIN admin_permissions ap
WHERE EXISTS (SELECT 1 FROM admin_users au WHERE au.usuario_id = u.id);

-- 8. Comentarios para documentación
COMMENT ON COLUMN usuarios.permisos_globales IS 'Permisos administrativos globales del usuario (users:manage, groups:manage, permissions:manage, etc.)';
COMMENT ON COLUMN grupo_miembros.permisos IS 'Permisos funcionales del usuario dentro del grupo (ticket:add, ticket:edit, etc.)';
COMMENT ON VIEW vista_permisos_completos IS 'Vista completa que combina permisos globales administrativos con permisos funcionales por grupo';

-- 9. Validación: Asegurar que no haya permisos funcionales en globales
UPDATE usuarios 
SET permisos_globales = permisos_globales - ARRAY['ticket:add', 'ticket:edit', 'ticket:view', 'group:edit']
WHERE permisos_globales && ARRAY['ticket:add', 'ticket:edit', 'ticket:view', 'group:edit'];

-- 10. Estadísticas de la migración
DO $$
DECLARE
    admin_count INTEGER;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count 
    FROM usuarios 
    WHERE array_length(permisos_globales, 1) > 0;
    
    SELECT COUNT(*) INTO total_users FROM usuarios;
    
    RAISE NOTICE 'Migración completada: %/% usuarios tienen permisos administrativos globales', admin_count, total_users;
END $$;
