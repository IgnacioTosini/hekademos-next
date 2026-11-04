import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, mock, test } from "node:test";
const recorded = [];
const states = new Map();
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: {
    whatsAppMessageDelivery: {
        create: async ({ data }) => {
            if (states.has(data.messageId)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
            states.set(data.messageId, { ...data }); recorded.push(data);
        },
        updateMany: async ({ where, data }) => {
            const current = states.get(where.messageId);
            if (!current || !where.status.in.includes(current.status)
                || (current.statusAt && current.statusAt > data.statusAt)) return { count: 0 };
            Object.assign(current, data); return { count: 1 };
        },
        upsert: async ({ where, create, update }) => {
            states.set(where.messageId, { ...(states.get(where.messageId) ?? create), ...update });
        },
    },
} } });
const { recordAcceptedWhatsAppMessage, recordWhatsAppStatusEvent } = await import("../src/lib/whatsapp-delivery.ts");
const { GET, POST } = await import("../src/app/api/webhooks/whatsapp/route.ts");

const originalEnv = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnv };
    recorded.length = 0;
    states.clear();
});

test("los estados repetidos o tardíos no retroceden y la aceptación conserva el estado previo", async () => {
    const messageId = "wamid.out-of-order";
    const at = new Date("2026-11-04T12:00:00Z");
    const event = (status, occurredAt) => ({ messageId, status, occurredAt, errorCode: null, errorText: null });
    await recordWhatsAppStatusEvent(event("DELIVERED", at));
    await recordAcceptedWhatsAppMessage({ messageId, kind: "SCHEDULE_CHANGE", referenceId: "request-1" });
    assert.equal(states.get(messageId).status, "DELIVERED");
    assert.equal(states.get(messageId).referenceId, "request-1");
    await recordWhatsAppStatusEvent(event("SENT", new Date(at.getTime() - 1000)));
    await recordWhatsAppStatusEvent(event("DELIVERED", at));
    assert.equal(states.get(messageId).status, "DELIVERED");
    await recordWhatsAppStatusEvent(event("READ", new Date(at.getTime() + 1000)));
    assert.equal(states.get(messageId).status, "READ");
});

test("el webhook firmado registra estados de entrega y descarta eventos ajenos", async () => {
    process.env.META_APP_SECRET = "meta-secret-for-testing";
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{
        field: "messages", value: { statuses: [
            { id: "wamid.delivery-test", status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)) },
            { id: "other-id", status: "read", timestamp: String(Math.floor(Date.now() / 1000)) },
        ] },
    }] }] });
    const signature = `sha256=${createHmac("sha256", process.env.META_APP_SECRET).update(body).digest("hex")}`;
    const response = await POST(new Request("https://hekademos.example.com/api/webhooks/whatsapp", {
        method: "POST", headers: { "x-hub-signature-256": signature }, body,
    }));
    assert.equal(response.status, 200);
    assert.equal(recorded.length, 1);
    assert.equal(recorded[0].status, "DELIVERED");
    assert.equal(recorded[0].messageId, "wamid.delivery-test");
});

test("Meta puede verificar el webhook únicamente con el secreto configurado", async () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "verify-token-seguro";
    const valid = GET(new Request(
        "https://hekademos.example.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-token-seguro&hub.challenge=12345"
    ));
    assert.equal(valid.status, 200);
    assert.equal(await valid.text(), "12345");

    const invalid = GET(new Request(
        "https://hekademos.example.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=12345"
    ));
    assert.equal(invalid.status, 403);
});

test("el webhook acepta eventos firmados por Meta y rechaza cuerpos alterados", async () => {
    process.env.META_APP_SECRET = "meta-secret-for-testing";
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const signature = `sha256=${createHmac("sha256", process.env.META_APP_SECRET).update(body).digest("hex")}`;

    const valid = await POST(new Request("https://hekademos.example.com/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "x-hub-signature-256": signature },
        body,
    }));
    assert.equal(valid.status, 200);

    const invalid = await POST(new Request("https://hekademos.example.com/api/webhooks/whatsapp", {
        method: "POST",
        headers: { "x-hub-signature-256": signature },
        body: `${body}alterado`,
    }));
    assert.equal(invalid.status, 401);
});
