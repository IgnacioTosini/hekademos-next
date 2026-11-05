"use client";

import { useEffect, useRef, useState } from "react";
import { getAuditLogs, type AuditLog, type AuditLogPage } from "@/app/actions/audit.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import { Pagination } from "@/components/ui/pagination/Pagination";
import { auditActionLabels, auditEntityLabels } from "@/lib/audit-labels";
import { formatCurrency } from "@/utils/format";
import "./_auditSection.scss";

type Props = {
    initialPage: AuditLogPage;
};

type ActionFilter = "all" | "payments" | "attendance" | "students" | "community" | "content" | "whatsapp";
type ActorFilter = "all" | "ADMIN" | "COACH" | "STUDENT";

const roleLabels = {
    ADMIN: "Admin",
    COACH: "Coach",
    STUDENT: "Alumno",
};

const getActionLabel = (action: string) => auditActionLabels[action] ?? "Acción registrada";

const monthLabels = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
];

const attendanceStatusLabels: Record<string, string> = {
    PRESENT: "presente",
    ABSENT: "ausente",
    LATE: "tarde",
    EXCUSED: "justificado",
};

const formatDate = (value: Date | string) => {
    const date = new Date(value);
    const day = new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
    const time = new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);

    return `${day} ${time}`;
};

const getMetadataRecord = (metadata: unknown): Record<string, unknown> => {
    if (!metadata) return {};

    if (typeof metadata === "string") {
        try {
            const parsed = JSON.parse(metadata) as unknown;
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed as Record<string, unknown>
                : {};
        } catch {
            return {};
        }
    }

    return typeof metadata === "object" && !Array.isArray(metadata)
        ? metadata as Record<string, unknown>
        : {};
};

const getString = (metadata: Record<string, unknown>, key: string) => {
    const value = metadata[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getNumber = (metadata: Record<string, unknown>, key: string) => {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
    return null;
};

const formatPeriod = (metadata: Record<string, unknown>) => {
    const month = getNumber(metadata, "periodMonth");
    const year = getNumber(metadata, "periodYear");

    if (!month || !year) return "el periodo seleccionado";

    return `${monthLabels[month - 1] ?? "mes"} ${year}`;
};

const formatMetadataDate = (metadata: Record<string, unknown>) => {
    const value = getString(metadata, "date");
    if (!value) return null;

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
    }).format(new Date(value));
};

