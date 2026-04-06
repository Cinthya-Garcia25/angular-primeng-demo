-- Agrega columna de permisos por grupo a la tabla grupo_miembros.
-- Ejecutar una sola vez en Supabase SQL Editor.

ALTER TABLE grupo_miembros
  ADD COLUMN IF NOT EXISTS permisos text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN grupo_miembros.permisos
  IS 'Permisos específicos del usuario dentro de este grupo (complementan permisos globales)';
