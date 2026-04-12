const jwt = require('jsonwebtoken');

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/health'];

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL ?? 'http://localhost:3001';

async function fetchFreshPermissions(authHeader, groupId) {
    const { default: fetch } = await import('node-fetch');

    const headers = { Authorization: authHeader };
    if (groupId) headers['x-group-id'] = groupId;

    const res = await fetch(`${USERS_SERVICE_URL}/api/users/permissions`, { headers });
    if (!res.ok) return null;

    const body = await res.json();
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

    const groupId = req.headers['x-group-id'];
    try {
        const freshPerms = await fetchFreshPermissions(authHeader, groupId);
        if (freshPerms !== null) {
            req.user.permissions = freshPerms;
        } else {
            req.user.permissions = [];
        }
    } catch {
        req.user.permissions = [];
    }
}

module.exports = { jwtValidator };
