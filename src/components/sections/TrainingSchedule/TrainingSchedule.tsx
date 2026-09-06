import { getWeeklyClassSchedules } from '@/app/actions/class.actions'
import type { DayOfWeek, WeeklyClassScheduleSummary } from '@/types/schema/classes'
import { getClassCategoryLabel } from '@/utils/class-category'
import { dayLabels, dayOrder } from '@/utils/schedule'
import { FaClock } from 'react-icons/fa'
import './_trainingSchedule.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type ScheduleGroup = {
    category: string;
    days: string;
    sortIndex: number;
    times: string[];
};

const getScheduleGroups = (schedules: WeeklyClassScheduleSummary[]): ScheduleGroup[] => {
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
    const schedulesResponse = await getWeeklyClassSchedules();
    const scheduleGroups = schedulesResponse.ok ? getScheduleGroups(schedulesResponse.data) : [];

    return (
        <div className="trainingSchedule" id="horarios">
            <h2 className="trainingScheduleTitle animate-on-scroll">{content.title}</h2>
            <p className="trainingScheduleDescription animate-on-scroll">{content.subtitle}</p>

            <div className="trainingScheduleCards">
                {scheduleGroups.map((group) => (
                    <div className="scheduleCard stagger-card" key={`${group.category}-${group.days}`}>
                        <div className="scheduleCardHeader">
                            <span className="scheduleIcon">
                                <FaClock />
                            </span>
                            <h3>{group.category} · {group.days}</h3>
                        </div>

                        <div className="scheduleTimes" aria-label={`Horarios para ${group.days}`}>
                            {group.times.map((time) => (
                                <span className="scheduleTime" key={time}>
                                    {time}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {scheduleGroups.length === 0 && (
                    <p className="trainingScheduleEmpty">
                        {content.emptyMessage}
                    </p>
                )}
            </div>
        </div>
    )
}
