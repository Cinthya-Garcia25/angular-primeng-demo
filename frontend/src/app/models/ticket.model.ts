export type TicketPriority = 'alta' | 'media' | 'baja';

export type TicketStatus =
  | 'pendiente'
  | 'en_progreso'
  | 'revision'
  | 'hecho'
  | 'bloqueado';

export interface TicketComment {
  id: number;
  author: string;
  text: string;
  createdAt: string;
}

export interface TicketHistory {
  id: number;
  author: string;
  action: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  groupId: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee: string;
  createdBy: string;
  createdAt: string;
  dueDate?: string;
  tags: string[];
  comments: TicketComment[];
  history: TicketHistory[];
}
