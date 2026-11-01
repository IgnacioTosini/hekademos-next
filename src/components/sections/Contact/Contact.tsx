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
    const showEmail = Boolean(content.email && content.email !== 'info@hekademos.com')
    const showPhone = Boolean(content.phone && content.phone !== '+54 9 11 2234-5698')
    const showAddress = Boolean(content.address && !/ejemplo/i.test(content.address))
    return (
        <section className="contactSection" id="contacto" aria-labelledby="contact-title">
            <div className="contactIntro">
                <span className="contactEyebrow">EMPEZÁ A MOVERTE</span>
                <h2 className="contactTitle animate-on-scroll" id="contact-title">{content.title}</h2>
                <p className="contactSubtitle animate-on-scroll">{content.subtitle}</p>
            </div>

            <div className='formContactInfoContainer animate-split-contact'>
                <div className="form-wrapper animate-from-left">
                    <Form content={content.form} />
                </div>
                <div className='contactInfoContainer animate-from-right'>
                    <div className='contactQuickActions animate-buttons-group'>
                        <span className="contactInfoEyebrow">HABLEMOS</span>
                        <h3>Elegí cómo querés empezar.</h3>
                        <a className='contactButton whatsapp animate-button-hover' href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <FaWhatsapp aria-hidden="true" /><span>{content.whatsappLabel}</span><span className="contactActionArrow" aria-hidden="true">↗</span>
                        </a>
                        <a className='contactButton instagram animate-button-hover' href={content.instagramUrl} target="_blank" rel="noopener noreferrer">
                            <FaInstagram aria-hidden="true" /><span>{content.instagramLabel}</span><span className="contactActionArrow" aria-hidden="true">↗</span>
                        </a>
                    </div>

                    {(showEmail || showPhone || showAddress) && <div className='contactInfo'>
                        <h3 className='contactInfoTitle animate-on-scroll'>{content.infoTitle}</h3>
                        {showEmail && <a className='contactInfoCard stagger-card' href={`mailto:${content.email}`}>
                            <span className='iconContainer animate-icon-bounce'><IoMdMail className='contactIcon' aria-hidden="true" /></span>
                            <span><small>Email</small>{content.email}</span>
                        </a>}
                        {showPhone && <a className='contactInfoCard stagger-card' href={`tel:${content.phone.replace(/[^+\d]/g, '')}`}>
                            <span className='iconContainer animate-icon-bounce'><FaPhoneAlt className='contactIcon' aria-hidden="true" /></span>
                            <span><small>Teléfono</small>{content.phone}</span>
                        </a>}
                        {showAddress && <div className='contactInfoCard stagger-card'>
                            <span className='iconContainer animate-icon-bounce'><FaMapMarkerAlt className='contactIcon' aria-hidden="true" /></span>
                            <span><small>Dirección</small>{content.address}</span>
                        </div>}
                    </div>}

                    <div className='hourContainer animate-schedule'>
                        <div className='titleContainer animate-on-scroll'>
                            <FaClock className='hourIcon animate-clock-tick' aria-hidden="true" />
                            <h3 className='contactInfoTitle'>{content.scheduleTitle}</h3>
                        </div>
                        {content.schedule.map((item, index) => <p className='hour animate-schedule-item' key={`${item.day}-${index}`}><span className='day'>{item.day}</span> {item.hours}</p>)}
                    </div>
                </div>
            </div>
        </section>
    )
}
