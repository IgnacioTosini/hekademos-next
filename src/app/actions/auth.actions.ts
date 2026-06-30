"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { clearAuthSessionCookie, getCurrentAuthSession, setAuthSessionCookie } from "@/lib/auth-session";
import { buildEmailMessage, sendEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types/schema/users";
import { normalizeEmail, type ActionResponse } from "./_shared";

export type LoginInput = {
    email: string;
    password: string;
};

export type AuthUser = {
    id: string;
    email: string;
    name: string | null;
    role: Role;
};

export type LoginResult = {
    user: AuthUser;
    redirectTo: string;
};

export type RequestPasswordResetInput = {
    email: string;
};

export type RequestPasswordResetResult = {
    sent: true;
    resetUrl?: string;
};

export type ResetPasswordInput = {
    token: string;
    password: string;
};

type PasswordResetTokenRow = {
    id: string;
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
    userStatus: string;
};

const getRedirectByRole = (role: Role) => {
    if (role === "ADMIN") return "/admin";
    if (role === "COACH") return "/coach/dashboard";

    return "/perfil";
};

const passwordResetTokenMaxAgeMinutes = 60;
const passwordResetTokenMaxAgeMs = passwordResetTokenMaxAgeMinutes * 60 * 1000;

const hashResetToken = (token: string) => (
    createHash("sha256").update(token).digest("hex")
);

const getRequestBaseUrl = async () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.AUTH_BASE_URL) return process.env.AUTH_BASE_URL;

    const requestHeaders = await headers();
    const host = requestHeaders.get("host");

    if (!host) return "http://localhost:3000";

    const protocol = requestHeaders.get("x-forwarded-proto") ?? (
        host.startsWith("localhost") || host.startsWith("127.0.0.1")
            ? "http"
            : "https"
    );

    return `${protocol}://${host}`;
};

const buildResetUrl = async (token: string) => {
    const baseUrl = await getRequestBaseUrl();

    return `${baseUrl}/auth/restablecer?token=${encodeURIComponent(token)}`;
};

const getBootstrapAdmin = (email: string, password: string): LoginResult | null => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) return null;
    if (normalizeEmail(email) !== normalizeEmail(adminEmail)) return null;
    if (password !== adminPassword) return null;

    return {
        user: {
            id: "env-admin",
            email: normalizeEmail(adminEmail),
            name: "Admin",
            role: "ADMIN",
        },
        redirectTo: "/admin",
    };
};

export const login = async (
    input: LoginInput
): Promise<ActionResponse<LoginResult | null>> => {
    try {
        const email = normalizeEmail(input.email);
        const password = input.password;

        if (!email || !password) {
            return {
                ok: false,
                data: null,
                error: "Email y contraseña son obligatorios",
            };
        }

        const bootstrapAdmin = getBootstrapAdmin(email, password);

        if (bootstrapAdmin) {
            await setAuthSessionCookie({
                userId: bootstrapAdmin.user.id,
                email: bootstrapAdmin.user.email,
                name: bootstrapAdmin.user.name,
                role: bootstrapAdmin.user.role,
            });

            return {
                ok: true,
                data: bootstrapAdmin,
            };
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user || !user.passwordHash) {
            return {
                ok: false,
                data: null,
                error: "Credenciales invalidas",
            };
        }

        if (user.status !== "ACTIVE") {
            return {
                ok: false,
                data: null,
                error: "La cuenta no esta activa",
            };
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
            return {
                ok: false,
                data: null,
                error: "Credenciales invalidas",
            };
        }

        const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        await setAuthSessionCookie({
            userId: authUser.id,
            email: authUser.email,
            name: authUser.name,
            role: authUser.role,
        });

        return {
            ok: true,
            data: {
                user: authUser,
                redirectTo: getRedirectByRole(authUser.role),
            },
        };
    } catch (error) {
        console.error("Error logging in:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudo iniciar sesion",
        };
    }
};

export const logout = async (): Promise<ActionResponse<{ ok: true } | null>> => {
    await clearAuthSessionCookie();

    return {
        ok: true,
        data: {
            ok: true,
        },
    };
};

