'use client'

import { useScrollAnimations } from '@/hooks/useScrollAnimations'
import { Banner, AboutUs, Classes, TrainingSchedule, MembershipPlans, Teachers, Comunity, Philosophy, FAQ, Contact } from "@/components";
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
            <div className="training-schedule-section">
                <TrainingSchedule />
            </div>
            <div className="membership-plans-section">
                <MembershipPlans />
            </div>
            <div className="comunity-section">
                <Comunity />
            </div>
            <div className="philosophy-section">
                <Philosophy />
            </div>
            <div className="faq-section">
                <FAQ />
            </div>
            <div className="contact-section">
                <Contact />
            </div>
        </div>
    )
}
