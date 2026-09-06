import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright-core";
import { hashPassword } from "../src/lib/password.ts";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const chromePath = process.env.QA_CHROME_PATH
    ?? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const suffix = Date.now().toString(36);
const qaForwardedIp = `2001:db8::${createHash("sha256").update(suffix).digest("hex").slice(0, 4)}`;
const tag = `QA E2E ${suffix}`;
const qaPassword = `Qa-${suffix}-segura`;
const data = {
    adminUserId: null,
    coachUserId: null,
    coachId: null,
    studentUserId: null,
    studentId: null,
    planId: null,
    categoryId: null,
    sourceScheduleId: null,
    targetScheduleId: null,
    attendanceScheduleId: null,
    basePostId: null,
};
const contexts = [];
const browserProblems = [];
let prisma;
let browser;
let adminPage;
let coachPage;
let studentPage;
let adminUser;
let coachUser;
let studentUser;
let originalSiteContent;
let siteContentTouched = false;

const normalizedCategory = (value) => value.trim().replace(/\s+/g, " ").normalize("NFKC").toLocaleLowerCase("es");

const createSessionToken = (user) => {
    const secret = process.env.AUTH_SESSION_SECRET
        ?? "hekademos-dev-session-secret";
    const payload = Buffer.from(JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionVersion: user.sessionVersion,
        expiresAt: Date.now() + 60 * 60 * 1000,
    })).toString("base64url");
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");

    return `${payload}.${signature}`;
};

const attachDiagnostics = (page, role) => {
    page.on("pageerror", (error) => browserProblems.push(`${role}: ${error.message}`));
    page.on("console", (message) => {
        const text = message.text();
        if (message.type() === "error" && /hydration failed|uncaught|typeerror|referenceerror|application error|internal server error/i.test(text) && !/failed to load resource/i.test(text)) {
            browserProblems.push(`${role}: ${text}`);
        }
    });
    page.on("response", (response) => {
        if (response.status() >= 500) {
            browserProblems.push(`${role}: HTTP ${response.status()} (${response.request().resourceType()}) en ${response.url()}`);
        }
    });
};

const createRolePage = async (user, role) => {
    const context = await browser.newContext({
        locale: "es-AR",
        timezoneId: "America/Argentina/Buenos_Aires",
        viewport: { width: 1440, height: 1000 },
        extraHTTPHeaders: { "x-forwarded-for": qaForwardedIp },
    });
    contexts.push(context);
    await context.addCookies([{
        name: "hekademos-session",
        value: createSessionToken(user),
        url: baseUrl,
        httpOnly: true,
        sameSite: "Lax",
    }]);
    const page = await context.newPage();
    attachDiagnostics(page, role);
    return page;
};

const openPage = async (page, path) => {
    const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    assert.ok(response, `No hubo respuesta al abrir ${path}`);
    assert.equal(response.status(), 200, `${path} respondió ${response.status()}`);
    await page.locator("body").waitFor({ state: "visible" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
};

const waitForDatabase = async (operation, predicate, message) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        const value = await operation();
        if (predicate(value)) return value;
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.fail(message);
};

const assertNoBrowserProblems = () => {
    assert.deepEqual(browserProblems.splice(0), []);
};

const cleanup = async () => {
    if (!prisma) return;

    const userIds = [data.adminUserId, data.coachUserId, data.studentUserId].filter(Boolean);
    const scheduleIds = [data.sourceScheduleId, data.targetScheduleId, data.attendanceScheduleId].filter(Boolean);

    if (userIds.length > 0) await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await prisma.communityPost.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.classSession.deleteMany({ where: { scheduleId: { in: scheduleIds } } });
    await prisma.weeklyClassSchedule.deleteMany({ where: { notes: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `qa-e2e-${suffix}-` } } });
    await prisma.membershipPlan.deleteMany({ where: { name: { startsWith: tag } } });
    await prisma.classCategoryOption.deleteMany({ where: { name: { startsWith: tag } } });

    if (siteContentTouched) {
        if (originalSiteContent) {
            await prisma.siteContent.upsert({
                where: { key: originalSiteContent.key },
                create: {
                    key: originalSiteContent.key,
                    value: originalSiteContent.value,
                    updatedByUserId: originalSiteContent.updatedByUserId,
                },
                update: {
                    value: originalSiteContent.value,
                    updatedByUserId: originalSiteContent.updatedByUserId,
                },
            });
        } else {
            await prisma.siteContent.deleteMany({ where: { key: "home-page" } });
        }
    }
};

