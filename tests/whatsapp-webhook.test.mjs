import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, test } from "node:test";
import { GET, POST } from "../src/app/api/webhooks/whatsapp/route.ts";

const originalEnv = { ...process.env };

afterEach(() => {
    process.env = { ...originalEnv };
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
