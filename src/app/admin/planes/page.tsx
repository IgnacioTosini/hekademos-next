import { getAdminMembershipPlans } from '@/app/actions/membership.actions';
import { MembershipPlansSection } from '@/components/admin/membershipPlans/membershipPlansSection/MembershipPlansSection';
import type { Metadata } from 'next';
import './_planesPage.scss';

export const metadata: Metadata = {
    title: 'Planes',
    description: 'Administracion de planes de Hekademos.',
};

export default async function PlanesPage() {
    const plansResponse = await getAdminMembershipPlans();
    const plans = plansResponse.ok ? plansResponse.data : [];

    return (
        <div className="planes-page">
            <MembershipPlansSection plans={plans} />
        </div>
    );
}
