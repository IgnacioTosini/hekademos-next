"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit-log";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { isDeliverableEmail } from "@/lib/form-validation";
import { prisma } from "@/lib/prisma";
import type {
    Payment,
    PaymentOverviewPeriodInput,
    PaymentOverviewRow,
    PaymentOverviewStatus,
    SavePaymentDetailsInput,
} from "@/types/schema/payments";
import { formatCurrency, formatDate } from "@/utils/format";
import { getActiveMembership, getMembershipAmountCents } from "@/utils/membership";
import {
    getAmountWithLateSurcharge,
    getPaymentForPeriod,
    getPaymentMonthRange,
    getPaymentReminderTypeForDate,
    LATE_SURCHARGE_PERCENT,
    type PaymentReminderType,
    shouldApplyLateSurcharge,
} from "@/utils/payment";
import { getStudentName } from "@/utils/student";
import {
    adminPaymentsPath,
    adminStudentsPath,
    type ActionResponse,
} from "./_shared";

const getSelectedPeriodDate = (input?: PaymentOverviewPeriodInput) => {
    const today = new Date();
    const month = Number(input?.month);
    const year = Number(input?.year);
    const normalizedMonth = Number.isInteger(month) && month >= 1 && month <= 12
        ? month - 1
        : today.getMonth();
    const normalizedYear = Number.isInteger(year) && year >= 2000 && year <= 2100
        ? year
        : today.getFullYear();

    return new Date(normalizedYear, normalizedMonth, 1);
};

export type SendPaymentReminderEmailsInput = PaymentOverviewPeriodInput & {
    reminderType?: PaymentReminderType;
};

export type SendPaymentReminderEmailsResult = {
    reminderType: PaymentReminderType;
    sentCount: number;
    failedCount: number;
    alreadyPaidCount: number;
    invalidEmailCount: number;
    skippedCount: number;
};

export type DashboardPendingPaymentStatus = Extract<PaymentOverviewStatus, "PENDING" | "NO_MEMBERSHIP">;

export type DashboardPendingPaymentRow = {
    studentId: string;
    studentName: string;
    coachName: string;
    planName: string;
    status: DashboardPendingPaymentStatus;
    amountCents: number | null;
    currency: string;
    isLate: boolean;
    lateSurchargePercent: number;
};

export type DashboardPendingPaymentsSummary = {
    totalCount: number;
    rows: DashboardPendingPaymentRow[];
};

export const getPaymentOverview = async (
    input?: PaymentOverviewPeriodInput
): Promise<ActionResponse<PaymentOverviewRow[]>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const selectedPeriodDate = getSelectedPeriodDate(input);
        const { start, end, dueDate } = getPaymentMonthRange(selectedPeriodDate);

        const students = await prisma.student.findMany({
            orderBy: {
                createdAt: "desc",
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
                                    gte: dueDate,
                                },
                            },
                        ],
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                    include: {
                        plan: true,
                        payments: {
                            where: {
                                OR: [
                                    {
                                        dueDate: {
                                            gte: start,
                                            lt: end,
                                        },
                                    },
                                    {
                                        paidAt: {
                                            gte: start,
                                            lt: end,
                                        },
                                    },
                                ],
                            },
                            orderBy: {
                                createdAt: "desc",
                            },
                            take: 1,
                        },
                    },
                },
                payments: {
                    where: {
                        OR: [
                            {
                                dueDate: {
                                    gte: start,
                                    lt: end,
                                },
                            },
                            {
                                paidAt: {
                                    gte: start,
                                    lt: end,
                                },
                            },
                        ],
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                },
            },
        });

        const rows = students.map((student): PaymentOverviewRow => {
            const activeMembership = getActiveMembership(student.memberships, dueDate);
            const currentMonthPayment = activeMembership?.payments[0] ?? student.payments[0] ?? null;
            const latestPayment = currentMonthPayment;
            const status = activeMembership ? (currentMonthPayment?.status ?? "PENDING") : "NO_MEMBERSHIP";
            const baseAmountCents = activeMembership ? getMembershipAmountCents(activeMembership) : latestPayment?.amountCents ?? null;
            const isLate = activeMembership ? shouldApplyLateSurcharge(today, dueDate, currentMonthPayment?.status) : false;
            const amountCents = currentMonthPayment?.status === "PAID"
                ? currentMonthPayment.amountCents
                : baseAmountCents === null ? null : getAmountWithLateSurcharge(baseAmountCents, isLate);

            return {
                student,
                activeMembership,
                currentMonthPayment,
                latestPayment,
                status,
                amountCents,
                baseAmountCents,
                currency: activeMembership?.plan.currency ?? latestPayment?.currency ?? "ARS",
                paymentPeriodStart: start,
                paymentPeriodEnd: dueDate,
                isLate,
                lateSurchargePercent: LATE_SURCHARGE_PERCENT,
            };
        });

        return {
            ok: true,
            data: rows,
        };
    } catch (error) {
        logAdminActionError("Error getting payment overview:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo obtener el resumen de pagos"),
        };
    }
};

