"use client";

import { useMemo, useState } from "react";
import type { AuditLog } from "@/app/actions/audit.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import { formatCurrency } from "@/utils/format";
import "./_auditSection.scss";

type Props = {
    logs: AuditLog[];
};

type ActionFilter = "all" | "payments" | "attendance" | "students";
type ActorFilter = "all" | "ADMIN" | "COACH" | "STUDENT";

const actionLabels: Record<string, string> = {
    PAYMENT_MARK_PAID: "Pago marcado",
    PAYMENT_MARK_PENDING: "Pago desmarcado",
    PAYMENT_DETAILS_UPDATE: "Detalle de pago",
    PAYMENT_REMINDER_EMAILS: "Recordatorios de pago",
    ATTENDANCE_MARK_COACH: "Asistencia",
    ATTENDANCE_MARK_ADMIN: "Asistencia",
    SCHEDULE_CHANGE_REQUEST_APPROVE: "Solicitud aprobada",
    SCHEDULE_CHANGE_REQUEST_CREATE: "Solicitud de horario",
    SCHEDULE_CHANGE_REQUEST_REJECT: "Solicitud rechazada",
    STUDENT_CREATE: "Alumno creado",
    STUDENT_UPDATE: "Alumno editado",
};

const entityLabels: Record<string, string> = {
    Attendance: "Asistencia",
    Payment: "Pago",
    ScheduleChangeRequest: "Solicitud de horario",
    Student: "Alumno",
};

const roleLabels = {
    ADMIN: "Admin",
    COACH: "Coach",
    STUDENT: "Alumno",
};

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

    if (log.action === "PAYMENT_REMINDER_EMAILS") {
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

    return "Movimiento registrado.";
};

const getEntityLabel = (entityType: string) => entityLabels[entityType] ?? "Registro";

const getActionGroup = (log: AuditLog): ActionFilter => {
    if (log.action.startsWith("PAYMENT_")) return "payments";
    if (log.action.startsWith("ATTENDANCE_")) return "attendance";
    if (log.action.startsWith("STUDENT_") || log.action.startsWith("SCHEDULE_")) return "students";
    return "all";
};

const formatInputDate = (value: Date | string) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getSearchText = (log: AuditLog) => [
    actionLabels[log.action] ?? log.action,
    log.actorEmail,
    log.actorRole ? roleLabels[log.actorRole] : null,
    getEntityLabel(log.entityType),
    getAuditSummary(log),
].filter(Boolean).join(" ").toLowerCase();

export const AuditSection = ({ logs }: Props) => {
    const [query, setQuery] = useState("");
    const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
    const [actorFilter, setActorFilter] = useState<ActorFilter>("all");
    const [dateFilter, setDateFilter] = useState("");

    const filteredLogs = useMemo(() => {
        const search = query.trim().toLowerCase();

        return logs.filter((log) => {
            const matchesAction = actionFilter === "all" || getActionGroup(log) === actionFilter;
            const matchesActor = actorFilter === "all" || log.actorRole === actorFilter;
            const matchesDate = !dateFilter || formatInputDate(log.createdAt) === dateFilter;
            const matchesSearch = !search || getSearchText(log).includes(search);

            return matchesAction && matchesActor && matchesDate && matchesSearch;
        });
    }, [actionFilter, actorFilter, dateFilter, logs, query]);

    const hasFilters = Boolean(query.trim() || actionFilter !== "all" || actorFilter !== "all" || dateFilter);

    const clearFilters = () => {
        setQuery("");
        setActionFilter("all");
        setActorFilter("all");
        setDateFilter("");
    };

    return (
        <section className="audit-section">
            <div className="audit-header">
                <div>
                    <h1>Auditoría</h1>
                    <p>
                        {filteredLogs.length} de {logs.length} movimientos recientes.
                    </p>
                </div>
            </div>

            <div className="audit-table-wrapper">
                <div className="audit-table-toolbar">
                    <label>
                        <span>Acción</span>
                        <select
                            value={actionFilter}
                            onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
                            aria-label="Filtrar por acción"
                        >
                            <option value="all">Todas</option>
                            <option value="payments">Pagos</option>
                            <option value="attendance">Asistencia</option>
                            <option value="students">Alumnos</option>
                        </select>
                    </label>

                    <label>
                        <span>Usuario</span>
                        <select
                            value={actorFilter}
                            onChange={(event) => setActorFilter(event.target.value as ActorFilter)}
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
                            onChange={(event) => setDateFilter(event.target.value)}
                            aria-label="Filtrar por fecha"
                        />
                    </label>

                    <label className="audit-search-field">
                        <span>Buscar</span>
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar usuario, registro o resumen..."
                            aria-label="Buscar auditoría"
                        />
                    </label>

                    {hasFilters && (
                        <button className="audit-clear-button" type="button" onClick={clearFilters}>
                            Limpiar
                        </button>
                    )}
                </div>

                {filteredLogs.length > 0 ? (
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
                            {filteredLogs.map((log) => (
                                <tr key={log.id}>
                                    <td data-label="Fecha">{formatDate(log.createdAt)}</td>
                                    <td data-label="Acción">
                                        <span className="audit-action">{actionLabels[log.action] ?? log.action}</span>
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
                        title={logs.length > 0 ? "Sin resultados" : "Sin movimientos"}
                        description={logs.length > 0
                            ? "No hay movimientos que coincidan con los filtros."
                            : "Todavía no hay acciones registradas."}
                    />
                )}
            </div>
        </section>
    );
};
