import type { WeeklyClassScheduleSummary } from "@/types/schema/classes";
import { getClassCategoryLabel } from "@/utils/class-category";
import { getScheduleTimeLabel } from "@/utils/schedule";

const formatOneTimeDate = (date: Date) => (
    new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(date)
);

export const formatCompactOneTimeDate = (date: Date) => (
    new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
    }).format(date).replace(",", "")
);

export const getDatedScheduleLabel = (
    schedule: WeeklyClassScheduleSummary,
    date: Date
) => (
    `${getClassCategoryLabel(schedule.classCategory)} · ${formatOneTimeDate(date)} · ${getScheduleTimeLabel(schedule)}`
);

export const getCapacityLabel = (schedule: WeeklyClassScheduleSummary, isSelected: boolean) => {
    if (isSelected) return "Elegido";
    if (schedule.capacity === null) return "Sin cupo definido";

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0);

    if (availableSpots <= 0) return "Completo";

    return `${availableSpots} ${availableSpots === 1 ? "cupo libre" : "cupos libres"}`;
};

