import Image from 'next/image'
import './_classCard.scss'
import { YoutubeVideoButton } from '../YoutubeVideoButton'
import type { SiteContentImage } from '@/lib/home-page-content'
import { siteImageStyle } from '@/lib/site-image-style'

type ClassCardProps = {
    title: string
    description: string
    list: string[]
    image?: SiteContentImage
    videoUrl?: string
}

export const ClassCard = ({ title, description, list, image, videoUrl }: ClassCardProps) => {
    return (
        <div className='classCard'>
            <picture className='imgContainer'>
                {image && (
                    <Image
                        src={image.url}
                        style={siteImageStyle(image)}
                        alt={title}
                        width={900}
                        height={600}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className='classCardImage'
                        quality={80}
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23e5e5e5'/%3E%3C/svg%3E"
                    />
                )}
            </picture>
            <h3 className='classCardTitle'>{title}</h3>
            <p className='classCardDescription'>{description}</p>
            <ul className='classCardList'>
                {list.map((item, index) => (
                    <li key={index} className='classCardListItem'>{item}</li>
                ))}
            </ul>
            <YoutubeVideoButton videoUrl={videoUrl} title={title} />
        </div>
    )
}
