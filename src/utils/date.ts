export type MonthRange = {
    start: Date;
    end: Date;
    dueDate?: Date;
};

export const getCurrentMonthRange = (date = new Date(), dueDay?: number): MonthRange => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const dueDate = dueDay
        ? new Date(date.getFullYear(), date.getMonth(), dueDay, 23, 59, 59, 999)
        : undefined;

    return { start, end, dueDate };
};

export const isDateInRange = (
    value: Date | string | null | undefined,
    start: Date,
    end: Date
) => {
    if (!value) return false;

    const date = value instanceof Date ? value : new Date(value);

    return date >= start && date < end;
};

export const toDateInputValue = (value: Date | string | null | undefined) => {
    if (!value) return "";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
};
