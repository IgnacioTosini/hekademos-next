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
        const ctx = gsap.context(() => {
            // Animaciones básicas
            const {
                animateBanner,
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

            // Ejecutar animaciones básicas
            animateBanner()
            animateSections()
            animateElements()
            animateStaggeredCards()

            // Ejecutar animaciones de Philosophy <- AGREGAR ESTO
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

        return () => {
            ctx.revert()
            ScrollTrigger.getAll().forEach(trigger => trigger.kill())
        }
    }, [])

    return { containerRef }
}