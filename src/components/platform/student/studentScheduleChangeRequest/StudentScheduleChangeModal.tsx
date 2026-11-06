import type { Dispatch, FormEvent, SetStateAction } from "react";
import { IoMdClose } from "react-icons/io";
import type { ScheduleChangeRequestType, WeeklyClassScheduleSummary } from "@/types/schema/classes";
import type { AdminStudentProfile } from "@/types/schema/users";
import { getClassCategoryLabel } from "@/utils/class-category";
import { getNextScheduleOccurrence, getOneTimeScheduleDates, getScheduleTimeLabel, uppercaseDayLabels } from "@/utils/schedule";
import type { FormState } from "./StudentScheduleChangeRequest";
import { formatCompactOneTimeDate, getCapacityLabel, getDatedScheduleLabel } from "./studentScheduleChangeUtils";

type Props = {
    form: FormState;
    setForm: Dispatch<SetStateAction<FormState>>;
    initialScheduleIds: string[];
    hasActiveOneTimeChange: boolean;
    currentSchedules: WeeklyClassScheduleSummary[];
    scheduleReferenceDate: Date;
    activeMembership: NonNullable<AdminStudentProfile["memberships"]>[number] | null;
    maxSelectedSchedules: number;
    schedulesByDay: { dayOfWeek: WeeklyClassScheduleSummary["dayOfWeek"]; schedules: WeeklyClassScheduleSummary[] }[];
    availableSchedules: WeeklyClassScheduleSummary[];
    oneTimeDates: ReturnType<typeof getOneTimeScheduleDates> | null;
    selectedCurrentOneTimeSchedule: WeeklyClassScheduleSummary | null | undefined;
    selectedOneTimeSchedule: WeeklyClassScheduleSummary | null | undefined;
    error: string;
    isPending: boolean;
    closeModal: () => void;
    handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
    toggleSchedule: (schedule: WeeklyClassScheduleSummary) => void;
};

