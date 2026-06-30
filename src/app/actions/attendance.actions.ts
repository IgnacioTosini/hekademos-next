"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit-log";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import type {
    AdminAttendanceSchedule,
    AdminMonthlyAttendanceSummary,
    AttendanceStatus,
    CoachTodayAttendanceSchedule,
    DayOfWeek,
} from "@/types/schema/classes";
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
    if (error.message === "UNAUTHORIZED") return "Necesitas iniciar sesion como coach";
    if (error.message === "SCHEDULE_NOT_FOUND") return "No se encontro el turno";
    if (error.message === "STUDENT_NOT_IN_SCHEDULE") return "El alumno no pertenece a este turno";

    return fallback;
};

const getAdminAttendanceErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
        if (error.message === "SCHEDULE_NOT_FOUND") return "No se encontro el turno";
        if (error.message === "STUDENT_NOT_IN_SCHEDULE") return "El alumno no pertenece a este turno";
    }

    return getAdminActionErrorMessage(error, fallback);
};

export const getCoachTodayAttendance = async (): Promise<ActionResponse<CoachTodayAttendanceSchedule[]>> => {
    try {
        const coachId = await getCurrentCoachId();

        if (!coachId) throw new Error("UNAUTHORIZED");

        const today = new Date();
        const { start, end } = getTodayRange(today);
        const dayOfWeek = dateDayToDayOfWeek[today.getDay()];
        const schedules = await prisma.weeklyClassSchedule.findMany({
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
        });

        const attendanceSchedules = schedules.map((schedule): CoachTodayAttendanceSchedule => {
            const session = schedule.sessions[0] ?? null;
            const attendanceByStudent = new Map(
                session?.attendance.map((attendance) => [attendance.studentId, attendance]) ?? []
            );
            const endTime = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

            return {
                scheduleId: schedule.id,
                sessionId: session?.id ?? null,
                label: `${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endTime ? ` a ${endTime}` : ""}`,
                startTime: schedule.startTime,
                endTime,
                students: schedule.studentAssignments.map((assignment) => {
                    const student = assignment.student;

                    return {
                        studentId: student.id,
                        name: getStudentName(student),
                        email: student.user.email,
                        imageUrl: student.user.image?.url ?? null,
                        status: attendanceByStudent.get(student.id)?.status ?? null,
                    };
                }),
            };
        });

        return {
            ok: true,
            data: attendanceSchedules,
        };
    } catch (error) {
        console.error("Error getting coach attendance:", error);

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

        if (!coachId) throw new Error("UNAUTHORIZED");

        const today = new Date();
        const { start, end } = getTodayRange(today);
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

        if (!schedule) throw new Error("SCHEDULE_NOT_FOUND");
        if (schedule.studentAssignments.length === 0) throw new Error("STUDENT_NOT_IN_SCHEDULE");

        const startsAt = getScheduleStartsAt(today, schedule.startTime);
        const endsAt = addMinutesToDate(startsAt, schedule.durationMinutes);
        const existingSession = await prisma.classSession.findFirst({
            where: {
                scheduleId: schedule.id,
                startsAt: {
                    gte: start,
                    lt: end,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const session = existingSession
            ? await prisma.classSession.update({
                where: {
                    id: existingSession.id,
                },
                data: {
                    coachId,
                    startsAt,
                    endsAt,
                    capacity: schedule.capacity,
                    status: "SCHEDULED",
                },
            })
            : await prisma.classSession.create({
                data: {
                    scheduleId: schedule.id,
                    coachId,
                    startsAt,
                    endsAt,
                    capacity: schedule.capacity,
                    status: "SCHEDULED",
                },
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
        console.error("Error marking coach attendance:", error);

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
        const schedules = await prisma.weeklyClassSchedule.findMany({
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
        });

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
                label: `${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endTime ? ` a ${endTime}` : ""}`,
                startTime: schedule.startTime,
                endTime,
                students: schedule.studentAssignments.map((assignment) => {
                    const student = assignment.student;

                    return {
                        studentId: student.id,
                        name: getStudentName(student),
                        email: student.user.email,
                        imageUrl: student.user.image?.url ?? null,
                        status: attendanceByStudent.get(student.id)?.status ?? null,
                    };
                }),
            };
        });

        return {
            ok: true,
            data: attendanceSchedules,
        };
    } catch (error) {
        logAdminActionError("Error getting admin attendance:", error);

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
        const attendance = await prisma.attendance.findMany({
            where: {
                session: {
                    startsAt: {
                        gte: start,
                        lt: end,
                    },
                    coachId: input.coachId && input.coachId !== "all" ? input.coachId : undefined,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                student: {
                    include: {
                        user: true,
                    },
                },
                session: {
                    include: {
                        coach: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
        });
        const studentsMap = new Map<string, AdminMonthlyAttendanceSummary["students"][number]>();

        attendance.forEach((attendanceItem) => {
            const current = studentsMap.get(attendanceItem.studentId) ?? {
                studentId: attendanceItem.studentId,
                name: getStudentName(attendanceItem.student),
                email: attendanceItem.student.user.email,
                coachName: attendanceItem.session.coach?.user?.name || attendanceItem.session.coach?.user?.email || "Sin coach asignado",
                totalCount: 0,
                presentCount: 0,
                absentCount: 0,
                lateCount: 0,
                excusedCount: 0,
                lastAttendanceAt: null,
            };
            const attendanceDate = attendanceItem.session.startsAt ?? attendanceItem.createdAt;

            current.totalCount += 1;
            current.presentCount += attendanceItem.status === "PRESENT" ? 1 : 0;
            current.absentCount += attendanceItem.status === "ABSENT" ? 1 : 0;
            current.lateCount += attendanceItem.status === "LATE" ? 1 : 0;
            current.excusedCount += attendanceItem.status === "EXCUSED" ? 1 : 0;

            if (!current.lastAttendanceAt || new Date(attendanceDate).getTime() > new Date(current.lastAttendanceAt).getTime()) {
                current.lastAttendanceAt = attendanceDate;
            }

            studentsMap.set(attendanceItem.studentId, current);
        });

        return {
            ok: true,
            data: {
                month,
                year,
                totalCount: attendance.length,
                presentCount: attendance.filter((item) => item.status === "PRESENT").length,
                absentCount: attendance.filter((item) => item.status === "ABSENT").length,
                lateCount: attendance.filter((item) => item.status === "LATE").length,
                excusedCount: attendance.filter((item) => item.status === "EXCUSED").length,
                students: Array.from(studentsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
            },
        };
    } catch (error) {
        logAdminActionError("Error getting monthly attendance summary:", error);

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
        const { start, end } = getDateRange(selectedDate);
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

        if (!schedule) throw new Error("SCHEDULE_NOT_FOUND");
        if (schedule.studentAssignments.length === 0) throw new Error("STUDENT_NOT_IN_SCHEDULE");

        const startsAt = getScheduleStartsAt(selectedDate, schedule.startTime);
        const endsAt = addMinutesToDate(startsAt, schedule.durationMinutes);
        const existingSession = await prisma.classSession.findFirst({
            where: {
                scheduleId: schedule.id,
                startsAt: {
                    gte: start,
                    lt: end,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const session = existingSession
            ? await prisma.classSession.update({
                where: {
                    id: existingSession.id,
                },
                data: {
                    coachId: schedule.coachId,
                    startsAt,
                    endsAt,
                    capacity: schedule.capacity,
                    status: "SCHEDULED",
                },
            })
            : await prisma.classSession.create({
                data: {
                    scheduleId: schedule.id,
                    coachId: schedule.coachId,
                    startsAt,
                    endsAt,
                    capacity: schedule.capacity,
                    status: "SCHEDULED",
                },
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
        logAdminActionError("Error marking admin attendance:", error);

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
        logAdminActionError("Error getting admin attendance summary:", error);

        return {
            ok: false,
            data: null,
            error: getAdminAttendanceErrorMessage(error, "No se pudo obtener el resumen de asistencia"),
        };
    }
};
