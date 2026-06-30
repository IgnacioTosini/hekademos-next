import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
    authSessionCookieName,
    authSessionMaxAgeSeconds,
    decodeSessionPayload,
    encodeSessionPayload,
    getAuthSessionSecret,
    type AuthSession,
    toBase64Url,
} from "./session-cookie";

const signPayload = (payload: string, secret: string) => (
    toBase64Url(createHmac("sha256", secret).update(payload).digest())
);

export const createAuthSessionToken = (session: Omit<AuthSession, "expiresAt">) => {
    const secret = getAuthSessionSecret();

    if (!secret) {
        throw new Error("Falta configurar AUTH_SESSION_SECRET");
    }

    const payload = encodeSessionPayload({
        ...session,
        expiresAt: Date.now() + authSessionMaxAgeSeconds * 1000,
    });
    const signature = signPayload(payload, secret);

    return `${payload}.${signature}`;
};

export const verifyAuthSessionToken = (token?: string | null): AuthSession | null => {
    if (!token) return null;

    const secret = getAuthSessionSecret();
    if (!secret) return null;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = signPayload(payload, secret);
    const expectedBuffer = Buffer.from(expectedSignature);
    const receivedBuffer = Buffer.from(signature);

    if (
        expectedBuffer.length !== receivedBuffer.length
        || !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
        return null;
    }

    const session = decodeSessionPayload(payload);

    if (!session || session.expiresAt < Date.now()) return null;

    return session;
};

export const getCurrentAuthSession = async () => {
    const cookieStore = await cookies();

    return verifyAuthSessionToken(cookieStore.get(authSessionCookieName)?.value);
};

export const setAuthSessionCookie = async (session: Omit<AuthSession, "expiresAt">) => {
    const cookieStore = await cookies();
    const token = createAuthSessionToken(session);

    cookieStore.set(authSessionCookieName, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: authSessionMaxAgeSeconds,
    });
};

export const clearAuthSessionCookie = async () => {
    const cookieStore = await cookies();

    cookieStore.delete(authSessionCookieName);
};
