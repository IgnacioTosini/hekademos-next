"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { getExistingClassCategoryOption } from "@/lib/class-category";
import { prisma } from "@/lib/prisma";
import type {
    CreateMembershipPlanInput,
    MembershipPlan,
    MembershipPlanWithRelations,
    UpdateMembershipPlanInput,
} from "@/types/schema/memberships";
import { getClassCategoryLabel, isClassCategory } from "@/utils/class-category";
import {
    adminClassSchedulesPath,
    adminMembershipPlansPath,
    adminPaymentsPath,
    adminStudentsPath,
    publicHomePath,
    type ActionResponse,
} from "./_shared";

const normalizePlanInput = (input: CreateMembershipPlanInput | UpdateMembershipPlanInput) => ({
    name: input.name?.trim(),
    classCategory: input.classCategory,
    trainingDaysPerWeek: input.trainingDaysPerWeek,
    priceCents: input.priceCents,
    currency: input.currency?.trim().toUpperCase() || undefined,
    isRecommended: input.isRecommended,
    isActive: input.isActive,
});

const validatePlanInput = (input: CreateMembershipPlanInput | UpdateMembershipPlanInput, isCreate: boolean) => {
    if (isCreate && !input.name?.trim()) throw new Error("El nombre del plan es obligatorio");
    if (isCreate && !isClassCategory(input.classCategory)) throw new Error("La categoria del plan es obligatoria");
    if (input.classCategory !== undefined && !isClassCategory(input.classCategory)) {
        throw new Error("La categoria del plan no es valida");
    }
    if (input.trainingDaysPerWeek !== undefined && input.trainingDaysPerWeek < 1) {
        throw new Error("Los dias por semana deben ser mayores a cero");
    }
    if (input.priceCents !== undefined && input.priceCents < 0) {
        throw new Error("El precio mensual no puede ser negativo");
    }
};

const getPlanErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
        if (error.message === "El nombre del plan es obligatorio") return error.message;
        if (error.message === "La categoria del plan es obligatoria") return error.message;
        if (error.message === "La categoria del plan no es valida") return error.message;
        if (error.message === "La categoria debe tener entre 2 y 60 caracteres") return error.message;
        if (error.message === "La categoria seleccionada no existe") return error.message;
        if (error.message === "No se puede cambiar la categoria de un plan con alumnos activos") return error.message;
        if (error.message === "Los dias por semana deben ser mayores a cero") return error.message;
        if (error.message === "El precio mensual no puede ser negativo") return error.message;
    }

    return getAdminActionErrorMessage(error, fallback);
};

export const getMembershipPlans = async (): Promise<ActionResponse<MembershipPlan[]>> => {
    try {
        const plans = await prisma.membershipPlan.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                trainingDaysPerWeek: "asc",
            },
        });

        return {
            ok: true,
            data: plans.map((plan) => ({
                ...plan,
                classCategory: getClassCategoryLabel(plan.classCategory),
            })),
        };
    } catch (error) {
        logAdminActionError("Error al obtener los planes:", error);

        return {
            ok: false,
            data: null,
            error: "No se pudieron obtener los planes",
        };
    }
};

export const getAdminMembershipPlans = async (): Promise<ActionResponse<MembershipPlanWithRelations[]>> => {
    try {
        await requireAdminSession();

        const plans = await prisma.membershipPlan.findMany({
            orderBy: [
                {
                    trainingDaysPerWeek: "asc",
                },
                {
                    name: "asc",
                },
            ],
            include: {
                memberships: true,
            },
        });

        return {
            ok: true,
            data: plans.map((plan) => ({
                ...plan,
                classCategory: getClassCategoryLabel(plan.classCategory),
            })),
        };
    } catch (error) {
        logAdminActionError("Error al obtener los planes de administracion:", error);

        return {
            ok: false,
            data: null,
            error: getPlanErrorMessage(error, "No se pudieron obtener los planes"),
        };
    }
};

