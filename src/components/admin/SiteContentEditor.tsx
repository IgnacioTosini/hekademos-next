"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import { IoAdd } from "react-icons/io5";
import { toast } from "react-toastify";
import { updateHomePageContent } from "@/app/actions/siteContent.actions";
import { ImageCropModal } from "@/components/admin/users/imageCropModal/ImageCropModal";
import { deleteImage, uploadImage } from "@/lib/client-cloudinary";
import type { HomePageContent, SiteContentImage } from "@/lib/home-page-content";
import { SiteContentImageField } from "./SiteContentImageField";
import { clone, collectPublicIds, isImage, isRecord, labels, pathKey, sectionFolderByContentKey, sectionLabels, setValueAtPath, type PathPart, type PendingImage } from "./siteContentEditorUtils";
import "./_siteContentEditor.scss";

type Props = { initialContent: HomePageContent };
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

    const renderField = (value: unknown, path: PathPart[], label: string): React.ReactNode => {
        const key = pathKey(path);
        const last = String(path[path.length - 1] ?? "");

        if (path[0] === "footer" && last === "credit") return null;

        if (isImage(value)) return <SiteContentImageField key={key} image={value} path={path} label={label} pending={pendingImages[key]} onChooseImage={chooseImage} onClearPendingImage={clearPendingImage} onAdjustCurrentImage={adjustCurrentImage} onUpdateValue={updateValue} />;

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

