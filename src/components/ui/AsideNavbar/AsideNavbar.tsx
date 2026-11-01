'use client'

import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { IoCloseSharp } from 'react-icons/io5';
import { NavbarLinks } from '../NavbarLinks/NavbarLinks';
import Link from 'next/link';
import Image from 'next/image';
import { siteImageStyle } from '@/lib/site-image-style';
import { FaArrowRight } from 'react-icons/fa';
import './_asideNavbar.scss';
import type { HomePageContent } from '@/lib/home-page-content';
import { navigateToSectionWithFade } from '@/utils/sectionNavigation';

type AsideNavbarProps = {
    isOpen: boolean;
    onClose: () => void;
    content: HomePageContent['header'];
    links: HomePageContent['navigation']['menuLinks'];
};

export const AsideNavbar = ({ isOpen, onClose, content, links }: AsideNavbarProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const pathname = usePathname();
    const closeMenu = useCallback(() => {
        onClose();
        window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.mobileMenuButton')?.focus({ preventScroll: true }));
    }, [onClose]);
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            closeButtonRef.current?.focus({ preventScroll: true });
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeMenu();
            if (event.key !== 'Tab' || !panelRef.current) return;
            const controls = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus({ preventScroll: true }); }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus({ preventScroll: true }); }
        };
        if (isOpen) document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, closeMenu]);
    useEffect(() => {
        if (!isOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let cancelled = false;
        let revert: (() => void) | undefined;
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled || !panelRef.current) return;
            const context = gsap.context(() => {
                gsap.fromTo('.asideBarLinks .navbarLink, .asideCta',
                    { autoAlpha: 0, x: -16 },
                    { autoAlpha: 1, x: 0, duration: .45, stagger: .045, ease: 'power2.out', delay: .08 });
            }, panelRef);
            revert = () => context.revert();
        }).catch((error) => {
            if (!cancelled) console.error('No se pudo animar el menú móvil:', error);
        });
        return () => { cancelled = true; revert?.(); };
    }, [isOpen]);
    const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (pathname === '/') {
            event.preventDefault();
            void navigateToSectionWithFade('inicio', '/');
        }
        onClose();
    };

    const handleCtaClick = (event: MouseEvent<HTMLAnchorElement>) => {
        const sectionId = content.ctaHref.startsWith('/#') || content.ctaHref.startsWith('#') ? content.ctaHref.split('#')[1] : '';
        if (sectionId && pathname === '/') {
            event.preventDefault();
            void navigateToSectionWithFade(sectionId, `/#${sectionId}`);
        }
        onClose();
    };
    return (
        <>
            <div className={`asideNavbar${isOpen ? ' open' : ''}`} id="mobile-navigation" ref={panelRef} role="dialog" aria-modal="true" aria-label="Menú de navegación">
                <div className='headerLogoAside'>
                    <Link href='/' className='logo' aria-label="Hekademos, ir al inicio" onClick={handleHomeClick}>
                        <Image
                            src={content.logo.url}
                            style={siteImageStyle(content.logo)}
                            alt=""
                            width={80}
                            height={80}
                            priority={true}
                            quality={90}
                        />
                        <span>HEKADEMOS</span>
                    </Link>
                    <button type="button" className="asideCloseButton" onClick={closeMenu} aria-label="Cerrar menú" ref={closeButtonRef}><IoCloseSharp /></button>
                </div>
                <nav className="asideNavContent" aria-label="Secciones del sitio">
                    <span className="asideNavEyebrow">EXPLORÁ EL SITIO</span>
                    <NavbarLinks isAsideBar onClose={onClose} links={links} />
                </nav>

                <Link href={content.ctaHref} className="asideCta" onClick={handleCtaClick}>
                    {content.ctaLabel} <FaArrowRight />
                </Link>

            </div>
            <div
                className="asideNavbarOverlay"
                style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
                onClick={closeMenu}
            />
        </>
    )
}
