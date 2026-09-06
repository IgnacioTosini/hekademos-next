import { getClassCategories } from '@/app/actions/classCategory.actions';
import { getAdminMembershipPlans } from '@/app/actions/membership.actions';
import { MembershipPlansSection } from '@/components/admin/membershipPlans/membershipPlansSection/MembershipPlansSection';
import type { Metadata } from 'next';
import './_planesPage.scss';

export const metadata: Metadata = {
    title: 'Planes',
    description: 'Administracion de planes de Hekademos.',
};

export default async function PlanesPage() {
    const [plansResponse, categoriesResponse] = await Promise.all([
        getAdminMembershipPlans(),
        getClassCategories(),
    ]);
    const plans = plansResponse.ok ? plansResponse.data : [];
    const categories = categoriesResponse.ok ? categoriesResponse.data : [];

    return (
        <div className="planes-page">
            <MembershipPlansSection plans={plans} categories={categories} />
        </div>
    );
}
