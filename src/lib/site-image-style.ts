import type { CSSProperties } from "react";
import type { SiteContentImage } from "@/lib/home-page-content";

export const siteImageStyle = (image: SiteContentImage): CSSProperties => ({
    objectPosition: `${image.positionX ?? 50}% ${image.positionY ?? 50}%`,
    transform: `scale(${(image.scale ?? 100) / 100})`,
});
