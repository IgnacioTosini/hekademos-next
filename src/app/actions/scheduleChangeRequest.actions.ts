"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { writeAuditLog } from "@/lib/audit-log";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { isDeliverableEmail } from "@/lib/form-validation";
import { prisma } from "@/lib/prisma";
import type {
    ScheduleChangeRequest,
    ScheduleChangeRequestStatus,
    WeeklyClassScheduleWithRelations,
} from "@/types/schema/classes";
import type { PrismaDate } from "@/types/schema/common";
import type { User, UserImage } from "@/types/schema/users";
import { addMinutesToTime, dayLabels, dayOrderIndex } from "@/utils/schedule";
import { getStudentName } from "@/utils/student";
import { adminStudentsPath, type ActionResponse } from "./_shared";

const scheduleRequestsPath = "/admin/solicitudes-horarios";
const coachDashboardPath = "/coach/dashboard";
const profilePath = "/perfil";

type StudentNotificationStatus = "SENT" | "FAILED" | "SKIPPED_INVALID_EMAIL" | "SKIPPED_NO_STUDENT";

type ScheduleChangeRequestRow = {
    id: string;
    studentId: string;
    type: ScheduleChangeRequest["type"];
    status: ScheduleChangeRequestStatus;
    currentScheduleIds: string[];
    requestedScheduleIds: string[];
    requestedDate: PrismaDate | null;
    reason: string;
    reviewNotes: string | null;
    reviewedByUserId: string | null;
    reviewedAt: PrismaDate | null;
    createdAt: PrismaDate;
    updatedAt: PrismaDate;
};

type ScheduleRequestStudent = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    coachId: string | null;
    user: User & {
        image?: UserImage | null;
    };
    coach?: {
        id: string;
        user?: Pick<User, "email" | "name"> | null;
    } | null;
};

export type ScheduleChangeRequestReviewItem = ScheduleChangeRequest & {
    student: ScheduleRequestStudent | null;
    currentSchedules: WeeklyClassScheduleWithRelations[];
    requestedSchedules: WeeklyClassScheduleWithRelations[];
    reviewedBy?: Pick<User, "id" | "email" | "name"> | null;
};

export type ReviewScheduleChangeRequestInput = {
    requestId: string;
    notes?: string | null;
};

const requireScheduleRequestReviewer = async () => {
    const session = await getCurrentAuthSession();

    if (!session) throw new Error("UNAUTHORIZED");
    if (session.role !== "ADMIN" && session.role !== "COACH") {
        throw new Error("FORBIDDEN");
    }

    return session;
};

const getScheduleRequestErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    if (error.message === "UNAUTHORIZED") return "Necesitas iniciar sesion";
    if (error.message === "FORBIDDEN") return "Solo admin o coaches pueden revisar solicitudes";
    if (error.message === "SCHEDULE_REQUEST_NOT_FOUND") return "No se encontro la solicitud";
    if (error.message === "SCHEDULE_REQUEST_NOT_PENDING") return "La solicitud ya fue revisada";
    if (error.message === "NO_ACTIVE_MEMBERSHIP") return "El alumno no tiene una membresia activa";
    if (error.message === "SCHEDULE_LIMIT_EXCEEDED") return "La cantidad de turnos supera el plan del alumno";
    if (error.message === "SCHEDULE_NOT_FOUND") return "Uno de los turnos solicitados ya no esta disponible";
    if (error.message === "SCHEDULE_REPEATED_DAY") return "La solicitud tiene mas de un turno en el mismo dia";
    if (error.message === "SCHEDULE_FULL") return "Uno de los turnos solicitados ya no tiene cupo";

    return fallback;
};

const toStringArray = (value: unknown) => (Array.isArray(value) ? value.filter(Boolean).map(String) : []);

const getAppBaseUrl = () => (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.AUTH_BASE_URL
    || "http://localhost:3000"
);

const requestTypeLabels: Record<ScheduleChangeRequest["type"], string> = {
    ONE_TIME: "Solo por esta clase",
    PERMANENT: "Cambio permanente",
};

const getScheduleLabel = (schedule: {
    dayOfWeek: keyof typeof dayLabels;
    startTime: string;
    durationMinutes: number;
}) => {
    const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

    return `${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endsAt ? ` a ${endsAt}` : ""}`;
};

const formatScheduleLabels = async (scheduleIds: string[]) => {
    if (scheduleIds.length === 0) return "Sin turnos solicitados";

    const schedules = await prisma.weeklyClassSchedule.findMany({
        where: {
            id: {
                in: scheduleIds,
            },
        },
    });
    const orderedSchedules = schedules.sort(sortSchedules);

    return orderedSchedules.map(getScheduleLabel).join("\n") || "Sin turnos solicitados";
};

