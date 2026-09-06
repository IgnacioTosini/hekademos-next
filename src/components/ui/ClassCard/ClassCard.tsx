import Image from 'next/image'
import './_classCard.scss'
import { YoutubeVideoButton } from '../YoutubeVideoButton'

type ClassCardProps = {
    title: string
    description: string
    list: string[]
    image?: string
    videoUrl?: string
}

export const ClassCard = ({ title, description, list, image, videoUrl }: ClassCardProps) => {
    return (
        <div className='classCard'>
            <picture className='imgContainer'>
                {image && (
                    <Image
                        src={image}
                        alt={title}
                        width={200}
                        height={200}
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
