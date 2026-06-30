import type { DayOfWeek } from "@/types/schema/classes";

export const dayLabels: Record<DayOfWeek, string> = {
    MONDAY: "Lunes",
    TUESDAY: "Martes",
    WEDNESDAY: "Miércoles",
    THURSDAY: "Jueves",
    FRIDAY: "Viernes",
    SATURDAY: "Sábado",
    SUNDAY: "Domingo",
};

export const uppercaseDayLabels: Record<DayOfWeek, string> = {
    MONDAY: "LUNES",
    TUESDAY: "MARTES",
    WEDNESDAY: "MIÉRCOLES",
    THURSDAY: "JUEVES",
    FRIDAY: "VIERNES",
    SATURDAY: "SÁBADO",
    SUNDAY: "DOMINGO",
};

export const dayOrder: DayOfWeek[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

export const dayOrderIndex: Record<DayOfWeek, number> = {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 7,
};

export const addMinutesToTime = (time: string, minutesToAdd: number) => {
    const [hours, minutes] = time.split(":").map(Number);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";

    const date = new Date(2000, 0, 1, hours, minutes + minutesToAdd);

    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
