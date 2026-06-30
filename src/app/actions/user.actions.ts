"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isValidOptionalPhone } from "@/lib/form-validation";
import type {
    CreateUserInput,
    CreateUserImageInput,
    Role,
    UpdateUserInput,
    UserStatus,
    UserImage,
    UserWithRelations,
} from "@/types/schema/users";
import {
    adminCoachesPath,
    adminStudentsPath,
    adminUsersPath,
    getUserWithRelations,
    normalizeEmail,
    sanitizeUserForClient,
    toDate,
    userInclude,
    type ActionResponse,
} from "./_shared";

const getUserActionErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message === "INVALID_PHONE") {
        return "Revisa el telefono ingresado";
    }

    return getAdminActionErrorMessage(error, fallback);
};

const validateUserInput = (input: CreateUserInput | UpdateUserInput) => {
    if (!isValidOptionalPhone(input.phone)) {
        throw new Error("INVALID_PHONE");
    }
};

export const getUsers = async (): Promise<ActionResponse<UserWithRelations[]>> => {
    try {
        await requireAdminSession();

        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: "desc",
            },
            include: userInclude,
        });

        return {
            ok: true,
            data: users.map((user) => sanitizeUserForClient(user)),
        };
    } catch (error) {
        logAdminActionError("Error getting users:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudieron obtener los usuarios"),
        };
    }
};

export const getUserById = async (id: string): Promise<ActionResponse<UserWithRelations | null>> => {
    if (!id) {
        return {
            ok: false,
            data: null,
            error: "El id del usuario es requerido",
        };
    }

    try {
        await requireAdminSession();

        const user = await getUserWithRelations(id);

        return {
            ok: true,
            data: sanitizeUserForClient(user),
        };
    } catch (error) {
        logAdminActionError("Error getting user by id:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo obtener el usuario"),
        };
    }
};

export const getUserByEmail = async (email: string): Promise<ActionResponse<UserWithRelations | null>> => {
    if (!email) {
        return {
            ok: false,
            data: null,
            error: "El email del usuario es requerido",
        };
    }

    try {
        await requireAdminSession();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizeEmail(email),
            },
            include: userInclude,
        });

        return {
            ok: true,
            data: sanitizeUserForClient(user),
        };
    } catch (error) {
        logAdminActionError("Error getting user by email:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo obtener el usuario"),
        };
    }
};

export const createUser = async (
    input: CreateUserInput
): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();
        validateUserInput(input);

        const passwordHash = input.password ? await hashPassword(input.password) : input.passwordHash;

        const user = await prisma.user.create({
            data: {
                email: normalizeEmail(input.email),
                name: input.name,
                phone: input.phone,
                passwordHash,
                emailVerified: toDate(input.emailVerified),
                role: input.role ?? "STUDENT",
                status: input.status ?? "ACTIVE",
                image: input.image
                    ? {
                        create: {
                            url: input.image.url,
                            publicId: input.image.publicId,
                        },
                    }
                    : undefined,
            },
            include: userInclude,
        });

        revalidatePath(adminUsersPath);

        return {
            ok: true,
            data: sanitizeUserForClient(user),
        };
    } catch (error) {
        logAdminActionError("Error creating user:", error);

        return {
            ok: false,
            data: null,
            error: getUserActionErrorMessage(error, "No se pudo crear el usuario"),
        };
    }
};

export const updateUser = async (
    id: string,
    input: UpdateUserInput
): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();
        validateUserInput(input);

        const passwordHash = input.password ? await hashPassword(input.password) : input.passwordHash;

        const user = await prisma.user.update({
            where: {
                id,
            },
            data: {
                email: input.email ? normalizeEmail(input.email) : undefined,
                name: input.name,
                phone: input.phone,
                passwordHash,
                emailVerified: toDate(input.emailVerified),
                role: input.role,
                status: input.status,
            },
            include: userInclude,
        });

        if (input.image === null) {
            await prisma.userImage.deleteMany({
                where: {
                    userId: id,
                },
            });
        }

        if (input.image) {
            await prisma.userImage.upsert({
                where: {
                    userId: id,
                },
                update: {
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
                create: {
                    userId: id,
                    url: input.image.url,
                    publicId: input.image.publicId,
                },
            });
        }

        const updatedUser = await getUserWithRelations(user.id);

        revalidatePath(adminUsersPath);

        return {
            ok: true,
            data: sanitizeUserForClient(updatedUser),
        };
    } catch (error) {
        logAdminActionError("Error updating user:", error);

        return {
            ok: false,
            data: null,
            error: getUserActionErrorMessage(error, "No se pudo actualizar el usuario"),
        };
    }
};

export const updateUserStatus = async (
    id: string,
    status: UserStatus
): Promise<ActionResponse<UserWithRelations | null>> => {
    return updateUser(id, { status });
};

export const updateUserRole = async (
    id: string,
    role: Role
): Promise<ActionResponse<UserWithRelations | null>> => {
    return updateUser(id, { role });
};

export const upsertUserImage = async (
    userId: string,
    input: CreateUserImageInput
): Promise<ActionResponse<UserImage | null>> => {
    try {
        await requireAdminSession();

        const image = await prisma.userImage.upsert({
            where: {
                userId,
            },
            update: {
                url: input.url,
                publicId: input.publicId,
            },
            create: {
                userId,
                url: input.url,
                publicId: input.publicId,
            },
        });

        revalidatePath(adminUsersPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(adminCoachesPath);

        return {
            ok: true,
            data: image,
        };
    } catch (error) {
        logAdminActionError("Error upserting user image:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo actualizar la imagen del usuario"),
        };
    }
};

export const deleteUserImage = async (
    userId: string
): Promise<ActionResponse<{ userId: string } | null>> => {
    try {
        await requireAdminSession();

        await prisma.userImage.deleteMany({
            where: {
                userId,
            },
        });

        revalidatePath(adminUsersPath);
        revalidatePath(adminCoachesPath);

        return {
            ok: true,
            data: { userId },
        };
    } catch (error) {
        logAdminActionError("Error deleting user image:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo eliminar la imagen del usuario"),
        };
    }
};

export const deleteUser = async (id: string): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();

        const user = await prisma.user.delete({
            where: {
                id,
            },
            include: userInclude,
        });

        revalidatePath(adminUsersPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(adminCoachesPath);

        return {
            ok: true,
            data: sanitizeUserForClient(user),
        };
    } catch (error) {
        logAdminActionError("Error deleting user:", error);

        return {
            ok: false,
            data: null,
            error: getAdminActionErrorMessage(error, "No se pudo eliminar el usuario"),
        };
    }
};
