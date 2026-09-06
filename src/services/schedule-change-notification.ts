import { getAppUrl } from "@/lib/app-url";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { isDeliverableEmail } from "@/lib/form-validation";
import { prisma } from "@/lib/prisma";
import { sendScheduleChangeWhatsApp } from "@/lib/whatsapp";
import type { ScheduleChangeRequestType } from "@/types/schema/classes";
import { dayOrderIndex, getScheduleLabel } from "@/utils/schedule";
import { getStudentName } from "@/utils/student";

type ScheduleChangeStudent = {
    user: {
        email: string;
        name: string | null;
        phone: string | null;
    };
    firstName: string | null;
    lastName: string | null;
};

type ScheduleNotificationResult = {
    status: "SENT" | "FAILED" | "SKIPPED_NO_RECIPIENT";
    recipients: string[];
    whatsappStatus: "SENT" | "FAILED" | "DISABLED" | "SKIPPED_NO_RECIPIENT";
};

const scheduleRequestTypeLabels: Record<ScheduleChangeRequestType, string> = {
    ONE_TIME: "Solo por esta clase",
    PERMANENT: "Cambio permanente",
};

const formatScheduleLabels = async (scheduleIds: string[]) => {
    if (scheduleIds.length === 0) return "Sin turnos asignados";

    const schedules = await prisma.weeklyClassSchedule.findMany({
        where: {
            id: {
                in: scheduleIds,
            },
        },
    });
    const orderedSchedules = schedules.sort((first, second) => (
        dayOrderIndex[first.dayOfWeek] - dayOrderIndex[second.dayOfWeek]
        || first.startTime.localeCompare(second.startTime)
    ));

    return orderedSchedules.map(getScheduleLabel).join("\n") || "Sin turnos asignados";
};

const formatScheduleRequestDate = (value?: Date | null) => (
    value
        ? new Intl.DateTimeFormat("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(value)
        : null
);

export const sendAutomaticScheduleChangeNotification = async ({
    student,
    type,
    requestedScheduleIds,
    requestedDate,
}: {
    student: ScheduleChangeStudent;
    type: ScheduleChangeRequestType;
    requestedScheduleIds: string[];
    requestedDate?: Date | null;
}): Promise<ScheduleNotificationResult> => {
    const studentEmail = student.user.email.trim().toLowerCase();
    const canSendEmail = isDeliverableEmail(studentEmail);
    const studentName = getStudentName(student);
    const requestedSchedulesLabel = await formatScheduleLabels(requestedScheduleIds);
    const requestedDateLabel = formatScheduleRequestDate(requestedDate);
    const deliveredRecipients: string[] = [];
    let whatsappStatus: ScheduleNotificationResult["whatsappStatus"] = "DISABLED";
    let studentNotificationSent = false;

    try {
        const whatsappResult = await sendScheduleChangeWhatsApp({
            studentName,
            studentPhone: student.user.phone,
            requestedSchedulesLabel,
            validityLabel: type === "ONE_TIME"
                ? `${requestedDateLabel ? `Solo para ${requestedDateLabel}. ` : ""}Después volvés a tu horario habitual.`
                : "Este cambio queda como tu horario permanente.",
        });

        whatsappStatus = whatsappResult.status;

        if (whatsappResult.status === "SENT") {
            studentNotificationSent = true;
            deliveredRecipients.push("student:whatsapp");
        }
    } catch (error) {
        whatsappStatus = "FAILED";
        console.error("Error al enviar la notificacion del cambio automatico de horario por WhatsApp:", error);
    }

    if (!studentNotificationSent && canSendEmail) {
        const emailMessage = buildEmailMessage({
            type: "SCHEDULE_CHANGE_REQUEST_REVIEW",
            to: {
                email: studentEmail,
                name: student.user.name,
            },
            data: {
                studentName,
                statusLabel: "aprobada",
                requestTypeLabel: scheduleRequestTypeLabels[type],
                requestedSchedulesLabel,
                requestedDateLabel,
                reviewNotes: "Confirmada automáticamente, sin revisión del entrenador.",
                profileUrl: getAppUrl("/perfil"),
            },
        });

        try {
            await sendEmail(emailMessage);
            deliveredRecipients.push(studentEmail);
            studentNotificationSent = true;
        } catch (error) {
            console.error(`Error al enviar la notificacion del cambio automatico de horario a ${studentEmail}:`, error);
        }
    }

    if (!studentNotificationSent && !canSendEmail && whatsappStatus !== "FAILED") {
        return {
            status: "SKIPPED_NO_RECIPIENT",
            recipients: [],
            whatsappStatus,
        };
    }

    return {
        status: studentNotificationSent ? "SENT" : "FAILED",
        recipients: deliveredRecipients,
        whatsappStatus,
    };
};
