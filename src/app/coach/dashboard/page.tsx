import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ChangePasswordButton } from '@/components/account/changePasswordButton/ChangePasswordButton';
import { LogoutIconButton } from '@/components/auth/logoutIconButton/LogoutIconButton';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { CoachDashboard } from '@/components/platform/coach/coachDashboard/CoachDashboard';
import { CoachProfileEditor } from '@/components/platform/coach/coachProfileEditor/CoachProfileEditor';
import { getCurrentAuthSession } from '@/lib/auth-session';
import { getCoachDashboardPageData } from '@/lib/coach-dashboard-page-data';
import './_coachDashboardPage.scss';

export const metadata: Metadata = { title: 'Panel de coach', robots: { index: false, follow: false } };

export default async function CoachDashboardPage() {
    const session = await getCurrentAuthSession();
    if (!session) redirect('/auth/login?next=/coach/dashboard');
    if (session.role === 'ADMIN') redirect('/admin');
    if (session.role !== 'COACH') redirect('/perfil');

    const data = await getCoachDashboardPageData(session.userId);
    if (!data) redirect('/');
    const { coach, students, attendanceSchedules, communityResponse } = data;

    return (
        <main className="coach-dashboard-page">
            <LogoutIconButton />
            <CoachDashboard
                coachName={coach.user.name || coach.user.email}
                students={students}
                attendanceSchedules={attendanceSchedules}
                accountActions={(
                    <>
                        <CoachProfileEditor
                            account={{
                                email: coach.user.email,
                                name: coach.user.name,
                                phone: coach.user.phone,
                                bio: coach.bio,
                                specialty: coach.specialty,
                                instagram: coach.instagram,
                                paymentAlias: coach.paymentAlias,
                                paymentAccountHolder: coach.paymentAccountHolder,
                                image: coach.user.image,
                            }}
                        />
                        <ChangePasswordButton />
                    </>
                )}
            />
            {communityResponse.ok && <CommunityFeed data={communityResponse.data} embedded />}
        </main>
    );
}
