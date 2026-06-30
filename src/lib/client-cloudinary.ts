export type UploadedImage = {
    url: string;
    publicId: string;
};

export const uploadImage = async (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append("file", file);

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
