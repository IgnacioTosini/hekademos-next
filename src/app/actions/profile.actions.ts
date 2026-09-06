"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { getCurrentAuthSession, setAuthSessionCookie } from "@/lib/auth-session";
import { isValidBirthDate, isValidOptionalPhone, isValidOptionalUrl } from "@/lib/form-validation";
import { getEffectiveScheduleStudentIds, getOneTimeScheduleChangesForDate } from "@/lib/one-time-schedule-change";
import { sendAutomaticScheduleChangeNotification } from "@/services/schedule-change-notification";
import type { ScheduleChangeRequestType, WeeklyClassSchedule } from "@/types/schema/classes";
import { getClassCategoryLabel } from "@/utils/class-category";
import type { PrismaDate } from "@/types/schema/common";
import type { CreateUserImageInput } from "@/types/schema/users";
import { getLocalDayRange, getOneTimeScheduleDates } from "@/utils/schedule";
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
    currentScheduleId?: string | null;
    requestedScheduleIds: string[];
    reason: string;
};

export type UpdateCoachProfileInput = {
    email: string;
    name?: string | null;
    phone?: string | null;
    bio?: string | null;
    specialty?: string | null;
    instagram?: string | null;
    paymentAlias?: string | null;
    paymentAccountHolder?: string | null;
    image?: CreateUserImageInput | null;
};

const profilePath = "/perfil";
const coachDashboardPath = "/coach/dashboard";
const scheduleRequestsPath = "/admin/solicitudes-horarios";

const getProfileErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    if (error.message === "Necesitas iniciar sesion") return error.message;
    if (error.message === "Solo los alumnos pueden editar este perfil") return error.message;
    if (error.message === "No se encontro el perfil del alumno") return error.message;
    if (error.message === "Ese email ya esta en uso") return error.message;
    if (error.message === "La cantidad de turnos supera lo permitido por tu plan") return error.message;
    if (error.message === "Uno de los turnos seleccionados ya no existe") return error.message;
    if (error.message === "Uno de los turnos seleccionados no tiene cupos disponibles") return error.message;
    if (error.message === "Uno de los turnos seleccionados no corresponde a la categoria de tu plan") return error.message;
    if (error.message === "No podes elegir dos turnos el mismo dia") return error.message;
    if (error.message === "Necesitas una membresia activa para elegir turnos") return error.message;
    if (error.message === "Selecciona el tipo de cambio de horario") return error.message;
    if (error.message === "Agrega una justificacion para confirmar el cambio") return error.message;
    if (error.message === "Selecciona al menos un turno para confirmar el cambio") return error.message;
    if (error.message === "Para un cambio puntual selecciona un solo turno nuevo") return error.message;
    if (error.message === "Selecciona el turno actual que queres reemplazar") return error.message;
    if (error.message === "El turno de reemplazo ya es uno de tus turnos fijos") return error.message;
    if (error.message === "Los turnos seleccionados son iguales a tus turnos actuales") return error.message;
    if (error.message === "Ya tenes un cambio puntual activo") return error.message;
    if (error.message === "El cambio temporal ya no esta activo") return error.message;
    if (error.message === "La primera clase involucrada ya comenzo") return error.message;
    if (error.message === "Tu lugar en el horario habitual ya fue ocupado") return error.message;
    if (error.message === "Solo los coaches pueden editar este perfil") return error.message;
    if (error.message === "No se encontro el perfil del coach") return error.message;
    if (error.message === "Revisa los telefonos ingresados") return error.message;
    if (error.message === "La fecha de nacimiento no parece valida") return error.message;
    if (error.message === "El link ingresado no parece valido") return error.message;

    return fallback;
};

type ScheduleValidationClient = Pick<
    Prisma.TransactionClient,
    "scheduleChangeRequest" | "studentMembership" | "weeklyClassSchedule"
>;

