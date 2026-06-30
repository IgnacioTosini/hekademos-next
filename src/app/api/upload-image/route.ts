import { NextRequest } from "next/server";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { uploadCloudinaryImage } from "@/lib/cloudinary";

const maxImageSizeBytes = 5 * 1024 * 1024;

const isUploadableFile = (value: FormDataEntryValue | null): value is File => {
    return typeof value === "object"
        && value !== null
        && "arrayBuffer" in value
        && "type" in value
        && typeof value.type === "string";
};

export async function POST(req: NextRequest) {
    const session = await getCurrentAuthSession();

    if (!session) {
        return Response.json(
            { success: false, error: "No autorizado." },
            { status: 401 }
        );
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || (!process.env.CLOUDINARY_UPLOAD_PRESET && (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET))) {
        return Response.json(
            { success: false, error: "Faltan variables de Cloudinary. Configura CLOUDINARY_UPLOAD_PRESET o CLOUDINARY_API_KEY/API_SECRET." },
            { status: 500 }
        );
    }

    const incomingForm = await req.formData();
    const file = incomingForm.get("file");

    if (!isUploadableFile(file)) {
        return Response.json(
            { success: false, error: "Falta seleccionar una imagen." },
            { status: 400 }
        );
    }

    if (!file.type.startsWith("image/")) {
        return Response.json(
            { success: false, error: "El archivo debe ser una imagen." },
            { status: 400 }
        );
    }

    if (file.size > maxImageSizeBytes) {
        return Response.json(
            { success: false, error: "La imagen no puede superar los 5MB." },
            { status: 400 }
        );
    }

    try {
        const image = await uploadCloudinaryImage(file);

        return Response.json({
            success: true,
            url: image.url,
            publicId: image.publicId,
            public_id: image.publicId,
        });
    } catch (error) {
        console.error("Cloudinary upload error:", error);

        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "No se pudo subir la imagen.",
            },
            { status: 500 }
        );
    }
}
