'use client'

import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import './_faq.scss'
import type { HomePageContent } from '@/lib/home-page-content'

type Props = { content: HomePageContent['faq'] }

export const FAQ = ({ content }: Props) => {
    const [openIndex, setOpenIndex] = useState(0)

    return (
        <div className="faqSection" id="preguntas-frecuentes">
            <div className="sectionHeader">
                <span className="sectionEyebrow">ANTES DE EMPEZAR</span>
                <h2 className="faqTitle sectionTitle animate-on-scroll">{content.title}</h2>
                <p className="faqDescription sectionLead animate-on-scroll">{content.subtitle}</p>
            </div>

            <div className="faqList">
                {content.items.map((faq, index) => {
                    const isOpen = openIndex === index
                    const contentId = `faq-answer-${index}`

                    return (
                        <div className={`faqItem stagger-card${isOpen ? ' open' : ''}`} key={faq.question}>
                            <button
                                className="faqQuestion"
                                type="button"
                                aria-expanded={isOpen}
                                aria-controls={contentId}
                                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                            >
                                <span className="faqQuestionLabel"><span className="faqNumber" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{faq.question}</span>
                                <FaChevronDown />
                            </button>
                            <div className="faqAnswer" id={contentId}>
                                <p>{faq.answer}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
