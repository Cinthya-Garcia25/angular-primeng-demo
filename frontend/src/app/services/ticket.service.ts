// Alias canónico de tickets.service.ts (nombre singular según nueva estructura)
export { TicketsService as TicketService } from './tickets.service';
// Re-exportar interfaces
export type { Ticket, CreateTicketPayload, UpdateTicketPayload } from './tickets.service';