export const requestPasswordReset = async (
    input: RequestPasswordResetInput
): Promise<ActionResponse<RequestPasswordResetResult | null>> => {
    try {
        const email = normalizeEmail(input.email);

        if (!email) {
            return {
                ok: false,
                data: null,
                error: "El email es obligatorio",
            };
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
            },
        });

        if (!user || user.status !== "ACTIVE") {
            return {
                ok: true,
                data: {
                    sent: true,
                },
            };
        }

        const now = new Date();

        await prisma.$executeRaw`
            UPDATE "PasswordResetToken"
            SET "usedAt" = ${now}
            WHERE "userId" = ${user.id}
              AND "usedAt" IS NULL
              AND "expiresAt" > ${now}
        `;

        const token = randomBytes(32).toString("base64url");
        const tokenHash = hashResetToken(token);
        const expiresAt = new Date(Date.now() + passwordResetTokenMaxAgeMs);

        await prisma.$executeRaw`
            INSERT INTO "PasswordResetToken" ("id", "tokenHash", "userId", "expiresAt")
            VALUES (${randomUUID()}, ${tokenHash}, ${user.id}, ${expiresAt})
        `;

        const resetUrl = await buildResetUrl(token);
        const emailMessage = buildEmailMessage({
            type: "PASSWORD_RESET",
            to: {
                email: user.email,
                name: user.name,
            },
            data: {
                name: user.name,
                resetUrl,
                expiresInMinutes: passwordResetTokenMaxAgeMinutes,
            },
        });

        try {
            await sendEmail(emailMessage);
        } catch (emailError) {
            console.error("Error sending password reset email:", emailError);

            if (process.env.NODE_ENV !== "production") {
                return {
                    ok: false,
                    data: null,
                    error: "No se pudo enviar el email de recuperacion. Revisa la configuracion SMTP.",
                };
            }

            return {
                ok: true,
                data: {
                    sent: true,
                },
            };
        }

        return {
            ok: true,
            data: {
                sent: true,
                resetUrl: process.env.NODE_ENV === "production" ? undefined : resetUrl,
            },
        };
    } catch (error) {
        console.error("Error requesting password reset:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudo generar el link de recuperacion",
        };
    }
};

export const resetPassword = async (
    input: ResetPasswordInput
): Promise<ActionResponse<{ ok: true } | null>> => {
    try {
        const token = input.token.trim();
        const password = input.password.trim();

        if (!token) {
            return {
                ok: false,
                data: null,
                error: "El link de recuperacion no es valido",
            };
        }

        if (password.length < 6) {
            return {
                ok: false,
                data: null,
                error: "La nueva contraseña debe tener al menos 6 caracteres",
            };
        }

        const tokenHash = hashResetToken(token);
        const [passwordResetToken] = await prisma.$queryRaw<PasswordResetTokenRow[]>`
            SELECT
                prt."id",
                prt."userId",
                prt."expiresAt",
                prt."usedAt",
                u."status" AS "userStatus"
            FROM "PasswordResetToken" prt
            INNER JOIN "User" u ON u."id" = prt."userId"
            WHERE prt."tokenHash" = ${tokenHash}
            LIMIT 1
        `;

        if (
            !passwordResetToken
            || passwordResetToken.usedAt
            || passwordResetToken.expiresAt.getTime() < Date.now()
            || passwordResetToken.userStatus !== "ACTIVE"
        ) {
            return {
                ok: false,
                data: null,
                error: "El link de recuperacion expiro o ya fue usado",
            };
        }

        const passwordHash = await hashPassword(password);
        const now = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: {
                    id: passwordResetToken.userId,
                },
                data: {
                    passwordHash,
                },
            });

            await tx.$executeRaw`
                UPDATE "PasswordResetToken"
                SET "usedAt" = ${now}
                WHERE "id" = ${passwordResetToken.id}
            `;

            await tx.$executeRaw`
                UPDATE "PasswordResetToken"
                SET "usedAt" = ${now}
                WHERE "userId" = ${passwordResetToken.userId}
                  AND "usedAt" IS NULL
                  AND "id" <> ${passwordResetToken.id}
            `;
        });

        return {
            ok: true,
            data: {
                ok: true,
            },
        };
    } catch (error) {
        console.error("Error resetting password:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudo restablecer la contraseña",
        };
    }
};

export const getCurrentUser = async (): Promise<ActionResponse<AuthUser | null>> => {
    const session = await getCurrentAuthSession();

    if (!session) {
        return {
            ok: true,
            data: null,
        };
    }

    return {
        ok: true,
        data: {
            id: session.userId,
            email: session.email,
            name: session.name,
            role: session.role,
        },
    };
};
