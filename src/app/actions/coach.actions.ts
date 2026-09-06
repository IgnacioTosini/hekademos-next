"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit-log";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { isValidOptionalPhone } from "@/lib/form-validation";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type {
    CreateCoachUserInput,
    UpdateCoachUserInput,
    UserWithRelations,
} from "@/types/schema/users";
import { getActiveMembership, getMembershipAmountCents } from "@/utils/membership";
import { getAmountWithLateSurcharge, getPaymentMonthRange, getPaymentPeriodStart } from "@/utils/payment";
import {
    adminCoachesPath,
    adminUsersPath,
    coachInclude,
    getCoachWithRelations,
    normalizeEmail,
    sanitizeUserForClient,
    toDate,
    type ActionResponse,
} from "./_shared";

const coachDashboardPath = "/coach/dashboard";

const getCoachActionErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message === "Revisa el telefono ingresado") {
        return error.message;
    }

    return getAdminActionErrorMessage(error, fallback);
};

const validateCoachUserInput = (input: CreateCoachUserInput | UpdateCoachUserInput) => {
    if (!isValidOptionalPhone(input.phone)) {
        throw new Error("Revisa el telefono ingresado");
    }
};

const getCoachStudentForSession = async (studentId: string) => {
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

    if (!coach) return null;

    return prisma.student.findFirst({
        where: {
            id: studentId,
            coachId: coach.id,
        },
        include: {
            memberships: {
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    plan: true,
                },
            },
        },
    });
};

export const getCoaches = async (): Promise<ActionResponse<UserWithRelations[]>> => {
    try {
        await requireAdminSession();

        const coaches = await prisma.user.findMany({
            where: {
                role: "COACH",
            },
            orderBy: {
                name: "asc",
            },
            include: coachInclude,
        });

        return {
            ok: true,
            data: coaches.map((coach) => sanitizeUserForClient(coach)),
        };
    } catch (error) {
        logAdminActionError("Error al obtener los coaches:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudieron obtener los coaches"),
        };
    }
};

export const createCoachUser = async (
    input: CreateCoachUserInput
): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();
        validateCoachUserInput(input);

        const passwordHash = input.password ? await hashPassword(input.password) : input.passwordHash;

        const user = await prisma.user.create({
            data: {
                email: normalizeEmail(input.email),
                name: input.name,
                phone: input.phone,
                passwordHash,
                emailVerified: toDate(input.emailVerified),
                role: "COACH",
                status: input.status ?? "ACTIVE",
                image: input.image
                    ? {
                        create: {
                            url: input.image.url,
                            publicId: input.image.publicId,
                        },
                    }
                    : undefined,
                coach: {
                    create: {
                        bio: input.bio,
                        specialty: input.specialty,
                        instagram: input.instagram,
                        paymentAlias: input.paymentAlias?.trim().toLowerCase() || null,
                        paymentAccountHolder: input.paymentAccountHolder?.trim() || null,
                        isActive: input.isActive ?? true,
                    },
                },
            },
            include: coachInclude,
        });

        revalidatePath(adminUsersPath);
        revalidatePath(adminCoachesPath);

        return {
            ok: true,
            data: sanitizeUserForClient(user),
        };
    } catch (error) {
        logAdminActionError("Error al crear el usuario coach:", error);

        return {
            ok: false,
            data: null,
            error: getCoachActionErrorMessage(error, "No se pudo crear el coach"),
        };
    }
};

export const updateCoachUser = async (
    id: string,
    input: UpdateCoachUserInput
): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();
        validateCoachUserInput(input);

        const passwordHash = input.password ? await hashPassword(input.password) : input.passwordHash;
        const passwordIsChanging = Boolean(input.password) || input.passwordHash !== undefined;

        const user = await prisma.user.update({
            where: {
                id,
            },
            data: {
                email: input.email ? normalizeEmail(input.email) : undefined,
                name: input.name,
                phone: input.phone,
                passwordHash,
                sessionVersion: passwordIsChanging ? { increment: 1 } : undefined,
                emailVerified: toDate(input.emailVerified),
                role: "COACH",
                status: input.status,
                coach: {
                    upsert: {
                        create: {
                            bio: input.bio,
                            specialty: input.specialty,
                            instagram: input.instagram,
                            paymentAlias: input.paymentAlias?.trim().toLowerCase() || null,
                            paymentAccountHolder: input.paymentAccountHolder?.trim() || null,
                            isActive: input.isActive ?? true,
                        },
                        update: {
                            bio: input.bio,
                            specialty: input.specialty,
                            instagram: input.instagram,
                            paymentAlias: input.paymentAlias === undefined
                                ? undefined
                                : input.paymentAlias?.trim().toLowerCase() || null,
                            paymentAccountHolder: input.paymentAccountHolder === undefined
                                ? undefined
                                : input.paymentAccountHolder?.trim() || null,
                            isActive: input.isActive,
                        },
                    },
                },
            },
            include: coachInclude,
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

        const updatedUser = await getCoachWithRelations(user.id);

        revalidatePath(adminUsersPath);
        revalidatePath(adminCoachesPath);

        return {
            ok: true,
            data: sanitizeUserForClient(updatedUser),
        };
    } catch (error) {
        logAdminActionError("Error al actualizar el usuario coach:", error);

        return {
            ok: false,
            data: null,
            error: getCoachActionErrorMessage(error, "No se pudo actualizar el coach"),
        };
    }
};

export type UpdateCoachStudentInput = {
    routineExcelUrl?: string | null;
    monthlyPriceCents?: number | null;
    notes?: string | null;
};

