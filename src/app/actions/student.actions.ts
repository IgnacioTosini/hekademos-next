"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { writeAuditLog } from "@/lib/audit-log";
import { isDeliverableEmail, isValidBirthDate, isValidOptionalPhone } from "@/lib/form-validation";
import type {
    AdminStudentProfile,
    CreateStudentUserInput,
    UpdateStudentUserInput,
    UserWithRelations,
} from "@/types/schema/users";
import {
    adminPaymentsPath,
    adminStudentsPath,
    adminUsersPath,
    getUserWithRelations,
    normalizeEmail,
    sanitizeUserForClient,
    toDate,
    userInclude,
    type ActionResponse,
} from "./_shared";

const studentUserInclude = {
    image: true,
    coach: true,
    student: {
        include: {
            memberships: {
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    plan: true,
                },
            },
            schedules: {
                where: {
                    isActive: true,
                },
                include: {
                    weeklySchedule: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    },
} as const;

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

const getAppBaseUrl = () => (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.AUTH_BASE_URL
    || "http://localhost:3000"
);

const getStudentLoginUrl = () => (
    `${getAppBaseUrl()}/auth/login?next=/perfil`
);

const sendStudentWelcomeEmail = async ({
    email,
    name,
    coachId,
}: {
    email: string;
    name: string;
    coachId?: string | null;
}) => {
    if (!isDeliverableEmail(email)) return "SKIPPED_INVALID_EMAIL";

    const coach = coachId
        ? await prisma.coach.findUnique({
            where: {
                id: coachId,
            },
            include: {
                user: true,
            },
        })
        : null;
    const emailMessage = buildEmailMessage({
        type: "STUDENT_WELCOME",
        to: {
            email,
            name,
        },
        data: {
            name,
            loginUrl: getStudentLoginUrl(),
            coachName: coach?.user?.name || coach?.user?.email || null,
        },
    });

    try {
        await sendEmail(emailMessage);
        return "SENT";
    } catch (error) {
        console.error(`Error sending student welcome email to ${email}:`, error);
        return "FAILED";
    }
};

const syncActiveMembership = async (
    studentId: string,
    planId?: string | null,
    monthlyPriceCents?: number | null
) => {
    if (planId === undefined) return undefined;

    const activeMembership = await getCurrentActiveStudentMembership(studentId);

    if (!planId) {
        await prisma.studentMembership.updateMany({
            where: {
                studentId,
                status: "ACTIVE",
            },
            data: {
                status: "CANCELLED",
                endDate: new Date(),
            },
        });
        return null;
    }

    if (activeMembership) {
        return prisma.studentMembership.update({
            where: {
                id: activeMembership.id,
            },
            data: {
                planId,
                status: "ACTIVE",
                endDate: null,
                monthlyPriceCents,
            },
            include: {
                plan: true,
            },
        });
    }

    return prisma.studentMembership.create({
        data: {
            studentId,
            planId,
            startDate: new Date(),
            status: "ACTIVE",
            classesUsed: 0,
            monthlyPriceCents,
        },
        include: {
            plan: true,
        },
    });
};

const getStudentActionErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    if (error.message === "SCHEDULE_LIMIT_EXCEEDED") return "La cantidad de turnos supera lo permitido por el plan.";
    if (error.message === "SCHEDULE_NOT_FOUND") return "Uno de los turnos seleccionados ya no existe.";
    if (error.message === "SCHEDULE_FULL") return "Uno de los turnos seleccionados no tiene cupos disponibles.";
    if (error.message === "SCHEDULE_REPEATED_DAY") return "El alumno no puede elegir dos turnos el mismo dia.";
    if (error.message === "INVALID_PHONE") return "Revisa los telefonos ingresados.";
    if (error.message === "INVALID_BIRTH_DATE") return "La fecha de nacimiento no parece valida.";

    return fallback;
};

const validateStudentProfileFields = (input: CreateStudentUserInput | UpdateStudentUserInput) => {
    if (!isValidOptionalPhone(input.phone) || !isValidOptionalPhone(input.emergencyContactPhone)) {
        throw new Error("INVALID_PHONE");
    }

    if (!isValidBirthDate(input.birthDate)) {
        throw new Error("INVALID_BIRTH_DATE");
    }
};

const validateNewStudentSchedules = async (planId?: string | null, scheduleIds?: string[]) => {
    if (!planId || !scheduleIds || scheduleIds.length === 0) return;

    const uniqueScheduleIds = Array.from(new Set(scheduleIds.filter(Boolean)));
    const plan = await prisma.membershipPlan.findUnique({
        where: {
            id: planId,
        },
    });

    if (!plan || uniqueScheduleIds.length > plan.trainingDaysPerWeek) {
        throw new Error("SCHEDULE_LIMIT_EXCEEDED");
    }

    const selectedSchedules = await prisma.weeklyClassSchedule.findMany({
        where: {
            id: {
                in: uniqueScheduleIds,
            },
            isActive: true,
        },
        include: {
            studentAssignments: {
                where: {
                    isActive: true,
                },
            },
        },
    });

    if (selectedSchedules.length !== uniqueScheduleIds.length) {
        throw new Error("SCHEDULE_NOT_FOUND");
    }

    const selectedDays = selectedSchedules.map((schedule) => schedule.dayOfWeek);

    if (new Set(selectedDays).size !== selectedDays.length) {
        throw new Error("SCHEDULE_REPEATED_DAY");
    }

    const hasFullSchedule = selectedSchedules.some((schedule) => (
        schedule.capacity !== null && schedule.studentAssignments.length >= schedule.capacity
    ));

    if (hasFullSchedule) {
        throw new Error("SCHEDULE_FULL");
    }
};

const syncStudentSchedules = async (
    studentId: string,
    activeMembership: Awaited<ReturnType<typeof getCurrentActiveStudentMembership>> | null | undefined,
    scheduleIds?: string[]
) => {
    if (scheduleIds === undefined) return;

    const uniqueScheduleIds = Array.from(new Set(scheduleIds.filter(Boolean)));

    if (!activeMembership || uniqueScheduleIds.length === 0) {
        await prisma.studentScheduleAssignment.updateMany({
            where: {
                studentId,
            },
            data: {
                isActive: false,
                studentMembershipId: activeMembership?.id ?? null,
            },
        });
        return;
    }

    if (uniqueScheduleIds.length > activeMembership.plan.trainingDaysPerWeek) {
        throw new Error("SCHEDULE_LIMIT_EXCEEDED");
    }

    const selectedSchedules = await prisma.weeklyClassSchedule.findMany({
        where: {
            id: {
                in: uniqueScheduleIds,
            },
            isActive: true,
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

    if (selectedSchedules.length !== uniqueScheduleIds.length) {
        throw new Error("SCHEDULE_NOT_FOUND");
    }

    const selectedDays = selectedSchedules.map((schedule) => schedule.dayOfWeek);

    if (new Set(selectedDays).size !== selectedDays.length) {
        throw new Error("SCHEDULE_REPEATED_DAY");
    }

    const hasFullSchedule = selectedSchedules.some((schedule) => (
        schedule.capacity !== null && schedule.studentAssignments.length >= schedule.capacity
    ));

    if (hasFullSchedule) {
        throw new Error("SCHEDULE_FULL");
    }

    await prisma.studentScheduleAssignment.updateMany({
        where: {
            studentId,
            weeklyScheduleId: {
                notIn: uniqueScheduleIds,
            },
        },
        data: {
            isActive: false,
            studentMembershipId: activeMembership.id,
        },
    });

    await Promise.all(uniqueScheduleIds.map((weeklyScheduleId) => (
        prisma.studentScheduleAssignment.upsert({
            where: {
                studentId_weeklyScheduleId: {
                    studentId,
                    weeklyScheduleId,
                },
            },
            update: {
                isActive: true,
                studentMembershipId: activeMembership.id,
            },
            create: {
                studentId,
                weeklyScheduleId,
                studentMembershipId: activeMembership.id,
            },
        })
    )));
};

export const getStudents = async (): Promise<ActionResponse<UserWithRelations[]>> => {
    try {
        await requireAdminSession();

        const students = await prisma.user.findMany({
            where: {
                role: "STUDENT",
            },
            orderBy: {
                createdAt: "desc",
            },
            include: studentUserInclude,
        });

        return {
            ok: true,
            data: students.map((student) => sanitizeUserForClient(student)),
        };
    } catch (error) {
        logAdminActionError("Error getting students:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudieron obtener los alumnos"),
        };
    }
};

type GetStudentByIdInput = {
    attendanceMonth?: number | null;
    attendanceYear?: number | null;
};

const getAttendanceMonthRange = (input?: GetStudentByIdInput) => {
    const today = new Date();
    const month = Number(input?.attendanceMonth);
    const year = Number(input?.attendanceYear);
    const normalizedMonth = Number.isInteger(month) && month >= 1 && month <= 12
        ? month - 1
        : today.getMonth();
    const normalizedYear = Number.isInteger(year) && year >= 2000 && year <= 2100
        ? year
        : today.getFullYear();

    return {
        start: new Date(normalizedYear, normalizedMonth, 1),
        end: new Date(normalizedYear, normalizedMonth + 1, 1),
    };
};

export const getStudentById = async (
    id: string,
    input?: GetStudentByIdInput
): Promise<ActionResponse<AdminStudentProfile | null>> => {
    try {
        await requireAdminSession();
        const attendanceRange = getAttendanceMonthRange(input);

        const student = await prisma.student.findUnique({
            where: {
                id,
            },
            include: {
                user: {
                    include: {
                        image: true,
                    },
                },
                coach: {
                    include: {
                        user: {
                            include: {
                                image: true,
                            },
                        },
                    },
                },
                memberships: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        plan: true,
                        payments: {
                            orderBy: {
                                createdAt: "desc",
                            },
                        },
                    },
                },
                payments: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
                attendance: {
                    where: {
                        session: {
                            startsAt: {
                                gte: attendanceRange.start,
                                lt: attendanceRange.end,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        session: {
                            include: {
                                schedule: true,
                            },
                        },
                    },
                },
                schedules: {
                    where: {
                        isActive: true,
                    },
                    include: {
                        weeklySchedule: {
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
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        const sanitizedStudent = student
            ? {
                ...student,
                user: {
                    ...student.user,
                    passwordHash: null,
                },
                coach: student.coach
                    ? {
                        ...student.coach,
                        user: {
                            ...student.coach.user,
                            passwordHash: null,
                        },
                    }
                    : student.coach,
            }
            : student;

        return {
            ok: true,
            data: sanitizedStudent,
        };
    } catch (error) {
        logAdminActionError("Error getting student:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo obtener el alumno"),
        };
    }
};

export const createStudentUser = async (
    input: CreateStudentUserInput
): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();

        validateStudentProfileFields(input);
        await validateNewStudentSchedules(input.planId, input.scheduleIds);

        const name = input.name || [input.firstName, input.lastName].filter(Boolean).join(" ") || null;
        const passwordHash = input.password ? await hashPassword(input.password) : input.passwordHash;

        const user = await prisma.user.create({
            data: {
                email: normalizeEmail(input.email),
                name,
                phone: input.phone,
                passwordHash,
                emailVerified: toDate(input.emailVerified),
                role: "STUDENT",
                status: input.status ?? "ACTIVE",
                image: input.image
                    ? {
                        create: {
                            url: input.image.url,
                            publicId: input.image.publicId,
                        },
                    }
                    : undefined,
                student: {
                    create: {
                        coachId: input.coachId,
                        firstName: input.firstName,
                        lastName: input.lastName,
                        birthDate: toDate(input.birthDate),
                        emergencyContactName: input.emergencyContactName,
                        emergencyContactPhone: input.emergencyContactPhone,
                        routineExcelUrl: input.routineExcelUrl,
                        notes: input.notes,
                    },
                },
            },
            include: userInclude,
        });

        if (user.student) {
            const activeMembership = await syncActiveMembership(user.student.id, input.planId, input.monthlyPriceCents);
            await syncStudentSchedules(user.student.id, activeMembership, input.scheduleIds);
        }

        const createdUser = await getUserWithRelations(user.id);
        const welcomeEmailStatus = await sendStudentWelcomeEmail({
            email: user.email,
            name: name || user.email,
            coachId: input.coachId,
        });

        revalidatePath(adminUsersPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(adminPaymentsPath);
        if (user.student) {
            revalidatePath(`${adminStudentsPath}/${user.student.id}`);
            await writeAuditLog({
                action: "STUDENT_CREATE",
                entityType: "Student",
                entityId: user.student.id,
                metadata: {
                    userId: user.id,
                    email: user.email,
                    coachId: input.coachId ?? null,
                    planId: input.planId ?? null,
                    welcomeEmailStatus,
                },
            });
        }

        return {
            ok: true,
            data: sanitizeUserForClient(createdUser),
        };
    } catch (error) {
        logAdminActionError("Error creating student user:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, getStudentActionErrorMessage(error, "No se pudo crear el alumno")),
        };
    }
};

export const updateStudentUser = async (
    id: string,
    input: UpdateStudentUserInput
): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();

        validateStudentProfileFields(input);
        const name = input.name ?? ([input.firstName, input.lastName].filter(Boolean).join(" ") || undefined);
        const passwordHash = input.password ? await hashPassword(input.password) : input.passwordHash;

        const user = await prisma.user.update({
            where: {
                id,
            },
            data: {
                email: input.email ? normalizeEmail(input.email) : undefined,
                name,
                phone: input.phone,
                passwordHash,
                emailVerified: toDate(input.emailVerified),
                role: "STUDENT",
                status: input.status,
                student: {
                    upsert: {
                        create: {
                            coachId: input.coachId,
                            firstName: input.firstName,
                            lastName: input.lastName,
                            birthDate: toDate(input.birthDate),
                            emergencyContactName: input.emergencyContactName,
                            emergencyContactPhone: input.emergencyContactPhone,
                            routineExcelUrl: input.routineExcelUrl,
                            notes: input.notes,
                        },
                        update: {
                            coachId: input.coachId,
                            firstName: input.firstName,
                            lastName: input.lastName,
                            birthDate: toDate(input.birthDate),
                            emergencyContactName: input.emergencyContactName,
                            emergencyContactPhone: input.emergencyContactPhone,
                            routineExcelUrl: input.routineExcelUrl,
                            notes: input.notes,
                        },
                    },
                },
            },
            include: userInclude,
        });

        if (input.image === null) {
            await prisma.userImage.deleteMany({
                where: {
                    userId: id,
                },
            });
        }

        if (input.image) {
            await prisma.userImage.upsert({
                where: {
                    userId: id,
                },
                update: {
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
                create: {
                    userId: id,
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
            });
        }

        const updatedUser = await getUserWithRelations(user.id);

        if (updatedUser?.student) {
            const activeMembership = await syncActiveMembership(updatedUser.student.id, input.planId, input.monthlyPriceCents);
            const membershipForSchedules = activeMembership === undefined
                ? await getCurrentActiveStudentMembership(updatedUser.student.id)
                : activeMembership;

            await syncStudentSchedules(updatedUser.student.id, membershipForSchedules, input.scheduleIds);
        }

        revalidatePath(adminUsersPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(adminPaymentsPath);
        if (updatedUser?.student) {
            revalidatePath(`${adminStudentsPath}/${updatedUser.student.id}`);
            await writeAuditLog({
                action: "STUDENT_UPDATE",
                entityType: "Student",
                entityId: updatedUser.student.id,
                metadata: {
                    userId: updatedUser.id,
                    email: updatedUser.email,
                    coachId: input.coachId ?? null,
                    planId: input.planId ?? null,
                    scheduleIds: input.scheduleIds ?? null,
                },
            });
        }

        return {
            ok: true,
            data: sanitizeUserForClient(updatedUser),
        };
    } catch (error) {
        logAdminActionError("Error updating student user:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, getStudentActionErrorMessage(error, "No se pudo actualizar el alumno")),
        };
    }
};
