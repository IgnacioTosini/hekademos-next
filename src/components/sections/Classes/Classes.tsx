'use client'

import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'
import type { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ClassCard } from '@/components/ui/ClassCard/ClassCard'
import type { HomePageContent } from '@/lib/home-page-content'
import './_classes.scss'

type Props = { content: HomePageContent['classes'] }

export const Classes = ({ content }: Props) => {
    const sectionRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<ScrollTrigger | null>(null)
    const dragRef = useRef<{ pointerId: number; startX: number; startScroll: number; moved: boolean } | null>(null)

    useEffect(() => {
        let cancelled = false
        let cleanup: (() => void) | undefined

        void import('@/animations/gsapConfig').then(({ gsap, ScrollTrigger }) => {
            const section = sectionRef.current
            if (cancelled || !section) return

            const context = gsap.context(() => {
                const media = gsap.matchMedia()
                media.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
                    const track = section.querySelector<HTMLElement>('.classesContainer')
                    const viewport = section.querySelector<HTMLElement>('.classesViewport')
                    const counter = section.querySelector<HTMLElement>('.classesCurrent')
                    const progress = section.querySelector<HTMLElement>('.classesProgressFill')
                    const cards = section.querySelectorAll<HTMLElement>('.classStory')
                    if (!track || !viewport || cards.length < 2) return

                    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth)
                    const timeline = gsap.timeline({
                        scrollTrigger: {
                            trigger: section,
                            start: 'top top+=80',
                            end: () => `+=${Math.max(distance(), window.innerWidth * 0.75)}`,
                            pin: true,
                            scrub: 0.65,
                            snap: { snapTo: 1 / (cards.length - 1), duration: { min: 0.2, max: 0.45 }, delay: 0.12 },
                            anticipatePin: 1,
                            invalidateOnRefresh: true,
                            onUpdate: (self) => {
                                if (counter) counter.textContent = String(Math.round(self.progress * (cards.length - 1)) + 1).padStart(2, '0')
                                if (progress) progress.style.transform = `scaleX(${self.progress})`
                            },
                        },
                    })
                    timeline.to(track, { x: () => -distance(), ease: 'none' })
                    triggerRef.current = timeline.scrollTrigger ?? null
                    return () => { triggerRef.current = null }
                })
                cleanup = () => media.revert()
            }, sectionRef)

            const refresh = () => ScrollTrigger.refresh()
            const frame = requestAnimationFrame(refresh)
            window.addEventListener('load', refresh)
            const revert = cleanup
            cleanup = () => {
                cancelAnimationFrame(frame)
                window.removeEventListener('load', refresh)
                revert?.()
                context.revert()
            }
        }).catch((error) => {
            if (!cancelled) console.error('No se pudo inicializar la galería de clases:', error)
        })

        return () => { cancelled = true; cleanup?.() }
    }, [content.items.length])

    const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId !== event.pointerId) return
        dragRef.current = null
        event.currentTarget.classList.remove('is-dragging')
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
    }

    const startDragging = (event: PointerEvent<HTMLDivElement>) => {
        const trigger = triggerRef.current
        if (!trigger || event.pointerType !== 'mouse' || event.button !== 0 || (event.target as HTMLElement).closest('a, button')) return
        const startScroll = Math.max(trigger.start, Math.min(trigger.end, window.scrollY))
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScroll, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    const moveDragging = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current
        const trigger = triggerRef.current
        if (!drag || drag.pointerId !== event.pointerId || !trigger) return
        const delta = event.clientX - drag.startX
        if (!drag.moved && Math.abs(delta) < 5) return
        if (!drag.moved) {
            drag.moved = true
            event.currentTarget.classList.add('is-dragging')
        }
        event.preventDefault()
        const track = sectionRef.current?.querySelector<HTMLElement>('.classesContainer')
        const distance = Math.max(1, (track?.scrollWidth ?? 0) - event.currentTarget.clientWidth)
        const scrollPerPixel = (trigger.end - trigger.start) / distance
        window.scrollTo({ top: Math.max(trigger.start, Math.min(trigger.end, drag.startScroll - delta * scrollPerPixel)), behavior: 'instant' })
    }

    return (
        <section className="classes" id="clases" ref={sectionRef} aria-labelledby="classes-title">
            <div className="classesIntro">
                <span className="classesEyebrow">ENTRENÁ A TU MANERA</span>
                <h2 className="classesTitle" id="classes-title">{content.title}</h2>
                <p className="classesDescription">{content.subtitle}</p>
            </div>
            <div className="classesViewport" onPointerDown={startDragging} onPointerMove={moveDragging} onPointerUp={stopDragging} onPointerCancel={stopDragging} onDragStart={(event) => event.preventDefault()} onMouseDown={(event) => { if (triggerRef.current && !(event.target as HTMLElement).closest('a, button')) event.preventDefault() }}>
                <div className="classesContainer">
                    {content.items.map((classItem, index) => (
                        <div className="classStory" key={`${classItem.title}-${index}`}>
                            <span className="classStoryNumber" aria-hidden="true">{String(index + 1).padStart(2, '0')} / {String(content.items.length).padStart(2, '0')}</span>
                            <ClassCard title={classItem.title} description={classItem.description} list={classItem.features} image={classItem.image} videoUrl={classItem.videoUrl} />
                        </div>
                    ))}
                </div>
            </div>
            {content.items.length > 1 && <div className="classesNavigation" aria-hidden="true">
                <span><span className="classesCurrent">01</span> / {String(content.items.length).padStart(2, '0')}</span>
                <span className="classesProgress"><span className="classesProgressFill" /></span>
                <span>Deslizá para explorar</span>
            </div>}
        </section>
    )
}
