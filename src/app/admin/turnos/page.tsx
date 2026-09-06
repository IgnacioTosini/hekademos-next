import { getAdminWeeklyClassSchedules } from '@/app/actions/class.actions';
import { getClassCategories } from '@/app/actions/classCategory.actions';
import { getCoaches } from '@/app/actions/coach.actions';
import { ClassSchedulesSection } from '@/components/admin/classSchedules/classSchedulesSection/ClassSchedulesSection';
import type { Metadata } from 'next';
import './_turnosPage.scss';

export const metadata: Metadata = {
    title: 'Turnos',
    description: 'Administracion de turnos de Hekademos.',
};

export default async function TurnosPage() {
    const [schedulesResponse, coachesResponse, categoriesResponse] = await Promise.all([
        getAdminWeeklyClassSchedules(),
        getCoaches(),
        getClassCategories(),
    ]);
    const schedules = schedulesResponse.ok ? schedulesResponse.data : [];
    const coaches = coachesResponse.ok ? coachesResponse.data : [];
    const categories = categoriesResponse.ok ? categoriesResponse.data : [];

    return (
        <div className="turnos-page">
            <ClassSchedulesSection schedules={schedules} coaches={coaches} categories={categories} />
        </div>
    );
}
