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
import { TooltipModule } from 'primeng/tooltip';
import { PermissionsService } from '../../services/permissions.service';
import { Permission } from '../../models/permissions.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { TicketsMockService } from '../../services/tickets-mock.service';
import { Ticket, TicketStatus, TicketPriority } from '../../models/ticket.model';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-tickets-page',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        TableModule,
        DialogModule,
        TagModule,
        SelectModule,
        TooltipModule,
        HasPermissionDirective
    ],
    templateUrl: './tickets.page.html',
    styleUrl: './tickets.page.css'
})
export class TicketsPageComponent implements OnInit, OnDestroy {
    private readonly fb = inject(FormBuilder);
    private readonly permissionsService = inject(PermissionsService);
    private readonly ticketsMock = inject(TicketsMockService);
    private readonly sub = new Subscription();

    readonly currentUser = (sessionStorage.getItem('authUser') || '').trim();
    readonly currentGroupId = sessionStorage.getItem('selectedGroupId') || '1';

    readonly ticketForm = this.fb.group({
        title: ['', [Validators.required, Validators.minLength(3)]],
        description: [''],
        state: ['pendiente' as TicketStatus, [Validators.required]],
        priority: ['media' as TicketPriority, [Validators.required]],
        assignee: [this.currentUser]
    });

    tickets: Ticket[] = [];
    searchValue = '';
    activeQuickFilter: 'all' | 'mine' | 'unassigned' | 'high_priority' = 'all';
    
    dialogVisible = false;
    deleteDialogVisible = false;
    isEditing = false;
    ticketToDelete: Ticket | null = null;

    private editingTicketId: number | null = null;

    readonly stateOptions = [
        { label: 'Pendiente', value: 'pendiente' },
        { label: 'En Progreso', value: 'en_progreso' },
        { label: 'Revisión', value: 'revision' },
        { label: 'Hecho', value: 'hecho' },
        { label: 'Bloqueado', value: 'bloqueado' }
    ];

    readonly priorityOptions = [
        { label: 'Alta', value: 'alta' },
        { label: 'Media', value: 'media' },
        { label: 'Baja', value: 'baja' }
    ];

    get canViewAllTickets(): boolean {
        return this.permissionsService.hasPermission(Permission.TICKET_EDIT) || this.permissionsService.hasPermission(Permission.USERS_VIEW);
    }

    ngOnInit(): void {
        this.sub.add(
            this.ticketsMock.getByGroup(this.currentGroupId).subscribe((tickets) => {
                let visibleTickets = tickets;
                if (!this.canViewAllTickets) {
                    visibleTickets = tickets.filter(t => t.assignee === this.currentUser);
                }
                this.tickets = [...visibleTickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            })
        );
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }

    get filteredTickets(): Ticket[] {
        let result = this.tickets;

        if (this.activeQuickFilter === 'mine') {
            result = result.filter(t => t.assignee === this.currentUser);
        } else if (this.activeQuickFilter === 'unassigned') {
            result = result.filter(t => !t.assignee || t.assignee.trim() === '');
        } else if (this.activeQuickFilter === 'high_priority') {
            result = result.filter(t => t.priority === 'alta');
        }

        const query = this.searchValue.trim().toLowerCase();
        if (!query) {
            return result;
        }

        return result.filter((ticket) =>
            [ticket.title, ticket.description || '', ticket.status, ticket.priority, ticket.assignee]
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }

    setQuickFilter(filter: 'all' | 'mine' | 'unassigned' | 'high_priority'): void {
        this.activeQuickFilter = filter;
    }

    controlHasError(
        controlName: 'title' | 'description' | 'state' | 'priority' | 'assignee'
    ): boolean {
        const control = this.ticketForm.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    openCreateDialog(): void {
        this.isEditing = false;
        this.editingTicketId = null;
        this.ticketForm.reset({
            title: '',
            description: '',
            state: 'pendiente',
            priority: 'media',
            assignee: this.currentUser
        });
        if (!this.canViewAllTickets) {
            this.ticketForm.controls.assignee.disable();
        } else {
            this.ticketForm.controls.assignee.enable();
        }
        this.dialogVisible = true;
    }

    openEditDialog(ticket: Ticket): void {
        this.isEditing = true;
        this.editingTicketId = ticket.id;
        this.ticketForm.reset({
            title: ticket.title,
            description: ticket.description || '',
            state: ticket.status,
            priority: ticket.priority,
            assignee: ticket.assignee
        });
        if (!this.canViewAllTickets) {
            this.ticketForm.controls.assignee.disable();
        } else {
            this.ticketForm.controls.assignee.enable();
        }
        this.dialogVisible = true;
    }

    saveTicket(): void {
        if (this.ticketForm.invalid) {
            this.ticketForm.markAllAsTouched();
            return;
        }

        const value = this.ticketForm.getRawValue();
        const assignee = this.canViewAllTickets ? (value.assignee?.trim() || this.currentUser) : (this.isEditing ? this.tickets.find(t => t.id === this.editingTicketId)?.assignee || this.currentUser : this.currentUser);
        
        if (this.isEditing && this.editingTicketId !== null) {
            this.ticketsMock.update(this.editingTicketId, {
                title: value.title?.trim() || '',
                description: value.description?.trim() || undefined,
                status: (value.state || 'pendiente') as TicketStatus,
                priority: (value.priority || 'media') as TicketPriority,
                assignee: assignee
            }, this.currentUser);
        } else {
            this.ticketsMock.create({
                groupId: this.currentGroupId,
                title: value.title?.trim() || '',
                description: value.description?.trim() || undefined,
                status: (value.state || 'pendiente') as TicketStatus,
                priority: (value.priority || 'media') as TicketPriority,
                assignee: assignee
            }, this.currentUser);
        }

        this.closeDialog();
    }

    changeState(ticket: Ticket, newState: TicketStatus): void {
        this.ticketsMock.updateStatus(ticket.id, newState, this.currentUser);
    }

    askDeleteTicket(ticket: Ticket): void {
        this.ticketToDelete = ticket;
        this.deleteDialogVisible = true;
    }

    confirmDeleteTicket(): void {
        if (!this.ticketToDelete) {
            return;
        }
        this.ticketsMock.deleteById(this.ticketToDelete.id);
        this.closeDeleteDialog();
    }

    closeDeleteDialog(): void {
        this.ticketToDelete = null;
        this.deleteDialogVisible = false;
    }

    closeDialog(): void {
        this.dialogVisible = false;
        this.ticketForm.markAsPristine();
        this.ticketForm.markAsUntouched();
    }

    statusLabel(status: string): string {
        return this.stateOptions.find(o => o.value === status)?.label || status;
    }

    priorityLabel(priority: string): string {
        return this.priorityOptions.find(o => o.value === priority)?.label || priority;
    }

    stateSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (status === 'hecho') return 'success';
        if (status === 'pendiente') return 'info';
        if (status === 'en_progreso') return 'warn';
        if (status === 'revision') return 'secondary';
        return 'danger';
    }

    prioritySeverity(priority: string): 'danger' | 'warn' | 'success' | 'info' {
        if (priority === 'alta') return 'danger';
        if (priority === 'media') return 'warn';
        if (priority === 'baja') return 'success';
        return 'info';
    }

    nextState(currentState: string): TicketStatus {
        if (currentState === 'pendiente') return 'en_progreso';
        if (currentState === 'en_progreso') return 'revision';
        if (currentState === 'revision') return 'hecho';
        if (currentState === 'hecho') return 'pendiente';
        return 'pendiente';
    }

    formatDate(iso: string): string {
        if (!iso) return '';
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX');
    }
}
