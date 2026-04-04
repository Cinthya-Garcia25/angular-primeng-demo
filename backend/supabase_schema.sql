-- ============================================================
-- SCHEMA CORREGIDO para angular-primeng-demo
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- ── 1. TABLAS BASE (sin dependencias) ───────────────────────

CREATE TABLE IF NOT EXISTS prioridades (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20)  NOT NULL UNIQUE,   -- 'alta' | 'media' | 'baja'
    nombre VARCHAR(50)  NOT NULL,
    orden  INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS estados (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30)  NOT NULL UNIQUE,   -- 'pendiente' | 'en_progreso' | etc.
    nombre VARCHAR(50)  NOT NULL,
    color  VARCHAR(7)                      -- hex: '#FF5733'
);

CREATE TABLE IF NOT EXISTS permisos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      VARCHAR(100) NOT NULL UNIQUE,  -- 'group:view', 'ticket:edit_state'
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    creado_en   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. USUARIOS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username            VARCHAR(50)  NOT NULL UNIQUE,
    email               VARCHAR(255) NOT NULL UNIQUE,
    password_hash       TEXT         NOT NULL,             -- REQUERIDO para auth
    nombre_completo     VARCHAR(255),
    direccion           TEXT,
    telefono            VARCHAR(20),
    fecha_inicio        DATE         NOT NULL DEFAULT CURRENT_DATE,
    last_login          TIMESTAMPTZ,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE, -- para desactivar cuentas
    permisos_globales   TEXT[]       NOT NULL DEFAULT '{}', -- codigos: 'group:view', etc.
    creado_en           TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. GRUPOS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS grupos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT,
    creador_id  UUID NOT NULL REFERENCES usuarios(id),
    creado_en   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. RELACIÓN GRUPO ↔ MIEMBROS ─────────────────────────────

CREATE TABLE IF NOT EXISTS grupo_miembros (
    grupo_id    UUID NOT NULL REFERENCES grupos(id)   ON DELETE CASCADE,
    usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha_unido TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (grupo_id, usuario_id)
);

-- ── 5. PERMISOS POR GRUPO POR USUARIO ────────────────────────

CREATE TABLE IF NOT EXISTS grupo_usuario_permisos (
    grupo_id   UUID NOT NULL REFERENCES grupos(id)   ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (grupo_id, usuario_id, permiso_id)
);

-- ── 6. TICKETS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tickets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id    UUID         NOT NULL REFERENCES grupos(id)      ON DELETE CASCADE,
    titulo      VARCHAR(500) NOT NULL,
    descripcion TEXT,
    autor_id    UUID         NOT NULL REFERENCES usuarios(id),
    asignado_id UUID                  REFERENCES usuarios(id)    ON DELETE SET NULL,
    estado_id   UUID         NOT NULL REFERENCES estados(id),
    prioridad_id UUID        NOT NULL REFERENCES prioridades(id),
    fecha_final TIMESTAMPTZ,
    creado_en   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- ── 7. COMENTARIOS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comentarios (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID NOT NULL REFERENCES tickets(id)  ON DELETE CASCADE,
    autor_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    contenido  TEXT NOT NULL,
    creado_en  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 8. HISTORIAL DE TICKETS ──────────────────────────────────

CREATE TABLE IF NOT EXISTS historial_tickets (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID         NOT NULL REFERENCES tickets(id)  ON DELETE CASCADE,
    usuario_id UUID                  REFERENCES usuarios(id) ON DELETE SET NULL,
    accion     VARCHAR(200) NOT NULL,
    detalles   JSONB,
    creado_en  TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DATOS INICIALES (SEED)
-- ============================================================

-- Prioridades
INSERT INTO prioridades (codigo, nombre, orden) VALUES
    ('alta',  'Alta',  1),
    ('media', 'Media', 2),
    ('baja',  'Baja',  3)
ON CONFLICT (codigo) DO NOTHING;

-- Estados
INSERT INTO estados (codigo, nombre, color) VALUES
    ('pendiente',   'Pendiente',   '#6B7280'),
    ('en_progreso', 'En progreso', '#3B82F6'),
    ('revision',    'Revisión',    '#F59E0B'),
    ('hecho',       'Hecho',       '#10B981'),
    ('bloqueado',   'Bloqueado',   '#EF4444')
ON CONFLICT (codigo) DO NOTHING;

-- Permisos (codigos que usa el frontend)
INSERT INTO permisos (codigo, nombre) VALUES
    ('group:view',         'Ver grupos'),
    ('group:edit',         'Editar grupos'),
    ('group:add',          'Agregar grupos'),
    ('group:delete',       'Eliminar grupos'),
    ('ticket:view',        'Ver ticket'),
    ('tickets:view',       'Ver todos los tickets'),
    ('ticket:edit',        'Editar ticket'),
    ('ticket:add',         'Crear ticket'),
    ('ticket:delete',      'Eliminar ticket'),
    ('ticket:edit_state',  'Cambiar estado de ticket'),
    ('user:view',          'Ver usuario'),
    ('users:view',         'Ver todos los usuarios'),
    ('user:edit',          'Editar usuario'),
    ('user:add',           'Agregar usuario'),
    ('user:delete',        'Eliminar usuario'),
    ('permissions:manage', 'Gestionar permisos')
ON CONFLICT (codigo) DO NOTHING;
