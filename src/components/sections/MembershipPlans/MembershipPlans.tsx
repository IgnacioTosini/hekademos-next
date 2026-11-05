import { getCachedPublicPlans } from '@/lib/public-home-data'
import { MembershipPlansView } from './MembershipPlansView'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['membershipPlans'] }

export const MembershipPlans = async ({ content }: Props) => {
    const plans = await getCachedPublicPlans().catch(() => [])

    return <MembershipPlansView content={content} plans={plans} />
}
