"use server";

import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit-log";
import { getCurrentAuthSession } from "@/lib/auth-session";
import {
    getEffectiveScheduleStudentIds,
    getOneTimeScheduleChangesForDate,
    isStudentInScheduleForDate,
    type OneTimeScheduleChange,
} from "@/lib/one-time-schedule-change";
import { prisma } from "@/lib/prisma";
import type {
    AdminAttendanceSchedule,
    AdminMonthlyAttendanceSummary,
    AttendanceStatus,
    CoachTodayAttendanceSchedule,
    DayOfWeek,
} from "@/types/schema/classes";
import { getClassCategoryLabel } from "@/utils/class-category";
import { addMinutesToTime as addMinutesToTimeValue, dayLabels } from "@/utils/schedule";
import { getStudentName } from "@/utils/student";
import type { ActionResponse } from "./_shared";

const coachDashboardPath = "/coach/dashboard";
const adminAttendancePath = "/admin/asistencia";

const dateDayToDayOfWeek: Record<number, DayOfWeek> = {
    0: "SUNDAY",
    1: "MONDAY",
    2: "TUESDAY",
    3: "WEDNESDAY",
    4: "THURSDAY",
    5: "FRIDAY",
    6: "SATURDAY",
};

const presentStatuses: AttendanceStatus[] = ["PRESENT", "LATE"];

const getTodayRange = (date = new Date()) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    return { start, end };
};

const getDateRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

    return { start, end };
};

const getMonthRange = (month?: number | null, year?: number | null) => {
    const today = new Date();
    const normalizedMonth = Number.isInteger(month) && month! >= 1 && month! <= 12
        ? month! - 1
        : today.getMonth();
    const normalizedYear = Number.isInteger(year) && year! >= 2000 && year! <= 2100
        ? year!
        : today.getFullYear();
    const start = new Date(normalizedYear, normalizedMonth, 1);
    const end = new Date(normalizedYear, normalizedMonth + 1, 1);

    return {
        start,
        end,
        month: normalizedMonth + 1,
        year: normalizedYear,
    };
};

const getDateFromInput = (value?: string | null) => {
    if (!value) return new Date();

    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) return new Date();

    return new Date(year, month - 1, day);
};

const addMinutesToDate = (date: Date, minutes: number) => (
    new Date(date.getTime() + minutes * 60 * 1000)
);

const addMinutesToTime = (time: string, minutesToAdd: number) => {
    return addMinutesToTimeValue(time, minutesToAdd) || null;
};

const getScheduleStartsAt = (date: Date, startTime: string) => {
    const [hours, minutes] = startTime.split(":").map(Number);

    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
};

type ScheduledClassSessionInput = {
    scheduleId: string;
    coachId: string | null;
    startsAt: Date;
    endsAt: Date;
    capacity: number | null;
};

const upsertScheduledClassSession = ({
    scheduleId,
    coachId,
    startsAt,
    endsAt,
    capacity,
}: ScheduledClassSessionInput) => prisma.classSession.upsert({
    where: {
        scheduleId_startsAt: {
            scheduleId,
            startsAt,
        },
    },
    update: {
        coachId,
        endsAt,
        capacity,
        status: "SCHEDULED",
    },
    create: {
        scheduleId,
        coachId,
        startsAt,
        endsAt,
        capacity,
        status: "SCHEDULED",
    },
});

const getCurrentCoachId = async () => {
    const session = await getCurrentAuthSession();

    if (!session || session.role !== "COACH") return null;

    const coach = await prisma.coach.findUnique({
        where: {
            userId: session.userId,
        },
        select: {
            id: true,
        },
    });

    return coach?.id ?? null;
};

const getAttendanceErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    if (error.message === "Necesitas iniciar sesion como coach") return error.message;
    if (error.message === "No se encontro el turno") return error.message;
    if (error.message === "El alumno no pertenece a este turno") return error.message;

    return fallback;
};

const getAdminAttendanceErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
        if (error.message === "No se encontro el turno") return error.message;
        if (error.message === "El alumno no pertenece a este turno") return error.message;
    }

    return getAdminActionErrorMessage(error, fallback);
};

type MonthlyAttendanceSummaryRow = {
    studentId: string;
    firstName: string | null;
    lastName: string | null;
    userName: string | null;
    email: string;
    coachUserName: string | null;
    coachUserEmail: string | null;
    totalCount: number | bigint;
    presentCount: number | bigint;
    absentCount: number | bigint;
    lateCount: number | bigint;
    excusedCount: number | bigint;
    lastAttendanceAt: Date | null;
};

