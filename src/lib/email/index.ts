export { buildEmailMessage } from "./events";
export {
    buildContactEmail,
    buildPasswordResetEmail,
    buildPaymentReminderEmail,
    buildScheduleChangeRequestEmail,
    buildScheduleChangeRequestReviewEmail,
    buildStudentWelcomeEmail,
} from "./templates";
export {
    buildMailOptions,
    sendEmail,
    verifyEmailTransport,
} from "./transport";
export type {
    ContactEmailData,
    EmailAddress,
    EmailEvent,
    EmailMessage,
    EmailTemplateResult,
    PasswordResetEmailData,
    PaymentReminderEmailData,
    ScheduleChangeRequestEmailData,
    ScheduleChangeRequestReviewEmailData,
    StudentWelcomeEmailData,
} from "./types";
