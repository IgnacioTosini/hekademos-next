'use client';

import { useEffect, useState } from 'react';
import type { HomePageContent } from '@/lib/home-page-content';
import type { ScheduleGroup } from '@/components/sections/TrainingSchedule/TrainingSchedule';
import type { MembershipPlan } from '@/types/schema/memberships';
import { HeaderClient } from '@/components/ui/Header/HeaderClient';
import { FooterView } from '@/components/ui/Footer/FooterView';
import { Banner } from '@/components/sections/Banner/Banner';
import { AboutUs } from '@/components/sections/AboutUs/AboutUs';
import { Teachers } from '@/components/sections/Teachers/Teachers';
import { Classes } from '@/components/sections/Classes/Classes';
import { TrainingScheduleView } from '@/components/sections/TrainingSchedule/TrainingScheduleView';
import { MembershipPlansView } from '@/components/sections/MembershipPlans/MembershipPlansView';
import { Comunity } from '@/components/sections/Comunity/Comunity';
import { Philosophy } from '@/components/sections/Philosophy/Philosophy';
import { FAQ } from '@/components/sections/FAQ/FAQ';
import { Contact } from '@/components/sections/Contact/Contact';
import { HomeAnimations } from '@/components/sections/HomePage/HomeAnimations';
import '@/components/ui/Header/_header.scss';
import '@/components/sections/HomePage/_homePage.scss';
import './_siteFullPreview.scss';

type Props = { scheduleGroups: ScheduleGroup[]; plans: MembershipPlan[] };

export const SiteFullPreview = ({ scheduleGroups, plans }: Props) => {
    const [content, setContent] = useState<HomePageContent | null>(null);

    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'HEKADEMOS_SITE_PREVIEW') return;
            setContent(event.data.content as HomePageContent);
        };
        window.addEventListener('message', receive);
        window.parent.postMessage({ type: 'HEKADEMOS_SITE_PREVIEW_READY' }, window.location.origin);
        return () => window.removeEventListener('message', receive);
    }, []);

    useEffect(() => {
        if (!content) return;
        let cancelled = false;
        const refresh = async () => {
            await document.fonts.ready;
            await Promise.allSettled(Array.from(document.images).map((image) => image.decode()));
            if (cancelled) return;
            const { ScrollTrigger } = await import('@/animations/gsapConfig');
            if (!cancelled) requestAnimationFrame(() => ScrollTrigger.refresh());
        };
        void refresh();
        return () => { cancelled = true; };
    }, [content]);

    if (!content) return <p className="site-full-preview-loading">Preparando vista previa…</p>;

    return <div className="site-full-preview">
        <HeaderClient user={null} content={content.header} navigation={content.navigation} />
        <HomeAnimations>
            <div className="banner"><Banner content={content.banner} /></div>
            <div className="about-us-section"><AboutUs content={content.about} /></div>
            <div className="teachers-section"><Teachers content={content.teachers} /></div>
            <div className="classes-section"><Classes content={content.classes} /></div>
            <div className="training-schedule-section"><TrainingScheduleView content={content.trainingSchedule} scheduleGroups={scheduleGroups} /></div>
            <div className="membership-plans-section"><MembershipPlansView content={content.membershipPlans} plans={plans} /></div>
            <div className="comunity-section"><Comunity content={content.community} /></div>
            <div className="philosophy-section"><Philosophy content={content.philosophy} /></div>
            <div className="faq-section"><FAQ content={content.faq} /></div>
            <div className="contact-section"><Contact content={content.contact} /></div>
        </HomeAnimations>
        <FooterView content={content.footer} navigation={content.navigation} />
    </div>;
};
