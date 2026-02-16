import Image from 'next/image'
import type { JSX } from "react";
import { IoPeopleSharp } from "react-icons/io5";
import { FaRegHeart } from "react-icons/fa";
import { FaArrowTrendUp } from "react-icons/fa6";
import './_comunityCard.scss';

type ComunityCardProps = {
    title: string;
    description: string;
    image: string;
    imageUrl: string;
}

export const ComunityCard = ({ title, description, image, imageUrl }: ComunityCardProps) => {
    const iconMap: { [key: string]: JSX.Element } = {
        "Respeto": <IoPeopleSharp className="icon" />,
        "Compañerismo": <FaRegHeart className="icon" />,
        "Progreso compartido": <FaArrowTrendUp className="icon" />
    };

    return (
        <div className='comunityCard'>
            <picture className="comunityCardImage">
                <div className="iconContainer">
                    {iconMap[image]}
                </div>
                <Image
                    src={imageUrl}
                    alt={image}
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
        </div>
    )
}