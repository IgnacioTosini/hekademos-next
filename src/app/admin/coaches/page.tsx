import { getAdminUserPage, getCoachSpecialties } from '@/app/actions/admin-user-page.actions';
import { CoachesSection } from '@/components/admin/coaches/coachesSection/CoachesSection';
import type { Metadata } from 'next';
import './_coachesPage.scss';

export const metadata: Metadata = {
    title: 'Coaches',
    description: 'Administracion de coaches de Hekademos.',
};

export default async function CoachesPage() {
    const [coachesResponse, specialtiesResponse] = await Promise.all([getAdminUserPage('coaches'), getCoachSpecialties()]);
    const coachesPage = coachesResponse.ok ? coachesResponse.data : { items: [], total: 0, filteredTotal: 0, page: 1 };
    const specialties = specialtiesResponse.ok ? specialtiesResponse.data : [];

    return (
        <div className="coaches-page">
            <CoachesSection initialPage={coachesPage} specialties={specialties} />
        </div>
    );
}
