import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { createGroupSchema, updateGroupSchema } from '../schemas/group.schema';

const router = Router();

// GET /api/groups
router.get('/', requireAuth, async (_req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('grupos')
    .select('id, nombre, descripcion, creado_en')
    .order('nombre');

  if (error) { res.status(500).json({ error: 'Error al obtener grupos' }); return; }
  res.json(data);
});

// GET /api/groups/:id — con miembros
router.get('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { data: grupo, error } = await supabase
    .from('grupos')
    .select('id, nombre, descripcion, creado_en')
    .eq('id', req.params.id)
    .single();

  if (error || !grupo) { res.status(404).json({ error: 'Grupo no encontrado' }); return; }

  const { data: miembros } = await supabase
    .from('grupo_miembros')
    .select('usuarios(id, username, nombre_completo, email), fecha_unido')
    .eq('grupo_id', req.params.id);

  res.json({ ...grupo, miembros: miembros ?? [] });
});

// POST /api/groups
router.post('/',
  requireAuth,
  requirePermission('group:add'),
  validate(createGroupSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { name, description } = req.body;

    const { data, error } = await supabase
      .from('grupos')
      .insert({ nombre: name, descripcion: description, creador_id: req.user!.userId })
      .select('id, nombre, descripcion')
      .single();

    if (error) { res.status(500).json({ error: 'Error al crear grupo' }); return; }

    // Agregar al creador como miembro automáticamente
    await supabase.from('grupo_miembros').insert({ grupo_id: data.id, usuario_id: req.user!.userId });

    res.status(201).json(data);
  }
);

// PUT /api/groups/:id
router.put('/:id',
  requireAuth,
  requirePermission('group:edit'),
  validate(updateGroupSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { name, description } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.nombre = name;
    if (description !== undefined) updates.descripcion = description;

    const { data, error } = await supabase
      .from('grupos')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, nombre, descripcion')
      .single();

    if (error) { res.status(500).json({ error: 'Error al actualizar grupo' }); return; }
    res.json(data);
  }
);

// DELETE /api/groups/:id
router.delete('/:id', requireAuth, requirePermission('group:delete'), async (req: Request, res: Response): Promise<void> => {
  const { error } = await supabase.from('grupos').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: 'Error al eliminar grupo' }); return; }
  res.json({ message: 'Grupo eliminado' });
});

export default router;
