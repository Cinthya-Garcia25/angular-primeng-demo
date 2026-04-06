// Alias canónico de users.service.ts (nombre singular según nueva estructura)
export { UsersService as UserService } from './users.service';
// Re-exportar interfaces
export type { User, UpdateUserPayload } from './users.service';
