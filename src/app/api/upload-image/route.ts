import { NextRequest } from "next/server";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { uploadCloudinaryImage, type CloudinaryUploadArea } from "@/lib/cloudinary";
import { consumeRateLimit, getRateLimitMessage, rateLimitPolicies } from "@/lib/rate-limit";
import { isSiteImageSection } from "@/lib/site-image-sections";
import { isUserImageSection } from "@/lib/user-image-sections";

const maxImageSizeBytes = 5 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

const hasValidImageSignature = async (file: File) => {
    const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
    if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (file.type === "image/png") return bytes[0] === 0x89 && ascii(1, 4) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
    if (file.type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    if (file.type === "image/avif") return ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12));
    return false;
};

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
    const requestedSection = incomingForm.get("section");
    const area: CloudinaryUploadArea = requestedArea === "site" ? "site" : "users";

    if (area === "site" && session.role !== "ADMIN") {
        return Response.json(
            { success: false, error: "No tenés permiso para subir imágenes del sitio." },
            { status: 403 }
        );
    }

    if (area === "site" && !isSiteImageSection(requestedSection)) {
        return Response.json(
            { success: false, error: "La sección de la imagen no es válida." },
            { status: 400 }
        );
    }

    if (area === "users" && !isUserImageSection(requestedSection)) {
        return Response.json(
            { success: false, error: "La sección de la imagen no es válida." },
            { status: 400 }
        );
    }

    if (area === "users" && session.role !== "ADMIN") {
        const ownSection = session.role === "COACH" ? "profesores" : "alumnos";
        if (requestedSection !== ownSection) {
            return Response.json(
                { success: false, error: "No tenés permiso para subir imágenes a esta sección." },
                { status: 403 }
            );
        }
    }

    if (!isUploadableFile(file)) {
        return Response.json(
            { success: false, error: "Falta seleccionar una imagen." },
            { status: 400 }
        );
    }

    if (!supportedImageTypes.has(file.type)) {
        return Response.json(
            { success: false, error: "Usá una imagen JPG, PNG, WebP o AVIF." },
            { status: 400 }
        );
    }

    if (file.size === 0 || file.size > maxImageSizeBytes) {
        return Response.json(
            { success: false, error: "La imagen no puede superar los 5MB." },
            { status: 400 }
        );
    }

    if (!(await hasValidImageSignature(file))) {
        return Response.json(
            { success: false, error: "El archivo no tiene un formato de imagen válido." },
            { status: 400 }
        );
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return Response.json(
            { success: false, error: "No está configurado el servicio de imágenes." },
            { status: 500 }
        );
    }

    try {
        const image = await uploadCloudinaryImage(file, area, requestedSection as Parameters<typeof uploadCloudinaryImage>[2]);

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
