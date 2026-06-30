export const getActiveMembership = <
    MembershipItem extends {
        status: string;
        endDate: Date | string | null;
    }
>(
    memberships: MembershipItem[] | null | undefined,
    today: Date
) => {
    return memberships?.find((membership) => {
        if (membership.status !== "ACTIVE") return false;
        if (!membership.endDate) return true;

        return new Date(membership.endDate) >= today;
    }) ?? null;
};

export function getMembershipAmountCents<
    MembershipItem extends {
        monthlyPriceCents?: number | null;
        plan: {
            priceCents: number;
        };
    }
>(
    membership: MembershipItem
): number;
export function getMembershipAmountCents<
    MembershipItem extends {
        monthlyPriceCents?: number | null;
        plan?: {
            priceCents: number;
        } | null;
    }
>(
    membership: MembershipItem | null | undefined
): number | null;
export function getMembershipAmountCents<
    MembershipItem extends {
        monthlyPriceCents?: number | null;
        plan?: {
            priceCents: number;
        } | null;
    }
>(
    membership: MembershipItem | null | undefined
) {
    if (!membership?.plan) return null;

    return membership.monthlyPriceCents ?? membership.plan.priceCents;
}
