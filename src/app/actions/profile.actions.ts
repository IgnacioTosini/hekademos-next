"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { getCurrentAuthSession, setAuthSessionCookie } from "@/lib/auth-session";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { isDeliverableEmail, isValidBirthDate, isValidOptionalPhone, isValidOptionalUrl } from "@/lib/form-validation";
import type { ScheduleChangeRequestType } from "@/types/schema/classes";
import type { PrismaDate } from "@/types/schema/common";
import type { CreateUserImageInput } from "@/types/schema/users";
import { addMinutesToTime, dayLabels, dayOrderIndex } from "@/utils/schedule";
import { getStudentName } from "@/utils/student";
import {
    adminStudentsPath,
    normalizeEmail,
    toDate,
    type ActionResponse,
} from "./_shared";

export type UpdateStudentProfileInput = {
    email: string;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: PrismaDate | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    image?: CreateUserImageInput | null;
};

export type UpdateStudentRoutineInput = {
    routineExcelUrl?: string | null;
};

export type CreateStudentScheduleChangeRequestInput = {
    type: ScheduleChangeRequestType;
    requestedScheduleIds: string[];
    reason: string;
    requestedDate?: PrismaDate | null;
};

export type UpdateCoachProfileInput = {
    email: string;
    name?: string | null;
    phone?: string | null;
    bio?: string | null;
    specialty?: string | null;
    instagram?: string | null;
    image?: CreateUserImageInput | null;
};

const profilePath = "/perfil";
const coachDashboardPath = "/coach/dashboard";
const scheduleRequestsPath = "/admin/solicitudes-horarios";

const getAppBaseUrl = () => (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.AUTH_BASE_URL
    || "http://localhost:3000"
);

const getScheduleRequestReviewUrl = (path: string) => (
    `${getAppBaseUrl()}${path}`
);

const scheduleRequestTypeLabels: Record<ScheduleChangeRequestType, string> = {
    ONE_TIME: "Solo por esta clase",
    PERMANENT: "Cambio permanente",
};

type ScheduleNotificationRecipient = {
    email: string;
    name?: string | null;
    reviewUrl: string;
};

type ScheduleNotificationResult = {
    status: "SENT" | "FAILED" | "PARTIAL_FAILED" | "SKIPPED_NO_RECIPIENT";
    recipients: string[];
};

const normalizeOptionalEmail = (value?: string | null) => value?.trim().toLowerCase() || null;

const getAdminNotificationEmail = () => normalizeOptionalEmail(process.env.ADMIN_NOTIFICATION_EMAIL);

const getScheduleLabel = (schedule: {
    dayOfWeek: keyof typeof dayLabels;
    startTime: string;
    durationMinutes: number;
}) => {
    const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

    return `${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endsAt ? ` a ${endsAt}` : ""}`;
};

const formatScheduleLabels = async (scheduleIds: string[]) => {
    if (scheduleIds.length === 0) return "Sin turnos asignados";

    const schedules = await prisma.weeklyClassSchedule.findMany({
        where: {
            id: {
                in: scheduleIds,
            },
        },
    });
    const orderedSchedules = schedules.sort((first, second) => (
        dayOrderIndex[first.dayOfWeek] - dayOrderIndex[second.dayOfWeek]
        || first.startTime.localeCompare(second.startTime)
    ));

    return orderedSchedules.map(getScheduleLabel).join("\n") || "Sin turnos asignados";
};

const getScheduleRequestRecipients = () => {
    const recipients = new Map<string, ScheduleNotificationRecipient>();
    const adminEmail = getAdminNotificationEmail();

    if (adminEmail && isDeliverableEmail(adminEmail)) {
        recipients.set(adminEmail, {
            email: adminEmail,
            name: "Admin",
            reviewUrl: getScheduleRequestReviewUrl(scheduleRequestsPath),
        });
    }

    return Array.from(recipients.values());
};

