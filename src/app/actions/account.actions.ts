"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthSession } from "@/lib/auth-session";
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
    if (error.message === "UNAUTHORIZED") return "Necesitas iniciar sesion";
    if (error.message === "CURRENT_PASSWORD_REQUIRED") return "La contraseña actual es obligatoria";
    if (error.message === "NEW_PASSWORD_REQUIRED") return "La nueva contraseña es obligatoria";
    if (error.message === "PASSWORD_TOO_SHORT") return "La nueva contraseña debe tener al menos 6 caracteres";
    if (error.message === "PASSWORD_MISMATCH") return "Las contraseñas no coinciden";
    if (error.message === "USER_NOT_FOUND") return "No se encontro tu usuario";
    if (error.message === "PASSWORD_NOT_SET") return "Tu cuenta no tiene una contraseña configurada";
    if (error.message === "INVALID_CURRENT_PASSWORD") return "La contraseña actual no es correcta";

    return fallback;
};

export const changeCurrentUserPassword = async (
    input: ChangePasswordInput
): Promise<ActionResponse<{ userId: string } | null>> => {
    try {
        const session = await getCurrentAuthSession();

        if (!session) throw new Error("UNAUTHORIZED");

        const currentPassword = input.currentPassword.trim();
        const newPassword = input.newPassword.trim();
        const confirmPassword = input.confirmPassword.trim();

        if (!currentPassword) throw new Error("CURRENT_PASSWORD_REQUIRED");
        if (!newPassword) throw new Error("NEW_PASSWORD_REQUIRED");
        if (newPassword.length < 6) throw new Error("PASSWORD_TOO_SHORT");
        if (newPassword !== confirmPassword) throw new Error("PASSWORD_MISMATCH");

        const user = await prisma.user.findUnique({
            where: {
                id: session.userId,
            },
            select: {
                id: true,
                passwordHash: true,
            },
        });

        if (!user) throw new Error("USER_NOT_FOUND");
        if (!user.passwordHash) throw new Error("PASSWORD_NOT_SET");

        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

        if (!isCurrentPasswordValid) throw new Error("INVALID_CURRENT_PASSWORD");

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                passwordHash: await hashPassword(newPassword),
            },
        });

        revalidatePath("/perfil");
        revalidatePath("/coach/dashboard");

        return {
            ok: true,
            data: {
                userId: user.id,
            },
        };
    } catch (error) {
        console.error("Error changing password:", error);

        return {
            ok: false,
            data: null,
            error: getAccountErrorMessage(error, "No se pudo cambiar la contraseña"),
        };
    }
};
