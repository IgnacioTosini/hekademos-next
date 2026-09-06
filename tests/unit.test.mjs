import assert from "node:assert/strict";
import test from "node:test";

import {
    getCurrentMonthRange,
    isDateInRange,
    toDateInputValue,
} from "../src/utils/date.ts";
import {
    getAmountWithLateSurcharge,
    getPaymentDueDate,
    getPaymentForPeriod,
    getPaymentPeriodStart,
    shouldApplyLateSurcharge,
} from "../src/utils/payment.ts";
import {
    addMinutesToTime,
    getNextScheduleOccurrence,
    getOneTimeScheduleDates,
} from "../src/utils/schedule.ts";
import {
    buildWhatsappUrl,
    normalizeWhatsappPhoneNumber,
} from "../src/utils/whatsapp.ts";
import { getYoutubeVideoId, isValidYoutubeUrl } from "../src/utils/youtube.ts";
import {
    getClassCategoryLabel,
    isClassCategory,
    normalizeClassCategoryKey,
    normalizeClassCategoryName,
} from "../src/utils/class-category.ts";
import { getActiveMembership, getMembershipAmountCents } from "../src/utils/membership.ts";
import {
    isDeliverableEmail,
    isValidBirthDate,
    isValidOptionalPhone,
    isValidOptionalUrl,
} from "../src/lib/form-validation.ts";
import { decodeSessionPayload, encodeSessionPayload } from "../src/lib/session-cookie.ts";
import { sendWhatsAppTemplate } from "../src/lib/whatsapp.ts";
import { cloneDefaultHomePageContent } from "../src/lib/home-page-content.ts";
import { normalizeHomePageContent } from "../src/lib/site-content.ts";
import { toWeeklyClassScheduleSummary } from "../src/lib/weekly-class-schedule-summary.ts";

test("el próximo turno usa la primera fecha válida de la semana", () => {
    const from = new Date(2026, 8, 1, 12, 0, 0);
    const occurrence = getNextScheduleOccurrence({ dayOfWeek: "FRIDAY", startTime: "07:30" }, from);

    assert.deepEqual(
        [occurrence.getFullYear(), occurrence.getMonth() + 1, occurrence.getDate(), occurrence.getHours(), occurrence.getMinutes()],
        [2026, 9, 4, 7, 30]
    );
});

test("un turno de hoy futuro queda hoy y uno ya iniciado pasa a la semana siguiente", () => {
    const future = getNextScheduleOccurrence(
        { dayOfWeek: "TUESDAY", startTime: "18:00" },
        new Date(2026, 8, 1, 12, 0, 0)
    );
    const elapsed = getNextScheduleOccurrence(
        { dayOfWeek: "TUESDAY", startTime: "08:00" },
        new Date(2026, 8, 1, 12, 0, 0)
    );

    assert.equal(future.getDate(), 1);
    assert.equal(elapsed.getDate(), 8);
});

test("el cambio temporal calcula de forma independiente las próximas clases", () => {
    const dates = getOneTimeScheduleDates(
        { dayOfWeek: "MONDAY", startTime: "09:00" },
        { dayOfWeek: "FRIDAY", startTime: "07:30" },
        new Date(2026, 8, 1, 12, 0, 0)
    );

    assert.equal(dates.sourceDate.getDate(), 7);
    assert.equal(dates.requestedDate.getDate(), 4);
});

test("la suma de duración soporta cambio de día y rechaza horarios inválidos", () => {
    assert.equal(addMinutesToTime("23:30", 90), "01:00");
    assert.equal(addMinutesToTime("incorrecto", 90), "");
});

test("los rangos mensuales son semiabiertos y el valor de fecha es local", () => {
    const { start, end, dueDate } = getCurrentMonthRange(new Date(2026, 8, 15), 10);

    assert.equal(isDateInRange(new Date(2026, 8, 1), start, end), true);
    assert.equal(isDateInRange(new Date(2026, 9, 1), start, end), false);
    assert.equal(dueDate?.getHours(), 23);
    assert.equal(toDateInputValue(new Date(2026, 8, 4)), "2026-09-04");
    assert.equal(toDateInputValue("fecha inválida"), "");
});

