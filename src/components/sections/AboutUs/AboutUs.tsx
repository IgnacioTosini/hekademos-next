import { PillarCard } from '@/components/ui/PillarCard/PillarCard'
import './_aboutUs.scss'
import Image from 'next/image'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['about'] }

export const AboutUs = ({ content }: Props) => {
    return (
        <div className="aboutUs" id="sobre-nosotros">
            <h2 className="aboutUsTitle animate-title">{content.title}</h2>
            <div className='aboutUsContent'>
                <div className='aboutUsText animate-text-left'>
                    <h3 className="animate-on-scroll">{content.storyTitle}</h3>
                    {content.paragraphs.map((paragraph, index) => <p className="animate-on-scroll" key={index}>{paragraph}</p>)}
                    <p className='especialText animate-special-text'>&ldquo;{content.quote}&rdquo;</p>
                </div>
                <picture className='aboutUsImage animate-image-right'>
                    <Image
                        src={content.image.url}
                        alt={content.image.alt}
                        width={600}
                        height={400}
                        priority={false}
                        quality={85}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect fill='%23f0f0f0'/%3E%3C/svg%3E"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    />
                </picture>
            </div>

            <div className='usPillars'>
                <h2 className="usPillarsTitle animate-title">{content.pillarsTitle}</h2>
                <p className="animate-on-scroll">{content.pillarsSubtitle}</p>
                <div className='pillarsList'>
                    {content.pillars.map((pillar, index) => (
                        <div className="stagger-card" key={`${pillar.title}-${index}`}><PillarCard title={pillar.title} description={pillar.description} videoUrl={pillar.videoUrl} /></div>
                    ))}
                </div>
            </div>
        </div>
    )
}
