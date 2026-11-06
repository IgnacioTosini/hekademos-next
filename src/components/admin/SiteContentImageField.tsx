import Image from "next/image";
import { FaUpload } from "react-icons/fa";
import type { SiteContentImage } from "@/lib/home-page-content";
import { pathKey, type PathPart, type PendingImage } from "./siteContentEditorUtils";

type Props = {
    image: SiteContentImage;
    path: PathPart[];
    label: string;
    pending?: PendingImage;
    onChooseImage: (path: PathPart[], file?: File) => void;
    onClearPendingImage: (key: string) => void;
    onAdjustCurrentImage: (path: PathPart[], image: SiteContentImage) => Promise<void>;
    onUpdateValue: (path: PathPart[], value: unknown) => void;
};

export const SiteContentImageField = ({ image, path, label, pending, onChooseImage, onClearPendingImage, onAdjustCurrentImage, onUpdateValue }: Props) => {
    const key = pathKey(path);
    const preview = pending?.previewUrl || image.url;

    return (
        <div className="site-content-image-field">
            <span className="site-content-field-label">{label}</span>
            <div className="site-content-image-row">
                <div className="site-content-image-preview">
                    {preview ? <Image src={preview} alt={image.alt || label} width={360} height={220} unoptimized style={{ objectPosition: `${image.positionX ?? 50}% ${image.positionY ?? 50}%`, transform: `scale(${(image.scale ?? 100) / 100})` }} /> : <span>Sin imagen</span>}
                </div>
                <div className="site-content-image-controls">
                    <label className="site-content-upload-button">
                        <FaUpload /> {pending ? "Cambiar archivo" : "Subir imagen"}
                        <input type="file" accept="image/*" onChange={(event) => onChooseImage(path, event.target.files?.[0])} />
                    </label>
                    {pending && <button type="button" className="site-content-secondary-button" onClick={() => onClearPendingImage(key)}>Cancelar selección</button>}
                    {preview && <button type="button" className="site-content-secondary-button" onClick={() => void onAdjustCurrentImage(path, image)}>Ajustar encuadre</button>}
                </div>
            </div>
            <label className="site-content-field">
                <span>URL de la imagen</span>
                <input value={pending ? `Pendiente de subir: ${pending.file.name}` : image.url} readOnly={Boolean(pending)} onChange={(event) => { onClearPendingImage(key); onUpdateValue(path, { ...image, url: event.target.value, publicId: "" }); }} />
                {pending && <small className="site-content-field-hint">La URL de Cloudinary aparecerá aquí al guardar los cambios.</small>}
            </label>
            <label className="site-content-field">
                <span>Texto alternativo</span>
                <input value={image.alt} onChange={(event) => onUpdateValue(path, { ...image, alt: event.target.value })} />
            </label>
        </div>
    );
};