export const getStudentPaymentHistory = async (studentId: string): Promise<ActionResponse<Payment[]>> => {
    try {
        await requireAdminSession();

        const payments = await prisma.payment.findMany({
            where: {
                studentId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return {
            ok: true,
            data: payments,
        };
    } catch (error) {
        logAdminActionError("Error getting student payment history:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo obtener el historial de pagos"),
        };
    }
};

export const getDashboardPendingPayments = async (): Promise<ActionResponse<DashboardPendingPaymentsSummary>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const { start, end, dueDate } = getPaymentMonthRange(today);
        const students = await prisma.student.findMany({
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
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
                memberships: {
                    where: {
                        status: "ACTIVE",
                        OR: [
                            {
                                endDate: null,
                            },
                            {
                                endDate: {
                                    gte: dueDate,
                                },
                            },
                        ],
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                    select: {
                        monthlyPriceCents: true,
                        plan: {
                            select: {
                                name: true,
                                priceCents: true,
                                currency: true,
                            },
                        },
                        payments: {
                            where: {
                                OR: [
                                    {
                                        dueDate: {
                                            gte: start,
                                            lt: end,
                                        },
                                    },
                                    {
                                        paidAt: {
                                            gte: start,
                                            lt: end,
                                        },
                                    },
                                ],
                            },
                            orderBy: {
                                createdAt: "desc",
                            },
                            take: 1,
                            select: {
                                amountCents: true,
                                currency: true,
                                status: true,
                            },
                        },
                    },
                },
                payments: {
                    where: {
                        OR: [
                            {
                                dueDate: {
                                    gte: start,
                                    lt: end,
                                },
                            },
                            {
                                paidAt: {
                                    gte: start,
                                    lt: end,
                                },
                            },
                        ],
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                    select: {
                        amountCents: true,
                        currency: true,
                        status: true,
                    },
                },
            },
        });
        const pendingRows = students.flatMap((student): DashboardPendingPaymentRow[] => {
            const activeMembership = student.memberships[0] ?? null;
            const currentMonthPayment = activeMembership?.payments[0] ?? student.payments[0] ?? null;
            const status = activeMembership
                ? currentMonthPayment?.status ?? "PENDING"
                : "NO_MEMBERSHIP";

            if (status !== "PENDING" && status !== "NO_MEMBERSHIP") {
                return [];
            }

            const baseAmountCents = activeMembership
                ? getMembershipAmountCents(activeMembership)
                : currentMonthPayment?.amountCents ?? null;
            const isLate = !!activeMembership && shouldApplyLateSurcharge(today, dueDate, currentMonthPayment?.status);

            return [{
                studentId: student.id,
                studentName: getStudentName(student),
                coachName: student.coach?.user?.name || student.coach?.user?.email || "Sin coach",
                planName: activeMembership?.plan.name ?? "Sin membresia",
                status,
                amountCents: baseAmountCents === null ? null : getAmountWithLateSurcharge(baseAmountCents, isLate),
                currency: activeMembership?.plan.currency ?? currentMonthPayment?.currency ?? "ARS",
                isLate,
                lateSurchargePercent: LATE_SURCHARGE_PERCENT,
            }];
        }).sort((a, b) => {
            if (a.status === "PENDING" && b.status !== "PENDING") return -1;
            if (a.status !== "PENDING" && b.status === "PENDING") return 1;
            if (a.isLate && !b.isLate) return -1;
            if (!a.isLate && b.isLate) return 1;

            return a.studentName.localeCompare(b.studentName);
        });

        return {
            ok: true,
            data: {
                totalCount: pendingRows.length,
                rows: pendingRows.slice(0, 5),
            },
        };
    } catch (error) {
        logAdminActionError("Error getting dashboard pending payments:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo obtener el resumen de pagos pendientes"),
        };
    }
};

