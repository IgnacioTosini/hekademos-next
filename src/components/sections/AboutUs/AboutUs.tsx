import { PillarCard } from '@/components/ui/PillarCard/PillarCard'
import './_aboutUs.scss'
import Image from 'next/image'
import type { HomePageContent } from '@/lib/home-page-content'
import { siteImageStyle } from '@/lib/site-image-style'

type Props = { content: HomePageContent['about'] }

export const AboutUs = ({ content }: Props) => {
    return (
        <div className="aboutUs" id="sobre-nosotros">
            <div className="sectionHeader">
                <span className="sectionEyebrow">NUESTRA ESENCIA</span>
                <h2 className="aboutUsTitle sectionTitle animate-title">{content.title}</h2>
            </div>
            <div className='aboutUsContent'>
                <figure className='aboutUsImage animate-image-right'>
                    <Image
                        src={content.image.url}
                        style={siteImageStyle(content.image)}
                        alt={content.image.alt}
                        width={600}
                        height={720}
                        priority={false}
                        quality={85}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect fill='%23f0f0f0'/%3E%3C/svg%3E"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                    />
                    <figcaption>HEKADEMOS <span>·</span> MOVIMIENTO CONSCIENTE</figcaption>
                </figure>
                <div className='aboutUsText animate-text-left'>
                    <span className="aboutStoryIndex" aria-hidden="true">01 / NUESTRA HISTORIA</span>
                    <h3 className="animate-on-scroll">{content.storyTitle}</h3>
                    {content.paragraphs.map((paragraph, index) => <p className="animate-on-scroll" key={index}>{paragraph}</p>)}
                    <p className='especialText animate-special-text'>&ldquo;{content.quote}&rdquo;</p>
                </div>
            </div>

            <div className='usPillars'>
                <div className="sectionHeader">
                    <span className="sectionEyebrow">LO QUE NOS MUEVE</span>
                    <h2 className="usPillarsTitle sectionTitle animate-title">{content.pillarsTitle}</h2>
                    <p className="sectionLead animate-on-scroll">{content.pillarsSubtitle}</p>
                </div>
                <div className='pillarsList'>
                    {content.pillars.map((pillar, index) => (
                        <div className="stagger-card" key={`${pillar.title}-${index}`}><span className="pillarNumber" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><PillarCard title={pillar.title} description={pillar.description} videoUrl={pillar.videoUrl} /></div>
                    ))}
                </div>
            </div>
        </div>
    )
}
