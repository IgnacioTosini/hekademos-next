'use client'

import { handleScrollTo } from '@/utils'
import type { ScrollTrigger as ScrollTriggerInstance } from 'gsap/ScrollTrigger'

let transitioning = false

const alignSection = (sectionId: string, url: string | undefined, ScrollTrigger: typeof ScrollTriggerInstance) => {
    ScrollTrigger.refresh()
    const element = document.getElementById(sectionId)
    const pinned = ScrollTrigger.getAll().find((trigger) => trigger.pin === element)
    handleScrollTo(sectionId, 'instant', pinned?.start)
    if (url) window.history.replaceState(null, '', url)
}

export const scrollToSectionAligned = async (sectionId: string, url?: string) => {
    const { ScrollTrigger } = await import('@/animations/gsapConfig')
    alignSection(sectionId, url, ScrollTrigger)
}

export const navigateToSectionWithFade = async (sectionId: string, url: string) => {
    if (transitioning) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await scrollToSectionAligned(sectionId, url)
        return
    }

    transitioning = true
    const overlay = document.createElement('div')
    overlay.className = 'navFade'
    overlay.setAttribute('aria-hidden', 'true')
    document.body.append(overlay)

    try {
        const { gsap, ScrollTrigger } = await import('@/animations/gsapConfig')
        const timeline = gsap.timeline({ onComplete: () => { overlay.remove(); transitioning = false } })
        timeline.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: .26, ease: 'power2.inOut' })
            .call(() => { alignSection(sectionId, url, ScrollTrigger) })
            .to(overlay, { opacity: 0, duration: .32, ease: 'power2.inOut' })
    } catch {
        handleScrollTo(sectionId, 'instant')
        window.history.replaceState(null, '', url)
        overlay.remove()
        transitioning = false
    }
}
