-- DIAGNÓSTICO COMPLETO - Verificar estado actual del admin

-- 1. Verificar si el admin existe y sus permisos globales
SELECT 
    username, 
    permisos_globales,
    is_active,
    creado_en
FROM usuarios 
WHERE username = 'admin';

-- 2. Verificar si el admin es miembro de los grupos
SELECT 
    g.nombre as grupo,
    g.id as grupo_id,
    u.username,
    gm.fecha_unido,
    gm.permisos as permisos_grupo
FROM grupo_miembros gm
JOIN grupos g ON gm.grupo_id = g.id
JOIN usuarios u ON gm.usuario_id = u.id
WHERE u.username = 'admin'
ORDER BY g.nombre;

-- 3. Verificar si existen tickets en los grupos
SELECT 
    g.nombre as grupo,
    COUNT(t.id) as total_tickets,
    STRING_AGG(e.nombre, ', ') as estados
FROM grupos g
LEFT JOIN tickets t ON g.id = t.grupo_id
LEFT JOIN estados e ON t.estado_id = e.id
GROUP BY g.id, g.nombre
ORDER BY g.nombre;

-- 4. Verificar tickets específicos del admin
SELECT 
    t.id,
    t.titulo,
    g.nombre as grupo,
    e.nombre as estado,
    p.nombre as prioridad,
    u_autor.username as autor,
    u_asignado.username as asignado,
    t.creado_en
FROM tickets t
JOIN grupos g ON t.grupo_id = g.id
JOIN estados e ON t.estado_id = e.id
JOIN prioridades p ON t.prioridad_id = p.id
JOIN usuarios u_autor ON t.autor_id = u_autor.id
LEFT JOIN usuarios u_asignado ON t.asignado_id = u_asignado.id
WHERE u_autor.username = 'admin'
ORDER BY g.nombre, t.creado_en;
