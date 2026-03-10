import { Permission } from './permissions.model';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    permissions: Permission[];
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}
