"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import { createStudentScheduleChangeRequest } from "@/app/actions/profile.actions";
import type { ScheduleChangeRequestType, WeeklyClassScheduleWithRelations } from "@/types/schema/classes";
import type { AdminStudentProfile } from "@/types/schema/users";
import { getActiveMembership } from "@/utils/membership";
import { addMinutesToTime, dayOrder, uppercaseDayLabels } from "@/utils/schedule";
import "./_studentScheduleChangeRequest.scss";

type Props = {
    student: AdminStudentProfile;
    weeklySchedules: WeeklyClassScheduleWithRelations[];
};

type FormState = {
    type: ScheduleChangeRequestType;
    scheduleIds: string[];
    reason: string;
};

const getInitialScheduleIds = (student: AdminStudentProfile) => (
    student.schedules
        ?.filter((schedule) => schedule.isActive)
        .map((schedule) => schedule.weeklyScheduleId) ?? []
);

const getScheduleLabel = (schedule: WeeklyClassScheduleWithRelations) => {
    const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

    return `${schedule.startTime}${endsAt ? ` a ${endsAt}` : ""}`;
};

const getCapacityLabel = (schedule: WeeklyClassScheduleWithRelations, isSelected: boolean) => {
    if (isSelected) return "Elegido";
    if (schedule.capacity === null) return "Sin cupo definido";

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0);

    if (availableSpots <= 0) return "Completo";

    return `${availableSpots} ${availableSpots === 1 ? "cupo libre" : "cupos libres"}`;
};

export const StudentScheduleChangeRequest = ({ student, weeklySchedules }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();
    const activeMembership = getActiveMembership(student.memberships, new Date());
    const initialScheduleIds = useMemo(() => getInitialScheduleIds(student), [student]);
    const [form, setForm] = useState<FormState>({
        type: "ONE_TIME",
        scheduleIds: initialScheduleIds,
        reason: "",
    });
    const maxSelectedSchedules = activeMembership?.plan?.trainingDaysPerWeek ?? 0;
    const availableSchedules = useMemo(() => (
        weeklySchedules.filter((schedule) => schedule.coachId === student.coachId)
    ), [student.coachId, weeklySchedules]);
    const schedulesByDay = useMemo(() => (
        dayOrder
            .map((dayOfWeek) => ({
                dayOfWeek,
                schedules: availableSchedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek),
            }))
            .filter((group) => group.schedules.length > 0)
    ), [availableSchedules]);

    const resetForm = () => {
        setForm({
            type: "ONE_TIME",
            scheduleIds: initialScheduleIds,
            reason: "",
        });
        setError("");
    };

    const closeModal = () => {
        resetForm();
        setIsOpen(false);
    };

    const toggleSchedule = (schedule: WeeklyClassScheduleWithRelations) => {
        if (!activeMembership) return;

        setForm((current) => {
            const isSelected = current.scheduleIds.includes(schedule.id);

            if (isSelected) {
                return {
                    ...current,
                    scheduleIds: current.scheduleIds.filter((scheduleId) => scheduleId !== schedule.id),
                };
            }

            const hasSameDay = current.scheduleIds.some((scheduleId) => (
                availableSchedules.find((availableSchedule) => availableSchedule.id === scheduleId)?.dayOfWeek === schedule.dayOfWeek
            ));

            if (hasSameDay || current.scheduleIds.length >= maxSelectedSchedules) return current;

            return {
                ...current,
                scheduleIds: [...current.scheduleIds, schedule.id],
            };
        });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!form.reason.trim()) {
            setError("Agregá una justificación para solicitar el cambio.");
            return;
        }

        startTransition(async () => {
            const result = await createStudentScheduleChangeRequest({
                type: form.type,
                requestedScheduleIds: form.scheduleIds,
                reason: form.reason,
            });

            if (result.ok) {
                toast.success("Solicitud de horario enviada");
                closeModal();
                return;
            }

            setError(result.error);
            toast.error(result.error);
        });
    };

    return (
        <>
            <button
                className="student-schedule-change-button"
                type="button"
                onClick={() => setIsOpen(true)}
            >
                <FaExchangeAlt />
                Solicitar cambio
            </button>

            {isOpen && (
                <div className="student-schedule-request-container">
                    <div className="student-schedule-request-modal">
                        <div className="student-schedule-request-header">
                            <div>
                                <h2>Solicitar cambio de horario</h2>
                                <p>Elegí los nuevos turnos y contanos por qué necesitás el cambio.</p>
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
                                    onChange={(event) => setForm((current) => ({
                                        ...current,
                                        type: event.target.value as ScheduleChangeRequestType,
                                    }))}
                                >
                                    <option value="ONE_TIME">Solo por esta clase</option>
                                    <option value="PERMANENT">Quiero cambiar permanentemente</option>
                                </select>
                                <p>
                                    {form.type === "PERMANENT"
                                        ? "Este cambio queda pendiente hasta que tu entrenador lo apruebe."
                                        : "Este pedido no modifica tus horarios fijos."}
                                </p>
                            </div>

                            <div className="student-schedule-request-group">
                                <div className="student-schedule-request-row">
                                    <label>Turnos solicitados</label>
                                    <span>{form.scheduleIds.length}/{maxSelectedSchedules || 0}</span>
                                </div>

                                {!activeMembership && (
                                    <p className="student-schedule-request-helper">Necesitás una membresía activa para pedir cambios de turnos.</p>
                                )}

                                {activeMembership && schedulesByDay.length === 0 && (
                                    <p className="student-schedule-request-helper">No hay turnos activos para tu coach asignado.</p>
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
                                                        const hasSameDay = !isSelected && form.scheduleIds.some((scheduleId) => (
                                                            availableSchedules.find((availableSchedule) => availableSchedule.id === scheduleId)?.dayOfWeek === schedule.dayOfWeek
                                                        ));
                                                        const isDisabled = (!isSelected && isFull)
                                                            || hasSameDay
                                                            || (!isSelected && form.scheduleIds.length >= maxSelectedSchedules);

                                                        return (
                                                            <button
                                                                key={schedule.id}
                                                                type="button"
                                                                className={`student-schedule-request-option${isSelected ? " student-schedule-request-option-selected" : ""}${isFull ? " student-schedule-request-option-full" : ""}`}
                                                                onClick={() => toggleSchedule(schedule)}
                                                                disabled={isDisabled}
                                                            >
                                                                <span>{getScheduleLabel(schedule)}</span>
                                                                <small>
                                                                    {hasSameDay
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
                                    {isPending ? "Enviando..." : "Enviar solicitud"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
