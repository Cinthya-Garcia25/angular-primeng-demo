import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TableModule } from 'primeng/table';
import { AvatarModule } from 'primeng/avatar';
import { Ticket, TicketStatus, TicketPriority } from '../../models/ticket.model';
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
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TooltipModule,
    ToggleSwitchModule,
    TableModule,
    AvatarModule
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
  readonly allStatusOptions = this.statusOptions;

  createDialogVisible = false;
  isKanbanView = true;

  // Detail Dialog properties
  detailDialogVisible = false;
  selectedTicket: Ticket | null = null;
  dialogMode: 'view' | 'edit' = 'view';
  confirmingDelete = false;
  activeTab: 'comments' | 'history' = 'comments';
  newCommentText = '';

  readonly editForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status:      ['pendiente' as TicketStatus,  [Validators.required]],
    priority:    ['media'     as TicketPriority, [Validators.required]],
    assignee:    ['', [Validators.required, Validators.minLength(2)]],
    createdAt:   ['', [Validators.required]],
    dueDate:     ['']
  });

  readonly priorityOptions = [
    { label: 'Alta', value: 'alta' },
    { label: 'Media', value: 'media' },
    { label: 'Baja', value: 'baja' }
  ];

  readonly createForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status:      ['pendiente' as TicketStatus, [Validators.required]],
    priority:    ['media', [Validators.required]],
    assignee:    [this.currentUser || '']
  });

  get canViewTickets(): boolean {
    // Permiso base para poder ver tickets (propios o de su grupo)
    return this.perms.hasPermission(Permission.TICKET_VIEW);
  }

  get canViewAllTickets(): boolean {
    // Permiso extra para ver todos los tickets del grupo (no solo los propios)
    return this.perms.hasPermission(Permission.TICKETS_VIEW) || this.perms.hasPermission(Permission.USERS_VIEW);
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

    // Si el usuario no tiene permiso para ver tickets, no cargamos ninguno.
    if (!this.canViewTickets) {
      this.tickets = [];
      return;
    }

    this.sub.add(
      this.ticketsMock.getByGroup(this.selectedGroupId).subscribe((ts) => {
        let visibleTickets = ts;
        if (!this.canViewAllTickets) {
          visibleTickets = ts.filter(t => t.assignee === this.currentUser);
        }
        this.tickets = [...visibleTickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        if (this.selectedTicket) {
          const updated = this.tickets.find(t => t.id === this.selectedTicket?.id);
          if (updated) {
            this.selectedTicket = updated;
          } else {
            this.closeDetailDialog();
          }
        }
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

  priorityLabel(priority: string): string {
    const map: Record<string, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };
    return map[priority] || priority;
  }

  prioritySeverity(priority: string): 'danger' | 'warn' | 'success' | 'info' {
    if (priority === 'alta') return 'danger';
    if (priority === 'media') return 'warn';
    if (priority === 'baja') return 'success';
    return 'info';
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

  priorityAccent(priority: TicketPriority): string {
    if (priority === 'alta') return '#ef4444';
    if (priority === 'baja') return '#22c55e';
    return '#f59e0b';
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX');
  }

  formatDateTime(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  isOverdue(iso: string | undefined): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    d.setHours(23, 59, 59, 999);
    return d.getTime() < Date.now();
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
    
    // Open the detail dialog for the newly created ticket
    this.openDetailDialog(newTicket);
  }

  get isCreator(): boolean {
    return this.selectedTicket?.createdBy === this.currentUser;
  }

  get isAssignee(): boolean {
    return this.selectedTicket?.assignee === this.currentUser;
  }

  get canEditAll(): boolean {
    return this.perms.hasPermission(Permission.TICKET_EDIT);
  }

  get canEditStatus(): boolean {
    return this.canEditAll || (this.isAssignee && this.perms.hasPermission(Permission.TICKET_EDIT_STATE));
  }

  get canComment(): boolean {
    return this.perms.hasPermission(Permission.TICKET_EDIT) || this.isAssignee || this.isCreator;
  }

  canDelete(): boolean { return this.perms.hasPermission(Permission.TICKET_DELETE); }

  formControlError(formType: 'create' | 'edit', controlName: string): boolean {
    const form = formType === 'create' ? this.createForm : this.editForm;
    const control = form.controls[controlName as keyof typeof form.controls];
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  openKanbanDetail(ticketId: number): void {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      this.openDetailDialog(ticket);
    }
  }

  openDetailDialog(ticket: Ticket): void {
    this.selectedTicket  = ticket;
    this.dialogMode      = 'view';
    this.activeTab       = 'comments';
    this.newCommentText  = '';
    this.confirmingDelete = false;
    this.detailDialogVisible = true;
  }

  closeDetailDialog(): void {
    this.detailDialogVisible = false;
    this.selectedTicket      = null;
    this.dialogMode          = 'view';
    this.confirmingDelete    = false;
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  switchToEditMode(): void {
    if (!this.selectedTicket) return;
    const t = this.selectedTicket;
    this.editForm.reset({
      title:       t.title,
      description: t.description || '',
      status:      t.status,
      priority:    t.priority,
      assignee:    t.assignee,
      createdAt:   t.createdAt ? t.createdAt.substring(0, 10) : '',
      dueDate:     t.dueDate ? t.dueDate.substring(0, 10) : ''
    });
    if (!this.canViewAllTickets) {
      this.editForm.controls.assignee.disable();
    } else {
      this.editForm.controls.assignee.enable();
    }
    this.dialogMode = 'edit';
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.selectedTicket) {
      this.editForm.markAllAsTouched();
      return;
    }

    const v    = this.editForm.getRawValue();
    const created = v.createdAt ? new Date(v.createdAt + 'T12:00:00').toISOString() : this.selectedTicket.createdAt;
    const due  = v.dueDate ? new Date(v.dueDate + 'T12:00:00').toISOString() : undefined;
    const assignee = this.canViewAllTickets ? (v.assignee || '').trim() : this.selectedTicket.assignee;

    this.ticketsMock.update(this.selectedTicket.id, {
      title:       (v.title       || '').trim(),
      description: (v.description || '').trim() || undefined,
      status:      (v.status      || 'pendiente') as TicketStatus,
      priority:    (v.priority    || 'media')     as TicketPriority,
      assignee:    assignee,
      createdAt:   created,
      dueDate:     due
    }, this.currentUser);

    this.dialogMode = 'view';
  }

  onInlineStatusChange(newStatus: TicketStatus): void {
    if (!this.selectedTicket) return;
    this.ticketsMock.updateStatus(this.selectedTicket.id, newStatus, this.currentUser);
  }

  postComment(): void {
    if (!this.selectedTicket || !this.newCommentText.trim()) return;
    this.ticketsMock.addComment(this.selectedTicket.id, this.newCommentText, this.currentUser);
    this.newCommentText = '';
  }

  deleteTicket(): void {
    if (!this.selectedTicket) return;
    this.ticketsMock.deleteById(this.selectedTicket.id);
    this.closeDetailDialog();
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
