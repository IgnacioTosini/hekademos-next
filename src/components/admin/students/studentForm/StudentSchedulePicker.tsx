import type { WeeklyClassScheduleSummary } from '@/types/schema/classes';
import type { MembershipPlan } from '@/types/schema/memberships';
import { getClassCategoryLabel } from '@/utils/class-category';
import { getScheduleTimeLabel, uppercaseDayLabels } from '@/utils/schedule';

type Props = {
    scheduleIds: string[];
    planId: string;
    selectedPlan: MembershipPlan | null;
    maxSelectedSchedules: number;
    availableWeeklySchedules: WeeklyClassScheduleSummary[];
    schedulesByDay: { dayOfWeek: WeeklyClassScheduleSummary['dayOfWeek']; schedules: WeeklyClassScheduleSummary[] }[];
    onToggleSchedule: (scheduleId: string) => void;
};

const getScheduleLabel = (schedule: WeeklyClassScheduleSummary) => {
    const coachName = schedule.coachName;
    return `${getClassCategoryLabel(schedule.classCategory)} · ${getScheduleTimeLabel(schedule)}${coachName ? ` - ${coachName}` : ''}`;
};

const getScheduleCapacityLabel = (schedule: WeeklyClassScheduleSummary, isSelected: boolean) => {
    if (schedule.capacity === null) return 'Sin cupo definido';
    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0);
    if (availableSpots <= 0 && !isSelected) return 'Completo';
    return `${availableSpots} ${availableSpots === 1 ? 'cupo libre' : 'cupos libres'}`;
};

export const StudentSchedulePicker = ({ scheduleIds, planId, selectedPlan, maxSelectedSchedules, availableWeeklySchedules, schedulesByDay, onToggleSchedule }: Props) => (
    <div className="form-group schedule-picker">
        <div className="schedule-picker-header">
            <label>Turnos elegidos</label>
            <span>{scheduleIds.length}/{maxSelectedSchedules || 0}</span>
        </div>

        <div className="schedule-options">
            {schedulesByDay.map((group) => (
                <div className="schedule-day" key={group.dayOfWeek}>
                    <strong>{uppercaseDayLabels[group.dayOfWeek]}:</strong>

                    <div className="schedule-day-options">
                        {group.schedules.map((schedule) => {
                            const isSelected = scheduleIds.includes(schedule.id);
                            const availableSpots = schedule.availableSpots ?? (
                                schedule.capacity === null
                                    ? null
                                    : Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0)
                            );
                            const isFull = availableSpots !== null && availableSpots <= 0;
                            const hasAnotherScheduleSameDay = !isSelected && scheduleIds.some((selectedScheduleId) => (
                                availableWeeklySchedules.find((selectedSchedule) => selectedSchedule.id === selectedScheduleId)?.dayOfWeek === schedule.dayOfWeek
                            ));
                            const isDisabled = !selectedPlan
                                || (!isSelected && isFull)
                                || hasAnotherScheduleSameDay
                                || (!isSelected && scheduleIds.length >= maxSelectedSchedules);

                            return (
                                <button
                                    key={schedule.id}
                                    type="button"
                                    className={`schedule-option${isSelected ? ' schedule-option-selected' : ''}${isFull ? ' schedule-option-full' : ''}`}
                                    onClick={() => onToggleSchedule(schedule.id)}
                                    disabled={isDisabled}
                                >
                                    <span>{getScheduleLabel(schedule)}</span>
                                    <small>
                                        {hasAnotherScheduleSameDay
                                            ? 'Dia ya elegido'
                                            : getScheduleCapacityLabel(schedule, isSelected)}
                                    </small>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        {!planId && (
            <p className="schedule-helper">Elegir una membresia para asignar turnos.</p>
        )}

        {selectedPlan && (
            <p className="schedule-helper">
                Mostrando solamente clases de {getClassCategoryLabel(selectedPlan.classCategory).toLowerCase()}.
            </p>
        )}

        {planId && availableWeeklySchedules.length === 0 && (
            <p className="schedule-helper">No hay turnos activos para el coach seleccionado.</p>
        )}
    </div>
);
