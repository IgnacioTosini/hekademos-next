export type EmailAddress = {
    email: string;
    name?: string | null;
};

export type EmailMessage = {
    to: EmailAddress[];
    replyTo?: EmailAddress;
    subject: string;
    html: string;
    text: string;
};

export type EmailTemplateResult = Omit<EmailMessage, "to">;

export type PasswordResetEmailData = {
    name?: string | null;
    resetUrl: string;
    expiresInMinutes: number;
};

export type StudentWelcomeEmailData = {
    name: string;
    loginUrl: string;
    coachName?: string | null;
};

export type PaymentReminderEmailData = {
    name: string;
    amountLabel: string;
    dueDateLabel: string;
    reminderType: "MONTHLY" | "LATE_WARNING";
    surchargePercent?: number;
    increasedAmountLabel?: string;
};

export type ScheduleChangeRequestEmailData = {
    studentName: string;
    requestTypeLabel: string;
    currentSchedulesLabel: string;
    requestedSchedulesLabel: string;
    reason: string;
    reviewUrl: string;
};

export type ScheduleChangeRequestReviewEmailData = {
    studentName: string;
    statusLabel: "aprobada" | "rechazada";
    requestTypeLabel: string;
    requestedSchedulesLabel: string;
    reviewNotes?: string | null;
    profileUrl: string;
};

export type ContactEmailData = {
    name: string;
    email: string;
    message: string;
};

export type EmailEvent =
    | {
        type: "PASSWORD_RESET";
        to: EmailAddress;
        data: PasswordResetEmailData;
    }
    | {
        type: "STUDENT_WELCOME";
        to: EmailAddress;
        data: StudentWelcomeEmailData;
    }
    | {
        type: "PAYMENT_REMINDER";
        to: EmailAddress;
        data: PaymentReminderEmailData;
    }
    | {
        type: "SCHEDULE_CHANGE_REQUEST";
        to: EmailAddress;
        data: ScheduleChangeRequestEmailData;
    }
    | {
        type: "SCHEDULE_CHANGE_REQUEST_REVIEW";
        to: EmailAddress;
        data: ScheduleChangeRequestReviewEmailData;
    }
    | {
        type: "CONTACT_MESSAGE";
        to: EmailAddress;
        replyTo: EmailAddress;
        data: ContactEmailData;
    };
