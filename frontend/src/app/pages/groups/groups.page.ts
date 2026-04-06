import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PermissionsService } from '../../services/permissions.service';
import { Permission } from '../../models/permissions.model';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { TooltipModule } from 'primeng/tooltip';
import { TicketsMockService } from '../../services/tickets-mock.service';
import { Subscription } from 'rxjs';

interface GroupItem {
  id: number;
  level: string;
  author: string;
  name: string;
  members: number;
  tickets: number;
  description: string;
}

const GROUPS_STORAGE_KEY = 'groupsCrudDataV3';

@Component({
  selector: 'app-groups-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    TableModule,
    DialogModule,
    TagModule,
    IconFieldModule,
    InputIconModule,
    ToastModule,
    TooltipModule,
    HasPermissionDirective
  ],
  providers: [MessageService],
  templateUrl: './groups.page.html',
  styleUrl: './groups.page.css'
})
export class GroupsPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly permissionsService = inject(PermissionsService);
  private readonly ticketsMockService = inject(TicketsMockService);
  private readonly sub = new Subscription();

  readonly levelOptions = [
    { label: 'Alto',  value: 'Alto'  },
    { label: 'Medio', value: 'Medio' },
    { label: 'Bajo',  value: 'Bajo'  }
  ];

  readonly groupForm = this.fb.group({
    level:       ['Medio', [Validators.required]],
    author:      ['',      [Validators.required, Validators.minLength(3)]],
    name:        ['',      [Validators.required, Validators.minLength(3)]],
    members:     [0,       [Validators.required, Validators.min(0)]],
    tickets:     [0,       [Validators.required, Validators.min(0)]],
    description: ['',      [Validators.required, Validators.minLength(10)]]
  });

  groups: GroupItem[] = [];
  searchValue = '';
  dialogVisible = false;
  deleteDialogVisible = false;
  isEditing = false;
  groupToDelete: GroupItem | null = null;

  private editingGroupId: number | null = null;
  private nextId = 1;

  constructor() {
    this.loadGroups();
  }

  ngOnInit(): void {
    this.sub.add(
      this.ticketsMockService.getAll().subscribe(tickets => {
        this.updateTicketCounts(tickets);
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private updateTicketCounts(tickets: any[]): void {
    if (!this.groups.length) return;
    const ticketCounts = tickets.reduce((acc, ticket) => {
      const groupId = ticket.groupId;
      acc[groupId] = (acc[groupId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let changed = false;
    this.groups = this.groups.map(group => {
      const actualCount = ticketCounts[String(group.id)] || 0;
      if (group.tickets !== actualCount) { changed = true; return { ...group, tickets: actualCount }; }
      return group;
    });
    if (changed) this.persistGroups();
  }

  get filteredGroups(): GroupItem[] {
    const query = this.searchValue.trim().toLowerCase();
    let visibleGroups = this.groups;
    const rawAuthGroups = sessionStorage.getItem('authGroups');
    if (rawAuthGroups) {
      try {
        const userAssignedGroups = JSON.parse(rawAuthGroups);
        if (Array.isArray(userAssignedGroups)) {
          visibleGroups = this.groups.filter(g =>
            userAssignedGroups.some((ug: any) => ug.name === g.name || ug.id === String(g.id))
          );
        }
      } catch { /* ignore */ }
    }
    if (!query) return visibleGroups;
    return visibleGroups.filter(group =>
      [group.level, group.author, group.name, group.description, String(group.members), String(group.tickets)]
        .join(' ').toLowerCase().includes(query)
    );
  }

  controlHasError(controlName: 'level' | 'author' | 'name' | 'members' | 'tickets' | 'description'): boolean {
    const control = this.groupForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.editingGroupId = null;
    this.groupForm.reset({ level: 'Medio', author: '', name: '', members: 0, tickets: 0, description: '' });
    this.dialogVisible = true;
  }

  openEditDialog(group: GroupItem): void {
    this.isEditing = true;
    this.editingGroupId = group.id;
    this.groupForm.reset({ level: group.level, author: group.author, name: group.name, members: group.members, tickets: group.tickets, description: group.description });
    this.dialogVisible = true;
  }

  enterGroup(group: GroupItem): void {
    sessionStorage.setItem('selectedGroupId', String(group.id));
    sessionStorage.setItem('selectedGroupName', group.name);
    this.messageService.add({ severity: 'success', summary: 'Grupo cambiado', detail: `Ahora estás trabajando en: ${group.name}` });
    setTimeout(() => this.router.navigate(['/pages/group-dashboard']), 800);
  }

  saveGroup(): void {
    if (this.groupForm.invalid) { this.groupForm.markAllAsTouched(); return; }
    const value = this.groupForm.getRawValue();
    const payload = {
      level:       value.level?.trim() || 'Medio',
      author:      value.author?.trim() || '',
      name:        value.name?.trim() || '',
      members:     Number(value.members ?? 0),
      tickets:     Number(value.tickets ?? 0),
      description: value.description?.trim() || ''
    };
    if (this.isEditing && this.editingGroupId !== null) {
      this.groups = this.groups.map(g => g.id === this.editingGroupId ? { ...g, ...payload } : g);
    } else {
      this.groups = [...this.groups, { id: this.nextId++, ...payload }];
    }
    this.persistGroups();
    this.closeDialog();
  }

  askDeleteGroup(group: GroupItem): void { this.groupToDelete = group; this.deleteDialogVisible = true; }

  confirmDeleteGroup(): void {
    if (!this.groupToDelete) return;
    this.groups = this.groups.filter(g => g.id !== this.groupToDelete?.id);
    this.persistGroups();
    this.closeDeleteDialog();
  }

  closeDeleteDialog(): void { this.groupToDelete = null; this.deleteDialogVisible = false; }
  closeDialog(): void { this.dialogVisible = false; this.groupForm.markAsPristine(); this.groupForm.markAsUntouched(); }

  levelSeverity(level: string): 'danger' | 'warn' | 'success' | 'info' {
    if (level === 'Alto') return 'danger';
    if (level === 'Medio') return 'warn';
    if (level === 'Bajo') return 'success';
    return 'info';
  }

  private loadGroups(): void {
    const rawData = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!rawData) { this.groups = this.seedGroups(); this.nextId = this.groups.length + 1; this.persistGroups(); return; }
    try {
      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed)) { this.groups = this.seedGroups(); this.nextId = this.groups.length + 1; this.persistGroups(); return; }
      this.groups = parsed.filter((item): item is GroupItem =>
        typeof item?.id === 'number' && typeof item?.level === 'string' &&
        typeof item?.author === 'string' && typeof item?.name === 'string' &&
        typeof item?.members === 'number' && typeof item?.tickets === 'number' &&
        typeof item?.description === 'string'
      );
      if (this.groups.length === 0) { this.groups = this.seedGroups(); this.persistGroups(); }
      this.nextId = this.groups.reduce((max, g) => Math.max(max, g.id), 0) + 1;
    } catch {
      this.groups = this.seedGroups();
      this.nextId = this.groups.length + 1;
      this.persistGroups();
    }
  }

  private persistGroups(): void { localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(this.groups)); }

  private seedGroups(): GroupItem[] {
    return [
      { id: 1, level: 'Alto',  author: 'admin', name: 'Equipo Dev',           members: 5, tickets: 12, description: 'Equipo encargado del desarrollo de interfaces de usuario y backend' },
      { id: 2, level: 'Medio', author: 'admin', name: 'Soporte',              members: 4, tickets: 8,  description: 'Equipo de atencion a clientes y resolucion de incidentes' },
      { id: 3, level: 'Bajo',  author: 'admin', name: 'UX/UI',                members: 3, tickets: 20, description: 'Diseno de experiencia e interfaz de usuario' },
      { id: 4, level: 'Alto',  author: 'admin', name: 'Ventas Corporativas',   members: 2, tickets: 5,  description: 'Equipo encargado de ventas a nivel corporativo' },
      { id: 5, level: 'Medio', author: 'admin', name: 'Marketing Digital',     members: 3, tickets: 15, description: 'Estrategias de marketing y redes sociales' },
      { id: 6, level: 'Alto',  author: 'admin', name: 'Product Management',    members: 2, tickets: 5,  description: 'Gestion de producto y roadmap' },
      { id: 7, level: 'Medio', author: 'admin', name: 'Quality Assurance',     members: 3, tickets: 15, description: 'Aseguramiento de calidad y pruebas' }
    ];
  }
}
