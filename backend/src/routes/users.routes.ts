import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { updateUserSchema } from '../schemas/user.schema';

const router = Router();

// GET /api/users — listar todos los usuarios
router.get('/', requireAuth, requirePermission('users:view'), async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, username, email, nombre_completo, permisos_globales, is_active, creado_en')
    .order('creado_en', { ascending: false });

  if (error) { res.status(500).json({ error: 'Error al obtener usuarios' }); return; }
  res.json(data);
});

// GET /api/users/:id — obtener un usuario con sus grupos
router.get('/:id', requireAuth, requirePermission('user:view'), async (req: Request, res: Response): Promise<void> => {
  const { data: user, error } = await supabase
    .from('usuarios')
    .select('id, username, email, nombre_completo, permisos_globales, is_active, creado_en')
    .eq('id', req.params.id)
    .single();

  if (error || !user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const { data: miembros } = await supabase
    .from('grupo_miembros')
    .select('grupos(id, nombre)')
    .eq('usuario_id', req.params.id);

  const groups = (miembros ?? []).map((m: any) => ({ id: m.grupos.id, name: m.grupos.nombre }));

  res.json({ ...user, groups });
});

// PUT /api/users/:id — editar usuario
router.put('/:id',
  requireAuth,
  requirePermission('user:edit'),
  validate(updateUserSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { password, group_ids, permissions, ...rest } = req.body;
    const updates: Record<string, unknown> = { ...rest };

    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    if (permissions !== undefined) {
      updates.permisos_globales = permissions;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, username, email, nombre_completo, permisos_globales, is_active')
      .single();

    if (error) { res.status(500).json({ error: 'Error al actualizar usuario' }); return; }

    // Actualizar grupos si se indicaron
    if (Array.isArray(group_ids)) {
      await supabase.from('grupo_miembros').delete().eq('usuario_id', req.params.id);
      if (group_ids.length > 0) {
        const rows = group_ids.map((gid: string) => ({ usuario_id: req.params.id, grupo_id: gid }));
        await supabase.from('grupo_miembros').insert(rows);
      }
    }

    res.json(data);
  }
);

// DELETE /api/users/:id — eliminar usuario
router.delete('/:id', requireAuth, requirePermission('user:delete'), async (req: Request, res: Response): Promise<void> => {
  const { error } = await supabase.from('usuarios').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: 'Error al eliminar usuario' }); return; }
  res.json({ message: 'Usuario eliminado' });
});

export default router;
