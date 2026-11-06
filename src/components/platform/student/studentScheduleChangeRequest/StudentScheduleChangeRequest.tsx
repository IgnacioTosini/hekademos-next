"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FaExchangeAlt, FaUndoAlt } from "react-icons/fa";
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
    getOneTimeScheduleDates,
} from "@/utils/schedule";
import { StudentScheduleChangeModal } from "./StudentScheduleChangeModal";
import { getDatedScheduleLabel } from "./studentScheduleChangeUtils";
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

export type FormState = {
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
                <StudentScheduleChangeModal
                    form={form}
                    setForm={setForm}
                    initialScheduleIds={initialScheduleIds}
                    hasActiveOneTimeChange={hasActiveOneTimeChange}
                    currentSchedules={currentSchedules}
                    scheduleReferenceDate={scheduleReferenceDate}
                    activeMembership={activeMembership}
                    maxSelectedSchedules={maxSelectedSchedules}
                    schedulesByDay={schedulesByDay}
                    availableSchedules={availableSchedules}
                    oneTimeDates={oneTimeDates}
                    selectedCurrentOneTimeSchedule={selectedCurrentOneTimeSchedule}
                    selectedOneTimeSchedule={selectedOneTimeSchedule}
                    error={error}
                    isPending={isPending}
                    closeModal={closeModal}
                    handleSubmit={handleSubmit}
                    toggleSchedule={toggleSchedule}
                />
            )}
        </>
    );
};
