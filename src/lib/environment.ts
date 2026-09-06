export type EnvironmentSource = Record<string, string | undefined>;

export type EnvironmentIssue = {
    key: string;
    message: string;
};

const booleanValues = new Map<string, boolean>([
    ["true", true],
    ["1", true],
    ["yes", true],
    ["false", false],
    ["0", false],
    ["no", false],
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getValue = (environment: EnvironmentSource, key: string) => (
    environment[key]?.trim() ?? ""
);

export const validateProductionEnvironment = (
    environment: EnvironmentSource
): EnvironmentIssue[] => {
    const issues: EnvironmentIssue[] = [];

    const addIssue = (key: string, message: string) => {
        if (!issues.some((issue) => issue.key === key && issue.message === message)) {
            issues.push({ key, message });
        }
    };

    const requireValue = (key: string) => {
        const value = getValue(environment, key);

        if (!value) addIssue(key, "es obligatoria");

        return value;
    };

    const readBoolean = (key: string, fallback: boolean) => {
        const value = getValue(environment, key).toLowerCase();

        if (!value) return fallback;
        if (!booleanValues.has(value)) {
            addIssue(key, "debe ser true o false");
            return fallback;
        }

        return booleanValues.get(value) ?? fallback;
    };

    const readInteger = (key: string, fallback: number, minimum: number, maximum: number) => {
        const value = getValue(environment, key);

        if (!value) return fallback;

        const parsed = Number(value);

        if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
            addIssue(key, `debe ser un entero entre ${minimum} y ${maximum}`);
            return fallback;
        }

        return parsed;
    };

    const databaseUrl = requireValue("DATABASE_URL");

    if (databaseUrl) {
        try {
            const url = new URL(databaseUrl);

            if (!["postgres:", "postgresql:"].includes(url.protocol)) {
                addIssue("DATABASE_URL", "debe usar el protocolo postgresql:// o postgres://");
            }
        } catch {
            addIssue("DATABASE_URL", "no es una URL válida");
        }
    }

    const sessionSecret = requireValue("AUTH_SESSION_SECRET");

    if (sessionSecret && sessionSecret.length < 32) {
        addIssue("AUTH_SESSION_SECRET", "debe tener al menos 32 caracteres");
    }
    if (sessionSecret === "hekademos-dev-session-secret") {
        addIssue("AUTH_SESSION_SECRET", "no puede usar el secreto de desarrollo");
    }

    const appUrlKey = getValue(environment, "NEXT_PUBLIC_APP_URL")
        ? "NEXT_PUBLIC_APP_URL"
        : "AUTH_BASE_URL";
    const appUrl = requireValue(appUrlKey);

    if (appUrl) {
        try {
            const url = new URL(appUrl);

            if (url.protocol !== "https:") addIssue(appUrlKey, "debe usar HTTPS en producción");
            if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
                addIssue(appUrlKey, "no puede apuntar a localhost en producción");
            }
            if (url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname)) {
                addIssue(appUrlKey, "debe contener solamente el origen público del sitio");
            }
        } catch {
            addIssue(appUrlKey, "no es una URL válida");
        }
    }

    const adminEmail = requireValue("ADMIN_EMAIL");
    const adminPassword = requireValue("ADMIN_PASSWORD");

    if (adminEmail && !emailPattern.test(adminEmail)) {
        addIssue("ADMIN_EMAIL", "no contiene un email válido");
    }
    if (adminPassword && adminPassword.length < 12) {
        addIssue("ADMIN_PASSWORD", "debe tener al menos 12 caracteres");
    }

    requireValue("SMTP_HOST");
    const smtpPort = requireValue("SMTP_PORT");
    requireValue("SMTP_USER");
    requireValue("SMTP_PASS");
    readBoolean("SMTP_SECURE", false);

    if (smtpPort) {
        const parsedPort = Number(smtpPort);

        if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
            addIssue("SMTP_PORT", "debe ser un puerto válido entre 1 y 65535");
        }
    }

    for (const emailKey of ["EMAIL_FROM_ADDRESS", "CONTACT_TO_EMAIL", "ADMIN_NOTIFICATION_EMAIL"]) {
        const email = getValue(environment, emailKey);

        if (email && !emailPattern.test(email)) addIssue(emailKey, "no contiene un email válido");
    }

    requireValue("CLOUDINARY_CLOUD_NAME");
    requireValue("CLOUDINARY_API_KEY");
    requireValue("CLOUDINARY_API_SECRET");

    const cloudinaryFolder = getValue(environment, "CLOUDINARY_UPLOAD_FOLDER");
    if (cloudinaryFolder && (cloudinaryFolder.includes("..") || cloudinaryFolder.startsWith("/"))) {
        addIssue("CLOUDINARY_UPLOAD_FOLDER", "debe ser una carpeta relativa y no puede contener '..'");
    }

    const reminderDay = readInteger("PAYMENT_REMINDER_DAY", 1, 1, 28);
    const lateWarningDay = readInteger("PAYMENT_LATE_WARNING_DAY", 9, 1, 28);
    const dueDay = readInteger("PAYMENT_DUE_DAY", 10, 1, 28);
    readInteger("PAYMENT_LATE_SURCHARGE_PERCENT", 20, 1, 100);

    if (!(reminderDay < lateWarningDay && lateWarningDay <= dueDay)) {
        addIssue(
            "PAYMENT_REMINDER_DAY/PAYMENT_LATE_WARNING_DAY/PAYMENT_DUE_DAY",
            "deben respetar recordatorio < aviso final <= vencimiento"
        );
    }

    const whatsappEnabled = readBoolean("WHATSAPP_ENABLED", false);
    const remindersEnabled = readBoolean("PAYMENT_REMINDERS_ENABLED", false);
    if (remindersEnabled) {
        const cronSecret = requireValue("CRON_SECRET");
        if (cronSecret && cronSecret.length < 32) addIssue("CRON_SECRET", "debe tener al menos 32 caracteres");
        if (reminderDay !== 1) addIssue("PAYMENT_REMINDER_DAY", "debe ser 1 para coincidir con el cron mensual");
        if (whatsappEnabled) {
            const name = requireValue("WHATSAPP_PAYMENT_TEMPLATE_NAME");
            const language = requireValue("WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE");
            if (name && (!/^[a-z0-9_]+$/.test(name) || name === "hello_world")) {
                addIssue("WHATSAPP_PAYMENT_TEMPLATE_NAME", "debe ser una plantilla de cuota aprobada, no hello_world");
            }
            if (language && !/^[a-z]{2}(?:_[A-Z]{2})?$/.test(language)) {
                addIssue("WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE", "debe tener un formato como es_AR");
            }
        }
    }

    if (whatsappEnabled) {
        const token = requireValue("ACCESS_TOKEN_WHATSAPP_BUSINESS");
        const phoneNumberId = requireValue("PHONE_NUMBER_ID");
        const accountId = getValue(environment, "WHATSAPP_BUSINESS_ACCOUNT_ID");
        const apiVersion = getValue(environment, "WHATSAPP_API_VERSION") || "v25.0";
        const templateName = requireValue("WHATSAPP_SCHEDULE_TEMPLATE_NAME");
        const templateLanguage = requireValue("WHATSAPP_SCHEDULE_TEMPLATE_LANGUAGE");
        const testMode = readBoolean("WHATSAPP_TEST_MODE", true);
        const productionSendsConfirmed = readBoolean("WHATSAPP_PRODUCTION_SENDS_CONFIRMED", false);
        const testRecipient = testMode ? requireValue("WHATSAPP_TEST_RECIPIENT") : "";

        if (token && token.length < 20) {
            addIssue("ACCESS_TOKEN_WHATSAPP_BUSINESS", "parece demasiado corto para un token de Meta");
        }
        if (phoneNumberId && !/^\d+$/.test(phoneNumberId)) {
            addIssue("PHONE_NUMBER_ID", "debe contener solamente números");
        }
        if (accountId && !/^\d+$/.test(accountId)) {
            addIssue("WHATSAPP_BUSINESS_ACCOUNT_ID", "debe contener solamente números");
        }
        if (!/^v\d+\.\d+$/.test(apiVersion)) {
            addIssue("WHATSAPP_API_VERSION", "debe tener un formato como v25.0");
        }
        if (templateName && !/^[a-z0-9_]+$/.test(templateName)) {
            addIssue("WHATSAPP_SCHEDULE_TEMPLATE_NAME", "solo puede contener minúsculas, números y guiones bajos");
        }
        if (templateName === "hello_world") {
            addIssue("WHATSAPP_SCHEDULE_TEMPLATE_NAME", "no puede usar hello_world en producción");
        }
        if (templateLanguage && !/^[a-z]{2}(?:_[A-Z]{2})?$/.test(templateLanguage)) {
            addIssue("WHATSAPP_SCHEDULE_TEMPLATE_LANGUAGE", "debe tener un formato como es_AR");
        }
        if (testRecipient) {
            const digits = testRecipient.replace(/\D/g, "");
            if (!/^\+?[0-9\s().-]+$/.test(testRecipient) || digits.length < 8 || digits.length > 15) {
                addIssue(
                    "WHATSAPP_TEST_RECIPIENT",
                    "debe coincidir con el destinatario de prueba autorizado por Meta"
                );
            }
        }
        if (!testMode && !productionSendsConfirmed) {
            addIssue("WHATSAPP_PRODUCTION_SENDS_CONFIRMED", "debe ser true para habilitar envíos reales");
        }
    }

    return issues;
};

export class ProductionEnvironmentError extends Error {
    readonly issues: EnvironmentIssue[];

    constructor(issues: EnvironmentIssue[]) {
        super([
            `Configuración de producción inválida (${issues.length} ${issues.length === 1 ? "problema" : "problemas"}):`,
            ...issues.map((issue) => `- ${issue.key}: ${issue.message}`),
        ].join("\n"));
        this.name = "ProductionEnvironmentError";
        this.issues = issues;
    }
}

export const assertProductionEnvironment = (environment: EnvironmentSource = process.env) => {
    const issues = validateProductionEnvironment(environment);

    if (issues.length > 0) throw new ProductionEnvironmentError(issues);
};

export const shouldValidateProductionAtRuntime = (environment: EnvironmentSource = process.env) => (
    environment.NODE_ENV === "production"
    && (
        environment.VERCEL_ENV === "production"
        || getValue(environment, "HEKADEMOS_VALIDATE_PRODUCTION_ENV").toLowerCase() === "true"
    )
);
