const { Router } = require('express');
const jwt        = require('jsonwebtoken');
const { supabase } = require('../config/database');
const { ok, fail } = require('../utils/respond');
const { validate } = require('./validate');

// ── JSON Schemas para validación ───────────────────────────────────────────
const createGroupSchema = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 }
  }
};

const updateGroupSchema = {
  type: 'object',
  minProperties: 1,
  additionalProperties: false,
  properties: {
    name:        { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 }
  }
};

const addMemberSchema = {
  type: 'object',
  required: ['userId'],
  additionalProperties: false,
  properties: {
    userId:     { type: 'string', format: 'uuid' },
    usuario_id: { type: 'string', format: 'uuid' }
  }
};

const updatePermissionsSchema = {
  type: 'object',
  required: ['permissions'],
  additionalProperties: false,
  properties: {
    permissions: { 
      type: 'array',
      items: { type: 'string' }
    }
  }
};

const router = Router();

// ── Middlewares locales ──────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) {
        fail(res, 401, 'SxGS401', 'Token requerido');
        return;
    }
    try {
        req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        next();
    } catch {
        fail(res, 401, 'SxGS401', 'Token inválido o expirado');
    }
}

/**
 * Verifica el permiso en tiempo real consultando la base de datos.
 * No usa los permisos embebidos en el JWT.
 */
function requirePermission(perm) {
    const required = Array.isArray(perm) ? perm : [perm];
    return async (req, res, next) => {
        const userId = req.user?.userId ?? req.user?.id;
        if (!userId) { fail(res, 403, 'SxGS403', `Permiso requerido: ${required.join(' | ')}`); return; }

        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('permisos_globales, is_active')
                .eq('id', userId)
                .single();

            if (error || !data || !data.is_active) {
                fail(res, 403, 'SxGS403', `Permiso requerido: ${required.join(' | ')}`);
                return;
            }

            let perms = data.permisos_globales ?? [];

            // Considerar también permisos del grupo activo
            const groupId = req.headers['x-group-id'];
            if (groupId) {
                const { data: member } = await supabase
                    .from('grupo_miembros')
                    .select('permisos')
                    .eq('usuario_id', userId)
                    .eq('grupo_id', groupId)
                    .maybeSingle();
                perms = [...new Set([...perms, ...(member?.permisos ?? [])])];
            }

            if (!required.some(p => perms.includes(p))) {
                fail(res, 403, 'SxGS403', `Permiso requerido: ${required.join(' | ')}`);
                return;
            }

            req.user.permissions = perms;
            next();
        } catch {
            fail(res, 500, 'SxGS500', 'Error al verificar permisos');
        }
    };
}

// ── Rutas de grupos ──────────────────────────────────────────────────────────

// GET /api/groups
router.get('/', requireAuth, async (_req, res) => {
    const { data, error } = await supabase
        .from('grupos')
        .select('id, nombre, descripcion, creado_en')
        .order('nombre');

    if (error) return fail(res, 500, 'SxGS500', 'Error al obtener grupos');
    return ok(res, 200, 'SxGS200', data);
});

// GET /api/groups/my-groups - Obtener solo grupos del usuario actual
router.get('/my-groups', requireAuth, async (req, res) => {
    const userId = req.user?.userId ?? req.user?.id;
    
    const { data, error } = await supabase
        .from('grupo_miembros')
        .select(`
            grupos(id, nombre, descripcion, creado_en),
            fecha_unido,
            rol,
            permisos
        `)
        .eq('usuario_id', userId)
        .order('grupos(nombre)');

    if (error) return fail(res, 500, 'SxGS500', 'Error al obtener grupos del usuario');
    
    // Formatear respuesta para el frontend
    const groups = (data ?? []).map(item => ({
        id: item.grupos.id,
        nombre: item.grupos.nombre,
        descripcion: item.grupos.descripcion,
        creado_en: item.grupos.creado_en,
        fecha_unido: item.fecha_unido,
        rol: item.rol,
        permisos: item.permisos || []
    }));
    
    return ok(res, 200, 'SxGS200', groups);
});

