import { CommonModule }        from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { AvatarModule }       from 'primeng/avatar';
import { ButtonModule }       from 'primeng/button';
import { CardModule }         from 'primeng/card';
import { ChartModule }        from 'primeng/chart';
import { DialogModule }       from 'primeng/dialog';
import { InputTextModule }    from 'primeng/inputtext';
import { MessageModule }      from 'primeng/message';
import { SelectModule }       from 'primeng/select';
import { SkeletonModule }     from 'primeng/skeleton';
import { TableModule }        from 'primeng/table';
import { TabsModule }         from 'primeng/tabs';
import { TagModule }          from 'primeng/tag';
import { TextareaModule }     from 'primeng/textarea';
import { TimelineModule }     from 'primeng/timeline';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule }      from 'primeng/tooltip';
import { DividerModule }      from 'primeng/divider';

import { TicketsService, Ticket } from '../../services/tickets.service';
import { GroupsService, GroupMember } from '../../services/groups.service';
import { PermissionsService }         from '../../services/permissions.service';
import { DynamicPermissionsService }  from '../../services/dynamic-permissions.service';
import { AuthGroup }                  from '../../models/auth.model';

// ── Helpers de estado ────────────────────────────────────────────────────────
const STATUS_ACCENT: Record<string, string> = {
  pendiente:   '#3b82f6',
  en_progreso: '#f59e0b',
  revision:    '#8b5cf6',
  hecho:       '#22c55e',
  bloqueado:   '#ef4444'
};

const STATUS_ICON: Record<string, string> = {
  pendiente:   'pi pi-clock',
  en_progreso: 'pi pi-sync',
  revision:    'pi pi-eye',
  hecho:       'pi pi-check-circle',
  bloqueado:   'pi pi-ban'
};

const PRIORITY_SEVERITY: Record<string, 'danger' | 'warn' | 'success' | 'info'> = {
  alta:  'danger',
  media: 'warn',
  baja:  'success'
};

const GROUP_COLORS = [
  '#4f46e5','#0891b2','#7c3aed','#059669','#d97706',
  '#dc2626','#2563eb','#c026d3','#065f46','#92400e'
];
const GROUP_ICONS = [
  'pi-code','pi-comments','pi-desktop','pi-chart-bar','pi-globe',
  'pi-box','pi-shield','pi-palette','pi-wallet','pi-id-card'
];

@Component({
  selector: 'app-group-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    AvatarModule, ButtonModule, CardModule, ChartModule,
    DialogModule, InputTextModule, MessageModule, SelectModule,
    SkeletonModule, TableModule, TabsModule, TagModule,
    TextareaModule, TimelineModule, ToggleSwitchModule,
    TooltipModule, DividerModule
  ],
  templateUrl: './group-dashboard.page.html',
  styleUrl:    './group-dashboard.page.css'
})
export class GroupDashboardPageComponent implements OnInit {
  private readonly ticketsSvc = inject(TicketsService);
  private readonly groupsSvc  = inject(GroupsService);
  private readonly permsSvc   = inject(PermissionsService);
  private readonly dynamicPermsSvc = inject(DynamicPermissionsService);
  private readonly fb         = inject(FormBuilder);

  // ── Grupos del usuario ───────────────────────────────────────────────────
  readonly groups: AuthGroup[] = JSON.parse(sessionStorage.getItem('authGroups') || '[]');
  selectedGroup: AuthGroup | null = null;
  loadingGroupPerms = false;
  groupMembers: GroupMember[] = [];

  readonly currentUser = (sessionStorage.getItem('authUsername') || '').trim();

  get showGroupPicker(): boolean {
    return this.selectedGroup === null;
  }

  // ── Estado ───────────────────────────────────────────────────────────────
  tickets      = signal<Ticket[]>([]);
  loading      = signal(false);
  errorMsg     = signal<string | null>(null);
  isKanbanView = true;

