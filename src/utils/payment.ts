import { getCurrentMonthRange, isDateInRange } from "@/utils/date";

export type PaymentReminderType = "MONTHLY" | "LATE_WARNING";

const getNumberEnv = (key: string, fallback: number) => {
    const value = Number(process.env[key]);

    return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const PAYMENT_REMINDER_DAY = getNumberEnv("PAYMENT_REMINDER_DAY", 1);
export const PAYMENT_LATE_WARNING_DAY = getNumberEnv("PAYMENT_LATE_WARNING_DAY", 9);
export const PAYMENT_DUE_DAY = getNumberEnv("PAYMENT_DUE_DAY", 10);
export const LATE_SURCHARGE_PERCENT = getNumberEnv("PAYMENT_LATE_SURCHARGE_PERCENT", 20);

export const getPaymentDueDate = (date = new Date(), dueDay = PAYMENT_DUE_DAY) => (
    new Date(date.getFullYear(), date.getMonth(), dueDay, 23, 59, 59, 999)
);

export const getPaymentMonthRange = (date = new Date(), dueDay = PAYMENT_DUE_DAY) => {
    const { start, end, dueDate } = getCurrentMonthRange(date, dueDay);

    return {
        start,
        end,
        dueDate: dueDate ?? getPaymentDueDate(date, dueDay),
    };
};

export const getPaymentForPeriod = <
    PaymentItem extends {
        dueDate: Date | string | null;
        paidAt: Date | string | null;
    }
>(
    payments: PaymentItem[] | null | undefined,
    start: Date,
    end: Date
) => {
    return payments?.find((payment) => (
        isDateInRange(payment.dueDate, start, end)
        || isDateInRange(payment.paidAt, start, end)
    )) ?? null;
};

export const shouldApplyLateSurcharge = (today: Date, dueDate: Date, status?: string | null) => {
    if (status === "PAID") return false;

    return today.getTime() > dueDate.getTime();
};

export const getAmountWithLateSurcharge = (
    amountCents: number,
    isLate: boolean,
    surchargePercent = LATE_SURCHARGE_PERCENT
) => {
    if (!isLate) return amountCents;

    return Math.round(amountCents * (1 + surchargePercent / 100));
};

export const getPaymentWindowLabel = (date = new Date(), dueDay = PAYMENT_DUE_DAY) => {
    const endDate = new Date(date.getFullYear(), date.getMonth(), dueDay);

    return `1 al ${new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "2-digit",
        year: "numeric",
    }).format(endDate)}`;
};

export const getPaymentReminderTypeForDate = (date = new Date()): PaymentReminderType | null => {
    const dayOfMonth = date.getDate();

    if (dayOfMonth === PAYMENT_REMINDER_DAY) return "MONTHLY";
    if (dayOfMonth === PAYMENT_LATE_WARNING_DAY) return "LATE_WARNING";

    return null;
};