const getAuditSummary = (log: AuditLog) => {
    const metadata = getMetadataRecord(log.metadata);
    const period = formatPeriod(metadata);
    const email = getString(metadata, "email");
    const reference = getString(metadata, "reference");
    const amountCents = getNumber(metadata, "amountCents");
    const amountText = amountCents ? ` por ${formatCurrency(amountCents)}` : "";

    if (log.action === "PAYMENT_MARK_PAID") {
        return `Se marcó como pagado ${period}${amountText}.`;
    }

    if (log.action === "PAYMENT_MARK_PENDING") {
        return `Se dejó pendiente el pago de ${period}.`;
    }

    if (log.action === "PAYMENT_DETAILS_UPDATE") {
        const details = [
            reference ? `Referencia: ${reference}` : null,
            metadata.hasNotes ? "Con notas internas" : null,
        ].filter(Boolean);

        return `Se actualizaron los datos del pago de ${period}${details.length ? `. ${details.join(". ")}.` : "."}`;
    }

    if (log.action === "PAYMENT_REMINDER_EMAILS" || log.action === "PAYMENT_REMINDERS") {
        const sentCount = getNumber(metadata, "sentCount") ?? 0;
        const failedCount = getNumber(metadata, "failedCount") ?? 0;
        const alreadyPaidCount = getNumber(metadata, "alreadyPaidCount") ?? 0;
        const invalidEmailCount = getNumber(metadata, "invalidEmailCount") ?? 0;
        const skippedCount = getNumber(metadata, "skippedCount") ?? 0;
        const reminderType = getString(metadata, "reminderType");
        const reminderLabel = reminderType === "LATE_WARNING" ? "aviso de vencimiento" : "recordatorio mensual";
        const details = [
            failedCount ? `${failedCount} fallaron` : null,
            invalidEmailCount ? `${invalidEmailCount} con email inválido` : null,
            alreadyPaidCount ? `${alreadyPaidCount} ya pagados` : null,
            skippedCount ? `${skippedCount} omitidos` : null,
        ].filter(Boolean);

        return `Se enviaron ${sentCount} mails de ${reminderLabel} para ${period}${details.length ? ` (${details.join(", ")})` : ""}.`;
    }

    if (log.action === "ATTENDANCE_MARK_COACH" || log.action === "ATTENDANCE_MARK_ADMIN") {
        const status = getString(metadata, "status");
        const statusLabel = status ? attendanceStatusLabels[status] ?? status.toLowerCase() : "registrada";
        const dateText = formatMetadataDate(metadata);

        return `Se marcó la asistencia como ${statusLabel}${dateText ? ` para ${dateText}` : ""}.`;
    }

    if (log.action === "SCHEDULE_CHANGE_REQUEST_CREATE") {
        const type = getString(metadata, "type");
        const typeLabel = type === "PERMANENT" ? "cambio permanente" : "cambio por una clase";
        const notificationStatus = getString(metadata, "notificationStatus");
        const notificationText = notificationStatus === "SENT"
            ? " Se notificó por email."
            : notificationStatus === "PARTIAL_FAILED"
                ? " Algunos avisos por email fallaron."
                : notificationStatus === "FAILED"
                    ? " No se pudo enviar el aviso por email."
                    : notificationStatus === "SKIPPED_NO_RECIPIENT"
                        ? " No había destinatario válido para avisar por email."
                        : "";

        return `Se solicitó un ${typeLabel} de horario.${notificationText}`;
    }

    if (log.action === "SCHEDULE_CHANGE_REQUEST_AUTO_APPROVE") {
        const type = getString(metadata, "type");
        const typeLabel = type === "PERMANENT" ? "cambio permanente" : "cambio por una clase";
        const updated = metadata.permanentScheduleUpdated ? " Se actualizaron los turnos fijos." : "";
        const notificationStatus = getString(metadata, "notificationStatus");
        const whatsappStatus = getString(metadata, "whatsappNotificationStatus");
        const notificationText = whatsappStatus === "SENT"
            ? " Se notificó al alumno por WhatsApp."
            : notificationStatus === "SENT"
                ? " Se notificó al alumno por email porque WhatsApp no estaba disponible."
            : notificationStatus === "PARTIAL_FAILED"
                ? " La notificación se completó parcialmente."
                : notificationStatus === "FAILED"
                    ? " No se pudo notificar al alumno."
                    : notificationStatus === "SKIPPED_NO_RECIPIENT"
                        ? " No había un destinatario válido para notificar."
                        : "";

        return `Se confirmó automáticamente un ${typeLabel} de horario.${updated}${notificationText}`;
    }

    if (log.action === "SCHEDULE_CHANGE_REQUEST_CANCEL") {
        return "El alumno canceló el cambio temporal y volvió a su horario habitual.";
    }

    if (log.action === "SCHEDULE_CHANGE_REQUEST_APPROVE") {
        const type = getString(metadata, "type");
        const typeLabel = type === "PERMANENT" ? "cambio permanente" : "cambio por una clase";
        const updated = metadata.permanentScheduleUpdated ? " Se actualizaron los turnos fijos." : "";
        const notificationStatus = getString(metadata, "studentNotificationStatus");
        const notificationText = notificationStatus === "SENT"
            ? " Se notificó al alumno por email."
            : notificationStatus === "FAILED"
                ? " No se pudo notificar al alumno por email."
                : notificationStatus?.startsWith("SKIPPED")
                    ? " No se envió email al alumno."
                    : "";

        return `Se aprobó el ${typeLabel} de horario.${updated}${notificationText}`;
    }

    if (log.action === "SCHEDULE_CHANGE_REQUEST_REJECT") {
        const type = getString(metadata, "type");
        const typeLabel = type === "PERMANENT" ? "cambio permanente" : "cambio por una clase";
        const notificationStatus = getString(metadata, "studentNotificationStatus");
        const notificationText = notificationStatus === "SENT"
            ? " Se notificó al alumno por email."
            : notificationStatus === "FAILED"
                ? " No se pudo notificar al alumno por email."
                : notificationStatus?.startsWith("SKIPPED")
                    ? " No se envió email al alumno."
                    : "";

        return `Se rechazó el ${typeLabel} de horario.${notificationText}`;
    }

    if (log.action === "STUDENT_CREATE") {
        return `Se creó el alumno${email ? ` ${email}` : ""}.`;
    }

    if (log.action === "SITE_CONTENT_UPDATE") {
        return "Se actualizaron los textos, imágenes o enlaces de la portada.";
    }

    if (log.action.startsWith("COMMUNITY_POST_")) {
        const title = getString(metadata, "title");
        const verb = log.action.endsWith("CREATE") ? "creó" : log.action.endsWith("UPDATE") ? "actualizó" : "eliminó";
        return `Se ${verb} una publicación${title ? `: ${title}` : ""}.`;
    }

    if (log.action.startsWith("COMMUNITY_COMMENT_")) {
        return log.action.endsWith("CREATE") ? "Un alumno publicó un aporte en la comunidad." : "Se eliminó un aporte de la comunidad.";
    }

    if (log.action === "STUDENT_UPDATE") {
        const updatedFields = [
            metadata.profileUpdated ? "datos personales" : null,
            metadata.scheduleUpdated || metadata.scheduleIds ? "turnos" : null,
            metadata.imageUpdated ? "foto" : null,
            metadata.planId ? "membresía" : null,
            metadata.routineUpdated ? "rutina" : null,
            metadata.priceUpdated ? "precio mensual" : null,
            metadata.notesUpdated ? "notas" : null,
        ].filter(Boolean);

        return `Se actualizó la ficha del alumno${email ? ` ${email}` : ""}${updatedFields.length ? `: ${updatedFields.join(", ")}` : ""}.`;
    }

    if (log.action === "WHATSAPP_INTEGRATION_CONNECT") {
        const phone = getString(metadata, "displayPhoneNumber");
        return `Se conectó un número mediante coexistencia${phone ? `: ${phone}` : ""}.`;
    }

    if (log.action === "WHATSAPP_INTEGRATION_DISCONNECT") {
        return "Se desactivó la conexión administrada; la cuenta del teléfono no fue eliminada.";
    }

    return "Movimiento registrado.";
};

