-- Asignar el admin como miembro de todos los grupos existentes
INSERT INTO grupo_miembros (grupo_id, usuario_id, fecha_unido)
SELECT g.id, u.id, CURRENT_TIMESTAMP
FROM grupos g, usuarios u
WHERE u.username = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM grupo_miembros gm 
    WHERE gm.grupo_id = g.id AND gm.usuario_id = u.id
);