before(async () => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL debe estar configurada");
    assert.equal(existsSync(chromePath), true, `No se encontró Chrome en ${chromePath}`);
    prisma = new PrismaClient();
    originalSiteContent = await prisma.siteContent.findUnique({ where: { key: "home-page" } });

    const categoryName = `${tag} Base`;
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const todayDay = dayNames[today.getDay()];
    const tomorrowDay = dayNames[tomorrow.getDay()];
    const passwordHash = await hashPassword(qaPassword);

    adminUser = await prisma.user.create({
        data: {
            email: `qa-e2e-${suffix}-admin@example.com`,
            name: `${tag} Admin`,
            role: "ADMIN",
            status: "ACTIVE",
            passwordHash,
        },
    });
    data.adminUserId = adminUser.id;

    coachUser = await prisma.user.create({
        data: {
            email: `qa-e2e-${suffix}-coach@example.com`,
            name: `${tag} Coach`,
            role: "COACH",
            status: "ACTIVE",
            passwordHash,
            coach: {
                create: {
                    specialty: "QA automatizada",
                    paymentAlias: `qa.${suffix}`,
                    paymentAccountHolder: `${tag} Titular`,
                },
            },
        },
        include: { coach: true },
    });
    data.coachUserId = coachUser.id;
    data.coachId = coachUser.coach.id;

    const category = await prisma.classCategoryOption.create({
        data: {
            name: categoryName,
            normalizedName: normalizedCategory(categoryName),
        },
    });
    data.categoryId = category.id;

    const plan = await prisma.membershipPlan.create({
        data: {
            name: `${tag} Plan base`,
            classCategory: categoryName,
            trainingDaysPerWeek: 2,
            priceCents: 5_500_000,
            currency: "ARS",
        },
    });
    data.planId = plan.id;

    studentUser = await prisma.user.create({
        data: {
            email: `qa-e2e-${suffix}-student@example.com`,
            name: `${tag} Alumno`,
            role: "STUDENT",
            status: "ACTIVE",
            passwordHash,
            student: {
                create: {
                    firstName: `${tag}`,
                    lastName: "Alumno",
                    coachId: data.coachId,
                },
            },
        },
        include: { student: true },
    });
    data.studentUserId = studentUser.id;
    data.studentId = studentUser.student.id;

    const membership = await prisma.studentMembership.create({
        data: {
            studentId: data.studentId,
            planId: data.planId,
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            status: "ACTIVE",
        },
    });

    const [sourceSchedule, targetSchedule, attendanceSchedule] = await Promise.all([
        prisma.weeklyClassSchedule.create({
            data: { dayOfWeek: tomorrowDay, classCategory: categoryName, startTime: "05:01", durationMinutes: 60, capacity: 10, coachId: data.coachId, notes: `${tag} origen` },
        }),
        prisma.weeklyClassSchedule.create({
            data: { dayOfWeek: tomorrowDay, classCategory: categoryName, startTime: "06:02", durationMinutes: 60, capacity: 10, coachId: data.coachId, notes: `${tag} destino` },
        }),
        prisma.weeklyClassSchedule.create({
            data: { dayOfWeek: todayDay, classCategory: categoryName, startTime: "07:03", durationMinutes: 60, capacity: 10, coachId: data.coachId, notes: `${tag} asistencia` },
        }),
    ]);
    data.sourceScheduleId = sourceSchedule.id;
    data.targetScheduleId = targetSchedule.id;
    data.attendanceScheduleId = attendanceSchedule.id;

    await prisma.studentScheduleAssignment.createMany({
        data: [sourceSchedule, attendanceSchedule].map((schedule) => ({
            studentId: data.studentId,
            weeklyScheduleId: schedule.id,
            studentMembershipId: membership.id,
            isActive: true,
        })),
    });

    const post = await prisma.communityPost.create({
        data: {
            type: "Pregunta QA",
            title: `${tag} Publicación base`,
            content: "Publicación aislada para verificar aportes de alumnos y coaches.",
            isPublished: true,
            authorCoachId: data.coachId,
            createdByName: coachUser.name,
            createdByEmail: coachUser.email,
        },
    });
    data.basePostId = post.id;

    browser = await chromium.launch({
        executablePath: chromePath,
        headless: true,
        args: ["--disable-gpu", "--hide-scrollbars"],
    });
    [adminPage, coachPage, studentPage] = await Promise.all([
        createRolePage(adminUser, "admin"),
        createRolePage(coachUser, "coach"),
        createRolePage(studentUser, "alumno"),
    ]);
});

after(async () => {
    await Promise.allSettled(contexts.map((context) => context.close()));
    await browser?.close();
    await cleanup();
    await prisma?.$disconnect();
});

