import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
const deliveries = new Map();
const messages = [];
const emails = [];
let students = [];
let paid = false;
let whatsappStatus = "SENT";
let emailFails = false;
let persistFails = false;
const keyOf = (key) => `${key.studentId}:${key.periodStart.toISOString()}:${key.reminderType}`;
mock.module("../src/lib/prisma.ts", { namedExports: { prisma: {
    student: { findMany: async ({ where, take, cursor }) => students.filter((student) => (!cursor || student.id > cursor.id) && student.user.status === where.user.status && student.memberships.some((m) => m.status === "ACTIVE" && m.startDate <= where.memberships.some.startDate.lte && (!m.endDate || m.endDate >= where.memberships.some.startDate.lte))).sort((a, b) => a.id.localeCompare(b.id)).slice(0, take) },
    payment: { findUnique: async () => paid ? { status: "PAID" } : null },
    paymentReminderDelivery: {
        create: async ({ data }) => {
            const key = keyOf(data);
            if (deliveries.has(key)) throw Object.assign(new Error("duplicate"), { code: "P2002" });
            deliveries.set(key, { ...data, status: "PROCESSING" });
        },
        updateMany: async ({ where, data }) => {
            const item = deliveries.get(keyOf(where));
            if (item?.status !== where.status) return { count: 0 };
            Object.assign(item, data); return { count: 1 };
        },
        update: async ({ where, data }) => {
            if (persistFails) throw new Error("DB unavailable after provider acceptance");
            Object.assign(deliveries.get(keyOf(where.studentId_periodStart_reminderType)), data);
        },
    },
} } });
mock.module("../src/lib/email/index.ts", { namedExports: {
    buildEmailMessage: (event) => event,
    sendEmail: async (message) => { emails.push(message); if (emailFails) throw new Error("SMTP failed"); },
} });
mock.module("../src/lib/whatsapp.ts", { namedExports: { sendPaymentReminderWhatsApp: async (message) => {
    messages.push(message);
    if (whatsappStatus === "FAILED") throw new Error("Meta failed");
    return { status: message.studentPhone ? whatsappStatus : "SKIPPED_NO_RECIPIENT", messageId: "test-id", testMode: false };
} } });
const { sendPaymentReminders } = await import("../src/services/payment-reminders.ts");
const { getArgentinaCalendarDate } = await import("../src/lib/payment-reminder-calendar.ts");
const { GET } = await import("../src/app/api/cron/payment-reminders/route.ts");
const input = { year: 2026, month: 9, now: new Date("2026-09-01T12:00:00Z") };
const student = () => ({ id: "qa-student", firstName: "Ana", lastName: "Prueba",
    user: { name: "Ana Prueba", status: "ACTIVE", email: "ana@gmail.com", phone: "+5492230000000" },
    memberships: [{ status: "ACTIVE", startDate: new Date("2026-08-01"), endDate: null, monthlyPriceCents: 5500000, plan: { name: "Plan 2", priceCents: 6000000, currency: "ARS" } }],
});
const prepare = () => { students = [student()]; mock.method(console, "warn", () => {}); mock.method(console, "error", () => {}); };
const originalEnv = { ...process.env };
afterEach(() => {
    deliveries.clear(); messages.length = 0; emails.length = 0; students = [];
    paid = false; whatsappStatus = "SENT"; emailFails = false; persistFails = false;
    process.env = { ...originalEnv }; mock.restoreAll();
});
test("cuota mensual por WhatsApp con importe personalizado y sin email", async () => {
    prepare(); const result = await sendPaymentReminders(input);
    assert.equal(result.whatsappCount, 1); assert.equal(emails.length, 0);
    assert.equal(messages[0].periodLabel, "septiembre de 2026");
    assert.equal(messages[0].dueDateLabel, "10/09/2026"); assert.match(messages[0].amountLabel, /55.000/);
});
test("fallo WhatsApp: respaldo exclusivamente al email del alumno", async () => {
    prepare(); whatsappStatus = "FAILED";
    const result = await sendPaymentReminders(input);
    assert.equal(result.emailCount, 1); assert.equal(emails[0].to.email, "ana@gmail.com");
});
test("sin teléfono o WhatsApp desactivado se usa email", async () => {
    prepare(); students[0].user.phone = null;
    assert.equal((await sendPaymentReminders(input)).emailCount, 1);
    deliveries.clear(); students[0].user.phone = "+5492230000000"; whatsappStatus = "DISABLED";
    assert.equal((await sendPaymentReminders(input)).emailCount, 1);
});
test("email inválido no impide WhatsApp; sin ambos canales se registra fallo", async () => {
    prepare(); students[0].user.email = "invalido";
    assert.equal((await sendPaymentReminders(input)).whatsappCount, 1);
    deliveries.clear(); students[0].user.phone = null;
    const result = await sendPaymentReminders(input);
    assert.equal(result.failedCount, 1); assert.equal(result.invalidEmailCount, 1);
});
test("alumno pagado, inactivo o con membresía futura/vencida no recibe recordatorios", async () => {
    prepare(); paid = true;
    assert.equal((await sendPaymentReminders(input)).alreadyPaidCount, 1);
    paid = false; students[0].user.status = "INACTIVE"; await sendPaymentReminders(input);
    students[0].user.status = "ACTIVE"; students[0].memberships[0].startDate = new Date("2026-10-01"); await sendPaymentReminders(input);
    students[0].memberships[0].startDate = new Date("2026-08-01"); students[0].memberships[0].endDate = new Date("2026-08-31"); await sendPaymentReminders(input);
    assert.equal(messages.length, 0); assert.equal(emails.length, 0);
});
test("ejecuciones concurrentes y repetidas no duplican envíos", async () => {
    prepare(); await Promise.all([sendPaymentReminders(input), sendPaymentReminders(input)]);
    const again = await sendPaymentReminders(input);
    assert.equal(messages.length, 1); assert.equal(again.duplicateCount, 1);
    await sendPaymentReminders({ ...input, month: 10 }); assert.equal(messages.length, 2);
});
test("fallos de ambos proveedores permiten reintento, sin repetir éxitos", async () => {
    prepare(); whatsappStatus = "FAILED"; emailFails = true;
    assert.equal((await sendPaymentReminders(input)).failedCount, 1);
    whatsappStatus = "SENT"; emailFails = false;
    assert.equal((await sendPaymentReminders(input)).sentCount, 1);
    assert.equal((await sendPaymentReminders(input)).duplicateCount, 1);
});
test("se procesan más de 50 alumnos sin perder la segunda página", async () => {
    prepare(); students = Array.from({ length: 56 }, (_, index) => ({ ...student(), id: `qa-${String(index).padStart(3, "0")}` }));
    assert.equal((await sendPaymentReminders(input)).sentCount, 56);
    assert.equal(deliveries.size, 56);
    assert.equal((await sendPaymentReminders(input)).duplicateCount, 56);
    assert.equal(messages.length, 56);
});
test("fallo de persistencia tras aceptación no manda email ni reenvía automáticamente", async () => {
    prepare(); persistFails = true;
    await assert.rejects(sendPaymentReminders(input)); persistFails = false;
    assert.equal((await sendPaymentReminders(input)).duplicateCount, 1);
    assert.equal(messages.length, 1); assert.equal(emails.length, 0);
});
test("se respeta el presupuesto temporal y no se redirigen lotes al teléfono de prueba", async () => {
    prepare(); assert.equal((await sendPaymentReminders({ ...input, budgetMs: 0 })).incomplete, true);
    process.env.WHATSAPP_ENABLED = "true"; process.env.WHATSAPP_TEST_MODE = "true";
    await assert.rejects(sendPaymentReminders(input), /WHATSAPP_TEST_MODE/); assert.equal(messages.length, 0);
});
test("calendario argentino independiente de UTC, fin de año y febrero", () => {
    assert.deepEqual(getArgentinaCalendarDate(new Date("2027-01-01T02:59:59Z")), { year: 2026, month: 12, day: 31 });
    assert.deepEqual(getArgentinaCalendarDate(new Date("2027-01-01T03:00:00Z")), { year: 2027, month: 1, day: 1 });
    assert.deepEqual(getArgentinaCalendarDate(new Date("2028-03-01T02:00:00Z")), { year: 2028, month: 2, day: 29 });
});
test("cron rechaza secretos ausentes o inválidos y no ejecuta en preview/deshabilitado", async () => {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(new Request("https://test/api/cron/payment-reminders"))).status, 401);
    process.env.CRON_SECRET = "a".repeat(32);
    assert.equal((await GET(new Request("https://test/api/cron/payment-reminders", { headers: { authorization: "Bearer " + "b".repeat(32) } }))).status, 401);
    const request = () => new Request("https://test/api/cron/payment-reminders", { headers: { authorization: "Bearer " + process.env.CRON_SECRET } });
    process.env.VERCEL_ENV = "preview"; process.env.PAYMENT_REMINDERS_ENABLED = "true";
    assert.match((await (await GET(request())).json()).skipped, /deshabilitada/);
    process.env.VERCEL_ENV = "production"; process.env.PAYMENT_REMINDERS_ENABLED = "false";
    assert.match((await (await GET(request())).json()).skipped, /deshabilitada/);
    assert.equal(messages.length, 0);
});
test("cron solo envía el día 1 de Argentina", async () => {
    prepare(); process.env.CRON_SECRET = "a".repeat(32); process.env.PAYMENT_REMINDERS_ENABLED = "true"; process.env.VERCEL_ENV = "production";
    const request = () => new Request("https://test/api/cron/payment-reminders", { headers: { authorization: "Bearer " + process.env.CRON_SECRET } });
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-01T02:00:00Z") });
    assert.match((await (await GET(request())).json()).skipped, /dia 1/);
    mock.timers.setTime(new Date("2026-09-01T12:00:00Z").getTime());
    assert.equal((await GET(request())).status, 200); assert.equal(messages.length, 1);
    mock.timers.reset();
});
