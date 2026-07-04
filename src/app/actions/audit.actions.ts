"use server";

import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types/schema/users";
import type { ActionResponse } from "./_shared";

export type AuditLog = {
    id: string;
    actorUserId: string | null;
    actorEmail: string | null;
    actorRole: Role | null;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: unknown;
    createdAt: Date;
};

export const getAuditLogs = async (): Promise<ActionResponse<AuditLog[]>> => {
    try {
        await requireAdminSession();

        const logs = await prisma.$queryRaw<AuditLog[]>`
            SELECT
                "id",
                "actorUserId",
                "actorEmail",
                "actorRole",
                "action",
                "entityType",
                "entityId",
                "metadata",
                "createdAt"
            FROM "AuditLog"
            ORDER BY "createdAt" DESC
            LIMIT 150
        `;

        return {
            ok: true,
            data: logs,
        };
    } catch (error) {
        logAdminActionError("Error al obtener los registros de auditoria:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo obtener la auditoria"),
        };
    }
};
