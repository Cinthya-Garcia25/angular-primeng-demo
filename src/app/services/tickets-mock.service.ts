import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Ticket, TicketComment, TicketHistory, TicketPriority, TicketStatus } from '../models/ticket.model';

const STORAGE_KEY = 'groupTicketsMockV5';

function safeParseTickets(raw: string | null): Ticket[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    return parsed
      .filter(
        (t: any): boolean =>
          typeof t?.id === 'number' &&
          typeof t?.groupId === 'string' &&
          typeof t?.title === 'string' &&
          typeof t?.status === 'string' &&
          typeof t?.assignee === 'string' &&
          typeof t?.createdAt === 'string'
      )
      .map(
        (t: any): Ticket => ({
          id: t.id,
          groupId: t.groupId,
          title: t.title,
          description: typeof t.description === 'string' ? t.description : undefined,
          status: t.status as TicketStatus,
          priority: (['alta', 'media', 'baja'].includes(t.priority) ? t.priority : 'media') as TicketPriority,
          assignee: t.assignee,
          createdBy: typeof t.createdBy === 'string' ? t.createdBy : 'admin',
          createdAt: t.createdAt,
          dueDate: typeof t.dueDate === 'string' ? t.dueDate : undefined,
          comments: Array.isArray(t.comments) ? t.comments : [],
          history: Array.isArray(t.history) ? t.history : []
        })
      );
  } catch {
    return null;
  }
}

function toIso(date: Date): string {
  return date.toISOString();
}

function buildUpdateAction(partial: Partial<Ticket>, oldTicket: Ticket): string {
  const changes = [];
  
  if (partial.title !== undefined && partial.title !== oldTicket.title) {
    changes.push('título');
  }
  if (partial.description !== undefined && partial.description !== oldTicket.description) {
    changes.push('descripción');
  }
  if (partial.status !== undefined && partial.status !== oldTicket.status) {
    changes.push('estado');
  }
  if (partial.priority !== undefined && partial.priority !== oldTicket.priority) {
    changes.push('prioridad');
  }
  if (partial.assignee !== undefined && partial.assignee !== oldTicket.assignee) {
    changes.push('asignado');
  }
  
  // Date comparison
  const oldDue = oldTicket.dueDate ? new Date(oldTicket.dueDate).toISOString().split('T')[0] : undefined;
  const newDue = partial.dueDate ? new Date(partial.dueDate).toISOString().split('T')[0] : undefined;
  if (partial.dueDate !== undefined && oldDue !== newDue) {
    changes.push('fecha límite');
  }

  if (changes.length === 0) return 'actualizó el ticket sin cambios';
  if (changes.length === 1) return `actualizó: ${changes[0]}`;
  return `actualizó: ${changes.slice(0, -1).join(', ')} y ${changes[changes.length - 1]}`;
}

@Injectable({ providedIn: 'root' })
export class TicketsMockService {
  private readonly tickets$ = new BehaviorSubject<Ticket[]>(this.loadOrSeed());
  private nextId = this.computeNextId(this.tickets$.value);
  private nextHistoryId = this.computeNextHistoryId(this.tickets$.value);
  private nextCommentId = this.computeNextCommentId(this.tickets$.value);

  getAll(): Observable<Ticket[]> {
    return this.tickets$.asObservable();
  }

  getByGroup(groupId: string): Observable<Ticket[]> {
    return this.getAll().pipe(map((ts) => ts.filter((t) => t.groupId === groupId)));
  }

  create(
    input: {
      groupId: string;
      title: string;
      assignee: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      description?: string;
      dueDate?: string;
    },
    author: string
  ): Ticket {
    const now = toIso(new Date());
    const initialHistory: TicketHistory = {
      id: this.nextHistoryId++,
      author,
      action: 'creó el ticket',
      createdAt: now
    };

    const ticket: Ticket = {
      id: this.nextId++,
      groupId: input.groupId,
      title: input.title.trim(),
      description: input.description || undefined,
      status: input.status ?? 'pendiente',
      priority: input.priority ?? 'media',
      assignee: input.assignee.trim(),
      createdBy: author,
      createdAt: now,
      dueDate: input.dueDate || undefined,
      comments: [],
      history: [initialHistory]
    };

    const next = [ticket, ...this.tickets$.value];
    this.tickets$.next(next);
    this.persist(next);
    return ticket;
  }

