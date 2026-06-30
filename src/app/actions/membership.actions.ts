"use server";

import { revalidatePath } from "next/cache";
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import type {
    CreateMembershipPlanInput,
    MembershipPlan,
    MembershipPlanWithRelations,
    UpdateMembershipPlanInput,
} from "@/types/schema/memberships";
import {
    adminMembershipPlansPath,
    adminPaymentsPath,
    adminStudentsPath,
    type ActionResponse,
} from "./_shared";

const normalizePlanInput = (input: CreateMembershipPlanInput | UpdateMembershipPlanInput) => ({
    name: input.name?.trim(),
    trainingDaysPerWeek: input.trainingDaysPerWeek,
    priceCents: input.priceCents,
    currency: input.currency?.trim().toUpperCase() || undefined,
    isRecommended: input.isRecommended,
    isActive: input.isActive,
});

const validatePlanInput = (input: CreateMembershipPlanInput | UpdateMembershipPlanInput, isCreate: boolean) => {
    if (isCreate && !input.name?.trim()) throw new Error("PLAN_NAME_REQUIRED");
    if (input.trainingDaysPerWeek !== undefined && input.trainingDaysPerWeek < 1) {
        throw new Error("PLAN_DAYS_INVALID");
    }
    if (input.priceCents !== undefined && input.priceCents < 0) {
        throw new Error("PLAN_PRICE_INVALID");
    }
};

const getPlanErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
        if (error.message === "PLAN_NAME_REQUIRED") return "El nombre del plan es obligatorio";
        if (error.message === "PLAN_DAYS_INVALID") return "Los dias por semana deben ser mayores a cero";
        if (error.message === "PLAN_PRICE_INVALID") return "El precio mensual no puede ser negativo";
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
            data: plans,
        };
    } catch (error) {
        logAdminActionError("Error getting membership plans:", error);

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
            data: plans,
        };
    } catch (error) {
        logAdminActionError("Error getting admin membership plans:", error);

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
        const plan = await prisma.membershipPlan.create({
            data: {
                name: normalizedInput.name!,
                trainingDaysPerWeek: normalizedInput.trainingDaysPerWeek!,
                priceCents: normalizedInput.priceCents!,
                currency: normalizedInput.currency ?? "ARS",
                isRecommended: normalizedInput.isRecommended ?? false,
                isActive: normalizedInput.isActive ?? true,
            },
        });

        revalidatePath(adminMembershipPlansPath);
        revalidatePath(adminStudentsPath);

        return {
            ok: true,
            data: plan,
        };
    } catch (error) {
        logAdminActionError("Error creating membership plan:", error);

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
        const plan = await prisma.membershipPlan.update({
            where: {
                id,
            },
            data: {
                name: normalizedInput.name,
                trainingDaysPerWeek: normalizedInput.trainingDaysPerWeek,
                priceCents: normalizedInput.priceCents,
                currency: normalizedInput.currency,
                isRecommended: normalizedInput.isRecommended,
                isActive: normalizedInput.isActive,
            },
        });

        revalidatePath(adminMembershipPlansPath);
        revalidatePath(adminStudentsPath);
        revalidatePath(adminPaymentsPath);

        return {
            ok: true,
            data: plan,
        };
    } catch (error) {
        logAdminActionError("Error updating membership plan:", error);

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

        return {
            ok: true,
            data: {
                id,
                deactivated: false,
            },
        };
    } catch (error) {
        logAdminActionError("Error deleting membership plan:", error);

        return {
            ok: false,
            data: null,
            error: getPlanErrorMessage(error, "No se pudo eliminar el plan"),
        };
    }
};
