import { unstable_cache } from "next/cache";
import { getWeeklyClassSchedules } from "@/app/actions/class.actions";
import { getMembershipPlans } from "@/app/actions/membership.actions";
import { PUBLIC_PLANS_CACHE_TAG, PUBLIC_SCHEDULES_CACHE_TAG } from "@/lib/public-home-cache-tags";

export const getCachedPublicSchedules = unstable_cache(async () => {
    const result = await getWeeklyClassSchedules();
    if (!result.ok) throw new Error("No se pudieron cargar los horarios públicos");
    return result.data;
}, [PUBLIC_SCHEDULES_CACHE_TAG], {
    tags: [PUBLIC_SCHEDULES_CACHE_TAG],
    revalidate: 60,
});

export const getCachedPublicPlans = unstable_cache(async () => {
    const result = await getMembershipPlans();
    if (!result.ok) throw new Error("No se pudieron cargar los planes públicos");
    return result.data;
}, [PUBLIC_PLANS_CACHE_TAG], {
    tags: [PUBLIC_PLANS_CACHE_TAG],
    revalidate: 300,
});