const sendScheduleChangeRequestNotification = async ({
    student,
    type,
    currentScheduleIds,
    requestedScheduleIds,
    reason,
}: {
    student: {
        user: {
            email: string;
            name: string | null;
        };
        firstName: string | null;
        lastName: string | null;
        coach?: {
            user?: {
                email: string;
                name: string | null;
            };
        } | null;
    };
    type: ScheduleChangeRequestType;
    currentScheduleIds: string[];
    requestedScheduleIds: string[];
    reason: string;
}): Promise<ScheduleNotificationResult> => {
    const recipients = getScheduleRequestRecipients();

    if (recipients.length === 0) {
        return {
            status: "SKIPPED_NO_RECIPIENT",
            recipients: [],
        };
    }

    const studentName = getStudentName(student);
    const currentSchedulesLabel = await formatScheduleLabels(currentScheduleIds);
    const requestedSchedulesLabel = await formatScheduleLabels(requestedScheduleIds);
    let sentCount = 0;

    for (const recipient of recipients) {
        const emailMessage = buildEmailMessage({
            type: "SCHEDULE_CHANGE_REQUEST",
            to: {
                email: recipient.email,
                name: recipient.name,
            },
            data: {
                studentName,
                requestTypeLabel: scheduleRequestTypeLabels[type],
                currentSchedulesLabel,
                requestedSchedulesLabel,
                reason,
                reviewUrl: recipient.reviewUrl,
            },
        });

        try {
            await sendEmail(emailMessage);
            sentCount += 1;
        } catch (error) {
            console.error(`Error al enviar la notificacion de solicitud de horario a ${recipient.email}:`, error);
        }
    }

    return {
        status: sentCount === recipients.length ? "SENT" : sentCount > 0 ? "PARTIAL_FAILED" : "FAILED",
        recipients: recipients.map((recipient) => recipient.email),
    };
};

const getProfileErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    if (error.message === "Necesitas iniciar sesion") return error.message;
    if (error.message === "Solo los alumnos pueden editar este perfil") return error.message;
    if (error.message === "No se encontro el perfil del alumno") return error.message;
    if (error.message === "Ese email ya esta en uso") return error.message;
    if (error.message === "La cantidad de turnos supera lo permitido por tu plan") return error.message;
    if (error.message === "Uno de los turnos seleccionados ya no existe") return error.message;
    if (error.message === "Uno de los turnos seleccionados no tiene cupos disponibles") return error.message;
    if (error.message === "No podes elegir dos turnos el mismo dia") return error.message;
    if (error.message === "Necesitas una membresia activa para elegir turnos") return error.message;
    if (error.message === "Selecciona el tipo de cambio de horario") return error.message;
    if (error.message === "Agrega una justificacion para solicitar el cambio") return error.message;
    if (error.message === "Selecciona al menos un turno para solicitar el cambio") return error.message;
    if (error.message === "Los turnos seleccionados son iguales a tus turnos actuales") return error.message;
    if (error.message === "Ya tenes una solicitud de horario pendiente") return error.message;
    if (error.message === "Solo los coaches pueden editar este perfil") return error.message;
    if (error.message === "No se encontro el perfil del coach") return error.message;
    if (error.message === "Revisa los telefonos ingresados") return error.message;
    if (error.message === "La fecha de nacimiento no parece valida") return error.message;
    if (error.message === "El link ingresado no parece valido") return error.message;

    return fallback;
};

const getCurrentActiveStudentMembership = async (studentId: string) => (
    prisma.studentMembership.findFirst({
        where: {
            studentId,
            status: "ACTIVE",
        },
        orderBy: {
            createdAt: "desc",
        },
        include: {
            plan: true,
        },
    })
);

