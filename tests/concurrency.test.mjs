import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";

import { getPaymentPeriodStart } from "../src/utils/payment.ts";

let prisma;
let fixture;

before(async () => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL debe estar configurada para probar concurrencia");
    prisma = new PrismaClient();

    const suffix = randomUUID();
    const user = await prisma.user.create({
        data: {
            email: `concurrency-${suffix}@qa.hekademos.test`,
            name: "Alumno concurrencia QA",
            role: "STUDENT",
            status: "ACTIVE",
        },
    });
    const student = await prisma.student.create({
        data: {
            userId: user.id,
            firstName: "Concurrencia",
            lastName: "QA",
        },
    });
    const plan = await prisma.membershipPlan.create({
        data: {
            name: `Plan concurrencia ${suffix}`,
            classCategory: "Calistenia",
            trainingDaysPerWeek: 1,
            priceCents: 25_000_00,
        },
    });
    const membership = await prisma.studentMembership.create({
        data: {
            studentId: student.id,
            planId: plan.id,
            startDate: new Date("2035-01-01T00:00:00.000Z"),
            status: "ACTIVE",
        },
    });
    const schedule = await prisma.weeklyClassSchedule.create({
        data: {
            dayOfWeek: "MONDAY",
            classCategory: "Calistenia",
            startTime: "12:34",
            durationMinutes: 90,
            capacity: 10,
        },
    });

    fixture = { user, student, plan, membership, schedule };
});

after(async () => {
    if (!prisma) return;

    if (fixture?.schedule?.id) {
        await prisma.weeklyClassSchedule.deleteMany({ where: { id: fixture.schedule.id } });
    }
    if (fixture?.user?.id) {
        await prisma.user.deleteMany({ where: { id: fixture.user.id } });
    }
    if (fixture?.plan?.id) {
        await prisma.membershipPlan.deleteMany({ where: { id: fixture.plan.id } });
    }

    await prisma.$disconnect();
});

test("un solo proceso puede reclamar el recordatorio mensual y reintentar un fallo", async () => {
    const key = { studentId: fixture.student.id, periodStart: new Date("2035-01-01T00:00:00Z"), reminderType: "MONTHLY" };
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => prisma.paymentReminderDelivery.create({ data: key })));
    assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
    for (const item of results.filter((item) => item.status === "rejected")) assert.equal(item.reason.code, "P2002");
    await prisma.paymentReminderDelivery.updateMany({ where: key, data: { status: "FAILED" } });
    const retries = await Promise.all(Array.from({ length: 12 }, () => prisma.paymentReminderDelivery.updateMany({ where: { ...key, status: "FAILED" }, data: { status: "PROCESSING" } })));
    assert.equal(retries.reduce((sum, item) => sum + item.count, 0), 1);
});

test("varios upserts simultáneos generan un solo pago mensual", async () => {
    const periodStart = getPaymentPeriodStart(new Date(2035, 0, 15));
    const dueDate = new Date("2035-01-10T23:59:59.999Z");
    const results = await Promise.all(
        Array.from({ length: 12 }, () => prisma.payment.upsert({
            where: {
                studentId_periodStart: {
                    studentId: fixture.student.id,
                    periodStart,
                },
            },
            update: {
                reference: "prueba-concurrente",
            },
            create: {
                studentId: fixture.student.id,
                studentMembershipId: fixture.membership.id,
                periodStart,
                amountCents: 25_000_00,
                currency: "ARS",
                status: "PENDING",
                dueDate,
                reference: "prueba-concurrente",
            },
        }))
    );
    const ids = new Set(results.map((payment) => payment.id));
    const count = await prisma.payment.count({
        where: {
            studentId: fixture.student.id,
            periodStart,
        },
    });

    assert.equal(ids.size, 1);
    assert.equal(count, 1);
});

test("varios upserts simultáneos generan una sola sesión de turno", async () => {
    const startsAt = new Date("2035-01-08T12:34:00.000Z");
    const endsAt = new Date("2035-01-08T14:04:00.000Z");
    const results = await Promise.all(
        Array.from({ length: 12 }, () => prisma.classSession.upsert({
            where: {
                scheduleId_startsAt: {
                    scheduleId: fixture.schedule.id,
                    startsAt,
                },
            },
            update: {
                endsAt,
                capacity: 10,
                status: "SCHEDULED",
            },
            create: {
                scheduleId: fixture.schedule.id,
                startsAt,
                endsAt,
                capacity: 10,
                status: "SCHEDULED",
            },
        }))
    );
    const ids = new Set(results.map((session) => session.id));
    const count = await prisma.classSession.count({
        where: {
            scheduleId: fixture.schedule.id,
            startsAt,
        },
    });

    assert.equal(ids.size, 1);
    assert.equal(count, 1);
});
