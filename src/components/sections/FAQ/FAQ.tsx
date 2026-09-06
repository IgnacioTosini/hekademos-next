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
            <h2 className="faqTitle animate-on-scroll">{content.title}</h2>
            <p className="faqDescription animate-on-scroll">{content.subtitle}</p>

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
                                <span>{faq.question}</span>
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