const validateStudentScheduleSelection = async (
    student: {
        id: string;
        coachId: string | null;
    },
    scheduleIds: string[]
) => {
    const uniqueScheduleIds = Array.from(new Set(scheduleIds.filter(Boolean)));
    const activeMembership = await getCurrentActiveStudentMembership(student.id);

    if (uniqueScheduleIds.length === 0) throw new Error("Selecciona al menos un turno para solicitar el cambio");
    if (!activeMembership) throw new Error("Necesitas una membresia activa para elegir turnos");

    if (uniqueScheduleIds.length > activeMembership.plan.trainingDaysPerWeek) {
        throw new Error("La cantidad de turnos supera lo permitido por tu plan");
    }

    const selectedSchedules = await prisma.weeklyClassSchedule.findMany({
        where: {
            id: {
                in: uniqueScheduleIds,
            },
            isActive: true,
            coachId: student.coachId,
        },
        include: {
            studentAssignments: {
                where: {
                    isActive: true,
                    studentId: {
                        not: student.id,
                    },
                },
            },
        },
    });

    if (selectedSchedules.length !== uniqueScheduleIds.length) {
        throw new Error("Uno de los turnos seleccionados ya no existe");
    }

    const selectedDays = selectedSchedules.map((schedule) => schedule.dayOfWeek);

    if (new Set(selectedDays).size !== selectedDays.length) {
        throw new Error("No podes elegir dos turnos el mismo dia");
    }

    const hasFullSchedule = selectedSchedules.some((schedule) => (
        schedule.capacity !== null && schedule.studentAssignments.length >= schedule.capacity
    ));

    if (hasFullSchedule) {
        throw new Error("Uno de los turnos seleccionados no tiene cupos disponibles");
    }

    return uniqueScheduleIds;
};

const areStringArraysEqual = (first: string[], second: string[]) => {
    if (first.length !== second.length) return false;

    const sortedFirst = [...first].sort();
    const sortedSecond = [...second].sort();

    return sortedFirst.every((value, index) => value === sortedSecond[index]);
};

