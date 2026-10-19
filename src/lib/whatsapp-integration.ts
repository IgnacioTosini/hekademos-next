import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const INTEGRATION_ID = "primary";

type EncryptedSecret = {
    encrypted: string;
    iv: string;
    authTag: string;
};

const getEncryptionKey = () => {
    const raw = process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY?.trim();
    if (!raw) throw new Error("Falta configurar WHATSAPP_CREDENTIALS_ENCRYPTION_KEY");

    const key = /^[a-f\d]{64}$/i.test(raw)
        ? Buffer.from(raw, "hex")
        : Buffer.from(raw, "base64");

    if (key.length !== 32) {
        throw new Error("WHATSAPP_CREDENTIALS_ENCRYPTION_KEY debe representar exactamente 32 bytes");
    }

    return key;
};

export const encryptWhatsAppAccessToken = (accessToken: string): EncryptedSecret => {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(accessToken, "utf8"), cipher.final()]);

    return {
        encrypted: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64"),
    };
};

export const decryptWhatsAppAccessToken = (secret: EncryptedSecret) => {
    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(secret.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));

    return Buffer.concat([
        decipher.update(Buffer.from(secret.encrypted, "base64")),
        decipher.final(),
    ]).toString("utf8");
};

export const getWhatsAppIntegrationSummary = async () => {
    const integration = await prisma.whatsAppIntegration.findUnique({
        where: { id: INTEGRATION_ID },
        select: {
            wabaId: true,
            phoneNumberId: true,
            displayPhoneNumber: true,
            verifiedName: true,
            tokenExpiresAt: true,
            connectedAt: true,
        },
    });

    return integration;
};

export const getManagedWhatsAppCredentials = async () => {
    if (!process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY?.trim()) return null;

    const integration = await prisma.whatsAppIntegration.findUnique({
        where: { id: INTEGRATION_ID },
    });

    if (!integration) return null;
    if (integration.tokenExpiresAt && integration.tokenExpiresAt <= new Date()) {
        throw new Error("La autorización de la integración de WhatsApp venció; volvé a conectarla desde el panel admin");
    }

    return {
        accessToken: decryptWhatsAppAccessToken({
            encrypted: integration.accessTokenEncrypted,
            iv: integration.accessTokenIv,
            authTag: integration.accessTokenAuthTag,
        }),
        phoneNumberId: integration.phoneNumberId,
        wabaId: integration.wabaId,
    };
};

export const saveWhatsAppIntegration = async (input: {
    accessToken: string;
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber?: string | null;
    verifiedName?: string | null;
    tokenExpiresAt?: Date | null;
    connectedByUserId: string;
}) => {
    const secret = encryptWhatsAppAccessToken(input.accessToken);
    const data = {
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        displayPhoneNumber: input.displayPhoneNumber ?? null,
        verifiedName: input.verifiedName ?? null,
        accessTokenEncrypted: secret.encrypted,
        accessTokenIv: secret.iv,
        accessTokenAuthTag: secret.authTag,
        tokenExpiresAt: input.tokenExpiresAt ?? null,
        connectedByUserId: input.connectedByUserId,
        connectedAt: new Date(),
    };

    return prisma.whatsAppIntegration.upsert({
        where: { id: INTEGRATION_ID },
        create: { id: INTEGRATION_ID, ...data },
        update: data,
    });
};

export const removeWhatsAppIntegration = () => prisma.whatsAppIntegration.deleteMany({
    where: { id: INTEGRATION_ID },
});