  // ── Filtros de tabla ────────────────────────────────────────────────────
  statusFilter: string | null = null;
  priorityFilter: string | null = null;
  assigneeFilter: string | null = null;

  readonly statusFilterOptions = [
    { label: 'Pendiente',   value: 'pendiente'   },
    { label: 'En progreso', value: 'en_progreso' },
    { label: 'Revisión',    value: 'revision'    },
    { label: 'Hecho',       value: 'hecho'       },
    { label: 'Bloqueado',   value: 'bloqueado'   }
  ];

  readonly priorityFilterOptions = [
    { label: 'Alta',  value: 'alta'  },
    { label: 'Media', value: 'media' },
    { label: 'Baja',  value: 'baja'  }
  ];

  get assigneeFilterOptions(): { label: string; value: string }[] {
    return [
      { label: 'Sin asignar', value: '' },
      ...this.groupMembers
        .map(m => ({ label: m.usuarios.username, value: m.usuarios.id }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ];
  }

  // ── Tickets filtrados para la tabla ───────────────────────────────────────
  get filteredTickets(): Ticket[] {
    let tickets = this.visibleTickets();
    
    if (this.statusFilter) {
      tickets = tickets.filter(t => t.estados?.codigo === this.statusFilter);
    }
    
    if (this.priorityFilter) {
      tickets = tickets.filter(t => t.prioridades?.codigo === this.priorityFilter);
    }
    
    if (this.assigneeFilter !== null) {
      if (this.assigneeFilter === '') {
        tickets = tickets.filter(t => !t.asignado?.id);
      } else {
        tickets = tickets.filter(t => t.asignado?.id === this.assigneeFilter);
      }
    }
    
    return tickets;
  }

  applyFilters(): void {
    // Los filtros se aplican automáticamente via el getter filteredTickets
  }

  clearFilters(): void {
    this.statusFilter = null;
    this.priorityFilter = null;
    this.assigneeFilter = null;
  }

  // ── Columnas Kanban ──────────────────────────────────────────────────────
  readonly columns = [
    { codigo: 'pendiente',   label: 'Pendiente'   },
    { codigo: 'en_progreso', label: 'En progreso' },
    { codigo: 'revision',    label: 'Revisión'    },
    { codigo: 'hecho',       label: 'Hecho'       },
    { codigo: 'bloqueado',   label: 'Bloqueado'   }
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

  // ── KPIs ─────────────────────────────────────────────────────────────────
  readonly totalTickets = computed(() => this.visibleTickets().length);

  countByStatus(codigo: string): number {
    return this.visibleTickets().filter(t => t.estados?.codigo === codigo).length;
  }

  ticketsByStatus(codigo: string): Ticket[] {
    return this.visibleTickets().filter(t => t.estados?.codigo === codigo);
  }

  // ── Tickets visibles según permisos ───────────────────────────────────────
  readonly visibleTickets = computed(() => {
    const allTickets = this.tickets();
    
    // Si tiene permisos avanzados, ve todos los tickets
    if (this.canViewAllTickets()) {
      return allTickets;
    }
    
    // Usuario normal: solo ve sus tickets asignados
    const me = this.currentUser.toLowerCase();
    const filtered = allTickets.filter(t => {
      const asignado = (t.asignado?.username ?? '').toLowerCase();
      return asignado === me;
    });
    
    return filtered;
  });

  // Getter para el template
  get visibleTicketsArray(): Ticket[] {
    return this.visibleTickets();
  }

  get myTickets(): Ticket[] {
    const me = this.currentUser.toLowerCase();
    return this.tickets()
      .filter(t => (t.asignado?.username ?? '').toLowerCase() === me)
      .slice(0, 5);
  }

  get recentTickets(): Ticket[] {
    return this.visibleTickets().slice(0, 5);
  }

  // ── Member options para el select de asignado (miembros del grupo) ─────────
  get memberOptionsWithEmpty(): { label: string; value: string }[] {
    return [
      { label: 'Sin asignar', value: '' },
      ...this.groupMembers
        .map(m => ({ label: m.usuarios.username, value: m.usuarios.id }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ];
  }

  // ── Permisos — computed() para que visibleTickets sea reactivo ───────────

  /** true si el usuario puede crear tickets */
  readonly canCreateTicket = computed(() =>
    this.permsSvc.hasPermission('ticket:add')
  );

  /**
   * true si el usuario tiene permisos de admin.
   * Controla si ve TODOS los tickets del grupo o solo los asignados.
   */
  readonly canViewAllTickets = computed(() =>
    this.permsSvc.hasAnyPermission([
      'group:edit', 'group:remove', 'users:view', 'permissions:manage'
    ])
  );

  // ── Modal crear ticket ───────────────────────────────────────────────────
  createDialogVisible = false;

  readonly createForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status_id:   ['', [Validators.required]],
    priority_id: ['', [Validators.required]],
    assignee_id: [''],
    dueDate:     ['']
  });

  openCreateDialog(): void {
    this.createForm.reset({ title: '', description: '', status_id: '', priority_id: '', assignee_id: '', dueDate: '' });
    this.createDialogVisible = true;
  }

  saveCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    if (!this.selectedGroup) return;
    const v = this.createForm.getRawValue();
    this.ticketsSvc.create({
      grupo_id:         this.selectedGroup.id,
      titulo:           (v.title       || '').trim(),
      descripcion:      (v.description || '').trim() || undefined,
      estado_codigo:    String(v.status_id),
      prioridad_codigo: String(v.priority_id),
      asignado_id:      v.assignee_id ? String(v.assignee_id) : undefined,
      fecha_final:      v.dueDate ? new Date(v.dueDate + 'T12:00:00').toISOString() : undefined
    }).subscribe({
      next: () => { this.loadTickets(); this.closeCreateDialog(); },
      error: (err) => {
        const status = err?.status ?? err?.error?.statusCode;
        if (status === 403) {
          this.errorMsg.set('Sin permiso para crear tickets. Contacta al administrador.');
          this.closeCreateDialog();
          // Forzar recarga de permisos para que el botón desaparezca de inmediato
          this.dynamicPermsSvc.forceReload();
        } else {
          this.errorMsg.set(err?.error?.message ?? 'Error al crear el ticket.');
        }
      }
    });
  }

  closeCreateDialog(): void {
    this.createDialogVisible = false;
    this.createForm.markAsPristine();
    this.createForm.markAsUntouched();
  }

  createFormError(name: 'title' | 'status_id' | 'priority_id'): boolean {
    const ctrl = this.createForm.get(name);
    return ctrl?.invalid && (ctrl.dirty || ctrl.touched) || false;
  }

  // ── Modal: estado ────────────────────────────────────────────────────────
  detailDialogVisible = false;
  selectedTicket: Ticket | null = null;
  dialogMode: 'view' | 'edit' = 'view';
  confirmingDelete = false;
  newCommentText = '';
  activeTab: 'comments' | 'history' = 'comments';

  readonly editForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status_id:   ['', [Validators.required]],
    priority_id: ['', [Validators.required]],
    assignee_id: [''],
    dueDate:     ['']
  });

