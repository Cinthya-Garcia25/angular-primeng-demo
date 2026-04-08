-- Insertar 4 tickets por cada grupo existente
-- Usando el admin como autor y asignando diferentes estados y prioridades

INSERT INTO tickets (
    grupo_id,
    titulo,
    descripcion,
    autor_id,
    asignado_id,
    estado_id,
    prioridad_id,
    fecha_final,
    creado_en
)
SELECT 
    g.id as grupo_id,
    CASE 
        WHEN rn = 1 THEN 'Configuración inicial del sistema'
        WHEN rn = 2 THEN 'Mejora de rendimiento en consultas'
        WHEN rn = 3 THEN 'Implementación de módulo de reportes'
        WHEN rn = 4 THEN 'Actualización de seguridad'
    END as titulo,
    CASE 
        WHEN rn = 1 THEN 'Se requiere configurar los parámetros iniciales del sistema para ponerlo en producción.'
        WHEN rn = 2 THEN 'Optimizar las consultas a la base de datos para mejorar el tiempo de respuesta.'
        WHEN rn = 3 THEN 'Desarrollar e implementar el módulo de reportes para análisis de datos.'
        WHEN rn = 4 THEN 'Aplicar las últimas actualizaciones de seguridad y parches críticos.'
    END as descripcion,
    (SELECT id FROM usuarios WHERE username = 'admin') as autor_id,
    (SELECT id FROM usuarios WHERE username = 'admin') as asignado_id,
    CASE 
        WHEN rn = 1 THEN (SELECT id FROM estados WHERE codigo = 'pendiente')
        WHEN rn = 2 THEN (SELECT id FROM estados WHERE codigo = 'en_progreso')
        WHEN rn = 3 THEN (SELECT id FROM estados WHERE codigo = 'revision')
        WHEN rn = 4 THEN (SELECT id FROM estados WHERE codigo = 'hecho')
    END as estado_id,
    CASE 
        WHEN rn = 1 THEN (SELECT id FROM prioridades WHERE codigo = 'alta')
        WHEN rn = 2 THEN (SELECT id FROM prioridades WHERE codigo = 'media')
        WHEN rn = 3 THEN (SELECT id FROM prioridades WHERE codigo = 'alta')
        WHEN rn = 4 THEN (SELECT id FROM prioridades WHERE codigo = 'baja')
    END as prioridad_id,
    CASE 
        WHEN rn = 1 THEN CURRENT_TIMESTAMP + INTERVAL '7 days'
        WHEN rn = 2 THEN CURRENT_TIMESTAMP + INTERVAL '14 days'
        WHEN rn = 3 THEN CURRENT_TIMESTAMP + INTERVAL '21 days'
        WHEN rn = 4 THEN CURRENT_TIMESTAMP + INTERVAL '3 days'
    END as fecha_final,
    CURRENT_TIMESTAMP as creado_en
FROM grupos g
CROSS JOIN (SELECT unnest(ARRAY[1,2,3,4]) as rn) numbers
WHERE EXISTS (SELECT 1 FROM usuarios WHERE username = 'admin');

-- Verificar los tickets insertados
SELECT 
    t.id,
    t.titulo,
    g.nombre as grupo,
    e.nombre as estado,
    p.nombre as prioridad,
    t.creado_en
FROM tickets t
JOIN grupos g ON t.grupo_id = g.id
JOIN estados e ON t.estado_id = e.id
JOIN prioridades p ON t.prioridad_id = p.id
ORDER BY g.nombre, t.creado_en;