export const markCurrentMonthPaymentPaid = async (
    studentId: string,
    input?: PaymentOverviewPeriodInput
): Promise<ActionResponse<{ paymentId: string } | null>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const selectedPeriodDate = getSelectedPeriodDate(input);
        const { start, end, dueDate } = getPaymentMonthRange(selectedPeriodDate);

        const student = await prisma.student.findUnique({
            where: {
                id: studentId,
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

        if (!student) {
            return {
                ok: false,
                data: null,
                error: "No se encontro el alumno",
            };
        }

        const activeMembership = getActiveMembership(student.memberships, dueDate);

        if (!activeMembership) {
            return {
                ok: false,
                data: null,
                error: "El alumno no tiene una membresia activa",
            };
        }

        const existingPayment = await prisma.payment.findFirst({
            where: {
                studentId: student.id,
                studentMembershipId: activeMembership.id,
                OR: [
                    {
                        dueDate: {
                            gte: start,
                            lt: end,
                        },
                    },
                    {
                        paidAt: {
                            gte: start,
                            lt: end,
                        },
                    },
                ],
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const baseAmountCents = getMembershipAmountCents(activeMembership);
        const amountCents = getAmountWithLateSurcharge(
            baseAmountCents,
            shouldApplyLateSurcharge(today, dueDate)
        );

        const payment = existingPayment
            ? await prisma.payment.update({
                where: {
                    id: existingPayment.id,
                },
                data: {
                    amountCents,
                    currency: activeMembership.plan.currency,
                    status: "PAID",
                    paidAt: today,
                    dueDate,
                },
            })
            : await prisma.payment.create({
                data: {
                    studentId: student.id,
                    studentMembershipId: activeMembership.id,
                    amountCents,
                    currency: activeMembership.plan.currency,
                    status: "PAID",
                    dueDate,
                    paidAt: today,
                },
            });

        revalidatePath(adminPaymentsPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${student.id}`);
        await writeAuditLog({
            action: "PAYMENT_MARK_PAID",
            entityType: "Payment",
            entityId: payment.id,
            metadata: {
                studentId: student.id,
                amountCents,
                periodMonth: selectedPeriodDate.getMonth() + 1,
                periodYear: selectedPeriodDate.getFullYear(),
            },
        });

        return {
            ok: true,
            data: {
                paymentId: payment.id,
            },
        };
    } catch (error) {
        logAdminActionError("Error marking payment as paid:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo marcar el pago como pagado"),
        };
    }
};

export const markCurrentMonthPaymentPending = async (
    studentId: string,
    input?: PaymentOverviewPeriodInput
): Promise<ActionResponse<{ paymentId: string } | null>> => {
    try {
        await requireAdminSession();

        const selectedPeriodDate = getSelectedPeriodDate(input);
        const { start, end, dueDate } = getPaymentMonthRange(selectedPeriodDate);

        const payment = await prisma.payment.findFirst({
            where: {
                studentId,
                OR: [
                    {
                        dueDate: {
                            gte: start,
                            lt: end,
                        },
                    },
                    {
                        paidAt: {
                            gte: start,
                            lt: end,
                        },
                    },
                ],
            },
            orderBy: {
                createdAt: "desc",
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
                dueDate,
            },
        });

        revalidatePath(adminPaymentsPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${studentId}`);
        await writeAuditLog({
            action: "PAYMENT_MARK_PENDING",
            entityType: "Payment",
            entityId: updatedPayment.id,
            metadata: {
                studentId,
                periodMonth: selectedPeriodDate.getMonth() + 1,
                periodYear: selectedPeriodDate.getFullYear(),
            },
        });

        return {
            ok: true,
            data: {
                paymentId: updatedPayment.id,
            },
        };
    } catch (error) {
        logAdminActionError("Error marking payment as pending:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo desmarcar el pago"),
        };
    }
};

export const savePaymentDetails = async (
    studentId: string,
    input: SavePaymentDetailsInput
): Promise<ActionResponse<{ paymentId: string } | null>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const selectedPeriodDate = getSelectedPeriodDate(input);
        const { start, end, dueDate } = getPaymentMonthRange(selectedPeriodDate);
        const student = await prisma.student.findUnique({
            where: {
                id: studentId,
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

        if (!student) {
            return {
                ok: false,
                data: null,
                error: "No se encontro el alumno",
            };
        }

        const activeMembership = getActiveMembership(student.memberships, dueDate);

        if (!activeMembership) {
            return {
                ok: false,
                data: null,
                error: "El alumno no tiene una membresia activa para este periodo",
            };
        }

        const existingPayment = await prisma.payment.findFirst({
            where: {
                studentId: student.id,
                studentMembershipId: activeMembership.id,
                OR: [
                    {
                        dueDate: {
                            gte: start,
                            lt: end,
                        },
                    },
                    {
                        paidAt: {
                            gte: start,
                            lt: end,
                        },
                    },
                ],
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const reference = input.reference?.trim() || null;
        const notes = input.notes?.trim() || null;
        const baseAmountCents = getMembershipAmountCents(activeMembership);
        const amountCents = existingPayment?.status === "PAID"
            ? existingPayment.amountCents
            : getAmountWithLateSurcharge(
                baseAmountCents,
                shouldApplyLateSurcharge(today, dueDate, existingPayment?.status)
            );
        const payment = existingPayment
            ? await prisma.payment.update({
                where: {
                    id: existingPayment.id,
                },
                data: {
                    reference,
                    notes,
                    dueDate,
                },
            })
            : await prisma.payment.create({
                data: {
                    studentId: student.id,
                    studentMembershipId: activeMembership.id,
                    amountCents,
                    currency: activeMembership.plan.currency,
                    status: "PENDING",
                    dueDate,
                    reference,
                    notes,
                },
            });

        revalidatePath(adminPaymentsPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(`${adminStudentsPath}/${student.id}`);
        await writeAuditLog({
            action: "PAYMENT_DETAILS_UPDATE",
            entityType: "Payment",
            entityId: payment.id,
            metadata: {
                studentId: student.id,
                reference,
                hasNotes: !!notes,
                periodMonth: selectedPeriodDate.getMonth() + 1,
                periodYear: selectedPeriodDate.getFullYear(),
            },
        });

        return {
            ok: true,
            data: {
                paymentId: payment.id,
            },
        };
    } catch (error) {
        logAdminActionError("Error saving payment details:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudieron guardar los detalles del pago"),
        };
    }
};

export const sendPaymentReminderEmails = async (
    input?: SendPaymentReminderEmailsInput
): Promise<ActionResponse<SendPaymentReminderEmailsResult>> => {
    try {
        await requireAdminSession();

        const today = new Date();
        const selectedPeriodDate = getSelectedPeriodDate(input);
        const reminderType = input?.reminderType ?? getPaymentReminderTypeForDate(today) ?? "MONTHLY";
        const { start, end, dueDate } = getPaymentMonthRange(selectedPeriodDate);
        const students = await prisma.student.findMany({
            include: {
                user: true,
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
            },
        });
        let sentCount = 0;
        let failedCount = 0;
        let alreadyPaidCount = 0;
        let invalidEmailCount = 0;
        let skippedCount = 0;

        for (const student of students) {
            const activeMembership = getActiveMembership(student.memberships, dueDate);

            if (!activeMembership || student.user.status !== "ACTIVE") {
                skippedCount += 1;
                continue;
            }

            if (!isDeliverableEmail(student.user.email)) {
                invalidEmailCount += 1;
                continue;
            }

            const currentMonthPayment = getPaymentForPeriod(
                [...activeMembership.payments, ...student.payments],
                start,
                end
            );

            if (currentMonthPayment?.status === "PAID") {
                alreadyPaidCount += 1;
                continue;
            }

            const baseAmountCents = getMembershipAmountCents(activeMembership);
            const isLate = shouldApplyLateSurcharge(today, dueDate, currentMonthPayment?.status);
            const currentAmountCents = getAmountWithLateSurcharge(baseAmountCents, isLate);
            const increasedAmountCents = getAmountWithLateSurcharge(baseAmountCents, true);
            const studentName = getStudentName(student);
            const emailMessage = buildEmailMessage({
                type: "PAYMENT_REMINDER",
                to: {
                    email: student.user.email,
                    name: studentName,
                },
                data: {
                    name: studentName,
                    amountLabel: formatCurrency(currentAmountCents, activeMembership.plan.currency),
                    dueDateLabel: formatDate(dueDate),
                    reminderType,
                    surchargePercent: LATE_SURCHARGE_PERCENT,
                    increasedAmountLabel: formatCurrency(increasedAmountCents, activeMembership.plan.currency),
                },
            });

            try {
                await sendEmail(emailMessage);
                sentCount += 1;
            } catch (error) {
                failedCount += 1;
                console.error(`Error sending payment reminder to ${student.user.email}:`, error);
            }
        }

        await writeAuditLog({
            action: "PAYMENT_REMINDER_EMAILS",
            entityType: "Payment",
            entityId: "payment-reminders",
            metadata: {
                reminderType,
                sentCount,
                failedCount,
                alreadyPaidCount,
                invalidEmailCount,
                skippedCount,
                periodMonth: selectedPeriodDate.getMonth() + 1,
                periodYear: selectedPeriodDate.getFullYear(),
            },
        });

        return {
            ok: true,
            data: {
                reminderType,
                sentCount,
                failedCount,
                alreadyPaidCount,
                invalidEmailCount,
                skippedCount,
            },
        };
    } catch (error) {
        logAdminActionError("Error sending payment reminder emails:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudieron enviar los recordatorios de pago"),
        };
    }
};
