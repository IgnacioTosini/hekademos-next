import type { SiteImageSection } from "@/lib/site-image-sections";
import type { UserImageSection } from "@/lib/user-image-sections";

export type UploadedImage = {
    url: string;
    publicId: string;
};

export type ImageUploadArea = "users" | "site";

export const uploadImage = async (file: File, area: ImageUploadArea = "users", section?: SiteImageSection | UserImageSection): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("area", area);
    if (section) formData.append("section", section);

    const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error ?? "No se pudo subir la imagen.");
    }

    return {
        url: data.url,
        publicId: data.publicId ?? data.public_id,
    };
};

export const deleteImage = async (publicId: string) => {
    const response = await fetch(`/api/delete-image?publicId=${encodeURIComponent(publicId)}`, {
        method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.error ?? "No se pudo eliminar la imagen.");
    }
};

