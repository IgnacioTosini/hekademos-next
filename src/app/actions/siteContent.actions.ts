"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit-log";
import type { HomePageContent } from "@/lib/home-page-content";
import { prisma } from "@/lib/prisma";
import { HOME_PAGE_CONTENT_CACHE_TAG, HOME_PAGE_CONTENT_KEY, normalizeHomePageContent } from "@/lib/site-content";
import type { ActionResponse } from "./_shared";

export const updateHomePageContent = async (input: HomePageContent): Promise<ActionResponse<HomePageContent>> => {
    try {
        const session = await requireAdminSession();
        const content = normalizeHomePageContent(input);
        const value = JSON.parse(JSON.stringify(content));

        await prisma.siteContent.upsert({
            where: { key: HOME_PAGE_CONTENT_KEY },
            create: { key: HOME_PAGE_CONTENT_KEY, value, updatedByUserId: session.userId },
            update: { value, updatedByUserId: session.userId },
        });

        await writeAuditLog({
            action: "SITE_CONTENT_UPDATE",
            entityType: "SiteContent",
            entityId: HOME_PAGE_CONTENT_KEY,
            metadata: { sectionCount: Object.keys(content).length },
        });

        updateTag(HOME_PAGE_CONTENT_CACHE_TAG);
        revalidatePath("/", "layout");
        revalidatePath("/admin/contenido");

        return { ok: true, data: content };
    } catch (error) {
        logAdminActionError("Error al actualizar el contenido de la portada:", error);
        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo guardar el contenido de la portada"),
        };
    }
};
