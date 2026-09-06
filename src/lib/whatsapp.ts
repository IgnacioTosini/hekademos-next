import { normalizeWhatsappPhoneNumber } from '@/utils/whatsapp';

type WhatsAppConfig = {
    accessToken: string;
    apiVersion: string;
    phoneNumberId: string;
    testMode: boolean;
    testRecipient: string | null;
};

type WhatsAppTemplateParameter = {
    type: "text";
    text: string;
};

type SendWhatsAppTemplateInput = {
    to?: string | null;
    templateName: string;
    languageCode: string;
    bodyParameters?: string[];
};

type WhatsAppApiResponse = {
    messages?: Array<{
        id: string;
        message_status?: string;
    }>;
    error?: {
        code?: number;
        error_subcode?: number;
        message?: string;
        type?: string;
    };
};

export type WhatsAppSendResult = {
    status: "SENT" | "DISABLED" | "SKIPPED_NO_RECIPIENT";
    messageId: string | null;
    testMode: boolean;
};

export type ScheduleChangeWhatsAppInput = {
    studentName: string;
    studentPhone?: string | null;
    requestedSchedulesLabel: string;
    validityLabel: string;
};

export type ScheduleChangeWhatsAppResult = WhatsAppSendResult & {
    containsScheduleDetails: boolean;
};

const getBooleanEnv = (key: string, fallback: boolean) => {
    const value = process.env[key]?.trim().toLowerCase();

    if (!value) return fallback;

    return value === "true" || value === "1" || value === "yes";
};

const getRequiredEnv = (key: string) => {
    const value = process.env[key]?.trim();

    if (!value) throw new Error(`Falta configurar la variable de WhatsApp ${key}`);

    return value;
};

const normalizeApiVersion = (value?: string | null) => {
    const normalized = value?.trim() || "v25.0";

    if (!/^v\d+\.\d+$/.test(normalized)) {
        throw new Error("La version de la API de WhatsApp no es valida");
    }

    return normalized;
};

export const normalizeWhatsAppPhoneNumber = normalizeWhatsappPhoneNumber;

const getWhatsAppConfig = (): WhatsAppConfig | null => {
    if (!getBooleanEnv("WHATSAPP_ENABLED", false)) return null;

    const testMode = getBooleanEnv("WHATSAPP_TEST_MODE", true);
    const configuredTestRecipient = process.env.WHATSAPP_TEST_RECIPIENT?.trim() || null;
    const testRecipient = configuredTestRecipient
        ? normalizeWhatsAppPhoneNumber(configuredTestRecipient)
        : null;

    if (testMode && !testRecipient) {
        throw new Error("Falta configurar un WHATSAPP_TEST_RECIPIENT valido");
    }

    if (!testMode && !getBooleanEnv("WHATSAPP_PRODUCTION_SENDS_CONFIRMED", false)) {
        throw new Error("Los envios productivos de WhatsApp no fueron confirmados");
    }

    return {
        accessToken: getRequiredEnv("ACCESS_TOKEN_WHATSAPP_BUSINESS"),
        apiVersion: normalizeApiVersion(process.env.WHATSAPP_API_VERSION),
        phoneNumberId: getRequiredEnv("PHONE_NUMBER_ID"),
        testMode,
        testRecipient,
    };
};

const getApiErrorMessage = (response: WhatsAppApiResponse, status: number) => {
    if (response.error?.code === 190) {
        return "WhatsApp API 190: el token de acceso vencio, es invalido o no corresponde a la app y al PHONE_NUMBER_ID configurados. Genera un token nuevo en Meta, reemplazalo en .env y reinicia la aplicacion";
    }

    if (response.error?.code === 131030) {
        return "WhatsApp API 131030: el destinatario no esta autorizado para recibir mensajes de prueba. Agrega y verifica WHATSAPP_TEST_RECIPIENT en la lista 'Para' de Configuracion de la API de Meta, o usa exactamente uno de los numeros ya autorizados";
    }

    const code = response.error?.code ? ` ${response.error.code}` : "";
    const subcode = response.error?.error_subcode
        ? `/${response.error.error_subcode}`
        : "";
    const message = response.error?.message?.trim() || `respuesta HTTP ${status}`;

    return `WhatsApp API${code}${subcode}: ${message}`;
};

