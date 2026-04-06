export const GroupPermissions = {
    VIEW: 'group.view',
    EDIT: 'group.edit',
    ADD: 'group.add',
    DELETE: 'group.delete'
};

export const TicketPermissions = {
    VIEW: 'ticket.view',
    EDIT: 'ticket.edit',
    ADD: 'ticket.add',
    DELETE: 'ticket.delete',
    EDIT_STATE: 'ticket.edit_state'
};

export const UserPermissions = {
    VIEW: 'user.view',
    VIEW_ALL: 'user:view:all',
    EDIT: 'user.edit',
    ADD: 'user.add',
    REMOVE: 'user.remove'
};

export const AllPermissions = [
    ...Object.values(GroupPermissions),
    ...Object.values(TicketPermissions),
    ...Object.values(UserPermissions)
];
