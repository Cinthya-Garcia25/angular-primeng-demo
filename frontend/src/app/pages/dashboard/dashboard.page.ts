import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// PrimeNG
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

// Servicios y modelos
import { TicketsService, Ticket } from '../../services/tickets.service';
import { DynamicPermissionsService } from '../../services/dynamic-permissions.service';
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
    ChartModule,
    SelectModule,
    ButtonModule,
    SkeletonModule,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardComponent implements OnInit {
  private readonly ticketsSvc   = inject(TicketsService);
  private readonly router       = inject(Router);
  private readonly dynamicPermsSvc = inject(DynamicPermissionsService);

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
    cutout: '60%',
    layout: {
      padding: { bottom: 4 }
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 11 }
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

  // ── Ciclo de vida ────────────────────────────────────────────────
  ngOnInit(): void {
    // Cargar tickets inmediatamente, no esperar a permisos
    this.loadAllTickets();
    
    // Refrescar permisos en segundo plano si es necesario
    this.dynamicPermsSvc.refreshPermissions().subscribe({
      next: () => {
        // Opcional: recargar si los permisos afectan lo que se muestra
      },
      error: () => {
        console.error('Error recargando permisos en dashboard');
      }
    });
    
    // Escuchar cambios de permisos para actualizar las gráficas
    this.dynamicPermsSvc.onPermissionsChanged().subscribe(() => {
      // Las gráficas se actualizarán automáticamente al cambiar los permisos
    });
  }

  // ── Carga de tickets de todos los grupos ──────────────────────────────────
  private loadAllTickets(): void {
    this.loading.set(true);

    if (this.groups.length === 0) {
      this.tickets.set([]);
      this.loading.set(false);
      return;
    }

    // Cargar tickets por cada grupo con su x-group-id header
    // Así el backend puede verificar permisos de grupo correctamente
    const requests = this.groups.map(g =>
      this.ticketsSvc.getAll(g.id).pipe(catchError(() => of([] as Ticket[])))
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        // Combinar y deduplicar tickets de todos los grupos
        const seen = new Set<string>();
        const unique = results.flat().filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        this.tickets.set(unique);
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
    this.router.navigate(['/groups', group.id, 'kanban']);
  }


}
