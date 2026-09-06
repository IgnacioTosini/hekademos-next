import type { DayOfWeek, WeeklyClassScheduleSummary } from "@/types/schema/classes";
import { getClassCategoryLabel } from "@/utils/class-category";

export type WeeklyClassScheduleSummarySource = {
    id: string;
    dayOfWeek: DayOfWeek;
    classCategory: string;
    startTime: string;
    durationMinutes: number;
    capacity: number | null;
    coachId: string | null;
    coach: {
        user: {
            name: string | null;
        };
    } | null;
    _count: {
        studentAssignments: number;
    };
};

export const toWeeklyClassScheduleSummary = (
    schedule: WeeklyClassScheduleSummarySource
): WeeklyClassScheduleSummary => {
    const occupiedSpots = schedule._count.studentAssignments;

    return {
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        classCategory: getClassCategoryLabel(schedule.classCategory),
        startTime: schedule.startTime,
        durationMinutes: schedule.durationMinutes,
        capacity: schedule.capacity,
        coachId: schedule.coachId,
        coachName: schedule.coach?.user.name ?? null,
        occupiedSpots,
        availableSpots: schedule.capacity === null
            ? null
            : Math.max(schedule.capacity - occupiedSpots, 0),
    };
};
