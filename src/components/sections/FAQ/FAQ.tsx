'use client'

import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import './_faq.scss'

const faqs = [
    {
        question: '¿Necesito experiencia previa?',
        answer: 'No. Adaptamos las progresiones a tu nivel actual para que entrenes con seguridad y puedas avanzar paso a paso.',
    },
    {
        question: '¿Pueden sumarse principiantes?',
        answer: 'Sí. La propuesta está pensada para acompañar tanto a quienes recién empiezan como a quienes ya tienen experiencia entrenando.',
    },
    {
        question: '¿Qué tengo que llevar?',
        answer: 'Ropa cómoda, agua y ganas de moverte. Nosotros te orientamos con el resto durante la clase.',
    },
    {
        question: '¿Puedo recuperar clases perdidas?',
        answer: 'Podés coordinar la recuperación según disponibilidad de cupos y horarios. Lo vemos caso por caso para cuidar la organización del grupo.',
    },
    {
        question: '¿Cómo me inscribo?',
        answer: 'Escribinos desde el formulario o por WhatsApp y te ayudamos a elegir el plan y horario que mejor se adapte a tu rutina.',
    },
]

export const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(0)

    return (
        <div className="faqSection" id="preguntas-frecuentes">
            <h2 className="faqTitle animate-on-scroll">Preguntas frecuentes</h2>
            <p className="faqDescription animate-on-scroll">
                Respuestas simples para que puedas empezar con claridad y confianza.
            </p>

            <div className="faqList">
                {faqs.map((faq, index) => {
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
