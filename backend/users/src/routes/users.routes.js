const { Router } = require('express');
const { supabase }  = require('../config/database');
const { hashPassword } = require('../utils/hash');
const { ok, fail }  = require('../utils/respond');
const { requireAuth, requirePermission, requireAnyPermission } = require('./middleware');
const { validate }  = require('./validate');
const { updateUserSchema } = require('../schemas/user.schema');

const router = Router();

router.get('/permissions', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const groupId = req.headers['x-group-id'];

        const { data: userRow, error: userError } = await supabase
            .from('usuarios')
            .select('permisos_globales, is_active')
            .eq('id', userId)
            .single();

        if (userError || !userRow) {
            return fail(res, 404, 'SxUS404', 'Usuario no encontrado');
        }

        if (!userRow.is_active) {
            return fail(res, 403, 'SxUS403', 'Usuario inactivo');
        }

        const rawPerms = userRow.permisos_globales ?? [];
        const isAdmin = rawPerms.includes('permissions:manage');

        let globalPerms;
        if (isAdmin) {
            globalPerms = rawPerms;
        } else {
            const ADMIN_GLOBAL_PERMS = [
                'groups:manage', 'users:manage', 'permissions:manage',
                'group:add', 'group:remove', 'group:edit',
                'user:add', 'user:remove', 'user:edit',
                'user:deactivated', 'user:activated',
                'user:view', 'users:view'
            ];
            globalPerms = rawPerms.filter(p => ADMIN_GLOBAL_PERMS.includes(p));
        }

        const GROUP_SCOPED_PERMS = [
            'group:view',
            'ticket:view', 'tickets:view',
            'ticket:add',
            'ticket:edit', 'ticket:edit:state', 'ticket:edit:delete',
            'groups:manage', 'users:manage', 'permissions:manage',
        ];

        let groupPerms = [];
        if (groupId) {
            const { data: member } = await supabase
                .from('grupo_miembros')
                .select('permisos')
                .eq('usuario_id', userId)
                .eq('grupo_id', groupId)
                .maybeSingle();

            groupPerms = (member?.permisos ?? []).filter(p => GROUP_SCOPED_PERMS.includes(p));
        }

        return ok(res, 200, 'SxUS200', {
            permissions:      globalPerms,
            groupPermissions: groupPerms
        });

    } catch (err) {
        console.error('Error en /permissions:', err);
        return fail(res, 500, 'SxUS500', 'Error interno del servidor');
    }
});

router.get('/', requireAuth, requireAnyPermission(['users:view', 'users:manage']), async (_req, res) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select('id, username, email, nombre_completo, permisos_globales, is_active, creado_en')
        .order('creado_en', { ascending: false });

    if (error) return fail(res, 500, 'SxUS500', 'Error al obtener usuarios');
    return ok(res, 200, 'SxUS200', data);
});

router.get('/:id', requireAuth, requirePermission('user:view'), async (req, res) => {
    const { data: user, error } = await supabase
        .from('usuarios')
        .select('id, username, email, nombre_completo, telefono, direccion, permisos_globales, is_active, creado_en')
        .eq('id', req.params.id)
        .single();

    if (error || !user) return fail(res, 404, 'SxUS404', 'Usuario no encontrado');

    const { data: groupsData, error: groupsError } = await supabase
        .from('grupo_miembros')
        .select(`
            grupos(id, nombre),
            permisos
        `)
        .eq('usuario_id', req.params.id);

    if (groupsError) {
        console.error('Error obteniendo grupos del usuario:', groupsError);
    }

    const groups = (groupsData ?? []).map(item => ({
        id: item.grupos.id,
        name: item.grupos.nombre,
        permisos: item.permisos || []
    }));

    const userWithGroups = {
        ...user,
        groups: groups
    };

    return ok(res, 200, 'SxUS200', [userWithGroups]);
});

router.put('/:id',
    requireAuth,
    requirePermission('user:edit'),
    validate(updateUserSchema),
    async (req, res) => {
        const { password, permissions, ...rest } = req.body;
        const updates = { ...rest };

        if (password) {
            updates.password_hash = await hashPassword(password);
        }
        if (permissions !== undefined) updates.permisos_globales = permissions;

        const { data, error } = await supabase
            .from('usuarios')
            .update(updates)
            .eq('id', req.params.id)
            .select('id, username, email, nombre_completo, permisos_globales, is_active')
            .single();

        if (error) {
            return fail(res, 500, 'SxUS500', 'Error al actualizar usuario');
        }

        return ok(res, 200, 'SxUS200', [data]);
    }
);

router.delete('/:id', requireAuth, requireAnyPermission(['user:remove', 'user:delete']), async (req, res) => {
    const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
    if (error) return fail(res, 500, 'SxUS500', 'Error al eliminar usuario');
    return ok(res, 200, 'SxUS200', null);
});

router.patch('/:id/deactivate', requireAuth, requireAnyPermission(['user:remove', 'user:delete']), async (req, res) => {
    const { data, error } = await supabase
        .from('usuarios')
        .update({ is_active: false })
        .eq('id', req.params.id)
        .select('id, username, is_active')
        .single();

    if (error) return fail(res, 500, 'SxUS500', 'Error al desactivar usuario');
    return ok(res, 200, 'SxUS200', [data]);
});

router.patch('/:id/activate', requireAuth, requirePermission('user:add'), async (req, res) => {
    const { data, error } = await supabase
        .from('usuarios')
        .update({ is_active: true })
        .eq('id', req.params.id)
        .select('id, username, is_active')
        .single();

    if (error) return fail(res, 500, 'SxUS500', 'Error al activar usuario');
    return ok(res, 200, 'SxUS200', [data]);
});

router.put('/:id/permissions', requireAuth, requirePermission('permissions:manage'), async (req, res) => {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
        return fail(res, 400, 'SxUS400', 'permissions debe ser un array');
    }

    const adminPermissions = [
        'users:manage', 'user:add', 'user:remove', 'user:deactivated', 'user:activated',
        'groups:manage', 'group:add', 'group:remove', 'permissions:manage',
        'user:view', 'user:edit', 'group:view'
    ];

    const invalidPerms = permissions.filter(p => !adminPermissions.includes(p));
    if (invalidPerms.length > 0) {
        return fail(res, 400, 'SxUS400', `Permisos no válidos para permisos globales: ${invalidPerms.join(', ')}`);
    }

    const { data, error } = await supabase
        .from('usuarios')
        .update({ permisos_globales: permissions })
        .eq('id', req.params.id)
        .select('id, username, permisos_globales')
        .single();

    if (error) return fail(res, 500, 'SxUS500', 'Error al actualizar permisos');
    return ok(res, 200, 'SxUS200', [data]);
});

module.exports = router;
