import { getCachedPublicSchedules } from '@/lib/public-home-data'
import type { DayOfWeek, WeeklyClassScheduleSummary } from '@/types/schema/classes'
import { getClassCategoryLabel } from '@/utils/class-category'
import { dayLabels, dayOrder } from '@/utils/schedule'
import { TrainingScheduleView } from './TrainingScheduleView'
import type { HomePageContent } from '@/lib/home-page-content'

export type ScheduleGroup = {
    category: string;
    days: string;
    sortIndex: number;
    times: string[];
};

export const getScheduleGroups = (schedules: WeeklyClassScheduleSummary[]): ScheduleGroup[] => {
    const categories = Array.from(new Set(schedules.map((schedule) => (
        getClassCategoryLabel(schedule.classCategory)
    )))).sort((first, second) => first.localeCompare(second));

    return categories.flatMap((category) => {
        const timesByDay = new Map<DayOfWeek, Set<string>>();

        schedules
            .filter((schedule) => getClassCategoryLabel(schedule.classCategory) === category)
            .forEach((schedule) => {
                const currentTimes = timesByDay.get(schedule.dayOfWeek) ?? new Set<string>();
                currentTimes.add(schedule.startTime);
                timesByDay.set(schedule.dayOfWeek, currentTimes);
            });

        const groupsByTimes = new Map<string, { days: DayOfWeek[]; times: string[] }>();

        dayOrder.forEach((day) => {
            const times = Array.from(timesByDay.get(day) ?? []).sort((first, second) => first.localeCompare(second));

            if (times.length === 0) return;

            const groupKey = times.join('|');
            const currentGroup = groupsByTimes.get(groupKey) ?? {
                days: [],
                times,
            };

            currentGroup.days.push(day);
            groupsByTimes.set(groupKey, currentGroup);
        });

        return Array.from(groupsByTimes.values())
            .map((group) => ({
                category,
                days: group.days.map((day) => dayLabels[day]).join(' / '),
                sortIndex: dayOrder.indexOf(group.days[0]),
                times: group.times,
            }))
            .sort((first, second) => first.sortIndex - second.sortIndex);
    });
};

type Props = { content: HomePageContent['trainingSchedule'] }

export const TrainingSchedule = async ({ content }: Props) => {
    const schedules = await getCachedPublicSchedules().catch(() => []);
    const scheduleGroups = getScheduleGroups(schedules);

    return <TrainingScheduleView content={content} scheduleGroups={scheduleGroups} />
}
