import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
    decryptWhatsAppAccessToken,
    encryptWhatsAppAccessToken,
} from "../src/lib/whatsapp-integration.ts";

const originalKey = process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY;

afterEach(() => {
    if (originalKey === undefined) delete process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY;
    else process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY = originalKey;
});

test("el token de Meta se cifra y puede recuperarse únicamente con la clave correcta", () => {
    process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY = "a".repeat(64);
    const token = "EAA-token-confidencial-de-prueba";
    const encrypted = encryptWhatsAppAccessToken(token);

    assert.notEqual(encrypted.encrypted, token);
    assert.equal(decryptWhatsAppAccessToken(encrypted), token);

    process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY = "b".repeat(64);
    assert.throws(() => decryptWhatsAppAccessToken(encrypted));
});

test("se rechaza una clave de cifrado con longitud insegura", () => {
    process.env.WHATSAPP_CREDENTIALS_ENCRYPTION_KEY = "demasiado-corta";
    assert.throws(
        () => encryptWhatsAppAccessToken("token"),
        /exactamente 32 bytes/
    );
});
