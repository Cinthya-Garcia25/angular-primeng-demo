import { Permission } from './permissions.model';

export interface AuthGroup {
    id: string;
    name: string;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    permissions: Permission[];
    groups: AuthGroup[];
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}
