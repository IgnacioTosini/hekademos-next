import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { EmailAddress, EmailMessage } from "./types";

type EmailTransportConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromAddress: string;
};

const getRequiredEnv = (key: string) => {
    const value = process.env[key]?.trim();

    if (!value) {
        throw new Error(`Falta configurar la variable de email ${key}`);
    }

    return value;
};

const getOptionalBooleanEnv = (key: string, fallback: boolean) => {
    const value = process.env[key]?.trim().toLowerCase();

    if (!value) return fallback;

    return value === "true" || value === "1" || value === "yes";
};

const getEmailTransportConfig = (): EmailTransportConfig => {
    const port = Number(getRequiredEnv("SMTP_PORT"));

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error("El puerto SMTP configurado no es valido");
    }

    const user = getRequiredEnv("SMTP_USER");

    return {
        host: getRequiredEnv("SMTP_HOST"),
        port,
        secure: getOptionalBooleanEnv("SMTP_SECURE", port === 465),
        user,
        pass: getRequiredEnv("SMTP_PASS"),
        fromName: process.env.EMAIL_FROM_NAME?.trim() || "Hekademos",
        fromAddress: process.env.EMAIL_FROM_ADDRESS?.trim() || user,
    };
};

const formatAddress = ({ email, name }: EmailAddress) => {
    if (!name?.trim()) return email;

    return `"${name.replace(/"/g, '\\"')}" <${email}>`;
};

const getTransporter = () => {
    const config = getEmailTransportConfig();
    const options: SMTPTransport.Options = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    };

    return {
        config,
        transporter: nodemailer.createTransport(options),
    };
};

export const buildMailOptions = (message: EmailMessage): Mail.Options => {
    const { config } = getTransporter();

    return {
        from: formatAddress({
            email: config.fromAddress,
            name: config.fromName,
        }),
        to: message.to.map(formatAddress),
        replyTo: message.replyTo ? formatAddress(message.replyTo) : undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
    };
};

export const sendEmail = async (message: EmailMessage) => {
    const { config, transporter } = getTransporter();

    return transporter.sendMail({
        from: formatAddress({
            email: config.fromAddress,
            name: config.fromName,
        }),
        to: message.to.map(formatAddress),
        replyTo: message.replyTo ? formatAddress(message.replyTo) : undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
    });
};

export const verifyEmailTransport = async () => {
    const { transporter } = getTransporter();

    return transporter.verify();
};
