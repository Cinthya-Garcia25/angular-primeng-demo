import { Permission } from '../models/permissions.model';

/**
 * Permisos completos que debe tener un usuario administrador
 */
export const ADMIN_PERMISSIONS: Permission[] = [
  // Permisos de grupos (según tu lista)
  Permission.GROUP_VIEW,
  Permission.GROUP_EDIT,
  Permission.GROUP_ADD,
  Permission.GROUP_DELETE,

  // Permisos de tickets (según tu lista)
  Permission.TICKET_VIEW,
  Permission.TICKET_EDIT,
  Permission.TICKET_ADD,
  Permission.TICKET_DELETE,
  Permission.TICKET_EDIT_STATE,

  // Permisos de usuarios (según tu lista)
  Permission.USER_VIEW,
  Permission.USER_VIEW_ALL,
  Permission.USER_EDIT,
  Permission.USER_ADD,
  Permission.USER_REMOVE,

  // Permisos adicionales de gestión (recomendados)
  Permission.PERMISSIONS_MANAGE
];

/**
 * Permisos básicos para un usuario normal (por default)
 */
export const USER_PERMISSIONS: Permission[] = [
  Permission.GROUP_VIEW,        // Puede ver grupos
  Permission.TICKET_VIEW,       // Puede ver tickets
  Permission.TICKET_EDIT_STATE, // Puede cambiar estado de tickets
  Permission.USER_VIEW,         // Puede ver su perfil
  Permission.USER_EDIT          // Puede editar su perfil
];

/**
 * Verifica si un conjunto de permisos corresponde a un administrador
 */
export function isAdmin(permissions: string[]): boolean {
  return ADMIN_PERMISSIONS.some(perm => permissions.includes(perm));
}

/**
 * Verifica si un conjunto de permisos corresponde a un usuario normal
 */
export function isNormalUser(permissions: string[]): boolean {
  return !isAdmin(permissions);
}
