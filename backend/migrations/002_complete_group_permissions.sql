-- ============================================================
-- MIGRATION: Complete Group Permission System
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Asegurar que la tabla permisos tenga todos los permisos requeridos
INSERT INTO permisos (codigo, nombre, descripcion) VALUES
    ('group:view', 'Ver grupos', 'Permite ver grupos en el sistema'),
    ('group:add', 'Crear grupos', 'Permite crear nuevos grupos'),
    ('group:edit', 'Editar grupos', 'Permite editar información de grupos'),
    ('group:remove', 'Eliminar grupos', 'Permite eliminar grupos'),
    
    ('ticket:view', 'Ver tickets del grupo', 'Permite ver tickets del grupo asignado'),
    ('tickets:view', 'Ver todos los tickets', 'Permite ver todos los tickets del sistema'),
    ('ticket:add', 'Crear tickets', 'Permite crear nuevos tickets'),
    ('ticket:edit', 'Editar tickets', 'Permite editar contenido de tickets'),
    ('ticket:edit:state', 'Cambiar estado tickets', 'Permite cambiar estado de tickets'),
    ('ticket:edit:delete', 'Eliminar tickets', 'Permite eliminar tickets'),
    
    ('user:view', 'Ver perfil propio', 'Permite ver solo el perfil propio'),
    ('user:add', 'Crear usuarios', 'Permite crear nuevos usuarios'),
    ('user:edit', 'Editar usuarios', 'Permite editar información de usuarios'),
    ('user:remove', 'Eliminar usuarios', 'Permite eliminar usuarios'),
    
    ('permissions:manage', 'Gestionar permisos', 'Permite gestionar permisos de usuarios y grupos')
ON CONFLICT (codigo) DO UPDATE SET 
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion;

-- 2. Asegurar que la tabla grupo_miembros tenga la columna permisos
ALTER TABLE grupo_miembros
  ADD COLUMN IF NOT EXISTS permisos text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN grupo_miembros.permisos
  IS 'Permisos específicos del usuario dentro de este grupo (contextuales al grupo)';

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_usuario_id ON grupo_miembros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_grupo_id ON grupo_miembros(grupo_id);
CREATE INDEX IF NOT EXISTS idx_grupo_miembros_permisos ON grupo_miembros USING GIN(permisos);

-- 4. Crear tabla de log de cambios de permisos (auditoría)
CREATE TABLE IF NOT EXISTS permisos_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    grupo_id UUID REFERENCES grupos(id),
    permiso_anterior text[],
    permiso_nuevo text[],
    accion VARCHAR(20) NOT NULL, -- 'GRANT', 'REVOKE', 'UPDATE'
    modificado_por UUID NOT NULL REFERENCES usuarios(id),
    fecha_modificacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permisos_auditoria_usuario_id ON permisos_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permisos_auditoria_grupo_id ON permisos_auditoria(grupo_id);

-- 5. Función para auditar cambios de permisos
CREATE OR REPLACE FUNCTION auditar_cambio_permisos()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO permisos_auditoria (usuario_id, grupo_id, permiso_anterior, permiso_nuevo, accion, modificado_por)
        VALUES (
            NEW.usuario_id,
            NEW.grupo_id,
            OLD.permisos,
            NEW.permisos,
            'UPDATE',
            current_setting('app.current_user_id')::UUID
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO permisos_auditoria (usuario_id, grupo_id, permiso_anterior, permiso_nuevo, accion, modificado_por)
        VALUES (
            NEW.usuario_id,
            NEW.grupo_id,
            '{}',
            NEW.permisos,
            'GRANT',
            current_setting('app.current_user_id')::UUID
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO permisos_auditoria (usuario_id, grupo_id, permiso_anterior, permiso_nuevo, accion, modificado_por)
        VALUES (
            OLD.usuario_id,
            OLD.grupo_id,
            OLD.permisos,
            '{}',
            'REVOKE',
            current_setting('app.current_user_id')::UUID
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear trigger para auditoría (solo si no existe)
DROP TRIGGER IF EXISTS trigger_auditar_permisos ON grupo_miembros;
CREATE TRIGGER trigger_auditar_permisos
    AFTER INSERT OR UPDATE OR DELETE ON grupo_miembros
    FOR EACH ROW EXECUTE FUNCTION auditar_cambio_permisos();

-- 7. Vista para facilitar consultas de permisos completos
CREATE OR REPLACE VIEW vista_permisos_completos AS
SELECT 
    u.id as usuario_id,
    u.username,
    u.permisos_globales,
    COALESCE(
        array_agg(DISTINCT gm.permisos) FILTER (WHERE gm.permisos IS NOT NULL AND gm.permisos != '{}'),
        ARRAY[]::text[]
    ) as permisos_por_grupo,
    g.id as grupo_id,
    g.nombre as grupo_nombre
FROM usuarios u
LEFT JOIN grupo_miembros gm ON u.id = gm.usuario_id
LEFT JOIN grupos g ON gm.grupo_id = g.id
GROUP BY u.id, u.username, u.permisos_globales, g.id, g.nombre;
