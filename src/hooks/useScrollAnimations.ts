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
                createContactAnimations,
                createPhilosophyAnimations,
            } = animationModule
            const ctx = gsap.context(() => {
                const { animateSections, animateElements, animateStaggeredCards } = createScrollAnimations()
                const {
                    animateTitleReveal,
                    animateFadeUp,
                    animateSplitContainer,
                    animateQuoteReveal,
                    animateListItems,
                } = createPhilosophyAnimations()
                const {
                    animateContactSplit,
                    animateContactElements,
                    animateContactCards,
                    animateContactIcons,
                    animateSocialButtons,
                    animateClockTick,
                    animateScheduleItems,
                } = createContactAnimations()

                animateSections()
                animateElements()
                animateStaggeredCards()
                animateTitleReveal()
                animateFadeUp()
                animateSplitContainer()
                animateQuoteReveal()
                animateListItems()
                animateContactSplit()
                animateContactElements()
                animateContactCards()
                animateContactIcons()
                animateSocialButtons()
                animateClockTick()
                animateScheduleItems()
            }, containerRef)
            const refreshScrollTriggers = () => ScrollTrigger.refresh()
            const refreshFrame = requestAnimationFrame(refreshScrollTriggers)

            window.addEventListener('load', refreshScrollTriggers)
            disposeAnimations = () => {
                cancelAnimationFrame(refreshFrame)
                window.removeEventListener('load', refreshScrollTriggers)
                ctx.revert()
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