const getCurrentActiveStudentMembership = async (
    database: ScheduleValidationClient,
    studentId: string
) => (
    database.studentMembership.findFirst({
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
    scheduleIds: string[],
    type: ScheduleChangeRequestType,
    database: ScheduleValidationClient = prisma,
    oneTimeSourceSchedule?: Pick<WeeklyClassSchedule, "dayOfWeek" | "startTime"> | null,
    referenceDate = new Date()
) => {
    const uniqueScheduleIds = Array.from(new Set(scheduleIds.filter(Boolean)));
    const activeMembership = await getCurrentActiveStudentMembership(database, student.id);

    if (uniqueScheduleIds.length === 0) throw new Error("Selecciona al menos un turno para confirmar el cambio");
    if (type === "ONE_TIME" && uniqueScheduleIds.length !== 1) {
        throw new Error("Para un cambio puntual selecciona un solo turno nuevo");
    }
    if (!activeMembership) throw new Error("Necesitas una membresia activa para elegir turnos");

    if (uniqueScheduleIds.length > activeMembership.plan.trainingDaysPerWeek) {
        throw new Error("La cantidad de turnos supera lo permitido por tu plan");
    }

    const selectedSchedules = await database.weeklyClassSchedule.findMany({
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

    if (selectedSchedules.some((schedule) => (
        getClassCategoryLabel(schedule.classCategory) !== getClassCategoryLabel(activeMembership.plan.classCategory)
    ))) {
        throw new Error("Uno de los turnos seleccionados no corresponde a la categoria de tu plan");
    }

    const selectedDays = selectedSchedules.map((schedule) => schedule.dayOfWeek);

    if (new Set(selectedDays).size !== selectedDays.length) {
        throw new Error("No podes elegir dos turnos el mismo dia");
    }

    if (type === "ONE_TIME" && !oneTimeSourceSchedule) {
        throw new Error("Selecciona el turno actual que queres reemplazar");
    }

    const requestedDate = type === "ONE_TIME" && oneTimeSourceSchedule
        ? getOneTimeScheduleDates(oneTimeSourceSchedule, selectedSchedules[0], referenceDate).requestedDate
        : null;
    const oneTimeChanges = requestedDate
        ? await getOneTimeScheduleChangesForDate(requestedDate, database)
        : [];
    const hasFullSchedule = selectedSchedules.some((schedule) => {
        if (schedule.capacity === null) return false;

        const occupiedStudentIds = requestedDate
            ? getEffectiveScheduleStudentIds({
                scheduleId: schedule.id,
                fixedStudentIds: schedule.studentAssignments.map((assignment) => assignment.studentId),
                changes: oneTimeChanges,
            }).filter((studentId) => studentId !== student.id)
            : schedule.studentAssignments;

        return occupiedStudentIds.length >= schedule.capacity;
    });

    if (hasFullSchedule) {
        throw new Error("Uno de los turnos seleccionados no tiene cupos disponibles");
    }

    return {
        activeMembershipId: activeMembership.id,
        requestedDate,
        scheduleIds: uniqueScheduleIds,
    };
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
            sessionVersion: updatedUser.sessionVersion,
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

        if (reason.length < 5) throw new Error("Agrega una justificacion para confirmar el cambio");

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

        const currentScheduleIds = student.schedules.map((schedule) => schedule.weeklyScheduleId);
        const now = new Date();
        const requestId = randomUUID();
        let requestCurrentScheduleIds = currentScheduleIds;
        let requestedDate: Date | null = null;
        let requestedScheduleIds: string[] = [];

        await prisma.$transaction(async (tx) => {
            let oneTimeSourceSchedule: Pick<WeeklyClassSchedule, "dayOfWeek" | "startTime"> | null = null;

            if (input.type === "ONE_TIME") {
                if (!input.currentScheduleId || !currentScheduleIds.includes(input.currentScheduleId)) {
                    throw new Error("Selecciona el turno actual que queres reemplazar");
                }
                if (input.requestedScheduleIds.some((scheduleId) => currentScheduleIds.includes(scheduleId))) {
                    throw new Error("El turno de reemplazo ya es uno de tus turnos fijos");
                }

                const { start: todayStart } = getLocalDayRange(now);
                const activeOneTimeChange = await tx.scheduleChangeRequest.findFirst({
                    where: {
                        studentId: student.id,
                        type: "ONE_TIME",
                        status: "APPROVED",
                        requestedDate: {
                            gte: todayStart,
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                if (activeOneTimeChange) throw new Error("Ya tenes un cambio puntual activo");

                requestCurrentScheduleIds = [input.currentScheduleId];
                oneTimeSourceSchedule = await tx.weeklyClassSchedule.findUnique({
                    where: {
                        id: input.currentScheduleId,
                    },
                    select: {
                        dayOfWeek: true,
                        startTime: true,
                    },
                });
            }

            const validation = await validateStudentScheduleSelection(
                student,
                input.requestedScheduleIds,
                input.type,
                tx,
                oneTimeSourceSchedule,
                now
            );
            const activeMembershipId = validation.activeMembershipId;

            requestedDate = validation.requestedDate;
            requestedScheduleIds = validation.scheduleIds;

            if (areStringArraysEqual(requestCurrentScheduleIds, requestedScheduleIds)) {
                throw new Error("Los turnos seleccionados son iguales a tus turnos actuales");
            }

            if (input.type === "PERMANENT") {
                const { start: todayStart } = getLocalDayRange(now);

                await tx.scheduleChangeRequest.updateMany({
                    where: {
                        studentId: student.id,
                        type: "ONE_TIME",
                        status: "APPROVED",
                        requestedDate: {
                            gte: todayStart,
                        },
                    },
                    data: {
                        status: "CANCELLED",
                        reviewNotes: "Cancelada por un cambio permanente posterior",
                        updatedAt: now,
                    },
                });

                await tx.studentScheduleAssignment.updateMany({
                    where: {
                        studentId: student.id,
                        isActive: true,
                        weeklyScheduleId: {
                            notIn: requestedScheduleIds,
                        },
                    },
                    data: {
                        isActive: false,
                    },
                });

                await Promise.all(requestedScheduleIds.map((scheduleId) => (
                    tx.studentScheduleAssignment.upsert({
                        where: {
                            studentId_weeklyScheduleId: {
                                studentId: student.id,
                                weeklyScheduleId: scheduleId,
                            },
                        },
                        update: {
                            isActive: true,
                            studentMembershipId: activeMembershipId,
                        },
                        create: {
                            studentId: student.id,
                            weeklyScheduleId: scheduleId,
                            studentMembershipId: activeMembershipId,
                        },
                    })
                )));
            }

            await tx.$executeRaw`
                INSERT INTO "ScheduleChangeRequest" (
                    "id",
                    "studentId",
                    "type",
                    "status",
                    "currentScheduleIds",
                    "requestedScheduleIds",
                    "requestedDate",
                    "reason",
                    "reviewNotes",
                    "reviewedAt",
                    "createdAt",
                    "updatedAt"
                )
                VALUES (
                    ${requestId},
                    ${student.id},
                    ${input.type}::"ScheduleChangeRequestType",
                    'APPROVED'::"ScheduleChangeRequestStatus",
                    ${requestCurrentScheduleIds}::text[],
                    ${requestedScheduleIds}::text[],
                    ${requestedDate},
                    ${reason},
                    ${"Aprobada automáticamente"},
                    ${now},
                    ${now},
                    ${now}
                )
            `;
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        const confirmedRequestedDate = requestedDate as Date | null;
        const notification = await sendAutomaticScheduleChangeNotification({
            student,
            type: input.type,
            requestedScheduleIds,
            requestedDate: confirmedRequestedDate,
        });

        revalidatePath(profilePath);
        revalidatePath(scheduleRequestsPath);
        revalidatePath(coachDashboardPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${student.id}`);
        await writeAuditLog({
            action: "SCHEDULE_CHANGE_REQUEST_AUTO_APPROVE",
            entityType: "ScheduleChangeRequest",
            entityId: requestId,
            metadata: {
                studentId: student.id,
                type: input.type,
                currentScheduleIds: requestCurrentScheduleIds,
                requestedScheduleIds,
                requestedDate: confirmedRequestedDate?.toISOString() ?? null,
                permanentScheduleUpdated: input.type === "PERMANENT",
                notificationStatus: notification.status,
                notificationRecipients: notification.recipients,
                whatsappNotificationStatus: notification.whatsappStatus,
            },
        });

        return {
            ok: true,
            data: {
                requestId,
            },
        };
    } catch (error) {
        console.error("Error al confirmar el cambio automatico de horario:", error);

        return {
            ok: false,
            data: null,
            error: getProfileErrorMessage(error, "No se pudo confirmar el cambio de horario"),
        };
    }
};

export const cancelStudentOneTimeScheduleChange = async (
    requestId: string
): Promise<ActionResponse<{ requestId: string } | null>> => {
    try {
        const session = await getCurrentAuthSession();

        if (!session) throw new Error("Necesitas iniciar sesion");
        if (session.role !== "STUDENT") throw new Error("Solo los alumnos pueden editar este perfil");

        const student = await prisma.student.findUnique({
            where: {
                userId: session.userId,
            },
            select: {
                id: true,
            },
        });

        if (!student) throw new Error("No se encontro el perfil del alumno");

        const now = new Date();
        const cancellation = await prisma.$transaction(async (tx) => {
            const request = await tx.scheduleChangeRequest.findFirst({
                where: {
                    id: requestId,
                    studentId: student.id,
                    type: "ONE_TIME",
                    status: "APPROVED",
                },
                select: {
                    id: true,
                    currentScheduleIds: true,
                    requestedScheduleIds: true,
                    requestedDate: true,
                    createdAt: true,
                },
            });

            if (
                !request
                || request.currentScheduleIds.length !== 1
                || request.requestedScheduleIds.length !== 1
                || !request.requestedDate
            ) {
                throw new Error("El cambio temporal ya no esta activo");
            }

            const sourceScheduleId = request.currentScheduleIds[0];
            const sourceSchedule = await tx.weeklyClassSchedule.findUnique({
                where: {
                    id: sourceScheduleId,
                },
                include: {
                    studentAssignments: {
                        where: {
                            isActive: true,
                        },
                        select: {
                            studentId: true,
                        },
                    },
                },
            });

            if (!sourceSchedule) throw new Error("El cambio temporal ya no esta activo");

            const sourceDate = getOneTimeScheduleDates(
                sourceSchedule,
                sourceSchedule,
                request.createdAt
            ).sourceDate;
            const firstAffectedDate = sourceDate < request.requestedDate
                ? sourceDate
                : request.requestedDate;

            if (firstAffectedDate <= now) {
                throw new Error("La primera clase involucrada ya comenzo");
            }

            const oneTimeChanges = await getOneTimeScheduleChangesForDate(sourceDate, tx);
            const effectiveStudentIds = getEffectiveScheduleStudentIds({
                scheduleId: sourceSchedule.id,
                fixedStudentIds: sourceSchedule.studentAssignments.map((assignment) => assignment.studentId),
                changes: oneTimeChanges,
            });
            const occupiedAfterCancellation = new Set([...effectiveStudentIds, student.id]).size;

            if (sourceSchedule.capacity !== null && occupiedAfterCancellation > sourceSchedule.capacity) {
                throw new Error("Tu lugar en el horario habitual ya fue ocupado");
            }

            const updateResult = await tx.scheduleChangeRequest.updateMany({
                where: {
                    id: request.id,
                    status: "APPROVED",
                },
                data: {
                    status: "CANCELLED",
                    reviewNotes: "Cancelada por el alumno desde su perfil",
                    updatedAt: now,
                },
            });

            if (updateResult.count !== 1) throw new Error("El cambio temporal ya no esta activo");

            return {
                requestId: request.id,
                sourceScheduleId,
                requestedScheduleId: request.requestedScheduleIds[0],
                sourceDate,
                requestedDate: request.requestedDate,
            };
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });

        revalidatePath(profilePath);
        revalidatePath(scheduleRequestsPath);
        revalidatePath(coachDashboardPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${student.id}`);
        await writeAuditLog({
            action: "SCHEDULE_CHANGE_REQUEST_CANCEL",
            entityType: "ScheduleChangeRequest",
            entityId: cancellation.requestId,
            metadata: {
                studentId: student.id,
                type: "ONE_TIME",
                sourceScheduleId: cancellation.sourceScheduleId,
                requestedScheduleId: cancellation.requestedScheduleId,
                sourceDate: cancellation.sourceDate.toISOString(),
                requestedDate: cancellation.requestedDate.toISOString(),
            },
        });

        return {
            ok: true,
            data: {
                requestId: cancellation.requestId,
            },
        };
    } catch (error) {
        console.error("Error al cancelar el cambio temporal de horario:", error);

        return {
            ok: false,
            data: null,
            error: getProfileErrorMessage(error, "No se pudo cancelar el cambio temporal"),
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
                paymentAlias: input.paymentAlias?.trim().toLowerCase() || null,
                paymentAccountHolder: input.paymentAccountHolder?.trim() || null,
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
            sessionVersion: updatedUser.sessionVersion,
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
