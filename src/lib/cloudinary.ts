import { createHash } from "node:crypto";

export type CloudinaryUploadArea = "users" | "site";

const getCloudinaryConfig = (area: CloudinaryUploadArea) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadRootFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER ?? "Hekademos").replace(/\/+$/, "");
    const uploadFolder = `${uploadRootFolder}/${area}`;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error("Faltan variables CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET");
    }

    return {
        cloudName,
        apiKey,
        apiSecret,
        uploadFolder,
    };
};

function buildSignature(
    params: Record<string, string | number>,
    apiSecret: string
) {
    const payload = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    return createHash("sha1")
        .update(`${payload}${apiSecret}`)
        .digest("hex");
}

export async function uploadCloudinaryImage(
    file: File,
    area: CloudinaryUploadArea = "users"
) {
    const { cloudName, apiKey, apiSecret, uploadFolder } = getCloudinaryConfig(area);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = buildSignature({
        folder: uploadFolder,
        timestamp,
    }, apiSecret);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", uploadFolder);
    formData.append("signature", signature);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
            method: "POST",
            body: formData,
            cache: "no-store",
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error("No se pudo subir la imagen.");
    }

    return {
        url: data.secure_url as string,
        publicId: data.public_id as string,
    };
}

export async function deleteCloudinaryImage(
    publicId: string
) {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig("users");
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = buildSignature({
        public_id: publicId,
        invalidate: "true",
        timestamp,
    }, apiSecret);

    const body = new URLSearchParams({
        public_id: publicId,
        api_key: apiKey,
        invalidate: "true",
        timestamp: String(timestamp),
        signature,
    });

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded",
            },
            body,
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error("No se pudo eliminar la imagen.");
    }

    return {
        success: data?.result === "ok" || data?.result === "not found",
        result: data?.result as string | undefined,
    };
}
