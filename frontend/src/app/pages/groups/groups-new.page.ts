import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
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
import { GroupsService, Group } from '../../services/groups.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-groups-page',
  imports: [
    CommonModule,
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
    HasPermissionDirective,
    DatePipe
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
  private readonly groupsService = inject(GroupsService);
  private readonly sub = new Subscription();

  readonly levelOptions = [
    { label: 'Alto',  value: 'Alto'  },
    { label: 'Medio', value: 'Medio' },
    { label: 'Bajo',  value: 'Bajo'  }
  ];

  groups: Group[] = [];
  searchValue = '';
  dialogVisible = false;
  deleteDialogVisible = false;
  isEditing = false;
  groupToDelete: Group | null = null;

  readonly groupForm = this.fb.group({
    level:       ['Medio', [Validators.required]],
    author:      ['',      [Validators.required, Validators.minLength(3)]],
    name:        ['',      [Validators.required, Validators.minLength(3)]],
    description: ['',      [Validators.required, Validators.minLength(10)]]
  });

  private editingGroupId: string | null = null;

  constructor() {
    this.loadGroups();
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private loadGroups(): void {
    this.sub.add(
      this.groupsService.getAll().subscribe({
        next: (groups) => {
          this.groups = groups;
          console.log('Grupos cargados desde backend:', groups);
        },
        error: (error) => {
          console.error('Error cargando grupos:', error);
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudieron cargar los grupos' 
          });
        }
      })
    );
  }

  get filteredGroups(): Group[] {
    const query = this.searchValue.trim().toLowerCase();
    if (!query) return this.groups;
    
    return this.groups.filter(group =>
      [group.nombre || '', group.descripcion || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }

  controlHasError(controlName: 'level' | 'author' | 'name' | 'description'): boolean {
    const control = this.groupForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  openCreateDialog(): void {
    this.isEditing = false;
    this.editingGroupId = null;
    this.groupForm.reset({ level: 'Medio', author: '', name: '', description: '' });
    this.dialogVisible = true;
  }

  openEditDialog(group: Group): void {
    this.isEditing = true;
    this.editingGroupId = group.id;
    this.groupForm.reset({ 
      level: 'Medio', 
      author: '', 
      name: group.nombre, 
      description: group.descripcion || '' 
    });
    this.dialogVisible = true;
  }

  enterGroup(group: Group): void {
    sessionStorage.setItem('selectedGroupId', group.id);
    sessionStorage.setItem('selectedGroupName', group.nombre);
    this.messageService.add({ 
      severity: 'success', 
      summary: 'Grupo cambiado', 
      detail: `Ahora estás trabajando en: ${group.nombre}` 
    });
    setTimeout(() => this.router.navigate(['/pages/group-dashboard']), 800);
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
      description: value.description?.trim() || ''
    };

    if (this.isEditing && this.editingGroupId) {
      // Editar grupo existente
      this.groupsService.update(this.editingGroupId, payload).subscribe({
        next: () => {
          this.loadGroups(); // Recargar grupos desde backend
          this.closeDialog();
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Grupo actualizado', 
            detail: 'El grupo se ha actualizado correctamente' 
          });
        },
        error: (error) => {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudo actualizar el grupo' 
          });
        }
      });
    } else {
      // Crear nuevo grupo
      this.groupsService.create(payload).subscribe({
        next: () => {
          this.loadGroups(); // Recargar grupos desde backend
          this.closeDialog();
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Grupo creado', 
            detail: 'El grupo se ha creado correctamente' 
          });
        },
        error: (error) => {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: 'No se pudo crear el grupo' 
          });
        }
      });
    }
  }

  askDeleteGroup(group: Group): void { 
    this.groupToDelete = group; 
    this.deleteDialogVisible = true; 
  }

  confirmDeleteGroup(): void {
    if (!this.groupToDelete) return;
    
    this.groupsService.delete(this.groupToDelete.id).subscribe({
      next: () => {
        this.loadGroups(); // Recargar grupos desde backend
        this.closeDeleteDialog();
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Grupo eliminado', 
          detail: 'El grupo se ha eliminado correctamente' 
        });
      },
      error: (error) => {
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudo eliminar el grupo' 
        });
      }
    });
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
    if (level === 'Alto') return 'danger';
    if (level === 'Medio') return 'warn';
    if (level === 'Bajo') return 'success';
    return 'info';
  }
}
