'use client'

import { useEffect, useRef } from 'react'

export const useScrollAnimations = () => {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const isCompactViewport = window.matchMedia('(max-width: 768px)').matches

        if (prefersReducedMotion || isCompactViewport) {
            return
        }

        let disposed = false
        let disposeAnimations: (() => void) | undefined

        const initializeAnimations = async () => {
            const [gsapModule, animationModule] = await Promise.all([
                import('../animations/gsapConfig'),
                import('../animations/scrollAnimations'),
            ])

            if (disposed) return

            const { gsap, ScrollTrigger } = gsapModule
            const {
                createScrollAnimations,
                createAboutAnimations,
                createContactAnimations,
                createPhilosophyAnimations,
            } = animationModule
            const baseContext = gsap.context(() => {
                const { animateSections, animateElements, animateStaggeredCards } = createScrollAnimations()
                animateSections()
                createAboutAnimations()
                animateElements()
                animateStaggeredCards()
            }, containerRef)

            const deferredContexts: Array<{ revert: () => void }> = []
            const refreshFrames = new Set<number>()
            const refreshScrollTriggers = () => ScrollTrigger.refresh()
            const queueRefresh = () => {
                const frame = requestAnimationFrame(() => {
                    refreshFrames.delete(frame)
                    refreshScrollTriggers()
                })
                refreshFrames.add(frame)
            }
            queueRefresh()
            window.addEventListener('load', refreshScrollTriggers)

            const deferredSections = new Map<Element, () => void>()
            const philosophySection = containerRef.current?.querySelector('.philosophy-section')
            const contactSection = containerRef.current?.querySelector('.contact-section')

            if (philosophySection) deferredSections.set(philosophySection, () => {
                const { animateTitleReveal, animateFadeUp, animateSplitContainer, animateQuoteReveal, animateScrollFocus } = createPhilosophyAnimations()
                animateTitleReveal()
                animateFadeUp()
                animateSplitContainer()
                animateQuoteReveal()
                animateScrollFocus()
            })

            if (contactSection) deferredSections.set(contactSection, () => {
                const { animateContactSplit, animateContactElements, animateContactCards, animateContactIcons, animateSocialButtons, animateClockTick, animateScheduleItems } = createContactAnimations()
                animateContactSplit()
                animateContactElements()
                animateContactCards()
                animateContactIcons()
                animateSocialButtons()
                animateClockTick()
                animateScheduleItems()
            })

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return
                    const initialize = deferredSections.get(entry.target)
                    if (!initialize) return
                    observer.unobserve(entry.target)
                    deferredSections.delete(entry.target)
                    deferredContexts.push(gsap.context(initialize, containerRef))
                    queueRefresh()
                })
            }, { rootMargin: '900px 0px' })
            deferredSections.forEach((_, element) => observer.observe(element))

            disposeAnimations = () => {
                observer.disconnect()
                refreshFrames.forEach(cancelAnimationFrame)
                window.removeEventListener('load', refreshScrollTriggers)
                deferredContexts.forEach((context) => context.revert())
                baseContext.revert()
            }
        }

        void initializeAnimations().catch((error) => {
            if (!disposed) console.error('No se pudieron inicializar las animaciones:', error)
        })

        return () => {
            disposed = true
            disposeAnimations?.()
        }
    }, [])

    return { containerRef }
}
