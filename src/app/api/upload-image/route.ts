import { NextRequest } from "next/server";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { uploadCloudinaryImage, type CloudinaryUploadArea } from "@/lib/cloudinary";
import { consumeRateLimit, getRateLimitMessage, rateLimitPolicies } from "@/lib/rate-limit";

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

    const rateLimit = await consumeRateLimit({
        scope: "image-upload",
        identifier: session.userId,
        ...rateLimitPolicies.imageUpload,
    });

    if (!rateLimit.allowed) {
        return Response.json(
            { success: false, error: getRateLimitMessage(rateLimit) },
            {
                status: 429,
                headers: {
                    "Retry-After": String(rateLimit.retryAfterSeconds),
                },
            }
        );
    }

    const incomingForm = await req.formData();
    const file = incomingForm.get("file");
    const requestedArea = incomingForm.get("area");
    const area: CloudinaryUploadArea = requestedArea === "site" ? "site" : "users";

    if (area === "site" && session.role !== "ADMIN") {
        return Response.json(
            { success: false, error: "No tenés permiso para subir imágenes del sitio." },
            { status: 403 }
        );
    }

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

    if (!process.env.CLOUDINARY_CLOUD_NAME || (!process.env.CLOUDINARY_UPLOAD_PRESET && (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET))) {
        return Response.json(
            { success: false, error: "Faltan variables de Cloudinary. Configura CLOUDINARY_UPLOAD_PRESET o CLOUDINARY_API_KEY/API_SECRET." },
            { status: 500 }
        );
    }

    try {
        const image = await uploadCloudinaryImage(file, area);

        return Response.json({
            success: true,
            url: image.url,
            publicId: image.publicId,
            public_id: image.publicId,
        });
    } catch (error) {
        console.error("Error al subir la imagen a Cloudinary:", error);

        return Response.json(
            {
                success: false,
                error: "No se pudo subir la imagen.",
            },
            { status: 500 }
        );
    }
}
