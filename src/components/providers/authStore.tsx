import { createContext, useContext } from "react";
import type { AuthCtx } from "./authContext";

export const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};