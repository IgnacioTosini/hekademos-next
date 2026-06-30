import {
    decodeSessionPayload,
    getAuthSessionSecret,
    getSessionSigningInput,
    toBase64Url,
    type AuthSession,
} from "./session-cookie";

const textEncoder = new TextEncoder();

const signPayload = async (payload: string, secret: string) => {
    const key = await crypto.subtle.importKey(
        "raw",
        textEncoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, getSessionSigningInput(payload));

    return toBase64Url(new Uint8Array(signature));
};

export const verifyAuthSessionTokenEdge = async (token?: string | null): Promise<AuthSession | null> => {
    if (!token) return null;

    const secret = getAuthSessionSecret();
    if (!secret) return null;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expectedSignature = await signPayload(payload, secret);
    if (expectedSignature !== signature) return null;

    const session = decodeSessionPayload(payload);

    if (!session || session.expiresAt < Date.now()) return null;

    return session;
};
