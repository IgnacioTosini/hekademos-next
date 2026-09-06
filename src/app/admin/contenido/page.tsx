import type { Metadata } from "next";
import { SiteContentEditor } from "@/components/admin/SiteContentEditor";
import { getHomePageContent } from "@/lib/site-content";

export const metadata: Metadata = {
    title: "Contenido web",
    description: "Edición del contenido de la portada de Hekademos.",
};

export default async function ContenidoPage() {
    const content = await getHomePageContent();
    return <SiteContentEditor initialContent={content} />;
}
