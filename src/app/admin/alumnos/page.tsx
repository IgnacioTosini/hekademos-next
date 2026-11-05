import { getWeeklyClassSchedules } from '@/app/actions/class.actions';
import { getCoaches } from '@/app/actions/coach.actions';
import { getMembershipPlans } from '@/app/actions/membership.actions';
import { getAdminUserPage } from '@/app/actions/admin-user-page.actions';
import { StudentsSection } from '@/components/admin/students/studentsSection/StudentsSection';
import type { Metadata } from 'next';
import './_alumnosPage.scss';

export const metadata: Metadata = {
    title: 'Alumnos',
    description: 'Administracion de alumnos de Hekademos.',
};

export default async function AlumnosPage() {
    const [studentsResponse, coachesResponse, plansResponse, schedulesResponse] = await Promise.all([
        getAdminUserPage('students'),
        getCoaches(),
        getMembershipPlans(),
        getWeeklyClassSchedules(),
    ]);
    const studentsPage = studentsResponse.ok ? studentsResponse.data : { items: [], total: 0, filteredTotal: 0, page: 1 };
    const coaches = coachesResponse.ok ? coachesResponse.data : [];
    const membershipPlans = plansResponse.ok ? plansResponse.data : [];
    const weeklySchedules = schedulesResponse.ok ? schedulesResponse.data : [];

    return (
        <div className="alumnos-page">
            <StudentsSection
                initialPage={studentsPage}
                coaches={coaches}
                membershipPlans={membershipPlans}
                weeklySchedules={weeklySchedules}
            />
        </div>
    );
}
