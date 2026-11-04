import { getConfiguredAppBaseUrl } from "@/lib/app-url";

export const getSiteUrl = () => getConfiguredAppBaseUrl() ?? "https://hekademos.vercel.app";

export const isSearchIndexingEnabled = () => process.env.VERCEL_ENV !== "preview";
