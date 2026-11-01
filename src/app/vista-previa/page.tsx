import { redirect } from 'next/navigation';
import { getCurrentAuthSession } from '@/lib/auth-session';
import { getWeeklyClassSchedules } from '@/app/actions/class.actions';
import { getMembershipPlans } from '@/app/actions/membership.actions';
import { SiteFullPreview } from '@/components/admin/SiteFullPreview';
import { getScheduleGroups } from '@/components/sections/TrainingSchedule/TrainingSchedule';

export const metadata = { title: 'Vista previa del inicio', robots: { index: false, follow: false } };

export default async function SitePreviewPage() {
    const session = await getCurrentAuthSession();
    if (session?.role !== 'ADMIN') redirect('/auth/login?next=/admin/contenido');
    const [scheduleResponse, planResponse] = await Promise.all([getWeeklyClassSchedules(), getMembershipPlans()]);
    return <SiteFullPreview scheduleGroups={getScheduleGroups(scheduleResponse.ok ? scheduleResponse.data : [])} plans={planResponse.ok ? planResponse.data : []} />;
}
