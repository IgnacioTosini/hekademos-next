"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { FaCheck, FaClock, FaTimes } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import {
    approveScheduleChangeRequest,
    rejectScheduleChangeRequest,
    type ScheduleChangeRequestReviewItem,
} from "@/app/actions/scheduleChangeRequest.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import type { ScheduleChangeRequestStatus, WeeklyClassScheduleWithRelations } from "@/types/schema/classes";
import { formatDateTime } from "@/utils/format";
import { addMinutesToTime, dayLabels, dayOrderIndex } from "@/utils/schedule";
import { getInitials } from "@/utils/strings";
import "./_scheduleRequestsSection.scss";

type Props = {
    errorMessage?: string | null;
    requests: ScheduleChangeRequestReviewItem[];
};

type ReviewModalState = {
    intent: "approve" | "reject";
    request: ScheduleChangeRequestReviewItem;
};

const requestTypeLabels = {
    ONE_TIME: "Solo por esta clase",
    PERMANENT: "Cambio permanente",
};

const statusLabels: Record<ScheduleChangeRequestStatus, string> = {
    APPROVED: "Aprobada",
    CANCELLED: "Cancelada",
    PENDING: "Pendiente",
    REJECTED: "Rechazada",
};

const getStudentName = (request: ScheduleChangeRequestReviewItem) => {
    const student = request.student;
    const fullName = [student?.firstName, student?.lastName].filter(Boolean).join(" ");

    return fullName || student?.user.name || student?.user.email || "Alumno";
};

const getScheduleLabel = (schedule: WeeklyClassScheduleWithRelations) => {
    const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);
    const coachName = schedule.coach?.user?.name || schedule.coach?.user?.email || "Sin coach";

    return `${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endsAt ? ` a ${endsAt}` : ""} - ${coachName}`;
};

const getCapacityLabel = (schedule: WeeklyClassScheduleWithRelations) => {
    if (schedule.capacity === null) return "Sin cupo definido";

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0);

    return `${availableSpots} ${availableSpots === 1 ? "cupo libre" : "cupos libres"}`;
};

const sortRequests = (requests: ScheduleChangeRequestReviewItem[]) => (
    [...requests].sort((first, second) => (
        Number(new Date(second.createdAt)) - Number(new Date(first.createdAt))
    ))
);

const sortSchedules = (schedules: WeeklyClassScheduleWithRelations[]) => (
    [...schedules].sort((first, second) => (
        dayOrderIndex[first.dayOfWeek] - dayOrderIndex[second.dayOfWeek]
        || first.startTime.localeCompare(second.startTime)
    ))
);