export const updateStudentProfile = async (
    input: UpdateStudentProfileInput
): Promise<ActionResponse<{ studentId: string } | null>> => {
    try {
        const session = await getCurrentAuthSession();

        if (!session) throw new Error("Necesitas iniciar sesion");
        if (session.role !== "STUDENT") throw new Error("Solo los alumnos pueden editar este perfil");
        if (!isValidOptionalPhone(input.phone) || !isValidOptionalPhone(input.emergencyContactPhone)) {
            throw new Error("Revisa los telefonos ingresados");
        }
        if (!isValidBirthDate(input.birthDate)) throw new Error("La fecha de nacimiento no parece valida");

        const email = normalizeEmail(input.email);
        const student = await prisma.student.findUnique({
            where: {
                userId: session.userId,
            },
            include: {
                user: true,
                schedules: {
                    where: {
                        isActive: true,
                    },
                    select: {
                        weeklyScheduleId: true,
                    },
                },
            },
        });

        if (!student) throw new Error("No se encontro el perfil del alumno");

        if (email !== normalizeEmail(student.user.email)) {
            const existingUser = await prisma.user.findUnique({
                where: {
                    email,
                },
                select: {
                    id: true,
                },
            });

            if (existingUser && existingUser.id !== session.userId) {
                throw new Error("Ese email ya esta en uso");
            }
        }

        const firstName = input.firstName?.trim() || null;
        const lastName = input.lastName?.trim() || null;
        const name = [firstName, lastName].filter(Boolean).join(" ") || student.user.name;

        const updatedUser = await prisma.user.update({
            where: {
                id: session.userId,
            },
            data: {
                email,
                name,
                phone: input.phone?.trim() || null,
            },
        });

        await prisma.student.update({
            where: {
                id: student.id,
            },
            data: {
                firstName,
                lastName,
                birthDate: toDate(input.birthDate),
                emergencyContactName: input.emergencyContactName?.trim() || null,
                emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
            },
        });

        if (input.image === null) {
            await prisma.userImage.deleteMany({
                where: {
                    userId: session.userId,
                },
            });
        }

        if (input.image) {
            await prisma.userImage.upsert({
                where: {
                    userId: session.userId,
                },
                update: {
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
                create: {
                    userId: session.userId,
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
            });
        }

        await setAuthSessionCookie({
            userId: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
        });

        revalidatePath(profilePath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${student.id}`);
        await writeAuditLog({
            action: "STUDENT_UPDATE",
            entityType: "Student",
            entityId: student.id,
            metadata: {
                email: updatedUser.email,
                profileUpdated: true,
                imageUpdated: input.image !== undefined,
            },
        });

        return {
            ok: true,
            data: {
                studentId: student.id,
            },
        };
    } catch (error) {
        console.error("Error al actualizar el perfil del alumno:", error);

        return {
            ok: false,
            data: null,
            error: getProfileErrorMessage(error, "No se pudo actualizar el perfil"),
        };
    }
};

export const updateStudentRoutine = async (
    input: UpdateStudentRoutineInput
): Promise<ActionResponse<{ studentId: string } | null>> => {
    try {
        const session = await getCurrentAuthSession();

        if (!session) throw new Error("Necesitas iniciar sesion");
        if (session.role !== "STUDENT") throw new Error("Solo los alumnos pueden editar este perfil");
        if (!isValidOptionalUrl(input.routineExcelUrl)) throw new Error("El link ingresado no parece valido");

        const student = await prisma.student.findUnique({
            where: {
                userId: session.userId,
            },
            select: {
                id: true,
            },
        });

        if (!student) throw new Error("No se encontro el perfil del alumno");

        await prisma.student.update({
            where: {
                id: student.id,
            },
            data: {
                routineExcelUrl: input.routineExcelUrl?.trim() || null,
            },
        });

        revalidatePath(profilePath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${student.id}`);
        await writeAuditLog({
            action: "STUDENT_UPDATE",
            entityType: "Student",
            entityId: student.id,
            metadata: {
                routineUpdated: true,
            },
        });

        return {
            ok: true,
            data: {
                studentId: student.id,
            },
        };
    } catch (error) {
        console.error("Error al actualizar la rutina del alumno:", error);

        return {
            ok: false,
            data: null,
            error: getProfileErrorMessage(error, "No se pudo actualizar la rutina"),
        };
    }
};

export const createStudentScheduleChangeRequest = async (
    input: CreateStudentScheduleChangeRequestInput
): Promise<ActionResponse<{ requestId: string } | null>> => {
    try {
        const session = await getCurrentAuthSession();

        if (!session) throw new Error("Necesitas iniciar sesion");
        if (session.role !== "STUDENT") throw new Error("Solo los alumnos pueden editar este perfil");
        if (input.type !== "ONE_TIME" && input.type !== "PERMANENT") {
            throw new Error("Selecciona el tipo de cambio de horario");
        }

        const reason = input.reason.trim();

        if (reason.length < 5) throw new Error("Agrega una justificacion para solicitar el cambio");

        const student = await prisma.student.findUnique({
            where: {
                userId: session.userId,
            },
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
                        weeklyScheduleId: true,
                    },
                },
            },
        });

        if (!student) throw new Error("No se encontro el perfil del alumno");

        const pendingRequests = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT "id"
            FROM "ScheduleChangeRequest"
            WHERE "studentId" = ${student.id}
              AND "status" = 'PENDING'
            LIMIT 1
        `;

        if (pendingRequests.length > 0) throw new Error("Ya tenes una solicitud de horario pendiente");

        const currentScheduleIds = student.schedules.map((schedule) => schedule.weeklyScheduleId);
        const requestedScheduleIds = await validateStudentScheduleSelection(student, input.requestedScheduleIds);

        if (areStringArraysEqual(currentScheduleIds, requestedScheduleIds)) {
            throw new Error("Los turnos seleccionados son iguales a tus turnos actuales");
        }

        const now = new Date();
        const requestId = randomUUID();
        const requestedDate = input.requestedDate ? new Date(input.requestedDate) : null;

        await prisma.$executeRaw`
            INSERT INTO "ScheduleChangeRequest" (
                "id",
                "studentId",
                "type",
                "status",
                "currentScheduleIds",
                "requestedScheduleIds",
                "requestedDate",
                "reason",
                "createdAt",
                "updatedAt"
            )
            VALUES (
                ${requestId},
                ${student.id},
                ${input.type}::"ScheduleChangeRequestType",
                'PENDING'::"ScheduleChangeRequestStatus",
                ${currentScheduleIds}::text[],
                ${requestedScheduleIds}::text[],
                ${requestedDate},
                ${reason},
                ${now},
                ${now}
            )
        `;
        const notification = await sendScheduleChangeRequestNotification({
            student,
            type: input.type,
            currentScheduleIds,
            requestedScheduleIds,
            reason,
        });

        revalidatePath(profilePath);
        revalidatePath(scheduleRequestsPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${student.id}`);
        await writeAuditLog({
            action: "SCHEDULE_CHANGE_REQUEST_CREATE",
            entityType: "ScheduleChangeRequest",
            entityId: requestId,
            metadata: {
                studentId: student.id,
                type: input.type,
                currentScheduleIds,
                requestedScheduleIds,
                requestedDate: requestedDate?.toISOString() ?? null,
                notificationStatus: notification.status,
                notificationRecipients: notification.recipients,
            },
        });

        return {
            ok: true,
            data: {
                requestId,
            },
        };
    } catch (error) {
        console.error("Error al crear la solicitud de cambio de horario:", error);

        return {
            ok: false,
            data: null,
            error: getProfileErrorMessage(error, "No se pudo solicitar el cambio de horario"),
        };
    }
};

