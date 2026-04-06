import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';

// Servicios y modelos
import { TicketsService, Ticket } from '../../services/tickets.service';
import { GroupsService } from '../../services/groups.service';
import { AuthGroup } from '../../models/auth.model';

// ── Helpers de estado ────────────────────────────────────────────────────────
const STATUS_ACCENT: Record<string, string> = {
  pendiente: '#3b82f6',
  en_progreso: '#f59e0b',
  revision: '#8b5cf6',
  hecho: '#22c55e',
  bloqueado: '#ef4444'
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  revision: 'Revisión',
  hecho: 'Hecho',
  bloqueado: 'Bloqueado'
};

const PRIORITY_ACCENT: Record<string, string> = {
  alta: '#ef4444',
  media: '#f59e0b',
  baja: '#22c55e'
};

const PRIORITY_LABEL: Record<string, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja'
};

const GROUP_COLORS = [
  '#4f46e5', '#0891b2', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#2563eb', '#c026d3', '#065f46', '#92400e'
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ChartModule,
    SelectModule,
    TableModule,
    TagModule,
    ButtonModule,
    AvatarModule,
    SkeletonModule,
    ProgressBarModule,
    DividerModule
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardComponent implements OnInit {
  private readonly ticketsSvc = inject(TicketsService);
  private readonly groupsSvc = inject(GroupsService);
  private readonly router = inject(Router);

  // ── Constantes expuestas para el template ──────────────────────────────────
  readonly STATUS_ACCENT = STATUS_ACCENT;
  readonly PRIORITY_ACCENT = PRIORITY_ACCENT;

  // ── Grupos del usuario ───────────────────────────────────────────────────
  readonly groups: AuthGroup[] = JSON.parse(sessionStorage.getItem('authGroups') || '[]');
  selectedGroup: AuthGroup | null = null;
  loading = signal(false);

  // ── Tickets ────────────────────────────────────────────────────────────────
  tickets = signal<Ticket[]>([]);

  // ── Estadísticas computadas ──────────────────────────────────────────────
  readonly totalTickets = computed(() => this.tickets().length);

  readonly ticketsByStatus = computed(() => {
    const statuses = ['pendiente', 'en_progreso', 'revision', 'hecho', 'bloqueado'];
    return statuses.map(codigo => ({
      codigo,
      label: STATUS_LABEL[codigo],
      count: this.tickets().filter(t => t.estados?.codigo === codigo).length,
      color: STATUS_ACCENT[codigo]
    }));
  });

  readonly ticketsByPriority = computed(() => {
    const priorities = ['alta', 'media', 'baja'];
    return priorities.map(codigo => ({
      codigo,
      label: PRIORITY_LABEL[codigo],
      count: this.tickets().filter(t => t.prioridades?.codigo === codigo).length,
      color: PRIORITY_ACCENT[codigo]
    }));
  });

  readonly recentTickets = computed(() => {
    return this.tickets()
      .slice()
      .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
      .slice(0, 5);
  });

  // ── Datos para gráficos ──────────────────────────────────────────────────
  readonly statusChartData = computed(() => {
    const statusData = this.ticketsByStatus();
    return {
      labels: statusData.map(s => s.label),
      datasets: [{
        data: statusData.map(s => s.count),
        backgroundColor: statusData.map(s => s.color),
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  });

  readonly priorityChartData = computed(() => {
    const priorityData = this.ticketsByPriority();
    return {
      labels: priorityData.map(p => p.label),
      datasets: [{
        label: 'Tickets',
        data: priorityData.map(p => p.count),
        backgroundColor: priorityData.map(p => p.color),
        borderRadius: 6,
        borderWidth: 0
      }]
    };
  });

  // ── Tickets por grupo ────────────────────────────────────────────────────
  readonly ticketsByGroup = computed(() => {
    const groupTickets: Record<string, { id: string; name: string; count: number; color: string }> = {};
    
    // Inicializar todos los grupos del usuario con 0 tickets
    this.groups.forEach((g, index) => {
      groupTickets[g.id] = {
        id: g.id,
        name: g.name,
        count: 0,
        color: GROUP_COLORS[index % GROUP_COLORS.length]
      };
    });
    
    // Contar tickets por grupo
    this.tickets().forEach(t => {
      if (t.grupos?.id && groupTickets[t.grupos.id]) {
        groupTickets[t.grupos.id].count++;
      }
    });
    
    return Object.values(groupTickets);
  });

  readonly groupChartData = computed(() => {
    const groupData = this.ticketsByGroup();
    return {
      labels: groupData.map(g => g.name),
      datasets: [{
        label: 'Tickets',
        data: groupData.map(g => g.count),
        backgroundColor: groupData.map(g => g.color),
        borderRadius: 6,
        borderWidth: 0
      }]
    };
  });

  readonly groupChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // ── Opciones de gráficos ───────────────────────────────────────────────────
  readonly doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    }
  };

  readonly barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // ── Ciclo de vida ────────────────────────────────────────────────────────
  ngOnInit(): void {
    // Cargar tickets de todos los grupos para mostrar estadísticas generales
    this.loadAllTickets();
  }

  // ── Carga de tickets de todos los grupos ──────────────────────────────────
  private loadAllTickets(): void {
    this.loading.set(true);
    
    if (this.groups.length === 0) {
      this.tickets.set([]);
      this.loading.set(false);
      return;
    }

    // Cargar tickets de todos los grupos
    const groupIds = this.groups.map(g => g.id);
    this.ticketsSvc.getAll().subscribe({
      next: (tickets) => {
        // Filtrar solo tickets de los grupos del usuario
        const userTickets = tickets.filter(t => groupIds.includes(t.grupos?.id));
        this.tickets.set(userTickets);
        this.loading.set(false);
      },
      error: () => {
        this.tickets.set([]);
        this.loading.set(false);
      }
    });
  }

  // ── Selección de grupo ───────────────────────────────────────────────────
  onGroupChange(group: AuthGroup): void {
    sessionStorage.setItem('selectedGroupId', group.id);
    sessionStorage.setItem('selectedGroupName', group.name);
    // Redirigir al tablero Kanban
    this.router.navigate(['/kanban']);
  }


  // ── Helpers de presentación ──────────────────────────────────────────────
  statusLabel(codigo: string): string {
    return STATUS_LABEL[codigo] || codigo;
  }

  statusSeverity(codigo: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (codigo) {
      case 'hecho': return 'success';
      case 'pendiente': return 'info';
      case 'en_progreso': return 'warn';
      case 'revision': return 'secondary';
      case 'bloqueado': return 'danger';
      default: return 'info';
    }
  }

  priorityLabel(codigo: string): string {
    return PRIORITY_LABEL[codigo] || codigo;
  }

  prioritySeverity(codigo: string): 'danger' | 'warn' | 'success' {
    switch (codigo) {
      case 'alta': return 'danger';
      case 'media': return 'warn';
      case 'baja': return 'success';
      default: return 'success';
    }
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX');
  }

  assigneeInitial(ticket: Ticket): string {
    const username = ticket.asignado?.username || '?';
    return username.charAt(0).toUpperCase();
  }
}
