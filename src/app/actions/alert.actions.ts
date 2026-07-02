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

const maxAlertItems = 8;

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

const studentAlertSelect = {
    id: true,
    firstName: true,
    lastName: true,
    routineExcelUrl: true,
    coachId: true,
    user: {
        select: {
            name: true,
            email: true,
        },
    },
    coach: {
        select: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    },
} as const;

const sampleStudentName = (students: Array<StudentNameSource>) => (
    students[0] ? getStudentName(students[0]) : null
);

export const getAdminAlerts = async (): Promise<ActionResponse<AdminAlert[]>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const { start: monthStart, end: monthEnd } = getCurrentMonthRange(today);
        const { start: todayStart, end: todayEnd } = getTodayRange(today);
        const dayOfWeek = dateDayToDayOfWeek[today.getDay()];
        const dueDate = getPaymentDueDate(today);
        const activeStudentWhere = {
            user: {
                status: "ACTIVE" as const,
            },
        };
        const activeMembershipWhere = {
            status: "ACTIVE" as const,
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
        };
        const currentMonthPaymentWhere = {
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
        };
        const paidCurrentMonthPaymentWhere = {
            status: "PAID" as const,
            ...currentMonthPaymentWhere,
        };
        const latePaymentWhere = {
            ...activeMembershipWhere,
            payments: {
                none: paidCurrentMonthPaymentWhere,
            },
        };
        const missingPlanWhere = {
            ...activeStudentWhere,
            memberships: {
                none: activeMembershipWhere,
            },
        };
        const missingSchedulesWhere = {
            ...activeStudentWhere,
            schedules: {
                none: {
                    isActive: true,
                },
            },
        };
        const missingCoachWhere = {
            ...activeStudentWhere,
            coachId: null,
        };
        const missingRoutineWhere = {
            ...activeStudentWhere,
            OR: [
                {
                    routineExcelUrl: null,
                },
                {
                    routineExcelUrl: "",
                },
            ],
        };
        const schedulesWithoutAttendanceWhere = {
            dayOfWeek,
            isActive: true,
            studentAssignments: {
                some: {
                    isActive: true,
                },
            },
            sessions: {
                none: {
                    startsAt: {
                        gte: todayStart,
                        lt: todayEnd,
                    },
                    attendance: {
                        some: {},
                    },
                },
            },
        };
        const [
            latePaymentCount,
            latePaymentItems,
            missingPlanCount,
            missingPlanItems,
            missingSchedulesCount,
            missingSchedulesItems,
            missingCoachCount,
            missingCoachItems,
            missingRoutineCount,
            missingRoutineItems,
            schedulesWithoutAttendanceCount,
            schedulesWithoutAttendanceItems,
            monthlyAbsences,
        ] = await Promise.all([
            today > dueDate
                ? prisma.studentMembership.count({
                    where: latePaymentWhere,
                })
                : 0,
            today > dueDate
                ? prisma.studentMembership.findMany({
                    where: latePaymentWhere,
                    take: maxAlertItems,
                    orderBy: {
                        createdAt: "desc",
                    },
                    select: {
                        student: {
                            select: studentAlertSelect,
                        },
                    },
                })
                : [],
            prisma.student.count({
                where: missingPlanWhere,
            }),
            prisma.student.findMany({
                where: missingPlanWhere,
                take: maxAlertItems,
                orderBy: {
                    createdAt: "desc",
                },
                select: studentAlertSelect,
            }),
            prisma.student.count({
                where: missingSchedulesWhere,
            }),
            prisma.student.findMany({
                where: missingSchedulesWhere,
                take: maxAlertItems,
                orderBy: {
                    createdAt: "desc",
                },
                select: studentAlertSelect,
            }),
            prisma.student.count({
                where: missingCoachWhere,
            }),
            prisma.student.findMany({
                where: missingCoachWhere,
                take: maxAlertItems,
                orderBy: {
                    createdAt: "desc",
                },
                select: studentAlertSelect,
            }),
            prisma.student.count({
                where: missingRoutineWhere,
            }),
            prisma.student.findMany({
                where: missingRoutineWhere,
                take: maxAlertItems,
                orderBy: {
                    createdAt: "desc",
                },
                select: studentAlertSelect,
            }),
            prisma.weeklyClassSchedule.count({
                where: schedulesWithoutAttendanceWhere,
            }),
            prisma.weeklyClassSchedule.findMany({
                where: schedulesWithoutAttendanceWhere,
                take: maxAlertItems,
                orderBy: {
                    startTime: "asc",
                },
                select: {
                    id: true,
                    startTime: true,
                    coach: {
                        select: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
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
                },
            }),
            prisma.attendance.groupBy({
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
                orderBy: {
                    _count: {
                        studentId: "desc",
                    },
                },
            }),
        ]);
        const absentStudentIds = monthlyAbsences.slice(0, maxAlertItems).map((absence) => absence.studentId);
        const absentStudents = absentStudentIds.length > 0
            ? await prisma.student.findMany({
                where: {
                    id: {
                        in: absentStudentIds,
                    },
                },
                select: studentAlertSelect,
            })
            : [];
        const absenceCountByStudentId = new Map(
            monthlyAbsences.map((absence) => [absence.studentId, absence._count.studentId])
        );
        const orderedAbsentStudents = absentStudentIds
            .map((id) => absentStudents.find((student) => student.id === id))
            .filter((student): student is NonNullable<typeof student> => !!student);
        const latePaymentStudents = latePaymentItems.map((membership) => membership.student);
        const alerts: AdminAlert[] = [
            {
                id: "late-payments",
                title: "Pagos atrasados",
                description: latePaymentCount > 0
                    ? `${latePaymentCount} alumnos no pagaron despues del dia ${PAYMENT_DUE_DAY}. ${sampleStudentName(latePaymentStudents) ? `Ej: ${sampleStudentName(latePaymentStudents)}.` : ""}`
                    : "No hay pagos atrasados para el mes actual.",
                href: "/admin/pagos",
                severity: latePaymentCount > 0 ? "HIGH" : "LOW",
                count: latePaymentCount,
                items: latePaymentStudents.map((student) => toStudentAlertItem(
                    student,
                    `${student.coach?.user?.name || "Sin coach"} · Pago pendiente del mes actual`
                )),
            },
            {
                id: "missing-plan",
                title: "Sin plan",
                description: missingPlanCount > 0
                    ? `${missingPlanCount} alumnos activos no tienen plan asignado. ${sampleStudentName(missingPlanItems) ? `Ej: ${sampleStudentName(missingPlanItems)}.` : ""}`
                    : "Todos los alumnos activos tienen plan asignado.",
                href: "/admin/alumnos",
                severity: missingPlanCount > 0 ? "HIGH" : "LOW",
                count: missingPlanCount,
                items: missingPlanItems.map((student) => toStudentAlertItem(
                    student,
                    `${student.coach?.user?.name || "Sin coach"} · Asignar plan`
                )),
            },
            {
                id: "missing-schedules",
                title: "Sin turnos elegidos",
                description: missingSchedulesCount > 0
                    ? `${missingSchedulesCount} alumnos activos no tienen horarios. ${sampleStudentName(missingSchedulesItems) ? `Ej: ${sampleStudentName(missingSchedulesItems)}.` : ""}`
                    : "Todos los alumnos activos tienen turnos asignados.",
                href: "/admin/alumnos",
                severity: missingSchedulesCount > 0 ? "MEDIUM" : "LOW",
                count: missingSchedulesCount,
                items: missingSchedulesItems.map((student) => toStudentAlertItem(
                    student,
                    `${student.coach?.user?.name || "Sin coach"} · ${student.user.email}`
                )),
            },
            {
                id: "attendance-pending",
                title: "Turnos sin asistencia",
                description: schedulesWithoutAttendanceCount > 0
                    ? `${schedulesWithoutAttendanceCount} turnos de hoy tienen alumnos pero no tienen asistencia marcada.`
                    : "La asistencia de hoy esta al dia.",
                href: "/admin/asistencia",
                severity: schedulesWithoutAttendanceCount > 0 ? "HIGH" : "LOW",
                count: schedulesWithoutAttendanceCount,
                items: schedulesWithoutAttendanceItems.map((schedule) => ({
                    id: schedule.id,
                    title: `${schedule.startTime} · ${schedule.coach?.user?.name || schedule.coach?.user?.email || "Sin coach asignado"}`,
                    description: `${schedule.studentAssignments.length} alumnos sin asistencia marcada`,
                    href: "/admin/asistencia",
                })),
            },
            {
                id: "high-absences",
                title: "Ausencias altas",
                description: monthlyAbsences.length > 0
                    ? `${monthlyAbsences.length} alumnos tienen 2 o mas ausencias este mes. ${orderedAbsentStudents[0] ? `Ej: ${getStudentName(orderedAbsentStudents[0])}.` : ""}`
                    : "No hay alumnos con ausencias altas este mes.",
                href: "/admin/asistencia",
                severity: monthlyAbsences.length > 0 ? "MEDIUM" : "LOW",
                count: monthlyAbsences.length,
                items: orderedAbsentStudents.map((student) => toStudentAlertItem(
                    student,
                    `${absenceCountByStudentId.get(student.id) ?? 0} ausencias registradas este mes`
                )),
            },
            {
                id: "missing-routines",
                title: "Sin rutina",
                description: missingRoutineCount > 0
                    ? `${missingRoutineCount} alumnos activos todavia no tienen rutina cargada. ${sampleStudentName(missingRoutineItems) ? `Ej: ${sampleStudentName(missingRoutineItems)}.` : ""}`
                    : "Todos los alumnos activos tienen rutina cargada.",
                href: "/admin/alumnos",
                severity: missingRoutineCount > 0 ? "MEDIUM" : "LOW",
                count: missingRoutineCount,
                items: missingRoutineItems.map((student) => toStudentAlertItem(
                    student,
                    `${student.coach?.user?.name || "Sin coach"} · Rutina pendiente`
                )),
            },
            {
                id: "missing-coach",
                title: "Sin coach asignado",
                description: missingCoachCount > 0
                    ? `${missingCoachCount} alumnos activos no tienen coach asignado. ${sampleStudentName(missingCoachItems) ? `Ej: ${sampleStudentName(missingCoachItems)}.` : ""}`
                    : "Todos los alumnos activos tienen coach asignado.",
                href: "/admin/alumnos",
                severity: missingCoachCount > 0 ? "HIGH" : "LOW",
                count: missingCoachCount,
                items: missingCoachItems.map((student) => toStudentAlertItem(
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
