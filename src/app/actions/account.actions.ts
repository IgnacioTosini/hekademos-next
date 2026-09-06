"use server";

import { revalidatePath } from "next/cache";
import { clearAuthSessionCookie, getCurrentAuthSession } from "@/lib/auth-session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { ActionResponse } from "./_shared";

export type ChangePasswordInput = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

const getAccountErrorMessage = (error: unknown, fallback: string) => {
    if (!(error instanceof Error)) return fallback;
    if (error.message === "Necesitas iniciar sesion") return error.message;
    if (error.message === "La contraseña actual es obligatoria") return error.message;
    if (error.message === "La nueva contraseña es obligatoria") return error.message;
    if (error.message === "La nueva contraseña debe tener al menos 6 caracteres") return error.message;
    if (error.message === "Las contraseñas no coinciden") return error.message;
    if (error.message === "No se encontro tu usuario") return error.message;
    if (error.message === "Tu cuenta no tiene una contraseña configurada") return error.message;
    if (error.message === "La contraseña actual no es correcta") return error.message;

    return fallback;
};

export const changeCurrentUserPassword = async (
    input: ChangePasswordInput
): Promise<ActionResponse<{ userId: string } | null>> => {
    try {
        const session = await getCurrentAuthSession();

        if (!session) throw new Error("Necesitas iniciar sesion");

        const currentPassword = input.currentPassword.trim();
        const newPassword = input.newPassword.trim();
        const confirmPassword = input.confirmPassword.trim();

        if (!currentPassword) throw new Error("La contraseña actual es obligatoria");
        if (!newPassword) throw new Error("La nueva contraseña es obligatoria");
        if (newPassword.length < 6) throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
        if (newPassword !== confirmPassword) throw new Error("Las contraseñas no coinciden");

        const user = await prisma.user.findUnique({
            where: {
                id: session.userId,
            },
            select: {
                id: true,
                passwordHash: true,
            },
        });

        if (!user) throw new Error("No se encontro tu usuario");
        if (!user.passwordHash) throw new Error("Tu cuenta no tiene una contraseña configurada");

        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

        if (!isCurrentPasswordValid) throw new Error("La contraseña actual no es correcta");

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                passwordHash: await hashPassword(newPassword),
                sessionVersion: {
                    increment: 1,
                },
            },
        });

        await clearAuthSessionCookie();

        revalidatePath("/perfil");
        revalidatePath("/coach/dashboard");

        return {
            ok: true,
            data: {
                userId: user.id,
            },
        };
    } catch (error) {
        console.error("Error al cambiar la contraseña:", error);

        return {
            ok: false,
            data: null,
            error: getAccountErrorMessage(error, "No se pudo cambiar la contraseña"),
        };
    }
};
