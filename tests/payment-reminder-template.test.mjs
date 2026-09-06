import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { sendPaymentReminderWhatsApp } from "../src/lib/whatsapp.ts";
const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; mock.restoreAll(); });
test("plantilla de cuota envía los cinco parámetros en el orden aprobado, nunca hello_world", async () => {
    Object.assign(process.env, { WHATSAPP_ENABLED: "true", WHATSAPP_TEST_MODE: "false", WHATSAPP_PRODUCTION_SENDS_CONFIRMED: "true",
        ACCESS_TOKEN_WHATSAPP_BUSINESS: "test-token", PHONE_NUMBER_ID: "123", WHATSAPP_PAYMENT_TEMPLATE_NAME: "recordatorio_cuota", WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE: "es_AR" });
    let payload;
    mock.method(globalThis, "fetch", async (_url, options) => {
        payload = JSON.parse(options.body);
        return Response.json({ messages: [{ id: "qa-message" }] });
    });
    const input = { studentName: "Ana", studentPhone: "+5492230000000", periodLabel: "septiembre de 2026", planName: "Plan\n2", amountLabel: "$ 55.000", dueDateLabel: "10/09/2026" };
    assert.equal((await sendPaymentReminderWhatsApp(input)).status, "SENT");
    assert.equal(payload.template.name, "recordatorio_cuota"); assert.equal(payload.template.language.code, "es_AR");
    assert.deepEqual(payload.template.components[0].parameters.map((p) => p.text), ["Ana", "septiembre de 2026", "Plan 2", "$ 55.000", "10/09/2026"]);
    process.env.WHATSAPP_PAYMENT_TEMPLATE_NAME = "hello_world";
    await assert.rejects(sendPaymentReminderWhatsApp(input), /plantilla/);
});
