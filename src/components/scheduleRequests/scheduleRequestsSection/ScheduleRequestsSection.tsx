"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { toast } from "react-toastify";
import {
    approveScheduleChangeRequest,
    getScheduleChangeRequests,
    rejectScheduleChangeRequest,
    type ScheduleChangeRequestReviewItem,
    type ScheduleRequestsPage,
} from "@/app/actions/scheduleChangeRequest.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import { Pagination } from "@/components/ui/pagination/Pagination";
import type { ScheduleChangeRequestStatus, WeeklyClassScheduleWithRelations } from "@/types/schema/classes";
import { formatDateTime } from "@/utils/format";
import { dayOrderIndex, getScheduleLabel as getBaseScheduleLabel } from "@/utils/schedule";
import { getInitials } from "@/utils/strings";
import "./_scheduleRequestsSection.scss";

type Props = {
    errorMessage?: string | null;
    initialPage: ScheduleRequestsPage;
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
    const coachName = schedule.coach?.user?.name || schedule.coach?.user?.email || "Sin coach";

    return `${getBaseScheduleLabel(schedule)} - ${coachName}`;
};

const getCapacityLabel = (schedule: WeeklyClassScheduleWithRelations) => {
    if (schedule.capacity === null) return "Sin cupo definido";

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0);

    return `${availableSpots} ${availableSpots === 1 ? "cupo libre" : "cupos libres"}`;
};

const sortSchedules = (schedules: WeeklyClassScheduleWithRelations[]) => (
    [...schedules].sort((first, second) => (
        dayOrderIndex[first.dayOfWeek] - dayOrderIndex[second.dayOfWeek]
        || first.startTime.localeCompare(second.startTime)
    ))
);

