"use server";

import { Prisma } from '@/generated/prisma/client';
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { auditActionLabels, auditEntityLabels } from '@/lib/audit-labels';
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

export type AuditLogFilters = {
    page?: number;
    query?: string;
    actionGroup?: string;
    actorRole?: string;
    date?: string;
};

export type AuditLogPage = {
    logs: AuditLog[];
    total: number;
    filteredTotal: number;
    page: number;
};

const auditPageSize = 20;

export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<ActionResponse<AuditLogPage>> => {
    try {
        await requireAdminSession();
        const conditions: Prisma.Sql[] = [];
        const actionGroups: Record<string, string[]> = {
            payments: ['PAYMENT_'], attendance: ['ATTENDANCE_'],
            students: ['STUDENT_', 'SCHEDULE_'], community: ['COMMUNITY_'],
            content: ['SITE_CONTENT_'], whatsapp: ['WHATSAPP_'],
        };
        const prefixes = actionGroups[filters.actionGroup ?? ''];
        if (prefixes) conditions.push(Prisma.sql`(${Prisma.join(prefixes.map((prefix) => Prisma.sql`LEFT("action", ${prefix.length}::int) = ${prefix}`), ' OR ')})`);
        if (['ADMIN', 'COACH', 'STUDENT'].includes(filters.actorRole ?? '')) {
            conditions.push(Prisma.sql`"actorRole"::text = ${filters.actorRole}`);
        }
        if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date) && !Number.isNaN(Date.parse(filters.date))) {
            conditions.push(Prisma.sql`("createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = ${filters.date}::date`);
        }
        const query = filters.query?.trim().slice(0, 100);
        if (query) {
            const search = `%${query}%`;
            const matchingActions = Object.entries(auditActionLabels)
                .filter(([, label]) => label.toLowerCase().includes(query.toLowerCase()))
                .map(([action]) => action);
            const matchingEntities = Object.entries(auditEntityLabels)
                .filter(([, label]) => label.toLowerCase().includes(query.toLowerCase()))
                .map(([entity]) => entity);
            const matchingRoles = Object.entries({ ADMIN: 'Admin', COACH: 'Coach', STUDENT: 'Alumno' })
                .filter(([, label]) => label.toLowerCase().includes(query.toLowerCase()))
                .map(([role]) => role);
            conditions.push(Prisma.sql`(
                "actorEmail" ILIKE ${search} OR "action" ILIKE ${search}
                OR "entityType" ILIKE ${search} OR "metadata"::text ILIKE ${search}
                ${matchingActions.length ? Prisma.sql`OR "action" IN (${Prisma.join(matchingActions)})` : Prisma.empty}
                ${matchingEntities.length ? Prisma.sql`OR "entityType" IN (${Prisma.join(matchingEntities)})` : Prisma.empty}
                ${matchingRoles.length ? Prisma.sql`OR "actorRole"::text IN (${Prisma.join(matchingRoles)})` : Prisma.empty}
            )`);
        }
        const where = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` : Prisma.empty;
        const total = await prisma.auditLog.count();
        const matchingTotal = conditions.length
            ? Number((await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`SELECT COUNT(*) AS count FROM "AuditLog" ${where}`))[0].count)
            : total;
        const requestedPage = Number.isSafeInteger(filters.page) ? Math.max(1, filters.page!) : 1;
        const page = Math.min(requestedPage, Math.max(1, Math.ceil(matchingTotal / auditPageSize)));
        const logs = await prisma.$queryRaw<AuditLog[]>(Prisma.sql`
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
            ${where}
            ORDER BY "createdAt" DESC, "id" DESC
            LIMIT ${auditPageSize} OFFSET ${(page - 1) * auditPageSize}
        `);

        return {
            ok: true,
            data: { logs, total, filteredTotal: matchingTotal, page },
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
