const { supabase }  = require('../config/database');
const jwt           = require('jsonwebtoken');
const { ok, fail }  = require('../utils/respond');

const createTicketSchema = {
  type: 'object',
  required: ['grupo_id', 'titulo'],
  additionalProperties: false,
  properties: {
    grupo_id:      { type: 'string', format: 'uuid' },
    titulo:        { type: 'string', minLength: 1, maxLength: 500 },
    descripcion:   { type: 'string', maxLength: 1000 },
    estado_id:     { type: 'string', format: 'uuid' },
    estado_codigo: { type: 'string', enum: ['pendiente', 'en_progreso', 'revision', 'hecho', 'bloqueado'] },
    prioridad_id:     { type: 'string', format: 'uuid' },
    prioridad_codigo: { type: 'string', enum: ['alta', 'media', 'baja'] },
    asignado_id:   { type: 'string', format: 'uuid' },
    fecha_final:   { type: 'string', format: 'date-time' }
  }
};

const updateTicketSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    titulo:        { type: 'string', minLength: 1, maxLength: 500 },
    descripcion:   { type: 'string', maxLength: 1000 },
    estado_id:     { type: 'string', format: 'uuid' },
    estado_codigo: { type: 'string', enum: ['pendiente', 'en_progreso', 'revision', 'hecho', 'bloqueado'] },
    prioridad_id:     { type: 'string', format: 'uuid' },
    prioridad_codigo: { type: 'string', enum: ['alta', 'media', 'baja'] },
    asignado_id:   { type: 'string', format: 'uuid' },
    fecha_final:   { type: 'string', format: 'date-time' }
  }
};

const addCommentSchema = {
  type: 'object',
  required: ['text'],
  additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500 }
  }
};

