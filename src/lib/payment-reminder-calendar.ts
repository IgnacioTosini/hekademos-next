export const getArgentinaCalendarDate = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric", month: "numeric", day: "numeric",
    }).formatToParts(date);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: value("year"), month: value("month"), day: value("day") };
};

export const paymentRemindersEnabled = () => (
    ["true", "1", "yes"].includes(process.env.PAYMENT_REMINDERS_ENABLED?.trim().toLowerCase() ?? "")
);
