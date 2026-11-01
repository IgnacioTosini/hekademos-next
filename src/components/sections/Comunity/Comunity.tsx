import { ComunityCard } from '@/components/ui/ComunityCard/ComunityCard'
import './_comunity.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['community'] }

export const Comunity = ({ content }: Props) => {
    return (
        <div className="comunity" id='comunidad'>
            <div className="sectionHeader">
                <span className="sectionEyebrow">CRECEMOS JUNTOS</span>
                <h2 className='comunityTitle sectionTitle animate-on-scroll'>{content.title}</h2>
                <p className='comunitySubtitle sectionLead animate-on-scroll'>{content.subtitle}</p>
            </div>
            <div className='comunityCardList'>
                {content.items.map((item, index) => (
                    <div className="stagger-card communityItem" key={`${item.title}-${index}`}>
                        <span className="communityIndex" aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(content.items.length).padStart(2, '0')}</span>
                        <ComunityCard title={item.title} description={item.description} icon={item.icon} image={item.image} videoUrl={item.videoUrl} />
                    </div>
                ))}
            </div>
        </div>
    )
}
