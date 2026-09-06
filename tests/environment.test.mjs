import assert from "node:assert/strict";
import { test } from "node:test";

import {
    shouldValidateProductionAtRuntime,
    validateProductionEnvironment,
} from "../src/lib/environment.ts";

const validEnvironment = () => ({
    DATABASE_URL: "postgresql://hekademos:secret@database.example.com:5432/hekademos",
    AUTH_SESSION_SECRET: "qa-session-secret-with-more-than-32-characters",
    NEXT_PUBLIC_APP_URL: "https://hekademos.example.com",
    ADMIN_EMAIL: "admin@hekademos.example.com",
    ADMIN_PASSWORD: "una-clave-administrativa-segura",
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    SMTP_USER: "notificaciones@hekademos.example.com",
    SMTP_PASS: "smtp-secret",
    EMAIL_FROM_ADDRESS: "notificaciones@hekademos.example.com",
    CONTACT_TO_EMAIL: "contacto@hekademos.example.com",
    CLOUDINARY_CLOUD_NAME: "hekademos",
    CLOUDINARY_API_KEY: "123456789",
    CLOUDINARY_API_SECRET: "cloudinary-secret",
    CLOUDINARY_UPLOAD_FOLDER: "Hekademos",
    PAYMENT_REMINDER_DAY: "1",
    PAYMENT_LATE_WARNING_DAY: "9",
    PAYMENT_DUE_DAY: "10",
    PAYMENT_LATE_SURCHARGE_PERCENT: "20",
    WHATSAPP_ENABLED: "false",
});

const issueKeys = (environment) => (
    new Set(validateProductionEnvironment(environment).map((issue) => issue.key))
);

test("automatización de cuotas exige secreto cron y plantilla productiva", () => {
    const base = { ...validEnvironment(), PAYMENT_REMINDERS_ENABLED: "true" };
    assert.equal(issueKeys(base).has("CRON_SECRET"), true);
    assert.equal(issueKeys({ ...base, CRON_SECRET: "short" }).has("CRON_SECRET"), true);
    assert.deepEqual(validateProductionEnvironment({ ...base, CRON_SECRET: "a".repeat(32) }), []);
    const keys = issueKeys({ ...base, WHATSAPP_ENABLED: "true", WHATSAPP_PAYMENT_TEMPLATE_NAME: "hello_world", WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE: "es-ar" });
    assert.equal(keys.has("WHATSAPP_PAYMENT_TEMPLATE_NAME"), true);
    assert.equal(keys.has("WHATSAPP_PAYMENT_TEMPLATE_LANGUAGE"), true);
    assert.equal(issueKeys({ ...base, PAYMENT_REMINDER_DAY: "2" }).has("PAYMENT_REMINDER_DAY"), true);
});

test("una configuración productiva completa es válida", () => {
    assert.deepEqual(validateProductionEnvironment(validEnvironment()), []);
});

test("se rechazan secretos, URLs y conexiones inseguras o incompletas", () => {
    const environment = {
        ...validEnvironment(),
        DATABASE_URL: "mysql://database.example.com/hekademos",
        AUTH_SESSION_SECRET: "corto",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        ADMIN_PASSWORD: "123456",
        SMTP_PORT: "99999",
    };
    const keys = issueKeys(environment);

    for (const key of ["DATABASE_URL", "AUTH_SESSION_SECRET", "NEXT_PUBLIC_APP_URL", "ADMIN_PASSWORD", "SMTP_PORT"]) {
        assert.equal(keys.has(key), true, `Faltó detectar el problema de ${key}`);
    }
});

test("WhatsApp deshabilitado no exige credenciales y el modo productivo sí las controla", () => {
    assert.deepEqual(validateProductionEnvironment(validEnvironment()), []);

    const keys = issueKeys({
        ...validEnvironment(),
        WHATSAPP_ENABLED: "true",
        WHATSAPP_TEST_MODE: "true",
        WHATSAPP_PRODUCTION_SENDS_CONFIRMED: "false",
        ACCESS_TOKEN_WHATSAPP_BUSINESS: "token-corto",
        PHONE_NUMBER_ID: "phone-id",
        WHATSAPP_BUSINESS_ACCOUNT_ID: "account-id",
        WHATSAPP_API_VERSION: "25",
        WHATSAPP_SCHEDULE_TEMPLATE_NAME: "hello_world",
        WHATSAPP_SCHEDULE_TEMPLATE_LANGUAGE: "es-ar",
    });

    for (const key of [
        "WHATSAPP_TEST_MODE",
        "WHATSAPP_PRODUCTION_SENDS_CONFIRMED",
        "ACCESS_TOKEN_WHATSAPP_BUSINESS",
        "PHONE_NUMBER_ID",
        "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "WHATSAPP_API_VERSION",
        "WHATSAPP_SCHEDULE_TEMPLATE_NAME",
        "WHATSAPP_SCHEDULE_TEMPLATE_LANGUAGE",
    ]) {
        assert.equal(keys.has(key), true, `Faltó detectar el problema de ${key}`);
    }
});

test("se validan booleanos, fechas de cobro y rutas de Cloudinary", () => {
    const keys = issueKeys({
        ...validEnvironment(),
        SMTP_SECURE: "quizás",
        CLOUDINARY_UPLOAD_FOLDER: "../secretos",
        PAYMENT_REMINDER_DAY: "15",
        PAYMENT_LATE_WARNING_DAY: "5",
        PAYMENT_DUE_DAY: "31",
        PAYMENT_LATE_SURCHARGE_PERCENT: "200",
    });

    for (const key of [
        "SMTP_SECURE",
        "CLOUDINARY_UPLOAD_FOLDER",
        "PAYMENT_DUE_DAY",
        "PAYMENT_LATE_SURCHARGE_PERCENT",
        "PAYMENT_REMINDER_DAY/PAYMENT_LATE_WARNING_DAY/PAYMENT_DUE_DAY",
    ]) {
        assert.equal(keys.has(key), true, `Faltó detectar el problema de ${key}`);
    }
});

test("la validación automática de arranque solo se activa en producción", () => {
    assert.equal(shouldValidateProductionAtRuntime({
        NODE_ENV: "development",
        HEKADEMOS_VALIDATE_PRODUCTION_ENV: "true",
    }), false);
    assert.equal(shouldValidateProductionAtRuntime({
        NODE_ENV: "production",
        HEKADEMOS_VALIDATE_PRODUCTION_ENV: "true",
    }), true);
    assert.equal(shouldValidateProductionAtRuntime({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
    }), true);
});