  // ── Permisos sobre el ticket seleccionado ────────────────────────────────
  get isCreator():  boolean { return this.selectedTicket?.autor.username === this.currentUser; }
  get isAssignee(): boolean { return this.selectedTicket?.asignado?.username === this.currentUser; }

  get canEditAll(): boolean {
    return this.isCreator || this.permsSvc.hasPermission('ticket:edit');
  }
  get canEditStatus(): boolean {
    return this.canEditAll ||
           (this.isAssignee && this.permsSvc.hasAnyPermission(['ticket:edit:state', 'ticket:edit_state']));
  }
  get canComment(): boolean {
    return this.isCreator || this.isAssignee ||
           this.permsSvc.hasPermission('ticket:edit:comment');
  }
  canDelete(): boolean { return this.permsSvc.hasPermission('ticket:edit:delete'); }

  // ── Permiso para mover un ticket específico (drag & drop) ─────────────
  canMoveTicket(ticket: Ticket): boolean {
    const isAssignee = ticket.asignado?.username === this.currentUser;
    const hasPermission = this.permsSvc.hasAnyPermission(['ticket:edit:state', 'ticket:edit_state']);
    return isAssignee || hasPermission;
  }

  // ── Chart: dona por estado ────────────────────────────────────────────────
  get statusChartData() {
    const labels = this.columns.map(c => c.label);
    const data   = this.columns.map(c => this.countByStatus(c.codigo));
    const colors = this.columns.map(c => STATUS_ACCENT[c.codigo] ?? '#94a3b8');
    return {
      labels,
      datasets: [{ data, backgroundColor: colors, hoverOffset: 6 }]
    };
  }