type AttendanceRosterStudent = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    user: {
        email: string;
        name: string | null;
        image: {
            url: string;
        } | null;
    };
};

const getOneTimeChangeStudents = async (changes: OneTimeScheduleChange[]) => {
    const studentIds = Array.from(new Set(changes.map((change) => change.studentId)));

    if (studentIds.length === 0) return [];

    return prisma.student.findMany({
        where: {
            id: {
                in: studentIds,
            },
        },
        include: {
            user: {
                include: {
                    image: true,
                },
            },
        },
    });
};

const getRosterStudentMap = (
    schedules: Array<{ studentAssignments: Array<{ student: AttendanceRosterStudent }> }>,
    oneTimeStudents: AttendanceRosterStudent[]
) => {
    const students = new Map<string, AttendanceRosterStudent>();

    schedules.forEach((schedule) => {
        schedule.studentAssignments.forEach(({ student }) => students.set(student.id, student));
    });
    oneTimeStudents.forEach((student) => students.set(student.id, student));

    return students;
};

const toNumber = (value: number | bigint) => Number(value);

export const getCoachTodayAttendance = async (): Promise<ActionResponse<CoachTodayAttendanceSchedule[]>> => {
    try {
        const coachId = await getCurrentCoachId();

        if (!coachId) throw new Error("Necesitas iniciar sesion como coach");

        const today = new Date();
        const { start, end } = getTodayRange(today);
        const dayOfWeek = dateDayToDayOfWeek[today.getDay()];
        const [schedules, oneTimeChanges] = await Promise.all([
            prisma.weeklyClassSchedule.findMany({
                where: {
                    coachId,
                    dayOfWeek,
                    isActive: true,
                },
                orderBy: {
                    startTime: "asc",
                },
                include: {
                    sessions: {
                        where: {
                            startsAt: {
                                gte: start,
                                lt: end,
                            },
                        },
                        include: {
                            attendance: true,
                        },
                    },
                    studentAssignments: {
                        where: {
                            isActive: true,
                        },
                        include: {
                            student: {
                                include: {
                                    user: {
                                        include: {
                                            image: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            }),
            getOneTimeScheduleChangesForDate(today),
        ]);
        const oneTimeStudents = await getOneTimeChangeStudents(oneTimeChanges);
        const studentById = getRosterStudentMap(schedules, oneTimeStudents);

        const attendanceSchedules = schedules.map((schedule): CoachTodayAttendanceSchedule => {
            const session = schedule.sessions[0] ?? null;
            const attendanceByStudent = new Map(
                session?.attendance.map((attendance) => [attendance.studentId, attendance]) ?? []
            );
            const endTime = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

            return {
                scheduleId: schedule.id,
                sessionId: session?.id ?? null,
                label: `${getClassCategoryLabel(schedule.classCategory)} · ${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endTime ? ` a ${endTime}` : ""}`,
                startTime: schedule.startTime,
                endTime,
                students: getEffectiveScheduleStudentIds({
                    scheduleId: schedule.id,
                    fixedStudentIds: schedule.studentAssignments.map((assignment) => assignment.studentId),
                    changes: oneTimeChanges,
                }).flatMap((studentId) => {
                    const student = studentById.get(studentId);

                    if (!student) return [];

                    return [{
                        studentId: student.id,
                        name: getStudentName(student),
                        email: student.user.email,
                        imageUrl: student.user.image?.url ?? null,
                        status: attendanceByStudent.get(student.id)?.status ?? null,
                    }];
                }),
            };
        });

        return {
            ok: true,
            data: attendanceSchedules,
        };
    } catch (error) {
        console.error("Error al obtener la asistencia del coach:", error);

        return {
            ok: false,
            data: null,
            error: getAttendanceErrorMessage(error, "No se pudo obtener la asistencia"),
        };
    }
};

export const markCoachStudentAttendance = async (
    scheduleId: string,
    studentId: string,
    status: AttendanceStatus
): Promise<ActionResponse<{ attendanceId: string } | null>> => {
    try {
        const coachId = await getCurrentCoachId();

        if (!coachId) throw new Error("Necesitas iniciar sesion como coach");

        const today = new Date();
        const schedule = await prisma.weeklyClassSchedule.findFirst({
            where: {
                id: scheduleId,
                coachId,
                isActive: true,
            },
            include: {
                studentAssignments: {
                    where: {
                        studentId,
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!schedule) throw new Error("No se encontro el turno");

        const oneTimeChanges = await getOneTimeScheduleChangesForDate(today);
        const belongsToSchedule = isStudentInScheduleForDate({
            studentId,
            scheduleId: schedule.id,
            hasFixedAssignment: schedule.studentAssignments.length > 0,
            changes: oneTimeChanges,
        });

        if (!belongsToSchedule) throw new Error("El alumno no pertenece a este turno");

        const startsAt = getScheduleStartsAt(today, schedule.startTime);
        const endsAt = addMinutesToDate(startsAt, schedule.durationMinutes);
        const session = await upsertScheduledClassSession({
            scheduleId: schedule.id,
            coachId,
            startsAt,
            endsAt,
            capacity: schedule.capacity,
        });
        const attendance = await prisma.attendance.upsert({
            where: {
                sessionId_studentId: {
                    sessionId: session.id,
                    studentId,
                },
            },
            update: {
                status,
                checkInAt: presentStatuses.includes(status) ? new Date() : null,
            },
            create: {
                sessionId: session.id,
                studentId,
                status,
                checkInAt: presentStatuses.includes(status) ? new Date() : null,
            },
        });

        revalidatePath(coachDashboardPath);
        await writeAuditLog({
            action: "ATTENDANCE_MARK_COACH",
            entityType: "Attendance",
            entityId: attendance.id,
            metadata: {
                scheduleId,
                studentId,
                status,
                date: today.toISOString(),
            },
        });

        return {
            ok: true,
            data: {
                attendanceId: attendance.id,
            },
        };
    } catch (error) {
        console.error("Error al marcar la asistencia del coach:", error);

        return {
            ok: false,
            data: null,
            error: getAttendanceErrorMessage(error, "No se pudo marcar la asistencia"),
        };
    }
};

export type GetAdminAttendanceInput = {
    date?: string | null;
    coachId?: string | null;
};

export type GetAdminMonthlyAttendanceInput = {
    month?: number | null;
    year?: number | null;
    coachId?: string | null;
};

export type AdminAttendanceSummary = {
    date: string;
    schedulesCount: number;
    studentsCount: number;
    markedCount: number;
    pendingCount: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    schedulesWithoutAttendance: Array<{
        scheduleId: string;
        label: string;
        coachName: string;
        studentsCount: number;
    }>;
};

export const getAdminAttendanceOverview = async (
    input: GetAdminAttendanceInput = {}
): Promise<ActionResponse<AdminAttendanceSchedule[]>> => {
    try {
        await requireAdminSession();

        const selectedDate = getDateFromInput(input.date);
        const { start, end } = getDateRange(selectedDate);
        const dayOfWeek = dateDayToDayOfWeek[selectedDate.getDay()];
        const [schedules, oneTimeChanges] = await Promise.all([
            prisma.weeklyClassSchedule.findMany({
                where: {
                    dayOfWeek,
                    isActive: true,
                    coachId: input.coachId && input.coachId !== "all" ? input.coachId : undefined,
                },
                orderBy: [
                    {
                        startTime: "asc",
                    },
                ],
                include: {
                    coach: {
                        include: {
                            user: true,
                        },
                    },
                    sessions: {
                        where: {
                            startsAt: {
                                gte: start,
                                lt: end,
                            },
                        },
                        include: {
                            attendance: true,
                        },
                    },
                    studentAssignments: {
                        where: {
                            isActive: true,
                        },
                        include: {
                            student: {
                                include: {
                                    user: {
                                        include: {
                                            image: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            }),
            getOneTimeScheduleChangesForDate(selectedDate),
        ]);
        const oneTimeStudents = await getOneTimeChangeStudents(oneTimeChanges);
        const studentById = getRosterStudentMap(schedules, oneTimeStudents);

        const attendanceSchedules = schedules.map((schedule): AdminAttendanceSchedule => {
            const session = schedule.sessions[0] ?? null;
            const attendanceByStudent = new Map(
                session?.attendance.map((attendance) => [attendance.studentId, attendance]) ?? []
            );
            const endTime = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

            return {
                scheduleId: schedule.id,
                sessionId: session?.id ?? null,
                coachId: schedule.coachId,
                coachName: schedule.coach?.user?.name || schedule.coach?.user?.email || "Sin coach asignado",
                label: `${getClassCategoryLabel(schedule.classCategory)} · ${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endTime ? ` a ${endTime}` : ""}`,
                startTime: schedule.startTime,
                endTime,
                students: getEffectiveScheduleStudentIds({
                    scheduleId: schedule.id,
                    fixedStudentIds: schedule.studentAssignments.map((assignment) => assignment.studentId),
                    changes: oneTimeChanges,
                }).flatMap((studentId) => {
                    const student = studentById.get(studentId);

                    if (!student) return [];

                    return [{
                        studentId: student.id,
                        name: getStudentName(student),
                        email: student.user.email,
                        imageUrl: student.user.image?.url ?? null,
                        status: attendanceByStudent.get(student.id)?.status ?? null,
                    }];
                }),
            };
        });

        return {
            ok: true,
            data: attendanceSchedules,
        };
    } catch (error) {
        logAdminActionError("Error al obtener la asistencia de administracion:", error);

        return {
            ok: false,
            data: null,
            error: getAdminAttendanceErrorMessage(error, "No se pudo obtener la asistencia"),
        };
    }
};

export const getAdminMonthlyAttendanceSummary = async (
    input: GetAdminMonthlyAttendanceInput = {}
): Promise<ActionResponse<AdminMonthlyAttendanceSummary | null>> => {
    try {
        await requireAdminSession();

        const { start, end, month, year } = getMonthRange(input.month, input.year);
        const coachFilter = input.coachId && input.coachId !== "all"
            ? Prisma.sql`AND cs."coachId" = ${input.coachId}`
            : Prisma.empty;
        const rows = await prisma.$queryRaw<MonthlyAttendanceSummaryRow[]>(Prisma.sql`
            WITH filtered_attendance AS (
                SELECT
                    a."studentId",
                    a."status",
                    COALESCE(cs."startsAt", a."createdAt") AS "attendanceAt",
                    s."firstName",
                    s."lastName",
                    u."name" AS "userName",
                    u."email",
                    cu."name" AS "coachUserName",
                    cu."email" AS "coachUserEmail"
                FROM "Attendance" a
                INNER JOIN "ClassSession" cs ON cs."id" = a."sessionId"
                INNER JOIN "Student" s ON s."id" = a."studentId"
                INNER JOIN "User" u ON u."id" = s."userId"
                LEFT JOIN "Coach" c ON c."id" = cs."coachId"
                LEFT JOIN "User" cu ON cu."id" = c."userId"
                WHERE cs."startsAt" >= ${start}
                    AND cs."startsAt" < ${end}
                    ${coachFilter}
            ),
            student_summary AS (
                SELECT
                    "studentId",
                    MAX("firstName") AS "firstName",
                    MAX("lastName") AS "lastName",
                    MAX("userName") AS "userName",
                    MAX("email") AS "email",
                    COUNT(*)::int AS "totalCount",
                    COUNT(*) FILTER (WHERE "status" = 'PRESENT')::int AS "presentCount",
                    COUNT(*) FILTER (WHERE "status" = 'ABSENT')::int AS "absentCount",
                    COUNT(*) FILTER (WHERE "status" = 'LATE')::int AS "lateCount",
                    COUNT(*) FILTER (WHERE "status" = 'EXCUSED')::int AS "excusedCount",
                    MAX("attendanceAt") AS "lastAttendanceAt"
                FROM filtered_attendance
                GROUP BY "studentId"
            ),
            latest_coach AS (
                SELECT DISTINCT ON ("studentId")
                    "studentId",
                    "coachUserName",
                    "coachUserEmail"
                FROM filtered_attendance
                ORDER BY "studentId", "attendanceAt" DESC
            )
            SELECT
                ss."studentId",
                ss."firstName",
                ss."lastName",
                ss."userName",
                ss."email",
                lc."coachUserName",
                lc."coachUserEmail",
                ss."totalCount",
                ss."presentCount",
                ss."absentCount",
                ss."lateCount",
                ss."excusedCount",
                ss."lastAttendanceAt"
            FROM student_summary ss
            LEFT JOIN latest_coach lc ON lc."studentId" = ss."studentId"
        `);
        const students = rows.map((row): AdminMonthlyAttendanceSummary["students"][number] => ({
            studentId: row.studentId,
            name: getStudentName({
                firstName: row.firstName,
                lastName: row.lastName,
                user: {
                    name: row.userName,
                    email: row.email,
                },
            }),
            email: row.email,
            coachName: row.coachUserName || row.coachUserEmail || "Sin coach asignado",
            totalCount: toNumber(row.totalCount),
            presentCount: toNumber(row.presentCount),
            absentCount: toNumber(row.absentCount),
            lateCount: toNumber(row.lateCount),
            excusedCount: toNumber(row.excusedCount),
            lastAttendanceAt: row.lastAttendanceAt,
        })).sort((a, b) => a.name.localeCompare(b.name));
        const totals = students.reduce((summary, student) => ({
            totalCount: summary.totalCount + student.totalCount,
            presentCount: summary.presentCount + student.presentCount,
            absentCount: summary.absentCount + student.absentCount,
            lateCount: summary.lateCount + student.lateCount,
            excusedCount: summary.excusedCount + student.excusedCount,
        }), {
            totalCount: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            excusedCount: 0,
        });

        return {
            ok: true,
            data: {
                month,
                year,
                ...totals,
                students,
            },
        };
    } catch (error) {
        logAdminActionError("Error al obtener el resumen mensual de asistencia:", error);

        return {
            ok: false,
            data: null,
            error: getAdminAttendanceErrorMessage(error, "No se pudo obtener el resumen mensual de asistencia"),
        };
    }
};

export const markAdminStudentAttendance = async (
    scheduleId: string,
    studentId: string,
    status: AttendanceStatus,
    date?: string | null
): Promise<ActionResponse<{ attendanceId: string } | null>> => {
    try {
        await requireAdminSession();

        const selectedDate = getDateFromInput(date);
        const schedule = await prisma.weeklyClassSchedule.findFirst({
            where: {
                id: scheduleId,
                isActive: true,
            },
            include: {
                studentAssignments: {
                    where: {
                        studentId,
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!schedule) throw new Error("No se encontro el turno");

        const oneTimeChanges = await getOneTimeScheduleChangesForDate(selectedDate);
        const belongsToSchedule = isStudentInScheduleForDate({
            studentId,
            scheduleId: schedule.id,
            hasFixedAssignment: schedule.studentAssignments.length > 0,
            changes: oneTimeChanges,
        });

        if (!belongsToSchedule) throw new Error("El alumno no pertenece a este turno");

        const startsAt = getScheduleStartsAt(selectedDate, schedule.startTime);
        const endsAt = addMinutesToDate(startsAt, schedule.durationMinutes);
        const session = await upsertScheduledClassSession({
            scheduleId: schedule.id,
            coachId: schedule.coachId,
            startsAt,
            endsAt,
            capacity: schedule.capacity,
        });
        const attendance = await prisma.attendance.upsert({
            where: {
                sessionId_studentId: {
                    sessionId: session.id,
                    studentId,
                },
            },
            update: {
                status,
                checkInAt: presentStatuses.includes(status) ? new Date() : null,
            },
            create: {
                sessionId: session.id,
                studentId,
                status,
                checkInAt: presentStatuses.includes(status) ? new Date() : null,
            },
        });

        revalidatePath(adminAttendancePath);
        revalidatePath(coachDashboardPath);
        await writeAuditLog({
            action: "ATTENDANCE_MARK_ADMIN",
            entityType: "Attendance",
            entityId: attendance.id,
            metadata: {
                scheduleId,
                studentId,
                status,
                date: selectedDate.toISOString(),
            },
        });

        return {
            ok: true,
            data: {
                attendanceId: attendance.id,
            },
        };
    } catch (error) {
        logAdminActionError("Error al marcar la asistencia desde administracion:", error);

        return {
            ok: false,
            data: null,
            error: getAdminAttendanceErrorMessage(error, "No se pudo marcar la asistencia"),
        };
    }
};

export const getAdminTodayAttendanceSummary = async (): Promise<ActionResponse<AdminAttendanceSummary | null>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const attendanceResponse = await getAdminAttendanceOverview({
            date,
        });

        if (!attendanceResponse.ok) {
            return attendanceResponse;
        }

        const schedules = attendanceResponse.data;
        const students = schedules.flatMap((schedule) => schedule.students);
        const schedulesWithoutAttendance = schedules
            .filter((schedule) => schedule.students.length > 0 && schedule.students.every((student) => !student.status))
            .map((schedule) => ({
                scheduleId: schedule.scheduleId,
                label: schedule.label,
                coachName: schedule.coachName,
                studentsCount: schedule.students.length,
            }));

        return {
            ok: true,
            data: {
                date,
                schedulesCount: schedules.length,
                studentsCount: students.length,
                markedCount: students.filter((student) => student.status).length,
                pendingCount: students.filter((student) => !student.status).length,
                presentCount: students.filter((student) => student.status === "PRESENT").length,
                absentCount: students.filter((student) => student.status === "ABSENT").length,
                lateCount: students.filter((student) => student.status === "LATE").length,
                excusedCount: students.filter((student) => student.status === "EXCUSED").length,
                schedulesWithoutAttendance,
            },
        };
    } catch (error) {
        logAdminActionError("Error al obtener el resumen de asistencia de administracion:", error);

        return {
            ok: false,
            data: null,
            error: getAdminAttendanceErrorMessage(error, "No se pudo obtener el resumen de asistencia"),
        };
    }
};
