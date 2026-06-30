"use server";

import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import type { DayOfWeek } from "@/types/schema/classes";
import { getCurrentMonthRange } from "@/utils/date";
import { getPaymentDueDate, PAYMENT_DUE_DAY } from "@/utils/payment";
import { getStudentName, type StudentNameSource } from "@/utils/student";
import type { ActionResponse } from "./_shared";

export type AdminAlertSeverity = "HIGH" | "MEDIUM" | "LOW";

export type AdminAlertItem = {
    id: string;
    title: string;
    description: string;
    href: string;
};

export type AdminAlert = {
    id: string;
    title: string;
    description: string;
    href: string;
    severity: AdminAlertSeverity;
    count: number;
    items: AdminAlertItem[];
};

const dateDayToDayOfWeek: Record<number, DayOfWeek> = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
};

const getTodayRange = (date = new Date()) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    return { start, end };
};

const toStudentAlertItem = (
    student: StudentNameSource & {
        id: string;
    },
    description: string
): AdminAlertItem => ({
    id: student.id,
    title: getStudentName(student),
    description,
    href: `/admin/alumnos/${student.id}`,
});

export const getAdminAlerts = async (): Promise<ActionResponse<AdminAlert[]>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const { start: monthStart, end: monthEnd } = getCurrentMonthRange(today);
        const { start: todayStart, end: todayEnd } = getTodayRange(today);
        const dayOfWeek = dateDayToDayOfWeek[today.getDay()];
        const dueDate = getPaymentDueDate(today);
        const activeStudents = await prisma.student.findMany({
            where: {
                user: {
                    status: "ACTIVE",
                },
            },
            include: {
                user: true,
                coach: {
                    include: {
                        user: true,
                    },
                },
                memberships: {
                    where: {
                        status: "ACTIVE",
                        OR: [
                            {
                                endDate: null,
                            },
                            {
                                endDate: {
                                    gte: today,
                                },
                            },
                        ],
                    },
                    select: {
                        id: true,
                    },
                },
                schedules: {
                    where: {
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        });
        const activeMemberships = await prisma.studentMembership.findMany({
            where: {
                status: "ACTIVE",
                OR: [
                    {
                        endDate: null,
                    },
                    {
                        endDate: {
                            gte: today,
                        },
                    },
                ],
            },
            include: {
                student: {
                    include: {
                        user: true,
                        coach: {
                            include: {
                                user: true,
                            },
                        },
                        schedules: {
                            where: {
                                isActive: true,
                            },
                            select: {
                                id: true,
                            },
                        },
                    },
                },
                payments: {
                    where: {
                        OR: [
                            {
                                dueDate: {
                                    gte: monthStart,
                                    lt: monthEnd,
                                },
                            },
                            {
                                paidAt: {
                                    gte: monthStart,
                                    lt: monthEnd,
                                },
                            },
                        ],
                    },
                },
            },
        });
        const latePaymentMemberships = today > dueDate
            ? activeMemberships.filter((membership) => !membership.payments.some((payment) => payment.status === "PAID"))
            : [];
        const activeStudentsWithoutPlan = activeStudents.filter((student) => (
            student.memberships.length === 0
        ));
        const activeStudentsWithoutSchedules = activeStudents.filter((student) => (
            student.schedules.length === 0
        ));
        const activeStudentsWithoutCoach = activeStudents.filter((student) => (
            !student.coachId
        ));
        const activeStudentsWithoutRoutine = activeStudents.filter((student) => (
            !student.routineExcelUrl
        ));
        const todaySchedules = await prisma.weeklyClassSchedule.findMany({
            where: {
                dayOfWeek,
                isActive: true,
            },
            include: {
                coach: {
                    include: {
                        user: true,
                    },
                },
                studentAssignments: {
                    where: {
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                },
                sessions: {
                    where: {
                        startsAt: {
                            gte: todayStart,
                            lt: todayEnd,
                        },
                    },
                    include: {
                        attendance: true,
                    },
                },
            },
        });
        const schedulesWithoutAttendance = todaySchedules.filter((schedule) => (
            schedule.studentAssignments.length > 0
            && schedule.sessions.every((session) => session.attendance.length === 0)
        ));
        const monthlyAbsences = await prisma.attendance.groupBy({
            by: ["studentId"],
            where: {
                status: "ABSENT",
                session: {
                    startsAt: {
                        gte: monthStart,
                        lt: monthEnd,
                    },
                },
            },
            _count: {
                studentId: true,
            },
            having: {
                studentId: {
                    _count: {
                        gte: 2,
                    },
                },
            },
        });
        const absentStudentIds = monthlyAbsences.map((absence) => absence.studentId);
        const absentStudents = absentStudentIds.length > 0
            ? await prisma.student.findMany({
                where: {
                    id: {
                        in: absentStudentIds,
                    },
                },
                include: {
                    user: true,
                },
            })
            : [];
        const sampleName = (memberships: typeof activeMemberships) => (
            memberships[0] ? getStudentName(memberships[0].student) : null
        );
        const sampleStudentName = (students: typeof activeStudents) => (
            students[0] ? getStudentName(students[0]) : null
        );
        const alerts: AdminAlert[] = [
            {
                id: "late-payments",
                title: "Pagos atrasados",
                description: latePaymentMemberships.length > 0
                    ? `${latePaymentMemberships.length} alumnos no pagaron despues del dia ${PAYMENT_DUE_DAY}. ${sampleName(latePaymentMemberships) ? `Ej: ${sampleName(latePaymentMemberships)}.` : ""}`
                    : "No hay pagos atrasados para el mes actual.",
                href: "/admin/pagos",
                severity: latePaymentMemberships.length > 0 ? "HIGH" : "LOW",
                count: latePaymentMemberships.length,
                items: latePaymentMemberships.map((membership) => toStudentAlertItem(
                    membership.student,
                    `${membership.student.coach?.user?.name || "Sin coach"} · Pago pendiente del mes actual`
                )),
            },
            {
                id: "missing-plan",
                title: "Sin plan",
                description: activeStudentsWithoutPlan.length > 0
                    ? `${activeStudentsWithoutPlan.length} alumnos activos no tienen plan asignado. ${sampleStudentName(activeStudentsWithoutPlan) ? `Ej: ${sampleStudentName(activeStudentsWithoutPlan)}.` : ""}`
                    : "Todos los alumnos activos tienen plan asignado.",
                href: "/admin/alumnos",
                severity: activeStudentsWithoutPlan.length > 0 ? "HIGH" : "LOW",
                count: activeStudentsWithoutPlan.length,
                items: activeStudentsWithoutPlan.map((student) => toStudentAlertItem(
                    student,
                    `${student.coach?.user?.name || "Sin coach"} · Asignar plan`
                )),
            },
            {
                id: "missing-schedules",
                title: "Sin turnos elegidos",
                description: activeStudentsWithoutSchedules.length > 0
                    ? `${activeStudentsWithoutSchedules.length} alumnos activos no tienen horarios. ${sampleStudentName(activeStudentsWithoutSchedules) ? `Ej: ${sampleStudentName(activeStudentsWithoutSchedules)}.` : ""}`
                    : "Todos los alumnos activos tienen turnos asignados.",
                href: "/admin/alumnos",
                severity: activeStudentsWithoutSchedules.length > 0 ? "MEDIUM" : "LOW",
                count: activeStudentsWithoutSchedules.length,
                items: activeStudentsWithoutSchedules.map((student) => toStudentAlertItem(
                    student,
                    `${student.coach?.user?.name || "Sin coach"} · ${student.user.email}`
                )),
            },
            {
                id: "attendance-pending",
                title: "Turnos sin asistencia",
                description: schedulesWithoutAttendance.length > 0
                    ? `${schedulesWithoutAttendance.length} turnos de hoy tienen alumnos pero no tienen asistencia marcada.`
                    : "La asistencia de hoy esta al dia.",
                href: "/admin/asistencia",
                severity: schedulesWithoutAttendance.length > 0 ? "HIGH" : "LOW",
                count: schedulesWithoutAttendance.length,
                items: schedulesWithoutAttendance.map((schedule) => ({
                    id: schedule.id,
                    title: `${schedule.startTime} · ${schedule.coach?.user?.name || schedule.coach?.user?.email || "Sin coach asignado"}`,
                    description: `${schedule.studentAssignments.length} alumnos sin asistencia marcada`,
                    href: "/admin/asistencia",
                })),
            },
            {
                id: "high-absences",
                title: "Ausencias altas",
                description: absentStudents.length > 0
                    ? `${absentStudents.length} alumnos tienen 2 o mas ausencias este mes. ${absentStudents[0] ? `Ej: ${getStudentName(absentStudents[0])}.` : ""}`
                    : "No hay alumnos con ausencias altas este mes.",
                href: "/admin/asistencia",
                severity: absentStudents.length > 0 ? "MEDIUM" : "LOW",
                count: absentStudents.length,
                items: absentStudents.map((student) => {
                    const absenceCount = monthlyAbsences.find((absence) => absence.studentId === student.id)?._count.studentId ?? 0;

                    return toStudentAlertItem(
                        student,
                        `${absenceCount} ausencias registradas este mes`
                    );
                }),
            },
            {
                id: "missing-routines",
                title: "Sin rutina",
                description: activeStudentsWithoutRoutine.length > 0
                    ? `${activeStudentsWithoutRoutine.length} alumnos activos todavia no tienen rutina cargada. ${sampleStudentName(activeStudentsWithoutRoutine) ? `Ej: ${sampleStudentName(activeStudentsWithoutRoutine)}.` : ""}`
                    : "Todos los alumnos activos tienen rutina cargada.",
                href: "/admin/alumnos",
                severity: activeStudentsWithoutRoutine.length > 0 ? "MEDIUM" : "LOW",
                count: activeStudentsWithoutRoutine.length,
                items: activeStudentsWithoutRoutine.map((student) => toStudentAlertItem(
                    student,
                    `${student.coach?.user?.name || "Sin coach"} · Rutina pendiente`
                )),
            },
            {
                id: "missing-coach",
                title: "Sin coach asignado",
                description: activeStudentsWithoutCoach.length > 0
                    ? `${activeStudentsWithoutCoach.length} alumnos activos no tienen coach asignado. ${sampleStudentName(activeStudentsWithoutCoach) ? `Ej: ${sampleStudentName(activeStudentsWithoutCoach)}.` : ""}`
                    : "Todos los alumnos activos tienen coach asignado.",
                href: "/admin/alumnos",
                severity: activeStudentsWithoutCoach.length > 0 ? "HIGH" : "LOW",
                count: activeStudentsWithoutCoach.length,
                items: activeStudentsWithoutCoach.map((student) => toStudentAlertItem(
                    student,
                    `${student.user.email} · Asignar coach`
                )),
            },
        ];

        return {
            ok: true,
            data: alerts,
        };
    } catch (error) {
        logAdminActionError("Error getting admin alerts:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudieron obtener las alertas"),
        };
    }
};
