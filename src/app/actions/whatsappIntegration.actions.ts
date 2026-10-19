"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit-log";
import {
    removeWhatsAppIntegration,
    saveWhatsAppIntegration,
} from "@/lib/whatsapp-integration";
import type { ActionResponse } from "./_shared";

type MetaTokenResponse = {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string; code?: number };
};

type MetaPhoneNumbersResponse = {
    data?: Array<{
        id?: string;
        display_phone_number?: string;
        verified_name?: string;
    }>;
    error?: { message?: string; code?: number };
};

type MetaApiResponse = {
    success?: boolean;
    error?: { message?: string; code?: number };
};

export type WhatsAppConnectionResult = {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string | null;
    verifiedName: string | null;
};

const apiVersion = () => process.env.WHATSAPP_API_VERSION?.trim() || "v25.0";

const getMetaError = (data: { error?: { message?: string; code?: number } }, fallback: string) => {
    if (!data.error) return fallback;
    return `Meta API${data.error.code ? ` ${data.error.code}` : ""}: ${data.error.message || fallback}`;
};

export const completeWhatsAppCoexistence = async (input: {
    code: string;
    wabaId: string;
}): Promise<ActionResponse<WhatsAppConnectionResult>> => {
    try {
        const session = await requireAdminSession();
        const code = input.code?.trim();
        const wabaId = input.wabaId?.trim();

        if (!code || code.length > 4096 || !/^\d+$/.test(wabaId)) {
            throw new Error("Meta no devolvió una autorización válida");
        }

        const appId = process.env.META_APP_ID?.trim();
        const appSecret = process.env.META_APP_SECRET?.trim();
        if (!appId || !appSecret) throw new Error("Faltan META_APP_ID o META_APP_SECRET");

        const tokenUrl = new URL(`https://graph.facebook.com/${apiVersion()}/oauth/access_token`);
        tokenUrl.searchParams.set("client_id", appId);
        tokenUrl.searchParams.set("client_secret", appSecret);
        tokenUrl.searchParams.set("code", code);

        const tokenResponse = await fetch(tokenUrl, { signal: AbortSignal.timeout(12_000) });
        const tokenData = await tokenResponse.json() as MetaTokenResponse;
        if (!tokenResponse.ok || tokenData.error || !tokenData.access_token) {
            throw new Error(getMetaError(tokenData, "No se pudo canjear la autorización de Meta"));
        }

        const headers = { Authorization: `Bearer ${tokenData.access_token}` };
        const phoneResponse = await fetch(
            `https://graph.facebook.com/${apiVersion()}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
            { headers, signal: AbortSignal.timeout(12_000) }
        );
        const phoneData = await phoneResponse.json() as MetaPhoneNumbersResponse;
        if (!phoneResponse.ok || phoneData.error) {
            throw new Error(getMetaError(phoneData, "No se pudo consultar el número conectado"));
        }

        const phones = (phoneData.data ?? []).filter((phone) => phone.id);
        if (phones.length !== 1) {
            throw new Error(phones.length === 0
                ? "Meta no devolvió ningún número para la cuenta conectada"
                : "La cuenta tiene más de un número; usá una WABA con un único número para esta instalación");
        }

        const subscriptionResponse = await fetch(
            `https://graph.facebook.com/${apiVersion()}/${wabaId}/subscribed_apps`,
            { method: "POST", headers, signal: AbortSignal.timeout(12_000) }
        );
        const subscriptionData = await subscriptionResponse.json() as MetaApiResponse;
        if (!subscriptionResponse.ok || subscriptionData.error) {
            throw new Error(getMetaError(subscriptionData, "No se pudo vincular la app con la cuenta de WhatsApp"));
        }

        const phone = phones[0];
        const tokenExpiresAt = tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null;

        await saveWhatsAppIntegration({
            accessToken: tokenData.access_token,
            wabaId,
            phoneNumberId: phone.id!,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            tokenExpiresAt,
            connectedByUserId: session.userId,
        });

        await writeAuditLog({
            action: "WHATSAPP_INTEGRATION_CONNECT",
            entityType: "WhatsAppIntegration",
            entityId: wabaId,
            metadata: { phoneNumberId: phone.id, displayPhoneNumber: phone.display_phone_number },
        });
        revalidatePath("/admin/whatsapp");

        return {
            ok: true,
            data: {
                wabaId,
                phoneNumberId: phone.id!,
                displayPhoneNumber: phone.display_phone_number ?? null,
                verifiedName: phone.verified_name ?? null,
            },
        };
    } catch (error) {
        logAdminActionError("Error al completar la coexistencia de WhatsApp:", error);
        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(
                error,
                error instanceof Error ? error.message : "No se pudo conectar WhatsApp"
            ),
        };
    }
};

export const disconnectManagedWhatsApp = async (): Promise<ActionResponse> => {
    try {
        await requireAdminSession();
        await removeWhatsAppIntegration();
        await writeAuditLog({
            action: "WHATSAPP_INTEGRATION_DISCONNECT",
            entityType: "WhatsAppIntegration",
            entityId: "primary",
        });
        revalidatePath("/admin/whatsapp");
        return { ok: true, data: null };
    } catch (error) {
        logAdminActionError("Error al desactivar la integración de WhatsApp:", error);
        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo desactivar la integración"),
        };
    }
};