const getEntityLabel = (entityType: string) => auditEntityLabels[entityType] ?? "Registro";

const actionFilterLabels: Record<ActionFilter, string> = {
    all: "Todas", payments: "Pagos", attendance: "Asistencia", students: "Alumnos y horarios",
    community: "Comunidad", content: "Contenido web", whatsapp: "WhatsApp",
};

export const AuditSection = ({ initialPage }: Props) => {
    const [query, setQuery] = useState("");
    const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
    const [actorFilter, setActorFilter] = useState<ActorFilter>("all");
    const [dateFilter, setDateFilter] = useState("");
    const [pageData, setPageData] = useState(initialPage);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const requestVersion = useRef(0);
    const firstLoad = useRef(true);
    const logs = pageData.logs;
    const resultsRef = useRef<HTMLDivElement>(null);
    const filtersInitialized = useRef(false);

    useEffect(() => {
        if (!filtersInitialized.current) { filtersInitialized.current = true; return; }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import("@/animations/gsapConfig").then(({ gsap }) => {
            if (cancelled || !resultsRef.current) return;
            const context = gsap.context(() => {
                gsap.fromTo(resultsRef.current, { autoAlpha: .65, y: 8 }, { autoAlpha: 1, y: 0, duration: .28, ease: "power2.out", clearProps: "all" });
            });
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [pageData]);

    useEffect(() => {
        if (firstLoad.current) { firstLoad.current = false; return; }
        const version = ++requestVersion.current;
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            const result = await getAuditLogs({ query, actionGroup: actionFilter, actorRole: actorFilter, date: dateFilter, page });
            if (version !== requestVersion.current) return;
            if (result.ok) {
                setPageData(result.data);
                setLoadError(null);
                if (result.data.page !== page) setPage(result.data.page);
            } else setLoadError(result.error);
            setIsLoading(false);
        }, query ? 250 : 0);
        return () => { requestVersion.current += 1; window.clearTimeout(timer); };
    }, [query, actionFilter, actorFilter, dateFilter, page]);

    const hasFilters = Boolean(query.trim() || actionFilter !== "all" || actorFilter !== "all" || dateFilter);

    const clearFilters = () => {
        setQuery("");
        setActionFilter("all");
        setActorFilter("all");
        setDateFilter("");
        setPage(1);
    };

    return (
        <section className="audit-section">
            <div className="audit-header">
                <div>
                    <span className="audit-eyebrow">ACTIVIDAD ADMINISTRATIVA</span>
                    <h1>Auditoría</h1>
                    <p>
                        {pageData.filteredTotal} de {pageData.total} movimientos{isLoading ? ' · Cargando...' : ''}.
                    </p>
                </div>
            </div>

            <div className="audit-table-wrapper">
                <div className="audit-table-toolbar">
                    <label>
                        <span>Acción</span>
                        <select
                            value={actionFilter}
                            onChange={(event) => { setActionFilter(event.target.value as ActionFilter); setPage(1); }}
                            aria-label="Filtrar por acción"
                        >
                            <option value="all">Todas</option>
                            <option value="payments">Pagos</option>
                            <option value="attendance">Asistencia</option>
                            <option value="students">Alumnos y horarios</option>
                            <option value="community">Comunidad</option>
                            <option value="content">Contenido web</option>
                            <option value="whatsapp">WhatsApp</option>
                        </select>
                    </label>

                    <label>
                        <span>Usuario</span>
                        <select
                            value={actorFilter}
                            onChange={(event) => { setActorFilter(event.target.value as ActorFilter); setPage(1); }}
                            aria-label="Filtrar por usuario"
                        >
                            <option value="all">Todos</option>
                            <option value="ADMIN">Admin</option>
                            <option value="COACH">Coach</option>
                            <option value="STUDENT">Alumno</option>
                        </select>
                    </label>

                    <label>
                        <span>Fecha</span>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(event) => { setDateFilter(event.target.value); setPage(1); }}
                            aria-label="Filtrar por fecha"
                        />
                    </label>

                    <label className="audit-search-field">
                        <span>Buscar</span>
                        <input
                            value={query}
                            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                            placeholder="Buscar usuario, registro o resumen..."
                            aria-label="Buscar auditoría"
                        />
                    </label>

                </div>

                {hasFilters && <div className="audit-active-filters" aria-label="Filtros activos">
                    {actionFilter !== "all" && <span>{actionFilterLabels[actionFilter]}</span>}
                    {actorFilter !== "all" && <span>{roleLabels[actorFilter]}</span>}
                    {dateFilter && <span>{dateFilter}</span>}
                    {query.trim() && <span>“{query.trim()}”</span>}
                    <button type="button" onClick={clearFilters}>Limpiar filtros</button>
                </div>}

                {loadError && <p role="alert">{loadError}</p>}
                <div ref={resultsRef} className="audit-results">{logs.length > 0 ? (
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Acción</th>
                                <th>Usuario</th>
                                <th>Registro</th>
                                <th>Resumen</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td data-label="Fecha"><time dateTime={new Date(log.createdAt).toISOString()}>{formatDate(log.createdAt)}</time></td>
                                    <td data-label="Acción">
                                        <span className="audit-action">{getActionLabel(log.action)}</span>
                                    </td>
                                    <td data-label="Usuario">
                                        <strong>{log.actorEmail ?? "Sin usuario"}</strong>
                                        {log.actorRole && <span>{roleLabels[log.actorRole]}</span>}
                                    </td>
                                    <td data-label="Registro">
                                        <strong>{getEntityLabel(log.entityType)}</strong>
                                    </td>
                                    <td data-label="Resumen" className="audit-detail">
                                        {getAuditSummary(log)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyState
                        compact
                        className="audit-empty"
                        title={pageData.total > 0 ? "Sin resultados" : "Sin movimientos"}
                        description={pageData.total > 0
                            ? "No hay movimientos que coincidan con los filtros."
                            : "Todavía no hay acciones registradas."}
                    />
                )}</div>
                <Pagination page={page} pageSize={20} totalItems={pageData.filteredTotal} onPageChange={setPage} label="movimientos" />
            </div>
        </section>
    );
};
