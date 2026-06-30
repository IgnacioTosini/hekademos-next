import { NextRequest } from "next/server";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

export async function DELETE(req: NextRequest) {
    const session = await getCurrentAuthSession();

    if (!session) {
        return Response.json(
            { success: false, error: "No autorizado." },
            { status: 401 }
        );
    }

    const publicId = req.nextUrl.searchParams.get("publicId");

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return Response.json(
            { success: false, error: "Faltan variables CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET" },
            { status: 500 }
        );
    }

    if (!publicId) {
        return Response.json({ error: "Falta el identificador de la imagen." }, { status: 400 });
    }

    try {
        const result = await deleteCloudinaryImage(publicId);

        return Response.json({
            success: result.success,
            result: result.result,
            error: result.success ? undefined : "Cloudinary no pudo eliminar la imagen",
        });
    } catch (error) {
        console.error("Cloudinary delete error:", error);

        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "No se pudo eliminar la imagen.",
            },
            { status: 500 }
        );
    }
}
