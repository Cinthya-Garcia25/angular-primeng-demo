// Migrado desde pages/tickets/tickets.page.ts
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { PermissionsService } from '../../services/permissions.service';
import { Permission } from '../../models/permissions.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { TicketsMockService } from '../../services/tickets-mock.service';
import { Ticket, TicketStatus, TicketPriority } from '../../models/ticket.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-group-tickets',
  imports: [
    FormsModule, ReactiveFormsModule,
    CardModule, ButtonModule, InputTextModule, TextareaModule,
    TableModule, DialogModule, TagModule, SelectModule, TooltipModule,
    IconFieldModule, InputIconModule,
    HasPermissionDirective
  ],
  templateUrl: './group-tickets.component.html',
  styleUrl: './group-tickets.component.css'
})
export class GroupTicketsComponent implements OnInit, OnDestroy {
  private readonly fb                 = inject(FormBuilder);
  private readonly permissionsService = inject(PermissionsService);
  private readonly ticketsMock        = inject(TicketsMockService);
  private readonly sub                = new Subscription();

  readonly currentUser    = (sessionStorage.getItem('authUser') || '').trim();
  readonly currentGroupId = sessionStorage.getItem('selectedGroupId') || '1';

  readonly ticketForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    state:       ['pendiente' as TicketStatus, [Validators.required]],
    priority:    ['media' as TicketPriority,   [Validators.required]],
    assignee:    [this.currentUser]
  });

  tickets: Ticket[]              = [];
  searchValue                    = '';
  activeQuickFilter: 'all' | 'mine' | 'unassigned' | 'high_priority' = 'all';
  dialogVisible                  = false;
  deleteDialogVisible            = false;
  isEditing                      = false;
  ticketToDelete: Ticket | null  = null;
  private editingTicketId: number | null = null;

  readonly stateOptions    = [
    { label: 'Pendiente',   value: 'pendiente'   },
    { label: 'En Progreso', value: 'en_progreso'  },
    { label: 'Revisión',    value: 'revision'     },
    { label: 'Hecho',       value: 'hecho'        },
    { label: 'Bloqueado',   value: 'bloqueado'    }
  ];
  readonly priorityOptions = [
    { label: 'Alta',  value: 'alta'  },
    { label: 'Media', value: 'media' },
    { label: 'Baja',  value: 'baja'  }
  ];

  get canViewTickets()   { return this.permissionsService.hasPermission(Permission.TICKET_VIEW); }
  get canViewAllTickets(){ return this.permissionsService.hasPermission(Permission.TICKETS_VIEW) || this.permissionsService.hasPermission(Permission.USERS_VIEW); }

  ngOnInit(): void {
    if (!this.canViewTickets) { this.tickets = []; return; }
    this.sub.add(
      this.ticketsMock.getByGroup(this.currentGroupId).subscribe((tickets) => {
        let visible = tickets;
        if (!this.canViewAllTickets) visible = tickets.filter(t => t.assignee === this.currentUser);
        this.tickets = [...visible].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      })
    );
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get filteredTickets(): Ticket[] {
    let result = this.tickets;
    if (this.activeQuickFilter === 'mine')          result = result.filter(t => t.assignee === this.currentUser);
    else if (this.activeQuickFilter === 'unassigned') result = result.filter(t => !t.assignee?.trim());
    else if (this.activeQuickFilter === 'high_priority') result = result.filter(t => t.priority === 'alta');
    const q = this.searchValue.trim().toLowerCase();
    if (!q) return result;
    return result.filter(t => [t.title, t.description || '', t.status, t.priority, t.assignee].join(' ').toLowerCase().includes(q));
  }

  setQuickFilter(filter: 'all' | 'mine' | 'unassigned' | 'high_priority'): void { this.activeQuickFilter = filter; }

  controlHasError(name: 'title' | 'description' | 'state' | 'priority' | 'assignee'): boolean {
    const c = this.ticketForm.controls[name];
    return c.invalid && (c.dirty || c.touched);
  }

  openCreateDialog(): void {
    this.isEditing = false; this.editingTicketId = null;
    this.ticketForm.reset({ title: '', description: '', state: 'pendiente', priority: 'media', assignee: this.currentUser });
    this.canViewAllTickets ? this.ticketForm.controls.assignee.enable() : this.ticketForm.controls.assignee.disable();
    this.dialogVisible = true;
  }

  openEditDialog(ticket: Ticket): void {
    this.isEditing = true; this.editingTicketId = ticket.id;
    this.ticketForm.reset({ title: ticket.title, description: ticket.description || '', state: ticket.status, priority: ticket.priority, assignee: ticket.assignee });
    this.canViewAllTickets ? this.ticketForm.controls.assignee.enable() : this.ticketForm.controls.assignee.disable();
    this.dialogVisible = true;
  }

  saveTicket(): void {
    if (this.ticketForm.invalid) { this.ticketForm.markAllAsTouched(); return; }
    const v = this.ticketForm.getRawValue();
    const assignee = this.canViewAllTickets ? (v.assignee?.trim() || this.currentUser) : (this.isEditing ? (this.tickets.find(t => t.id === this.editingTicketId)?.assignee || this.currentUser) : this.currentUser);
    if (this.isEditing && this.editingTicketId !== null) {
      this.ticketsMock.update(this.editingTicketId, { title: v.title?.trim() || '', description: v.description?.trim() || undefined, status: (v.state || 'pendiente') as TicketStatus, priority: (v.priority || 'media') as TicketPriority, assignee }, this.currentUser);
    } else {
      this.ticketsMock.create({ groupId: this.currentGroupId, title: v.title?.trim() || '', description: v.description?.trim() || undefined, status: (v.state || 'pendiente') as TicketStatus, priority: (v.priority || 'media') as TicketPriority, assignee }, this.currentUser);
    }
    this.closeDialog();
  }

  changeState(ticket: Ticket, newState: TicketStatus): void { this.ticketsMock.updateStatus(ticket.id, newState, this.currentUser); }
  askDeleteTicket(ticket: Ticket): void { this.ticketToDelete = ticket; this.deleteDialogVisible = true; }
  confirmDeleteTicket(): void { if (this.ticketToDelete) this.ticketsMock.deleteById(this.ticketToDelete.id); this.closeDeleteDialog(); }
  closeDeleteDialog(): void { this.ticketToDelete = null; this.deleteDialogVisible = false; }
  closeDialog(): void { this.dialogVisible = false; this.ticketForm.markAsPristine(); this.ticketForm.markAsUntouched(); }
  statusLabel(s: string): string { return this.stateOptions.find(o => o.value === s)?.label || s; }
  priorityLabel(p: string): string { return this.priorityOptions.find(o => o.value === p)?.label || p; }
  stateSeverity(s: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (s === 'hecho') return 'success'; if (s === 'pendiente') return 'info'; if (s === 'en_progreso') return 'warn'; if (s === 'revision') return 'secondary'; return 'danger';
  }
  prioritySeverity(p: string): 'danger' | 'warn' | 'success' | 'info' {
    if (p === 'alta') return 'danger'; if (p === 'media') return 'warn'; if (p === 'baja') return 'success'; return 'info';
  }
  nextState(s: string): TicketStatus {
    if (s === 'pendiente') return 'en_progreso'; if (s === 'en_progreso') return 'revision'; if (s === 'revision') return 'hecho'; if (s === 'hecho') return 'pendiente'; return 'pendiente';
  }
  formatDate(iso: string): string { if (!iso) return ''; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX'); }
}
