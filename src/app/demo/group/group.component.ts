import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { Permission } from '../../models/permissions.model';

@Component({
    selector: 'app-group',
    standalone: true,
    imports: [ButtonModule, HasPermissionDirective],
    template: `
        <div class="card p-4">
            <h3>Groups Management</h3>
            <div class="flex gap-2">

                <button 
                    *ifHasPermission="'${Permission.GROUP_VIEW}'"
                    pButton 
                    label="View Groups" 
                    icon="pi pi-eye" 
                    class="p-button-info">
                </button>

                <button 
                    *ifHasPermission="'${Permission.GROUP_ADD}'"
                    pButton 
                    label="Add Group" 
                    icon="pi pi-plus" 
                    class="p-button-success">
                </button>

                <button 
                    *ifHasPermission="'${Permission.GROUP_DELETE}'"
                    pButton 
                    label="Delete Group" 
                    icon="pi pi-trash" 
                    class="p-button-danger">
                </button>

            </div>
        </div>
    `
})
export class GroupComponent { }