export const ScheduleRequestsSection = ({ errorMessage, initialPage }: Props) => {
    const [modalState, setModalState] = useState<ReviewModalState | null>(null);
    const [notes, setNotes] = useState("");
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [coachFilter, setCoachFilter] = useState("ALL");
    const [pageData, setPageData] = useState(initialPage);
    const [pendingPage, setPendingPage] = useState(1);
    const [reviewedPage, setReviewedPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const firstLoad = useRef(true);
    const requestVersion = useRef(0);
    const listsRef = useRef<HTMLDivElement>(null);
    const filtersInitialized = useRef(false);
    const [isPending, startTransition] = useTransition();
    const pendingRequests = pageData.pending;
    const reviewedRequests = pageData.reviewed;
    const coachOptions = pageData.coachOptions;

    useEffect(() => {
        if (firstLoad.current) { firstLoad.current = false; return; }
        const version = ++requestVersion.current;
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            const result = await getScheduleChangeRequests({
                query, status: statusFilter, type: typeFilter, coachId: coachFilter,
                pendingPage, reviewedPage,
            });
            if (version !== requestVersion.current) return;
            if (result.ok) {
                setPageData(result.data);
                setLoadError(null);
                if (result.data.pendingPage !== pendingPage) setPendingPage(result.data.pendingPage);
                if (result.data.reviewedPage !== reviewedPage) setReviewedPage(result.data.reviewedPage);
            } else setLoadError(result.error);
            setIsLoading(false);
        }, query ? 250 : 0);
        return () => { requestVersion.current += 1; window.clearTimeout(timer); };
    }, [query, statusFilter, typeFilter, coachFilter, pendingPage, reviewedPage]);

    const refreshPage = async () => {
        const version = ++requestVersion.current;
        const result = await getScheduleChangeRequests({
            query, status: statusFilter, type: typeFilter, coachId: coachFilter,
            pendingPage, reviewedPage,
        });
        if (version !== requestVersion.current) return;
        if (result.ok) {
            setPageData(result.data);
            setLoadError(null);
            if (result.data.pendingPage !== pendingPage) setPendingPage(result.data.pendingPage);
            if (result.data.reviewedPage !== reviewedPage) setReviewedPage(result.data.reviewedPage);
        } else setLoadError(result.error);
    };

    useEffect(() => {
        if (!filtersInitialized.current) { filtersInitialized.current = true; return; }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import("@/animations/gsapConfig").then(({ gsap }) => {
            if (cancelled || !listsRef.current) return;
            const cards = listsRef.current.querySelectorAll(".schedule-request-card");
            const context = gsap.context(() => {
                gsap.fromTo(cards, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .32, stagger: .035, ease: "power2.out", clearProps: "all" });
            }, listsRef);
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [coachFilter, statusFilter, typeFilter]);

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
                void refreshPage();
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
                    <span>Creada</span>
                    <strong>{formatDateTime(request.createdAt)}</strong>
                    {request.type === "ONE_TIME" && request.requestedDate && (
                        <>
                            <span>Clase temporal</span>
                            <strong>{formatDateTime(request.requestedDate, { weekday: "long" })}</strong>
                        </>
                    )}
                    <span>Coach actual</span>
                    <strong>{studentCoach}</strong>
                    {request.reviewedAt && (
                        <>
                            <span>{request.status === "APPROVED" && !request.reviewedByUserId ? "Confirmada" : "Revisada"}</span>
                            <strong>{formatDateTime(request.reviewedAt)}</strong>
                        </>
                    )}
                </div>

                <div className="schedule-request-grid" aria-label="Comparación de horarios">
                    <div>
                        <h4>Antes · turnos actuales</h4>
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
                        <h4>Después · turnos solicitados</h4>
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
                        <span>{request.reviewedByUserId ? "Nota de revisión" : "Procesamiento"}</span>
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
                    <h1>Cambios de horario</h1>
                    <p>Los nuevos pedidos se validan y confirman automáticamente. Consultá acá el historial de cambios.</p>
                </div>

                <div className="schedule-requests-counter">
                    <FaCheck />
                    <strong>{pageData.total}</strong>
                    <span>registrados</span>
                </div>
            </div>

            {(errorMessage || loadError) && (
                <div className="schedule-requests-error">
                    {loadError || errorMessage}
                </div>
            )}

            <div className="schedule-requests-toolbar">
                <input
                    type="search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPendingPage(1); setReviewedPage(1); }}
                    placeholder="Buscar alumno, coach o turno..."
                    aria-label="Buscar cambios de horario"
                />
                <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPendingPage(1); setReviewedPage(1); }} aria-label="Filtrar por estado">
                    <option value="ALL">Todos los estados</option>
                    <option value="PENDING">Pendientes anteriores</option>
                    <option value="APPROVED">Aprobadas</option>
                    <option value="REJECTED">Rechazadas</option>
                    <option value="CANCELLED">Canceladas</option>
                </select>
                <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPendingPage(1); setReviewedPage(1); }} aria-label="Filtrar por tipo de cambio">
                    <option value="ALL">Todos los tipos</option>
                    <option value="ONE_TIME">Una clase</option>
                    <option value="PERMANENT">Permanente</option>
                </select>
                <select value={coachFilter} onChange={(event) => { setCoachFilter(event.target.value); setPendingPage(1); setReviewedPage(1); }} aria-label="Filtrar por coach">
                    <option value="ALL">Todos los coaches</option>
                    {coachOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
            </div>

            <p className="schedule-requests-results" aria-live="polite">Mostrando <strong>{pageData.filteredTotal}</strong> de {pageData.total} cambios{isLoading ? ' · Cargando...' : ''}</p>

            <div className="schedule-requests-groups" ref={listsRef}>
                {pageData.pendingCount > 0 && (
                    <div className="schedule-requests-group schedule-requests-group-pending">
                        <div className="schedule-requests-group-heading"><div><span>REVISIÓN MANUAL</span><h2>Solicitudes anteriores pendientes</h2></div><strong>{pageData.pendingCount}</strong></div>
                        <div className="schedule-requests-list">
                            {pendingRequests.map(renderRequestCard)}
                        </div>
                        <Pagination page={pendingPage} pageSize={8} totalItems={pageData.pendingCount} onPageChange={setPendingPage} label="solicitudes pendientes" />
                    </div>
                )}

                {pageData.reviewedCount > 0 && (
                    <div className="schedule-requests-group">
                        <div className="schedule-requests-group-heading"><div><span>CAMBIOS PROCESADOS</span><h2>Historial</h2></div><strong>{pageData.reviewedCount}</strong></div>
                        <div className="schedule-requests-list">
                            {reviewedRequests.map(renderRequestCard)}
                        </div>
                        <Pagination page={reviewedPage} pageSize={8} totalItems={pageData.reviewedCount} onPageChange={setReviewedPage} label="solicitudes revisadas" />
                    </div>
                )}

                {pageData.filteredTotal === 0 && !isLoading && <EmptyState title={pageData.total ? "Sin resultados" : "Sin cambios registrados"} description={pageData.total ? "No hay cambios que coincidan con los filtros." : "Los cambios de horario aparecerán acá cuando se registren."} />}
            </div>

            {modalState && (
                <div className="schedule-request-modal-backdrop">
                    <div className={`schedule-request-modal schedule-request-modal-${modalState.intent}`} role="dialog" aria-modal="true" aria-labelledby="schedule-review-title">
                        <div className="schedule-request-modal-header">
                            <div>
                                <h2 id="schedule-review-title">
                                    {modalState.intent === "approve" ? "Aprobar solicitud" : "Rechazar solicitud"}
                                </h2>
                                <p>{getStudentName(modalState.request)} · {modalState.intent === "approve" ? "se aplicará el horario solicitado" : "se mantendrá el horario actual"}</p>
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
