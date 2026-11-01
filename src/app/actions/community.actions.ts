"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getRateLimitMessage, rateLimitPolicies } from "@/lib/rate-limit";
import { isValidYoutubeUrl } from "@/utils/youtube";
import type { ActionResponse } from "./_shared";

export type CommunityPostInput = {
    type: string;
    title: string;
    content: string;
    videoUrl?: string;
    authorCoachId?: string;
    isPublished: boolean;
};

export type CommunityAuthorOption = {
    id: string;
    name: string;
};

export type CommunityCommentItem = {
    id: string;
    postId: string;
    studentId: string | null;
    coachId: string | null;
    authorRole: "ADMIN" | "COACH" | "STUDENT";
    authorName: string | null;
    createdByUserId: string | null;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    student: {
        firstName: string | null;
        lastName: string | null;
        user: {
            name: string | null;
            image: { url: string } | null;
        };
    } | null;
    coach: {
        specialty: string | null;
        user: {
            name: string | null;
            image: { url: string } | null;
        };
    } | null;
};

export type CommunityPostItem = {
    id: string;
    type: string;
    title: string;
    content: string;
    videoUrl: string | null;
    isPublished: boolean;
    authorCoachId: string | null;
    authorCoach: {
        specialty: string | null;
        user: {
            name: string | null;
            image: { url: string } | null;
        };
    } | null;
    createdAt: Date;
    updatedAt: Date;
    comments: CommunityCommentItem[];
    _count: { comments: number };
};

export type CommunityFeedData = {
    posts: CommunityPostItem[];
    page: number;
    totalPosts: number;
    filteredTotal: number;
    types: string[];
    viewerUserId: string;
    viewerRole: "ADMIN" | "COACH" | "STUDENT";
};

export type AdminCommunityData = {
    posts: CommunityPostItem[];
    authors: CommunityAuthorOption[];
    page: number;
    totalPosts: number;
    filteredTotal: number;
    types: string[];
};

export type CommunityPageFilters = { page?: number; query?: string; type?: string; status?: "all" | "published" | "draft" };
const communityPageSize = 10;
const adminCommunityPageSize = 6;
const normalizeCommunityPage = (page: number | undefined, total: number, pageSize: number) =>
    Math.min(Math.max(1, Math.ceil(total / pageSize)), Number.isSafeInteger(page) && (page ?? 0) > 0 ? page! : 1);
const communityWhere = (filters: CommunityPageFilters, admin: boolean): Prisma.CommunityPostWhereInput => {
    const query = filters.query?.trim().slice(0, 100) ?? "";
    const type = filters.type?.trim().slice(0, 50) ?? "";
    return {
        ...(!admin || filters.status === "published" ? { isPublished: true } : filters.status === "draft" ? { isPublished: false } : {}),
        ...(type && type !== "Todas" && type !== "all" ? { type } : {}),
        ...(query ? { OR: [
            { title: { contains: query, mode: "insensitive" } },
            { content: { contains: query, mode: "insensitive" } },
            { type: { contains: query, mode: "insensitive" } },
            { authorCoach: { user: { name: { contains: query, mode: "insensitive" } } } },
        ] } : {}),
    };
};

const commentOrder = [{ createdAt: "asc" as const }, { id: "asc" as const }];
const postSelect = {
    id: true,
    type: true,
    title: true,
    content: true,
    videoUrl: true,
    isPublished: true,
    authorCoachId: true,
    authorCoach: {
        select: {
            specialty: true,
            user: {
                select: {
                    name: true,
                    image: { select: { url: true } },
                },
            },
        },
    },
    createdAt: true,
    updatedAt: true,
    _count: { select: { comments: true } },
    comments: {
        orderBy: commentOrder,
        take: 10,
        select: {
            id: true,
            postId: true,
            studentId: true,
            coachId: true,
            authorRole: true,
            authorName: true,
            createdByUserId: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            student: {
                select: {
                    firstName: true,
                    lastName: true,
                    user: {
                        select: {
                            name: true,
                            image: { select: { url: true } },
                        },
                    },
                },
            },
            coach: {
                select: {
                    specialty: true,
                    user: {
                        select: {
                            name: true,
                            image: { select: { url: true } },
                        },
                    },
                },
            },
        },
    },
} as const;