export const ScheduleRequestsSection = ({ errorMessage, requests }: Props) => {
    const [modalState, setModalState] = useState<ReviewModalState | null>(null);
    const [notes, setNotes] = useState("");
    const [query, setQuery] = useState("");
    const [isPending, startTransition] = useTransition();
    const normalizedQuery = query.trim().toLowerCase();
    const filteredRequests = useMemo(() => (
        normalizedQuery
            ? requests.filter((request) => {
                const studentName = getStudentName(request);
                const values = [
                    studentName,
                    request.student?.user.email,
                    request.student?.coach?.user?.name,
                    request.reason,
                    request.reviewNotes,
                    requestTypeLabels[request.type],
                    statusLabels[request.status],
                    ...request.requestedSchedules.map(getScheduleLabel),
                ];

                return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
            })
            : requests
    ), [normalizedQuery, requests]);
    const pendingRequests = sortRequests(filteredRequests.filter((request) => request.status === "PENDING"));
    const reviewedRequests = sortRequests(filteredRequests.filter((request) => request.status !== "PENDING"));

    const openModal = (intent: ReviewModalState["intent"], request: ScheduleChangeRequestReviewItem) => {
        setModalState({
            intent,
            request,
        });
        setNotes("");
    };

    const closeModal = () => {
        setModalState(null);
        setNotes("");
    };

    const handleReviewSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!modalState) return;

        startTransition(async () => {
            const action = modalState.intent === "approve"
                ? approveScheduleChangeRequest
                : rejectScheduleChangeRequest;
            const result = await action({
                requestId: modalState.request.id,
                notes,
            });

            if (result.ok) {
                toast.success(modalState.intent === "approve" ? "Solicitud aprobada" : "Solicitud rechazada");
                closeModal();
                return;
            }

            toast.error(result.error);
        });
    };

    const renderRequestCard = (request: ScheduleChangeRequestReviewItem) => {
        const studentName = getStudentName(request);
        const studentEmail = request.student?.user.email ?? "-";
        const studentCoach = request.student?.coach?.user?.name || request.student?.coach?.user?.email || "Sin coach asignado";
        const statusClass = request.status.toLowerCase();

        return (
            <article className="schedule-request-card" key={request.id}>
                <div className="schedule-request-card-header">
                    <div className="schedule-request-student">
                        <span className="schedule-request-avatar">
                            {getInitials(studentName)}
                        </span>
                        <div>
                            <h3>{studentName}</h3>
                            <p>{studentEmail}</p>
                        </div>
                    </div>

                    <div className="schedule-request-badges">
                        <span className={`schedule-request-status schedule-request-status-${statusClass}`}>
                            {statusLabels[request.status]}
                        </span>
                        <span>{requestTypeLabels[request.type]}</span>
                    </div>
                </div>

                <div className="schedule-request-meta">
                    <span>Coach actual</span>
                    <strong>{studentCoach}</strong>
                    <span>Creada</span>
                    <strong>{formatDateTime(request.createdAt)}</strong>
                    {request.reviewedAt && (
                        <>
                            <span>Revisada</span>
                            <strong>{formatDateTime(request.reviewedAt)}</strong>
                        </>
                    )}
                </div>

                <div className="schedule-request-grid">
                    <div>
                        <h4>Turnos actuales</h4>
                        <ul>
                            {sortSchedules(request.currentSchedules).length > 0 ? (
                                sortSchedules(request.currentSchedules).map((schedule) => (
                                    <li key={schedule.id}>{getScheduleLabel(schedule)}</li>
                                ))
                            ) : (
                                <li>Sin turnos asignados</li>
                            )}
                        </ul>
                    </div>

                    <div>
                        <h4>Turnos solicitados</h4>
                        <ul>
                            {sortSchedules(request.requestedSchedules).map((schedule) => (
                                <li key={schedule.id}>
                                    <span>{getScheduleLabel(schedule)}</span>
                                    <small>{getCapacityLabel(schedule)}</small>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="schedule-request-note">
                    <span>Justificación</span>
                    <p>{request.reason}</p>
                </div>

                {request.reviewNotes && (
                    <div className="schedule-request-note">
                        <span>Nota de revisión</span>
                        <p>{request.reviewNotes}</p>
                    </div>
                )}

                {request.status === "PENDING" && (
                    <div className="schedule-request-actions">
                        <button type="button" onClick={() => openModal("reject", request)}>
                            <FaTimes />
                            Rechazar
                        </button>
                        <button type="button" onClick={() => openModal("approve", request)}>
                            <FaCheck />
                            Aprobar
                        </button>
                    </div>
                )}
            </article>
        );
    };

    return (
        <section className="schedule-requests-section">
            <div className="schedule-requests-header">
                <div>
                    <h1>Solicitudes de horario</h1>
                    <p>Revisá pedidos de cambio de horario y respondé al alumno desde el panel administrativo.</p>
                </div>

                <div className="schedule-requests-counter">
                    <FaClock />
                    <strong>{pendingRequests.length}</strong>
                    <span>pendientes</span>
                </div>
            </div>

            {errorMessage && (
                <div className="schedule-requests-error">
                    {errorMessage}
                </div>
            )}

            <div className="schedule-requests-toolbar">
                <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar alumno, coach o turno..."
                />
            </div>

            <div className="schedule-requests-group">
                <h2>Pendientes</h2>
                {pendingRequests.length > 0 ? (
                    <div className="schedule-requests-list">
                        {pendingRequests.map(renderRequestCard)}
                    </div>
                ) : (
                    <EmptyState
                        title="Sin solicitudes pendientes"
                        description="Cuando un alumno pida cambiar horario, va a aparecer acá."
                    />
                )}
            </div>

            <div className="schedule-requests-group">
                <h2>Historial reciente</h2>
                {reviewedRequests.length > 0 ? (
                    <div className="schedule-requests-list">
                        {reviewedRequests.map(renderRequestCard)}
                    </div>
                ) : (
                    <EmptyState
                        title="Sin historial"
                        description="Todavía no hay solicitudes aprobadas o rechazadas."
                    />
                )}
            </div>

            {modalState && (
                <div className="schedule-request-modal-backdrop">
                    <div className="schedule-request-modal">
                        <div className="schedule-request-modal-header">
                            <div>
                                <h2>
                                    {modalState.intent === "approve" ? "Aprobar solicitud" : "Rechazar solicitud"}
                                </h2>
                                <p>{getStudentName(modalState.request)}</p>
                            </div>

                            <button type="button" onClick={closeModal} aria-label="Cerrar">
                                <IoMdClose />
                            </button>
                        </div>

                        <form onSubmit={handleReviewSubmit}>
                            <label htmlFor="schedule-request-review-notes">Nota interna</label>
                            <textarea
                                id="schedule-request-review-notes"
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder="Ej: aprobado por cupo disponible en el turno de..."
                                rows={4}
                            />

                            <div className="schedule-request-modal-actions">
                                <button type="button" onClick={closeModal} disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending}>
                                    {isPending
                                        ? "Guardando..."
                                        : modalState.intent === "approve"
                                            ? "Aprobar"
                                            : "Rechazar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};
