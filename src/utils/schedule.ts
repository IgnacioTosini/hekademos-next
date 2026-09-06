import type { DayOfWeek } from "@/types/schema/classes";
import { getClassCategoryLabel } from "@/utils/class-category";

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

export const calendarDayIndex: Record<DayOfWeek, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
};

export const getNextScheduleOccurrence = (
    schedule: Pick<{ dayOfWeek: DayOfWeek; startTime: string }, "dayOfWeek" | "startTime">,
    from = new Date()
) => {
    const targetDay = calendarDayIndex[schedule.dayOfWeek];
    const [hours, minutes] = schedule.startTime.split(":").map(Number);
    let daysAhead = (targetDay - from.getDay() + 7) % 7;
    const occurrence = new Date(
        from.getFullYear(),
        from.getMonth(),
        from.getDate() + daysAhead,
        Number.isFinite(hours) ? hours : 0,
        Number.isFinite(minutes) ? minutes : 0,
        0,
        0
    );

    if (daysAhead === 0 && occurrence <= from) {
        daysAhead = 7;
        occurrence.setDate(occurrence.getDate() + daysAhead);
    }

    return occurrence;
};

export const getOneTimeScheduleDates = (
    sourceSchedule: Pick<{ dayOfWeek: DayOfWeek; startTime: string }, "dayOfWeek" | "startTime">,
    targetSchedule: Pick<{ dayOfWeek: DayOfWeek; startTime: string }, "dayOfWeek" | "startTime">,
    from = new Date()
) => {
    const sourceDate = getNextScheduleOccurrence(sourceSchedule, from);
    const requestedDate = getNextScheduleOccurrence(targetSchedule, from);

    return {
        sourceDate,
        requestedDate,
    };
};

export const getLocalDayRange = (date: Date) => ({
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
});

export const addMinutesToTime = (time: string, minutesToAdd: number) => {
    const [hours, minutes] = time.split(":").map(Number);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";

    const date = new Date(2000, 0, 1, hours, minutes + minutesToAdd);

    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

type ScheduleLabelInput = {
    dayOfWeek: DayOfWeek;
    classCategory: string;
    startTime: string;
    durationMinutes: number;
};

export const getScheduleTimeLabel = (
    schedule: Pick<ScheduleLabelInput, "startTime" | "durationMinutes">
) => {
    const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

    return `${schedule.startTime}${endsAt ? ` a ${endsAt}` : ""}`;
};

export const getScheduleLabel = (schedule: ScheduleLabelInput) => (
    `${getClassCategoryLabel(schedule.classCategory)} · ${dayLabels[schedule.dayOfWeek]} ${getScheduleTimeLabel(schedule)}`
);
