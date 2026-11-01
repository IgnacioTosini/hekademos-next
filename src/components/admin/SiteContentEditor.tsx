"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FaRegTrashAlt, FaUpload } from "react-icons/fa";
import { IoAdd } from "react-icons/io5";
import { toast } from "react-toastify";
import { updateHomePageContent } from "@/app/actions/siteContent.actions";
import { ImageCropModal } from "@/components/admin/users/imageCropModal/ImageCropModal";
import { deleteImage, uploadImage } from "@/lib/client-cloudinary";
import type { HomePageContent, SiteContentImage } from "@/lib/home-page-content";
import type { SiteImageSection } from "@/lib/site-image-sections";
import "./_siteContentEditor.scss";

type Props = { initialContent: HomePageContent };
type PathPart = string | number;
type PendingImage = { file: File; previewUrl: string };

const sectionLabels: Record<keyof HomePageContent, string> = {
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

const labels: Record<string, string> = {
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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isImage = (value: unknown): value is SiteContentImage => isRecord(value) && typeof value.url === "string" && typeof value.publicId === "string" && typeof value.alt === "string";
const pathKey = (path: PathPart[]) => path.join(".");
const sectionFolderByContentKey: Partial<Record<keyof HomePageContent, SiteImageSection>> = {
    header: "cabecera",
    banner: "inicio",
    about: "sobre-nosotros",
    teachers: "profesores",
    classes: "clases",
    community: "comunidad",
    philosophy: "filosofia",
    footer: "pie-de-pagina",
};
const clone = <T,>(value: T): T => structuredClone(value);

const setValueAtPath = (target: unknown, path: PathPart[], value: unknown) => {
    let cursor = target as Record<string | number, unknown>;
    path.slice(0, -1).forEach((part) => { cursor = cursor[part] as Record<string | number, unknown>; });
    cursor[path[path.length - 1]] = value;
};

const collectPublicIds = (value: unknown, result = new Set<string>()) => {
    if (isImage(value) && value.publicId) result.add(value.publicId);
    if (Array.isArray(value)) value.forEach((item) => collectPublicIds(item, result));
    else if (isRecord(value)) Object.values(value).forEach((item) => collectPublicIds(item, result));
    return result;
};

export const SiteContentEditor = ({ initialContent }: Props) => {
    const [content, setContent] = useState(() => clone(initialContent));
    const [persistedContent, setPersistedContent] = useState(() => clone(initialContent));
    const [pendingImages, setPendingImages] = useState<Record<string, PendingImage>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [cropTarget, setCropTarget] = useState<{ path: PathPart[]; file: File } | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewMobile, setPreviewMobile] = useState(false);
    const previewFrameRef = useRef<HTMLIFrameElement>(null);
    const sections = useMemo(() => Object.entries(content) as Array<[keyof HomePageContent, HomePageContent[keyof HomePageContent]]>, [content]);

    const updateValue = (path: PathPart[], value: unknown) => {
        setContent((current) => {
            const next = clone(current);
            setValueAtPath(next, path, value);
            return next;
        });
    };

    const clearPendingImage = (key: string) => {
        setPendingImages((current) => {
            const pending = current[key];
            if (pending) URL.revokeObjectURL(pending.previewUrl);
            const next = { ...current };
            delete next[key];
            return next;
        });
    };

    const chooseImage = (path: PathPart[], file?: File) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) return toast.error("El archivo debe ser una imagen");
        if (file.size > 5 * 1024 * 1024) return toast.error("La imagen no puede superar los 5 MB");

        setCropTarget({ path, file });
    };

    const adjustCurrentImage = async (path: PathPart[], image: SiteContentImage) => {
        try {
            const response = await fetch(pendingImages[pathKey(path)]?.previewUrl || image.url);
            if (!response.ok) throw new Error("No se pudo abrir la imagen.");
            const blob = await response.blob();
            setCropTarget({ path, file: new File([blob], "imagen-actual", { type: blob.type || "image/jpeg" }) });
        } catch {
            toast.error("No se pudo abrir la imagen actual. Subí el archivo para ajustarla.");
        }
    };

    const confirmCrop = (file: File) => {
        if (!cropTarget) return;
        const key = pathKey(cropTarget.path);
        setPendingImages((current) => {
            if (current[key]) URL.revokeObjectURL(current[key].previewUrl);
            return { ...current, [key]: { file, previewUrl: URL.createObjectURL(file) } };
        });
        const currentImage = cropTarget.path.reduce<unknown>((current, part) => (current as Record<string | number, unknown>)[part], content) as SiteContentImage;
        updateValue(cropTarget.path, { ...currentImage, scale: 100, positionX: 50, positionY: 50 });
        setCropTarget(null);
    };

    const cropAspectRatio = cropTarget ? (() => {
        const key = pathKey(cropTarget.path);
        if (key === "banner.background") return 16 / 9;
        if (key === "about.image") return 5 / 6;
        if (key === "philosophy.image") return 4 / 5;
        if (key.startsWith("teachers.")) return 3 / 4;
        if (key.startsWith("classes.")) return 16 / 10;
        if (key.startsWith("community.")) return 4 / 3;
        return 1;
    })() : 1;

    const getPreviewContent = () => {
        const draft = clone(content);
        Object.entries(pendingImages).forEach(([key, pending]) => {
            const path = key.split(".").map((part) => /^\d+$/.test(part) ? Number(part) : part);
            const image = path.reduce<unknown>((current, part) => (current as Record<string | number, unknown>)[part], draft) as SiteContentImage;
            setValueAtPath(draft, path, { ...image, url: pending.previewUrl });
        });
        return draft;
    };

    useEffect(() => {
        if (!isPreviewOpen) return;
        const handleReady = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== previewFrameRef.current?.contentWindow || event.data?.type !== "HEKADEMOS_SITE_PREVIEW_READY") return;
            previewFrameRef.current?.contentWindow?.postMessage({ type: "HEKADEMOS_SITE_PREVIEW", content: getPreviewContent() }, window.location.origin);
        };
        window.addEventListener("message", handleReady);
        return () => window.removeEventListener("message", handleReady);
        // The preview receives the current draft when its frame reports readiness.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPreviewOpen]);

    const renderImageField = (image: SiteContentImage, path: PathPart[], label: string) => {
        const key = pathKey(path);
        const pending = pendingImages[key];
        const preview = pending?.previewUrl || image.url;

        return (
            <div className="site-content-image-field" key={key}>
                <span className="site-content-field-label">{label}</span>
                <div className="site-content-image-row">
                    <div className="site-content-image-preview">
                        {preview ? <Image src={preview} alt={image.alt || label} width={360} height={220} unoptimized style={{ objectPosition: `${image.positionX ?? 50}% ${image.positionY ?? 50}%`, transform: `scale(${(image.scale ?? 100) / 100})` }} /> : <span>Sin imagen</span>}
                    </div>
                    <div className="site-content-image-controls">
                        <label className="site-content-upload-button">
                            <FaUpload /> {pending ? "Cambiar archivo" : "Subir imagen"}
                            <input type="file" accept="image/*" onChange={(event) => chooseImage(path, event.target.files?.[0])} />
                        </label>
                        {pending && <button type="button" className="site-content-secondary-button" onClick={() => clearPendingImage(key)}>Cancelar selección</button>}
                        {preview && <button type="button" className="site-content-secondary-button" onClick={() => void adjustCurrentImage(path, image)}>Ajustar encuadre</button>}
                    </div>
                </div>
                <label className="site-content-field">
                    <span>URL de la imagen</span>
                    <input value={pending ? `Pendiente de subir: ${pending.file.name}` : image.url} readOnly={Boolean(pending)} onChange={(event) => { clearPendingImage(key); updateValue(path, { ...image, url: event.target.value, publicId: "" }); }} />
                    {pending && <small className="site-content-field-hint">La URL de Cloudinary aparecerá aquí al guardar los cambios.</small>}
                </label>
                <label className="site-content-field">
                    <span>Texto alternativo</span>
                    <input value={image.alt} onChange={(event) => updateValue(path, { ...image, alt: event.target.value })} />
                </label>
            </div>
        );
    };

    const renderField = (value: unknown, path: PathPart[], label: string): React.ReactNode => {
        const key = pathKey(path);
        const last = String(path[path.length - 1] ?? "");

        if (path[0] === "footer" && last === "credit") return null;

        if (isImage(value)) return renderImageField(value, path, label);

        if (Array.isArray(value)) {
            const isTextList = value.every((item) => typeof item === "string");
            return (
                <fieldset className="site-content-group site-content-array" key={key}>
                    <legend>{label}</legend>
                    {value.map((item, index) => (
                        <div className="site-content-array-item" key={`${key}-${index}`}>
                            <div className="site-content-array-heading">
                                <strong>{isTextList ? `${label} ${index + 1}` : `Elemento ${index + 1}`}</strong>
                                <button type="button" disabled={value.length === 1} onClick={() => updateValue(path, value.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Eliminar ${label} ${index + 1}`}>
                                    <FaRegTrashAlt />
                                </button>
                            </div>
                            {renderField(item, [...path, index], isTextList ? label : `Elemento ${index + 1}`)}
                        </div>
                    ))}
                    <button type="button" className="site-content-add-button" disabled={value.length >= 12} onClick={() => updateValue(path, [...value, clone(value[value.length - 1])])}>
                        <IoAdd /> Agregar elemento
                    </button>
                </fieldset>
            );
        }

        if (isRecord(value)) {
            return (
                <fieldset className="site-content-group" key={key}>
                    <legend>{label}</legend>
                    <div className="site-content-fields-grid">
                        {Object.entries(value).filter(([childKey]) => childKey !== "publicId").map(([childKey, childValue]) => (
                            renderField(childValue, [...path, childKey], labels[childKey] || childKey)
                        ))}
                    </div>
                </fieldset>
            );
        }

        if (typeof value === "string") {
            if (last === "icon") {
                return (
                    <label className="site-content-field" key={key}><span>{label}</span>
                        <select value={value} onChange={(event) => updateValue(path, event.target.value)}>
                            <option value="people">Personas</option><option value="heart">Corazón</option><option value="trend">Progreso</option>
                        </select>
                    </label>
                );
            }
            const isLong = value.length > 80 || /(description|subtitle|message|answer|quote|tagline|copyright|closing)/i.test(last);
            return (
                <label className={`site-content-field${isLong ? " site-content-field-wide" : ""}`} key={key}>
                    <span>{label}</span>
                    {isLong
                        ? <textarea value={value} rows={value.length > 180 ? 5 : 3} onChange={(event) => updateValue(path, event.target.value)} />
                        : <input value={value} onChange={(event) => updateValue(path, event.target.value)} />}
                </label>
            );
        }

        return null;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        const nextContent = clone(content);
        const uploadedPublicIds: string[] = [];

        try {
            for (const [key, pending] of Object.entries(pendingImages)) {
                const section = sectionFolderByContentKey[key.split(".")[0] as keyof HomePageContent];
                if (!section) throw new Error("No se pudo identificar la sección de la imagen.");
                const uploaded = await uploadImage(pending.file, "site", section);
                uploadedPublicIds.push(uploaded.publicId);
                const path = key.split(".").map((part) => /^\d+$/.test(part) ? Number(part) : part);
                const currentImage = path.reduce<unknown>((current, part) => (current as Record<string | number, unknown>)[part], nextContent) as SiteContentImage;
                setValueAtPath(nextContent, path, { ...currentImage, url: uploaded.url, publicId: uploaded.publicId });
            }

            const oldPublicIds = collectPublicIds(persistedContent);
            const result = await updateHomePageContent(nextContent);
            if (!result.ok) throw new Error(result.error);

            Object.values(pendingImages).forEach((pending) => URL.revokeObjectURL(pending.previewUrl));
            setPendingImages({});
            setContent(clone(result.data));
            setPersistedContent(clone(result.data));

            const activePublicIds = collectPublicIds(result.data);
            await Promise.allSettled([...oldPublicIds].filter((id) => !activePublicIds.has(id)).map((id) => deleteImage(id)));
            toast.success("Contenido de la portada actualizado");
        } catch (error) {
            await Promise.allSettled(uploadedPublicIds.map((id) => deleteImage(id)));
            toast.error(error instanceof Error ? error.message : "No se pudo guardar el contenido");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form className="site-content-editor" onSubmit={handleSubmit}>
            <div className="site-content-editor-header">
                <div><h1>Contenido web</h1><p>Editá los textos, imágenes y enlaces de la pantalla principal.</p></div>
                <div className="site-content-header-actions">
                    <button type="button" className="site-content-preview-button" onClick={() => setIsPreviewOpen(true)}>Vista previa</button>
                    <button type="submit" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar cambios"}</button>
                </div>
            </div>

            <div className="site-content-notice">Los horarios, planes y alumnos continúan administrándose desde sus módulos. Acá se modifica únicamente cómo se presentan en la web. En las tarjetas con video podés pegar un enlace de YouTube; si queda vacío, el botón no se mostrará.</div>

            <div className="site-content-sections">
                {sections.map(([sectionKey, section], index) => (
                    <details className="site-content-section" key={sectionKey} open={index === 0}>
                        <summary><span>{sectionLabels[sectionKey]}</span><small>Editar sección</small></summary>
                        <div className="site-content-section-body">
                            {Object.entries(section as Record<string, unknown>).map(([key, value]) => renderField(value, [sectionKey, key], labels[key] || key))}
                        </div>
                    </details>
                ))}
            </div>

            {isPreviewOpen && <div className="site-content-preview-overlay" role="dialog" aria-modal="true" aria-label="Vista previa de los cambios" onMouseDown={() => setIsPreviewOpen(false)}>
                <div className="site-content-preview-dialog" onMouseDown={(event) => event.stopPropagation()}>
                    <div className="site-content-preview-toolbar">
                        <div><strong>Vista previa del inicio</strong><span>Cambios sin guardar</span></div>
                        <button type="button" onClick={() => setPreviewMobile((current) => !current)}>{previewMobile ? "Escritorio" : "Móvil"}</button>
                        <button type="button" onClick={() => setIsPreviewOpen(false)}>Cerrar</button>
                    </div>
                    <div className={`site-content-preview-frame-wrap${previewMobile ? " is-mobile" : ""}`}>
                        <iframe ref={previewFrameRef} title="Vista previa completa del inicio" src="/vista-previa" onLoad={(event) => event.currentTarget.contentWindow?.postMessage({ type: "HEKADEMOS_SITE_PREVIEW", content: getPreviewContent() }, window.location.origin)} />
                    </div>
                </div>
            </div>}
            <ImageCropModal file={cropTarget?.file ?? null} isOpen={Boolean(cropTarget)} onCancel={() => setCropTarget(null)} onConfirm={confirmCrop} aspectRatio={cropAspectRatio} outputWidth={cropAspectRatio > 1.5 ? 1200 : 800} outputFormat={cropTarget && pathKey(cropTarget.path).endsWith(".logo") ? "image/png" : "image/jpeg"} description="Arrastrá y ampliá la imagen hasta encuadrarla en esta sección. Se aplicará al guardar los cambios." />
        </form>
    );
};

