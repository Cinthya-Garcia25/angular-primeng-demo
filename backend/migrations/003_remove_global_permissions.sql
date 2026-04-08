-- Migración: Eliminar permisos globales y convertir a sistema 100% por grupo
-- Esto implementa el modelo donde todos los permisos están amarrados a un grupo específico

-- 1. Crear tabla temporal para preservar permisos existentes como permisos de un grupo "default"
CREATE TEMPORARY TABLE temp_global_perms AS 
SELECT 
    u.id as usuario_id,
    u.username,
    unnest(u.permisos_globales) as permiso
FROM usuarios u
WHERE u.permisos_globales IS NOT NULL AND array_length(u.permisos_globales, 1) > 0;

-- 2. Crear un grupo "default" para usuarios que no tienen grupo asignado
INSERT INTO grupos (id, nombre, descripcion, creado_por, creado_en)
SELECT 
    gen_random_uuid(),
    'default_' || u.username,
    'Grupo por defecto para permisos globales migrados',
    u.id,
    CURRENT_TIMESTAMP
FROM usuarios u
WHERE u.permisos_globales IS NOT NULL 
  AND array_length(u.permisos_globales, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM grupo_miembros gm 
    WHERE gm.usuario_id = u.id
  );

-- 3. Migrar permisos globales a permisos de grupo
INSERT INTO grupo_miembros (id, usuario_id, grupo_id, rol, permisos, fecha_union)
SELECT 
    gen_random_uuid(),
    t.usuario_id,
    g.id,
    'member',
    ARRAY[t.permiso],
    CURRENT_TIMESTAMP
FROM temp_global_perms t
JOIN usuarios u ON u.id = t.usuario_id
JOIN grupos g ON g.nombre = 'default_' || u.username;

-- 4. Eliminar la columna permisos_globales
ALTER TABLE usuarios DROP COLUMN permisos_globales;

-- 5. Actualizar vistas y procedimientos si existen
DROP VIEW IF EXISTS vista_permisos_completos;

-- 6. Crear nueva vista que solo muestra permisos por grupo
CREATE VIEW vista_permisos_completos AS
SELECT 
    u.id as usuario_id,
    u.username,
    u.email,
    u.is_active,
    g.id as grupo_id,
    g.nombre as grupo_nombre,
    gm.permisos,
    gm.rol,
    gm.fecha_union
FROM usuarios u
LEFT JOIN grupo_miembros gm ON u.id = gm.usuario_id
LEFT JOIN grupos g ON gm.grupo_id = g.id
WHERE u.is_active = true;

-- 7. Actualizar índices para optimizar consultas de permisos por grupo
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_usuario_grupo ON grupo_miembros(usuario_id, grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_permisos ON grupo_miembros USING GIN(permisos);

-- 8. Registrar en auditoría
INSERT INTO permisos_auditoria (usuario_id, grupo_id, permiso_anterior, permiso_nuevo, accion, creado_por, creado_en)
SELECT 
    u.id,
    g.id,
    NULL,
    t.permiso,
    'migrated_from_global',
    u.id,
    CURRENT_TIMESTAMP
FROM temp_global_perms t
JOIN usuarios u ON u.id = t.usuario_id
JOIN grupos g ON g.nombre = 'default_' || u.username;

-- Limpiar tabla temporal
DROP TABLE temp_global_perms;

-- Comentarios para documentación
COMMENT ON TABLE usuarios IS 'Tabla de usuarios - sin permisos globales, todos los permisos son por grupo';
COMMENT ON TABLE grupo_miembros IS 'Tabla de miembros de grupo - contiene todos los permisos del usuario en ese grupo';
COMMENT ON VIEW vista_permisos_completos IS 'Vista completa de usuarios y sus permisos por grupo';
