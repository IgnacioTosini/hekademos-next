'use client'

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { siteImageStyle } from '@/lib/site-image-style';
import Link from 'next/link';
import { Navbar } from '../Navbar/Navbar'
import { AsideNavbar } from '../AsideNavbar/AsideNavbar';
import { UserSubmenu } from '../UserSubmenu/UserSubmenu';
import { navigateToSectionWithFade } from '@/utils/sectionNavigation';
import type { AuthUser } from '@/app/actions/auth.actions';
import type { HomePageContent } from '@/lib/home-page-content';

type Props = {
    user: AuthUser | null;
    content: HomePageContent['header'];
    navigation: HomePageContent['navigation'];
};

export const HeaderClient = ({ user, content, navigation }: Props) => {
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const checkIsMobile = () => {
            if (window.innerWidth <= 768) {
                setIsDashboardOpen(false);
            }
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let cleanup: (() => void) | undefined;

        void import('@/animations/gsapConfig').then(({ gsap, ScrollTrigger }) => {
            const header = headerRef.current;
            if (cancelled || !header) return;
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const context = gsap.context(() => {
                if (!reduceMotion) {
                    gsap.fromTo(header.querySelectorAll('.headerBrand, .navbar, .headerRightSection > .button, .userSubmenuWrapper'),
                        { autoAlpha: 0, y: -10 },
                        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out' });
                }
                let scrolled = false;
                const updateHeader = () => {
                    const next = window.scrollY > 24;
                    if (next === scrolled) return;
                    scrolled = next;
                    header.classList.toggle('is-scrolled', next);
                };
                const trigger = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: updateHeader, onRefresh: updateHeader });
                updateHeader();
                cleanup = () => { trigger.kill(); header.classList.remove('is-scrolled'); };
            }, headerRef);
            const dispose = cleanup;
            cleanup = () => { dispose?.(); context.revert(); };
        }).catch((error) => {
            if (!cancelled) console.error('No se pudo animar el navbar:', error);
        });

        return () => { cancelled = true; cleanup?.(); };
    }, []);

    const handleToggleDashboard = useCallback(() => {
        setIsDashboardOpen((open) => !open);
    }, []);

    const handleClick = () => {
        if (isDashboardOpen) {
            setIsDashboardOpen(false);
        }
        const sectionId = content.ctaHref.startsWith('/#') || content.ctaHref.startsWith('#') ? content.ctaHref.split('#')[1] : '';
        if (sectionId && location.pathname !== '/') {
            router.push(`/#${sectionId}`);
            return;
        }
        if (sectionId) return void navigateToSectionWithFade(sectionId, `/#${sectionId}`);
        if (/^https?:\/\//i.test(content.ctaHref)) return window.open(content.ctaHref, '_blank', 'noopener,noreferrer');
        router.push(content.ctaHref);
    };

    return (
        <div className="header" ref={headerRef}>
            <Link href="/" className="headerBrand" aria-label="Hekademos, ir al inicio">
                <Image src={content.logo.url} alt="" className='logo' style={siteImageStyle(content.logo)} width={70} height={70} priority={true} quality={90} />
                <span>HEKADEMOS</span>
            </Link>
            <div className="headerRightSection">
                <Navbar onToggleMobileMenu={handleToggleDashboard} isMobileMenuOpen={isDashboardOpen} links={navigation.primaryLinks} />
                <button className='button' onClick={handleClick}>
                    {content.ctaLabel}
                </button>
                <UserSubmenu user={user} />
                {isDashboardOpen && <AsideNavbar isOpen={isDashboardOpen} onClose={handleToggleDashboard} content={content} links={navigation.menuLinks} />}
            </div>
        </div>
    )
};
