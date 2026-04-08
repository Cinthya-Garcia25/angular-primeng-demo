const { verifyToken } = require('../utils/jwt');
const { supabase }    = require('../config/database');
const { fail }        = require('../utils/respond');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        fail(res, 401, 'SxUS401', 'Token requerido');
        return;
    }
    try {
        req.user = verifyToken(authHeader.slice(7));
        next();
    } catch (err) {
        return fail(res, 401, 'SxUS401', 'Token inválido');
    }
};

/**
 * Middleware que verifica en tiempo real desde la base de datos si el usuario
 * posee el permiso requerido. No usa los permisos embebidos en el JWT.
 */
async function resolveEffectivePerms(req) {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) return null;

    // Permisos administrativos globales
    const { data, error } = await supabase
        .from('usuarios')
        .select('is_active, permisos_globales')
        .eq('id', userId)
        .single();

    if (error || !data) return null;
    if (!data.is_active) return 'inactive';

    const globalPerms = data.permisos_globales ?? [];
    let groupPerms = [];
    const groupId = req.headers['x-group-id'];
    if (groupId) {
        const { data: member } = await supabase
            .from('grupo_miembros')
            .select('permisos')
            .eq('usuario_id', userId)
            .eq('grupo_id', groupId)
            .maybeSingle();
        groupPerms = member?.permisos ?? [];
    }

    // Combinar permisos administrativos globales + permisos funcionales del grupo
    return [...new Set([...globalPerms, ...groupPerms])];
}

/** Requiere exactamente un permiso */
function requirePermission(permission) {
    return requireAnyPermission([permission]);
}

/** Requiere al menos uno de los permisos del array (OR lógico) */
function requireAnyPermission(permissions) {
    return async (req, res, next) => {
        const userId = req.user?.userId ?? req.user?.id;
        if (!userId) {
            fail(res, 403, 'SxUS403', `Permiso requerido: ${permissions.join(' | ')}`);
            return;
        }

        try {
            const effectivePerms = await resolveEffectivePerms(req, res);

            if (effectivePerms === null) {
                fail(res, 403, 'SxUS403', `Permiso requerido: ${permissions.join(' | ')}`);
                return;
            }
            if (effectivePerms === 'inactive') {
                fail(res, 403, 'SxUS403', 'Cuenta desactivada');
                return;
            }

            const allowed = permissions.some(p => effectivePerms.includes(p));
            if (!allowed) {
                fail(res, 403, 'SxUS403', `Permiso requerido: ${permissions.join(' | ')}`);
                return;
            }

            req.user.permissions = effectivePerms;
            next();
        } catch {
            fail(res, 500, 'SxUS500', 'Error al verificar permisos');
        }
    };
}

module.exports = { requireAuth, requirePermission, requireAnyPermission };
