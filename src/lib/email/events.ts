import {
    buildContactEmail,
    buildPasswordResetEmail,
    buildPaymentReminderEmail,
    buildScheduleChangeRequestEmail,
    buildScheduleChangeRequestReviewEmail,
    buildStudentWelcomeEmail,
} from "./templates";
import type { EmailEvent, EmailMessage } from "./types";

export const buildEmailMessage = (event: EmailEvent): EmailMessage => {
    const template = (() => {
        if (event.type === "CONTACT_MESSAGE") return buildContactEmail(event.data);
        if (event.type === "PASSWORD_RESET") return buildPasswordResetEmail(event.data);
        if (event.type === "STUDENT_WELCOME") return buildStudentWelcomeEmail(event.data);
        if (event.type === "SCHEDULE_CHANGE_REQUEST") return buildScheduleChangeRequestEmail(event.data);
        if (event.type === "SCHEDULE_CHANGE_REQUEST_REVIEW") return buildScheduleChangeRequestReviewEmail(event.data);

        return buildPaymentReminderEmail(event.data);
    })();

    return {
        to: [event.to],
        replyTo: "replyTo" in event ? event.replyTo : undefined,
        ...template,
    };
};