test("los cálculos de pago respetan período, vencimiento y recargo", () => {
    const date = new Date(2026, 8, 15, 12, 0, 0);
    const dueDate = getPaymentDueDate(date, 10);
    const periodStart = getPaymentPeriodStart(date);
    const payment = { periodStart, dueDate: new Date(2026, 8, 10), paidAt: null };

    assert.equal(periodStart.toISOString(), "2026-09-01T00:00:00.000Z");
    assert.equal(getPaymentForPeriod([payment], new Date(2026, 8, 1), new Date(2026, 9, 1)), payment);
    assert.equal(shouldApplyLateSurcharge(date, dueDate, "PENDING"), true);
    assert.equal(shouldApplyLateSurcharge(date, dueDate, "PAID"), false);
    assert.equal(getAmountWithLateSurcharge(55_000_00, true, 20), 66_000_00);
    assert.equal(getAmountWithLateSurcharge(55_000_00, false, 20), 55_000_00);
});

test("los teléfonos argentinos se normalizan para WhatsApp", () => {
    const variants = [
        "+54 9 223 426 8951",
        "+54 223 426 8951",
        "0223 426 8951",
        "0223 15 426 8951",
    ];

    variants.forEach((value) => assert.equal(normalizeWhatsappPhoneNumber(value), "5492234268951"));
    assert.equal(normalizeWhatsappPhoneNumber("+54 9 1"), null);
    assert.equal(normalizeWhatsappPhoneNumber("123"), null);
    assert.equal(normalizeWhatsappPhoneNumber(null), null);
    assert.equal(
        buildWhatsappUrl("0223 426 8951", "Cuota septiembre: $55.000"),
        "https://wa.me/5492234268951?text=Cuota%20septiembre%3A%20%2455.000"
    );
});

test("el modo de prueba de WhatsApp no envía si el alumno no tiene un teléfono válido", async () => {
    const previousValues = {
        enabled: process.env.WHATSAPP_ENABLED,
        testMode: process.env.WHATSAPP_TEST_MODE,
        testRecipient: process.env.WHATSAPP_TEST_RECIPIENT,
        token: process.env.ACCESS_TOKEN_WHATSAPP_BUSINESS,
        phoneNumberId: process.env.PHONE_NUMBER_ID,
    };
    const previousFetch = globalThis.fetch;
    let fetchWasCalled = false;

    process.env.WHATSAPP_ENABLED = "true";
    process.env.WHATSAPP_TEST_MODE = "true";
    process.env.WHATSAPP_TEST_RECIPIENT = "+54 9 223 426 8951";
    process.env.ACCESS_TOKEN_WHATSAPP_BUSINESS = "qa-token";
    process.env.PHONE_NUMBER_ID = "qa-phone-id";
    globalThis.fetch = async () => {
        fetchWasCalled = true;
        throw new Error("No debe conectarse a Meta en esta prueba");
    };

    try {
        const result = await sendWhatsAppTemplate({
            to: "123456",
            templateName: "qa_template",
            languageCode: "es_AR",
        });

        assert.equal(result.status, "SKIPPED_NO_RECIPIENT");
        assert.equal(fetchWasCalled, false);
    } finally {
        const restore = (key, value) => {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        };
        restore("WHATSAPP_ENABLED", previousValues.enabled);
        restore("WHATSAPP_TEST_MODE", previousValues.testMode);
        restore("WHATSAPP_TEST_RECIPIENT", previousValues.testRecipient);
        restore("ACCESS_TOKEN_WHATSAPP_BUSINESS", previousValues.token);
        restore("PHONE_NUMBER_ID", previousValues.phoneNumberId);
        globalThis.fetch = previousFetch;
    }
});

