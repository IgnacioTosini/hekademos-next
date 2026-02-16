import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loginWithGoogle, saveToken, getToken, logout as removeToken } from '../../services/AuthService';
import type { JwtPayload, User } from '../../types';
import { AuthContext } from './authStore';

export type AuthCtx = {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;
    setToken: (t: string | null) => void;
    loginWithGoogle: () => Promise<void>;
    logout: () => void;
};

function parseJwt(token: string): JwtPayload | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const json = atob(base64);
        return JSON.parse(decodeURIComponent(Array.prototype.map.call(json, (c: string) =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')));
    } catch { return null; }
}

function userFromToken(t: string | null): User | null {
    if (!t) return null;
    const p = parseJwt(t);
    const valid = p?.exp ? p.exp * 1000 > Date.now() : true;
    if (!p || !valid) return null;
    return {
        id: p.sub,
        email: p.sub,
        name: p.name,
        rutine: typeof p.rutine === 'string' ? p.rutine : undefined,
        image: p?.picture as string | undefined,
        authorities: p.authorities as 'USER' | 'ADMIN',
    };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setTokenState] = useState<string | null>(() => getToken());
    const queryClient = useQueryClient();

    const { data: user } = useQuery<User | null>({
        queryKey: ['auth', 'user', token],
        queryFn: async () => userFromToken(token),
        enabled: !!token,
        initialData: () => userFromToken(token),
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const setToken = useCallback((t: string | null) => {
        setTokenState(t);
        if (t) {
            saveToken(t);
            queryClient.setQueryData(['auth', 'user', t], userFromToken(t));
            queryClient.setQueryData(['auth', 'user'], userFromToken(t));
        } else {
            removeToken();
            queryClient.removeQueries({ queryKey: ['auth', 'user'] });
        }
    }, [queryClient]);

    useEffect(() => {
        if (!token) return;
        const p = parseJwt(token);
        const expMs = p?.exp ? p.exp * 1000 : undefined;
        if (!expMs) return;
        const delay = expMs - Date.now();
        if (delay <= 0) {
            setTimeout(() => setToken(null), 0);
            return;
        }
        const t = setTimeout(() => setToken(null), delay);
        return () => clearTimeout(t);
    }, [token, setToken]);

    const isAuthenticated = !!user;

    const value = useMemo<AuthCtx>(() => ({
        token,
        user: user ?? null,
        isAuthenticated,
        setToken,
        loginWithGoogle: async () => {
            await loginWithGoogle();
            const stored = getToken();
            if (stored) setToken(stored);
        },
        logout: () => setToken(null),
    }), [token, user, isAuthenticated, setToken]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};