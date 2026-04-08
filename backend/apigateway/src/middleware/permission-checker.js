// Reglas de permiso en el API Gateway.
// req.user.permissions ya contiene permisos frescos desde DB (actualizado en jwt-validator).
// Cada regla puede tener un string (único) o un array (OR lógico) en el campo `permission`.
const PERMISSION_RULES = [
    // Users
    { method: 'POST',   test: url => url === '/api/auth/users',                          permission: 'user:add'                                  },
    { method: 'PUT',    test: url => /^\/api\/users\/[^/]+$/.test(url),                  permission: 'user:edit'                                  },
    { method: 'DELETE', test: url => /^\/api\/users\/[^/]+$/.test(url),                  permission: ['user:remove', 'user:delete']               },
    { method: 'PATCH',  test: url => /^\/api\/users\/[^/]+\/deactivate$/.test(url),      permission: ['user:remove', 'user:delete']               },
    { method: 'PATCH',  test: url => /^\/api\/users\/[^/]+\/activate$/.test(url),        permission: 'user:add'                                   },
    { method: 'PUT',    test: url => /^\/api\/users\/[^/]+\/permissions$/.test(url),     permission: 'permissions:manage'                         },
    { method: 'GET',    test: url => url === '/api/users',                               permission: ['users:view', 'users:manage'] },
    { method: 'GET',    test: url => /^\/api\/users\/[^/]+$/.test(url),                  permission: 'user:view'                                  },

    // Groups
    { method: 'POST',   test: url => url === '/api/groups',                              permission: 'group:add'                                  },
    { method: 'PUT',    test: url => /^\/api\/groups\/[^/]+$/.test(url),                 permission: 'group:edit'                                 },
    { method: 'DELETE', test: url => /^\/api\/groups\/[^/]+$/.test(url),                 permission: ['group:remove', 'group:delete']             },
    { method: 'POST',   test: url => /^\/api\/groups\/[^/]+\/members$/.test(url),        permission: 'group:edit'                                 },
    { method: 'DELETE', test: url => /^\/api\/groups\/[^/]+\/members\/[^/]+$/.test(url), permission: 'group:edit'                                 },
    { method: 'PUT',    test: url => /^\/api\/groups\/[^/]+\/members\/[^/]+\/permissions$/.test(url), permission: ['group:edit', 'permissions:manage'] },
    { method: 'GET',    test: url => url === '/api/groups',                              permission: 'group:view'                                 },
    { method: 'GET',    test: url => /^\/api\/groups\/[^/]+$/.test(url),                 permission: 'group:view'                                 },

    // Tickets
    { method: 'POST',   test: url => url === '/api/tickets',                             permission: 'ticket:add'                                 },
    { method: 'PUT',    test: url => /^\/api\/tickets\/[^/]+$/.test(url),                permission: 'ticket:edit'                                },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/status$/.test(url),        permission: ['ticket:edit:state', 'ticket:edit_state']   },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/priority$/.test(url),     permission: 'ticket:edit'                                },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/deadline$/.test(url),      permission: 'ticket:edit'                                },
    { method: 'PATCH',  test: url => /^\/api\/tickets\/[^/]+\/assign$/.test(url),        permission: 'ticket:edit'                                },
    { method: 'POST',   test: url => /^\/api\/tickets\/[^/]+\/comments$/.test(url),     permission: 'ticket:edit'                                },
    { method: 'DELETE', test: url => /^\/api\/tickets\/[^/]+$/.test(url),                permission: ['ticket:edit:delete', 'ticket:delete']      },
    { method: 'GET',    test: url => url === '/api/tickets',                             permission: ['tickets:view', 'ticket:view']              },
    { method: 'GET',    test: url => /^\/api\/tickets\/[^/]+$/.test(url),                permission: 'ticket:view'                                },
];

function hasRequiredPermission(userPerms, required) {
    if (Array.isArray(required)) {
        return required.some(p => userPerms.includes(p));
    }
    return userPerms.includes(required);
}

async function permissionChecker(req, reply) {
    if (!req.user) return; // ya rechazado por jwt-validator

    const rule = PERMISSION_RULES.find(
        r => r.method === req.method && r.test(req.url)
    );

    if (rule && !hasRequiredPermission(req.user.permissions ?? [], rule.permission)) {
        const required = Array.isArray(rule.permission) ? rule.permission.join(' | ') : rule.permission;
        return reply.code(403).send({
            statusCode: 403, intOpCode: 'SxGW403', data: null,
            message: `Permiso requerido: ${required}`
        });
    }
}

module.exports = { permissionChecker };
