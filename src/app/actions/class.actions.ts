"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import type {
    CreateWeeklyClassScheduleInput,
    UpdateWeeklyClassScheduleInput,
    WeeklyClassSchedule,
    WeeklyClassScheduleWithRelations,
} from "@/types/schema/classes";
import { dayOrderIndex } from "@/utils/schedule";
import {
    adminClassSchedulesPath,
    adminStudentsPath,
    publicHomePath,
    type ActionResponse,
} from "./_shared";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const normalizeScheduleInput = (
    input: CreateWeeklyClassScheduleInput | UpdateWeeklyClassScheduleInput
) => ({
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime?.trim(),
    durationMinutes: input.durationMinutes,
    capacity: input.capacity,
    coachId: input.coachId || null,
    isActive: input.isActive,
    notes: input.notes?.trim() || null,
});

const validateScheduleInput = async (
    input: CreateWeeklyClassScheduleInput | UpdateWeeklyClassScheduleInput,
    currentScheduleId?: string
) => {
    const currentSchedule = currentScheduleId
        ? await prisma.weeklyClassSchedule.findUnique({
            where: {
                id: currentScheduleId,
            },
        })
        : null;

    const candidateDayOfWeek = input.dayOfWeek ?? currentSchedule?.dayOfWeek;
    const candidateStartTime = input.startTime?.trim() ?? currentSchedule?.startTime;
    const candidateCoachId = input.coachId === undefined ? currentSchedule?.coachId ?? null : input.coachId || null;

    if (!candidateDayOfWeek) throw new Error("El dia del turno es obligatorio");
    if (!candidateStartTime) throw new Error("El horario del turno es obligatorio");

    if (input.startTime !== undefined && !timePattern.test(input.startTime)) {
        throw new Error("El horario debe tener formato HH:mm");
    }

    if (input.durationMinutes !== undefined && input.durationMinutes < 15) {
        throw new Error("La duracion debe ser de al menos 15 minutos");
    }

    if (input.capacity !== undefined && input.capacity !== null && input.capacity < 1) {
        throw new Error("La capacidad debe ser mayor a cero");
    }

    if (input.capacity !== undefined && currentScheduleId) {
        const occupiedSpots = await prisma.studentScheduleAssignment.count({
            where: {
                weeklyScheduleId: currentScheduleId,
                isActive: true,
            },
        });

        if (input.capacity !== null && input.capacity < occupiedSpots) {
            throw new Error("La capacidad no puede ser menor a los cupos ocupados");
        }
    }

    if (candidateDayOfWeek && candidateStartTime && candidateCoachId) {
        const duplicatedSchedule = await prisma.weeklyClassSchedule.findFirst({
            where: {
                id: currentScheduleId
                    ? {
                        not: currentScheduleId,
                    }
                    : undefined,
                dayOfWeek: candidateDayOfWeek,
                startTime: candidateStartTime,
                coachId: candidateCoachId,
            },
            select: {
                id: true,
            },
        });

        if (duplicatedSchedule) throw new Error("Ese coach ya tiene un turno en ese dia y horario");
    }
};

const getScheduleErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
        if (error.message === "El dia del turno es obligatorio") return error.message;
        if (error.message === "El horario del turno es obligatorio") return error.message;
        if (error.message === "El horario debe tener formato HH:mm") return error.message;
        if (error.message === "La duracion debe ser de al menos 15 minutos") return error.message;
        if (error.message === "La capacidad debe ser mayor a cero") return error.message;
        if (error.message === "La capacidad no puede ser menor a los cupos ocupados") return error.message;
        if (error.message === "Ese coach ya tiene un turno en ese dia y horario") return error.message;
    }

    return getAdminActionErrorMessage(error, fallback);
};

export const getWeeklyClassSchedules = async (): Promise<ActionResponse<WeeklyClassScheduleWithRelations[]>> => {
    try {
        const schedules = await prisma.weeklyClassSchedule.findMany({
            where: {
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
                },
            },
        });
        const schedulesWithAvailability = schedules.map((schedule) => {
            const occupiedSpots = schedule.studentAssignments.length;

            return {
                ...schedule,
                occupiedSpots,
                availableSpots: schedule.capacity === null
                    ? null
                    : Math.max(schedule.capacity - occupiedSpots, 0),
            };
        });

        return {
            ok: true,
            data: schedulesWithAvailability.sort((a, b) => (
                dayOrderIndex[a.dayOfWeek] - dayOrderIndex[b.dayOfWeek]
                || a.startTime.localeCompare(b.startTime)
            )),
        };
    } catch (error) {
        logAdminActionError("Error al obtener los turnos semanales:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudieron obtener los turnos",
        };
    }
};

