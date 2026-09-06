import { ComunityCard } from '@/components/ui/ComunityCard/ComunityCard'
import './_comunity.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['community'] }

export const Comunity = ({ content }: Props) => {
    return (
        <div className="comunity" id='comunidad'>
            <h2 className='comunityTitle animate-on-scroll'>{content.title}</h2>
            <h3 className='comunitySubtitle animate-on-scroll'>{content.subtitle}</h3>
            <div className='comunityCardList'>
                {content.items.map((item, index) => (
                    <div className="stagger-card" key={`${item.title}-${index}`}>
                        <ComunityCard title={item.title} description={item.description} icon={item.icon} imageAlt={item.image.alt} imageUrl={item.image.url} videoUrl={item.videoUrl} />
                    </div>
                ))}
            </div>
        </div>
    )
}
