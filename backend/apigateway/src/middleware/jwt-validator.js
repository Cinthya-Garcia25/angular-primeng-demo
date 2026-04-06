const jwt   = require('jsonwebtoken');
const fetch = require('node-fetch');

// Rutas públicas que NO requieren token
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/health'];

// URL interna del servicio de usuarios (sin pasar por el propio gateway)
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL ?? 'http://localhost:3001';

/**
 * Consulta los permisos actuales del usuario directamente en la base de datos
 * a través del Users Service. Nunca usa los permisos embebidos en el JWT.
 */
async function fetchFreshPermissions(authHeader, groupId) {
    const headers = { Authorization: authHeader };
    if (groupId) headers['x-group-id'] = groupId;

    const res = await fetch(`${USERS_SERVICE_URL}/api/users/permissions`, { headers });
    if (!res.ok) return null;

    const body = await res.json();
    // data es { permissions: [], groupPermissions: [] } (no array)
    const perms      = body?.data?.permissions      ?? [];
    const groupPerms = body?.data?.groupPermissions ?? [];
    return [...new Set([...perms, ...groupPerms])];
}

async function jwtValidator(req, reply) {
    if (PUBLIC_PATHS.some(p => req.url.startsWith(p))) return;

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({
            statusCode: 401, intOpCode: 'SxGW401', data: null,
            message: 'Token requerido'
        });
    }

    const token = authHeader.slice(7);
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return reply.code(401).send({
            statusCode: 401, intOpCode: 'SxGW401', data: null,
            message: 'Token inválido o expirado'
        });
    }

    // Obtener permisos frescos desde la base de datos (no del JWT)
    const groupId = req.headers['x-group-id'];
    try {
        const freshPerms = await fetchFreshPermissions(authHeader, groupId);
        if (freshPerms !== null) {
            req.user.permissions = freshPerms;
        } else {
            // El servicio de usuarios no pudo devolver permisos → denegar acceso
            // (evitar que el JWT con permisos viejos sea el fallback)
            req.user.permissions = [];
        }
    } catch {
        req.user.permissions = [];
    }
}

module.exports = { jwtValidator };
