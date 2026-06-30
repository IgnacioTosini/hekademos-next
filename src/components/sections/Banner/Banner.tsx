'use client'

import { useEffect, useRef } from 'react'
import { FaArrowRight } from "react-icons/fa"
import { handleScrollTo } from '@/utils'
import './_banner.scss'

export const Banner = () => {
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

    return (
        <div className="bannerParallax" ref={bannerRef} id='inicio'>
            <div className="parallaxBg"></div>
            <div className="bannerContent">
                <h1 className="bannerTitle">Bienvenido a Hekademos</h1>
                <p className="bannerSubtitle">Entrenamientos conscientes para ganar fuerza, movilidad y presencia.</p>

                <div className="bannerActions">
                    <button className="button" onClick={() => handleScrollTo('clases')}>
                        Conocé nuestras clases <FaArrowRight />
                    </button>
                    <button className="button buttonSecondary" onClick={() => handleScrollTo('filosofia')}>
                        Nuestra Filosofía
                    </button>
                </div>
            </div>
        </div>
    )
}
