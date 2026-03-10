import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { Permission } from '../../models/permissions.model';

@Component({
    selector: 'app-ticket',
    standalone: true,
    imports: [ButtonModule, HasPermissionDirective],
    template: `
        <div class="card p-4">
            <h3>Tickets Management</h3>
            <div class="flex gap-2">

                <button 
                    *ifHasPermission="'${Permission.TICKET_VIEW}'"
                    pButton 
                    label="View Tickets" 
                    icon="pi pi-eye" 
                    class="p-button-info">
                </button>

                <button 
                    *ifHasPermission="'${Permission.TICKET_ADD}'"
                    pButton 
                    label="Add Ticket" 
                    icon="pi pi-plus" 
                    class="p-button-success">
                </button>

                <button 
                    *ifHasPermission="'${Permission.TICKET_EDIT}'"
                    pButton 
                    label="Edit Ticket" 
                    icon="pi pi-pencil" 
                    class="p-button-warning">
                </button>

                <button 
                    *ifHasPermission="'${Permission.TICKET_DELETE}'"
                    pButton 
                    label="Delete Ticket" 
                    icon="pi pi-trash" 
                    class="p-button-danger">
                </button>

            </div>
        </div>
    `
})
export class TicketComponent { }