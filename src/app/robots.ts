import type { MetadataRoute } from "next";
import { getSiteUrl, isSearchIndexingEnabled } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: isSearchIndexingEnabled()
      ? { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/", "/auth/", "/coach/", "/comunidad", "/dashboard", "/perfil", "/student/", "/vista-previa"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
