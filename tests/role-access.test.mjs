import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const cookieName = "hekademos-session";
const redirectStatuses = new Set([303, 307, 308]);
let prisma;
let sessions;

const createSessionCookie = (user) => {
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

    return `${cookieName}=${payload}.${signature}`;
};

const request = async (path, cookie) => {
    const response = await fetch(`${baseUrl}${path}`, {
        headers: cookie ? { cookie } : {},
        redirect: "manual",
    });
    const body = await response.text();

    assert.equal(body.includes("Application error: a server-side exception"), false, `${path} mostró una excepción de servidor`);
    assert.equal(body.includes("Internal Server Error"), false, `${path} devolvió un error interno`);

    return { response, body };
};

const expectPage = async (path, cookie) => {
    const { response, body } = await request(path, cookie);
    assert.equal(response.status, 200, `${path} debía responder 200 y respondió ${response.status}`);
    assert.ok(body.length > 500, `${path} devolvió una página inesperadamente vacía`);
};

const expectRedirect = async (path, expectedPath, cookie) => {
    const { response } = await request(path, cookie);
    assert.equal(redirectStatuses.has(response.status), true, `${path} debía redirigir y respondió ${response.status}`);
    const location = response.headers.get("location");
    assert.ok(location, `${path} no indicó el destino de la redirección`);
    assert.equal(new URL(location, baseUrl).pathname, expectedPath);
};

before(async () => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL debe estar configurada para probar los roles");
    prisma = new PrismaClient();

    const [admin, coach, student] = await Promise.all([
        prisma.user.findFirst({ where: { role: "ADMIN", status: "ACTIVE" } }),
        prisma.user.findFirst({ where: { role: "COACH", status: "ACTIVE", coach: { isNot: null } } }),
        prisma.user.findFirst({ where: { role: "STUDENT", status: "ACTIVE", student: { isNot: null } }, include: { student: true } }),
    ]);

    assert.ok(admin, "Se necesita al menos un administrador activo para la prueba");
    assert.ok(coach, "Se necesita al menos un coach activo para la prueba");
    assert.ok(student, "Se necesita al menos un alumno activo para la prueba");
    sessions = {
        admin: createSessionCookie(admin),
        coach: createSessionCookie(coach),
        student: createSessionCookie(student),
        studentId: student.student.id,
    };
});

after(async () => {
    await prisma?.$disconnect();
});

test("las páginas públicas cargan y las privadas exigen autenticación", async () => {
    await expectPage("/", null);
    await expectPage("/auth/login", null);
    await expectPage("/auth/recuperar", null);
    await expectPage("/auth/restablecer", null);
    await expectRedirect("/perfil", "/auth/login", null);
    await expectRedirect("/coach/dashboard", "/auth/login", null);
    await expectRedirect("/admin", "/auth/login", null);
    await expectRedirect("/comunidad", "/auth/login", null);
});

test("una cookie manipulada no permite entrar", async () => {
    await expectRedirect("/perfil", "/auth/login", `${sessions.student}alterada`);
});

test("una cookie firmada para el antiguo env-admin tampoco permite entrar", async () => {
    const removedBootstrapSession = createSessionCookie({
        id: "env-admin",
        email: process.env.ADMIN_EMAIL ?? "admin@hekademos.test",
        name: "Admin virtual eliminado",
        role: "ADMIN",
        sessionVersion: 0,
    });

    await expectRedirect("/admin", "/auth/login", removedBootstrapSession);
});

test("las rutas de imágenes bloquean accesos anónimos y archivos del sitio para alumnos", async () => {
    const unauthenticatedUpload = await fetch(`${baseUrl}/api/upload-image`, {
        method: "POST",
        body: new FormData(),
    });
    const unauthenticatedDelete = await fetch(`${baseUrl}/api/delete-image?publicId=Hekademos/site/qa-no-auth`, {
        method: "DELETE",
    });
    const siteForm = new FormData();
    siteForm.append("area", "site");
    const studentSiteUpload = await fetch(`${baseUrl}/api/upload-image`, {
        method: "POST",
        headers: { cookie: sessions.student },
        body: siteForm,
    });
    const studentSiteDelete = await fetch(`${baseUrl}/api/delete-image?publicId=Hekademos/site/qa-protected`, {
        method: "DELETE",
        headers: { cookie: sessions.student },
    });

    assert.equal(unauthenticatedUpload.status, 401);
    assert.equal(unauthenticatedDelete.status, 401);
    assert.equal(studentSiteUpload.status, 403);
    assert.equal(studentSiteDelete.status, 403);
});

test("el alumno abre su perfil y comunidad pero no áreas de coach o admin", async () => {
    await expectPage("/perfil?month=9&year=2026", sessions.student);
    await expectPage("/comunidad", sessions.student);
    await expectRedirect("/student/dashboard", "/perfil", sessions.student);
    await expectRedirect("/coach/dashboard", "/perfil", sessions.student);
    await expectRedirect("/admin", "/perfil", sessions.student);
});

test("el coach abre su panel y comunidad pero no áreas de alumno o admin", async () => {
    await expectPage("/coach/dashboard", sessions.coach);
    await expectPage("/comunidad", sessions.coach);
    await expectRedirect("/perfil", "/coach/dashboard", sessions.coach);
    await expectRedirect("/student/dashboard", "/perfil", sessions.coach);
    await expectRedirect("/admin", "/perfil", sessions.coach);
});

test("el administrador abre todas las pantallas administrativas", async () => {
    const adminRoutes = [
        "/admin",
        "/admin/alumnos",
        `/admin/alumnos/${sessions.studentId}`,
        "/admin/asistencia",
        "/admin/auditoria",
        "/admin/coaches",
        "/admin/comunidad",
        "/admin/contenido",
        "/admin/pagos",
        "/admin/planes",
        "/admin/solicitudes-horarios",
        "/admin/turnos",
        "/admin/usuarios",
    ];

    for (const route of adminRoutes) {
        await expectPage(route, sessions.admin);
    }

    await expectRedirect("/perfil", "/admin", sessions.admin);
    await expectRedirect("/coach/dashboard", "/admin", sessions.admin);
});