export const updateCoachProfile = async (
    input: UpdateCoachProfileInput
): Promise<ActionResponse<{ coachId: string } | null>> => {
    try {
        const session = await getCurrentAuthSession();

        if (!session) throw new Error("Necesitas iniciar sesion");
        if (session.role !== "COACH") throw new Error("Solo los coaches pueden editar este perfil");
        if (!isValidOptionalPhone(input.phone)) throw new Error("Revisa los telefonos ingresados");

        const email = normalizeEmail(input.email);
        const coach = await prisma.coach.findUnique({
            where: {
                userId: session.userId,
            },
            include: {
                user: true,
            },
        });

        if (!coach) throw new Error("No se encontro el perfil del coach");

        if (email !== normalizeEmail(coach.user.email)) {
            const existingUser = await prisma.user.findUnique({
                where: {
                    email,
                },
                select: {
                    id: true,
                },
            });

            if (existingUser && existingUser.id !== session.userId) {
                throw new Error("Ese email ya esta en uso");
            }
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: session.userId,
            },
            data: {
                email,
                name: input.name?.trim() || null,
                phone: input.phone?.trim() || null,
            },
        });

        await prisma.coach.update({
            where: {
                id: coach.id,
            },
            data: {
                bio: input.bio?.trim() || null,
                specialty: input.specialty?.trim() || null,
                instagram: input.instagram?.trim() || null,
            },
        });

        if (input.image === null) {
            await prisma.userImage.deleteMany({
                where: {
                    userId: session.userId,
                },
            });
        }

        if (input.image) {
            await prisma.userImage.upsert({
                where: {
                    userId: session.userId,
                },
                update: {
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
                create: {
                    userId: session.userId,
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
            });
        }

        await setAuthSessionCookie({
            userId: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
        });

        revalidatePath(coachDashboardPath);
        revalidatePath(adminStudentsPath);
        revalidatePath("/admin/coaches");
        revalidatePath("/admin/usuarios");

        return {
            ok: true,
            data: {
                coachId: coach.id,
            },
        };
    } catch (error) {
        console.error("Error al actualizar el perfil del coach:", error);

        return {
            ok: false,
            data: null,
            error: getProfileErrorMessage(error, "No se pudo actualizar el perfil"),
        };
    }
};
