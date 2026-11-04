import { prisma } from "@/lib/prisma";

export type WhatsAppDeliveryStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";

type StatusEvent = {
    messageId: string;
    status: WhatsAppDeliveryStatus;
    occurredAt: Date;
    errorCode: number | null;
    errorText: string | null;
};

const statusRank: Record<WhatsAppDeliveryStatus, number> = {
    SENT: 1, FAILED: 2, DELIVERED: 3, READ: 4,
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
    value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
);

export const parseWhatsAppStatusEvents = (payload: unknown): StatusEvent[] => {
    const root = asRecord(payload);
    if (root?.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return [];
    const events: StatusEvent[] = [];
    for (const entryValue of root.entry) {
        const entry = asRecord(entryValue);
        if (!Array.isArray(entry?.changes)) continue;
        for (const changeValue of entry.changes) {
            const change = asRecord(changeValue);
            if (change?.field !== "messages") continue;
            const value = asRecord(change.value);
            if (!Array.isArray(value?.statuses)) continue;
            for (const statusValue of value.statuses) {
                const item = asRecord(statusValue);
                const id = item?.id;
                const rawStatus = item?.status;
                const rawTimestamp = item?.timestamp;
                if (typeof id !== "string" || !id.startsWith("wamid.") || id.length > 512
                    || typeof rawStatus !== "string") continue;
                const status = rawStatus.toUpperCase();
                if (!(status in statusRank)) continue;
                const seconds = typeof rawTimestamp === "string" ? Number(rawTimestamp) : rawTimestamp;
                if (typeof seconds !== "number" || !Number.isSafeInteger(seconds)
                    || seconds < 1_500_000_000 || seconds > Date.now() / 1000 + 300) continue;
                const error = Array.isArray(item?.errors) ? asRecord(item.errors[0]) : null;
                const errorCode = typeof error?.code === "number" && Number.isSafeInteger(error.code) ? error.code : null;
                const errorText = typeof error?.title === "string" ? error.title.slice(0, 500) : null;
                events.push({
                    messageId: id,
                    status: status as WhatsAppDeliveryStatus,
                    occurredAt: new Date(seconds * 1000),
                    errorCode: status === "FAILED" ? errorCode : null,
                    errorText: status === "FAILED" ? errorText : null,
                });
            }
        }
    }
    return events;
};

export const recordAcceptedWhatsAppMessage = async ({
    messageId, kind, referenceId,
}: {
    messageId: string;
    kind: "PAYMENT_REMINDER" | "SCHEDULE_CHANGE";
    referenceId: string;
}) => {
    // The status webhook may have created the row before the API caller finishes.
    await prisma.whatsAppMessageDelivery.upsert({
        where: { messageId },
        create: { messageId, kind, referenceId, acceptedAt: new Date() },
        update: { kind, referenceId, acceptedAt: new Date() },
    });
};

export const recordWhatsAppStatusEvent = async (event: StatusEvent) => {
    try {
        await prisma.whatsAppMessageDelivery.create({
            data: {
                messageId: event.messageId,
                status: event.status,
                statusAt: event.occurredAt,
                errorCode: event.errorCode,
                errorText: event.errorText,
            },
        });
        return;
    } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") throw error;
    }

    // Duplicate and out-of-order callbacks cannot move a delivery backwards.
    const lowerStatuses = ["ACCEPTED", ...Object.entries(statusRank)
        .filter(([, rank]) => rank < statusRank[event.status])
        .map(([status]) => status)];
    await prisma.whatsAppMessageDelivery.updateMany({
        where: {
            messageId: event.messageId,
            status: { in: lowerStatuses },
            OR: [{ statusAt: null }, { statusAt: { lte: event.occurredAt } }],
        },
        data: {
            status: event.status,
            statusAt: event.occurredAt,
            errorCode: event.errorCode,
            errorText: event.errorText,
        },
    });
};
