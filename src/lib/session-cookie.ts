import type { Role } from "@/types/schema/users";

export const authSessionCookieName = "hekademos-session";
export const authSessionMaxAgeSeconds = 60 * 60 * 24 * 7;

export type AuthSession = {
    userId: string;
    email: string;
    name: string | null;
    role: Role;
    sessionVersion: number;
    expiresAt: number;
};

const validRoles = new Set<Role>(["ADMIN", "COACH", "STUDENT"]);

const isAuthSession = (value: unknown): value is AuthSession => {
    if (!value || typeof value !== "object") return false;

    const session = value as Partial<AuthSession>;

    return typeof session.userId === "string"
        && session.userId.length > 0
        && typeof session.email === "string"
        && session.email.length > 0
        && (typeof session.name === "string" || session.name === null)
        && typeof session.role === "string"
        && validRoles.has(session.role as Role)
        && Number.isInteger(session.sessionVersion)
        && (session.sessionVersion ?? -1) >= 0
        && typeof session.expiresAt === "number"
        && Number.isFinite(session.expiresAt);
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const getAuthSessionSecret = () => {
    const secret = process.env.AUTH_SESSION_SECRET;

    if (secret) return secret;
    if (process.env.NODE_ENV !== "production") return "hekademos-dev-session-secret";

    return "";
};

const bytesToBase64 = (bytes: Uint8Array) => {
    let binary = "";

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary);
};

const base64ToBytes = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
};

export const toBase64Url = (input: Uint8Array | string) => {
    const bytes = typeof input === "string" ? textEncoder.encode(input) : input;

    return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const fromBase64Url = (input: string) => {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

    return base64ToBytes(padded);
};

export const encodeSessionPayload = (session: AuthSession) => (
    toBase64Url(JSON.stringify(session))
);

export const decodeSessionPayload = (payload: string): AuthSession | null => {
    try {
        const session = JSON.parse(textDecoder.decode(fromBase64Url(payload))) as unknown;

        return isAuthSession(session) ? session : null;
    } catch {
        return null;
    }
};

export const getSessionSigningInput = (payload: string) => (
    textEncoder.encode(payload)
);
