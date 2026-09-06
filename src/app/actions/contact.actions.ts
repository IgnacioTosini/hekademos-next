"use server";

import { headers } from "next/headers";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { isDeliverableEmail } from "@/lib/form-validation";
import {
    consumeRateLimit,
    getClientIp,
    getRateLimitMessage,
    rateLimitPolicies,
} from "@/lib/rate-limit";
import type { ActionResponse } from "./_shared";

export type SendContactMessageInput = {
    name: string;
    email: string;
    message: string;
};

const getContactRecipientEmail = () => (
    process.env.CONTACT_TO_EMAIL?.trim()
    || process.env.ADMIN_NOTIFICATION_EMAIL?.trim()
    || process.env.EMAIL_FROM_ADDRESS?.trim()
    || process.env.SMTP_USER?.trim()
    || null
);

const getContactErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) return "No se pudo enviar el mensaje";
    if (error.message === "Ingresa un nombre valido") return error.message;
    if (error.message === "Ingresa un email valido") return error.message;
    if (error.message === "El mensaje debe tener entre 10 y 1200 caracteres") return error.message;
    if (error.message === "El formulario de contacto no tiene un destinatario configurado") return error.message;

    return "No se pudo enviar el mensaje";
};

export const sendContactMessage = async (
    input: SendContactMessageInput
): Promise<ActionResponse<{ sent: true } | null>> => {
    try {
        const name = input.name.trim();
        const email = input.email.trim().toLowerCase();
        const message = input.message.trim();
        const recipientEmail = getContactRecipientEmail();

        if (name.length < 2 || name.length > 80) throw new Error("Ingresa un nombre valido");
        if (!isDeliverableEmail(email)) throw new Error("Ingresa un email valido");
        if (message.length < 10 || message.length > 1200) throw new Error("El mensaje debe tener entre 10 y 1200 caracteres");

        const clientIp = getClientIp(await headers());
        const contactLimits = await Promise.all([
            consumeRateLimit({
                scope: "contact-ip",
                identifier: clientIp,
                ...rateLimitPolicies.contactIp,
            }),
            consumeRateLimit({
                scope: "contact-identity",
                identifier: `${clientIp}:${email}`,
                ...rateLimitPolicies.contactIdentity,
            }),
        ]);
        const exceededContactLimit = contactLimits.find((result) => !result.allowed);

        if (exceededContactLimit) {
            return {
                ok: false,
                data: null,
                error: getRateLimitMessage(exceededContactLimit),
            };
        }

        if (!recipientEmail || !isDeliverableEmail(recipientEmail)) {
            throw new Error("El formulario de contacto no tiene un destinatario configurado");
        }

        const emailMessage = buildEmailMessage({
            type: "CONTACT_MESSAGE",
            to: {
                email: recipientEmail,
                name: "Hekademos",
            },
            replyTo: {
                email,
                name,
            },
            data: {
                name,
                email,
                message,
            },
        });

        await sendEmail(emailMessage);

        return {
            ok: true,
            data: {
                sent: true,
            },
        };
    } catch (error) {
        console.error("Error al enviar el mensaje de contacto:", error);

        return {
            ok: false,
            data: null,
            error: getContactErrorMessage(error),
        };
    }
};
