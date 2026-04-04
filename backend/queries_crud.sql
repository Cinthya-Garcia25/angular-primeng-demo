
-- QUERIES CRUD: Users, Groups, Tickets

-- USERS (usuarios)

-- CREATE — Registrar nuevo usuario
-- Usado en: POST /api/auth/register (página Register) y POST /api/auth/users (User Management)
INSERT INTO usuarios (username, email, password_hash, nombre_completo, is_active, permisos_globales)
VALUES (
    'nuevo_usuario',
    'nuevo@email.com',
    '$2a$10$hash_bcrypt_aqui',
    'Nombre Completo',
    true,
    ARRAY['group:view', 'ticket:view', 'ticket:edit_state', 'user:view', 'user:edit']
)
RETURNING id, username, email, creado_en;

-- READ — Listar todos los usuarios
-- Usado en: GET /api/users → pantalla User Management (tabla de usuarios)
SELECT id, username, email, nombre_completo, is_active, permisos_globales, creado_en
FROM usuarios
ORDER BY creado_en DESC;

-- READ — Obtener un usuario por ID con sus grupos
-- Usado en: GET /api/users/:id → perfil de usuario
SELECT
    u.id, u.username, u.email, u.nombre_completo,
    u.is_active, u.permisos_globales, u.creado_en,
    g.id     AS grupo_id,
    g.nombre AS grupo_nombre
FROM usuarios u
LEFT JOIN grupo_miembros gm ON gm.usuario_id = u.id
LEFT JOIN grupos g ON g.id = gm.grupo_id
WHERE u.id = 'UUID_DEL_USUARIO';

-- READ — Buscar usuario por username (login)
-- Usado en: POST /api/auth/login → verifica credenciales en la página Login
SELECT id, username, email, password_hash, is_active, permisos_globales, nombre_completo
FROM usuarios
WHERE username = 'nombre_usuario'
LIMIT 1;

-- UPDATE — Actualizar datos del usuario
-- Usado en: PUT /api/users/:id → botón Guardar en el diálogo de edición (User Management)
UPDATE usuarios
SET
    email             = 'nuevo@email.com',
    nombre_completo   = 'Nuevo Nombre',
    is_active         = true,
    permisos_globales = ARRAY['group:view', 'ticket:view']
WHERE id = 'UUID_DEL_USUARIO'
RETURNING id, username, email, is_active, permisos_globales;

-- UPDATE — Registrar último login
-- Usado en: POST /api/auth/login → se ejecuta automáticamente al iniciar sesión
UPDATE usuarios
SET last_login = CURRENT_TIMESTAMP
WHERE id = 'UUID_DEL_USUARIO';

-- DELETE — Eliminar usuario
-- Usado en: DELETE /api/users/:id → botón eliminar (icono papelera) en User Management
DELETE FROM usuarios
WHERE id = 'UUID_DEL_USUARIO';



-- GROUPS (grupos)

-- CREATE — Crear nuevo grupo
-- Usado en: POST /api/groups → botón "Nuevo Grupo" en pantalla Groups
INSERT INTO grupos (nombre, descripcion, creador_id)
VALUES (
    'Equipo Dev',
    'Equipo de desarrollo de software',
    'UUID_DEL_CREADOR'
)
RETURNING id, nombre, descripcion, creado_en;

-- CREATE — Agregar creador como miembro automáticamente
-- Usado en: POST /api/groups → se ejecuta justo después de crear el grupo
INSERT INTO grupo_miembros (grupo_id, usuario_id)
VALUES ('UUID_DEL_GRUPO', 'UUID_DEL_USUARIO');

-- READ — Listar todos los grupos
-- Usado en: GET /api/groups → pantalla Groups (tabla de grupos)
SELECT id, nombre, descripcion, creado_en
FROM grupos
ORDER BY nombre;

-- READ — Obtener grupo con sus miembros
-- Usado en: GET /api/groups/:id → pantalla Group Settings
SELECT
    g.id, g.nombre, g.descripcion, g.creado_en,
    u.id       AS usuario_id,
    u.username AS usuario_username,
    u.email    AS usuario_email,
    gm.fecha_unido
FROM grupos g
LEFT JOIN grupo_miembros gm ON gm.grupo_id = g.id
LEFT JOIN usuarios u ON u.id = gm.usuario_id
WHERE g.id = 'UUID_DEL_GRUPO';

-- READ — Obtener grupos de un usuario específico
-- Usado en: POST /api/auth/login → carga los grupos del usuario para la pantalla Group Selection
SELECT g.id, g.nombre, g.descripcion, gm.fecha_unido
FROM grupos g
INNER JOIN grupo_miembros gm ON gm.grupo_id = g.id
WHERE gm.usuario_id = 'UUID_DEL_USUARIO';

-- UPDATE — Actualizar datos del grupo
-- Usado en: PUT /api/groups/:id → botón Guardar en Group Settings
UPDATE grupos
SET
    nombre      = 'Nuevo Nombre',
    descripcion = 'Nueva descripción'
WHERE id = 'UUID_DEL_GRUPO'
RETURNING id, nombre, descripcion;

