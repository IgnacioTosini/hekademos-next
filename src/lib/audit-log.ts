import { randomUUID } from "node:crypto";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

type WriteAuditLogInput = {
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
};

export const writeAuditLog = async ({
    action,
    entityType,
    entityId,
    metadata,
}: WriteAuditLogInput) => {
    try {
        const session = await getCurrentAuthSession();
        const metadataJson = metadata ? JSON.stringify(metadata) : null;

        await prisma.$executeRaw`
            INSERT INTO "AuditLog" (
                "id",
                "actorUserId",
                "actorEmail",
                "actorRole",
                "action",
                "entityType",
                "entityId",
                "metadata"
            )
            VALUES (
                ${randomUUID()},
                ${session?.userId ?? null},
                ${session?.email ?? null},
                ${session?.role ?? null}::"Role",
                ${action},
                ${entityType},
                ${entityId ?? null},
                CAST(${metadataJson} AS jsonb)
            )
        `;
    } catch (error) {
        console.error("Error al escribir el registro de auditoria:", error);
    }
};
