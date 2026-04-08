import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { GroupsService } from '../services/groups.service';
import { PermissionsService } from '../services/permissions.service';
import { HasGroupPermissionDirective } from '../directives/has-group-permission.directive';
import { HasPermissionDirective } from '../directives/has-permission.directive';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
}

@Component({
  selector: 'app-group-tickets-demo',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    HasGroupPermissionDirective,
    HasPermissionDirective
  ],
  template: `
    <div class="tickets-demo">
      <p-card header="Tickets del Grupo">
        <!-- Toolbar con permisos por grupo -->
        <div class="toolbar">
          <button pButton 
                  *hasGroupPermission="'ticket:add'; group: currentGroupId" 
                  icon="pi pi-plus" 
                  label="Nuevo Ticket"
                  (click)="createTicket()">
          </button>
          
          <button pButton 
                  *hasGroupPermission="'ticket:edit:state'; group: currentGroupId" 
                  icon="pi pi-refresh" 
                  label="Cambiar Estados"
                  (click)="changeStates()">
          </button>
          
          <button pButton 
                  *ifHasPermission="'ticket:view'"
                  icon="pi pi-eye" 
                  label="Ver Todos"
                  (click)="viewAll()">
          </button>
        </div>

        <!-- Tabla de tickets -->
        <p-table [value]="tickets" responsiveLayout="scroll">
          <ng-template pTemplate="header">
            <tr>
              <th>Título</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-ticket>
            <tr>
              <td>{{ ticket.title }}</td>
              <td><p-tag [value]="ticket.status" severity="info"></p-tag></td>
              <td><p-tag [value]="ticket.priority" [severity]="getPrioritySeverity(ticket.priority)"></p-tag></td>
              <td>
                <!-- Acciones contextuales por grupo -->
                <button pButton 
                        *hasGroupPermission="'ticket:edit'; group: currentGroupId" 
                        icon="pi pi-pencil" 
                        size="small"
                        text
                        (click)="editTicket(ticket.id)">
                </button>
                
                <button pButton 
                        *hasGroupPermission="'ticket:edit:delete'; group: currentGroupId" 
                        icon="pi pi-trash" 
                        size="small"
                        text
                        severity="danger"
                        (click)="deleteTicket(ticket.id)">
                </button>
              </td>
            </tr>
          </ng-template>
        </p-table>

        <!-- Información de permisos actuales -->
        <div class="permissions-info">
          <h4>Permisos del Grupo Actual:</h4>
          <div class="permissions-list">
            <span *ngFor="let perm of currentGroupPermissions" 
                  class="permission-tag">
              {{ perm }}
            </span>
            <span *ngIf="currentGroupPermissions.length === 0" 
                  class="no-permissions">
              Sin permisos específicos en este grupo
            </span>
          </div>
          
          <h4>Permisos Globales:</h4>
          <div class="permissions-list">
            <span *ngFor="let perm of globalPermissions" 
                  class="permission-tag global">
              {{ perm }}
            </span>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .tickets-demo {
      padding: 1rem;
    }
    
    .toolbar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .permissions-info {
      margin-top: 2rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .permissions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
    
    .permission-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: monospace;
    }
    
    .permission-tag.global {
      background: #f3e5f5;
      color: #7b1fa2;
    }
    
    .no-permissions {
      color: #666;
      font-style: italic;
    }
  `]
})
export class GroupTicketsDemoComponent implements OnInit {
  private groupsService = inject(GroupsService);
  private permissionsService = inject(PermissionsService);

  currentGroupId: string = '';
  currentGroupPermissions: string[] = [];
  globalPermissions: string[] = [];

  tickets: Ticket[] = [
    { id: '1', title: 'Bug en login', status: 'Abierto', priority: 'Alta' },
    { id: '2', title: 'Mejorar UI dashboard', status: 'En Progreso', priority: 'Media' },
    { id: '3', title: 'Documentación API', status: 'Cerrado', priority: 'Baja' }
  ];

  ngOnInit(): void {
    this.loadCurrentGroup();
    this.loadPermissions();
  }

  private loadCurrentGroup(): void {
    this.currentGroupId = sessionStorage.getItem('selectedGroupId') || '';
    
    // Cargar permisos del grupo actual
    if (this.currentGroupId) {
      this.groupsService.loadGroupPermissions(this.currentGroupId);
      this.currentGroupPermissions = this.groupsService.getGroupPermissions(this.currentGroupId);
    }
  }

  private loadPermissions(): void {
    // Escuchar cambios de permisos
    this.permissionsService.changed$.subscribe(() => {
      this.updatePermissionsDisplay();
    });

    // Cargar permisos actuales
    this.globalPermissions = this.permissionsService.getPermissions();
    this.updatePermissionsDisplay();
  }

  private updatePermissionsDisplay(): void {
    if (this.currentGroupId) {
      this.currentGroupPermissions = this.groupsService.getGroupPermissions(this.currentGroupId);
    }
    this.globalPermissions = this.permissionsService.getPermissions();
  }

  // Acciones con validación de permisos
  createTicket(): void {
    console.log('Creando ticket en grupo:', this.currentGroupId);
    // Esta acción solo es visible si tiene ticket:add en el grupo actual
  }

  editTicket(ticketId: string): void {
    console.log('Editando ticket:', ticketId, 'en grupo:', this.currentGroupId);
    // Esta acción solo es visible si tiene ticket:edit en el grupo actual
  }

  deleteTicket(ticketId: string): void {
    console.log('Eliminando ticket:', ticketId, 'en grupo:', this.currentGroupId);
    // Esta acción solo es visible si tiene ticket:edit:delete en el grupo actual
  }

  changeStates(): void {
    console.log('Cambiando estados en grupo:', this.currentGroupId);
    // Esta acción solo es visible si tiene ticket:edit:state en el grupo actual
  }

  viewAll(): void {
    console.log('Viendo todos los tickets');
    // Esta acción es visible si tiene ticket:view global o de grupo
  }

  getPrioritySeverity(priority: string): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" {
    switch (priority) {
      case 'Alta': return 'danger';
      case 'Media': return 'warn';
      case 'Baja': return 'success';
      default: return 'info';
    }
  }
}
