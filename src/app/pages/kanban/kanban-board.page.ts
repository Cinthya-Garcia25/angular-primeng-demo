import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Ticket, TicketPriority, TicketStatus } from '../../models/ticket.model';
import { TicketsMockService } from '../../services/tickets-mock.service';
import { PermissionsService } from '../../services/permissions.service';
import { Permission } from '../../models/permissions.model';

type KanbanColumn = { status: TicketStatus; label: string };

const STATUS_ACCENT: Record<TicketStatus, string> = {
  pendiente:   '#3b82f6',
  en_progreso: '#f59e0b',
  revision:    '#8b5cf6',
  hecho:       '#22c55e',
  bloqueado:   '#ef4444'
};

const STATUS_ICON: Record<TicketStatus, string> = {
  pendiente:   'pi pi-clock',
  en_progreso: 'pi pi-sync',
  revision:    'pi pi-eye',
  hecho:       'pi pi-check-circle',
  bloqueado:   'pi pi-ban'
};

@Component({
  selector: 'app-kanban-board-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TagModule,
    TextareaModule,
    TooltipModule
  ],
  templateUrl: './kanban-board.page.html',
  styleUrl: './kanban-board.page.css'
})
export class KanbanBoardPageComponent implements OnInit, OnDestroy {
  private readonly router       = inject(Router);
  private readonly route        = inject(ActivatedRoute);
  private readonly ticketsMock  = inject(TicketsMockService);
  private readonly perms        = inject(PermissionsService);
  private readonly fb           = inject(FormBuilder);
  private readonly sub          = new Subscription();

  readonly selectedGroupId   = sessionStorage.getItem('selectedGroupId')   || '';
  readonly selectedGroupName = sessionStorage.getItem('selectedGroupName') || '';
  readonly currentUser       = (sessionStorage.getItem('authUser') || '').trim();

  tickets: Ticket[] = [];

  searchQuery    = '';
  filterPriority: TicketPriority | '' = '';
  filterAssignee = '';

  readonly columns: KanbanColumn[] = [
    { status: 'pendiente',   label: 'Pendiente'   },
    { status: 'en_progreso', label: 'En progreso' },
    { status: 'revision',    label: 'Revisión'    },
    { status: 'hecho',       label: 'Hecho'       }
  ];

  readonly allStatusOptions = [
    { label: 'Pendiente',   value: 'pendiente'   },
    { label: 'En progreso', value: 'en_progreso' },
    { label: 'Revisión',    value: 'revision'    },
    { label: 'Hecho',       value: 'hecho'       },
    { label: 'Bloqueado',   value: 'bloqueado'   }
  ];

  readonly priorityOptions = [
    { label: 'Alta',  value: 'alta'  },
    { label: 'Media', value: 'media' },
    { label: 'Baja',  value: 'baja'  }
  ];

  readonly priorityFilterOptions = [
    { label: 'Todas las prioridades', value: '' },
    ...this.priorityOptions
  ];

  draggedTicketId:  number       | null = null;
  dropTargetStatus: TicketStatus | null = null;

  detailDialogVisible = false;
  selectedTicket:  Ticket | null = null;
  dialogMode: 'view' | 'edit'   = 'view';
  confirmingDelete = false;

  activeTab: 'comments' | 'history' = 'comments';
  newCommentText = '';

  createDialogVisible = false;

