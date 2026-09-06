import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";

const emails = [];
const messages = [];
let whatsappFails = false;
let emailFails = false;

mock.module("../src/lib/prisma.ts", {
    namedExports: { prisma: { weeklyClassSchedule: { findMany: async () => [
        { dayOfWeek: "FRIDAY", startTime: "07:30", durationMinutes: 90, classCategory: "Calistenia" },
    ] } } },
});
mock.module("../src/lib/email/index.ts", {
    namedExports: {
        buildEmailMessage: (event) => event,
        sendEmail: async (message) => {
            emails.push(message);
            if (emailFails) throw new Error("SMTP de prueba no disponible");
        },
    },
});
mock.module("../src/lib/whatsapp.ts", {
    namedExports: {
        sendScheduleChangeWhatsApp: async (message) => {
            messages.push(message);
            if (whatsappFails) throw new Error("WhatsApp de prueba no disponible");
            return { status: message.studentPhone ? "SENT" : "SKIPPED_NO_RECIPIENT" };
        },
    },
});

const { sendAutomaticScheduleChangeNotification } = await import("../src/services/schedule-change-notification.ts");
const student = {
    firstName: "Alumno", lastName: "Prueba",
    user: { name: "Alumno Prueba", email: " alumno@gmail.com ", phone: "5492230000000" },
};
const input = { student, type: "ONE_TIME", requestedScheduleIds: ["turno-prueba"], requestedDate: new Date(2026, 8, 4, 7, 30) };

afterEach(() => {
    emails.length = 0;
    messages.length = 0;
    whatsappFails = false;
    emailFails = false;
    mock.restoreAll();
});

test("WhatsApp exitoso confirma la fecha temporal y evita el email", async () => {
    const result = await sendAutomaticScheduleChangeNotification(input);
    assert.equal(result.status, "SENT");
    assert.deepEqual(result.recipients, ["student:whatsapp"]);
    assert.equal(emails.length, 0);
    assert.equal(messages[0].requestedSchedulesLabel, "Calistenia · Viernes 07:30 a 09:00");
    assert.match(messages[0].validityLabel, /4 de septiembre/);
    assert.match(messages[0].validityLabel, /horario habitual/);
});

test("si WhatsApp falla, el respaldo va únicamente al alumno", async () => {
    whatsappFails = true;
    mock.method(console, "error", () => {});
    const result = await sendAutomaticScheduleChangeNotification(input);
    assert.equal(result.status, "SENT");
    assert.equal(result.whatsappStatus, "FAILED");
    assert.deepEqual(result.recipients, ["alumno@gmail.com"]);
    assert.equal(emails.length, 1);
    assert.equal(emails[0].to.email, "alumno@gmail.com");
});

test("un cambio permanente comunica que el horario queda fijo", async () => {
    await sendAutomaticScheduleChangeNotification({ ...input, type: "PERMANENT", requestedDate: null });
    assert.equal(messages[0].validityLabel, "Este cambio queda como tu horario permanente.");
    assert.equal(emails.length, 0);
});

test("sin teléfono se utiliza el email del alumno", async () => {
    const result = await sendAutomaticScheduleChangeNotification({
        ...input, student: { ...student, user: { ...student.user, phone: null } },
    });
    assert.equal(result.status, "SENT");
    assert.equal(result.whatsappStatus, "SKIPPED_NO_RECIPIENT");
    assert.equal(emails.length, 1);
});

test("sin destinatarios válidos se omite la notificación", async () => {
    const result = await sendAutomaticScheduleChangeNotification({
        ...input, student: { ...student, user: { ...student.user, phone: null, email: "" } },
    });
    assert.equal(result.status, "SKIPPED_NO_RECIPIENT");
    assert.equal(emails.length, 0);
});

test("si fallan ambos canales se informa el fallo sin simular un envío", async () => {
    whatsappFails = true;
    emailFails = true;
    mock.method(console, "error", () => {});
    const result = await sendAutomaticScheduleChangeNotification(input);
    assert.equal(result.status, "FAILED");
    assert.deepEqual(result.recipients, []);
});
