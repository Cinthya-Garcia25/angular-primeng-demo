// Reglas de permiso en el API Gateway.
// req.user.permissions ya contiene permisos frescos desde DB (actualizado en jwt-validator).
const PERMISSION_RULES = [
    // ── Users ─────────────────────────────────────────────────────────────
    { method: 'POST',   test: url => url === '/api/auth/users',                         permission: 'user:add'          },
    { method: 'PUT',    test: url => /^\/api\/users\/[^/]+$/.test(url),                 permission: 'user:edit'         },
    { method: 'DELETE', test: url => /^\/api\/users\/[^/]+$/.test(url),                 permission: 'user:delete'       },
    { method: 'PATCH',  test: url => /^\/api\/users\/[^/]+\/deactivate$/.test(url),    permission: 'user:delete'   },
    { method: 'PATCH',  test: url => /^\/api\/users\/[^/]+\/activate$/.test(url),      permission: 'user:add'     },
    { method: 'PUT',    test: url => /^\/api\/users\/[^/]+\/permissions$/.test(url),   permission: 'permissions:manage' },

    // ── Groups ────────────────────────────────────────────────────────────
    { method: 'POST',   test: url => url === '/api/groups',                             permission: 'group:add'         },
    { method: 'PUT',    test: url => /^\/api\/groups\/[^/]+$/.test(url),                permission: 'group:edit'        },
    { method: 'DELETE', test: url => /^\/api\/groups\/[^/]+$/.test(url),                permission: 'group:remove'      },
    { method: 'POST',   test: url => /^\/api\/groups\/[^/]+\/members$/.test(url),       permission: 'group:edit'  },
    { method: 'DELETE', test: url => /^\/api\/groups\/[^/]+\/members\/[^/]+$/.test(url),permission: 'group:edit'},

    // ── Tickets ───────────────────────────────────────────────────────────
    { method: 'POST',   test: url => url === '/api/tickets',                            permission: 'ticket:add'        },
    { method: 'PUT',    test: url => /^\/api\/tickets\/[^/]+$/.test(url),               permission: 'ticket:edit'       },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/status$/.test(url),       permission: 'ticket:edit_state' },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/priority$/.test(url),    permission: 'ticket:edit:priority' },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/deadline$/.test(url),     permission: 'ticket:edit:deadline' },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/assign$/.test(url),       permission: 'ticket:edit:assign' },
    { method: 'POST',   test: url => /^\/api\/tickets\/[^/]+\/comments$/.test(url),    permission: 'ticket:edit:comment' },
    { method: 'DELETE', test: url => /^\/api\/tickets\/[^/]+$/.test(url),               permission: 'ticket:delete'},
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