export const getCommunityComments = async (postId: string, page = 1): Promise<ActionResponse<{ comments: CommunityCommentItem[]; total: number; page: number }>> => {
    try {
        const session = await getCurrentAuthSession();
        if (!session) return { ok: false, data: null, error: "No autorizado" };
        const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { isPublished: true, _count: { select: { comments: true } } } });
        if (!post || (!post.isPublished && session.role !== "ADMIN")) return { ok: false, data: null, error: "Publicación no disponible" };
        const safePage = normalizeCommunityPage(page, post._count.comments, 10);
        const comments = await prisma.communityComment.findMany({
            where: { postId },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            skip: (safePage - 1) * 10,
            take: 10,
            select: postSelect.comments.select,
        });
        return { ok: true, data: { comments, total: post._count.comments, page: safePage } };
    } catch {
        return { ok: false, data: null, error: "No se pudieron cargar los aportes" };
    }
};

const revalidateCommunity = () => {
    revalidatePath("/comunidad");
    revalidatePath("/admin/comunidad");
    revalidatePath("/perfil");
    revalidatePath("/coach/dashboard");
};

const consumeCommunityCommentWriteLimit = (userId: string) => consumeRateLimit({
    scope: "community-comment-write",
    identifier: userId,
    ...rateLimitPolicies.communityCommentWrite,
});

const normalizePostInput = (input: CommunityPostInput): ActionResponse<CommunityPostInput> => {
    const type = input.type?.trim().slice(0, 50) ?? "";
    const title = input.title?.trim().slice(0, 140) ?? "";
    const content = input.content?.trim().slice(0, 6000) ?? "";
    const videoUrl = input.videoUrl?.trim().slice(0, 1000) ?? "";
    const authorCoachId = input.authorCoachId?.trim() ?? "";

    if (type.length < 2) {
        return { ok: false, data: null, error: "El tipo debe tener al menos 2 caracteres" };
    }

    if (title.length < 3) {
        return { ok: false, data: null, error: "El título debe tener al menos 3 caracteres" };
    }

    if (content.length < 3) {
        return { ok: false, data: null, error: "Escribí el contenido de la publicación" };
    }

    if (videoUrl && !isValidYoutubeUrl(videoUrl)) {
        return { ok: false, data: null, error: "Ingresá una URL válida de un video de YouTube" };
    }

    return {
        ok: true,
        data: { type, title, content, videoUrl, authorCoachId, isPublished: Boolean(input.isPublished) },
    };
};

const communityAuthorExists = async (coachId: string) => {
    if (!coachId) return true;
    return Boolean(await prisma.coach.findUnique({ where: { id: coachId }, select: { id: true } }));
};

export const getAdminCommunityPosts = async (filters: CommunityPageFilters = {}): Promise<ActionResponse<AdminCommunityData>> => {
    try {
        await requireAdminSession();
        const where = communityWhere(filters, true);
        const [filteredTotal, totalPosts, types, coaches] = await Promise.all([
            prisma.communityPost.count({ where }),
            prisma.communityPost.count(),
            prisma.communityPost.groupBy({ by: ["type"], orderBy: { type: "asc" } }),
            prisma.coach.findMany({
                orderBy: { user: { name: "asc" } },
                select: { id: true, user: { select: { name: true, email: true } } },
            }),
        ]);
        const page = normalizeCommunityPage(filters.page, filteredTotal, adminCommunityPageSize);
        const posts = await prisma.communityPost.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: postSelect,
            skip: (page - 1) * adminCommunityPageSize,
            take: adminCommunityPageSize,
        });
        return {
            ok: true,
            data: {
                posts, page, totalPosts, filteredTotal, types: types.map((item) => item.type),
                authors: coaches.map((coach) => ({ id: coach.id, name: coach.user.name || coach.user.email })),
            },
        };
    } catch (error) {
        logAdminActionError("Error al obtener las publicaciones de comunidad:", error);
        return { ok: false, data: null, error: getAdminActionErrorMessage(error, "No se pudieron obtener las publicaciones") };
    }
};

export const getCommunityFeed = async (filters: CommunityPageFilters = {}): Promise<ActionResponse<CommunityFeedData>> => {
    try {
        const session = await getCurrentAuthSession();
        if (!session) return { ok: false, data: null, error: "Iniciá sesión para entrar a la comunidad" };

        const where = communityWhere(filters, false);
        const [filteredTotal, totalPosts, types] = await Promise.all([
            prisma.communityPost.count({ where }),
            prisma.communityPost.count({ where: { isPublished: true } }),
            prisma.communityPost.groupBy({ by: ["type"], where: { isPublished: true }, orderBy: { type: "asc" } }),
        ]);
        const page = normalizeCommunityPage(filters.page, filteredTotal, communityPageSize);
        const posts = await prisma.communityPost.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: postSelect, skip: (page - 1) * communityPageSize, take: communityPageSize });

        return {
            ok: true,
            data: {
                posts, page, totalPosts, filteredTotal, types: types.map((item) => item.type),
                viewerUserId: session.userId,
                viewerRole: session.role,
            },
        };
    } catch (error) {
        console.error("Error al obtener la comunidad:", error);
        return { ok: false, data: null, error: "No se pudo cargar la comunidad" };
    }
};

