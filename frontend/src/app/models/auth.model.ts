import { Permission } from './permissions.model';

// Esquema global de respuesta del API Gateway
export interface ApiResponse<T> {
    statusCode: number;
    intOpCode: string;
    data: T[] | null;
    message?: string;
}

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

export interface AuthData {
    token: string;
    user: AuthUser;
}

// Alias para la respuesta de login
export type AuthResponse = ApiResponse<AuthData>;
