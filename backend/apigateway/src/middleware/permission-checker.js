// Reglas de permiso en el API Gateway.
// req.user.permissions ya contiene permisos frescos desde DB (actualizado en jwt-validator).
const PERMISSION_RULES = [
    // ── Users ─────────────────────────────────────────────────────────────
    { method: 'POST',   test: url => url === '/api/auth/users',                         permission: 'user:add'          },
    { method: 'PUT',    test: url => /^\/api\/users\/[^/]+$/.test(url),                 permission: 'user:edit'         },
    { method: 'DELETE', test: url => /^\/api\/users\/[^/]+$/.test(url),                 permission: 'user:remove'       },

    // ── Groups ────────────────────────────────────────────────────────────
    { method: 'POST',   test: url => url === '/api/groups',                             permission: 'group:add'         },
    { method: 'PUT',    test: url => /^\/api\/groups\/[^/]+$/.test(url),                permission: 'group:edit'        },
    { method: 'DELETE', test: url => /^\/api\/groups\/[^/]+$/.test(url),                permission: 'group:remove'      },
    { method: 'POST',   test: url => /^\/api\/groups\/[^/]+\/members$/.test(url),       permission: 'group:add:member'  },
    { method: 'DELETE', test: url => /^\/api\/groups\/[^/]+\/members\/[^/]+$/.test(url),permission: 'group:remove:member'},

    // ── Tickets ───────────────────────────────────────────────────────────
    { method: 'POST',   test: url => url === '/api/tickets',                            permission: 'ticket:add'        },
    { method: 'PUT',    test: url => /^\/api\/tickets\/[^/]+$/.test(url),               permission: 'ticket:edit'       },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/status$/.test(url),       permission: 'ticket:edit:state' },
    { method: 'DELETE', test: url => /^\/api\/tickets\/[^/]+$/.test(url),               permission: 'ticket:edit:delete'},
];

async function permissionChecker(req, reply) {
    if (!req.user) return; // ya rechazado por jwt-validator

    const rule = PERMISSION_RULES.find(
        r => r.method === req.method && r.test(req.url)
    );

    if (rule && !req.user.permissions?.includes(rule.permission)) {
        return reply.code(403).send({
            statusCode: 403, intOpCode: 'SxGW403', data: null,
            message: `Permiso requerido: ${rule.permission}`
        });
    }
}

module.exports = { permissionChecker };
