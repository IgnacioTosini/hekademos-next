export type User = {
    id: string;
    email: string;
    name?: string;
    image?: string;
    rutine?: string;
    role?: 'ADMIN' | 'COACH' | 'STUDENT';
    authorities?: 'ADMIN' | 'COACH' | 'STUDENT';
};

export type JwtPayload = {
    sub: string;
    name?: string;
    exp?: number;
    picture?: string;
    [key: string]: unknown
};

export * as SchemaTypes from './schema';
