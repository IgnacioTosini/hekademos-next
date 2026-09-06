import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

import { normalizeClassCategoryKey } from "../src/utils/class-category.ts";

let prisma;

before(() => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL debe estar configurada para probar la base");
    prisma = new PrismaClient();
});

after(async () => {
    await prisma?.$disconnect();
});

test("los usuarios de alumno y coach tienen su perfil correspondiente", async () => {
    const [studentsWithoutProfile, coachesWithoutProfile, invalidStudentProfiles, invalidCoachProfiles] = await Promise.all([
        prisma.user.count({ where: { role: "STUDENT", student: null } }),
        prisma.user.count({ where: { role: "COACH", coach: null } }),
        prisma.student.count({ where: { user: { role: { not: "STUDENT" } } } }),
        prisma.coach.count({ where: { user: { role: { not: "COACH" } } } }),
    ]);

    assert.deepEqual({ studentsWithoutProfile, coachesWithoutProfile, invalidStudentProfiles, invalidCoachProfiles }, {
        studentsWithoutProfile: 0,
        coachesWithoutProfile: 0,
        invalidStudentProfiles: 0,
        invalidCoachProfiles: 0,
    });
});

test("planes, turnos y categorías contienen valores válidos y relacionados", async () => {
    const [plans, schedules, categories] = await Promise.all([
        prisma.membershipPlan.findMany({
            select: { id: true, name: true, classCategory: true, trainingDaysPerWeek: true, priceCents: true },
        }),
        prisma.weeklyClassSchedule.findMany({
            select: { id: true, classCategory: true, startTime: true, durationMinutes: true, capacity: true },
        }),
        prisma.classCategoryOption.findMany({ select: { id: true, name: true, normalizedName: true } }),
    ]);
    const categoryKeys = new Set(categories.map((category) => category.normalizedName));
    const issues = [];
    const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

    categories.forEach((category) => {
        if (category.normalizedName !== normalizeClassCategoryKey(category.name)) {
            issues.push(`Categoría ${category.id} tiene una clave normalizada inconsistente`);
        }
    });
    plans.forEach((plan) => {
        if (!plan.name.trim()) issues.push(`Plan ${plan.id} sin nombre`);
        if (plan.trainingDaysPerWeek < 1 || plan.trainingDaysPerWeek > 7) issues.push(`Plan ${plan.id} con días semanales inválidos`);
        if (plan.priceCents <= 0) issues.push(`Plan ${plan.id} con precio no positivo`);
        if (!categoryKeys.has(normalizeClassCategoryKey(plan.classCategory))) issues.push(`Plan ${plan.id} referencia una categoría inexistente`);
    });
    schedules.forEach((schedule) => {
        if (!timePattern.test(schedule.startTime)) issues.push(`Turno ${schedule.id} con hora inválida`);
        if (schedule.durationMinutes <= 0) issues.push(`Turno ${schedule.id} con duración inválida`);
        if (schedule.capacity !== null && schedule.capacity <= 0) issues.push(`Turno ${schedule.id} con capacidad inválida`);
        if (!categoryKeys.has(normalizeClassCategoryKey(schedule.classCategory))) issues.push(`Turno ${schedule.id} referencia una categoría inexistente`);
    });

    assert.deepEqual(issues, []);
});

test("no existen membresías activas duplicadas para un alumno", async () => {
    const now = new Date();
    const memberships = await prisma.studentMembership.findMany({
        where: {
            status: "ACTIVE",
            OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
        select: { id: true, studentId: true },
    });
    const counts = new Map();

    memberships.forEach(({ studentId }) => counts.set(studentId, (counts.get(studentId) ?? 0) + 1));
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1);

    assert.deepEqual(duplicates, []);
});

test("asignaciones y pagos coinciden con el alumno de su membresía", async () => {
    const [assignmentMismatches, paymentMismatches] = await Promise.all([
        prisma.$queryRaw`
            SELECT COUNT(*)::int AS "count"
            FROM "StudentScheduleAssignment" assignment
            INNER JOIN "StudentMembership" membership ON membership."id" = assignment."studentMembershipId"
            WHERE assignment."studentMembershipId" IS NOT NULL
              AND assignment."studentId" <> membership."studentId"
        `,
        prisma.$queryRaw`
            SELECT COUNT(*)::int AS "count"
            FROM "Payment" payment
            INNER JOIN "StudentMembership" membership ON membership."id" = payment."studentMembershipId"
            WHERE payment."studentMembershipId" IS NOT NULL
              AND payment."studentId" <> membership."studentId"
        `,
    ]);

    assert.equal(assignmentMismatches[0]?.count ?? 0, 0);
    assert.equal(paymentMismatches[0]?.count ?? 0, 0);
});

test("los turnos no superan su capacidad fija", async () => {
    const schedules = await prisma.weeklyClassSchedule.findMany({
        where: { capacity: { not: null } },
        select: {
            id: true,
            capacity: true,
            _count: { select: { studentAssignments: { where: { isActive: true } } } },
        },
    });
    const exceeded = schedules
        .filter((schedule) => schedule.capacity !== null && schedule._count.studentAssignments > schedule.capacity)
        .map((schedule) => schedule.id);

    assert.deepEqual(exceeded, []);
});

test("pagos y solicitudes de cambio respetan invariantes básicas", async () => {
    const [invalidPayments, requests] = await Promise.all([
        prisma.payment.findMany({ where: { amountCents: { lte: 0 } }, select: { id: true } }),
        prisma.scheduleChangeRequest.findMany({
            select: {
                id: true,
                type: true,
                status: true,
                currentScheduleIds: true,
                requestedScheduleIds: true,
                requestedDate: true,
            },
        }),
    ]);
    const invalidRequests = requests.filter((request) => {
        if (request.currentScheduleIds.length === 0 || request.requestedScheduleIds.length === 0) return true;
        if (request.type === "ONE_TIME") {
            // Las solicitudes anteriores al cambio automático usaban ONE_TIME para
            // cambiar el conjunto completo. Se conservan como historial terminal,
            // pero ninguna solicitud pendiente puede usar ese formato heredado.
            if (!request.requestedDate) return request.status === "PENDING";

            return request.currentScheduleIds.length !== 1
                || request.requestedScheduleIds.length !== 1;
        }
        return request.requestedDate !== null;
    });

    assert.deepEqual(invalidPayments, []);
    assert.deepEqual(invalidRequests, []);
});

test("no existen pagos mensuales ni sesiones de turno duplicados", async () => {
    const [payments, sessions] = await Promise.all([
        prisma.payment.findMany({
            select: { id: true, studentId: true, periodStart: true },
        }),
        prisma.classSession.findMany({
            where: { scheduleId: { not: null } },
            select: { id: true, scheduleId: true, startsAt: true },
        }),
    ]);
    const duplicateKeys = (records, getKey) => {
        const seen = new Set();
        const duplicates = [];

        records.forEach((record) => {
            const key = getKey(record);

            if (seen.has(key)) duplicates.push(key);
            seen.add(key);
        });

        return duplicates;
    };

    assert.deepEqual(
        duplicateKeys(payments, (payment) => `${payment.studentId}:${payment.periodStart.toISOString()}`),
        []
    );
    assert.deepEqual(
        duplicateKeys(sessions, (session) => `${session.scheduleId}:${session.startsAt.toISOString()}`),
        []
    );
});
