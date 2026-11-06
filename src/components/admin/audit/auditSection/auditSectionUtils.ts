import type { AuditLog } from "@/app/actions/audit.actions";
import { auditActionLabels, auditEntityLabels } from "@/lib/audit-labels";
import { formatCurrency } from "@/utils/format";

export type ActionFilter = "all" | "payments" | "attendance" | "students" | "community" | "content" | "whatsapp";
export type ActorFilter = "all" | "ADMIN" | "COACH" | "STUDENT";

export const roleLabels = {
    ADMIN: "Admin",
    COACH: "Coach",
    STUDENT: "Alumno",
};

export const getActionLabel = (action: string) => auditActionLabels[action] ?? "Acción registrada";

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

export const formatDate = (value: Date | string) => {
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

export const getAuditSummary = (log: AuditLog) => {
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

export const getEntityLabel = (entityType: string) => auditEntityLabels[entityType] ?? "Registro";

export const actionFilterLabels: Record<ActionFilter, string> = {
    all: "Todas", payments: "Pagos", attendance: "Asistencia", students: "Alumnos y horarios",
    community: "Comunidad", content: "Contenido web", whatsapp: "WhatsApp",
};

