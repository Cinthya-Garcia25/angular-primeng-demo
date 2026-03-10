import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { Permission } from '../../models/permissions.model';

@Component({
    selector: 'app-user',
    standalone: true,
    imports: [ButtonModule, HasPermissionDirective],
    template: `
        <div class="card p-4">
            <h3>Users Management</h3>
            <div class="flex gap-2">

                <button 
                    *ifHasPermission="'${Permission.USERS_VIEW}'"
                    pButton 
                    label="View Users List" 
                    icon="pi pi-users" 
                    class="p-button-info">
                </button>

                <button 
                    *ifHasPermission="'${Permission.USER_ADD}'"
                    pButton 
                    label="Add User" 
                    icon="pi pi-plus" 
                    class="p-button-success">
                </button>

                <button 
                    *ifHasPermission="'${Permission.USER_EDIT}'"
                    pButton 
                    label="Edit User" 
                    icon="pi pi-pencil" 
                    class="p-button-warning">
                </button>

                <button 
                    *ifHasPermission="'${Permission.USER_DELETE}'"
                    pButton 
                    label="Delete User" 
                    icon="pi pi-trash" 
                    class="p-button-danger">
                </button>

            </div>
        </div>
    `
})
export class UserComponent { }