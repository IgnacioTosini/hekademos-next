import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type RateLimitPolicy = {
    limit: number;
    windowMs: number;
};

export type RateLimitResult = {
    allowed: boolean;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
    expiresAt: Date;
};

type ConsumeRateLimitInput = RateLimitPolicy & {
    scope: string;
    identifier: string;
    now?: Date;
};

type RateLimitRow = {
    count: number;
    expiresAt: Date;
};

export const rateLimitPolicies = {
    loginIp: { limit: 30, windowMs: 15 * 60 * 1000 },
    loginIdentity: { limit: 6, windowMs: 15 * 60 * 1000 },
    passwordResetRequestIp: { limit: 5, windowMs: 60 * 60 * 1000 },
    passwordResetRequestIdentity: { limit: 3, windowMs: 60 * 60 * 1000 },
    passwordResetCompleteIp: { limit: 15, windowMs: 15 * 60 * 1000 },
    passwordResetCompleteIdentity: { limit: 5, windowMs: 15 * 60 * 1000 },
    contactIp: { limit: 5, windowMs: 60 * 60 * 1000 },
    contactIdentity: { limit: 3, windowMs: 60 * 60 * 1000 },
    communityCommentWrite: { limit: 10, windowMs: 60 * 1000 },
    imageUpload: { limit: 20, windowMs: 10 * 60 * 1000 },
} as const satisfies Record<string, RateLimitPolicy>;

const normalizeIdentifier = (identifier: string) => (
    identifier.trim().toLocaleLowerCase("en-US") || "unknown"
);

const getBucketKey = (scope: string, identifier: string) => {
    const identifierHash = createHash("sha256")
        .update(normalizeIdentifier(identifier))
        .digest("hex");

    return `${scope}:${identifierHash}`;
};

export const getClientIp = (requestHeaders: Pick<Headers, "get">) => {
    const forwardedFor = requestHeaders.get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim();

    return forwardedFor
        || requestHeaders.get("x-real-ip")?.trim()
        || requestHeaders.get("cf-connecting-ip")?.trim()
        || "unknown";
};

export const consumeRateLimit = async ({
    scope,
    identifier,
    limit,
    windowMs,
    now = new Date(),
}: ConsumeRateLimitInput): Promise<RateLimitResult> => {
    if (!scope.trim()) throw new Error("El alcance del rate limit es obligatorio");
    if (!Number.isInteger(limit) || limit < 1) throw new Error("El límite debe ser mayor a cero");
    if (!Number.isFinite(windowMs) || windowMs < 1000) throw new Error("La ventana debe ser de al menos un segundo");

    const key = getBucketKey(scope.trim(), identifier);
    const nextExpiresAt = new Date(now.getTime() + windowMs);
    const maximumStoredCount = limit + 1;
    const [bucket] = await prisma.$queryRaw<RateLimitRow[]>`
        INSERT INTO "RateLimitBucket" (
            "key",
            "count",
            "windowStart",
            "expiresAt",
            "updatedAt"
        )
        VALUES (
            ${key},
            1,
            ${now},
            ${nextExpiresAt},
            ${now}
        )
        ON CONFLICT ("key") DO UPDATE
        SET
            "count" = CASE
                WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN 1
                ELSE LEAST("RateLimitBucket"."count" + 1, ${maximumStoredCount})
            END,
            "windowStart" = CASE
                WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN ${now}
                ELSE "RateLimitBucket"."windowStart"
            END,
            "expiresAt" = CASE
                WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN ${nextExpiresAt}
                ELSE "RateLimitBucket"."expiresAt"
            END,
            "updatedAt" = ${now}
        RETURNING "count", "expiresAt"
    `;

    if (!bucket) throw new Error("No se pudo verificar el límite de solicitudes");

    const allowed = bucket.count <= limit;

    return {
        allowed,
        limit,
        remaining: Math.max(limit - bucket.count, 0),
        retryAfterSeconds: allowed
            ? 0
            : Math.max(1, Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000)),
        expiresAt: bucket.expiresAt,
    };
};

export const getRateLimitMessage = (result: RateLimitResult) => {
    const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));

    return `Demasiados intentos. Probá nuevamente en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
};