export const updateCoachStudent = async (
    studentId: string,
    input: UpdateCoachStudentInput
): Promise<ActionResponse<{ studentId: string } | null>> => {
    try {
        const student = await getCoachStudentForSession(studentId);

        if (!student) {
            return {
                ok: false,
                data: null,
                error: "No tenes permiso para editar este alumno",
            };
        }

        await prisma.student.update({
            where: {
                id: student.id,
            },
            data: {
                routineExcelUrl: input.routineExcelUrl?.trim() || null,
                notes: input.notes?.trim() || null,
            },
        });

        if (input.monthlyPriceCents !== undefined) {
            const activeMembership = getActiveMembership(student.memberships, new Date());

            if (activeMembership) {
                await prisma.studentMembership.update({
                    where: {
                        id: activeMembership.id,
                    },
                    data: {
                        monthlyPriceCents: input.monthlyPriceCents,
                    },
                });
            }
        }

        revalidatePath(coachDashboardPath);
        await writeAuditLog({
            action: "STUDENT_UPDATE",
            entityType: "Student",
            entityId: student.id,
            metadata: {
                routineUpdated: input.routineExcelUrl !== undefined,
                priceUpdated: input.monthlyPriceCents !== undefined,
                notesUpdated: input.notes !== undefined,
            },
        });

        return {
            ok: true,
            data: {
                studentId: student.id,
            },
        };
    } catch (error) {
        logAdminActionError("Error al actualizar el alumno del coach:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudo actualizar el alumno",
        };
    }
};

export const markCoachStudentCurrentMonthPaymentPaid = async (
    studentId: string
): Promise<ActionResponse<{ paymentId: string } | null>> => {
    try {
        const today = new Date();
        const { dueDate: paymentDueDate } = getPaymentMonthRange(today);
        const periodStart = getPaymentPeriodStart(today);
        const student = await getCoachStudentForSession(studentId);

        if (!student) {
            return {
                ok: false,
                data: null,
                error: "No tenes permiso para operar este alumno",
            };
        }

        const activeMembership = getActiveMembership(student.memberships, today);

        if (!activeMembership) {
            return {
                ok: false,
                data: null,
                error: "El alumno no tiene una membresia activa",
            };
        }

        const existingPayment = await prisma.payment.findUnique({
            where: {
                studentId_periodStart: {
                    studentId: student.id,
                    periodStart,
                },
            },
        });
        const baseAmountCents = getMembershipAmountCents(activeMembership);
        const isLate = today.getTime() > paymentDueDate.getTime();
        const amountCents = existingPayment?.status === "PAID"
            ? existingPayment.amountCents
            : getAmountWithLateSurcharge(baseAmountCents, isLate);
        const paidAt = existingPayment?.status === "PAID"
            ? existingPayment.paidAt ?? today
            : today;
        const payment = await prisma.payment.upsert({
            where: {
                studentId_periodStart: {
                    studentId: student.id,
                    periodStart,
                },
            },
            update: {
                amountCents,
                currency: activeMembership.plan.currency,
                status: "PAID",
                paidAt,
                dueDate: paymentDueDate,
            },
            create: {
                studentId: student.id,
                studentMembershipId: activeMembership.id,
                periodStart,
                amountCents,
                currency: activeMembership.plan.currency,
                status: "PAID",
                dueDate: paymentDueDate,
                paidAt,
            },
        });

        revalidatePath(coachDashboardPath);
        revalidatePath("/admin/pagos");
        revalidatePath(`/admin/alumnos/${student.id}`);
        await writeAuditLog({
            action: "PAYMENT_MARK_PAID",
            entityType: "Payment",
            entityId: payment.id,
            metadata: {
                studentId: student.id,
                amountCents,
                periodMonth: today.getMonth() + 1,
                periodYear: today.getFullYear(),
            },
        });

        return {
            ok: true,
            data: {
                paymentId: payment.id,
            },
        };
    } catch (error) {
        logAdminActionError("Error al marcar como pagado el pago del alumno del coach:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudo marcar el pago",
        };
    }
};

export const markCoachStudentCurrentMonthPaymentPending = async (
    studentId: string
): Promise<ActionResponse<{ paymentId: string } | null>> => {
    try {
        const selectedDate = new Date();
        const { dueDate: paymentDueDate } = getPaymentMonthRange(selectedDate);
        const periodStart = getPaymentPeriodStart(selectedDate);
        const student = await getCoachStudentForSession(studentId);

        if (!student) {
            return {
                ok: false,
                data: null,
                error: "No tenes permiso para operar este alumno",
            };
        }

        const payment = await prisma.payment.findUnique({
            where: {
                studentId_periodStart: {
                    studentId: student.id,
                    periodStart,
                },
            },
        });

        if (!payment) {
            return {
                ok: false,
                data: null,
                error: "No se encontro un pago del mes actual",
            };
        }

        const updatedPayment = await prisma.payment.update({
            where: {
                id: payment.id,
            },
            data: {
                status: "PENDING",
                paidAt: null,
                dueDate: paymentDueDate,
            },
        });

        revalidatePath(coachDashboardPath);
        revalidatePath("/admin/pagos");
        revalidatePath(`/admin/alumnos/${student.id}`);
        await writeAuditLog({
            action: "PAYMENT_MARK_PENDING",
            entityType: "Payment",
            entityId: updatedPayment.id,
            metadata: {
                studentId: student.id,
                periodMonth: selectedDate.getMonth() + 1,
                periodYear: selectedDate.getFullYear(),
            },
        });

        return {
            ok: true,
            data: {
                paymentId: updatedPayment.id,
            },
        };
    } catch (error) {
        logAdminActionError("Error al marcar como pendiente el pago del alumno del coach:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudo desmarcar el pago",
        };
    }
};
