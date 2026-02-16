'use client'

import { useEffect, useRef } from 'react'
import { FaArrowRight } from "react-icons/fa"
import './_banner.scss'

export const Banner = () => {
    const bannerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Detectar si es dispositivo móvil
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

        const handleScroll = () => {
            if (bannerRef.current && !isMobile) { // Solo aplicar parallax en desktop
                const scrolled = window.pageYOffset
                const parallax = bannerRef.current.querySelector('.parallaxBg') as HTMLElement

                if (parallax) {
                    const speed = scrolled * 0.5
                    parallax.style.transform = `translateY(${speed}px)`
                }
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const handleClick = (path: string) => {
        const element = document.getElementById(path)
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <div className="bannerParallax" ref={bannerRef} id='inicio'>
            <div className="parallaxBg"></div>
            <div className="bannerContent">
                <h1 className="bannerTitle">Bienvenido a Hekademos</h1>
                <p className="bannerSubtitle">Entrenamientos conscientes para ganar fuerza, movilidad y presencia.</p>

                <div className="bannerActions">
                    <button className="button" onClick={() => handleClick('clases')}>
                        Conocé nuestras clases <FaArrowRight />
                    </button>
                    <button className="button buttonSecondary" onClick={() => handleClick('filosofia')}>
                        Nuestra Filosofía
                    </button>
                </div>
            </div>
        </div>
    )
}