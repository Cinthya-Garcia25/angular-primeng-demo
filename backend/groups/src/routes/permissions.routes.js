const { Router }   = require('express');
const jwt          = require('jsonwebtoken');
const { supabase } = require('../config/database');
const { ok, fail } = require('../utils/respond');

const router = Router();

function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? '';
    if (!header.startsWith('Bearer ')) { fail(res, 401, 'SxPS401', 'Token requerido'); return; }
    try {
        req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
        next();
    } catch {
        fail(res, 401, 'SxPS401', 'Token inválido o expirado');
    }
}

router.get('/', requireAuth, async (_req, res) => {
    const { data, error } = await supabase
        .from('permisos')
        .select('id, codigo, nombre, descripcion')
        .order('codigo');

    if (error) return fail(res, 500, 'SxPS500', 'Error al obtener permisos');
    return ok(res, 200, 'SxPS200', data);
});

module.exports = router;
