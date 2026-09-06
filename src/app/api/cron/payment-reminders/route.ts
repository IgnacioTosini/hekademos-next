import { timingSafeEqual } from "node:crypto";
import { getArgentinaCalendarDate, paymentRemindersEnabled } from "@/lib/payment-reminder-calendar";
import { sendCurrentMonthlyPaymentReminders } from "@/services/payment-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET?.trim();
    const actual = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret ?? ""}`);
    if (!secret || secret.length < 32 || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    if (process.env.VERCEL_ENV !== "production" || !paymentRemindersEnabled()) {
        return Response.json({ skipped: "Automatizacion deshabilitada o entorno no productivo" });
    }
    const now = new Date();
    if (getArgentinaCalendarDate(now).day !== 1) {
        return Response.json({ skipped: "Los recordatorios automaticos se envian el dia 1 de Argentina" });
    }
    try {
        const result = await sendCurrentMonthlyPaymentReminders(now);
        console.info("Recordatorios mensuales de cuota", result);
        return Response.json(result, { status: result.incomplete || result.failedCount ? 503 : 200 });
    } catch {
        console.error("No se pudo completar la tarea mensual de recordatorios de cuota");
        return Response.json({ error: "No se pudo completar el envio; revisar registros antes de reintentar" }, { status: 500 });
    }
}
