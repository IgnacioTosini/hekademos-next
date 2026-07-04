import { getWeeklyClassSchedules } from '@/app/actions/class.actions'
import type { DayOfWeek, WeeklyClassScheduleWithRelations } from '@/types/schema/classes'
import { dayLabels, dayOrder } from '@/utils/schedule'
import { FaClock } from 'react-icons/fa'
import './_trainingSchedule.scss'

type ScheduleGroup = {
    days: string;
    sortIndex: number;
    times: string[];
};

const getScheduleGroups = (schedules: WeeklyClassScheduleWithRelations[]): ScheduleGroup[] => {
    const timesByDay = new Map<DayOfWeek, Set<string>>();

    schedules.forEach((schedule) => {
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
            days: group.days.map((day) => dayLabels[day]).join(' / '),
            sortIndex: dayOrder.indexOf(group.days[0]),
            times: group.times,
        }))
        .sort((first, second) => first.sortIndex - second.sortIndex);
};

export const TrainingSchedule = async () => {
    const schedulesResponse = await getWeeklyClassSchedules();
    const scheduleGroups = schedulesResponse.ok ? getScheduleGroups(schedulesResponse.data) : [];

    return (
        <div className="trainingSchedule" id="horarios">
            <h2 className="trainingScheduleTitle animate-on-scroll">Horarios de entrenamiento</h2>
            <p className="trainingScheduleDescription animate-on-scroll">
                Elegí el turno que mejor acompaña tu rutina y sostené tu práctica con constancia.
            </p>

            <div className="trainingScheduleCards">
                {scheduleGroups.map((group) => (
                    <div className="scheduleCard stagger-card" key={group.days}>
                        <div className="scheduleCardHeader">
                            <span className="scheduleIcon">
                                <FaClock />
                            </span>
                            <h3>{group.days}</h3>
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
                        Por ahora no hay horarios disponibles. Escribinos y te contamos los turnos vigentes.
                    </p>
                )}
            </div>
        </div>
    )
}
