export const siteImageSections = [
    'inicio',
    'cabecera',
    'sobre-nosotros',
    'profesores',
    'clases',
    'comunidad',
    'filosofia',
    'pie-de-pagina',
] as const;

export type SiteImageSection = typeof siteImageSections[number];

export const isSiteImageSection = (value: unknown): value is SiteImageSection =>
    typeof value === 'string' && siteImageSections.some((section) => section === value);