  readonly editForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status:      ['pendiente' as TicketStatus,  [Validators.required]],
    priority:    ['media'     as TicketPriority, [Validators.required]],
    assignee:    ['', [Validators.required, Validators.minLength(2)]],
    createdAt:   ['', [Validators.required]],
    dueDate:     ['']
  });

  readonly createForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status:      ['pendiente' as TicketStatus,  [Validators.required]],
    priority:    ['media'     as TicketPriority, [Validators.required]],
    assignee:    [this.currentUser],
    dueDate:     ['']
  });

  get canViewAllTickets(): boolean {
    return this.perms.hasPermission(Permission.TICKET_EDIT) || this.perms.hasPermission(Permission.USERS_VIEW);
  }

  get canCreateTicket(): boolean {
    return this.perms.hasPermission(Permission.TICKET_ADD);
  }

  ngOnInit(): void {
    if (!this.selectedGroupId) {
      this.router.navigate(['/pages/auth/group-selection']);
      return;
    }

    this.sub.add(
      this.ticketsMock
        .getByGroup(this.selectedGroupId)
        .subscribe((ts) => {
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

          const ticketId = this.route.snapshot.queryParamMap.get('ticketId');
          if (ticketId && this.tickets.length > 0 && !this.detailDialogVisible) {
            const ticket = this.tickets.find(t => t.id === Number(ticketId));
            if (ticket) {
              setTimeout(() => {
                this.openDetailDialog(ticket);
                this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: { ticketId: null },
                  queryParamsHandling: 'merge',
                  replaceUrl: true
                });
              });
            }
          }
        })
    );
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get filteredTickets(): Ticket[] {
    let result = this.tickets;
    const q = this.searchQuery.trim().toLowerCase();

    if (q) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
      );
    }
    if (this.filterPriority) {
      result = result.filter((t) => t.priority === this.filterPriority);
    }
    if (this.filterAssignee) {
      if (this.filterAssignee === 'unassigned_placeholder') {
        result = result.filter((t) => !t.assignee || t.assignee.trim() === '');
      } else {
        result = result.filter((t) => t.assignee === this.filterAssignee);
      }
    }
    return result;
  }

  filteredByStatus(status: TicketStatus): Ticket[] {
    return this.filteredTickets.filter((t) => t.status === status);
  }

  get assigneeOptions(): { label: string; value: string }[] {
    const unique = [...new Set(this.tickets.map((t) => t.assignee))].sort();
    return [
      { label: 'Todos los asignados', value: '' },
      ...unique.map((a) => ({ label: a, value: a }))
    ];
  }

  get totalTickets(): number { return this.tickets.length; }
  get userInitial(): string  { return this.currentUser.charAt(0).toUpperCase() || '?'; }
  get hasFilters(): boolean  { return !!(this.searchQuery || this.filterPriority || this.filterAssignee); }

  clearFilters(): void {
    this.searchQuery    = '';
    this.filterPriority = '';
    this.filterAssignee = '';
  }

  applyQuickFilter(filter: 'mine' | 'unassigned' | 'high_priority'): void {
    this.clearFilters();
    if (filter === 'mine') {
      this.filterAssignee = this.currentUser;
    } else if (filter === 'unassigned') {
      this.filterAssignee = 'unassigned_placeholder';
    } else if (filter === 'high_priority') {
      this.filterPriority = 'alta';
    }
  }

  get isCreator(): boolean {
    return this.selectedTicket?.createdBy === this.currentUser;
  }

  get isAssignee(): boolean {
    return this.selectedTicket?.assignee === this.currentUser;
  }

  get canEditAll(): boolean {
    return this.isCreator || this.perms.hasPermission(Permission.TICKET_EDIT);
  }

  get canEditStatus(): boolean {
    return this.canEditAll || (this.isAssignee && this.perms.hasPermission(Permission.TICKET_EDIT_STATE));
  }

  get canComment(): boolean {
    return this.isCreator || this.isAssignee || this.perms.hasPermission(Permission.TICKET_EDIT);
  }

  canDelete(): boolean { return this.perms.hasPermission(Permission.TICKET_DELETE); }
  canAdd():    boolean { return this.perms.hasPermission(Permission.TICKET_ADD); }

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

  openDetailDialog(ticket: Ticket): void {
    this.selectedTicket  = ticket;
    this.dialogMode      = 'view';
    this.activeTab       = 'comments';
    this.newCommentText  = '';
    this.confirmingDelete = false;
    this.detailDialogVisible = true;
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

  closeDetailDialog(): void {
    this.detailDialogVisible = false;
    this.selectedTicket      = null;
    this.dialogMode          = 'view';
    this.confirmingDelete    = false;
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  openCreateDialog(): void {
    this.createForm.reset({
      title: '', description: '', status: 'pendiente',
      priority: 'media', assignee: this.currentUser, dueDate: ''
    });
    if (!this.canViewAllTickets) {
      this.createForm.controls.assignee.disable();
    } else {
      this.createForm.controls.assignee.enable();
    }
    this.createDialogVisible = true;
  }

  saveCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }

    const v   = this.createForm.getRawValue();
    const due = v.dueDate ? new Date(v.dueDate + 'T12:00:00').toISOString() : undefined;
    const assignee = this.canViewAllTickets ? (v.assignee || this.currentUser).trim() : this.currentUser;

    const newTicket = this.ticketsMock.create({
      groupId:     this.selectedGroupId,
      title:       (v.title       || '').trim(),
      description: (v.description || '').trim() || undefined,
      status:      (v.status      || 'pendiente') as TicketStatus,
      priority:    (v.priority    || 'media')     as TicketPriority,
      assignee:    assignee,
      dueDate:     due
    }, this.currentUser);

    this.closeCreateDialog();
    
    // Open the detail dialog for the newly created ticket
    this.openDetailDialog(newTicket);
  }

  closeCreateDialog(): void {
    this.createDialogVisible = false;
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
  }

  statusAccent(status: TicketStatus): string   { return STATUS_ACCENT[status] ?? '#4f46e5'; }
  statusIcon(status: TicketStatus): string      { return STATUS_ICON[status]   ?? 'pi pi-tag'; }

  statusLabel(status: TicketStatus): string {
    return this.allStatusOptions.find((o) => o.value === status)?.label ?? status;
  }

  statusSeverity(status: TicketStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (status === 'hecho')       return 'success';
    if (status === 'pendiente')   return 'info';
    if (status === 'en_progreso') return 'warn';
    if (status === 'revision')    return 'secondary';
    return 'danger';
  }

  priorityLabel(priority: TicketPriority): string {
    return { alta: 'Alta', media: 'Media', baja: 'Baja' }[priority] ?? priority;
  }

  prioritySeverity(priority: TicketPriority): 'danger' | 'warn' | 'success' {
    if (priority === 'alta') return 'danger';
    if (priority === 'baja') return 'success';
    return 'warn';
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

  isOverdue(dueDate: string | undefined): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }

  assigneeInitial(assignee: string): string {
    return assignee.charAt(0).toUpperCase() || '?';
  }

  formControlError(
    form: 'edit' | 'create',
    name: 'title' | 'description' | 'status' | 'priority' | 'assignee' | 'createdAt' | 'dueDate'
  ): boolean {
    const ctrl = form === 'edit'
      ? this.editForm.get(name)
      : this.createForm.get(name);
    return ctrl?.invalid && (ctrl.dirty || ctrl.touched) || false;
  }
}
