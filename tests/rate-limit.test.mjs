import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

import { consumeRateLimit, getClientIp } from "../src/lib/rate-limit.ts";

const scope = `qa-rate-limit-${randomUUID()}`;
let prisma;

before(() => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL debe estar configurada para probar rate limiting");
    prisma = new PrismaClient();
});

after(async () => {
    await prisma?.rateLimitBucket.deleteMany({
        where: {
            key: {
                startsWith: `${scope}:`,
            },
        },
    });
    await prisma?.$disconnect();
});

test("se obtiene la IP original usando encabezados de proxy conocidos", () => {
    const forwardedHeaders = new Headers({
        "x-forwarded-for": "203.0.113.20, 10.0.0.2",
        "x-real-ip": "198.51.100.3",
    });
    const realIpHeaders = new Headers({
        "x-real-ip": "198.51.100.3",
    });

    assert.equal(getClientIp(forwardedHeaders), "203.0.113.20");
    assert.equal(getClientIp(realIpHeaders), "198.51.100.3");
    assert.equal(getClientIp(new Headers()), "unknown");
});

test("el límite bloquea al exceder el cupo y no afecta a otro identificador", async () => {
    const now = new Date("2035-02-01T12:00:00.000Z");
    const input = {
        scope,
        identifier: "usuario-a@qa.test",
        limit: 3,
        windowMs: 60_000,
        now,
    };
    const attempts = [];

    for (let attempt = 0; attempt < 4; attempt += 1) {
        attempts.push(await consumeRateLimit(input));
    }

    const otherIdentifier = await consumeRateLimit({
        ...input,
        identifier: "usuario-b@qa.test",
    });

    assert.deepEqual(attempts.map((attempt) => attempt.allowed), [true, true, true, false]);
    assert.deepEqual(attempts.map((attempt) => attempt.remaining), [2, 1, 0, 0]);
    assert.equal(attempts[3].retryAfterSeconds, 60);
    assert.equal(otherIdentifier.allowed, true);
});

test("una ventana vencida reinicia el contador", async () => {
    const firstWindow = new Date("2035-02-01T13:00:00.000Z");
    const input = {
        scope,
        identifier: "ventana@qa.test",
        limit: 1,
        windowMs: 10_000,
    };

    const first = await consumeRateLimit({ ...input, now: firstWindow });
    const blocked = await consumeRateLimit({ ...input, now: firstWindow });
    const reset = await consumeRateLimit({
        ...input,
        now: new Date(firstWindow.getTime() + input.windowMs + 1),
    });

    assert.equal(first.allowed, true);
    assert.equal(blocked.allowed, false);
    assert.equal(reset.allowed, true);
    assert.equal(reset.remaining, 0);
});

test("las solicitudes simultáneas respetan el límite de forma atómica", async () => {
    const now = new Date("2035-02-01T14:00:00.000Z");
    const results = await Promise.all(
        Array.from({ length: 20 }, () => consumeRateLimit({
            scope,
            identifier: "concurrencia@qa.test",
            limit: 5,
            windowMs: 60_000,
            now,
        }))
    );
    const storedBuckets = await prisma.rateLimitBucket.findMany({
        where: {
            key: {
                startsWith: `${scope}:`,
            },
        },
        select: {
            key: true,
        },
    });

    assert.equal(results.filter((result) => result.allowed).length, 5);
    assert.equal(results.filter((result) => !result.allowed).length, 15);
    assert.equal(storedBuckets.some((bucket) => bucket.key.includes("concurrencia@qa.test")), false);
});
