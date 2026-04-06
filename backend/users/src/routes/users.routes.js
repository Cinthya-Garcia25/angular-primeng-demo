const { Router } = require('express');
const { supabase }  = require('../config/database');
const { hashPassword } = require('../utils/hash');
const { ok, fail }  = require('../utils/respond');
const { requireAuth, requirePermission } = require('./middleware');
const { validate }  = require('./validate');
const { updateUserSchema } = require('../schemas/user.schema');

const router = Router();

// GET /api/users/permissions - Obtener permisos del usuario autenticado
router.get('/permissions', requireAuth, async (req, res) => {
    try {
        // El JWT fue firmado con { userId, username, permissions }
        const userId = req.user.userId ?? req.user.id;
        if (!userId) return fail(res, 401, 'SxUS401', 'Usuario no identificado');

        // Permisos globales frescos desde la DB (nunca del JWT)
        const { data: userRow, error: userError } = await supabase
            .from('usuarios')
            .select('permisos_globales, is_active')
            .eq('id', userId)
            .single();

        if (userError || !userRow) {
            return fail(res, 404, 'SxUS404', 'Usuario no encontrado');
        }
        if (!userRow.is_active) {
            return fail(res, 403, 'SxUS403', 'Cuenta desactivada');
        }

        // Permisos del grupo activo (header x-group-id)
        const groupId   = req.headers['x-group-id'];
        let groupPerms  = [];

        if (groupId) {
            const { data: member } = await supabase
                .from('grupo_miembros')
                .select('permisos')
                .eq('usuario_id', userId)
                .eq('grupo_id', groupId)
                .maybeSingle();
            groupPerms = member?.permisos ?? [];
        }

        return ok(res, 200, 'SxUS200', {
            permissions:      userRow.permisos_globales ?? [],
            groupPermissions: groupPerms
        });

    } catch (err) {
        console.error('Error en /permissions:', err);
        return fail(res, 500, 'SxUS500', 'Error interno del servidor');
    }
});

// GET /api/users
router.get('/', requireAuth, requirePermission('users:view'), async (_req, res) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select('id, username, email, nombre_completo, permisos_globales, is_active, creado_en')
        .order('creado_en', { ascending: false });

    if (error) return fail(res, 500, 'SxUS500', 'Error al obtener usuarios');
    return ok(res, 200, 'SxUS200', data);
});

// GET /api/users/:id
router.get('/:id', requireAuth, requirePermission('user:view'), async (req, res) => {
    const { data: user, error } = await supabase
        .from('usuarios')
        .select('id, username, email, nombre_completo, permisos_globales, is_active, creado_en')
        .eq('id', req.params.id)
        .single();

    if (error || !user) return fail(res, 404, 'SxUS404', 'Usuario no encontrado');

    const { data: miembros } = await supabase
        .from('grupo_miembros')
        .select('grupos(id, nombre), permisos')
        .eq('usuario_id', req.params.id);

    const groups = (miembros ?? []).map(m => ({
        id: m.grupos.id,
        name: m.grupos.nombre,
        permisos: m.permisos ?? []
    }));
    return ok(res, 200, 'SxUS200', [{ ...user, groups }]);
});

// PUT /api/users/:id
router.put('/:id',
    requireAuth,
    requirePermission('user:edit'),
    validate(updateUserSchema),
    async (req, res) => {
        const { password, group_ids, permissions, ...rest } = req.body;
        const updates = { ...rest };

        if (password) updates.password_hash = await hashPassword(password);
        if (permissions !== undefined) updates.permisos_globales = permissions;

        const { data, error } = await supabase
            .from('usuarios')
            .update(updates)
            .eq('id', req.params.id)
            .select('id, username, email, nombre_completo, permisos_globales, is_active')
            .single();

        if (error) return fail(res, 500, 'SxUS500', 'Error al actualizar usuario');

        if (Array.isArray(group_ids)) {
            await supabase.from('grupo_miembros').delete().eq('usuario_id', req.params.id);
            if (group_ids.length > 0) {
                const rows = group_ids.map(gid => ({ usuario_id: req.params.id, grupo_id: gid }));
                await supabase.from('grupo_miembros').insert(rows);
            }
        }

        return ok(res, 200, 'SxUS200', [data]);
    }
);

// DELETE /api/users/:id
router.delete('/:id', requireAuth, requirePermission('user:delete'), async (req, res) => {
    const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
    if (error) return fail(res, 500, 'SxUS500', 'Error al eliminar usuario');
    return ok(res, 200, 'SxUS200', null);
});

module.exports = router;
