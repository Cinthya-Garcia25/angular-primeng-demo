import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { validate } from '../middleware/validate.middleware';
import { requireAuth, requirePermission } from '../middleware/auth.middleware';
import { createTicketSchema, updateTicketSchema, addCommentSchema } from '../schemas/ticket.schema';

const router = Router();

// GET /api/tickets?grupo_id=xxx
router.get('/', requireAuth, requirePermission('tickets:view'), async (req: Request, res: Response): Promise<void> => {
  let query = supabase
    .from('tickets')
    .select(`
      id, titulo, descripcion, creado_en, fecha_final,
      estados(id, codigo, nombre, color),
      prioridades(id, codigo, nombre, orden),
      autor:autor_id(id, username, nombre_completo),
      asignado:asignado_id(id, username, nombre_completo),
      grupos(id, nombre),
      comentarios(id, contenido, creado_en, autor:autor_id(username)),
      historial_tickets(id, accion, creado_en, usuario:usuario_id(username))
    `)
    .order('creado_en', { ascending: false });

  if (req.query.grupo_id) {
    query = query.eq('grupo_id', req.query.grupo_id as string);
  }

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: 'Error al obtener tickets' }); return; }
  res.json(data);
});

// GET /api/tickets/:id
router.get('/:id', requireAuth, requirePermission('ticket:view'), async (req: Request, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      id, titulo, descripcion, creado_en, fecha_final,
      estados(id, codigo, nombre, color),
      prioridades(id, codigo, nombre, orden),
      autor:autor_id(id, username, nombre_completo),
      asignado:asignado_id(id, username, nombre_completo),
      grupos(id, nombre),
      comentarios(id, contenido, creado_en, autor:autor_id(username)),
      historial_tickets(id, accion, creado_en, usuario:usuario_id(username))
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) { res.status(404).json({ error: 'Ticket no encontrado' }); return; }
  res.json(data);
});

// POST /api/tickets
router.post('/',
  requireAuth,
  requirePermission('ticket:add'),
  validate(createTicketSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { grupo_id, titulo, descripcion, estado_id, prioridad_id, asignado_id, fecha_final } = req.body;

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        grupo_id,
        titulo,
        descripcion,
        estado_id,
        prioridad_id,
        asignado_id: asignado_id ?? null,
        autor_id: req.user!.userId,
        fecha_final: fecha_final ?? null
      })
      .select('id, titulo, creado_en')
      .single();

    if (error) { res.status(500).json({ error: 'Error al crear ticket' }); return; }

    // Registrar historial inicial
    await supabase.from('historial_tickets').insert({
      ticket_id: ticket.id,
      usuario_id: req.user!.userId,
      accion: 'creó el ticket'
    });

    res.status(201).json(ticket);
  }
);

// PUT /api/tickets/:id
router.put('/:id',
  requireAuth,
  requirePermission('ticket:edit'),
  validate(updateTicketSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { data: old } = await supabase.from('tickets').select('*').eq('id', req.params.id).single();
    if (!old) { res.status(404).json({ error: 'Ticket no encontrado' }); return; }

    const { data, error } = await supabase
      .from('tickets')
      .update(req.body)
      .eq('id', req.params.id)
      .select('id, titulo, creado_en')
      .single();

    if (error) { res.status(500).json({ error: 'Error al actualizar ticket' }); return; }

    const changed = Object.keys(req.body).filter(k => (req.body as any)[k] !== (old as any)[k]);
    if (changed.length) {
      await supabase.from('historial_tickets').insert({
        ticket_id: req.params.id,
        usuario_id: req.user!.userId,
        accion: `actualizó: ${changed.join(', ')}`
      });
    }

    res.json(data);
  }
);

// PATCH /api/tickets/:id/status — cambiar solo el estado
router.patch('/:id/status',
  requireAuth,
  requirePermission('ticket:edit_state'),
  async (req: Request, res: Response): Promise<void> => {
    const { estado_id } = req.body;

    if (!estado_id) {
      res.status(400).json({ error: 'estado_id es requerido' });
      return;
    }

    // Verificar que el estado existe
    const { data: estado } = await supabase.from('estados').select('id, codigo').eq('id', estado_id).single();
    if (!estado) { res.status(400).json({ error: 'Estado inválido' }); return; }

    const { data, error } = await supabase
      .from('tickets')
      .update({ estado_id })
      .eq('id', req.params.id)
      .select('id, estado_id')
      .single();

    if (error) { res.status(500).json({ error: 'Error al actualizar estado' }); return; }

    await supabase.from('historial_tickets').insert({
      ticket_id: req.params.id,
      usuario_id: req.user!.userId,
      accion: `actualizó: estado → ${estado.codigo}`
    });

    res.json(data);
  }
);

// POST /api/tickets/:id/comments
router.post('/:id/comments',
  requireAuth,
  validate(addCommentSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { data, error } = await supabase
      .from('comentarios')
      .insert({
        ticket_id: req.params.id,
        autor_id: req.user!.userId,
        contenido: req.body.text
      })
      .select('id, contenido, creado_en')
      .single();

    if (error) { res.status(500).json({ error: 'Error al agregar comentario' }); return; }
    res.status(201).json(data);
  }
);

// DELETE /api/tickets/:id
router.delete('/:id', requireAuth, requirePermission('ticket:delete'), async (req: Request, res: Response): Promise<void> => {
  const { error } = await supabase.from('tickets').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: 'Error al eliminar ticket' }); return; }
  res.json({ message: 'Ticket eliminado' });
});

export default router;
