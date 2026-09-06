import { FaDotCircle } from 'react-icons/fa'
import './_pillarCard.scss'
import { YoutubeVideoButton } from '../YoutubeVideoButton'

type PillarCardProps = {
    title: string
    description: string
    videoUrl?: string
}

export const PillarCard = ({ title, description, videoUrl }: PillarCardProps) => {
    return (
        <div className='pillarCard animate-card-hover'>
            <picture className='iconContainer animate-icon-pulse'>
                <FaDotCircle className='pillar-icon' />
            </picture>
            <h4 className='pillarTitle animate-slide-up'>{title}</h4>
            <p className='pillarDescription animate-fade-text'>{description}</p>
            <YoutubeVideoButton videoUrl={videoUrl} title={title} />
        </div>
    )
}
