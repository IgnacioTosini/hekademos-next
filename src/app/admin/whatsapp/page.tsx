import type { Metadata } from "next";
import { WhatsAppIntegrationPanel } from "@/components/admin/WhatsAppIntegrationPanel";
import { getWhatsAppIntegrationSummary } from "@/lib/whatsapp-integration";

export const metadata: Metadata = {
    title: "WhatsApp Business",
    description: "Configuración de WhatsApp Business de Hekademos.",
};

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
    const integration = await getWhatsAppIntegrationSummary();

    return (
        <WhatsAppIntegrationPanel
            appId={process.env.META_APP_ID?.trim() || null}
            configId={process.env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || null}
            serverConfigured={Boolean(
                process.env.META_APP_SECRET?.trim()
                && process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY?.trim()
                && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
            )}
            apiVersion={process.env.WHATSAPP_API_VERSION?.trim() || "v25.0"}
            integration={integration ? {
                wabaId: integration.wabaId,
                phoneNumberId: integration.phoneNumberId,
                displayPhoneNumber: integration.displayPhoneNumber,
                verifiedName: integration.verifiedName,
                tokenExpiresAt: integration.tokenExpiresAt?.toISOString() || null,
            } : null}
        />
    );
}