// GET /api/groups/:id — IMPORTANTE: debe ir ANTES de /:id/members/me
router.get('/:id', requireAuth, async (req, res) => {
    const { data: grupo, error } = await supabase
        .from('grupos')
        .select('id, nombre, descripcion, creado_en')
        .eq('id', req.params.id)
        .single();

    if (error || !grupo) return fail(res, 404, 'SxGS404', 'Grupo no encontrado');

    // Obtener miembros con permisos desde grupo_miembros.permisos
    const { data: miembrosData } = await supabase
        .from('grupo_miembros')
        .select('usuarios(id, username, nombre_completo, email), fecha_unido, permisos')
        .eq('grupo_id', req.params.id);

    const miembros = (miembrosData ?? []).map(m => ({
        ...m,
        usuarios: m.usuarios,
        permisos: m.permisos ?? []
    }));

    return ok(res, 200, 'SxGS200', [{ ...grupo, miembros }]);
});

// POST /api/groups
router.post('/', requireAuth, requirePermission('group:add'), validate(createGroupSchema), async (req, res) => {
    const { name, description } = req.body;

    const { data, error } = await supabase
        .from('grupos')
        .insert({ nombre: name, descripcion: description, creador_id: req.user.userId })
        .select('id, nombre, descripcion')
        .single();

    if (error) return fail(res, 500, 'SxGS500', 'Error al crear grupo');

    await supabase.from('grupo_miembros').insert({ grupo_id: data.id, usuario_id: req.user.userId });
    return ok(res, 201, 'SxGS201', [data]);
});

// PUT /api/groups/:id
router.put('/:id', requireAuth, requirePermission('group:edit'), validate(updateGroupSchema), async (req, res) => {
    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined)        updates.nombre      = name;
    if (description !== undefined) updates.descripcion = description;

    const { data, error } = await supabase
        .from('grupos')
        .update(updates)
        .eq('id', req.params.id)
        .select('id, nombre, descripcion')
        .single();

    if (error) return fail(res, 500, 'SxGS500', 'Error al actualizar grupo');
    return ok(res, 200, 'SxGS200', [data]);
});

// DELETE /api/groups/:id
router.delete('/:id', requireAuth, requirePermission('group:remove'), async (req, res) => {
    const { error } = await supabase.from('grupos').delete().eq('id', req.params.id);
    if (error) return fail(res, 500, 'SxGS500', 'Error al eliminar grupo');
    return ok(res, 200, 'SxGS200', null);
});

// ── Rutas de miembros ────────────────────────────────────────────────────────

// GET /api/groups/:id/members/me — permisos del usuario actual en este grupo
router.get('/:id/members/me', requireAuth, async (req, res) => {
    const { data: member, error } = await supabase
        .from('grupo_miembros')
        .select('permisos')
        .eq('grupo_id', req.params.id)
        .eq('usuario_id', req.user.userId)
        .maybeSingle();

    if (error) return fail(res, 500, 'SxGS500', 'Error al obtener permisos del grupo');
    
    const permissions = member?.permisos ?? [];
    return ok(res, 200, 'SxGS200', [{ permissions }]);
});

// POST /api/groups/:id/members — agregar usuario al grupo
router.post('/:id/members', requireAuth, requirePermission('group:edit'), validate(addMemberSchema), async (req, res) => {
    // Aceptar tanto userId (frontend) como usuario_id (schema)
    const userId = req.body.userId || req.body.usuario_id;
    if (!userId) return fail(res, 400, 'SxGS400', 'userId requerido');

    const { data: existing } = await supabase
        .from('grupo_miembros')
        .select('id')
        .eq('grupo_id', req.params.id)
        .eq('usuario_id', userId)
        .maybeSingle();

    if (existing) return fail(res, 409, 'SxGS409', 'El usuario ya pertenece al grupo');

    const { error } = await supabase
        .from('grupo_miembros')
        .insert({ grupo_id: req.params.id, usuario_id: userId });

    if (error) return fail(res, 500, 'SxGS500', 'Error al agregar miembro');
    return ok(res, 201, 'SxGS201', null);
});