export const createMembershipPlan = async (
    input: CreateMembershipPlanInput
): Promise<ActionResponse<MembershipPlan | null>> => {
    try {
        await requireAdminSession();
        validatePlanInput(input, true);

        const normalizedInput = normalizePlanInput(input);
        const plan = await prisma.$transaction(async (tx) => {
            const category = await getExistingClassCategoryOption(tx, normalizedInput.classCategory);

            return tx.membershipPlan.create({
                data: {
                    name: normalizedInput.name!,
                    classCategory: category.name,
                    trainingDaysPerWeek: normalizedInput.trainingDaysPerWeek!,
                    priceCents: normalizedInput.priceCents!,
                    currency: normalizedInput.currency ?? "ARS",
                    isRecommended: normalizedInput.isRecommended ?? false,
                    isActive: normalizedInput.isActive ?? true,
                },
            });
        });

        revalidatePath(adminMembershipPlansPath);
        revalidatePath(adminClassSchedulesPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(publicHomePath);

        return {
            ok: true,
            data: plan,
        };
    } catch (error) {
        logAdminActionError("Error al crear el plan:", error);

        return {
            ok: false,
            data: null,
            error: getPlanErrorMessage(error, "No se pudo crear el plan"),
        };
    }
};

export const updateMembershipPlan = async (
    id: string,
    input: UpdateMembershipPlanInput
): Promise<ActionResponse<MembershipPlan | null>> => {
    try {
        await requireAdminSession();
        validatePlanInput(input, false);

        const normalizedInput = normalizePlanInput(input);
        const plan = await prisma.$transaction(async (tx) => {
            const currentPlan = await tx.membershipPlan.findUnique({
                where: { id },
                select: { classCategory: true },
            });
            const category = normalizedInput.classCategory === undefined
                ? null
                : await getExistingClassCategoryOption(tx, normalizedInput.classCategory);

            if (currentPlan && category && currentPlan.classCategory !== category.name) {
                const activeMemberships = await tx.studentMembership.count({
                    where: {
                        planId: id,
                        status: "ACTIVE",
                    },
                });

                if (activeMemberships > 0) {
                    throw new Error("No se puede cambiar la categoria de un plan con alumnos activos");
                }
            }

            return tx.membershipPlan.update({
                where: {
                    id,
                },
                data: {
                    name: normalizedInput.name,
                    classCategory: category?.name,
                    trainingDaysPerWeek: normalizedInput.trainingDaysPerWeek,
                    priceCents: normalizedInput.priceCents,
                    currency: normalizedInput.currency,
                    isRecommended: normalizedInput.isRecommended,
                    isActive: normalizedInput.isActive,
                },
            });
        });

        revalidatePath(adminMembershipPlansPath);
        revalidatePath(adminClassSchedulesPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(adminPaymentsPath);
        revalidatePath(publicHomePath);

        return {
            ok: true,
            data: plan,
        };
    } catch (error) {
        logAdminActionError("Error al actualizar el plan:", error);

        return {
            ok: false,
            data: null,
            error: getPlanErrorMessage(error, "No se pudo actualizar el plan"),
        };
    }
};

export const deleteMembershipPlan = async (
    id: string
): Promise<ActionResponse<{ id: string; deactivated: boolean } | null>> => {
    try {
        await requireAdminSession();

        const membershipsCount = await prisma.studentMembership.count({
            where: {
                planId: id,
            },
        });

        if (membershipsCount > 0) {
            await prisma.membershipPlan.update({
                where: {
                    id,
                },
                data: {
                    isActive: false,
                    isRecommended: false,
                },
            });

            revalidatePath(adminMembershipPlansPath);
            revalidatePath(adminStudentsPath);
            revalidatePath(adminPaymentsPath);
            revalidatePath(publicHomePath);

            return {
                ok: true,
                data: {
                    id,
                    deactivated: true,
                },
            };
        }

        await prisma.membershipPlan.delete({
            where: {
                id,
            },
        });

        revalidatePath(adminMembershipPlansPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(publicHomePath);

        return {
            ok: true,
            data: {
                id,
                deactivated: false,
            },
        };
    } catch (error) {
        logAdminActionError("Error al eliminar el plan:", error);

        return {
            ok: false,
            data: null,
            error: getPlanErrorMessage(error, "No se pudo eliminar el plan"),
        };
    }
};
