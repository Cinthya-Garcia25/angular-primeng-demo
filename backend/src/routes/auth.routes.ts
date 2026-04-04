import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { loginSchema, registerSchema, addUserSchema } from '../schemas/auth.schema';

const router = Router();

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, username, email, password_hash, is_active, permisos_globales, nombre_completo')
    .eq('username', username.trim().toLowerCase())
    .single();

  if (error || !user) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ error: 'Cuenta desactivada' });
    return;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    res.status(401).json({ error: 'Credenciales inválidas' });
    return;
  }

  // Actualizar last_login
  await supabase.from('usuarios').update({ last_login: new Date().toISOString() }).eq('id', user.id);

  // Obtener grupos del usuario
  const { data: miembros } = await supabase
    .from('grupo_miembros')
    .select('grupos(id, nombre)')
    .eq('usuario_id', user.id);

  const groups = (miembros ?? []).map((m: any) => ({ id: m.grupos.id, name: m.grupos.nombre }));

  const token = jwt.sign(
    { userId: user.id, username: user.username, permissions: user.permisos_globales ?? [] },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.nombre_completo ?? user.username,
      email: user.email,
      permissions: user.permisos_globales ?? [],
      groups
    }
  });
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  const { username, password, email, nombre_completo, telefono, direccion } = req.body;

  const { data: existing } = await supabase
    .from('usuarios')
    .select('id')
    .or(`username.eq.${username.toLowerCase()},email.eq.${email.toLowerCase()}`)
    .maybeSingle();

  if (existing) {
    res.status(409).json({ error: 'Usuario o email ya registrado' });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data: newUser, error } = await supabase
    .from('usuarios')
    .insert({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password_hash,
      nombre_completo: nombre_completo ?? null,
      telefono: telefono ?? null,
      direccion: direccion ?? null,
      permisos_globales: ['group:view', 'ticket:view', 'ticket:edit_state', 'user:view', 'user:edit'],
      is_active: true
    })
    .select('id, username, email')
    .single();

  if (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
    return;
  }

  res.status(201).json({ message: 'Usuario registrado correctamente', user: newUser });
});

// POST /api/auth/users — Agregar usuario (requiere permiso user:add)
router.post('/users',
  requireAuth,
  requirePermission('user:add'),
  validate(addUserSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { username, password, email, permissions = [], group_ids = [] } = req.body;

    const { data: existing } = await supabase
      .from('usuarios')
      .select('id')
      .or(`username.eq.${username.toLowerCase()},email.eq.${email.toLowerCase()}`)
      .maybeSingle();

    if (existing) {
      res.status(409).json({ error: 'Usuario o email ya existe' });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('usuarios')
      .insert({
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password_hash,
        permisos_globales: permissions,
        is_active: true
      })
      .select('id, username, email, permisos_globales')
      .single();

    if (error) {
      res.status(500).json({ error: 'Error al crear usuario' });
      return;
    }

    // Asignar grupos
    if (group_ids.length > 0) {
      const rows = group_ids.map((gid: string) => ({ usuario_id: newUser.id, grupo_id: gid }));
      await supabase.from('grupo_miembros').insert(rows);
    }

    res.status(201).json({ message: 'Usuario creado', user: newUser });
  }
);

export default router;