-- DELETE — Eliminar grupo (en cascada elimina miembros y tickets)
-- Usado en: DELETE /api/groups/:id → botón eliminar en pantalla Groups
DELETE FROM grupos
WHERE id = 'UUID_DEL_GRUPO';


-- TICKETS (tickets)


-- CREATE — Crear nuevo ticket
-- Usado en: POST /api/tickets → botón "Nuevo Ticket" en Group Dashboard
INSERT INTO tickets (grupo_id, titulo, descripcion, autor_id, estado_id, prioridad_id, asignado_id, fecha_final)
VALUES (
    'UUID_DEL_GRUPO',
    'Bug en módulo de autenticación',
    'El login falla cuando el username tiene mayúsculas',
    'UUID_DEL_AUTOR',
    (SELECT id FROM estados     WHERE codigo = 'pendiente'),
    (SELECT id FROM prioridades WHERE codigo = 'alta'),
    NULL,
    '2026-04-01 00:00:00+00'
)
RETURNING id, titulo, creado_en;

-- CREATE — Registrar creación en historial
-- Usado en: POST /api/tickets → se ejecuta automáticamente después de crear el ticket
INSERT INTO historial_tickets (ticket_id, usuario_id, accion)
VALUES ('UUID_DEL_TICKET', 'UUID_DEL_USUARIO', 'creó el ticket');

-- READ — Listar tickets de un grupo con detalle completo
-- Usado en: GET /api/tickets?grupo_id=xxx → kanban/lista en Group Dashboard
SELECT
    t.id, t.titulo, t.descripcion, t.creado_en, t.fecha_final,
    e.codigo  AS estado_codigo,  e.nombre AS estado_nombre,  e.color AS estado_color,
    p.codigo  AS prioridad_codigo, p.nombre AS prioridad_nombre,
    au.username  AS autor,
    as2.username AS asignado,
    g.nombre     AS grupo
FROM tickets t
JOIN estados       e   ON e.id   = t.estado_id
JOIN prioridades   p   ON p.id   = t.prioridad_id
JOIN usuarios      au  ON au.id  = t.autor_id
LEFT JOIN usuarios as2 ON as2.id = t.asignado_id
JOIN grupos        g   ON g.id   = t.grupo_id
WHERE t.grupo_id = 'UUID_DEL_GRUPO'
ORDER BY t.creado_en DESC;

-- READ — Obtener ticket por ID con comentarios e historial
-- Usado en: GET /api/tickets/:id → vista detalle del ticket
SELECT
    t.id, t.titulo, t.descripcion, t.creado_en, t.fecha_final,
    e.codigo AS estado, p.codigo AS prioridad,
    au.username  AS autor,
    as2.username AS asignado,
    c.id          AS comentario_id,
    c.contenido,
    c.creado_en   AS comentario_fecha,
    uc.username   AS comentario_autor
FROM tickets t
JOIN estados       e   ON e.id  = t.estado_id
JOIN prioridades   p   ON p.id  = t.prioridad_id
JOIN usuarios      au  ON au.id = t.autor_id
LEFT JOIN usuarios   as2 ON as2.id    = t.asignado_id
LEFT JOIN comentarios c  ON c.ticket_id = t.id
LEFT JOIN usuarios   uc  ON uc.id      = c.autor_id
WHERE t.id = 'UUID_DEL_TICKET';

-- UPDATE — Editar ticket
-- Usado en: PUT /api/tickets/:id → botón Guardar en modal de edición
UPDATE tickets
SET
    titulo      = 'Nuevo título',
    descripcion = 'Nueva descripción',
    asignado_id = 'UUID_DEL_ASIGNADO',
    fecha_final = '2026-05-01 00:00:00+00'
WHERE id = 'UUID_DEL_TICKET'
RETURNING id, titulo;

-- UPDATE — Cambiar solo el estado del ticket
-- Usado en: PATCH /api/tickets/:id/status → botón cambiar estado en Group Dashboard
UPDATE tickets
SET estado_id = (SELECT id FROM estados WHERE codigo = 'en_progreso')
WHERE id = 'UUID_DEL_TICKET'
RETURNING id, estado_id;

-- CREATE — Agregar comentario a un ticket
-- Usado en: POST /api/tickets/:id/comments → sección de comentarios en detalle del ticket
INSERT INTO comentarios (ticket_id, autor_id, contenido)
VALUES ('UUID_DEL_TICKET', 'UUID_DEL_AUTOR', 'Este bug está siendo investigado.')
RETURNING id, contenido, creado_en;

-- DELETE — Eliminar ticket (en cascada elimina comentarios e historial)
-- Usado en: DELETE /api/tickets/:id → botón eliminar en Group Dashboard
DELETE FROM tickets
WHERE id = 'UUID_DEL_TICKET';



-- PERMISSIONS (permisos) — solo lectura


-- READ — Listar todos los permisos disponibles
-- Usado para poblar los checkboxes en el diálogo de edición de usuario (User Management)
SELECT id, codigo, nombre, descripcion
FROM permisos
ORDER BY codigo;

-- READ — Ver permisos de un usuario específico
-- Usado para mostrar los permisos asignados en la tabla de User Management
SELECT u.username, unnest(u.permisos_globales) AS permiso
FROM usuarios u
WHERE u.id = 'UUID_DEL_USUARIO';
