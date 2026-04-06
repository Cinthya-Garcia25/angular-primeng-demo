const { Router } = require('express');
const { supabase }  = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken }  = require('../utils/jwt');
const { ok, fail }   = require('../utils/respond');
const { requireAuth, requirePermission } = require('./middleware');
const { loginSchema, registerSchema, addUserSchema } = require('../schemas/user.schema');
const { validate }   = require('./validate');

const router = Router();

// POST /api/auth/login  — público
router.post('/login', validate(loginSchema), async (req, res) => {
    const { username, password } = req.body;

    const { data: user, error } = await supabase
        .from('usuarios')
        .select('id, username, email, password_hash, is_active, permisos_globales, nombre_completo')
        .eq('username', username.trim().toLowerCase())
        .single();

    if (error || !user) return fail(res, 401, 'SxAS401', 'Credenciales inválidas');
    if (!user.is_active) return fail(res, 403, 'SxAS403', 'Cuenta desactivada');

    const passwordOk = await comparePassword(password, user.password_hash);
    if (!passwordOk) return fail(res, 401, 'SxAS401', 'Credenciales inválidas');

    await supabase.from('usuarios').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    const { data: miembros } = await supabase
        .from('grupo_miembros')
        .select('grupos(id, nombre)')
        .eq('usuario_id', user.id);

    const groups = (miembros ?? []).map(m => ({ id: m.grupos.id, name: m.grupos.nombre }));

    const token = signToken({
        userId:      user.id,
        username:    user.username,
        permissions: user.permisos_globales ?? []
    });

    return ok(res, 200, 'SxAS200', [{
        token,
        user: {
            id:          user.id,
            name:        user.nombre_completo ?? user.username,
            email:       user.email,
            permissions: user.permisos_globales ?? [],
            groups
        }
    }]);
});

// POST /api/auth/register  — público
router.post('/register', validate(registerSchema), async (req, res) => {
    const { username, password, email, nombre_completo, telefono, direccion } = req.body;

    const { data: existing } = await supabase
        .from('usuarios')
        .select('id')
        .or(`username.eq.${username.toLowerCase()},email.eq.${email.toLowerCase()}`)
        .maybeSingle();

    if (existing) return fail(res, 409, 'SxAS409', 'Usuario o email ya registrado');

    const password_hash = await hashPassword(password);

    const { data: newUser, error } = await supabase
        .from('usuarios')
        .insert({
            username:         username.trim().toLowerCase(),
            email:            email.trim().toLowerCase(),
            password_hash,
            nombre_completo:  nombre_completo ?? null,
            telefono:         telefono ?? null,
            direccion:        direccion ?? null,
            permisos_globales: ['group:view', 'tickets:view', 'ticket:add', 'ticket:edit_state', 'user:view', 'user:edit'],
            is_active: true
        })
        .select('id, username, email')
        .single();

    if (error) return fail(res, 500, 'SxAS500', 'Error al registrar usuario');

    return ok(res, 201, 'SxAS201', [newUser]);
});

// POST /api/auth/users  — requiere user:add
router.post('/users',
    requireAuth,
    requirePermission('user:add'),
    validate(addUserSchema),
    async (req, res) => {
        const { username, password, email, permissions = [], group_ids = [] } = req.body;

        const { data: existing } = await supabase
            .from('usuarios')
            .select('id')
            .or(`username.eq.${username.toLowerCase()},email.eq.${email.toLowerCase()}`)
            .maybeSingle();

        if (existing) return fail(res, 409, 'SxUS409', 'Usuario o email ya existe');

        const password_hash = await hashPassword(password);

        const { data: newUser, error } = await supabase
            .from('usuarios')
            .insert({
                username:          username.trim().toLowerCase(),
                email:             email.trim().toLowerCase(),
                password_hash,
                permisos_globales: permissions,
                is_active:         true
            })
            .select('id, username, email, permisos_globales')
            .single();

        if (error) return fail(res, 500, 'SxUS500', 'Error al crear usuario');

        if (group_ids.length > 0) {
            const rows = group_ids.map(gid => ({ usuario_id: newUser.id, grupo_id: gid }));
            await supabase.from('grupo_miembros').insert(rows);
        }

        return ok(res, 201, 'SxUS201', [newUser]);
    }
);

module.exports = router;