function verifyToken(req) {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(header.slice(7), process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

async function fetchPerms(userId, groupId) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('is_active, permisos_globales')
        .eq('id', userId)
        .single();

    if (error || !data || !data.is_active) return [];

    const globalPerms = data.permisos_globales ?? [];

    let groupPerms = [];
    if (groupId) {
        const { data: permsData } = await supabase
            .from('grupo_miembros')
            .select('permisos')
            .eq('usuario_id', userId)
            .eq('grupo_id', groupId)
            .maybeSingle();

        groupPerms = permsData?.permisos ?? [];
    }

    return [...new Set([...globalPerms, ...groupPerms])];
}

const TICKET_SELECT = `
    id, titulo, descripcion, creado_en, fecha_final,
    estados(id, codigo, nombre, color),
    prioridades(id, codigo, nombre, orden),
    autor:autor_id(id, username, nombre_completo),
    asignado:asignado_id(id, username, nombre_completo),
    grupos(id, nombre),
    comentarios(id, contenido, creado_en, autor:autor_id(username)),
    historial_tickets(id, accion, creado_en, usuario:usuario_id(username))
`;

async function ticketsRoutes(fastify) {

    fastify.addHook('preHandler', async (req, reply) => {
        req.user = verifyToken(req);
        if (!req.user) return fail(reply, 401, 'SxTS401', 'Token requerido');

        const groupId = req.headers['x-group-id'];
        req.user.permissions = await fetchPerms(req.user.userId, groupId);

        console.log(`[DEBUG] User: ${req.user.userId}, Group: ${groupId}, Perms: ${JSON.stringify(req.user.permissions)}`);
    });

    fastify.get('/', async (req, reply) => {
        console.log(`[DEBUG] GET /api/tickets - User perms: ${JSON.stringify(req.user.permissions)}`);

        if (!req.user.permissions.includes('tickets:view') &&
            !req.user.permissions.includes('ticket:view')) {
            console.log(`[DEBUG] Permission denied - no ticket:view or tickets:view`);
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:view');
        }

        let query = supabase.from('tickets').select(TICKET_SELECT)
            .order('creado_en', { ascending: false });

        if (req.query.grupo_id) query = query.eq('grupo_id', req.query.grupo_id);

        const { data, error } = await query;
        if (error) return fail(reply, 500, 'SxTS500', 'Error al obtener tickets');
        return ok(reply, 200, 'SxTS200', data);
    });

    fastify.get('/:id', async (req, reply) => {
        if (!req.user.permissions.includes('tickets:view') &&
            !req.user.permissions.includes('ticket:view')) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:view');
        }

        const { data, error } = await supabase.from('tickets').select(TICKET_SELECT)
            .eq('id', req.params.id).single();

        if (error || !data) return fail(reply, 404, 'SxTS404', 'Ticket no encontrado');
        return ok(reply, 200, 'SxTS200', [data]);
    });

    fastify.post('/', { schema: { body: createTicketSchema } }, async (req, reply) => {
        if (!req.user.permissions.includes('ticket:add')) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:add');
        }

        const { grupo_id, titulo, descripcion, estado_id, estado_codigo,
                prioridad_id, prioridad_codigo, asignado_id, fecha_final } = req.body;

        let resolvedEstadoId = estado_id;
        if (!resolvedEstadoId && estado_codigo) {
            const { data: estado } = await supabase.from('estados').select('id').eq('codigo', estado_codigo).single();
            if (!estado) return fail(reply, 400, 'SxTS400', 'Estado inválido: ' + estado_codigo);
            resolvedEstadoId = estado.id;
        }

        let resolvedPrioridadId = prioridad_id;
        if (!resolvedPrioridadId && prioridad_codigo) {
            const { data: prioridad } = await supabase.from('prioridades').select('id').eq('codigo', prioridad_codigo).single();
            if (!prioridad) return fail(reply, 400, 'SxTS400', 'Prioridad inválida: ' + prioridad_codigo);
            resolvedPrioridadId = prioridad.id;
        }

        const { data: ticket, error } = await supabase
            .from('tickets')
            .insert({
                grupo_id, titulo, descripcion,
                estado_id:    resolvedEstadoId,
                prioridad_id: resolvedPrioridadId,
                asignado_id:  asignado_id ?? null,
                autor_id:     req.user.userId,
                fecha_final:  fecha_final ?? null
            })
            .select('id, titulo, creado_en')
            .single();

        if (error) return fail(reply, 500, 'SxTS500', 'Error al crear ticket');

        await supabase.from('historial_tickets').insert({
            ticket_id: ticket.id, usuario_id: req.user.userId, accion: 'creó el ticket'
        });

        return ok(reply, 201, 'SxTS201', [ticket]);
    });

    fastify.put('/:id', { schema: { body: updateTicketSchema } }, async (req, reply) => {
        if (!req.user.permissions.includes('ticket:edit')) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:edit');
        }

        const { data: old } = await supabase.from('tickets').select('*').eq('id', req.params.id).single();
        if (!old) return fail(reply, 404, 'SxTS404', 'Ticket no encontrado');

        const body = { ...req.body };

        if (body.estado_codigo && !body.estado_id) {
            const { data: estado } = await supabase.from('estados').select('id').eq('codigo', body.estado_codigo).single();
            if (estado) body.estado_id = estado.id;
            delete body.estado_codigo;
        }
        if (body.prioridad_codigo && !body.prioridad_id) {
            const { data: prioridad } = await supabase.from('prioridades').select('id').eq('codigo', body.prioridad_codigo).single();
            if (prioridad) body.prioridad_id = prioridad.id;
            delete body.prioridad_codigo;
        }

        const { data, error } = await supabase
            .from('tickets').update(body).eq('id', req.params.id)
            .select('id, titulo, creado_en').single();

        if (error) return fail(reply, 500, 'SxTS500', 'Error al actualizar ticket');

        const changed = Object.keys(req.body).filter(k => req.body[k] !== old[k]);
        if (changed.length) {
            await supabase.from('historial_tickets').insert({
                ticket_id: req.params.id, usuario_id: req.user.userId,
                accion: `actualizó: ${changed.join(', ')}`
            });
        }

        return ok(reply, 200, 'SxTS200', [data]);
    });

    fastify.patch('/:id/status', async (req, reply) => {
        const perms        = req.user.permissions;
        const canEditState = perms.includes('ticket:edit_state') || perms.includes('ticket:edit:state');
        const isAdmin      = perms.includes('permissions:manage');

        if (!canEditState) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:edit_state');
        }

        const { estado_id, estado_codigo } = req.body;
        if (!estado_id && !estado_codigo)
            return fail(reply, 400, 'SxTS400', 'estado_id o estado_codigo es requerido');

        const { data: ticket } = await supabase
            .from('tickets').select('id, asignado_id').eq('id', req.params.id).single();
        if (!ticket) return fail(reply, 404, 'SxTS404', 'Ticket no encontrado');

        if (!isAdmin && ticket.asignado_id !== req.user.userId) {
            return fail(reply, 403, 'SxTS403', 'Solo puedes mover el estado de tickets asignados a ti');
        }

        let estadoQuery = supabase.from('estados').select('id, codigo');
        if (estado_id) estadoQuery = estadoQuery.eq('id', estado_id);
        else           estadoQuery = estadoQuery.eq('codigo', estado_codigo);

        const { data: estado } = await estadoQuery.single();
        if (!estado) return fail(reply, 400, 'SxTS400', 'Estado inválido');

        const { data, error } = await supabase
            .from('tickets').update({ estado_id: estado.id }).eq('id', req.params.id)
            .select('id, estado_id').single();

        if (error) return fail(reply, 500, 'SxTS500', 'Error al actualizar estado');

        await supabase.from('historial_tickets').insert({
            ticket_id: req.params.id, usuario_id: req.user.userId,
            accion: `actualizó: estado → ${estado.codigo}`
        });

        return ok(reply, 200, 'SxTS200', [data]);
    });

    fastify.post('/:id/comments', { schema: { body: addCommentSchema } }, async (req, reply) => {
        if (!req.user.permissions.includes('ticket:edit') && !req.user.permissions.includes('ticket:edit:comment')) {
            return fail(reply, 403, 'SxCS403', 'Permiso requerido: ticket:edit');
        }

        const { data, error } = await supabase
            .from('comentarios')
            .insert({
                ticket_id: req.params.id,
                autor_id:  req.user.userId,
                contenido: req.body.text
            })
            .select('id, contenido, creado_en')
            .single();

        if (error) return fail(reply, 500, 'SxCS500', 'Error al agregar comentario');
        return ok(reply, 201, 'SxCS201', [data]);
    });

    fastify.patch('/:id/priority', async (req, reply) => {
        if (!req.user.permissions.includes('ticket:edit:priority')) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:edit:priority');
        }

        const { prioridad_id, prioridad_codigo } = req.body;
        if (!prioridad_id && !prioridad_codigo) {
            return fail(reply, 400, 'SxTS400', 'prioridad_id o prioridad_codigo es requerido');
        }

        let prioridadQuery = supabase.from('prioridades').select('id, codigo');
        if (prioridad_id) prioridadQuery = prioridadQuery.eq('id', prioridad_id);
        else           prioridadQuery = prioridadQuery.eq('codigo', prioridad_codigo);

        const { data: prioridad } = await prioridadQuery.single();
        if (!prioridad) return fail(reply, 400, 'SxTS400', 'Prioridad inválida');

        const { data, error } = await supabase
            .from('tickets').update({ prioridad_id: prioridad.id }).eq('id', req.params.id)
            .select('id, prioridad_id').single();

        if (error) return fail(reply, 500, 'SxTS500', 'Error al actualizar prioridad');

        await supabase.from('historial_tickets').insert({
            ticket_id: req.params.id, usuario_id: req.user.userId,
            accion: `actualizó: prioridad → ${prioridad.codigo}`
        });

        return ok(reply, 200, 'SxTS200', [data]);
    });

    fastify.patch('/:id/deadline', async (req, reply) => {
        if (!req.user.permissions.includes('ticket:edit:deadline')) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:edit:deadline');
        }

        const { fecha_final } = req.body;
        if (fecha_final === undefined) {
            return fail(reply, 400, 'SxTS400', 'fecha_final es requerido');
        }

        const { data, error } = await supabase
            .from('tickets').update({ fecha_final }).eq('id', req.params.id)
            .select('id, fecha_final').single();

        if (error) return fail(reply, 500, 'SxTS500', 'Error al actualizar fecha límite');

        await supabase.from('historial_tickets').insert({
            ticket_id: req.params.id, usuario_id: req.user.userId,
            accion: fecha_final ? `actualizó: fecha límite → ${fecha_final}` : 'eliminó: fecha límite'
        });

        return ok(reply, 200, 'SxTS200', [data]);
    });

    fastify.patch('/:id/assign', async (req, reply) => {
        if (!req.user.permissions.includes('ticket:edit:assign')) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:edit:assign');
        }

        const { asignado_id } = req.body;
        if (asignado_id === undefined) {
            return fail(reply, 400, 'SxTS400', 'asignado_id es requerido');
        }

        const { data, error } = await supabase
            .from('tickets').update({ asignado_id }).eq('id', req.params.id)
            .select('id, asignado_id').single();

        if (error) return fail(reply, 500, 'SxTS500', 'Error al actualizar asignación');

        await supabase.from('historial_tickets').insert({
            ticket_id: req.params.id, usuario_id: req.user.userId,
            accion: asignado_id ? `asignó a: ${asignado_id}` : 'desasignó ticket'
        });

        return ok(reply, 200, 'SxTS200', [data]);
    });

    fastify.delete('/:id', async (req, reply) => {
        if (!req.user.permissions.includes('ticket:delete')) {
            return fail(reply, 403, 'SxTS403', 'Permiso requerido: ticket:delete');
        }

        const { error } = await supabase.from('tickets').delete().eq('id', req.params.id);
        if (error) return fail(reply, 500, 'SxTS500', 'Error al eliminar ticket');
        return ok(reply, 200, 'SxTS200', null);
    });
}

module.exports = ticketsRoutes;
