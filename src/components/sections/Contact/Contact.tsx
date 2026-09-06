'use client'

import { FaClock, FaInstagram, FaMapMarkerAlt, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa'
import { IoMdMail } from 'react-icons/io'
import { Form } from '@/components/ui/Form/Form'
import { buildHekademosWhatsappUrl } from '@/utils/whatsapp'
import './_contact.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['contact'] }

export const Contact = ({ content }: Props) => {
    const whatsappUrl = buildHekademosWhatsappUrl(content.whatsappMessage)
    return (
        <div className="contactSection" id="contacto">
            <h2 className="contactTitle animate-on-scroll">{content.title}</h2>
            <p className="contactSubtitle animate-on-scroll">{content.subtitle}</p>

            <div className='formContactInfoContainer animate-split-contact'>
                <div className="form-wrapper animate-from-left">
                    <Form content={content.form} />
                </div>
                <div className='contactInfoContainer animate-from-right'>
                    <div className='contactInfo'>
                        <h3 className='contactInfoTitle animate-on-scroll'>{content.infoTitle}</h3>
                        <div className='contactInfoCard stagger-card'>
                            <picture className='iconContainer animate-icon-bounce'>
                                <IoMdMail className='contactIcon' />
                            </picture>
                            <p>{content.email}</p>
                        </div>
                        <div className='contactInfoCard stagger-card'>
                            <picture className='iconContainer animate-icon-bounce'>
                                <FaPhoneAlt className='contactIcon' />
                            </picture>
                            <p>{content.phone}</p>
                        </div>
                        <div className='contactInfoCard stagger-card'>
                            <picture className='iconContainer animate-icon-bounce'>
                                <FaMapMarkerAlt className='contactIcon' />
                            </picture>
                            <p>{content.address}</p>
                        </div>
                    </div>

                    <div className='buttonsContainer animate-buttons-group'>
                        <a
                            className='contactButton whatsapp animate-button-hover'
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Escribir por WhatsApp a Hekademos"
                        >
                            <FaWhatsapp />
                            <span>{content.whatsappLabel}</span>
                        </a>
                        <button className='contactButton instagram animate-button-hover' onClick={() => window.open(content.instagramUrl, '_blank', 'noopener,noreferrer')}><FaInstagram /><span>{content.instagramLabel}</span></button>
                    </div>

                    <div className='hourContainer animate-schedule'>
                        <div className='titleContainer animate-on-scroll'>
                            <FaClock className='hourIcon animate-clock-tick' />
                            <h3 className='contactInfoTitle'>{content.scheduleTitle}</h3>
                        </div>
                        {content.schedule.map((item, index) => <p className='hour animate-schedule-item' key={`${item.day}-${index}`}><span className='day'>{item.day}</span> {item.hours}</p>)}
                    </div>
                </div>
            </div>
        </div>
    )
}
