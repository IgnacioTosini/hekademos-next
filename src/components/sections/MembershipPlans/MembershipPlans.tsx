import { getMembershipPlans } from '@/app/actions/membership.actions'
import { formatCurrency } from '@/utils/format'
import { buildHekademosWhatsappUrl } from '@/utils/whatsapp'
import { FaArrowRight, FaCheckCircle } from 'react-icons/fa'
import './_membershipPlans.scss'

const buildPlanWhatsappMessage = (planName: string, trainingDaysPerWeek: number, price: string) => (
    `Hola Hekademos, quiero consultar por el ${planName} de ${trainingDaysPerWeek} dias por semana (${price}).`
)

export const MembershipPlans = async () => {
    const plansResponse = await getMembershipPlans()
    const plans = plansResponse.ok ? plansResponse.data : []

    return (
        <div className="membershipPlans" id="planes">
            <h2 className="membershipPlansTitle animate-on-scroll">Planes de membresía</h2>
            <p className="membershipPlansDescription animate-on-scroll">
                Opciones simples para que entrenes con frecuencia, seguimiento y una progresión sostenible.
            </p>

            <div className="membershipPlansList">
                {plans.map((plan) => (
                    <article className={`membershipPlanCard stagger-card${plan.isRecommended ? ' recommended' : ''}`} key={plan.id}>
                        {plan.isRecommended && <span className="recommendedBadge">Recomendado</span>}
                        <h3>{plan.name}</h3>

                        <div className="planDetails">
                            <p>
                                <FaCheckCircle />
                                {plan.trainingDaysPerWeek} dias por semana
                            </p>
                        </div>

                        <p className="planPrice">{formatCurrency(plan.priceCents, plan.currency)}</p>
                        <a
                            className="planButton"
                            href={buildHekademosWhatsappUrl(buildPlanWhatsappMessage(
                                plan.name,
                                plan.trainingDaysPerWeek,
                                formatCurrency(plan.priceCents, plan.currency)
                            ))}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Consultar por WhatsApp sobre ${plan.name}`}
                        >
                            Quiero este plan <FaArrowRight />
                        </a>
                    </article>
                ))}

                {plans.length === 0 && (
                    <p className="membershipPlansEmpty">
                        Por ahora no hay planes disponibles. Escribinos y te contamos las opciones vigentes.
                    </p>
                )}
            </div>
        </div>
    )
}
