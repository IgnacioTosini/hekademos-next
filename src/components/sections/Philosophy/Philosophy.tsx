import Image from 'next/image'
import './_philosophy.scss'
import type { HomePageContent } from '@/lib/home-page-content'
import { siteImageStyle } from '@/lib/site-image-style'

type Props = { content: HomePageContent['philosophy'] }

export const Philosophy = ({ content }: Props) => {
    return (
        <div className='philosophyContainer' id='filosofia'>
            <div className="sectionHeader">
                <span className="sectionEyebrow">NUESTRA FORMA DE ENTRENAR</span>
                <h2 className='philosophyTitle sectionTitle animate-title-reveal'>{content.title}</h2>
                <p className='philosophyDescription sectionLead animate-fade-up'>{content.subtitle}</p>
            </div>

            <div className='philosophySection animate-split-container'>
                <picture className='imgContainer animate-philosophy-left parallax-image'>
                    <Image src={content.image.url} alt={content.image.alt} width={400} height={400} style={siteImageStyle(content.image)} />
                    <p className='textOnImage animate-quote-reveal'>&ldquo;{content.quote}&rdquo;</p>
                </picture>

                <ul className='philosophyList animate-philosophy-right'>
                    {content.items.map((item, index) => (
                        <li className={`philosophyListItem${index === 0 ? ' is-current' : ''}`} key={`${item.title}-${index}`}>
                            <span className="philosophyStep" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                            <h3 className='animate-philosophy-text'>{item.title}</h3><p className='animate-philosophy-text'>{item.description}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
