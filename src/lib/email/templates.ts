import type {
    ContactEmailData,
    EmailTemplateResult,
    PasswordResetEmailData,
    PaymentReminderEmailData,
    ScheduleChangeRequestEmailData,
    ScheduleChangeRequestReviewEmailData,
    StudentWelcomeEmailData,
} from "./types";

const brandName = "Hekademos";

const escapeHtml = (value: string) => (
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
);

const renderLayout = (title: string, body: string) => `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#1D2C3F;color:#F8FAFC;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <p style="margin:0 0 24px;color:#F58D31;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${brandName}</p>
      <div style="border:1px solid rgba(245,141,49,.24);border-radius:8px;background:#132133;padding:28px;">
        ${body}
      </div>
      <p style="margin:18px 0 0;color:#959ba3;font-size:13px;">Este mensaje fue generado por ${brandName}.</p>
    </div>
  </body>
</html>
`;

const renderButton = (href: string, label: string) => (
    `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:18px;padding:12px 16px;border-radius:8px;background:#F58D31;color:#F8FAFC;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>`
);

export const buildPasswordResetEmail = ({
    name,
    resetUrl,
    expiresInMinutes,
}: PasswordResetEmailData): EmailTemplateResult => {
    const displayName = name?.trim() || "tu cuenta";
    const subject = "Restablece tu contraseña de Hekademos";
    const html = renderLayout(subject, `
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;">Restablecer contraseña</h1>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;">Recibimos una solicitud para cambiar la contraseña de ${escapeHtml(displayName)}.</p>
        <p style="margin:0;color:#CBD5E1;line-height:1.6;">El enlace vence en ${expiresInMinutes} minutos.</p>
        ${renderButton(resetUrl, "Cambiar contraseña")}
    `);
    const text = [
        subject,
        `Recibimos una solicitud para cambiar la contraseña de ${displayName}.`,
        `El enlace vence en ${expiresInMinutes} minutos.`,
        resetUrl,
    ].join("\n\n");

    return { subject, html, text };
};

export const buildStudentWelcomeEmail = ({
    name,
    loginUrl,
    coachName,
}: StudentWelcomeEmailData): EmailTemplateResult => {
    const subject = "Bienvenido a Hekademos";
    const coachText = coachName ? `Tu coach asignado es ${coachName}.` : "Tu coach sera asignado por el equipo.";
    const html = renderLayout(subject, `
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;">Hola ${escapeHtml(name)}</h1>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;">Tu cuenta de alumno ya esta lista.</p>
        <p style="margin:0;color:#CBD5E1;line-height:1.6;">${escapeHtml(coachText)}</p>
        <p style="margin:10px 0 0;color:#CBD5E1;line-height:1.6;">Si todavia no tenes contraseña, usa la opcion de recuperar contraseña desde el login.</p>
        ${renderButton(loginUrl, "Entrar a mi perfil")}
    `);
    const text = [
        subject,
        `Hola ${name}. Tu cuenta de alumno ya esta lista.`,
        coachText,
        "Si todavia no tenes contraseña, usa la opcion de recuperar contraseña desde el login.",
        loginUrl,
    ].join("\n\n");

    return { subject, html, text };
};

export const buildPaymentReminderEmail = ({
    name,
    amountLabel,
    dueDateLabel,
    reminderType,
    surchargePercent,
    increasedAmountLabel,
}: PaymentReminderEmailData): EmailTemplateResult => {
    const isLateWarning = reminderType === "LATE_WARNING";
    const subject = isLateWarning
        ? "Aviso de vencimiento de pago Hekademos"
        : "Recordatorio de pago Hekademos";
    const reminderText = isLateWarning
        ? `te recordamos que el pago vence ${dueDateLabel}. A partir del dia siguiente se aplica un recargo${surchargePercent ? ` del ${surchargePercent}%` : ""}${increasedAmountLabel ? ` y el monto pasa a ${increasedAmountLabel}` : ""}.`
        : `tenes pendiente el pago mensual por ${amountLabel}. El vencimiento es ${dueDateLabel}.`;
    const html = renderLayout(subject, `
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;">${isLateWarning ? "Aviso de vencimiento" : "Recordatorio de pago"}</h1>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;">Hola ${escapeHtml(name)}, ${escapeHtml(reminderText)}</p>
        <p style="margin:0;color:#CBD5E1;line-height:1.6;">Monto actual: ${escapeHtml(amountLabel)}.</p>
    `);
    const text = [
        subject,
        `Hola ${name}, ${reminderText}`,
        `Monto actual: ${amountLabel}.`,
    ].join("\n\n");

    return { subject, html, text };
};