export const getAdminWeeklyClassSchedules = async (): Promise<ActionResponse<WeeklyClassScheduleWithRelations[]>> => {
    try {
        await requireAdminSession();

        const schedules = await prisma.weeklyClassSchedule.findMany({
            include: {
                coach: {
                    include: {
                        user: {
                            include: {
                                image: true,
                            },
                        },
                    },
                },
                studentAssignments: {
                    where: {
                        isActive: true,
                    },
                    include: {
                        student: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
        });
        const schedulesWithAvailability = schedules.map((schedule) => {
            const occupiedSpots = schedule.studentAssignments.length;

            return {
                ...schedule,
                occupiedSpots,
                availableSpots: schedule.capacity === null
                    ? null
                    : Math.max(schedule.capacity - occupiedSpots, 0),
            };
        });

        return {
            ok: true,
            data: schedulesWithAvailability.sort((a, b) => (
                dayOrderIndex[a.dayOfWeek] - dayOrderIndex[b.dayOfWeek]
                || a.startTime.localeCompare(b.startTime)
                || (a.coach?.user?.name ?? "").localeCompare(b.coach?.user?.name ?? "")
            )),
        };
    } catch (error) {
        logAdminActionError("Error al obtener los turnos semanales de administracion:", error);

        return {
            ok: false,
            data: null,
            error: getScheduleErrorMessage(error, "No se pudieron obtener los turnos"),
        };
    }
};

export const createWeeklyClassSchedule = async (
    input: CreateWeeklyClassScheduleInput
): Promise<ActionResponse<WeeklyClassSchedule | null>> => {
    try {
        await requireAdminSession();
        await validateScheduleInput(input);

        const normalizedInput = normalizeScheduleInput(input);
        const schedule = await prisma.weeklyClassSchedule.create({
            data: {
                dayOfWeek: normalizedInput.dayOfWeek!,
                startTime: normalizedInput.startTime!,
                durationMinutes: normalizedInput.durationMinutes ?? 90,
                capacity: normalizedInput.capacity ?? null,
                coachId: normalizedInput.coachId,
                isActive: normalizedInput.isActive ?? true,
                notes: normalizedInput.notes,
            },
        });

        revalidatePath(adminClassSchedulesPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(publicHomePath);

        return {
            ok: true,
            data: schedule,
        };
    } catch (error) {
        logAdminActionError("Error al crear el turno semanal:", error);

        return {
            ok: false,
            data: null,
            error: getScheduleErrorMessage(error, "No se pudo crear el turno"),
        };
    }
};

export const updateWeeklyClassSchedule = async (
    id: string,
    input: UpdateWeeklyClassScheduleInput
): Promise<ActionResponse<WeeklyClassSchedule | null>> => {
    try {
        await requireAdminSession();
        await validateScheduleInput(input, id);

        const normalizedInput = normalizeScheduleInput(input);
        const schedule = await prisma.weeklyClassSchedule.update({
            where: {
                id,
            },
            data: {
                dayOfWeek: normalizedInput.dayOfWeek,
                startTime: normalizedInput.startTime,
                durationMinutes: normalizedInput.durationMinutes,
                capacity: normalizedInput.capacity,
                coachId: input.coachId === undefined ? undefined : normalizedInput.coachId,
                isActive: normalizedInput.isActive,
                notes: input.notes === undefined ? undefined : normalizedInput.notes,
            },
        });

        revalidatePath(adminClassSchedulesPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(publicHomePath);

        return {
            ok: true,
            data: schedule,
        };
    } catch (error) {
        logAdminActionError("Error al actualizar el turno semanal:", error);

        return {
            ok: false,
            data: null,
            error: getScheduleErrorMessage(error, "No se pudo actualizar el turno"),
        };
    }
};

export const deleteWeeklyClassSchedule = async (
    id: string
): Promise<ActionResponse<{ id: string; deactivated: boolean } | null>> => {
    try {
        await requireAdminSession();

        const assignmentsCount = await prisma.studentScheduleAssignment.count({
            where: {
                weeklyScheduleId: id,
            },
        });

        if (assignmentsCount > 0) {
            await prisma.weeklyClassSchedule.update({
                where: {
                    id,
                },
                data: {
                    isActive: false,
                },
            });

            revalidatePath(adminClassSchedulesPath);
            revalidatePath(adminStudentsPath);
            revalidatePath(publicHomePath);

            return {
                ok: true,
                data: {
                    id,
                    deactivated: true,
                },
            };
        }

        await prisma.weeklyClassSchedule.delete({
            where: {
                id,
            },
        });

        revalidatePath(adminClassSchedulesPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(publicHomePath);

        return {
            ok: true,
            data: {
                id,
                deactivated: false,
            },
        };
    } catch (error) {
        logAdminActionError("Error al eliminar el turno semanal:", error);

        return {
            ok: false,
            data: null,
            error: getScheduleErrorMessage(error, "No se pudo eliminar el turno"),
        };
    }
};