test("solo se aceptan formatos auténticos de YouTube", () => {
    assert.equal(getYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(getYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=3"), "dQw4w9WgXcQ");
    assert.equal(getYoutubeVideoId("https://youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(isValidYoutubeUrl("https://youtube.com.ejemplo.com/watch?v=dQw4w9WgXcQ"), false);
    assert.equal(isValidYoutubeUrl("javascript:alert(1)"), false);
});

test("el contenido editable descarta enlaces peligrosos y limita colecciones", () => {
    const input = cloneDefaultHomePageContent();
    input.banner.background.url = "https://sitio-no-permitido.example/banner.png";
    input.banner.primaryAction.href = "javascript:alert(1)";
    input.teachers.items[0].videoUrl = "https://youtube.com.ejemplo.com/watch?v=dQw4w9WgXcQ";
    input.community.items = Array.from({ length: 20 }, (_, index) => ({
        ...input.community.items[0],
        title: `Elemento ${index + 1}`,
    }));

    const normalized = normalizeHomePageContent(input);
    const defaults = cloneDefaultHomePageContent();

    assert.equal(normalized.banner.background.url, defaults.banner.background.url);
    assert.equal(normalized.banner.primaryAction.href, defaults.banner.primaryAction.href);
    assert.equal(normalized.teachers.items[0].videoUrl, defaults.teachers.items[0].videoUrl);
    assert.equal(normalized.community.items.length, 12);
    assert.equal(normalized.community.items[11].title, "Elemento 12");
});

test("las categorías se limpian, comparan y validan", () => {
    assert.equal(normalizeClassCategoryName("  Clase   especial "), "Clase especial");
    assert.equal(normalizeClassCategoryKey(" MOVILIDAD "), "movilidad");
    assert.equal(getClassCategoryLabel(" "), "Calistenia");
    assert.equal(isClassCategory("A"), false);
    assert.equal(isClassCategory("Movilidad"), true);
    assert.equal(isClassCategory("x".repeat(61)), false);
});

test("la membresía activa y el precio personalizado se resuelven correctamente", () => {
    const today = new Date(2026, 8, 3, 12, 0, 0);
    const memberships = [
        { status: "CANCELLED", endDate: null, plan: { priceCents: 10_000 } },
        { status: "ACTIVE", endDate: new Date(2026, 8, 30), monthlyPriceCents: 12_000, plan: { priceCents: 10_000 } },
    ];
    const active = getActiveMembership(memberships, today);

    assert.equal(active, memberships[1]);
    assert.equal(getMembershipAmountCents(active), 12_000);
    assert.equal(getMembershipAmountCents(undefined), null);
});

test("las validaciones de formulario bloquean datos peligrosos o ficticios", () => {
    const adultBirthDate = new Date();
    adultBirthDate.setFullYear(adultBirthDate.getFullYear() - 20);
    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 2);

    assert.equal(isValidOptionalPhone("+54 9 223 426 8951"), true);
    assert.equal(isValidOptionalPhone("12"), false);
    assert.equal(isValidOptionalPhone("223-ABC-123"), false);
    assert.equal(isValidOptionalUrl("https://hekademos.com.ar/rutina"), true);
    assert.equal(isValidOptionalUrl("javascript:alert(1)"), false);
    assert.equal(isDeliverableEmail("alumno@gmail.com"), true);
    assert.equal(isDeliverableEmail("alumno@example.com"), false);
    assert.equal(isValidBirthDate(adultBirthDate), true);
    assert.equal(isValidBirthDate(tooYoung), false);
});

test("el payload de sesión conserva los datos y rechaza contenido ilegible", () => {
    const session = {
        userId: "user-1",
        email: "alumno@gmail.com",
        name: "Alumno QA",
        role: "STUDENT",
        sessionVersion: 3,
        expiresAt: Date.now() + 60_000,
    };
    const encoded = encodeSessionPayload(session);

    assert.deepEqual(decodeSessionPayload(encoded), session);
    assert.equal(decodeSessionPayload("%%%"), null);
    assert.equal(decodeSessionPayload(encodeSessionPayload({ ...session, sessionVersion: -1 })), null);
    const legacySession = Object.fromEntries(
        Object.entries(session).filter(([key]) => key !== "sessionVersion")
    );
    assert.equal(decodeSessionPayload(encodeSessionPayload(legacySession)), null);
});

test("el resumen público de turnos excluye relaciones y datos privados", () => {
    const source = {
        id: "schedule-1",
        dayOfWeek: "MONDAY",
        classCategory: "Calistenia",
        startTime: "09:00",
        durationMinutes: 90,
        capacity: 10,
        coachId: "coach-1",
        coach: {
            user: {
                name: "Coach QA",
                email: "privado@hekademos.test",
                passwordHash: "hash-privado",
            },
        },
        studentAssignments: [{ studentId: "student-1" }],
        notes: "Nota interna",
        _count: {
            studentAssignments: 3,
        },
    };

    const summary = toWeeklyClassScheduleSummary(source);

    assert.deepEqual(summary, {
        id: "schedule-1",
        dayOfWeek: "MONDAY",
        classCategory: "Calistenia",
        startTime: "09:00",
        durationMinutes: 90,
        capacity: 10,
        coachId: "coach-1",
        coachName: "Coach QA",
        occupiedSpots: 3,
        availableSpots: 7,
    });
    assert.equal("coach" in summary, false);
    assert.equal("studentAssignments" in summary, false);
    assert.equal("notes" in summary, false);
    assert.equal(JSON.stringify(summary).includes("hash-privado"), false);
    assert.equal(JSON.stringify(summary).includes("privado@hekademos.test"), false);
});
