require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// Conexión a Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ==========================================
// MIDDLEWARE: Verificar JWT
// ==========================================
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ statusCode: 401, intOpCode: 1, message: 'Token requerido' });
    }
    try {
        const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ statusCode: 401, intOpCode: 1, message: 'Token inválido o expirado' });
    }
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user?.permissions?.includes(permission)) {
            return res.status(403).json({ statusCode: 403, intOpCode: 2, message: `Permiso requerido: ${permission}` });
        }
        next();
    };
}

// ==========================================
// API 1: LOGIN (POST /api/auth/login)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('id, username, email, password_hash, is_active, permisos_globales, nombre_completo')
            .eq('username', username.trim().toLowerCase())
            .single();

        if (error || !user) {
            return res.status(401).json({ statusCode: 401, intOpCode: 1, message: 'Credenciales inválidas' });
        }

        if (!user.is_active) {
            return res.status(403).json({ statusCode: 403, intOpCode: 2, message: 'Cuenta desactivada' });
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ statusCode: 401, intOpCode: 1, message: 'Credenciales inválidas' });
        }

        // Actualizar last_login
        await supabase.from('usuarios').update({ last_login: new Date().toISOString() }).eq('id', user.id);

        // Obtener grupos del usuario
        const { data: miembros } = await supabase
            .from('grupo_miembros')
            .select('grupos(id, nombre)')
            .eq('usuario_id', user.id);

        const groups = (miembros ?? []).map(m => ({ id: m.grupos.id, name: m.grupos.nombre }));

        const token = jwt.sign(
            { userId: user.id, username: user.username, permissions: user.permisos_globales ?? [] },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            statusCode: 200,
            intOpCode: 0,
            data: [{
                token,
                user: {
                    id: user.id,
                    name: user.nombre_completo ?? user.username,
                    email: user.email,
                    permissions: user.permisos_globales ?? [],
                    groups
                }
            }]
        });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 2: REGISTER (POST /api/auth/register)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, nombre_completo, telefono, direccion } = req.body;

    try {
        const { data: existing } = await supabase
            .from('usuarios')
            .select('id')
            .or(`username.eq.${username.toLowerCase()},email.eq.${email.toLowerCase()}`)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ statusCode: 409, intOpCode: 1, message: 'Usuario o email ya registrado' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const { data: newUser, error } = await supabase
            .from('usuarios')
            .insert([{
                username: username.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                password_hash,
                nombre_completo: nombre_completo ?? null,
                telefono: telefono ?? null,
                direccion: direccion ?? null,
                permisos_globales: ['group:view', 'ticket:view', 'ticket:edit_state', 'user:view', 'user:edit'],
                is_active: true
            }])
            .select('id, username, email')
            .single();

        if (error) throw error;

        res.status(201).json({
            statusCode: 201,
            intOpCode: 0,
            message: 'Usuario registrado correctamente',
            data: [newUser]
        });

    } catch (error) {
        res.status(400).json({ statusCode: 400, intOpCode: 1, message: error.message });
    }
});

// ==========================================
// API 3: AGREGAR USUARIO ADMIN (POST /api/auth/users)
// ==========================================
app.post('/api/auth/users', requireAuth, requirePermission('user:add'), async (req, res) => {
    const { username, password, email, permissions = [], group_ids = [] } = req.body;

    try {
        const { data: existing } = await supabase
            .from('usuarios')
            .select('id')
            .or(`username.eq.${username.toLowerCase()},email.eq.${email.toLowerCase()}`)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ statusCode: 409, intOpCode: 1, message: 'Usuario o email ya existe' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const { data: newUser, error } = await supabase
            .from('usuarios')
            .insert([{
                username: username.trim().toLowerCase(),
                email: email.trim().toLowerCase(),
                password_hash,
                permisos_globales: permissions,
                is_active: true
            }])
            .select('id, username, email, permisos_globales')
            .single();

        if (error) throw error;

        if (group_ids.length > 0) {
            const rows = group_ids.map(gid => ({ usuario_id: newUser.id, grupo_id: gid }));
            await supabase.from('grupo_miembros').insert(rows);
        }

        res.status(201).json({
            statusCode: 201,
            intOpCode: 0,
            message: 'Usuario creado exitosamente',
            data: [newUser]
        });

    } catch (error) {
        res.status(400).json({ statusCode: 400, intOpCode: 1, message: error.message });
    }
});