export const StudentScheduleChangeModal = ({ form, setForm, initialScheduleIds, hasActiveOneTimeChange, currentSchedules, scheduleReferenceDate, activeMembership, maxSelectedSchedules, schedulesByDay, availableSchedules, oneTimeDates, selectedCurrentOneTimeSchedule, selectedOneTimeSchedule, error, isPending, closeModal, handleSubmit, toggleSchedule }: Props) => (
        <div className="student-schedule-request-container">
            <div className="student-schedule-request-modal">
                <div className="student-schedule-request-header">
                    <div>
                        <h2>Cambiar horario</h2>
                        <p>Elegí los nuevos turnos. Si cumplen las condiciones, el cambio se confirma automáticamente.</p>
                    </div>

                    <button type="button" onClick={closeModal} aria-label="Cerrar">
                        <IoMdClose />
                    </button>
                </div>

                <form className="student-schedule-request-form" onSubmit={handleSubmit}>
                    <div className="student-schedule-request-group">
                        <label htmlFor="schedule-request-type">Tipo de cambio</label>
                        <select
                            id="schedule-request-type"
                            value={form.type}
                            onChange={(event) => {
                                const type = event.target.value as ScheduleChangeRequestType;

                                setForm((current) => ({
                                    ...current,
                                    type,
                                    currentScheduleId: type === "ONE_TIME" ? initialScheduleIds[0] ?? "" : "",
                                    scheduleIds: type === "ONE_TIME" ? [] : initialScheduleIds,
                                }));
                            }}
                        >
                            <option value="ONE_TIME" disabled={hasActiveOneTimeChange}>
                                {hasActiveOneTimeChange ? "Solo por esta clase (ya tenés uno activo)" : "Solo por esta clase"}
                            </option>
                            <option value="PERMANENT">Quiero cambiar permanentemente</option>
                        </select>
                        <p>
                            {form.type === "PERMANENT"
                                ? "Tus turnos fijos se actualizan en el momento, sin revisión del entrenador."
                                : "Se confirma en el momento y no modifica tus horarios fijos."}
                        </p>
                    </div>

                    {form.type === "ONE_TIME" && (
                        <div className="student-schedule-request-group">
                            <label htmlFor="schedule-request-current">Turno que querés cambiar</label>
                            <select
                                id="schedule-request-current"
                                value={form.currentScheduleId}
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    currentScheduleId: event.target.value,
                                    scheduleIds: current.scheduleIds.filter((scheduleId) => scheduleId !== event.target.value),
                                }))}
                                required
                            >
                                <option value="">Elegí tu turno actual</option>
                                {currentSchedules.map((schedule) => {
                                    const occurrence = getNextScheduleOccurrence(schedule, scheduleReferenceDate);

                                    return (
                                        <option key={schedule.id} value={schedule.id}>
                                            {getDatedScheduleLabel(schedule, occurrence)}
                                        </option>
                                    );
                                })}
                            </select>
                            <p>Solamente este turno será reemplazado para la próxima clase.</p>
                        </div>
                    )}

                    <div className="student-schedule-request-group">
                        <div className="student-schedule-request-row">
                            <label>
                                {form.type === "ONE_TIME" ? "Turno de reemplazo" : "Nuevos turnos fijos"}
                                {activeMembership?.plan && ` · ${getClassCategoryLabel(activeMembership.plan.classCategory)}`}
                            </label>
                            <span>{form.scheduleIds.length}/{form.type === "ONE_TIME" ? 1 : maxSelectedSchedules || 0}</span>
                        </div>

                        {!activeMembership && (
                            <p className="student-schedule-request-helper">Necesitás una membresía activa para pedir cambios de turnos.</p>
                        )}

                        {activeMembership && schedulesByDay.length === 0 && (
                            <p className="student-schedule-request-helper">
                                No hay turnos activos de {getClassCategoryLabel(activeMembership.plan!.classCategory).toLowerCase()} para tu coach asignado.
                            </p>
                        )}

                        {activeMembership && schedulesByDay.length > 0 && (
                            <div className="student-schedule-request-options">
                                {schedulesByDay.map((group) => (
                                    <div className="student-schedule-request-day" key={group.dayOfWeek}>
                                        <strong>{uppercaseDayLabels[group.dayOfWeek]}:</strong>

                                        <div className="student-schedule-request-day-options">
                                            {group.schedules.map((schedule) => {
                                                const isSelected = form.scheduleIds.includes(schedule.id);
                                                const availableSpots = schedule.availableSpots ?? (
                                                    schedule.capacity === null
                                                        ? null
                                                        : Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0)
                                                );
                                                const isFull = availableSpots !== null && availableSpots <= 0;
                                                const isCurrentOneTimeSchedule = form.type === "ONE_TIME"
                                                    && form.currentScheduleId === schedule.id;
                                                const isExistingFixedSchedule = form.type === "ONE_TIME"
                                                    && initialScheduleIds.includes(schedule.id);
                                                const hasSameDay = form.type === "PERMANENT" && !isSelected && form.scheduleIds.some((scheduleId) => (
                                                    availableSchedules.find((availableSchedule) => availableSchedule.id === scheduleId)?.dayOfWeek === schedule.dayOfWeek
                                                ));
                                                const isDisabled = isExistingFixedSchedule
                                                    || (!isSelected && isFull)
                                                    || hasSameDay
                                                    || (form.type === "PERMANENT" && !isSelected && form.scheduleIds.length >= maxSelectedSchedules);
                                                const occurrence = form.type === "ONE_TIME"
                                                    ? getNextScheduleOccurrence(schedule, scheduleReferenceDate)
                                                    : null;

                                                return (
                                                    <button
                                                        key={schedule.id}
                                                        type="button"
                                                        className={`student-schedule-request-option${isSelected ? " student-schedule-request-option-selected" : ""}${isFull ? " student-schedule-request-option-full" : ""}`}
                                                        onClick={() => toggleSchedule(schedule)}
                                                        disabled={isDisabled}
                                                    >
                                                        <span>
                                                            {occurrence && <em>{formatCompactOneTimeDate(occurrence)}</em>}
                                                            {getScheduleTimeLabel(schedule)}
                                                        </span>
                                                        <small>
                                                            {isCurrentOneTimeSchedule
                                                                ? "Turno actual"
                                                                : isExistingFixedSchedule
                                                                    ? "Ya es un turno fijo"
                                                                    : hasSameDay
                                                                        ? "Día ya elegido"
                                                                        : getCapacityLabel(schedule, isSelected)}
                                                        </small>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {form.type === "ONE_TIME" && oneTimeDates && selectedCurrentOneTimeSchedule && selectedOneTimeSchedule && (
                            <div className="student-schedule-request-summary">
                                <strong>Confirmá que las fechas sean correctas</strong>
                                <dl>
                                    <div>
                                        <dt>Horario habitual</dt>
                                        <dd>{getDatedScheduleLabel(selectedCurrentOneTimeSchedule, oneTimeDates.sourceDate)}</dd>
                                    </div>
                                    <div>
                                        <dt>Nuevo horario</dt>
                                        <dd>{getDatedScheduleLabel(selectedOneTimeSchedule, oneTimeDates.requestedDate)}</dd>
                                    </div>
                                </dl>
                                <p>El cambio se aplica solamente a estas clases. Después volvés automáticamente a tu horario habitual.</p>
                            </div>
                        )}
                    </div>

                    <div className="student-schedule-request-group">
                        <label htmlFor="schedule-request-reason">Justificación</label>
                        <textarea
                            id="schedule-request-reason"
                            value={form.reason}
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                reason: event.target.value,
                            }))}
                            placeholder="Ej: esta semana no puedo asistir en mi horario habitual por..."
                            rows={4}
                            required
                        />
                    </div>

                    {error && <p className="student-schedule-request-error">{error}</p>}

                    <div className="student-schedule-request-actions">
                        <button type="button" onClick={closeModal} disabled={isPending}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={isPending || !activeMembership}>
                            {isPending ? "Confirmando..." : "Confirmar cambio"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
);
