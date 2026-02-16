import { FaInstagram } from 'react-icons/fa';
import Image from 'next/image';
import './_teacherCard.scss'

type TeacherCardProps = {
    name: string;
    image: string;
    description: string;
    instagramLink: string;
}

export const TeacherCard = ({ name, image, description, instagramLink }: TeacherCardProps) => {
    return (
        <div className='teacherCard'>
            <picture className='imgContainer'>
                <Image src={image} alt={name} width={200} height={200} quality={80} placeholder="blur" blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%23e5e5e5'/%3E%3C/svg%3E" />
            </picture>
            <h4 className='teacherTitle'>{name}</h4>
            <p className='teacherDescription'>{description}</p>
            <a href={instagramLink} className='instagramLink' target="_blank" rel="noopener noreferrer">
                <FaInstagram className='instagramIcon'/>
            </a>
        </div>
    )
}
