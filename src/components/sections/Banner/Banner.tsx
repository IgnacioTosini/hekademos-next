'use client'

import { useEffect, useRef } from 'react'
import { FaArrowRight } from "react-icons/fa"
import { handleScrollTo } from '@/utils'
import type { HomePageContent } from '@/lib/home-page-content'
import './_banner.scss'

type Props = { content: HomePageContent['banner'] }

export const Banner = ({ content }: Props) => {
    const bannerRef = useRef<HTMLDivElement>(null)
    const scrollFrameRef = useRef<number | null>(null)

    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const isCompactViewport = window.matchMedia('(max-width: 768px)').matches

        if (prefersReducedMotion || isCompactViewport) return

        const handleScroll = () => {
            if (scrollFrameRef.current !== null) return

            scrollFrameRef.current = requestAnimationFrame(() => {
                const parallax = bannerRef.current?.querySelector('.parallaxBg') as HTMLElement | null

                if (parallax) {
                    const speed = window.scrollY * 0.35
                    parallax.style.transform = `translateY(${speed}px)`
                }

                scrollFrameRef.current = null
            })
        }

        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            window.removeEventListener('scroll', handleScroll)

            if (scrollFrameRef.current !== null) {
                cancelAnimationFrame(scrollFrameRef.current)
            }
        }
    }, [])

    const handleAction = (href: string) => {
        const sectionId = href.startsWith('/#') || href.startsWith('#') ? href.split('#')[1] : ''
        if (sectionId) return handleScrollTo(sectionId)
        if (/^https?:\/\//i.test(href)) return window.open(href, '_blank', 'noopener,noreferrer')
        window.location.href = href
    }

    return (
        <div className="bannerParallax" ref={bannerRef} id='inicio'>
            <div className="parallaxBg" style={{ backgroundImage: `url("${content.background.url}")` }} role="img" aria-label={content.background.alt}></div>
            <div className="bannerContent">
                <h1 className="bannerTitle">{content.title}</h1>
                <p className="bannerSubtitle">{content.subtitle}</p>

                <div className="bannerActions">
                    <button className="button" onClick={() => handleAction(content.primaryAction.href)}>
                        {content.primaryAction.label} <FaArrowRight />
                    </button>
                    <button className="button buttonSecondary" onClick={() => handleAction(content.secondaryAction.href)}>
                        {content.secondaryAction.label}
                    </button>
                </div>
            </div>
        </div>
    )
}
