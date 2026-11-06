import type { HomePageContent, SiteContentImage } from "@/lib/home-page-content";
import type { SiteImageSection } from "@/lib/site-image-sections";

export type PathPart = string | number;
export type PendingImage = { file: File; previewUrl: string };

export const sectionLabels: Record<keyof HomePageContent, string> = {
    navigation: "Navegación",
    header: "Cabecera",
    banner: "Portada",
    about: "Sobre nosotros y pilares",
    teachers: "Instructores",
    classes: "Clases",
    trainingSchedule: "Horarios",
    membershipPlans: "Planes",
    community: "Comunidad",
    philosophy: "Filosofía",
    faq: "Preguntas frecuentes",
    contact: "Contacto",
    footer: "Pie de página",
};

export const labels: Record<string, string> = {
    title: "Título", subtitle: "Bajada", storyTitle: "Título de la historia", paragraphs: "Párrafos", quote: "Frase destacada",
    image: "Imagen", background: "Imagen de fondo", logo: "Logo", alt: "Texto alternativo", url: "URL de la imagen",
    pillarsTitle: "Título de pilares", pillarsSubtitle: "Bajada de pilares", pillars: "Pilares", items: "Elementos",
    name: "Nombre", description: "Descripción", instagramUrl: "URL de Instagram", youtubeUrl: "URL de YouTube",
    features: "Características", primaryAction: "Botón principal", secondaryAction: "Botón secundario", label: "Texto del botón", href: "Destino del botón",
    ctaLabel: "Texto del botón", ctaHref: "Destino del botón", emptyMessage: "Mensaje cuando no hay datos",
    recommendedLabel: "Etiqueta de recomendado", actionLabel: "Texto del botón", whatsappMessage: "Mensaje de WhatsApp",
    icon: "Ícono", question: "Pregunta", answer: "Respuesta", form: "Formulario", infoTitle: "Título de información",
    email: "Email", phone: "Teléfono", address: "Dirección", whatsappLabel: "Texto del botón de WhatsApp",
    instagramLabel: "Texto del botón de Instagram", scheduleTitle: "Título de horarios", schedule: "Horarios de atención",
    day: "Día", hours: "Horario", namePlaceholder: "Ayuda del campo nombre", emailPlaceholder: "Ayuda del campo email",
    messagePlaceholder: "Ayuda del campo mensaje", submitLabel: "Texto para enviar", submittingLabel: "Texto mientras se envía",
    successMessage: "Mensaje de confirmación", tagline: "Descripción", linksTitle: "Título de enlaces", socialTitle: "Título de redes",
    primaryLinks: "Enlaces de escritorio", menuLinks: "Enlaces del menú completo",
    copyright: "Derechos reservados", closingText: "Frase final",
    videoUrl: "Video de YouTube (URL opcional)",
};

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const isImage = (value: unknown): value is SiteContentImage => isRecord(value) && typeof value.url === "string" && typeof value.publicId === "string" && typeof value.alt === "string";
export const pathKey = (path: PathPart[]) => path.join(".");
export const sectionFolderByContentKey: Partial<Record<keyof HomePageContent, SiteImageSection>> = {
    header: "cabecera",
    banner: "inicio",
    about: "sobre-nosotros",
    teachers: "profesores",
    classes: "clases",
    community: "comunidad",
    philosophy: "filosofia",
    footer: "pie-de-pagina",
};
export const clone = <T,>(value: T): T => structuredClone(value);

export const setValueAtPath = (target: unknown, path: PathPart[], value: unknown) => {
    let cursor = target as Record<string | number, unknown>;
    path.slice(0, -1).forEach((part) => { cursor = cursor[part] as Record<string | number, unknown>; });
    cursor[path[path.length - 1]] = value;
};

export const collectPublicIds = (value: unknown, result = new Set<string>()) => {
    if (isImage(value) && value.publicId) result.add(value.publicId);
    if (Array.isArray(value)) value.forEach((item) => collectPublicIds(item, result));
    else if (isRecord(value)) Object.values(value).forEach((item) => collectPublicIds(item, result));
    return result;
};

