import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  return ["/", "/privacidad", "/terminos-y-condiciones"].map((path) => ({
    url: new URL(path, siteUrl).toString(),
  }));
}