export const buildScheduleChangeRequestEmail = ({
    studentName,
    requestTypeLabel,
    currentSchedulesLabel,
    requestedSchedulesLabel,
    reason,
    reviewUrl,
}: ScheduleChangeRequestEmailData): EmailTemplateResult => {
    const subject = "Nueva solicitud de cambio de horario";
    const html = renderLayout(subject, `
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;">Solicitud de horario</h1>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;">${escapeHtml(studentName)} solicitó un cambio de horario.</p>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Tipo:</strong> ${escapeHtml(requestTypeLabel)}</p>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Turnos actuales:</strong><br />${escapeHtml(currentSchedulesLabel).replace(/\n/g, "<br />")}</p>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Turnos solicitados:</strong><br />${escapeHtml(requestedSchedulesLabel).replace(/\n/g, "<br />")}</p>
        <p style="margin:0;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Justificación:</strong><br />${escapeHtml(reason)}</p>
        ${renderButton(reviewUrl, "Revisar solicitud")}
    `);
    const text = [
        subject,
        `${studentName} solicitó un cambio de horario.`,
        `Tipo: ${requestTypeLabel}`,
        `Turnos actuales:\n${currentSchedulesLabel}`,
        `Turnos solicitados:\n${requestedSchedulesLabel}`,
        `Justificación:\n${reason}`,
        reviewUrl,
    ].join("\n\n");

    return { subject, html, text };
};

export const buildScheduleChangeRequestReviewEmail = ({
    studentName,
    statusLabel,
    requestTypeLabel,
    requestedSchedulesLabel,
    reviewNotes,
    profileUrl,
}: ScheduleChangeRequestReviewEmailData): EmailTemplateResult => {
    const isApproved = statusLabel === "aprobada";
    const subject = `Solicitud de horario ${statusLabel}`;
    const reviewText = reviewNotes?.trim()
        ? `<p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Nota:</strong><br />${escapeHtml(reviewNotes)}</p>`
        : "";
    const html = renderLayout(subject, `
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;">Solicitud ${escapeHtml(statusLabel)}</h1>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;">Hola ${escapeHtml(studentName)}, tu solicitud de horario fue ${escapeHtml(statusLabel)}.</p>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Tipo:</strong> ${escapeHtml(requestTypeLabel)}</p>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Turnos solicitados:</strong><br />${escapeHtml(requestedSchedulesLabel).replace(/\n/g, "<br />")}</p>
        ${reviewText}
        <p style="margin:0;color:#CBD5E1;line-height:1.6;">${isApproved ? "Ya podés revisar tu perfil para ver el estado de tus horarios." : "Si necesitás otro cambio, podés enviar una nueva solicitud desde tu perfil."}</p>
        ${renderButton(profileUrl, "Ver mi perfil")}
    `);
    const text = [
        subject,
        `Hola ${studentName}, tu solicitud de horario fue ${statusLabel}.`,
        `Tipo: ${requestTypeLabel}`,
        `Turnos solicitados:\n${requestedSchedulesLabel}`,
        reviewNotes?.trim() ? `Nota:\n${reviewNotes.trim()}` : null,
        isApproved
            ? "Ya podés revisar tu perfil para ver el estado de tus horarios."
            : "Si necesitás otro cambio, podés enviar una nueva solicitud desde tu perfil.",
        profileUrl,
    ].filter(Boolean).join("\n\n");

    return { subject, html, text };
};

export const buildContactEmail = ({
    name,
    email,
    message,
}: ContactEmailData): EmailTemplateResult => {
    const subject = `Nuevo mensaje de contacto - ${name}`;
    const html = renderLayout(subject, `
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;">Nuevo mensaje de contacto</h1>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Nombre:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 10px;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:0;color:#CBD5E1;line-height:1.6;"><strong style="color:#F8FAFC;">Mensaje:</strong><br />${escapeHtml(message).replace(/\n/g, "<br />")}</p>
    `);
    const text = [
        subject,
        `Nombre: ${name}`,
        `Email: ${email}`,
        `Mensaje:\n${message}`,
    ].join("\n\n");

    return { subject, html, text };
};
