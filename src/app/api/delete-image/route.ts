import { NextRequest } from "next/server";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
    const session = await getCurrentAuthSession();

    if (!session) {
        return Response.json(
            { success: false, error: "No autorizado." },
            { status: 401 }
        );
    }

    const publicId = req.nextUrl.searchParams.get("publicId");

    if (!publicId) {
        return Response.json({ error: "Falta el identificador de la imagen." }, { status: 400 });
    }

    const uploadRootFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER ?? "Hekademos").replace(/^\/+|\/+$/g, "");
    if (!publicId.startsWith(`${uploadRootFolder}/`) || publicId.includes("..") || publicId.includes("\\")) {
        return Response.json(
            { success: false, error: "El identificador de la imagen no es válido." },
            { status: 400 }
        );
    }
    const userFolderPrefixes = ["users", "usuarios", "alumnos", "profesores"].map((folder) => `${uploadRootFolder}/${folder}/`);
    const siteFolderPrefixes = ["site", "contenidoInicio"].map((folder) => `${uploadRootFolder}/${folder}/`);

    if (session.role !== "ADMIN") {
        const isUserImage = userFolderPrefixes.some((prefix) => publicId.startsWith(prefix));
        const isSiteImage = siteFolderPrefixes.some((prefix) => publicId.startsWith(prefix));
        const ownedImage = isUserImage
            ? await prisma.userImage.findFirst({
                where: {
                    userId: session.userId,
                    publicId,
                },
                select: {
                    id: true,
                },
            })
            : null;

        if (isSiteImage || !ownedImage) {
            return Response.json(
                { success: false, error: "No tenés permiso para eliminar esta imagen." },
                { status: 403 }
            );
        }
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return Response.json(
            { success: false, error: "Faltan variables CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET" },
            { status: 500 }
        );
    }

    try {
        const result = await deleteCloudinaryImage(publicId);

        return Response.json({
            success: result.success,
            result: result.result,
            error: result.success ? undefined : "Cloudinary no pudo eliminar la imagen",
        });
    } catch (error) {
        console.error("Error al eliminar la imagen de Cloudinary:", error);

        return Response.json(
            {
                success: false,
                error: "No se pudo eliminar la imagen.",
            },
            { status: 500 }
        );
    }
}