const sendScheduleChangeRequestReviewNotification = async ({
    request,
    statusLabel,
    notes,
}: {
    request: ScheduleChangeRequestRow;
    statusLabel: "aprobada" | "rechazada";
    notes: string | null;
}): Promise<StudentNotificationStatus> => {
    const student = await prisma.student.findUnique({
        where: {
            id: request.studentId,
        },
        include: {
            user: true,
        },
    });

    if (!student) return "SKIPPED_NO_STUDENT";
    if (!isDeliverableEmail(student.user.email)) return "SKIPPED_INVALID_EMAIL";

    const studentName = getStudentName(student);
    const requestedSchedulesLabel = await formatScheduleLabels(toStringArray(request.requestedScheduleIds));
    const emailMessage = buildEmailMessage({
        type: "SCHEDULE_CHANGE_REQUEST_REVIEW",
        to: {
            email: student.user.email,
            name: studentName,
        },
        data: {
            studentName,
            statusLabel,
            requestTypeLabel: requestTypeLabels[request.type],
            requestedSchedulesLabel,
            reviewNotes: notes,
            profileUrl: `${getAppBaseUrl()}${profilePath}`,
        },
    });

    try {
        await sendEmail(emailMessage);
        return "SENT";
    } catch (error) {
        console.error(`Error sending schedule request review notification to ${student.user.email}:`, error);
        return "FAILED";
    }
};

const getScheduleChangeRequestById = async (requestId: string) => {
    const requests = await prisma.$queryRaw<ScheduleChangeRequestRow[]>`
        SELECT
            "id",
            "studentId",
            "type"::text AS "type",
            "status"::text AS "status",
            "currentScheduleIds",
            "requestedScheduleIds",
            "requestedDate",
            "reason",
            "reviewNotes",
            "reviewedByUserId",
            "reviewedAt",
            "createdAt",
            "updatedAt"
        FROM "ScheduleChangeRequest"
        WHERE "id" = ${requestId}
        LIMIT 1
    `;

    return requests[0] ?? null;
};

const withScheduleCounts = (schedule: WeeklyClassScheduleWithRelations): WeeklyClassScheduleWithRelations => {
    const occupiedSpots = schedule.studentAssignments?.filter((assignment) => assignment.isActive).length ?? 0;

    return {
        ...schedule,
        occupiedSpots,
        availableSpots: schedule.capacity === null ? null : Math.max(schedule.capacity - occupiedSpots, 0),
    };
};

const isSchedule = (
    schedule?: WeeklyClassScheduleWithRelations
): schedule is WeeklyClassScheduleWithRelations => Boolean(schedule);

const getScheduleRequestDetails = async (
    rows: ScheduleChangeRequestRow[]
): Promise<ScheduleChangeRequestReviewItem[]> => {
    const studentIds = Array.from(new Set(rows.map((request) => request.studentId)));
    const scheduleIds = Array.from(new Set(rows.flatMap((request) => [
        ...toStringArray(request.currentScheduleIds),
        ...toStringArray(request.requestedScheduleIds),
    ])));
    const reviewerIds = Array.from(new Set(rows.map((request) => request.reviewedByUserId).filter(Boolean))) as string[];

    const [students, schedules, reviewers] = await Promise.all([
        prisma.student.findMany({
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
                coach: {
                    include: {
                        user: true,
                    },
                },
            },
        }),
        prisma.weeklyClassSchedule.findMany({
            where: {
                id: {
                    in: scheduleIds,
                },
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
                },
            },
        }),
        prisma.user.findMany({
            where: {
                id: {
                    in: reviewerIds,
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
            },
        }),
    ]);

    const studentMap = new Map(students.map((student) => [student.id, student]));
    const scheduleMap = new Map(schedules.map((schedule) => [schedule.id, withScheduleCounts(schedule)]));
    const reviewerMap = new Map(reviewers.map((reviewer) => [reviewer.id, reviewer]));

    return rows.map((request) => ({
        ...request,
        currentScheduleIds: toStringArray(request.currentScheduleIds),
        requestedScheduleIds: toStringArray(request.requestedScheduleIds),
        student: studentMap.get(request.studentId) ?? null,
        currentSchedules: toStringArray(request.currentScheduleIds)
            .map((scheduleId) => scheduleMap.get(scheduleId))
            .filter(isSchedule)
            .sort(sortSchedules),
        requestedSchedules: toStringArray(request.requestedScheduleIds)
            .map((scheduleId) => scheduleMap.get(scheduleId))
            .filter(isSchedule)
            .sort(sortSchedules),
        reviewedBy: request.reviewedByUserId ? reviewerMap.get(request.reviewedByUserId) ?? null : null,
    }));
};

