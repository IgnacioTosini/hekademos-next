import { createHmac, timingSafeEqual } from "node:crypto";
import { parseWhatsAppStatusEvents, recordWhatsAppStatusEvent } from "@/lib/whatsapp-delivery";

export const runtime = "nodejs";

const textResponse = (body: string, status = 200) => new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
});

export const GET = (request: Request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const verifyToken = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const configuredToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

    if (
        mode !== "subscribe"
        || !challenge
        || !configuredToken
        || verifyToken !== configuredToken
    ) {
        return textResponse("Verificación rechazada", 403);
    }

    return textResponse(challenge);
};

export const POST = async (request: Request) => {
    const appSecret = process.env.META_APP_SECRET?.trim();
    const signature = request.headers.get("x-hub-signature-256");
    const body = await request.text();

    if (!appSecret || !signature?.startsWith("sha256=")) {
        return textResponse("Firma ausente", 401);
    }

    const expected = `sha256=${createHmac("sha256", appSecret).update(body).digest("hex")}`;
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    const valid = providedBuffer.length === expectedBuffer.length
        && timingSafeEqual(providedBuffer, expectedBuffer);

    if (!valid) return textResponse("Firma inválida", 401);

    let payload: unknown;
    try {
        payload = JSON.parse(body);
    } catch {
        return textResponse("JSON inválido", 400);
    }

    try {
        for (const event of parseWhatsAppStatusEvents(payload)) {
            await recordWhatsAppStatusEvent(event);
        }
    } catch (error) {
        console.error("No se pudo registrar el estado de WhatsApp", error);
        return textResponse("No se pudo registrar el evento", 500);
    }

    // Incoming messages and history are acknowledged but not processed here.
    return textResponse("EVENT_RECEIVED");
};
