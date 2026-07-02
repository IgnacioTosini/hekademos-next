'use client'

import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../animations/gsapConfig'
import {
    createScrollAnimations,
    createContactAnimations,
    createPhilosophyAnimations
} from '../animations/scrollAnimations'

export const useScrollAnimations = () => {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const isCompactViewport = window.matchMedia('(max-width: 768px)').matches

        if (prefersReducedMotion || isCompactViewport) {
            return
        }

        const ctx = gsap.context(() => {
            // Animaciones básicas
            const {
                animateSections,
                animateElements,
                animateStaggeredCards
            } = createScrollAnimations()

            const {
                animateTitleReveal,
                animateFadeUp,
                animateSplitContainer,
                animateQuoteReveal,
                animateListItems
            } = createPhilosophyAnimations()

            // Animaciones de Contact
            const {
                animateContactSplit,
                animateContactElements,
                animateContactCards,
                animateContactIcons,
                animateSocialButtons,
                animateClockTick,
                animateScheduleItems
            } = createContactAnimations()

            animateSections()
            animateElements()
            animateStaggeredCards()

            // Ejecutar animaciones de Philosophy
            animateTitleReveal()
            animateFadeUp()
            animateSplitContainer()
            animateQuoteReveal()
            animateListItems()

            // Ejecutar animaciones de Contact
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

        return () => {
            cancelAnimationFrame(refreshFrame)
            window.removeEventListener('load', refreshScrollTriggers)
            ctx.revert()
        }
    }, [])

    return { containerRef }
}
