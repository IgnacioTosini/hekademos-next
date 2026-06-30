import { getWeeklyClassSchedules } from '@/app/actions/class.actions';
import { getCoaches } from '@/app/actions/coach.actions';
import { getMembershipPlans } from '@/app/actions/membership.actions';
import { getStudents } from '@/app/actions/student.actions';
import { StudentsSection } from '@/components/admin/students/studentsSection/StudentsSection';
import type { Metadata } from 'next';
import './_alumnosPage.scss';

export const metadata: Metadata = {
    title: 'Alumnos',
    description: 'Administracion de alumnos de Hekademos.',
};

export default async function AlumnosPage() {
    const [studentsResponse, coachesResponse, plansResponse, schedulesResponse] = await Promise.all([
        getStudents(),
        getCoaches(),
        getMembershipPlans(),
        getWeeklyClassSchedules(),
    ]);
    const students = studentsResponse.ok ? studentsResponse.data : [];
    const coaches = coachesResponse.ok ? coachesResponse.data : [];
    const membershipPlans = plansResponse.ok ? plansResponse.data : [];
    const weeklySchedules = schedulesResponse.ok ? schedulesResponse.data : [];

    return (
        <div className="alumnos-page">
            <StudentsSection
                students={students}
                coaches={coaches}
                membershipPlans={membershipPlans}
                weeklySchedules={weeklySchedules}
            />
        </div>
    );
}
