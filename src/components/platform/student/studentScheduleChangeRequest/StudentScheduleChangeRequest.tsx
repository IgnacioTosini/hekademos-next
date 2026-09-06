"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaExchangeAlt, FaUndoAlt } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import {
    cancelStudentOneTimeScheduleChange,
    createStudentScheduleChangeRequest,
} from "@/app/actions/profile.actions";
import type { ScheduleChangeRequestType, WeeklyClassScheduleSummary } from "@/types/schema/classes";
import type { PrismaDate } from "@/types/schema/common";
import type { AdminStudentProfile } from "@/types/schema/users";
import { getClassCategoryLabel } from "@/utils/class-category";
import { getActiveMembership } from "@/utils/membership";
import {
    dayOrder,
    getNextScheduleOccurrence,
    getOneTimeScheduleDates,
    getScheduleTimeLabel,
    uppercaseDayLabels,
} from "@/utils/schedule";
import "./_studentScheduleChangeRequest.scss";

type Props = {
    activeOneTimeChange?: {
        id: string;
        canCancel: boolean;
        cancelDisabledReason: string | null;
        sourceDate: PrismaDate;
        requestedDate: PrismaDate;
        sourceSchedule: WeeklyClassScheduleSummary;
        weeklySchedule: WeeklyClassScheduleSummary;
    } | null;
    referenceDate: PrismaDate;
    student: AdminStudentProfile;
    weeklySchedules: WeeklyClassScheduleSummary[];
};

type FormState = {
    type: ScheduleChangeRequestType;
    currentScheduleId: string;
    scheduleIds: string[];
    reason: string;
};

const getInitialScheduleIds = (student: AdminStudentProfile) => (
    student.schedules
        ?.filter((schedule) => schedule.isActive)
        .map((schedule) => schedule.weeklyScheduleId) ?? []
);

const formatOneTimeDate = (date: Date) => (
    new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).format(date)
);

const formatCompactOneTimeDate = (date: Date) => (
    new Intl.DateTimeFormat("es-AR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
    }).format(date).replace(",", "")
);

const getDatedScheduleLabel = (
    schedule: WeeklyClassScheduleSummary,
    date: Date
) => (
    `${getClassCategoryLabel(schedule.classCategory)} · ${formatOneTimeDate(date)} · ${getScheduleTimeLabel(schedule)}`
);

const getCapacityLabel = (schedule: WeeklyClassScheduleSummary, isSelected: boolean) => {
    if (isSelected) return "Elegido";
    if (schedule.capacity === null) return "Sin cupo definido";

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0);

    if (availableSpots <= 0) return "Completo";

    return `${availableSpots} ${availableSpots === 1 ? "cupo libre" : "cupos libres"}`;
};

