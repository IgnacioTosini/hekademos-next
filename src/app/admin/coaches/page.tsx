import { getCoaches } from '@/app/actions/coach.actions';
import { CoachesSection } from '@/components/admin/coaches/coachesSection/CoachesSection';
import type { Metadata } from 'next';
import './_coachesPage.scss';

export const metadata: Metadata = {
    title: 'Coaches',
    description: 'Administracion de coaches de Hekademos.',
};

export default async function CoachesPage() {
    const coachesResponse = await getCoaches();
    const coaches = coachesResponse.ok ? coachesResponse.data : [];

    return (
        <div className="coaches-page">
            <CoachesSection coaches={coaches} />
        </div>
    );
}