  readonly statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } },
    cutout: '65%'
  };

  // ── Chart: barras por prioridad ───────────────────────────────────────────
  get priorityChartData() {
    const prioridades = ['alta', 'media', 'baja'];
    const data        = prioridades.map(p =>
      this.tickets().filter(t => t.prioridades?.codigo === p).length
    );
    return {
      labels: ['Alta', 'Media', 'Baja'],
      datasets: [{
        label: 'Tickets',
        data,
        backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
        borderRadius: 6
      }]
    };
  }

  readonly priorityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { grid: { display: false } }
    }
  };

  // ── Ciclo de vida ────────────────────────────────────────────────────────
  ngOnInit(): void {
    if (!this.groups.length) return;

    const savedId = sessionStorage.getItem('selectedGroupId');
    const saved   = savedId ? this.groups.find(g => g.id === savedId) : null;

    if (saved) {
      this.selectedGroup = saved;
      this.loadGroupMembers(saved.id);
      this.loadTickets(); // Cargar inmediatamente
      
      // Refrescar permisos en segundo plano
      this.dynamicPermsSvc.refreshPermissions().subscribe({
        error: () => {} // Manejar error silenciosamente
      });
    }
  }

  // ── Selección de grupo desde el picker ───────────────────────────────────
  selectGroupFromPicker(group: AuthGroup): void {
    this.loadingGroupPerms = true;
    sessionStorage.setItem('selectedGroupId',   group.id);
    sessionStorage.setItem('selectedGroupName', group.name);

    // Cargar datos inmediatamente
    this.selectedGroup = group;
    this.loadGroupMembers(group.id);
    this.loadTickets();
    
    // Refrescar permisos en segundo plano
    this.dynamicPermsSvc.refreshPermissions().subscribe({
      next: () => {
        this.loadingGroupPerms = false;
      },
      error: () => {
        this.permsSvc.clearGroupPermissions();
        this.loadingGroupPerms = false;
      }
    });
  }

  // ── Cambio de grupo desde el select del header ───────────────────────────
  onGroupChange(group: AuthGroup): void {
    sessionStorage.setItem('selectedGroupId',   group.id);
    sessionStorage.setItem('selectedGroupName', group.name);
    this.selectedGroup = group;
    this.loadGroupMembers(group.id);
    this.loadTickets(); // Cargar inmediatamente

    // Refrescar permisos en segundo plano
    this.dynamicPermsSvc.refreshPermissions().subscribe({
      error: () => this.permsSvc.clearGroupPermissions()
    });
  }

  private loadGroupMembers(groupId: string): void {
    this.groupsSvc.getById(groupId).subscribe({
      next: (g) => {
        if (g) {
          this.groupMembers = g.miembros;
        }
      }
    });
  }

  loadTickets(): void {
    if (!this.selectedGroup) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    this.ticketsSvc.getAll(this.selectedGroup.id).subscribe({
      next: ts => {
        this.tickets.set(ts);
        this.loading.set(false);
        // Refrescar el ticket del modal si está abierto
        if (this.selectedTicket) {
          const updated = ts.find(t => t.id === this.selectedTicket?.id);
          if (updated) this.selectedTicket = updated;
        }
      },
      error: err => {
        console.error('[DEBUG] Error loading tickets:', err);
        this.errorMsg.set(err.error?.message ?? 'Error al cargar tickets.');
        this.loading.set(false);
      }
    });
  }

  // ── Modal: abrir / cerrar ────────────────────────────────────────────────
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
    this.selectedTicket = null;
    this.dialogMode = 'view';
    this.confirmingDelete = false;
    this.editForm.markAsPristine();
    this.editForm.markAsUntouched();
  }

  switchToEditMode(): void {
    if (!this.selectedTicket) return;
    const t = this.selectedTicket;
    this.editForm.reset({
      title:       t.titulo,
      description: t.descripcion || '',
      status_id:   t.estados.codigo,      // codigo, no UUID
      priority_id: t.prioridades.codigo,  // codigo, no UUID
      assignee_id: t.asignado?.id || '',
      dueDate:     t.fecha_final ? t.fecha_final.substring(0, 10) : ''
    });
    this.dialogMode = 'edit';
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.selectedTicket) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();
    this.ticketsSvc.update(this.selectedTicket.id, {
      titulo:           (v.title       || '').trim(),
      descripcion:      (v.description || '').trim() || undefined,
      estado_codigo:    String(v.status_id),
      prioridad_codigo: String(v.priority_id),
      asignado_id:      v.assignee_id ? String(v.assignee_id) : undefined,
      fecha_final:      v.dueDate ? new Date(v.dueDate + 'T12:00:00').toISOString() : undefined
    }).subscribe({
      next: () => { this.loadTickets(); this.dialogMode = 'view'; }
    });
  }

  onInlineStatusChange(newStatus: string): void {
    if (!this.selectedTicket) return;
    const ticketId = this.selectedTicket.id;
    // Actualización optimista en el kanban y en el modal
    this.tickets.update(ts =>
      ts.map(t => t.id === ticketId
        ? { ...t, estados: { ...t.estados, codigo: newStatus } }
        : t
      )
    );
    this.selectedTicket = { ...this.selectedTicket, estados: { ...this.selectedTicket.estados, codigo: newStatus } };
    this.ticketsSvc.updateStatus(ticketId, newStatus).subscribe({
      error: () => this.loadTickets()
    });
  }

  postComment(): void {
    if (!this.selectedTicket || !this.newCommentText.trim()) return;
    this.ticketsSvc.addComment(this.selectedTicket.id, this.newCommentText).subscribe({
      next: () => { this.loadTickets(); this.newCommentText = ''; }
    });
  }

  deleteTicket(): void {
    if (!this.selectedTicket) return;
    this.ticketsSvc.delete(this.selectedTicket.id).subscribe({
      next: () => { this.loadTickets(); this.closeDetailDialog(); }
    });
  }

  // ── Drag & Drop Kanban ───────────────────────────────────────────────────
  draggedTicketId:  string | null = null;
  dropTargetStatus: string | null = null;
  isDragging: boolean = false;
  dragStartTime: number = 0;

  onDragStart(event: DragEvent, ticket: Ticket): void {
    this.isDragging = true;
    this.dragStartTime = Date.now();
    this.draggedTicketId = ticket.id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', ticket.id);
      const card = (event.target as HTMLElement).closest('.kanban-card');
      if (card) event.dataTransfer.setDragImage(card as HTMLElement, 20, 20);
    }
  }

  onDragOver(event: DragEvent, codigo: string): void {
    event.preventDefault();
    this.dropTargetStatus = codigo;
  }

  onDragLeave(event: DragEvent, codigo: string): void {
    const related = event.relatedTarget as HTMLElement | null;
    const target  = event.currentTarget as HTMLElement;
    if (related && target.contains(related)) return;
    if (this.dropTargetStatus === codigo) this.dropTargetStatus = null;
  }

  onDrop(event: DragEvent, targetCodigo: string): void {
    event.preventDefault();
    if (this.draggedTicketId) {
      const ticket = this.tickets().find(t => t.id === this.draggedTicketId);
      if (ticket && ticket.estados?.codigo !== targetCodigo) {
        // Verificar permisos antes de mover
        if (!this.canMoveTicket(ticket)) {
          // No tiene permisos para mover este ticket
          this.draggedTicketId = null;
          this.dropTargetStatus = null;
          return;
        }
        // Actualización optimista: mover la tarjeta de inmediato sin recargar
        this.tickets.update(ts =>
          ts.map(t => t.id === ticket.id
            ? { ...t, estados: { ...t.estados, codigo: targetCodigo } }
            : t
          )
        );
        // Sincronizar con el backend en segundo plano
        this.ticketsSvc.updateStatus(ticket.id, targetCodigo).subscribe({
          error: () => this.loadTickets() // revertir solo si falla
        });
      }
    }
    this.draggedTicketId  = null;
    this.dropTargetStatus = null;
  }

  onDragEnd(): void {
    this.isDragging = false;
    this.draggedTicketId  = null;
    this.dropTargetStatus = null;
  }

  // Manejador de clic que distingue entre clic simple y arrastre
  onTicketClick(ticket: Ticket): void {
    // Si venimos de un arrastre, ignorar el clic
    if (this.isDragging) return;
    
    // Pequeño delay para asegurar que no es el inicio de un arrastre
    setTimeout(() => {
      if (!this.isDragging) {
        this.openDetailDialog(ticket);
      }
    }, 50);
  }

  // ── Helpers de grupo ─────────────────────────────────────────────────────
  groupColor(id: string): string {
    return GROUP_COLORS[(parseInt(id, 10) || 1) % GROUP_COLORS.length];
  }

  groupIcon(id: string): string {
    return 'pi ' + GROUP_ICONS[(parseInt(id, 10) || 1) % GROUP_ICONS.length];
  }

  // ── Helpers de presentación ──────────────────────────────────────────────
  statusAccent(codigo: string): string { return STATUS_ACCENT[codigo] ?? '#94a3b8'; }
  statusIcon(codigo: string):   string { return STATUS_ICON[codigo]   ?? 'pi pi-circle'; }

  statusSeverity(codigo: string): 'success' | 'info' | 'warn' | 'danger' {
    if (codigo === 'hecho')       return 'success';
    if (codigo === 'pendiente')   return 'info';
    if (codigo === 'en_progreso') return 'warn';
    return 'danger';
  }

  prioritySeverity(codigo: string): 'danger' | 'warn' | 'success' | 'info' {
    return PRIORITY_SEVERITY[codigo] ?? 'info';
  }

  priorityAccent(codigo: string): string {
    if (codigo === 'alta') return '#ef4444';
    if (codigo === 'baja') return '#22c55e';
    return '#f59e0b';
  }

  assigneeLabel(t: Ticket): string {
    return t.asignado?.nombre_completo ?? t.asignado?.username ?? '—';
  }

  assigneeInitial(t: Ticket): string {
    return (t.asignado?.username ?? '?').charAt(0).toUpperCase();
  }

  assigneeInitialStr(username: string | null | undefined): string {
    return (username ?? '?').charAt(0).toUpperCase();
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX');
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  isOverdue(iso: string | null | undefined): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    d.setHours(23, 59, 59, 999);
    return !isNaN(d.getTime()) && d.getTime() < Date.now();
  }

  statusLabel(codigo: string): string {
    return this.allStatusOptions.find(o => o.value === codigo)?.label ?? codigo;
  }

  formControlError(name: 'title' | 'description' | 'status_id' | 'priority_id' | 'assignee_id' | 'dueDate'): boolean {
    const ctrl = this.editForm.get(name);
    return ctrl?.invalid && (ctrl.dirty || ctrl.touched) || false;
  }
}
