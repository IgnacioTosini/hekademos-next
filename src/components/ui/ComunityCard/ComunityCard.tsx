import Image from 'next/image'
import type { JSX } from "react";
import { IoPeopleSharp } from "react-icons/io5";
import { FaRegHeart } from "react-icons/fa";
import { FaArrowTrendUp } from "react-icons/fa6";
import './_comunityCard.scss';
import { YoutubeVideoButton } from '../YoutubeVideoButton';

type ComunityCardProps = {
    title: string;
    description: string;
    icon: "people" | "heart" | "trend";
    imageAlt: string;
    imageUrl: string;
    videoUrl?: string;
}

export const ComunityCard = ({ title, description, icon, imageAlt, imageUrl, videoUrl }: ComunityCardProps) => {
    const iconMap: Record<ComunityCardProps['icon'], JSX.Element> = {
        people: <IoPeopleSharp className="icon" />,
        heart: <FaRegHeart className="icon" />,
        trend: <FaArrowTrendUp className="icon" />
    };

    return (
        <div className='comunityCard'>
            <picture className="comunityCardImage">
                <div className="iconContainer">
                    {iconMap[icon]}
                </div>
                <Image
                    src={imageUrl}
                    alt={imageAlt}
                    width={300}
                    height={300}
                    quality={80}
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect fill='%23f0f0f0'/%3E%3C/svg%3E"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 300px"
                />
            </picture>
            <h4 className="comunityCardTitle">{title}</h4>
            <p className="comunityCardDescription">{description}</p>
            <YoutubeVideoButton videoUrl={videoUrl} title={title} />
        </div>
    )
}