export const StudentScheduleChangeRequest = ({
    activeOneTimeChange = null,
    referenceDate,
    student,
    weeklySchedules,
}: Props) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();
    const hasActiveOneTimeChange = !!activeOneTimeChange;
    const scheduleReferenceDate = useMemo(() => new Date(referenceDate), [referenceDate]);
    const activeMembership = getActiveMembership(student.memberships, new Date());
    const initialScheduleIds = useMemo(() => getInitialScheduleIds(student), [student]);
    const [form, setForm] = useState<FormState>({
        type: hasActiveOneTimeChange ? "PERMANENT" : "ONE_TIME",
        currentScheduleId: hasActiveOneTimeChange ? "" : initialScheduleIds[0] ?? "",
        scheduleIds: hasActiveOneTimeChange ? initialScheduleIds : [],
        reason: "",
    });
    const maxSelectedSchedules = activeMembership?.plan?.trainingDaysPerWeek ?? 0;
    const availableSchedules = useMemo(() => (
        weeklySchedules.filter((schedule) => (
            schedule.coachId === student.coachId
            && getClassCategoryLabel(schedule.classCategory) === getClassCategoryLabel(activeMembership?.plan?.classCategory)
        ))
    ), [activeMembership?.plan?.classCategory, student.coachId, weeklySchedules]);
    const currentSchedules = useMemo(() => (
        initialScheduleIds
            .map((scheduleId) => availableSchedules.find((schedule) => schedule.id === scheduleId))
            .filter((schedule): schedule is WeeklyClassScheduleSummary => !!schedule)
    ), [availableSchedules, initialScheduleIds]);
    const schedulesByDay = useMemo(() => (
        dayOrder
            .map((dayOfWeek) => ({
                dayOfWeek,
                schedules: availableSchedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek),
            }))
            .filter((group) => group.schedules.length > 0)
    ), [availableSchedules]);
    const selectedOneTimeSchedule = form.type === "ONE_TIME"
        ? availableSchedules.find((schedule) => schedule.id === form.scheduleIds[0])
        : null;
    const selectedCurrentOneTimeSchedule = form.type === "ONE_TIME"
        ? currentSchedules.find((schedule) => schedule.id === form.currentScheduleId)
        : null;
    const oneTimeDates = selectedOneTimeSchedule && selectedCurrentOneTimeSchedule
        ? getOneTimeScheduleDates(
            selectedCurrentOneTimeSchedule,
            selectedOneTimeSchedule,
            scheduleReferenceDate
        )
        : null;

    const resetForm = () => {
        setForm({
            type: hasActiveOneTimeChange ? "PERMANENT" : "ONE_TIME",
            currentScheduleId: hasActiveOneTimeChange ? "" : initialScheduleIds[0] ?? "",
            scheduleIds: hasActiveOneTimeChange ? initialScheduleIds : [],
            reason: "",
        });
        setError("");
    };

    const openModal = () => {
        resetForm();
        setIsOpen(true);
    };

    const closeModal = () => {
        resetForm();
        setIsOpen(false);
    };

    const toggleSchedule = (schedule: WeeklyClassScheduleSummary) => {
        if (!activeMembership) return;

        setForm((current) => {
            const isSelected = current.scheduleIds.includes(schedule.id);

            if (current.type === "ONE_TIME") {
                return {
                    ...current,
                    scheduleIds: isSelected ? [] : [schedule.id],
                };
            }

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
            setError("Agregá una justificación para confirmar el cambio.");
            return;
        }

        if (form.type === "ONE_TIME" && !form.currentScheduleId) {
            setError("Elegí el turno actual que querés reemplazar.");
            return;
        }

        if (form.type === "ONE_TIME" && form.scheduleIds.length !== 1) {
            setError("Elegí un único turno de reemplazo.");
            return;
        }

        startTransition(async () => {
            const result = await createStudentScheduleChangeRequest({
                type: form.type,
                currentScheduleId: form.type === "ONE_TIME" ? form.currentScheduleId : null,
                requestedScheduleIds: form.scheduleIds,
                reason: form.reason,
            });

            if (result.ok) {
                toast.success(form.type === "PERMANENT"
                    ? "Horarios actualizados automáticamente"
                    : "Cambio puntual confirmado automáticamente");
                closeModal();
                router.refresh();
                return;
            }

            setError(result.error);
            toast.error(result.error);
        });
    };

    const handleCancelOneTimeChange = () => {
        if (!activeOneTimeChange || !activeOneTimeChange.canCancel) return;

        const sourceDate = new Date(activeOneTimeChange.sourceDate);
        const requestedDate = new Date(activeOneTimeChange.requestedDate);
        const confirmed = window.confirm(
            `¿Cancelar el cambio temporal?\n\nVolvés a: ${getDatedScheduleLabel(activeOneTimeChange.sourceSchedule, sourceDate)}\nDejás: ${getDatedScheduleLabel(activeOneTimeChange.weeklySchedule, requestedDate)}`
        );

        if (!confirmed) return;

        startTransition(async () => {
            const result = await cancelStudentOneTimeScheduleChange(activeOneTimeChange.id);

            if (result.ok) {
                toast.success("Cambio temporal cancelado. Volviste a tu horario habitual.");
                setError("");
                router.refresh();
                return;
            }

            toast.error(result.error);
        });
    };

    return (
        <>
            <div className="student-schedule-change-actions">
                <button
                    className="student-schedule-change-button"
                    type="button"
                    onClick={openModal}
                    disabled={isPending}
                >
                    <FaExchangeAlt />
                    Cambiar horario
                </button>

                {activeOneTimeChange && (
                    <>
                        <button
                            className="student-schedule-cancel-button"
                            type="button"
                            onClick={handleCancelOneTimeChange}
                            disabled={isPending || !activeOneTimeChange.canCancel}
                            title={activeOneTimeChange.cancelDisabledReason ?? "Cancelar el cambio temporal"}
                        >
                            <FaUndoAlt />
                            {isPending ? "Cancelando..." : "Cancelar cambio temporal"}
                        </button>
                        {activeOneTimeChange.cancelDisabledReason && (
                            <small className="student-schedule-cancel-reason">
                                {activeOneTimeChange.cancelDisabledReason}
                            </small>
                        )}
                    </>
                )}
            </div>

            {isOpen && (
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
            )}
        </>
    );
};
