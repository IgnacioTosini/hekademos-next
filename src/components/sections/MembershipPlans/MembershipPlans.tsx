import { FaArrowRight, FaCheckCircle } from 'react-icons/fa'
import './_membershipPlans.scss'

const plans = [
    {
        name: 'Plan 1',
        trainingDaysPerWeek: '2 dias por semana',
        price: '$50.000',
    },
    {
        name: 'Plan 2',
        trainingDaysPerWeek: '3 dias por semana',
        price: '$55.000',
        recommended: true,
    },
    {
        name: 'Plan 3',
        trainingDaysPerWeek: '4 dias por semana',
        price: '$60.000',
    },
]

export const MembershipPlans = () => {
    return (
        <div className="membershipPlans" id="planes">
            <h2 className="membershipPlansTitle animate-on-scroll">Planes de membresía</h2>
            <p className="membershipPlansDescription animate-on-scroll">
                Opciones simples para que entrenes con frecuencia, seguimiento y una progresión sostenible.
            </p>

            <div className="membershipPlansList">
                {plans.map((plan) => (
                    <article className={`membershipPlanCard stagger-card${plan.recommended ? ' recommended' : ''}`} key={plan.name}>
                        {plan.recommended && <span className="recommendedBadge">Recomendado</span>}
                        <h3>{plan.name}</h3>

                        <div className="planDetails">
                            <p>
                                <FaCheckCircle />
                                {plan.trainingDaysPerWeek}
                            </p>
                        </div>

                        <p className="planPrice">{plan.price}</p>
                        <a className="planButton" href="#contacto">
                            Quiero este plan <FaArrowRight />
                        </a>
                    </article>
                ))}
            </div>
        </div>
    )
}
