import { prisma } from "@/lib/prisma";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { isDeliverableEmail } from "@/lib/form-validation";
import { sendPaymentReminderWhatsApp } from "@/lib/whatsapp";
import { getArgentinaCalendarDate } from "@/lib/payment-reminder-calendar";
import { getMembershipAmountCents } from "@/utils/membership";
import { getAmountWithLateSurcharge, PAYMENT_DUE_DAY, LATE_SURCHARGE_PERCENT, type PaymentReminderType } from "@/utils/payment";
import { formatCurrency } from "@/utils/format";
import { getStudentName } from "@/utils/student";

export type PaymentReminderResult = {
    reminderType: PaymentReminderType;
    sentCount: number;
    whatsappCount: number;
    emailCount: number;
    failedCount: number;
    alreadyPaidCount: number;
    invalidEmailCount: number;
    skippedCount: number;
    duplicateCount: number;
    incomplete: boolean;
};

// A PROCESSING record is deliberately not reclaimed automatically: the provider
// may have accepted the message before a crash. Review it before retrying.
const claimReminder = async (studentId: string, periodStart: Date, reminderType: PaymentReminderType) => {
    const key = { studentId, periodStart, reminderType };
    try {
        await prisma.paymentReminderDelivery.create({ data: key });
        return true;
    } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
        const retry = await prisma.paymentReminderDelivery.updateMany({
            where: { ...key, status: "FAILED" }, data: { status: "PROCESSING" },
        });
        return retry.count === 1;
    }
};

export const sendPaymentReminders = async ({
    year, month, reminderType = "MONTHLY", now = new Date(), budgetMs = 210_000,
}: {
    year: number; month: number; reminderType?: PaymentReminderType; now?: Date; budgetMs?: number;
}): Promise<PaymentReminderResult> => {
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12
        || !["MONTHLY", "LATE_WARNING"].includes(reminderType)) throw new Error("Periodo de recordatorio invalido");
    const deadline = Date.now() + budgetMs;
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const dueDate = new Date(Date.UTC(year, month - 1, PAYMENT_DUE_DAY + 1, 2, 59, 59, 999));
    const dueDateLabel = `${String(PAYMENT_DUE_DAY).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
    const periodLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(periodStart);
    const result: PaymentReminderResult = {
        reminderType, sentCount: 0, whatsappCount: 0, emailCount: 0, failedCount: 0,
        alreadyPaidCount: 0, invalidEmailCount: 0, skippedCount: 0, duplicateCount: 0, incomplete: false,
    };
    // Refuse test-recipient redirection for a batch of real students.
    if (["true", "1", "yes"].includes(process.env.WHATSAPP_ENABLED?.trim().toLowerCase() ?? "")
        && !["false", "0", "no"].includes(process.env.WHATSAPP_TEST_MODE?.trim().toLowerCase() ?? "")) {
        throw new Error("Los recordatorios masivos requieren WHATSAPP_TEST_MODE=false");
    }
    const membershipWhere = { status: "ACTIVE" as const, startDate: { lte: now }, OR: [{ endDate: null }, { endDate: { gte: now } }] };
    let cursor: string | undefined;
    while (true) {
        if (Date.now() >= deadline) { result.incomplete = true; break; }
        const students = await prisma.student.findMany({
            where: { user: { status: "ACTIVE" }, memberships: { some: membershipWhere } },
            orderBy: { id: "asc" }, take: 50,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            include: { user: true, memberships: { where: membershipWhere, orderBy: { createdAt: "desc" }, take: 1, include: { plan: true } } },
        });
        if (!students.length) break;
        for (let index = 0; index < students.length; index += 5) {
            if (Date.now() >= deadline) { result.incomplete = true; return result; }
            const outcomes = await Promise.allSettled(students.slice(index, index + 5).map(async (student) => {
                const membership = student.memberships[0];
                if (!membership) { result.skippedCount++; return; }
                const payment = await prisma.payment.findUnique({ where: { studentId_periodStart: { studentId: student.id, periodStart } } });
                if (payment?.status === "PAID") { result.alreadyPaidCount++; return; }
                if (!await claimReminder(student.id, periodStart, reminderType)) { result.duplicateCount++; return; }
                const where = { studentId_periodStart_reminderType: { studentId: student.id, periodStart, reminderType } };
                const name = getStudentName(student);
                const amount = getMembershipAmountCents(membership);
                const amountLabel = formatCurrency(getAmountWithLateSurcharge(amount, now > dueDate), membership.plan.currency);
                let channel: "WHATSAPP" | "EMAIL" | null = null;
                let messageId: string | null = null;
                try {
                    const whatsapp = await sendPaymentReminderWhatsApp({
                        studentName: name, studentPhone: student.user.phone, periodLabel,
                        planName: membership.plan.name, amountLabel, dueDateLabel,
                    });
                    if (whatsapp.status === "SENT") { channel = "WHATSAPP"; messageId = whatsapp.messageId; }
                } catch {
                    console.warn("Recordatorio de cuota: WhatsApp no disponible; se intentara email", { studentId: student.id });
                }
                if (!channel) {
                    if (!isDeliverableEmail(student.user.email)) {
                        result.invalidEmailCount++;
                    } else {
                        try {
                            await sendEmail(buildEmailMessage({
                                type: "PAYMENT_REMINDER", to: { email: student.user.email.trim(), name },
                                data: { name, amountLabel, dueDateLabel, reminderType, surchargePercent: LATE_SURCHARGE_PERCENT,
                                    increasedAmountLabel: formatCurrency(getAmountWithLateSurcharge(amount, true), membership.plan.currency) },
                            }));
                            channel = "EMAIL";
                        } catch {
                            console.error("Recordatorio de cuota: fallo el respaldo por email", { studentId: student.id });
                        }
                    }
                }
                // Persistence errors must not trigger a second channel after acceptance.
                await prisma.paymentReminderDelivery.update({ where, data: {
                    status: channel ? "SENT" : "FAILED", channel, messageId, sentAt: channel ? new Date() : null,
                } });
                if (channel) {
                    result.sentCount++;
                    if (channel === "WHATSAPP") result.whatsappCount++; else result.emailCount++;
                } else result.failedCount++;
            }));
            const failure = outcomes.find((outcome) => outcome.status === "rejected");
            if (failure?.status === "rejected") throw failure.reason;
        }
        cursor = students[students.length - 1].id;
        if (students.length < 50) break;
    }
    return result;
};

export const sendCurrentMonthlyPaymentReminders = (now = new Date()) => {
    const { year, month } = getArgentinaCalendarDate(now);
    return sendPaymentReminders({ year, month, now });
};