const sortSchedules = (
    first?: WeeklyClassScheduleWithRelations,
    second?: WeeklyClassScheduleWithRelations
) => {
    if (!first || !second) return 0;

    return dayOrderIndex[first.dayOfWeek] - dayOrderIndex[second.dayOfWeek]
        || first.startTime.localeCompare(second.startTime);
};

const validateRequestedSchedulesForStudent = async (
    studentId: string,
    requestedScheduleIds: string[]
) => {
    const uniqueScheduleIds = Array.from(new Set(requestedScheduleIds.filter(Boolean)));
    const [student, activeMembership] = await Promise.all([
        prisma.student.findUnique({
            where: {
                id: studentId,
            },
            select: {
                coachId: true,
            },
        }),
        prisma.studentMembership.findFirst({
            where: {
                studentId,
                status: "ACTIVE",
            },
            include: {
                plan: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        }),
    ]);

    if (!activeMembership) throw new Error("NO_ACTIVE_MEMBERSHIP");
    if (uniqueScheduleIds.length > activeMembership.plan.trainingDaysPerWeek) {
        throw new Error("SCHEDULE_LIMIT_EXCEEDED");
    }

    const selectedSchedules = await prisma.weeklyClassSchedule.findMany({
        where: {
            id: {
                in: uniqueScheduleIds,
            },
            isActive: true,
            coachId: student?.coachId ?? "__NO_COACH__",
        },
        include: {
            studentAssignments: {
                where: {
                    isActive: true,
                    studentId: {
                        not: studentId,
                    },
                },
            },
        },
    });

    if (selectedSchedules.length !== uniqueScheduleIds.length) throw new Error("SCHEDULE_NOT_FOUND");

    const selectedDays = selectedSchedules.map((schedule) => schedule.dayOfWeek);

    if (new Set(selectedDays).size !== selectedDays.length) throw new Error("SCHEDULE_REPEATED_DAY");

    const hasFullSchedule = selectedSchedules.some((schedule) => (
        schedule.capacity !== null && schedule.studentAssignments.length >= schedule.capacity
    ));

    if (hasFullSchedule) throw new Error("SCHEDULE_FULL");

    return {
        activeMembershipId: activeMembership.id,
        scheduleIds: uniqueScheduleIds,
    };
};

const revalidateScheduleRequestViews = (studentId: string) => {
    revalidatePath(scheduleRequestsPath);
    revalidatePath(coachDashboardPath);
    revalidatePath(profilePath);
    revalidatePath(adminStudentsPath);
    revalidatePath(`${adminStudentsPath}/${studentId}`);
};

export const getScheduleChangeRequests = async (): Promise<ActionResponse<ScheduleChangeRequestReviewItem[]>> => {
    try {
        await requireScheduleRequestReviewer();

        const requests = await prisma.$queryRaw<ScheduleChangeRequestRow[]>`
            SELECT
                "id",
                "studentId",
                "type"::text AS "type",
                "status"::text AS "status",
                "currentScheduleIds",
                "requestedScheduleIds",
                "requestedDate",
                "reason",
                "reviewNotes",
                "reviewedByUserId",
                "reviewedAt",
                "createdAt",
                "updatedAt"
            FROM "ScheduleChangeRequest"
            ORDER BY
                CASE WHEN "status" = 'PENDING' THEN 0 ELSE 1 END,
                "createdAt" DESC
            LIMIT 100
        `;
        const data = await getScheduleRequestDetails(requests);

        return {
            ok: true,
            data,
        };
    } catch (error) {
        console.error("Error getting schedule change requests:", error);

        return {
            ok: false,
            data: null,
            error: getScheduleRequestErrorMessage(error, "No se pudieron cargar las solicitudes"),
        };
    }
};

export const approveScheduleChangeRequest = async (
    input: ReviewScheduleChangeRequestInput
): Promise<ActionResponse<{ requestId: string } | null>> => {
    try {
        const session = await requireScheduleRequestReviewer();
        const request = await getScheduleChangeRequestById(input.requestId);

        if (!request) throw new Error("SCHEDULE_REQUEST_NOT_FOUND");
        if (request.status !== "PENDING") throw new Error("SCHEDULE_REQUEST_NOT_PENDING");

        const notes = input.notes?.trim() || null;
        const now = new Date();
        const { activeMembershipId, scheduleIds } = await validateRequestedSchedulesForStudent(
            request.studentId,
            toStringArray(request.requestedScheduleIds)
        );

        if (request.type === "PERMANENT") {
            await prisma.$transaction(async (tx) => {
                await tx.studentScheduleAssignment.updateMany({
                    where: {
                        studentId: request.studentId,
                        isActive: true,
                        weeklyScheduleId: {
                            notIn: scheduleIds,
                        },
                    },
                    data: {
                        isActive: false,
                    },
                });

                await Promise.all(scheduleIds.map((scheduleId) => (
                    tx.studentScheduleAssignment.upsert({
                        where: {
                            studentId_weeklyScheduleId: {
                                studentId: request.studentId,
                                weeklyScheduleId: scheduleId,
                            },
                        },
                        update: {
                            isActive: true,
                            studentMembershipId: activeMembershipId,
                        },
                        create: {
                            studentId: request.studentId,
                            weeklyScheduleId: scheduleId,
                            studentMembershipId: activeMembershipId,
                        },
                    })
                )));

                const updatedRows = await tx.$executeRaw`
                    UPDATE "ScheduleChangeRequest"
                    SET
                        "status" = 'APPROVED'::"ScheduleChangeRequestStatus",
                        "reviewNotes" = ${notes},
                        "reviewedByUserId" = ${session.userId},
                        "reviewedAt" = ${now},
                        "updatedAt" = ${now}
                    WHERE "id" = ${request.id}
                      AND "status" = 'PENDING'::"ScheduleChangeRequestStatus"
                `;

                if (updatedRows === 0) throw new Error("SCHEDULE_REQUEST_NOT_PENDING");
            });
        } else {
            const updatedRows = await prisma.$executeRaw`
                UPDATE "ScheduleChangeRequest"
                SET
                    "status" = 'APPROVED'::"ScheduleChangeRequestStatus",
                    "reviewNotes" = ${notes},
                    "reviewedByUserId" = ${session.userId},
                    "reviewedAt" = ${now},
                    "updatedAt" = ${now}
                WHERE "id" = ${request.id}
                  AND "status" = 'PENDING'::"ScheduleChangeRequestStatus"
            `;

            if (updatedRows === 0) throw new Error("SCHEDULE_REQUEST_NOT_PENDING");
        }

        const studentNotificationStatus = await sendScheduleChangeRequestReviewNotification({
            request,
            statusLabel: "aprobada",
            notes,
        });

        await writeAuditLog({
            action: "SCHEDULE_CHANGE_REQUEST_APPROVE",
            entityType: "ScheduleChangeRequest",
            entityId: request.id,
            metadata: {
                studentId: request.studentId,
                type: request.type,
                requestedScheduleIds: scheduleIds,
                permanentScheduleUpdated: request.type === "PERMANENT",
                notes,
                studentNotificationStatus,
            },
        });
        revalidateScheduleRequestViews(request.studentId);

        return {
            ok: true,
            data: {
                requestId: request.id,
            },
        };
    } catch (error) {
        console.error("Error approving schedule change request:", error);

        return {
            ok: false,
            data: null,
            error: getScheduleRequestErrorMessage(error, "No se pudo aprobar la solicitud"),
        };
    }
};

export const rejectScheduleChangeRequest = async (
    input: ReviewScheduleChangeRequestInput
): Promise<ActionResponse<{ requestId: string } | null>> => {
    try {
        const session = await requireScheduleRequestReviewer();
        const request = await getScheduleChangeRequestById(input.requestId);

        if (!request) throw new Error("SCHEDULE_REQUEST_NOT_FOUND");
        if (request.status !== "PENDING") throw new Error("SCHEDULE_REQUEST_NOT_PENDING");

        const notes = input.notes?.trim() || null;
        const now = new Date();
        const updatedRows = await prisma.$executeRaw`
            UPDATE "ScheduleChangeRequest"
            SET
                "status" = 'REJECTED'::"ScheduleChangeRequestStatus",
                "reviewNotes" = ${notes},
                "reviewedByUserId" = ${session.userId},
                "reviewedAt" = ${now},
                "updatedAt" = ${now}
            WHERE "id" = ${request.id}
              AND "status" = 'PENDING'::"ScheduleChangeRequestStatus"
        `;

        if (updatedRows === 0) throw new Error("SCHEDULE_REQUEST_NOT_PENDING");

        const studentNotificationStatus = await sendScheduleChangeRequestReviewNotification({
            request,
            statusLabel: "rechazada",
            notes,
        });

        await writeAuditLog({
            action: "SCHEDULE_CHANGE_REQUEST_REJECT",
            entityType: "ScheduleChangeRequest",
            entityId: request.id,
            metadata: {
                studentId: request.studentId,
                type: request.type,
                requestedScheduleIds: toStringArray(request.requestedScheduleIds),
                notes,
                studentNotificationStatus,
            },
        });
        revalidateScheduleRequestViews(request.studentId);

        return {
            ok: true,
            data: {
                requestId: request.id,
            },
        };
    } catch (error) {
        console.error("Error rejecting schedule change request:", error);

        return {
            ok: false,
            data: null,
            error: getScheduleRequestErrorMessage(error, "No se pudo rechazar la solicitud"),
        };
    }
};
