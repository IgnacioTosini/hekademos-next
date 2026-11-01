import { getClassCategoryLabel } from '@/utils/class-category'
import { formatCurrency } from '@/utils/format'
import { buildHekademosWhatsappUrl } from '@/utils/whatsapp'
import { FaArrowRight, FaCheckCircle } from 'react-icons/fa'
import type { HomePageContent } from '@/lib/home-page-content'
import type { MembershipPlan } from '@/types/schema/memberships'
import './_membershipPlans.scss'

const buildPlanWhatsappMessage = (template: string, planName: string, category: string, trainingDaysPerWeek: number, price: string) => template
    .replaceAll('{plan}', planName)
    .replaceAll('{categoria}', category)
    .replaceAll('{dias}', String(trainingDaysPerWeek))
    .replaceAll('{precio}', price)

export const MembershipPlansView = ({ content, plans }: { content: HomePageContent['membershipPlans']; plans: MembershipPlan[] }) => (
    <div className="membershipPlans" id="planes">
        <div className="sectionHeader">
            <span className="sectionEyebrow">TU CAMINO, TU RITMO</span>
            <h2 className="membershipPlansTitle sectionTitle animate-on-scroll">{content.title}</h2>
            <p className="membershipPlansDescription sectionLead animate-on-scroll">{content.subtitle}</p>
        </div>
        <div className="membershipPlansList">
            {plans.map((plan, index) => <article className={`membershipPlanCard stagger-card${plan.isRecommended ? ' recommended' : ''}`} key={plan.id}>
                <span className="planIndex" aria-hidden="true">PLAN {String(index + 1).padStart(2, '0')}</span>
                {plan.isRecommended && <span className="recommendedBadge">{content.recommendedLabel}</span>}
                <h3>{plan.name}</h3>
                <div className="planDetails"><p><FaCheckCircle />{getClassCategoryLabel(plan.classCategory)}</p><p><FaCheckCircle />{plan.trainingDaysPerWeek} dias por semana</p></div>
                <p className="planPrice">{formatCurrency(plan.priceCents, plan.currency)}</p>
                <a className="planButton" href={buildHekademosWhatsappUrl(buildPlanWhatsappMessage(content.whatsappMessage, plan.name, getClassCategoryLabel(plan.classCategory), plan.trainingDaysPerWeek, formatCurrency(plan.priceCents, plan.currency)))} target="_blank" rel="noopener noreferrer" aria-label={`Consultar por WhatsApp sobre ${plan.name}`}>{content.actionLabel} <FaArrowRight /></a>
            </article>)}
            {plans.length === 0 && <p className="membershipPlansEmpty">{content.emptyMessage}</p>}
        </div>
    </div>
)