export const sendWhatsAppTemplate = async ({
    to,
    templateName,
    languageCode,
    bodyParameters = [],
}: SendWhatsAppTemplateInput): Promise<WhatsAppSendResult> => {
    const config = getWhatsAppConfig();

    if (!config) {
        return {
            status: "DISABLED",
            messageId: null,
            testMode: true,
        };
    }

    const intendedRecipient = normalizeWhatsAppPhoneNumber(to);

    if (!intendedRecipient) {
        return {
            status: "SKIPPED_NO_RECIPIENT",
            messageId: null,
            testMode: config.testMode,
        };
    }

    const recipient = config.testMode
        ? config.testRecipient
        : intendedRecipient;

    if (!recipient) {
        return {
            status: "SKIPPED_NO_RECIPIENT",
            messageId: null,
            testMode: config.testMode,
        };
    }

    const parameters: WhatsAppTemplateParameter[] = bodyParameters.map((text) => ({
        type: "text",
        text,
    }));
    const template = {
        name: templateName,
        language: {
            code: languageCode,
        },
        components: parameters.length > 0
            ? [{
                type: "body",
                parameters,
            }]
            : undefined,
    };
    const response = await fetch(
        `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipient,
                type: "template",
                template,
            }),
            signal: AbortSignal.timeout(12_000),
        }
    );
    const data = await response.json() as WhatsAppApiResponse;

    if (!response.ok || data.error) {
        throw new Error(getApiErrorMessage(data, response.status));
    }

    const messageId = data.messages?.[0]?.id;

    if (!messageId) throw new Error("WhatsApp API no devolvio el identificador del mensaje");

    return {
        status: "SENT",
        messageId,
        testMode: config.testMode,
    };
};

export const sendScheduleChangeWhatsApp = async ({
    studentName,
    studentPhone,
    requestedSchedulesLabel,
    validityLabel,
}: ScheduleChangeWhatsAppInput): Promise<ScheduleChangeWhatsAppResult> => {
    const templateName = process.env.WHATSAPP_SCHEDULE_TEMPLATE_NAME?.trim() || "hello_world";
    const usesMetaTestTemplate = templateName === "hello_world";

    const result = await sendWhatsAppTemplate({
        to: studentPhone,
        templateName,
        languageCode: process.env.WHATSAPP_SCHEDULE_TEMPLATE_LANGUAGE?.trim()
            || (usesMetaTestTemplate ? "en_US" : "es_AR"),
        bodyParameters: usesMetaTestTemplate
            ? []
            : [studentName, requestedSchedulesLabel.replace(/\s*\n\s*/g, "; "), validityLabel],
    });

    return {
        ...result,
        containsScheduleDetails: !usesMetaTestTemplate,
    };
};

export const sendPaymentReminderWhatsApp = async (input: {
    studentName: string;
    studentPhone?: string | null;
    periodLabel: string;
    planName: string;
    amountLabel: string;
    dueDateLabel: string;
}): Promise<WhatsAppSendResult> => {
    const templateName = getRequiredEnv("WHATSAPP_PAYMENT_TEMPLATE_NAME");
    if (templateName === "hello_world") throw new Error("El recordatorio requiere una plantilla de cuota aprobada");
    return sendWhatsAppTemplate({
        to: input.studentPhone,
        templateName,
        languageCode: process.env.WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE?.trim() || "es_AR",
        bodyParameters: [input.studentName, input.periodLabel, input.planName, input.amountLabel, input.dueDateLabel]
            .map((value) => value.replace(/\s+/g, " ").trim()),
    });
};
