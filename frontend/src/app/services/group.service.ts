// Alias canónico de groups.service.ts (nombre singular según nueva estructura)
export { GroupsService as GroupService } from './groups.service';
// Re-exportar interfaces
export type { Group, GroupDetail, CreateGroupPayload, UpdateGroupPayload } from './groups.service';
