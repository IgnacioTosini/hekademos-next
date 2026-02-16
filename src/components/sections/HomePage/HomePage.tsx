'use client'

import { useScrollAnimations } from '@/hooks/useScrollAnimations'
import { Banner, AboutUs, Classes, Teachers, Comunity, Philosophy, Contact } from "@/components";
import './_homePage.scss'

export const HomePage = () => {
    const { containerRef } = useScrollAnimations()

    return (
        <div className="homePage" ref={containerRef}>
            <div className="banner">
                <Banner />
            </div>
            <div className="about-us-section">
                <AboutUs />
            </div>
            <div className="teachers-section">
                <Teachers />
            </div>
            <div className="classes-section">
                <Classes />
            </div>
            <div className="comunity-section">
                <Comunity />
            </div>
            <div className="philosophy-section">
                <Philosophy />
            </div>
            <div className="contact-section">
                <Contact />
            </div>
        </div>
    )
}