// DELETE /api/groups/:id/members/:userId — quitar usuario del grupo
router.delete('/:id/members/:userId', requireAuth, requirePermission('group:edit'), async (req, res) => {
    const { error } = await supabase
        .from('grupo_miembros')
        .delete()
        .eq('grupo_id', req.params.id)
        .eq('usuario_id', req.params.userId);

    if (error) return fail(res, 500, 'SxGS500', 'Error al eliminar miembro');
    return ok(res, 200, 'SxGS200', null);
});

// PUT /api/groups/:id/members/:userId/permissions - actualizar permisos de grupo del usuario
router.put('/:id/members/:userId/permissions', requireAuth, requirePermission(['group:edit', 'permissions:manage']), validate(updatePermissionsSchema), async (req, res) => {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return fail(res, 400, 'SxGS400', 'permissions debe ser un array');

    const groupId = req.params.id;
    const userId = req.params.userId;

    try {
        // Configurar el contexto de auditoría
        await supabase.rpc('set_config', { key: 'app.current_user_id', value: req.user.userId });

        // Actualizar permisos directamente en la tabla grupo_miembros
        const { error } = await supabase
            .from('grupo_miembros')
            .update({ permisos: permissions })
            .eq('grupo_id', groupId)
            .eq('usuario_id', userId);

        if (error) throw error;

        return ok(res, 200, 'SxGS200', null);
    } catch (err) {
        console.error('Error updating permissions:', err);
        return fail(res, 500, 'SxGS500', 'Error al actualizar permisos');
    }
});

// GET /api/groups/:id/members/:userId/permissions - obtener permisos de un usuario en el grupo
router.get('/:id/members/:userId/permissions', requireAuth, requirePermission('group:edit'), async (req, res) => {
    const { data: member, error } = await supabase
        .from('grupo_miembros')
        .select('permisos')
        .eq('grupo_id', req.params.id)
        .eq('usuario_id', req.params.userId)
        .maybeSingle();

    if (error) return fail(res, 500, 'SxGS500', 'Error al obtener permisos del usuario');
    if (!member) return fail(res, 404, 'SxGS404', 'El usuario no es miembro del grupo');
    
    return ok(res, 200, 'SxGS200', [{ permissions: member.permisos ?? [] }]);
});

// GET /api/groups/:id/permissions - obtener todos los permisos disponibles para asignar
router.get('/:id/permissions', requireAuth, requirePermission('group:view'), async (_req, res) => {
    const { data, error } = await supabase
        .from('permisos')
        .select('codigo, nombre, descripcion')
        .order('codigo');

    if (error) return fail(res, 500, 'SxGS500', 'Error al obtener permisos disponibles');
    return ok(res, 200, 'SxGS200', data);
});

// GET /api/groups/:id/permissions/audit - obtener historial de cambios de permisos del grupo
router.get('/:id/permissions/audit', requireAuth, requirePermission('permissions:manage'), async (req, res) => {
    const { data, error } = await supabase
        .from('permisos_auditoria')
        .select(`
            id,
            accion,
            permiso_anterior,
            permiso_nuevo,
            fecha_modificacion,
            modificado_por:modificado_por_usuario(username),
            usuario:usuario_id(username)
        `)
        .eq('grupo_id', req.params.id)
        .order('fecha_modificacion', { ascending: false })
        .limit(50);

    if (error) return fail(res, 500, 'SxGS500', 'Error al obtener historial de permisos');
    return ok(res, 200, 'SxGS200', data);
});

module.exports = router;
