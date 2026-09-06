import Image from 'next/image'
import './_philosophy.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['philosophy'] }

export const Philosophy = ({ content }: Props) => {
    return (
        <div className='philosophyContainer' id='filosofia'>
            <h2 className='philosophyTitle animate-title-reveal'>{content.title}</h2>
            <p className='philosophyDescription animate-fade-up'>{content.subtitle}</p>

            <div className='philosophySection animate-split-container'>
                <picture className='imgContainer animate-philosophy-left parallax-image'>
                    <Image src={content.image.url} alt={content.image.alt} width={400} height={400} />
                    <p className='textOnImage animate-quote-reveal'>&ldquo;{content.quote}&rdquo;</p>
                </picture>

                <ul className='philosophyList animate-philosophy-right'>
                    {content.items.map((item, index) => (
                        <li className='philosophyListItem animate-list-item' data-index={index} key={`${item.title}-${index}`}>
                            <h3 className='animate-philosophy-text'>{item.title}</h3><p className='animate-philosophy-text'>{item.description}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
