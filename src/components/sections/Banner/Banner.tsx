'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { FaArrowRight } from 'react-icons/fa'
import { navigateToSectionWithFade } from '@/utils/sectionNavigation'
import type { HomePageContent } from '@/lib/home-page-content'
import './_banner.scss'

type Props = { content: HomePageContent['banner'] }

export const Banner = ({ content }: Props) => {
    const bannerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        let cleanup: (() => void) | undefined

        void import('@/animations/gsapConfig').then(({ gsap, ScrollTrigger }) => {
            if (cancelled || !bannerRef.current) return
            const context = gsap.context(() => {
                const media = gsap.matchMedia()
                media.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
                    gsap.timeline({
                        scrollTrigger: {
                            trigger: bannerRef.current,
                            start: 'top top',
                            end: '+=65%',
                            pin: true,
                            scrub: 0.6,
                            anticipatePin: 1,
                            invalidateOnRefresh: true,
                        },
                    })
                        .to('.parallaxBg', { scale: 1.13 * ((content.background.scale ?? 100) / 100), yPercent: 5, ease: 'none', duration: 1 }, 0)
                        .to('.bannerContent', { yPercent: -12, autoAlpha: 0, ease: 'none', duration: 0.4 }, 0)
                        .fromTo('.bannerNext', { yPercent: 25, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'none', duration: 0.4 }, 0.6)
                })
                cleanup = () => media.revert()
            }, bannerRef)

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
            if (!cancelled) console.error('No se pudo inicializar el hero:', error)
        })

        return () => { cancelled = true; cleanup?.() }
    }, [content.background.scale])

    const handleAction = (href: string) => {
        const sectionId = href.startsWith('/#') || href.startsWith('#') ? href.split('#')[1] : ''
        if (sectionId) return void navigateToSectionWithFade(sectionId, `/#${sectionId}`)
        if (/^https?:\/\//i.test(href)) return window.open(href, '_blank', 'noopener,noreferrer')
        window.location.href = href
    }

    return (
        <div className="bannerParallax" ref={bannerRef} id="inicio">
            <div className="parallaxBg" style={{ transform: `scale(${(content.background.scale ?? 100) / 100})` }}>
                <Image
                    className="parallaxBgImage"
                    src={content.background.url}
                    alt={content.background.alt}
                    fill
                    priority
                    sizes="100vw"
                    quality={75}
                    style={{ objectPosition: `${content.background.positionX ?? 50}% ${content.background.positionY ?? 50}%` }}
                />
            </div>
            <div className="bannerContent">
                <h1 className="bannerTitle">{content.title}</h1>
                <p className="bannerSubtitle">{content.subtitle}</p>
                <div className="bannerActions">
                    <button className="button" onClick={() => handleAction(content.primaryAction.href)}>{content.primaryAction.label} <FaArrowRight /></button>
                    <button className="button buttonSecondary" onClick={() => handleAction(content.secondaryAction.href)}>{content.secondaryAction.label}</button>
                </div>
            </div>
            <div className="bannerNext" aria-hidden="true">
                <span>HEKADEMOS · MOVIMIENTO CONSCIENTE</span>
                <strong>Fuerza, movilidad y presencia en cada movimiento.</strong>
            </div>
        </div>
    )
}
