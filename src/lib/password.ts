import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const keyLength = 64;

export const hashPassword = async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = await scrypt(password, salt, keyLength) as Buffer;

    return `scrypt:${salt}:${derivedKey.toString("hex")}`;
};

export const verifyPassword = async (password: string, passwordHash: string) => {
    const [algorithm, salt, storedKey] = passwordHash.split(":");

    if (algorithm !== "scrypt" || !salt || !storedKey) return false;

    const derivedKey = await scrypt(password, salt, keyLength) as Buffer;
    const storedKeyBuffer = Buffer.from(storedKey, "hex");

    if (storedKeyBuffer.length !== derivedKey.length) return false;

    return timingSafeEqual(storedKeyBuffer, derivedKey);
};
