'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { TeacherCard } from '@/components/ui/TeacherCard/TeacherCard'
import type { HomePageContent } from '@/lib/home-page-content'
import './_teachers.scss'

type Props = { content: HomePageContent['teachers'] }

export const Teachers = ({ content }: Props) => {
    const [activeIndex, setActiveIndex] = useState(0)
    const rootRef = useRef<HTMLDivElement>(null)
    const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
    const rowCount = Math.max(1, Math.ceil(content.items.length / 4))
    const baseRowSize = Math.floor(content.items.length / rowCount)
    const extraCards = content.items.length % rowCount
    const rows: Array<Array<{ teacher: HomePageContent['teachers']['items'][number]; index: number }>> = []
    let nextIndex = 0
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const rowSize = baseRowSize + (rowIndex < extraCards ? 1 : 0)
        rows.push(content.items.slice(nextIndex, nextIndex + rowSize).map((teacher, offset) => ({ teacher, index: nextIndex + offset })))
        nextIndex += rowSize
    }
    const widestRow = rows[0]?.length || 1

    useEffect(() => {
        let cancelled = false
        let revert: (() => void) | undefined

        void import('@/animations/gsapConfig').then(({ gsap }) => {
            const root = rootRef.current
            if (cancelled || !root) return

            const context = gsap.context(() => {
                const media = gsap.matchMedia()
                media.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
                    const cards = root.querySelectorAll<HTMLElement>('.teacher-item')
                    cards.forEach((card, index) => {
                        const image = card.querySelector('img')
                        if (!image) return
                        gsap.to(image, {
                            scale: index === activeIndex ? 1.04 : 1,
                            filter: index === activeIndex ? 'grayscale(0%)' : 'grayscale(32%)',
                            duration: 0.45,
                            ease: 'power2.out',
                            overwrite: 'auto',
                        })
                    })
                })
                revert = () => media.revert()
            }, root)
            const cleanup = revert
            revert = () => { cleanup?.(); context.revert() }
        }).catch((error) => {
            if (!cancelled) console.error('No se pudo animar el foco de profesores:', error)
        })

        return () => { cancelled = true; revert?.() }
    }, [activeIndex])

    useEffect(() => {
        let cancelled = false
        let revert: (() => void) | undefined
        void import('@/animations/gsapConfig').then(({ gsap, ScrollTrigger }) => {
            const root = rootRef.current
            if (cancelled || !root) return
            const context = gsap.context(() => {
                const media = gsap.matchMedia()
                media.add('(max-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
                    root.querySelectorAll<HTMLElement>('.teacher-item').forEach((card, index) => {
                        gsap.fromTo(card, { autoAlpha: 0, y: 32 }, {
                            autoAlpha: 1, y: 0, duration: .65, ease: 'power2.out',
                            scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
                        })
                        ScrollTrigger.create({
                            trigger: card,
                            start: 'top center',
                            end: 'bottom center',
                            onEnter: () => setActiveIndex(index),
                            onEnterBack: () => setActiveIndex(index),
                        })
                    })
                })
                revert = () => media.revert()
            }, root)
            const cleanup = revert
            revert = () => { cleanup?.(); context.revert() }
        }).catch((error) => {
            if (!cancelled) console.error('No se pudo animar la lista de profesores:', error)
        })
        return () => { cancelled = true; revert?.() }
    }, [])

    const onCardPointerEnter = (event: PointerEvent<HTMLDivElement>, index: number) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') setActiveIndex(index)
    }

    const onFocusKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % content.items.length
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + content.items.length) % content.items.length
        else if (event.key === 'Home') nextIndex = 0
        else if (event.key === 'End') nextIndex = content.items.length - 1
        else return
        event.preventDefault()
        setActiveIndex(nextIndex)
        buttonsRef.current[nextIndex]?.focus()
    }

    return (
        <div className="teachers" id="profesores" ref={rootRef}>
            <div className="sectionHeader">
                <span className="sectionEyebrow">QUIENES TE ACOMPAÑAN</span>
                <h2 className="teachersTitle sectionTitle animate-typewriter">{content.title}</h2>
                <p className="teachersSubtitle sectionLead animate-reveal-text">{content.subtitle}</p>
            </div>
            <div className={`teacherList animate-team-entrance${rows.length > 1 ? ' has-multiple-rows' : ''}`}>
                {rows.map((row, rowIndex) => <div className="teacherRow" key={rowIndex} style={{ '--row-width': `${row.length / widestRow * 100}%` } as CSSProperties}>{row.map(({ teacher, index }) => (
                    <div className={`teacher-item stagger-card${activeIndex === index ? ' is-active' : ''}`} onPointerEnter={(event) => onCardPointerEnter(event, index)} key={`${teacher.name}-${index}`}>
                        <button
                            ref={(element) => { buttonsRef.current[index] = element }}
                            type="button"
                            className="teacherFocusButton"
                            aria-pressed={activeIndex === index}
                            aria-label={`Destacar a ${teacher.name}`}
                            onClick={() => setActiveIndex(index)}
                            onFocus={() => setActiveIndex(index)}
                            onKeyDown={(event) => onFocusKeyDown(event, index)}
                        >
                            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                            <span>Conocer a {teacher.name}</span>
                        </button>
                        <TeacherCard name={teacher.name} image={teacher.image} description={teacher.description} instagramLink={teacher.instagramUrl} videoUrl={teacher.videoUrl} />
                    </div>
                ))}</div>)}
            </div>
        </div>
    )
}