// ==========================================
// API 4: LISTAR USUARIOS (GET /api/users)
// ==========================================
app.get('/api/users', requireAuth, requirePermission('users:view'), async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, username, email, nombre_completo, permisos_globales, is_active, creado_en')
            .order('creado_en', { ascending: false });

        if (error) throw error;

        res.status(200).json({ statusCode: 200, intOpCode: 0, data });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 5: OBTENER USUARIO POR ID (GET /api/users/:id)
// ==========================================
app.get('/api/users/:id', requireAuth, requirePermission('user:view'), async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('usuarios')
            .select('id, username, email, nombre_completo, permisos_globales, is_active, creado_en')
            .eq('id', req.params.id)
            .single();

        if (error || !user) {
            return res.status(404).json({ statusCode: 404, intOpCode: 1, message: 'Usuario no encontrado' });
        }

        const { data: miembros } = await supabase
            .from('grupo_miembros')
            .select('grupos(id, nombre)')
            .eq('usuario_id', req.params.id);

        const groups = (miembros ?? []).map(m => ({ id: m.grupos.id, name: m.grupos.nombre }));

        res.status(200).json({ statusCode: 200, intOpCode: 0, data: [{ ...user, groups }] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 6: EDITAR USUARIO (PUT /api/users/:id)
// ==========================================
app.put('/api/users/:id', requireAuth, requirePermission('user:edit'), async (req, res) => {
    const { password, group_ids, permissions, ...rest } = req.body;
    const updates = { ...rest };

    try {
        if (password) {
            updates.password_hash = await bcrypt.hash(password, 10);
        }
        if (permissions !== undefined) {
            updates.permisos_globales = permissions;
        }

        const { data, error } = await supabase
            .from('usuarios')
            .update(updates)
            .eq('id', req.params.id)
            .select('id, username, email, nombre_completo, permisos_globales, is_active')
            .single();

        if (error) throw error;

        if (Array.isArray(group_ids)) {
            await supabase.from('grupo_miembros').delete().eq('usuario_id', req.params.id);
            if (group_ids.length > 0) {
                const rows = group_ids.map(gid => ({ usuario_id: req.params.id, grupo_id: gid }));
                await supabase.from('grupo_miembros').insert(rows);
            }
        }

        res.status(200).json({ statusCode: 200, intOpCode: 0, data: [data] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 7: ELIMINAR USUARIO (DELETE /api/users/:id)
// ==========================================
app.delete('/api/users/:id', requireAuth, requirePermission('user:delete'), async (req, res) => {
    try {
        const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
        if (error) throw error;

        res.status(200).json({ statusCode: 200, intOpCode: 0, message: 'Usuario eliminado' });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 8: LISTAR GRUPOS (GET /api/groups)
// ==========================================
app.get('/api/groups', requireAuth, async (_req, res) => {
    try {
        const { data, error } = await supabase
            .from('grupos')
            .select('id, nombre, descripcion, creado_en')
            .order('nombre');

        if (error) throw error;

        res.status(200).json({ statusCode: 200, intOpCode: 0, data });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 9: OBTENER GRUPO POR ID (GET /api/groups/:id)
// ==========================================
app.get('/api/groups/:id', requireAuth, async (req, res) => {
    try {
        const { data: grupo, error } = await supabase
            .from('grupos')
            .select('id, nombre, descripcion, creado_en')
            .eq('id', req.params.id)
            .single();

        if (error || !grupo) {
            return res.status(404).json({ statusCode: 404, intOpCode: 1, message: 'Grupo no encontrado' });
        }

        const { data: miembros } = await supabase
            .from('grupo_miembros')
            .select('usuarios(id, username, nombre_completo, email), fecha_unido')
            .eq('grupo_id', req.params.id);

        res.status(200).json({ statusCode: 200, intOpCode: 0, data: [{ ...grupo, miembros: miembros ?? [] }] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 10: CREAR GRUPO (POST /api/groups)
// ==========================================
app.post('/api/groups', requireAuth, requirePermission('group:add'), async (req, res) => {
    const { name, description } = req.body;

    try {
        const { data, error } = await supabase
            .from('grupos')
            .insert([{ nombre: name, descripcion: description, creador_id: req.user.userId }])
            .select('id, nombre, descripcion')
            .single();

        if (error) throw error;

        // Agregar al creador como miembro automáticamente
        await supabase.from('grupo_miembros').insert({ grupo_id: data.id, usuario_id: req.user.userId });

        res.status(201).json({ statusCode: 201, intOpCode: 0, message: 'Grupo creado exitosamente', data: [data] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 11: EDITAR GRUPO (PUT /api/groups/:id)
// ==========================================
app.put('/api/groups/:id', requireAuth, requirePermission('group:edit'), async (req, res) => {
    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.nombre = name;
    if (description !== undefined) updates.descripcion = description;

    try {
        const { data, error } = await supabase
            .from('grupos')
            .update(updates)
            .eq('id', req.params.id)
            .select('id, nombre, descripcion')
            .single();

        if (error) throw error;

        res.status(200).json({ statusCode: 200, intOpCode: 0, data: [data] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 12: ELIMINAR GRUPO (DELETE /api/groups/:id)
// ==========================================
app.delete('/api/groups/:id', requireAuth, requirePermission('group:delete'), async (req, res) => {
    try {
        const { error } = await supabase.from('grupos').delete().eq('id', req.params.id);
        if (error) throw error;

        res.status(200).json({ statusCode: 200, intOpCode: 0, message: 'Grupo eliminado' });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 13: LISTAR TICKETS (GET /api/tickets)
// ==========================================
app.get('/api/tickets', requireAuth, requirePermission('tickets:view'), async (req, res) => {
    try {
        let query = supabase
            .from('tickets')
            .select(`
                id, titulo, descripcion, creado_en, fecha_final,
                estados(id, codigo, nombre, color),
                prioridades(id, codigo, nombre, orden),
                autor:autor_id(id, username, nombre_completo),
                asignado:asignado_id(id, username, nombre_completo),
                grupos(id, nombre),
                comentarios(id, contenido, creado_en, autor:autor_id(username)),
                historial_tickets(id, accion, creado_en, usuario:usuario_id(username))
            `)
            .order('creado_en', { ascending: false });

        if (req.query.grupo_id) {
            query = query.eq('grupo_id', req.query.grupo_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.status(200).json({ statusCode: 200, intOpCode: 0, data });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 14: OBTENER TICKET POR ID (GET /api/tickets/:id)
// ==========================================
app.get('/api/tickets/:id', requireAuth, requirePermission('ticket:view'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select(`
                id, titulo, descripcion, creado_en, fecha_final,
                estados(id, codigo, nombre, color),
                prioridades(id, codigo, nombre, orden),
                autor:autor_id(id, username, nombre_completo),
                asignado:asignado_id(id, username, nombre_completo),
                grupos(id, nombre),
                comentarios(id, contenido, creado_en, autor:autor_id(username)),
                historial_tickets(id, accion, creado_en, usuario:usuario_id(username))
            `)
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ statusCode: 404, intOpCode: 1, message: 'Ticket no encontrado' });
        }

        res.status(200).json({ statusCode: 200, intOpCode: 0, data: [data] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 15: CREAR TICKET (POST /api/tickets)
// ==========================================
app.post('/api/tickets', requireAuth, requirePermission('ticket:add'), async (req, res) => {
    const { grupo_id, titulo, descripcion, estado_id, prioridad_id, asignado_id, fecha_final } = req.body;

    try {
        const { data: ticket, error } = await supabase
            .from('tickets')
            .insert([{
                grupo_id,
                titulo,
                descripcion,
                estado_id,
                prioridad_id,
                asignado_id: asignado_id ?? null,
                autor_id: req.user.userId,
                fecha_final: fecha_final ?? null
            }])
            .select('id, titulo, creado_en')
            .single();

        if (error) throw error;

        await supabase.from('historial_tickets').insert({
            ticket_id: ticket.id,
            usuario_id: req.user.userId,
            accion: 'creó el ticket'
        });

        res.status(201).json({ statusCode: 201, intOpCode: 0, message: 'Ticket creado exitosamente', data: [ticket] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 16: EDITAR TICKET (PUT /api/tickets/:id)
// ==========================================
app.put('/api/tickets/:id', requireAuth, requirePermission('ticket:edit'), async (req, res) => {
    try {
        const { data: old } = await supabase.from('tickets').select('*').eq('id', req.params.id).single();
        if (!old) {
            return res.status(404).json({ statusCode: 404, intOpCode: 1, message: 'Ticket no encontrado' });
        }

        const { data, error } = await supabase
            .from('tickets')
            .update(req.body)
            .eq('id', req.params.id)
            .select('id, titulo, creado_en')
            .single();

        if (error) throw error;

        const changed = Object.keys(req.body).filter(k => req.body[k] !== old[k]);
        if (changed.length) {
            await supabase.from('historial_tickets').insert({
                ticket_id: req.params.id,
                usuario_id: req.user.userId,
                accion: `actualizó: ${changed.join(', ')}`
            });
        }

        res.status(200).json({ statusCode: 200, intOpCode: 0, data: [data] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 17: CAMBIAR ESTADO TICKET (PATCH /api/tickets/:id/status)
// ==========================================
app.patch('/api/tickets/:id/status', requireAuth, requirePermission('ticket:edit_state'), async (req, res) => {
    const { estado_id } = req.body;

    if (!estado_id) {
        return res.status(400).json({ statusCode: 400, intOpCode: 1, message: 'estado_id es requerido' });
    }

    try {
        const { data: estado } = await supabase.from('estados').select('id, codigo').eq('id', estado_id).single();
        if (!estado) {
            return res.status(400).json({ statusCode: 400, intOpCode: 1, message: 'Estado inválido' });
        }

        const { data, error } = await supabase
            .from('tickets')
            .update({ estado_id })
            .eq('id', req.params.id)
            .select('id, estado_id')
            .single();

        if (error) throw error;

        await supabase.from('historial_tickets').insert({
            ticket_id: req.params.id,
            usuario_id: req.user.userId,
            accion: `actualizó: estado → ${estado.codigo}`
        });

        res.status(200).json({ statusCode: 200, intOpCode: 0, data: [data] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 18: AGREGAR COMENTARIO (POST /api/tickets/:id/comments)
// ==========================================
app.post('/api/tickets/:id/comments', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('comentarios')
            .insert([{
                ticket_id: req.params.id,
                autor_id: req.user.userId,
                contenido: req.body.text
            }])
            .select('id, contenido, creado_en')
            .single();

        if (error) throw error;

        res.status(201).json({ statusCode: 201, intOpCode: 0, message: 'Comentario agregado', data: [data] });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// API 19: ELIMINAR TICKET (DELETE /api/tickets/:id)
// ==========================================
app.delete('/api/tickets/:id', requireAuth, requirePermission('ticket:delete'), async (req, res) => {
    try {
        const { error } = await supabase.from('tickets').delete().eq('id', req.params.id);
        if (error) throw error;

        res.status(200).json({ statusCode: 200, intOpCode: 0, message: 'Ticket eliminado' });

    } catch (error) {
        res.status(500).json({ statusCode: 500, intOpCode: -1, message: error.message });
    }
});

// ==========================================
// Health check
// ==========================================
app.get('/api/health', (_req, res) => res.json({ statusCode: 200, intOpCode: 0, status: 'ok' }));

// 404
app.use((_req, res) => res.status(404).json({ statusCode: 404, intOpCode: 1, message: 'Ruta no encontrada' }));

// Levantar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servicio ERP corriendo en http://localhost:${PORT}`);
});
