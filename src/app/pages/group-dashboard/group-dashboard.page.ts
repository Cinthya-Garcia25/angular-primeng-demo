import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Ticket, TicketStatus } from '../../models/ticket.model';
import { TicketsMockService } from '../../services/tickets-mock.service';

import { PermissionsService } from '../../services/permissions.service';
import { Permission } from '../../models/permissions.model';

type KanbanColumn = { status: TicketStatus; label: string };

/** Acento hexadecimal por estado */
const STATUS_ACCENT: Record<TicketStatus, string> = {
  pendiente:   '#3b82f6',
  en_progreso: '#f59e0b',
  revision:    '#8b5cf6',
  hecho:       '#22c55e',
  bloqueado:   '#ef4444'
};

/** Ícono PrimeIcons por estado */
const STATUS_ICON: Record<TicketStatus, string> = {
  pendiente:   'pi pi-clock',
  en_progreso: 'pi pi-sync',
  revision:    'pi pi-eye',
  hecho:       'pi pi-check-circle',
  bloqueado:   'pi pi-ban'
};

@Component({
  selector: 'app-group-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TooltipModule
  ],
  templateUrl: './group-dashboard.page.html',
  styleUrl: './group-dashboard.page.css'
})
export class GroupDashboardPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly ticketsMock = inject(TicketsMockService);
  private readonly fb = inject(FormBuilder);
  private readonly perms = inject(PermissionsService);
  private readonly sub = new Subscription();

  readonly selectedGroupId = sessionStorage.getItem('selectedGroupId') || '';
  readonly selectedGroupName = sessionStorage.getItem('selectedGroupName') || '';
  readonly currentUser = (sessionStorage.getItem('authUser') || '').trim();

  tickets: Ticket[] = [];

  readonly columns: KanbanColumn[] = [
    { status: 'pendiente',  label: 'Pendiente'   },
    { status: 'en_progreso', label: 'En progreso' },
    { status: 'hecho',      label: 'Hecho'        },
    { status: 'bloqueado',  label: 'Bloqueado'    }
  ];

  readonly statusOptions = this.columns.map((c) => ({ label: c.label, value: c.status }));

  createDialogVisible = false;

  readonly createForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status:      ['pendiente' as TicketStatus, [Validators.required]],
    priority:    ['media', [Validators.required]],
    assignee:    [this.currentUser || '']
  });

  get canViewAllTickets(): boolean {
    return this.perms.hasPermission(Permission.TICKET_EDIT) || this.perms.hasPermission(Permission.USERS_VIEW);
  }

  get canCreateTicket(): boolean {
    return this.perms.hasPermission(Permission.TICKET_ADD);
  }

  /* ── Ciclo de vida ── */

  ngOnInit(): void {
    if (!this.selectedGroupId) {
      this.router.navigate(['/pages/auth/group-selection']);
      return;
    }

    this.sub.add(
      this.ticketsMock.getByGroup(this.selectedGroupId).subscribe((ts) => {
        let visibleTickets = ts;
        if (!this.canViewAllTickets) {
          visibleTickets = ts.filter(t => t.assignee === this.currentUser);
        }
        this.tickets = [...visibleTickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  /* ── Helpers de estado ── */

  statusAccent(status: TicketStatus): string {
    return STATUS_ACCENT[status];
  }

  statusIcon(status: TicketStatus): string {
    return STATUS_ICON[status];
  }

  statusLabel(status: TicketStatus): string {
    return this.columns.find((c) => c.status === status)?.label ?? status;
  }

  statusSeverity(status: TicketStatus): 'success' | 'info' | 'warn' | 'danger' {
    if (status === 'hecho')      return 'success';
    if (status === 'pendiente')  return 'info';
    if (status === 'en_progreso') return 'warn';
    return 'danger';
  }

  /* ── Datos ── */

  countByStatus(status: TicketStatus): number {
    return this.tickets.filter((t) => t.status === status).length;
  }

  ticketsByStatus(status: TicketStatus): Ticket[] {
    return this.tickets.filter((t) => t.status === status);
  }

  get totalTickets(): number {
    return this.tickets.length;
  }

  get myTickets(): Ticket[] {
    const me = this.currentUser.toLowerCase();
    if (!me) return [];
    return this.tickets
      .filter((t) => t.assignee.toLowerCase().includes(me))
      .slice(0, 5);
  }

  get recentTickets(): Ticket[] {
    return this.tickets.slice(0, 5);
  }

  /* ── Helpers de UI ── */

  get userInitial(): string {
    return this.currentUser.charAt(0).toUpperCase() || '?';
  }

  assigneeInitial(assignee: string): string {
    return assignee.charAt(0).toUpperCase() || '?';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-MX');
  }

  nextStatusFor(status: TicketStatus): TicketStatus {
    return this.nextStatus(status);
  }

  draggedTicketId:  number       | null = null;
  dropTargetStatus: TicketStatus | null = null;

  onDragStart(event: DragEvent, ticket: Ticket): void {
    this.draggedTicketId = ticket.id;
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(ticket.id));
  }

  onDragOver(event: DragEvent, status: TicketStatus): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dropTargetStatus = status;
  }

  onDragLeave(event: DragEvent, status: TicketStatus): void {
    const related = event.relatedTarget as HTMLElement | null;
    const target  = event.currentTarget as HTMLElement;
    if (related && target.contains(related)) return;
    if (this.dropTargetStatus === status) this.dropTargetStatus = null;
  }

  onDrop(event: DragEvent, targetStatus: TicketStatus): void {
    event.preventDefault();
    if (this.draggedTicketId !== null) {
      this.ticketsMock.updateStatus(this.draggedTicketId, targetStatus, this.currentUser);
    }
    this.draggedTicketId  = null;
    this.dropTargetStatus = null;
  }

  onDragEnd(): void {
    this.draggedTicketId  = null;
    this.dropTargetStatus = null;
  }

  /* ── Acciones ── */

  openCreateDialog(): void {
    this.createForm.reset({
      title:    '',
      assignee: this.currentUser || '',
      status:   'pendiente',
      priority: 'media'
    });
    if (!this.canViewAllTickets) {
      this.createForm.controls.assignee.disable();
    } else {
      this.createForm.controls.assignee.enable();
    }
    this.createDialogVisible = true;
  }

  closeCreateDialog(): void {
    this.createDialogVisible = false;
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
  }

  saveCreatedTicket(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const v = this.createForm.getRawValue();
    const assignee = this.canViewAllTickets ? (v.assignee || this.currentUser).trim() : this.currentUser;
    
    const newTicket = this.ticketsMock.create({
      groupId:     this.selectedGroupId,
      title:       (v.title       || '').trim(),
      description: (v.description || '').trim() || undefined,
      status:      (v.status      || 'pendiente') as TicketStatus,
      priority:    (v.priority    || 'media') as any,
      assignee:    assignee
    }, this.currentUser);

    this.closeCreateDialog();
    
    this.router.navigate(['/pages/kanban'], { queryParams: { ticketId: newTicket.id } });
  }

  moveForward(ticket: Ticket): void {
    this.ticketsMock.updateStatus(ticket.id, this.nextStatus(ticket.status), this.currentUser);
  }

  private nextStatus(status: TicketStatus): TicketStatus {
    if (status === 'pendiente')   return 'en_progreso';
    if (status === 'en_progreso') return 'hecho';
    if (status === 'hecho')       return 'pendiente';
    return 'pendiente';
  }
}
