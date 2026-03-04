import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

interface GroupItem {
  id: number;
  level: string;
  author: string;
  name: string;
  members: number;
  tickets: number;
  description: string;
}

const GROUPS_STORAGE_KEY = 'groupsCrudDataV2';

@Component({
  selector: 'app-groups-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    TableModule,
    DialogModule,
    TagModule
  ],
  templateUrl: './groups.page.html',
  styleUrl: './groups.page.css'
})
export class GroupsPageComponent {
  private readonly fb = inject(FormBuilder);

  readonly groupForm = this.fb.group({
    level: ['Medio', [Validators.required]],
    author: ['', [Validators.required, Validators.minLength(3)]],
    name: ['', [Validators.required, Validators.minLength(3)]],
    members: [0, [Validators.required, Validators.min(0)]],
    tickets: [0, [Validators.required, Validators.min(0)]],
    description: ['', [Validators.required, Validators.minLength(10)]]
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

  get filteredGroups(): GroupItem[] {
    const query = this.searchValue.trim().toLowerCase();
    if (!query) {
      return this.groups;
    }

    return this.groups.filter((group) =>
      [group.level, group.author, group.name, group.description, String(group.members), String(group.tickets)]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }

  controlHasError(
    controlName: 'level' | 'author' | 'name' | 'members' | 'tickets' | 'description'
  ): boolean {
    const control = this.groupForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.editingGroupId = null;
    this.groupForm.reset({
      level: 'Medio',
      author: '',
      name: '',
      members: 0,
      tickets: 0,
      description: ''
    });
    this.dialogVisible = true;
  }

  openEditDialog(group: GroupItem): void {
    this.isEditing = true;
    this.editingGroupId = group.id;
    this.groupForm.reset({
      level: group.level,
      author: group.author,
      name: group.name,
      members: group.members,
      tickets: group.tickets,
      description: group.description
    });
    this.dialogVisible = true;
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    const value = this.groupForm.getRawValue();
    const payload = {
      level: value.level?.trim() || 'Medio',
      author: value.author?.trim() || '',
      name: value.name?.trim() || '',
      members: Number(value.members ?? 0),
      tickets: Number(value.tickets ?? 0),
      description: value.description?.trim() || ''
    };

    if (this.isEditing && this.editingGroupId !== null) {
      this.groups = this.groups.map((group) =>
        group.id === this.editingGroupId ? { ...group, ...payload } : group
      );
    } else {
      this.groups = [...this.groups, { id: this.nextId++, ...payload }];
    }

    this.persistGroups();
    this.closeDialog();
  }

  askDeleteGroup(group: GroupItem): void {
    this.groupToDelete = group;
    this.deleteDialogVisible = true;
  }

  confirmDeleteGroup(): void {
    if (!this.groupToDelete) {
      return;
    }
    this.groups = this.groups.filter((group) => group.id !== this.groupToDelete?.id);
    this.persistGroups();
    this.closeDeleteDialog();
  }

  closeDeleteDialog(): void {
    this.groupToDelete = null;
    this.deleteDialogVisible = false;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.groupForm.markAsPristine();
    this.groupForm.markAsUntouched();
  }

  levelSeverity(level: string): 'danger' | 'warn' | 'success' | 'info' {
    if (level === 'Alto') {
      return 'danger';
    }
    if (level === 'Medio') {
      return 'warn';
    }
    if (level === 'Bajo') {
      return 'success';
    }
    return 'info';
  }

  private loadGroups(): void {
    const rawData = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!rawData) {
      this.groups = this.seedGroups();
      this.nextId = this.groups.length + 1;
      this.persistGroups();
      return;
    }

    try {
      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed)) {
        this.groups = this.seedGroups();
        this.nextId = this.groups.length + 1;
        this.persistGroups();
        return;
      }

      this.groups = parsed.filter(
        (item): item is GroupItem =>
          typeof item?.id === 'number' &&
          typeof item?.level === 'string' &&
          typeof item?.author === 'string' &&
          typeof item?.name === 'string' &&
          typeof item?.members === 'number' &&
          typeof item?.tickets === 'number' &&
          typeof item?.description === 'string'
      );

      const maxId = this.groups.reduce((currentMax, group) => Math.max(currentMax, group.id), 0);
      this.nextId = maxId + 1;
    } catch {
      this.groups = this.seedGroups();
      this.nextId = this.groups.length + 1;
      this.persistGroups();
    }
  }

  private persistGroups(): void {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(this.groups));
  }

  private seedGroups(): GroupItem[] {
    return [
      {
        id: 1,
        level: 'Alto',
        author: 'Carlos Mendoza',
        name: 'Desarrollo Frontend',
        members: 5,
        tickets: 12,
        description: 'Equipo encargado del desarrollo de interfaces de usuario'
      },
      {
        id: 2,
        level: 'Medio',
        author: 'Ana Garcia',
        name: 'Backend API',
        members: 4,
        tickets: 8,
        description: 'Equipo de servicios y APIs REST'
      },
      {
        id: 3,
        level: 'Bajo',
        author: 'Luis Perez',
        name: 'QA Testing',
        members: 3,
        tickets: 20,
        description: 'Equipo de aseguramiento de calidad y pruebas'
      },
      {
        id: 4,
        level: 'Alto',
        author: 'Maria Lopez',
        name: 'Infraestructura',
        members: 2,
        tickets: 5,
        description: 'Infraestructura, CI/CD y despliegues'
      },
      {
        id: 5,
        level: 'Medio',
        author: 'Roberto Diaz',
        name: 'Diseno UX/UI',
        members: 3,
        tickets: 15,
        description: 'Diseno de experiencia e interfaz de usuario'
      }
    ];
  }
}