  updateStatus(ticketId: number, status: TicketStatus, author: string): void {
    this.update(ticketId, { status }, author);
  }

  update(
    ticketId: number,
    partial: Partial<Omit<Ticket, 'id' | 'groupId' | 'createdBy' | 'comments' | 'history'>>,
    author: string
  ): void {
    const now = toIso(new Date());
    
    const oldTicket = this.tickets$.value.find(t => t.id === ticketId);
    if (!oldTicket) return;

    const actionText = buildUpdateAction(partial, oldTicket);
    
    if (actionText === 'actualizó el ticket sin cambios') return;

    const historyLog: TicketHistory = {
      id: this.nextHistoryId++,
      author,
      action: actionText,
      createdAt: now
    };

    const next = this.tickets$.value.map((t) => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        ...partial,
        history: [historyLog, ...t.history]
      };
    });

    this.tickets$.next(next);
    this.persist(next);
  }

  addComment(ticketId: number, text: string, author: string): void {
    const now = toIso(new Date());
    const comment: TicketComment = {
      id: this.nextCommentId++,
      author,
      text: text.trim(),
      createdAt: now
    };

    const next = this.tickets$.value.map((t) => {
      if (t.id !== ticketId) return t;
      return {
        ...t,
        comments: [comment, ...t.comments]
      };
    });

    this.tickets$.next(next);
    this.persist(next);
  }

  deleteById(ticketId: number): void {
    const next = this.tickets$.value.filter((t) => t.id !== ticketId);
    this.tickets$.next(next);
    this.persist(next);
  }

  private loadOrSeed(): Ticket[] {
    const parsed = safeParseTickets(localStorage.getItem(STORAGE_KEY));
    if (parsed && parsed.length) return parsed;

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
    const daysFromNow = (n: number) => new Date(now.getTime() + n * 86_400_000);

    const createSeedHistory = (author: string, date: Date): TicketHistory[] => [
      { id: Math.floor(Math.random() * 100000), author, action: 'creó el ticket', createdAt: toIso(date) }
    ];

    const seed: Ticket[] = [
      /* ── dev ─────────────────────────────────────────── */
      {
        id: 1, groupId: '1',
        title: 'Login: error de validación con campos vacíos',
        description: 'El formulario acepta el submit sin validar usuario y contraseña cuando se borra el texto.',
        status: 'pendiente', priority: 'alta', assignee: 'superadmin', createdBy: 'cinthya',
        createdAt: toIso(daysAgo(1)), dueDate: toIso(daysFromNow(3)),
        comments: [
          { id: 101, author: 'cinthya', text: 'Por favor revisar urgente, afecta producción.', createdAt: toIso(daysAgo(1)) }
        ],
        history: createSeedHistory('cinthya', daysAgo(1))
      },
      {
        id: 2, groupId: '1',
        title: 'Dashboard: implementar métricas iniciales',
        description: 'Agregar KPI cards con contadores y barra de progreso por estado.',
        status: 'en_progreso', priority: 'media', assignee: 'ids15', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(2)), dueDate: toIso(daysFromNow(5)),
        comments: [],
        history: [
          { id: 202, author: 'ids15', action: 'actualizó: estado', createdAt: toIso(daysAgo(1)) },
          ...createSeedHistory('superadmin', daysAgo(2))
        ]
      },
      {
        id: 3, groupId: '1',
        title: 'Tabla: agregar paginación en lista de grupos',
        description: 'La tabla de grupos no tiene paginación y carga todos los registros.',
        status: 'revision', priority: 'baja', assignee: 'superadmin', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(5)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(5))
      },
      {
        id: 4, groupId: '1',
        title: 'CI: pipeline bloqueado por dependencia deprecada',
        description: 'node-sass falla en Node 20, migrar a sass nativo.',
        status: 'bloqueado', priority: 'alta', assignee: 'ids15', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(3)), dueDate: toIso(daysAgo(1)),
        comments: [
          { id: 102, author: 'ids15', text: 'Estoy investigando alternativas compatibles.', createdAt: toIso(daysAgo(2)) }
        ],
        history: [
          { id: 203, author: 'ids15', action: 'actualizó: estado', createdAt: toIso(daysAgo(2)) },
          ...createSeedHistory('superadmin', daysAgo(3))
        ]
      },

      /* ── support ─────────────────────────────────────── */
      {
        id: 5, groupId: '2',
        title: 'Ticket duplicado al recargar la página',
        description: 'El formulario crea un ticket doble si el usuario recarga tras enviar.',
        status: 'pendiente', priority: 'alta', assignee: 'superadmin', createdBy: 'cinthya',
        createdAt: toIso(daysAgo(1)), dueDate: toIso(daysFromNow(2)),
        comments: [], history: createSeedHistory('cinthya', daysAgo(1))
      },
      {
        id: 6, groupId: '2',
        title: 'Feature: exportar reporte a CSV',
        description: 'El botón de exportar CSV debe incluir filtros activos.',
        status: 'en_progreso', priority: 'media', assignee: 'cinthya', createdBy: 'ids15',
        createdAt: toIso(daysAgo(4)), dueDate: toIso(daysFromNow(7)),
        comments: [], history: createSeedHistory('ids15', daysAgo(4))
      },
      {
        id: 7, groupId: '2',
        title: 'SLA: crear cola de prioridad para tickets críticos',
        status: 'revision', priority: 'alta', assignee: 'superadmin', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(6)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(6))
      },
      {
        id: 10, groupId: '2',
        title: 'Error 500 al intentar recuperar contraseña',
        description: 'Varios usuarios reportan que el enlace de recuperación está roto.',
        status: 'pendiente', priority: 'alta', assignee: 'ids15', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(1)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(1))
      },

      /* ── ux ──────────────────────────────────────────── */
      {
        id: 8, groupId: '3',
        title: 'Ajustar tema oscuro en el dashboard',
        description: 'Los colores de las KPI cards no cumplen con el contraste WCAG AA en modo oscuro.',
        status: 'pendiente', priority: 'media', assignee: 'cinthya', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(2)), dueDate: toIso(daysFromNow(4)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(2))
      },
      {
        id: 11, groupId: '3',
        title: 'Rediseñar modal de confirmación',
        description: 'El modal actual es confuso, los botones de acción deben ser más claros.',
        status: 'en_progreso', priority: 'media', assignee: 'cinthya', createdBy: 'ids15',
        createdAt: toIso(daysAgo(3)),
        comments: [], history: createSeedHistory('ids15', daysAgo(3))
      },
      {
        id: 12, groupId: '3',
        title: 'Actualizar iconos de la barra lateral',
        description: 'Usar la nueva familia de iconos de PrimeIcons v7.',
        status: 'hecho', priority: 'baja', assignee: 'cinthya', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(10)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(10))
      },
      {
        id: 13, groupId: '3',
        title: 'Crear guía de estilos para botones',
        description: 'Documentar los estados hover, active y disabled.',
        status: 'revision', priority: 'media', assignee: 'cinthya', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(5)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(5))
      },

      /* ── Ventas Corporativas ──────────────────────────── */
      {
        id: 14, groupId: '4',
        title: 'Preparar presentación para Cliente X',
        description: 'Armar deck con los nuevos features del Q3.',
        status: 'en_progreso', priority: 'alta', assignee: 'superadmin', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(2)), dueDate: toIso(daysFromNow(1)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(2))
      },
      {
        id: 15, groupId: '4',
        title: 'Revisar contratos pendientes de firma',
        description: 'Hacer seguimiento a los 3 contratos enviados la semana pasada.',
        status: 'pendiente', priority: 'media', assignee: 'ids15', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(1)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(1))
      },
      {
        id: 16, groupId: '4',
        title: 'Actualizar pipeline en CRM',
        description: 'Mover los leads que pasaron a etapa de negociación.',
        status: 'revision', priority: 'baja', assignee: 'ids15', createdBy: 'ids15',
        createdAt: toIso(daysAgo(4)),
        comments: [], history: createSeedHistory('ids15', daysAgo(4))
      },
      {
        id: 17, groupId: '4',
        title: 'Cerrar reporte de comisiones mensual',
        description: 'Validar las ventas cerradas en el mes anterior.',
        status: 'hecho', priority: 'alta', assignee: 'superadmin', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(15)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(15))
      },

      /* ── Marketing Digital ──────────────────────────── */
      {
        id: 18, groupId: '5',
        title: 'Lanzar campaña de email de retención',
        description: 'Enviar correo a usuarios inactivos por más de 30 días.',
        status: 'pendiente', priority: 'media', assignee: 'ids15', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(1)), dueDate: toIso(daysFromNow(3)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(1))
      },
      {
        id: 19, groupId: '5',
        title: 'Diseñar banners para redes sociales',
        description: 'Banners para la promoción de verano.',
        status: 'en_progreso', priority: 'alta', assignee: 'ids15', createdBy: 'ids15',
        createdAt: toIso(daysAgo(2)),
        comments: [], history: createSeedHistory('ids15', daysAgo(2))
      },
      {
        id: 20, groupId: '5',
        title: 'Analizar métricas de la campaña anterior',
        description: 'Revisar CTR y conversión de la campaña de primavera.',
        status: 'revision', priority: 'media', assignee: 'superadmin', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(5)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(5))
      },
      {
        id: 21, groupId: '5',
        title: 'Redactar post para el blog',
        description: 'Tema: 5 ventajas de usar Kanban en tu equipo.',
        status: 'hecho', priority: 'baja', assignee: 'ids15', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(12)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(12))
      },

      /* ── Product Management ──────────────────────────── */
      {
        id: 22, groupId: '6',
        title: 'Definir roadmap del Q4',
        description: 'Reunión con stakeholders para priorizar features.',
        status: 'en_progreso', priority: 'alta', assignee: 'cinthya', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(3)), dueDate: toIso(daysFromNow(5)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(3))
      },
      {
        id: 23, groupId: '6',
        title: 'Escribir PRD para nuevo módulo de reportes',
        description: 'Detallar requerimientos funcionales y no funcionales.',
        status: 'pendiente', priority: 'media', assignee: 'cinthya', createdBy: 'cinthya',
        createdAt: toIso(daysAgo(1)),
        comments: [], history: createSeedHistory('cinthya', daysAgo(1))
      },
      {
        id: 24, groupId: '6',
        title: 'Entrevistas con usuarios beta',
        description: 'Agendar 5 entrevistas para feedback del nuevo dashboard.',
        status: 'revision', priority: 'alta', assignee: 'superadmin', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(4)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(4))
      },
      {
        id: 25, groupId: '6',
        title: 'Analizar competidores directos',
        description: 'Matriz comparativa de features y precios.',
        status: 'hecho', priority: 'media', assignee: 'cinthya', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(20)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(20))
      },

      /* ── Quality Assurance ──────────────────────────── */
      {
        id: 26, groupId: '7',
        title: 'Automatizar pruebas de login',
        description: 'Crear scripts en Cypress para los flujos de autenticación.',
        status: 'en_progreso', priority: 'alta', assignee: 'cinthya', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(2)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(2))
      },
      {
        id: 27, groupId: '7',
        title: 'Regresión completa antes del release v2.0',
        description: 'Ejecutar plan de pruebas manuales en entorno de staging.',
        status: 'pendiente', priority: 'alta', assignee: 'cinthya', createdBy: 'cinthya',
        createdAt: toIso(daysAgo(1)), dueDate: toIso(daysFromNow(2)),
        comments: [], history: createSeedHistory('cinthya', daysAgo(1))
      },
      {
        id: 28, groupId: '7',
        title: 'Verificar bugs reportados en producción',
        description: 'Validar los 3 bugs críticos reportados ayer por soporte.',
        status: 'revision', priority: 'alta', assignee: 'superadmin', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(3)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(3))
      },
      {
        id: 29, groupId: '7',
        title: 'Actualizar documentación de casos de prueba',
        description: 'Añadir los nuevos casos del módulo de facturación.',
        status: 'hecho', priority: 'baja', assignee: 'cinthya', createdBy: 'superadmin',
        createdAt: toIso(daysAgo(8)),
        comments: [], history: createSeedHistory('superadmin', daysAgo(8))
      }
    ];

    this.persist(seed);
    return seed;
  }

  private computeNextId(tickets: Ticket[]): number {
    return tickets.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  }

  private computeNextHistoryId(tickets: Ticket[]): number {
    let max = 0;
    tickets.forEach(t => t.history.forEach(h => { if (h.id > max) max = h.id; }));
    return max + 1;
  }

  private computeNextCommentId(tickets: Ticket[]): number {
    let max = 0;
    tickets.forEach(t => t.comments.forEach(c => { if (c.id > max) max = c.id; }));
    return max + 1;
  }

  private persist(tickets: Ticket[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }
}