export const createCommunityPost = async (input: CommunityPostInput): Promise<ActionResponse<CommunityPostItem>> => {
    try {
        const session = await requireAdminSession();
        const normalized = normalizePostInput(input);
        if (!normalized.ok) return normalized;
        if (!await communityAuthorExists(normalized.data.authorCoachId ?? "")) {
            return { ok: false, data: null, error: "El coach seleccionado ya no existe" };
        }

        const post = await prisma.communityPost.create({
            data: {
                ...normalized.data,
                videoUrl: normalized.data.videoUrl || null,
                authorCoachId: normalized.data.authorCoachId || null,
                createdByName: session.name,
                createdByEmail: session.email,
            },
            select: postSelect,
        });

        await writeAuditLog({ action: "COMMUNITY_POST_CREATE", entityType: "CommunityPost", entityId: post.id, metadata: { type: post.type, title: post.title, isPublished: post.isPublished } });
        revalidateCommunity();
        return { ok: true, data: post };
    } catch (error) {
        logAdminActionError("Error al crear la publicación de comunidad:", error);
        return { ok: false, data: null, error: getAdminActionErrorMessage(error, "No se pudo crear la publicación") };
    }
};

export const updateCommunityPost = async (postId: string, input: CommunityPostInput): Promise<ActionResponse<CommunityPostItem>> => {
    try {
        await requireAdminSession();
        const normalized = normalizePostInput(input);
        if (!normalized.ok) return normalized;
        if (!await communityAuthorExists(normalized.data.authorCoachId ?? "")) {
            return { ok: false, data: null, error: "El coach seleccionado ya no existe" };
        }

        const post = await prisma.communityPost.update({
            where: { id: postId },
            data: {
                ...normalized.data,
                videoUrl: normalized.data.videoUrl || null,
                authorCoachId: normalized.data.authorCoachId || null,
            },
            select: postSelect,
        });

        await writeAuditLog({ action: "COMMUNITY_POST_UPDATE", entityType: "CommunityPost", entityId: post.id, metadata: { type: post.type, title: post.title, isPublished: post.isPublished } });
        revalidateCommunity();
        return { ok: true, data: post };
    } catch (error) {
        logAdminActionError("Error al actualizar la publicación de comunidad:", error);
        return { ok: false, data: null, error: getAdminActionErrorMessage(error, "No se pudo actualizar la publicación") };
    }
};

export const deleteCommunityPost = async (postId: string): Promise<ActionResponse<{ id: string }>> => {
    try {
        await requireAdminSession();
        const post = await prisma.communityPost.delete({ where: { id: postId }, select: { id: true, title: true } });
        await writeAuditLog({ action: "COMMUNITY_POST_DELETE", entityType: "CommunityPost", entityId: post.id, metadata: { title: post.title } });
        revalidateCommunity();
        return { ok: true, data: { id: post.id } };
    } catch (error) {
        logAdminActionError("Error al eliminar la publicación de comunidad:", error);
        return { ok: false, data: null, error: getAdminActionErrorMessage(error, "No se pudo eliminar la publicación") };
    }
};

