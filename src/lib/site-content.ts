import { unstable_cache } from "next/cache";
import { cache } from "react";
import { cloneDefaultHomePageContent, defaultHomePageContent, type HomePageContent } from "@/lib/home-page-content";
import { prisma } from "@/lib/prisma";
import { isValidYoutubeUrl } from "@/utils/youtube";

export const HOME_PAGE_CONTENT_KEY = "home-page";
export const HOME_PAGE_CONTENT_CACHE_TAG = "home-page-content";

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === "object" && value !== null && !Array.isArray(value)
);

const normalizeString = (value: unknown, fallback: string, path: string) => {
    if (typeof value !== "string") return fallback;

    const normalized = value.slice(0, 5000);
    const lowerPath = path.toLowerCase();

    if (lowerPath.endsWith("videourl")) {
        if (!normalized.trim()) return "";
        return isValidYoutubeUrl(normalized) ? normalized : fallback;
    }

    if (lowerPath.endsWith(".icon")) {
        return ["people", "heart", "trend"].includes(normalized) ? normalized : fallback;
    }

    if (lowerPath.endsWith(".url") && lowerPath.includes("image")) {
        return normalized.startsWith("/") || normalized.startsWith("https://res.cloudinary.com/")
            ? normalized
            : fallback;
    }

    if (lowerPath.endsWith(".url") && (lowerPath.includes("logo") || lowerPath.includes("background"))) {
        return normalized.startsWith("/") || normalized.startsWith("https://res.cloudinary.com/")
            ? normalized
            : fallback;
    }

    if (lowerPath.endsWith("url") || lowerPath.endsWith("href")) {
        return /^(https?:\/\/|\/#|#|\/)/i.test(normalized) ? normalized : fallback;
    }

    return normalized;
};

const normalizeFromTemplate = (template: unknown, value: unknown, path = "home"): unknown => {
    if (typeof template === "string") return normalizeString(value, template, path);

    if (Array.isArray(template)) {
        if (!Array.isArray(value)) return structuredClone(template);
        if (template.length === 0) return [];
        return value.slice(0, 12).map((item, index) => normalizeFromTemplate(template[0], item, `${path}.${index}`));
    }

    if (isRecord(template)) {
        const incoming = isRecord(value) ? value : {};
        return Object.fromEntries(Object.entries(template).map(([key, childTemplate]) => [
            key,
            normalizeFromTemplate(childTemplate, incoming[key], `${path}.${key}`),
        ]));
    }

    return template;
};

export const normalizeHomePageContent = (value: unknown): HomePageContent => (
    normalizeFromTemplate(defaultHomePageContent, value) as HomePageContent
);

const getStoredHomePageContent = unstable_cache(
    () => prisma.siteContent.findUnique({
        where: { key: HOME_PAGE_CONTENT_KEY },
        select: { value: true },
    }),
    [HOME_PAGE_CONTENT_KEY],
    {
        tags: [HOME_PAGE_CONTENT_CACHE_TAG],
        revalidate: 3600,
    }
);

export const getHomePageContent = cache(async (): Promise<HomePageContent> => {
    try {
        const stored = await getStoredHomePageContent();

        return stored ? normalizeHomePageContent(stored.value) : cloneDefaultHomePageContent();
    } catch (error) {
        console.error("Error al obtener el contenido de la portada:", error);
        return cloneDefaultHomePageContent();
    }
});
