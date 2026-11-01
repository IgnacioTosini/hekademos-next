import { getMembershipPlans } from '@/app/actions/membership.actions'
import { MembershipPlansView } from './MembershipPlansView'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['membershipPlans'] }

export const MembershipPlans = async ({ content }: Props) => {
    const plansResponse = await getMembershipPlans()
    const plans = plansResponse.ok ? plansResponse.data : []

    return <MembershipPlansView content={content} plans={plans} />
}
