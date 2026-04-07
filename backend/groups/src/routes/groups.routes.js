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
    return async (req, res, next) => {
        const userId = req.user?.userId ?? req.user?.id;
        if (!userId) { fail(res, 403, 'SxGS403', `Permiso requerido: ${perm}`); return; }

        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('permisos_globales, is_active')
                .eq('id', userId)
                .single();

            if (error || !data || !data.is_active) {
                fail(res, 403, 'SxGS403', `Permiso requerido: ${perm}`);
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

            if (!perms.includes(perm)) {
                fail(res, 403, 'SxGS403', `Permiso requerido: ${perm}`);
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

// GET /api/groups/:id — IMPORTANTE: debe ir ANTES de /:id/members/me
router.get('/:id', requireAuth, async (req, res) => {
    const { data: grupo, error } = await supabase
        .from('grupos')
        .select('id, nombre, descripcion, creado_en')
        .eq('id', req.params.id)
        .single();

    if (error || !grupo) return fail(res, 404, 'SxGS404', 'Grupo no encontrado');

    // Obtener miembros con permisos desde grupo_usuario_permisos
    const { data: miembrosData } = await supabase
        .from('grupo_miembros')
        .select('usuarios(id, username, nombre_completo, email), fecha_unido')
        .eq('grupo_id', req.params.id);

    // Obtener permisos para cada miembro
    const miembros = await Promise.all((miembrosData ?? []).map(async (m) => {
        const { data: permsData } = await supabase
            .from('grupo_usuario_permisos')
            .select('permisos:permiso_id(codigo)')
            .eq('grupo_id', req.params.id)
            .eq('usuario_id', m.usuarios.id);
        
        const permisos = (permsData ?? []).map(p => p.permisos.codigo);
        return { ...m, permisos };
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
    const { data: permsData, error } = await supabase
        .from('grupo_usuario_permisos')
        .select('permisos:permiso_id(codigo)')
        .eq('grupo_id', req.params.id)
        .eq('usuario_id', req.user.userId);

    if (error) return fail(res, 500, 'SxGS500', 'Error al obtener permisos del grupo');
    
    const permissions = (permsData ?? []).map(p => p.permisos.codigo);
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

// PUT /api/groups/:id/members/:userId/permissions — actualizar permisos de grupo del usuario
router.put('/:id/members/:userId/permissions', requireAuth, requirePermission('group:edit'), validate(updatePermissionsSchema), async (req, res) => {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return fail(res, 400, 'SxGS400', 'permissions debe ser un array');

    const groupId = req.params.id;
    const userId = req.params.userId;

    try {
        // 1. Eliminar permisos existentes del usuario en este grupo
        await supabase
            .from('grupo_usuario_permisos')
            .delete()
            .eq('grupo_id', groupId)
            .eq('usuario_id', userId);

        // 2. Si hay permisos para agregar, buscar sus UUIDs e insertar
        if (permissions.length > 0) {
            const { data: permisosData } = await supabase
                .from('permisos')
                .select('id, codigo')
                .in('codigo', permissions);

            if (!permisosData || permisosData.length === 0) {
                return fail(res, 400, 'SxGS400', 'No se encontraron permisos válidos');
            }

            const inserts = permisosData.map(p => ({
                grupo_id: groupId,
                usuario_id: userId,
                permiso_id: p.id
            }));

            const { error: insertError } = await supabase
                .from('grupo_usuario_permisos')
                .insert(inserts);

            if (insertError) throw insertError;
        }

        return ok(res, 200, 'SxGS200', null);
    } catch (err) {
        console.error('Error updating permissions:', err);
        return fail(res, 500, 'SxGS500', 'Error al actualizar permisos');
    }
});

module.exports = router;
