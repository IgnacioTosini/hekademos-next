"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import type { ClassCategoryOption, ClassCategoryOptionInput } from "@/types/schema/common";
import { isClassCategory, normalizeClassCategoryKey, normalizeClassCategoryName } from "@/utils/class-category";
import {
    adminClassSchedulesPath,
    adminMembershipPlansPath,
    adminStudentsPath,
    publicHomePath,
    type ActionResponse,
} from "./_shared";

const normalizeCategoryInput = (input: ClassCategoryOptionInput) => ({
    name: normalizeClassCategoryName(input.name),
    isSpecialActivity: input.isSpecialActivity === true,
});

const validateCategoryInput = (input: ClassCategoryOptionInput) => {
    if (!isClassCategory(input.name)) {
        throw new Error("La categoria debe tener entre 2 y 60 caracteres");
    }
};

const getCategoryErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
        if (error.message === "La categoria debe tener entre 2 y 60 caracteres") return error.message;
        if (error.message === "Ya existe una categoria con ese nombre") return error.message;
        if (error.message === "La categoria no existe") return error.message;
        if (error.message === "No se puede eliminar una categoria que esta en uso") return error.message;
    }

    return getAdminActionErrorMessage(error, fallback);
};

const revalidateCategoryPaths = () => {
    revalidatePath(adminMembershipPlansPath);
    revalidatePath(adminClassSchedulesPath);
    revalidatePath(adminStudentsPath);
    revalidatePath(publicHomePath);
};

export const getClassCategories = async (): Promise<ActionResponse<ClassCategoryOption[]>> => {
    try {
        const categories = await prisma.classCategoryOption.findMany({
            orderBy: {
                name: "asc",
            },
        });

        return {
            ok: true,
            data: categories,
        };
    } catch (error) {
        console.error("Error al obtener las categorias de clases:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudieron obtener las categorias de clases",
        };
    }
};

export const createClassCategory = async (
    input: ClassCategoryOptionInput
): Promise<ActionResponse<ClassCategoryOption>> => {
    try {
        await requireAdminSession();
        validateCategoryInput(input);

        const normalizedInput = normalizeCategoryInput(input);
        const normalizedName = normalizeClassCategoryKey(normalizedInput.name);
        const existingCategory = await prisma.classCategoryOption.findUnique({
            where: { normalizedName },
            select: { id: true },
        });

        if (existingCategory) throw new Error("Ya existe una categoria con ese nombre");

        const category = await prisma.classCategoryOption.create({
            data: {
                ...normalizedInput,
                normalizedName,
            },
        });

        revalidateCategoryPaths();

        return {
            ok: true,
            data: category,
        };
    } catch (error) {
        logAdminActionError("Error al crear la categoria de clase:", error);

        return {
            ok: false,
            data: null,
            error: getCategoryErrorMessage(error, "No se pudo crear la categoria"),
        };
    }
};

export const updateClassCategory = async (
    id: string,
    input: ClassCategoryOptionInput
): Promise<ActionResponse<ClassCategoryOption>> => {
    try {
        await requireAdminSession();
        validateCategoryInput(input);

        const normalizedInput = normalizeCategoryInput(input);
        const normalizedName = normalizeClassCategoryKey(normalizedInput.name);
        const category = await prisma.$transaction(async (tx) => {
            const currentCategory = await tx.classCategoryOption.findUnique({
                where: { id },
            });

            if (!currentCategory) throw new Error("La categoria no existe");

            const duplicatedCategory = await tx.classCategoryOption.findFirst({
                where: {
                    normalizedName,
                    id: { not: id },
                },
                select: { id: true },
            });

            if (duplicatedCategory) throw new Error("Ya existe una categoria con ese nombre");

            if (currentCategory.name !== normalizedInput.name) {
                await Promise.all([
                    tx.membershipPlan.updateMany({
                        where: { classCategory: currentCategory.name },
                        data: { classCategory: normalizedInput.name },
                    }),
                    tx.weeklyClassSchedule.updateMany({
                        where: { classCategory: currentCategory.name },
                        data: { classCategory: normalizedInput.name },
                    }),
                ]);
            }

            return tx.classCategoryOption.update({
                where: { id },
                data: {
                    name: normalizedInput.name,
                    normalizedName,
                    isSpecialActivity: normalizedInput.isSpecialActivity,
                },
            });
        });

        revalidateCategoryPaths();

        return {
            ok: true,
            data: category,
        };
    } catch (error) {
        logAdminActionError("Error al actualizar la categoria de clase:", error);

        return {
            ok: false,
            data: null,
            error: getCategoryErrorMessage(error, "No se pudo actualizar la categoria"),
        };
    }
};

export const deleteClassCategory = async (
    id: string
): Promise<ActionResponse<{ id: string }>> => {
    try {
        await requireAdminSession();

        await prisma.$transaction(async (tx) => {
            const category = await tx.classCategoryOption.findUnique({
                where: { id },
            });

            if (!category) throw new Error("La categoria no existe");

            const [plansCount, schedulesCount] = await Promise.all([
                tx.membershipPlan.count({
                    where: { classCategory: category.name },
                }),
                tx.weeklyClassSchedule.count({
                    where: { classCategory: category.name },
                }),
            ]);

            if (plansCount > 0 || schedulesCount > 0) {
                throw new Error("No se puede eliminar una categoria que esta en uso");
            }

            await tx.classCategoryOption.delete({
                where: { id },
            });
        });

        revalidateCategoryPaths();

        return {
            ok: true,
            data: { id },
        };
    } catch (error) {
        logAdminActionError("Error al eliminar la categoria de clase:", error);

        return {
            ok: false,
            data: null,
            error: getCategoryErrorMessage(error, "No se pudo eliminar la categoria"),
        };
    }
};