test("alumno, coach y administrador inician sesión con credenciales reales", async () => {
    const cases = [
        { user: studentUser, target: "/perfil", role: "login-alumno" },
        { user: coachUser, target: "/coach/dashboard", role: "login-coach" },
        { user: adminUser, target: "/admin", role: "login-admin" },
    ];

    for (const item of cases) {
        const context = await browser.newContext({ locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", extraHTTPHeaders: { "x-forwarded-for": qaForwardedIp } });
        contexts.push(context);
        const page = await context.newPage();
        attachDiagnostics(page, item.role);
        await openPage(page, "/auth/login");

        if (item.role === "login-alumno") {
            await page.locator("#login-email").fill(item.user.email);
            await page.locator("#login-password").fill("clave-incorrecta");
            await page.getByRole("button", { name: "Entrar" }).click();
            await page.getByText("Credenciales invalidas", { exact: true }).waitFor();
        }

        await page.locator("#login-email").fill(item.user.email);
        await page.locator("#login-password").fill(qaPassword);
        await page.getByRole("button", { name: "Entrar" }).click();
        await page.waitForURL((url) => url.pathname === item.target, { timeout: 15_000 });
    }
    assertNoBrowserProblems();
});

test("el formulario de contacto valida los campos en el navegador", async () => {
    await openPage(studentPage, "/");
    await studentPage.locator("#contacto").evaluate((element) => element.scrollIntoView({ block: "center" }));
    await studentPage.locator(".formButton").waitFor({ state: "visible" });
    await studentPage.locator(".formButton").click();
    await studentPage.getByText("El nombre es requerido", { exact: true }).waitFor();
    await studentPage.getByText("El email es requerido", { exact: true }).waitFor();
    await studentPage.getByText("El mensaje es requerido", { exact: true }).waitFor();

    await studentPage.locator("#contact-name").fill("A");
    await studentPage.locator("#contact-email").fill("email-invalido");
    await studentPage.locator("#contact-message").fill("Corto");
    await studentPage.locator(".formButton").click();
    await studentPage.getByText("El nombre debe tener al menos 2 caracteres", { exact: true }).waitFor();
    await studentPage.getByText("Email inválido", { exact: true }).waitFor();
    await studentPage.getByText("El mensaje debe tener al menos 10 caracteres", { exact: true }).waitFor();
    assertNoBrowserProblems();
});

test("el login bloquea intentos repetidos para una misma identidad", async () => {
    const context = await browser.newContext({
        locale: "es-AR",
        timezoneId: "America/Argentina/Buenos_Aires",
        extraHTTPHeaders: { "x-forwarded-for": qaForwardedIp },
    });
    contexts.push(context);
    const page = await context.newPage();
    attachDiagnostics(page, "login-rate-limit");
    await openPage(page, "/auth/login");

    await page.locator("#login-email").fill(`rate-limit-${suffix}@example.com`);
    await page.locator("#login-password").fill("clave-incorrecta");
    const submit = page.getByRole("button", { name: "Entrar" });

    for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = page.waitForResponse((candidate) => (
            candidate.request().method() === "POST"
            && new URL(candidate.url()).pathname === "/auth/login"
        ));
        await submit.click();
        await response;
        await page.getByText("Credenciales invalidas", { exact: true }).waitFor();
    }

    const blockedResponse = page.waitForResponse((candidate) => (
        candidate.request().method() === "POST"
        && new URL(candidate.url()).pathname === "/auth/login"
    ));
    await submit.click();
    await blockedResponse;
    await page.getByText(/Demasiados intentos\. Probá nuevamente/).waitFor();
    assertNoBrowserProblems();
});

test("el alumno edita su perfil y ve el cambio sin una recarga completa", async () => {
    await openPage(studentPage, "/perfil?month=9&year=2026");
    await studentPage.getByText(studentUser.email, { exact: true }).first().waitFor();
    await studentPage.evaluate(() => { window.__hekademosQaMarker = "student-profile"; });
    await studentPage.getByRole("button", { name: "Editar perfil" }).click();
    await studentPage.locator("#profile-phone").fill("123456");
    await studentPage.getByRole("button", { name: "Guardar cambios" }).click();
    assert.equal(await studentPage.locator('#profile-phone').getAttribute('aria-invalid'), 'true');
    assert.equal(await studentPage.locator('#profile-phone-country').inputValue(), 'AR');
    await studentPage.locator('#profile-phone-country').selectOption('ES');
    await studentPage.locator('#profile-phone').fill('+34612345678');
    const phoneViewport = studentPage.viewportSize();
    await studentPage.setViewportSize({ width: 390, height: 844 });
    assert.equal(await studentPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    const phoneBox = await studentPage.locator('#profile-phone').boundingBox();
    assert.ok(phoneBox && phoneBox.x >= 0 && phoneBox.x + phoneBox.width <= 391);
    if (process.env.QA_PHONE_SCREENSHOT) await studentPage.locator('.phone-input').screenshot({ path: process.env.QA_PHONE_SCREENSHOT });
    await studentPage.setViewportSize(phoneViewport);
    await studentPage.locator("#profile-emergency-name").fill(`${tag} Emergencia`);
    await studentPage.getByRole("button", { name: "Guardar cambios" }).click();
    await studentPage.getByText("Perfil actualizado", { exact: true }).waitFor();
    await studentPage.getByText("+34612345678", { exact: true }).waitFor();
    assert.equal(await studentPage.evaluate(() => window.__hekademosQaMarker), "student-profile");

    const updated = await prisma.student.findUnique({ where: { id: data.studentId }, include: { user: true } });
    assert.equal(updated.user.phone, "+34612345678");
    assert.equal(updated.emergencyContactName, `${tag} Emergencia`);
    await studentPage.getByRole('button', { name: 'Editar perfil' }).click();
    assert.equal(await studentPage.locator('#profile-phone-country').inputValue(), 'ES');
    await studentPage.locator('#profile-phone-country').selectOption('AR');
    await studentPage.locator('#profile-phone').fill('02234268951');
    await studentPage.getByRole('button', { name: 'Guardar cambios' }).click();
    await studentPage.getByText('+5492234268951', { exact: true }).waitFor();
    const normalized = await prisma.user.findUnique({ where: { id: studentUser.id } });
    assert.equal(normalized.phone, '+5492234268951');
    assertNoBrowserProblems();
});

test("el alumno confirma y cancela un cambio temporal con fecha visible", async () => {
    await studentPage.evaluate(() => { window.__hekademosQaMarker = "student-schedule"; });
    await studentPage.getByRole("button", { name: "Cambiar horario" }).click();
    await studentPage.locator("#schedule-request-current").selectOption(data.sourceScheduleId);
    await studentPage.locator(".student-schedule-request-option").filter({ hasText: "06:02" }).click();
    await studentPage.getByText("Confirmá que las fechas sean correctas", { exact: true }).waitFor();
    await studentPage.getByText(/Nuevo horario/).waitFor();
    await studentPage.locator("#schedule-request-reason").fill(`${tag}: prueba de cambio temporal`);
    await studentPage.getByRole("button", { name: "Confirmar cambio" }).click();
    await studentPage.getByText("Cambio puntual confirmado automáticamente", { exact: true }).waitFor();
    await studentPage.getByRole("button", { name: "Cancelar cambio temporal" }).waitFor();
    await studentPage.locator(".student-profile-schedule-temporary").getByText(/Solo por esta clase/).waitFor();
    assert.equal(await studentPage.evaluate(() => window.__hekademosQaMarker), "student-schedule");

    const approvedRequest = await waitForDatabase(
        () => prisma.scheduleChangeRequest.findFirst({ where: { studentId: data.studentId, type: "ONE_TIME" }, orderBy: { createdAt: "desc" } }),
        (request) => request?.status === "APPROVED" && request.requestedScheduleIds[0] === data.targetScheduleId,
        "El cambio temporal no quedó aprobado en la base"
    );
    assert.equal(approvedRequest.currentScheduleIds[0], data.sourceScheduleId);

    const fillerUser = await prisma.user.create({
        data: {
            email: `qa-e2e-${suffix}-cupo@example.com`,
            name: `${tag} Cupo ocupado`,
            role: "STUDENT",
            status: "ACTIVE",
            student: {
                create: {
                    firstName: `${tag}`,
                    lastName: "Cupo ocupado",
                    coachId: data.coachId,
                },
            },
        },
        include: { student: true },
    });
    await prisma.$transaction([
        prisma.weeklyClassSchedule.update({ where: { id: data.sourceScheduleId }, data: { capacity: 1 } }),
        prisma.studentScheduleAssignment.create({
            data: {
                studentId: fillerUser.student.id,
                weeklyScheduleId: data.sourceScheduleId,
                isActive: true,
            },
        }),
    ]);

    studentPage.once("dialog", (dialog) => dialog.accept());
    await studentPage.getByRole("button", { name: "Cancelar cambio temporal" }).click();
    await studentPage.getByText("Tu lugar en el horario habitual ya fue ocupado", { exact: true }).waitFor();
    assert.equal((await prisma.scheduleChangeRequest.findUnique({ where: { id: approvedRequest.id } })).status, "APPROVED");

    await prisma.user.delete({ where: { id: fillerUser.id } });
    await prisma.weeklyClassSchedule.update({ where: { id: data.sourceScheduleId }, data: { capacity: 10 } });
    await studentPage.waitForFunction(() => {
        const button = [...document.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Cancelar cambio temporal"));
        return button instanceof HTMLButtonElement && !button.disabled;
    });

    studentPage.once("dialog", (dialog) => dialog.accept());
    await studentPage.getByRole("button", { name: "Cancelar cambio temporal" }).click();
    await studentPage.getByText("Cambio temporal cancelado. Volviste a tu horario habitual.", { exact: true }).waitFor();
    await studentPage.getByRole("button", { name: "Cancelar cambio temporal" }).waitFor({ state: "detached" });
    await waitForDatabase(
        () => prisma.scheduleChangeRequest.findUnique({ where: { id: approvedRequest.id } }),
        (request) => request?.status === "CANCELLED",
        "El cambio temporal no quedó cancelado"
    );
    assertNoBrowserProblems();
});

test("el alumno cambia sus horarios permanentemente y los ve sin recargar la página", async () => {
    await openPage(studentPage, "/perfil?month=9&year=2026");
    await studentPage.evaluate(() => { window.__hekademosQaMarker = "permanent-schedule"; });
    await studentPage.getByRole("button", { name: "Cambiar horario" }).click();
    await studentPage.locator("#schedule-request-type").selectOption("PERMANENT");
    await studentPage.locator(".student-schedule-request-option").filter({ hasText: "05:01" }).click();
    await studentPage.locator(".student-schedule-request-option").filter({ hasText: "06:02" }).click();
    await studentPage.locator("#schedule-request-reason").fill(`${tag}: prueba de cambio permanente`);
    await studentPage.getByRole("button", { name: "Confirmar cambio" }).click();
    await studentPage.getByText("Horarios actualizados automáticamente", { exact: true }).waitFor();

    const selectedSchedules = studentPage.locator(".student-profile-schedules");
    await selectedSchedules.getByText(/06:02/).waitFor();
    assert.equal(await selectedSchedules.getByText(/05:01/).count(), 0);
    assert.equal(await studentPage.evaluate(() => window.__hekademosQaMarker), "permanent-schedule");

    const permanentRequest = await waitForDatabase(
        () => prisma.scheduleChangeRequest.findFirst({ where: { studentId: data.studentId, type: "PERMANENT" }, orderBy: { createdAt: "desc" } }),
        (request) => request?.status === "APPROVED" && request.requestedScheduleIds.includes(data.targetScheduleId),
        "El cambio permanente no quedó aprobado en la base"
    );
    assert.equal(permanentRequest.requestedScheduleIds.includes(data.sourceScheduleId), false);

    const activeAssignments = await prisma.studentScheduleAssignment.findMany({
        where: { studentId: data.studentId, isActive: true },
        select: { weeklyScheduleId: true },
    });
    assert.deepEqual(
        activeAssignments.map((assignment) => assignment.weeklyScheduleId).sort(),
        [data.targetScheduleId, data.attendanceScheduleId].sort()
    );

    await prisma.$transaction([
        prisma.studentScheduleAssignment.updateMany({ where: { studentId: data.studentId }, data: { isActive: false } }),
        prisma.studentScheduleAssignment.updateMany({
            where: { studentId: data.studentId, weeklyScheduleId: { in: [data.sourceScheduleId, data.attendanceScheduleId] } },
            data: { isActive: true },
        }),
    ]);
    assertNoBrowserProblems();
});

test("el alumno crea, edita y elimina su aporte sin recargar", async () => {
    const originalText = `${tag} aporte del alumno`;
    const editedText = `${tag} aporte editado del alumno`;
    await openPage(studentPage, "/comunidad");
    const post = studentPage.locator(".community-feed-post").filter({ hasText: `${tag} Publicación base` });
    await post.locator("textarea").last().fill(originalText);
    await post.getByRole("button", { name: "Publicar aporte" }).click();
    await post.getByText(originalText, { exact: true }).waitFor();
    await post.getByRole("button", { name: "Editar mi aporte" }).click();
    await post.locator(".community-feed-inline-edit textarea").fill(editedText);
    await post.locator(".community-feed-inline-edit").getByRole("button", { name: "Guardar" }).click();
    await post.getByText(editedText, { exact: true }).waitFor();
    studentPage.once("dialog", (dialog) => dialog.accept());
    await post.getByRole("button", { name: "Eliminar mi aporte" }).click();
    await post.getByText(editedText, { exact: true }).waitFor({ state: "detached" });
    assertNoBrowserProblems();
});

test("el coach actualiza cuenta, alumno, asistencia y pago", async () => {
    await openPage(coachPage, "/coach/dashboard");
    await coachPage.getByText(studentUser.email, { exact: true }).waitFor();
    await coachPage.getByRole("button", { name: "Mi cuenta" }).click();
    await coachPage.locator("#coach-profile-payment-alias").fill(`alias.editado.${suffix}`);
    await coachPage.locator("#coach-profile-payment-holder").fill(`${tag} Titular editado`);
    await coachPage.getByRole("button", { name: "Guardar cambios" }).click();
    await coachPage.getByText("Cuenta actualizada", { exact: true }).waitFor();
    await waitForDatabase(
        () => prisma.coach.findUnique({ where: { id: data.coachId } }),
        (coach) => coach?.paymentAlias === `alias.editado.${suffix}`,
        "El alias del coach no se actualizó"
    );

    const studentRow = coachPage.locator(".coach-student-item").filter({ hasText: studentUser.email });
    await studentRow.getByRole("button", { name: "Editar" }).click();
    await coachPage.locator("#coach-student-routine").fill("https://docs.google.com/spreadsheets/d/qa-e2e");
    await coachPage.locator("#coach-student-notes").fill(`${tag} seguimiento`);
    await coachPage.locator("#coach-student-price").fill("56000");
    await coachPage.locator(".coach-student-form").getByRole("button", { name: "Guardar cambios" }).click();
    await coachPage.getByText("Alumno actualizado", { exact: true }).waitFor();

    await studentRow.getByRole("button", { name: "Marcar pago" }).click();
    await studentRow.getByRole("button", { name: "Desmarcar" }).waitFor();
    await studentRow.getByRole("button", { name: "Desmarcar" }).click();
    await studentRow.getByRole("button", { name: "Marcar pago" }).waitFor();

    const attendanceRow = coachPage.locator(".coach-attendance-student").filter({ hasText: `${tag} Alumno` }).first();
    await attendanceRow.getByRole("button", { name: "Presente" }).click();
    await coachPage.getByText("Asistencia actualizada", { exact: true }).waitFor();
    await waitForDatabase(
        () => prisma.attendance.findFirst({ where: { studentId: data.studentId, session: { scheduleId: data.attendanceScheduleId } } }),
        (attendance) => attendance?.status === "PRESENT",
        "La asistencia del coach no se guardó"
    );
    assertNoBrowserProblems();
});

test("los aportes del coach aparecen y desaparecen en tiempo real para el alumno", async () => {
    const liveText = `${tag} aporte en tiempo real del coach`;
    await openPage(studentPage, "/comunidad");
    await studentPage.evaluate(() => { window.__hekademosQaMarker = "live-feed"; });
    await openPage(coachPage, "/comunidad");
    const coachPost = coachPage.locator(".community-feed-post").filter({ hasText: `${tag} Publicación base` });
    await coachPost.locator("textarea").last().fill(liveText);
    await coachPost.getByRole("button", { name: "Publicar aporte" }).click();
    await coachPost.getByText(liveText, { exact: true }).waitFor();

    const studentPost = studentPage.locator(".community-feed-post").filter({ hasText: `${tag} Publicación base` });
    await studentPost.getByText(liveText, { exact: true }).waitFor({ timeout: 10_000 });
    assert.equal(await studentPage.evaluate(() => window.__hekademosQaMarker), "live-feed");

    coachPage.once("dialog", (dialog) => dialog.accept());
    await coachPost.getByRole("button", { name: "Eliminar mi aporte" }).click();
    await studentPost.getByText(liveText, { exact: true }).waitFor({ state: "detached", timeout: 10_000 });
    assert.equal(await studentPage.evaluate(() => window.__hekademosQaMarker), "live-feed");
    assertNoBrowserProblems();
});

test("el administrador ejecuta ABM de usuarios, coaches y alumnos con membresía", async () => {
    const userEmail = `qa-e2e-${suffix}-usuario@example.com`;
    await openPage(adminPage, "/admin/usuarios");
    await adminPage.getByRole("button", { name: "+ Nuevo usuario" }).click();
    await adminPage.locator("#user-name").fill(`${tag} Usuario`);
    await adminPage.locator("#user-email").fill(userEmail);
    await adminPage.locator("#user-password").fill(qaPassword);
    await adminPage.locator("#user-role").selectOption("ADMIN");
    await adminPage.getByRole("button", { name: "Crear usuario" }).click();
    let userRow = adminPage.locator(".users-table tbody tr").filter({ hasText: userEmail });
    await userRow.waitFor();
    await userRow.getByRole("button", { name: "Editar usuario" }).click();
    await adminPage.locator("#user-phone").fill("223 555 0101");
    await adminPage.getByRole("button", { name: "Guardar cambios" }).click();
    await waitForDatabase(
        () => prisma.user.findUnique({ where: { email: userEmail } }),
        (user) => user?.phone === "+5492235550101" && user.role === "ADMIN",
        "El usuario administrativo no se actualizó"
    );
    userRow = adminPage.locator(".users-table tbody tr").filter({ hasText: userEmail });
    adminPage.once("dialog", (dialog) => dialog.accept());
    await userRow.getByRole("button", { name: "Eliminar usuario" }).click();
    await userRow.waitFor({ state: "detached" });

    const coachEmail = `qa-e2e-${suffix}-coach-abm@example.com`;
    await openPage(adminPage, "/admin/coaches");
    await adminPage.getByRole("button", { name: "+ Nuevo coach" }).click();
    await adminPage.locator("#coach-name").fill(`${tag} Coach ABM`);
    await adminPage.locator("#coach-email").fill(coachEmail);
    await adminPage.locator("#coach-password").fill(qaPassword);
    await adminPage.locator("#coach-specialty").fill("Movilidad QA");
    await adminPage.locator("#coach-payment-alias").fill(`coach.abm.${suffix}`);
    await adminPage.locator("#coach-payment-holder").fill(`${tag} Titular ABM`);
    await adminPage.getByRole("button", { name: "Crear coach" }).click();
    let coachRow = adminPage.locator(".users-table tbody tr").filter({ hasText: coachEmail });
    await coachRow.waitFor();
    await coachRow.getByRole("button", { name: "Editar coach" }).click();
    await adminPage.locator("#coach-specialty").fill("Fuerza QA editada");
    await adminPage.getByRole("button", { name: "Guardar cambios" }).click();
    await waitForDatabase(
        () => prisma.user.findUnique({ where: { email: coachEmail }, include: { coach: true } }),
        (user) => user?.coach?.specialty === "Fuerza QA editada" && user.coach.paymentAlias === `coach.abm.${suffix}`,
        "El coach administrativo no se actualizó"
    );
    coachRow = adminPage.locator(".users-table tbody tr").filter({ hasText: coachEmail });
    adminPage.once("dialog", (dialog) => dialog.accept());
    await coachRow.getByRole("button", { name: "Eliminar coach" }).click();
    await coachRow.waitFor({ state: "detached" });

    const studentEmail = `qa-e2e-${suffix}-alumno-abm@example.com`;
    await openPage(adminPage, "/admin/alumnos");
    await adminPage.getByRole("button", { name: "+ Nuevo alumno" }).click();
    await adminPage.locator("#student-first-name").fill(`${tag} Nuevo`);
    await adminPage.locator("#student-last-name").fill("Alumno");
    await adminPage.locator("#student-email").fill(studentEmail);
    await adminPage.locator("#student-password").fill(qaPassword);
    await adminPage.locator("#student-coach").selectOption(data.coachId);
    await adminPage.locator("#student-plan").selectOption(data.planId);
    await adminPage.locator(".schedule-option").filter({ hasText: "05:01" }).click();
    await adminPage.locator(".schedule-option").filter({ hasText: "07:03" }).click();
    await adminPage.getByRole("button", { name: "Crear alumno" }).click();
    let studentRow = adminPage.locator(".users-table tbody tr").filter({ hasText: studentEmail });
    await studentRow.waitFor();

    const createdStudent = await waitForDatabase(
        () => prisma.user.findUnique({
            where: { email: studentEmail },
            include: { student: { include: { memberships: true, schedules: true } } },
        }),
        (user) => user?.student?.memberships.some((membership) => membership.status === "ACTIVE" && membership.planId === data.planId)
            && user.student.schedules.filter((assignment) => assignment.isActive).length === 2,
        "El alumno no se creó con su membresía y sus turnos"
    );
    await studentRow.getByRole("button", { name: "Editar alumno" }).click();
    await adminPage.locator("#student-phone").fill("223 555 0202");
    await adminPage.locator("#student-notes").fill(`${tag} alumno editado`);
    await adminPage.getByRole("button", { name: "Guardar cambios" }).click();
    await waitForDatabase(
        () => prisma.user.findUnique({ where: { id: createdStudent.id }, include: { student: true } }),
        (user) => user?.phone === "+5492235550202" && user.student?.notes === `${tag} alumno editado`,
        "El alumno administrativo no se actualizó"
    );
    studentRow = adminPage.locator(".users-table tbody tr").filter({ hasText: studentEmail });
    adminPage.once("dialog", (dialog) => dialog.accept());
    await studentRow.getByRole("button", { name: "Eliminar alumno" }).click();
    await studentRow.waitFor({ state: "detached" });
    assert.equal(await prisma.user.findUnique({ where: { id: createdStudent.id } }), null);
    assertNoBrowserProblems();
});

test("el administrador recorre todas sus páginas y ejecuta ABM de categorías, planes, turnos y foro", async () => {
    const adminRoutes = [
        "/admin", "/admin/alumnos", `/admin/alumnos/${data.studentId}`, "/admin/asistencia",
        "/admin/auditoria", "/admin/coaches", "/admin/comunidad", "/admin/contenido",
        "/admin/pagos", "/admin/planes", "/admin/solicitudes-horarios", "/admin/turnos", "/admin/usuarios",
    ];
    for (const route of adminRoutes) await openPage(adminPage, route);

    await openPage(adminPage, "/admin/planes");
    await adminPage.getByRole("button", { name: "+ Nuevo plan" }).click();
    await adminPage.getByRole("button", { name: "Administrar categorías" }).click();
    await adminPage.getByRole("button", { name: "+ Nueva" }).click();
    const categoryName = `${tag} Categoría admin`;
    const editedCategoryName = `${tag} Categoría editada`;
    await adminPage.locator("#category-name").fill(categoryName);
    await adminPage.getByText("Actividad especial (evento)").locator("input").check();
    await adminPage.getByRole("button", { name: "Agregar categoría" }).click();
    await adminPage.getByRole("button", { name: `Editar categoría ${categoryName}` }).waitFor();
    await adminPage.getByRole("button", { name: `Editar categoría ${categoryName}` }).click();
    await adminPage.locator("#category-name").fill(editedCategoryName);
    await adminPage.getByRole("button", { name: "Guardar categoría" }).click();
    await adminPage.getByRole("button", { name: `Eliminar categoría ${editedCategoryName}` }).waitFor();
    adminPage.once("dialog", (dialog) => dialog.accept());
    await adminPage.getByRole("button", { name: `Eliminar categoría ${editedCategoryName}` }).click();
    await adminPage.getByRole("button", { name: `Eliminar categoría ${editedCategoryName}` }).waitFor({ state: "detached" });
    await adminPage.locator(".membership-plan-form-actions").getByRole("button", { name: "Cancelar" }).click();

    const planName = `${tag} Plan admin`;
    const editedPlanName = `${tag} Plan editado`;
    await adminPage.getByRole("button", { name: "+ Nuevo plan" }).click();
    await adminPage.locator("#plan-name").fill(planName);
    await adminPage.locator("#plan-category").selectOption(`${tag} Base`);
    await adminPage.locator("#plan-days").fill("3");
    await adminPage.locator("#plan-price").fill("61000");
    await adminPage.getByRole("button", { name: "Crear plan" }).click();
    let planRow = adminPage.locator(".membership-plans-table tbody tr").filter({ hasText: planName });
    await planRow.waitFor();
    await planRow.getByRole("button", { name: "Editar plan" }).click();
    await adminPage.locator("#plan-name").fill(editedPlanName);
    await adminPage.locator("#plan-price").fill("62000");
    await adminPage.getByRole("button", { name: "Guardar cambios" }).click();
    planRow = adminPage.locator(".membership-plans-table tbody tr").filter({ hasText: editedPlanName });
    await planRow.waitFor();
    adminPage.once("dialog", (dialog) => dialog.accept());
    await planRow.getByRole("button", { name: "Eliminar plan" }).click();
    await planRow.waitFor({ state: "detached" });

    await openPage(adminPage, "/admin/turnos");
    const scheduleNotes = `${tag} turno admin`;
    const editedScheduleNotes = `${tag} turno editado`;
    await adminPage.getByRole("button", { name: "+ Nuevo turno" }).click();
    await adminPage.locator("#schedule-day").selectOption(dayNames[(new Date().getDay() + 2) % 7]);
    await adminPage.locator("#schedule-category").selectOption(`${tag} Base`);
    await adminPage.locator("#schedule-start").fill("08:04");
    await adminPage.locator("#schedule-duration").fill("75");
    await adminPage.locator("#schedule-capacity").fill("8");
    await adminPage.locator("#schedule-coach").selectOption(data.coachId);
    await adminPage.locator("#schedule-notes").fill(scheduleNotes);
    await adminPage.getByRole("button", { name: "Crear turno" }).click();
    let scheduleRow = adminPage.locator(".class-schedules-table tbody tr").filter({ hasText: scheduleNotes });
    await scheduleRow.waitFor();
    await scheduleRow.getByRole("button", { name: "Editar turno" }).click();
    await adminPage.locator("#schedule-notes").fill(editedScheduleNotes);
    await adminPage.getByRole("button", { name: "Guardar cambios" }).click();
    scheduleRow = adminPage.locator(".class-schedules-table tbody tr").filter({ hasText: editedScheduleNotes });
    await scheduleRow.waitFor();
    adminPage.once("dialog", (dialog) => dialog.accept());
    await scheduleRow.getByRole("button", { name: "Eliminar turno" }).click();
    await scheduleRow.waitFor({ state: "detached" });

    await openPage(adminPage, "/admin/comunidad");
    const postTitle = `${tag} Post admin`;
    const editedPostTitle = `${tag} Post editado`;
    await adminPage.getByRole("button", { name: "Nueva publicación" }).click();
    let dialog = adminPage.getByRole("dialog", { name: "Nueva publicación" });
    await dialog.getByLabel("Tipo o categoría").fill("Reflexión QA");
    await dialog.getByLabel("Autor").selectOption(data.coachId);
    await dialog.getByLabel("Título").fill(postTitle);
    await dialog.locator('textarea[placeholder^="Escribí la pregunta"]').fill(`${tag} contenido administrativo`);
    await dialog.getByLabel("Video de YouTube (opcional)").fill("https://youtu.be/dQw4w9WgXcQ");
    await dialog.getByRole("button", { name: "Crear publicación" }).click();
    let postCard = adminPage.locator(".admin-community-card").filter({ hasText: postTitle });
    await postCard.waitFor();
    await postCard.getByRole("button", { name: `Editar ${postTitle}` }).click();
    dialog = adminPage.getByRole("dialog", { name: "Editar publicación" });
    await dialog.getByLabel("Título").fill(editedPostTitle);
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    postCard = adminPage.locator(".admin-community-card").filter({ hasText: editedPostTitle });
    await postCard.waitFor();
    adminPage.once("dialog", (dialogEvent) => dialogEvent.accept());
    await postCard.getByRole("button", { name: `Eliminar ${editedPostTitle}` }).click();
    await postCard.waitFor({ state: "detached" });
    assertNoBrowserProblems();
});

test("el administrador edita la portada y el cambio se publica", async () => {
    await openPage(adminPage, "/admin/contenido");
    const bannerSection = adminPage.locator("details.site-content-section").filter({ hasText: "Portada" });
    if (!(await bannerSection.getAttribute("open"))) await bannerSection.locator("summary").click();

    const titleInput = bannerSection.getByText("Título", { exact: true }).locator("..").locator("input");
    const originalTitle = await titleInput.inputValue();
    const editedTitle = `${tag} Portada publicada`;
    siteContentTouched = true;

    await titleInput.fill(editedTitle);
    await adminPage.locator(".site-content-header-actions").getByRole("button", { name: "Guardar cambios" }).click();
    await adminPage.getByText("Contenido de la portada actualizado", { exact: true }).waitFor();
    await waitForDatabase(
        () => prisma.siteContent.findUnique({ where: { key: "home-page" } }),
        (record) => record?.value?.banner?.title === editedTitle,
        "El contenido de portada no se guardó"
    );

    const publicPage = await adminPage.context().newPage();
    attachDiagnostics(publicPage, "portada-editable");
    await openPage(publicPage, "/");
    await publicPage.locator(".bannerTitle").getByText(editedTitle, { exact: true }).waitFor();

    await titleInput.fill(originalTitle);
    await adminPage.locator(".site-content-header-actions").getByRole("button", { name: "Guardar cambios" }).click();
    await waitForDatabase(
        () => prisma.siteContent.findUnique({ where: { key: "home-page" } }),
        (record) => record?.value?.banner?.title === originalTitle,
        "El título original de la portada no se restauró"
    );
    await publicPage.reload({ waitUntil: "domcontentloaded" });
    await publicPage.locator(".bannerTitle").getByText(originalTitle, { exact: true }).waitFor();
    await publicPage.close();
    assertNoBrowserProblems();
});

test("admin y coach operan asistencia/pagos solo sobre el alumno QA", async () => {
    await openPage(adminPage, "/admin/pagos?month=9&year=2026");
    const paymentRow = adminPage.locator(".payments-table tbody tr").filter({ hasText: studentUser.email });
    await paymentRow.waitFor();
    await paymentRow.getByRole("button", { name: "Marcar pagado" }).click();
    await paymentRow.getByRole("button", { name: "Desmarcar" }).waitFor();
    await paymentRow.getByRole("button", { name: "Desmarcar" }).click();
    await paymentRow.getByRole("button", { name: "Marcar pagado" }).waitFor();

    await openPage(adminPage, "/admin/asistencia");
    const attendanceRow = adminPage.locator(".attendance-student").filter({ hasText: `${tag} Alumno` }).first();
    await attendanceRow.waitFor();
    await attendanceRow.getByRole("button", { name: "Ausente" }).click();
    await adminPage.getByText("Asistencia actualizada", { exact: true }).waitFor();
    await waitForDatabase(
        () => prisma.attendance.findFirst({ where: { studentId: data.studentId, session: { scheduleId: data.attendanceScheduleId } } }),
        (attendance) => attendance?.status === "ABSENT",
        "La asistencia administrativa no se actualizó"
    );
    assertNoBrowserProblems();
});

test("el alumno cambia y recupera su contraseña con un token de un solo uso", async () => {
    const changedPassword = `${qaPassword}-cambiada`;
    const recoveredPassword = `${qaPassword}-recuperada`;
    const otherStudentPage = await createRolePage(studentUser, "segunda-sesión-alumno");

    await openPage(otherStudentPage, "/perfil");
    await openPage(studentPage, "/perfil");
    await studentPage.getByRole("button", { name: "Cambiar contraseña" }).click();
    await studentPage.locator("#current-password").fill("clave-incorrecta");
    await studentPage.locator("#new-password").fill(changedPassword);
    await studentPage.locator("#confirm-password").fill(changedPassword);
    await studentPage.getByRole("button", { name: "Guardar contraseña" }).click();
    await studentPage.locator(".change-password-error").getByText("La contraseña actual no es correcta", { exact: true }).waitFor();

    await studentPage.locator("#current-password").fill(qaPassword);
    await studentPage.getByRole("button", { name: "Guardar contraseña" }).click();
    await studentPage.waitForURL((url) => url.pathname === "/auth/login" && url.searchParams.get("passwordChanged") === "1");
    await studentPage.getByText("Contraseña actualizada. Cerramos tus sesiones por seguridad; volvé a ingresar.", { exact: true }).waitFor();
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: data.studentUserId } })).sessionVersion, 1);

    await otherStudentPage.goto(`${baseUrl}/perfil`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(otherStudentPage.url()).pathname, "/auth/login");

    const loginContext = await browser.newContext({ locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", extraHTTPHeaders: { "x-forwarded-for": qaForwardedIp } });
    contexts.push(loginContext);
    const loginPage = await loginContext.newPage();
    attachDiagnostics(loginPage, "login-contraseña");
    await openPage(loginPage, "/auth/login");
    await loginPage.locator("#login-email").fill(studentUser.email);
    await loginPage.locator("#login-password").fill(qaPassword);
    await loginPage.getByRole("button", { name: "Entrar" }).click();
    await loginPage.getByText("Credenciales invalidas", { exact: true }).waitFor();
    await loginPage.locator("#login-password").fill(changedPassword);
    await loginPage.getByRole("button", { name: "Entrar" }).click();
    await loginPage.waitForURL((url) => url.pathname === "/perfil", { timeout: 15_000 });

    const recoveryContext = await browser.newContext({ locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", extraHTTPHeaders: { "x-forwarded-for": qaForwardedIp } });
    contexts.push(recoveryContext);
    const recoveryPage = await recoveryContext.newPage();
    attachDiagnostics(recoveryPage, "recuperación-contraseña");
    await openPage(recoveryPage, "/auth/recuperar");
    await recoveryPage.locator("#password-reset-email").fill(`inexistente-${suffix}@example.com`);
    await recoveryPage.getByRole("button", { name: "Enviar link" }).click();
    await recoveryPage.getByText("Si el email existe y la cuenta esta activa, vas a recibir un link para restablecer la contraseña.", { exact: true }).waitFor();

    const resetToken = `qa-reset-${suffix}`;
    await prisma.passwordResetToken.create({
        data: {
            tokenHash: createHash("sha256").update(resetToken).digest("hex"),
            userId: data.studentUserId,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
    });

    await openPage(recoveryPage, `/auth/restablecer?token=${encodeURIComponent(resetToken)}`);
    await recoveryPage.locator("#reset-password").fill(recoveredPassword);
    await recoveryPage.locator("#reset-confirm-password").fill(recoveredPassword);
    await recoveryPage.getByRole("button", { name: "Guardar contraseña" }).click();
    await recoveryPage.getByText("Contraseña actualizada. Ya podés ingresar con tu nueva contraseña.", { exact: true }).waitFor();
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: data.studentUserId } })).sessionVersion, 2);

    await loginPage.goto(`${baseUrl}/perfil`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(loginPage.url()).pathname, "/auth/login");

    const reusedTokenPage = await recoveryContext.newPage();
    attachDiagnostics(reusedTokenPage, "token-reutilizado");
    await openPage(reusedTokenPage, `/auth/restablecer?token=${encodeURIComponent(resetToken)}`);
    await reusedTokenPage.locator("#reset-password").fill(`${recoveredPassword}-otra`);
    await reusedTokenPage.locator("#reset-confirm-password").fill(`${recoveredPassword}-otra`);
    await reusedTokenPage.getByRole("button", { name: "Guardar contraseña" }).click();
    await reusedTokenPage.getByText("El link de recuperacion expiro o ya fue usado", { exact: true }).waitFor();

    const finalLoginContext = await browser.newContext({ locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", extraHTTPHeaders: { "x-forwarded-for": qaForwardedIp } });
    contexts.push(finalLoginContext);
    const finalLoginPage = await finalLoginContext.newPage();
    attachDiagnostics(finalLoginPage, "login-recuperado");
    await openPage(finalLoginPage, "/auth/login");
    await finalLoginPage.locator("#login-email").fill(studentUser.email);
    await finalLoginPage.locator("#login-password").fill(recoveredPassword);
    await finalLoginPage.getByRole("button", { name: "Entrar" }).click();
    await finalLoginPage.waitForURL((url) => url.pathname === "/perfil", { timeout: 15_000 });
    assertNoBrowserProblems();
});

test("una cuenta suspendida pierde acceso aunque conserve la cookie", async () => {
    await prisma.user.update({ where: { id: data.studentUserId }, data: { status: "SUSPENDED" } });
    await studentPage.goto(`${baseUrl}/perfil`, { waitUntil: "domcontentloaded" });
    assert.equal(new URL(studentPage.url()).pathname, "/auth/login");
    await prisma.user.update({ where: { id: data.studentUserId }, data: { status: "ACTIVE" } });
    assertNoBrowserProblems();
});

test("las vistas principales no generan desborde horizontal en móvil", async () => {
    await studentPage.setViewportSize({ width: 390, height: 844 });
    await openPage(studentPage, "/perfil");
    const studentOverflow = await studentPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(studentOverflow <= 1, `El perfil desborda ${studentOverflow}px en móvil`);

    await adminPage.setViewportSize({ width: 390, height: 844 });
    await openPage(adminPage, "/admin");
    const adminOverflow = await adminPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(adminOverflow <= 1, `El panel admin desborda ${adminOverflow}px en móvil`);
    assertNoBrowserProblems();
});
