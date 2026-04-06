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
    } catch {
        fail(res, 401, 'SxUS401', 'Token inválido o expirado');
    }
}

/**
 * Middleware que verifica en tiempo real desde la base de datos si el usuario
 * posee el permiso requerido. No usa los permisos embebidos en el JWT.
 */
function requirePermission(permission) {
    return async (req, res, next) => {
        const userId = req.user?.userId ?? req.user?.id;
        if (!userId) {
            fail(res, 403, 'SxUS403', `Permiso requerido: ${permission}`);
            return;
        }

        try {
            // Consultar permisos globales frescos desde la DB
            const { data, error } = await supabase
                .from('usuarios')
                .select('permisos_globales, is_active')
                .eq('id', userId)
                .single();

            if (error || !data) {
                fail(res, 403, 'SxUS403', `Permiso requerido: ${permission}`);
                return;
            }

            // Cuenta desactivada = sin acceso
            if (!data.is_active) {
                fail(res, 403, 'SxUS403', 'Cuenta desactivada');
                return;
            }

            const permisos = data.permisos_globales ?? [];

            // Verificar también permisos de grupo si se envía X-Group-Id
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

            const effectivePerms = [...new Set([...permisos, ...groupPerms])];

            if (!effectivePerms.includes(permission)) {
                fail(res, 403, 'SxUS403', `Permiso requerido: ${permission}`);
                return;
            }

            // Actualizar req.user.permissions con los permisos frescos
            req.user.permissions = effectivePerms;
            next();
        } catch {
            fail(res, 500, 'SxUS500', 'Error al verificar permisos');
        }
    };
}

module.exports = { requireAuth, requirePermission };