export const createCommunityComment = async (
    postId: string,
    rawContent: string,
    selectedAuthorCoachId?: string,
): Promise<ActionResponse<CommunityCommentItem>> => {
    try {
        const session = await getCurrentAuthSession();
        if (!session) return { ok: false, data: null, error: "Iniciá sesión para participar" };

        const rateLimit = await consumeCommunityCommentWriteLimit(session.userId);
        if (!rateLimit.allowed) return { ok: false, data: null, error: getRateLimitMessage(rateLimit) };

        const content = rawContent?.trim().slice(0, 1500) ?? "";
        if (content.length < 2) return { ok: false, data: null, error: "El aporte debe tener al menos 2 caracteres" };

        const requestedCoachId = session.role === "ADMIN" ? selectedAuthorCoachId?.trim() || null : null;
        const [student, ownCoach, selectedCoach, post] = await Promise.all([
            session.role === "STUDENT"
                ? prisma.student.findUnique({
                    where: { userId: session.userId },
                    select: { id: true, firstName: true, lastName: true, user: { select: { name: true } } },
                })
                : Promise.resolve(null),
            session.role === "COACH"
                ? prisma.coach.findUnique({
                    where: { userId: session.userId },
                    select: { id: true, user: { select: { name: true } } },
                })
                : Promise.resolve(null),
            requestedCoachId
                ? prisma.coach.findUnique({
                    where: { id: requestedCoachId },
                    select: { id: true, user: { select: { name: true } } },
                })
                : Promise.resolve(null),
            prisma.communityPost.findFirst({
                where: {
                    id: postId,
                    ...(session.role === "ADMIN" ? {} : { isPublished: true }),
                },
                select: { id: true, title: true },
            }),
        ]);

        if (session.role === "STUDENT" && !student) return { ok: false, data: null, error: "No encontramos tu perfil de alumno" };
        if (session.role === "COACH" && !ownCoach) return { ok: false, data: null, error: "No encontramos tu perfil de coach" };
        if (requestedCoachId && !selectedCoach) return { ok: false, data: null, error: "El coach seleccionado ya no existe" };
        if (!post) return { ok: false, data: null, error: "La publicación ya no está disponible" };

        const coach = session.role === "COACH" ? ownCoach : selectedCoach;
        const studentName = student
            ? [student.firstName, student.lastName].filter(Boolean).join(" ") || student.user.name || "Alumno"
            : null;
        const authorRole = coach ? "COACH" : session.role;
        const authorName = coach?.user.name
            || studentName
            || (session.role === "ADMIN" ? "Administración" : session.name)
            || (session.role === "COACH" ? "Coach" : "Alumno");

        const comment = await prisma.communityComment.create({
            data: {
                postId,
                studentId: student?.id ?? null,
                coachId: coach?.id ?? null,
                authorRole,
                authorName,
                createdByUserId: session.userId,
                content,
            },
            select: postSelect.comments.select,
        });
        await writeAuditLog({
            action: "COMMUNITY_COMMENT_CREATE",
            entityType: "CommunityComment",
            entityId: comment.id,
            metadata: { postId, postTitle: post.title, authorRole, authorName, createdByUserId: session.userId },
        });
        revalidateCommunity();
        return { ok: true, data: comment };
    } catch (error) {
        console.error("Error al crear el aporte de comunidad:", error);
        return { ok: false, data: null, error: "No se pudo publicar el aporte" };
    }
};

export const updateCommunityComment = async (
    commentId: string,
    rawContent: string,
): Promise<ActionResponse<CommunityCommentItem>> => {
    try {
        const session = await getCurrentAuthSession();
        if (!session) return { ok: false, data: null, error: "No autorizado" };

        const rateLimit = await consumeCommunityCommentWriteLimit(session.userId);
        if (!rateLimit.allowed) return { ok: false, data: null, error: getRateLimitMessage(rateLimit) };

        const content = rawContent?.trim().slice(0, 1500) ?? "";
        if (content.length < 2) return { ok: false, data: null, error: "El aporte debe tener al menos 2 caracteres" };

        const existing = await prisma.communityComment.findUnique({
            where: { id: commentId },
            select: { id: true, postId: true, createdByUserId: true },
        });
        if (!existing) return { ok: false, data: null, error: "El aporte ya no existe" };
        if (session.role !== "ADMIN" && existing.createdByUserId !== session.userId) {
            return { ok: false, data: null, error: "No tenés permiso para editar este aporte" };
        }

        const comment = await prisma.communityComment.update({
            where: { id: existing.id },
            data: { content },
            select: postSelect.comments.select,
        });
        await writeAuditLog({
            action: "COMMUNITY_COMMENT_UPDATE",
            entityType: "CommunityComment",
            entityId: comment.id,
            metadata: { postId: existing.postId },
        });
        revalidateCommunity();
        return { ok: true, data: comment };
    } catch (error) {
        console.error("Error al editar el aporte de comunidad:", error);
        return { ok: false, data: null, error: "No se pudo editar el aporte" };
    }
};

export const deleteCommunityComment = async (commentId: string): Promise<ActionResponse<{ id: string }>> => {
    try {
        const session = await getCurrentAuthSession();
        if (!session) return { ok: false, data: null, error: "No autorizado" };

        const comment = await prisma.communityComment.findUnique({
            where: { id: commentId },
            select: { id: true, postId: true, createdByUserId: true },
        });
        if (!comment) return { ok: false, data: null, error: "El aporte ya no existe" };
        if (session.role !== "ADMIN" && comment.createdByUserId !== session.userId) {
            return { ok: false, data: null, error: "No tenés permiso para eliminar este aporte" };
        }

        await prisma.communityComment.delete({ where: { id: comment.id } });
        await writeAuditLog({ action: "COMMUNITY_COMMENT_DELETE", entityType: "CommunityComment", entityId: comment.id, metadata: { postId: comment.postId } });
        revalidateCommunity();
        return { ok: true, data: { id: comment.id } };
    } catch (error) {
        console.error("Error al eliminar el aporte de comunidad:", error);
        return { ok: false, data: null, error: "No se pudo eliminar el aporte" };
    }
};
