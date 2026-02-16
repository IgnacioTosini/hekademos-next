import { FaDotCircle } from 'react-icons/fa'
import './_pillarCard.scss'

type PillarCardProps = {
    title: string
    description: string
}

export const PillarCard = ({ title, description }: PillarCardProps) => {
    return (
        <div className='pillarCard animate-card-hover'>
            <picture className='iconContainer animate-icon-pulse'>
                <FaDotCircle className='pillar-icon' />
            </picture>
            <h4 className='pillarTitle animate-slide-up'>{title}</h4>
            <p className='pillarDescription animate-fade-text'>{description}</p>
        </div>
    )
}