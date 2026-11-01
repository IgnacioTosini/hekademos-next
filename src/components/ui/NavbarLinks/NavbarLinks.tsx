'use client'

import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSectionIdFromHref, navLinks, primaryNavLinks } from '@/utils'
import { navigateToSectionWithFade } from '@/utils/sectionNavigation'
import './_navbarLinks.scss'

type NavbarLinksProps = {
    isFooter?: boolean;
    isAsideBar?: boolean;
    onClose?: () => void;
    links?: Array<{ label: string; href: string }>;
}

export const NavbarLinks = ({ isFooter, isAsideBar, onClose, links }: NavbarLinksProps) => {
    const pathname = usePathname()
    const resolvedLinks = useMemo(() => links?.map((link) => ({ name: link.label, href: link.href })) ?? (isAsideBar ? navLinks : primaryNavLinks), [links, isAsideBar])
    const isPrimary = !isFooter && !isAsideBar
    const navRef = useRef<HTMLDivElement>(null)
    const indicatorRef = useRef<HTMLSpanElement>(null)
    const [activeHref, setActiveHref] = useState(pathname === '/' ? '/' : '')
    const [hoverHref, setHoverHref] = useState<string | null>(null)

    useEffect(() => {
        if (!isPrimary) return
        let cancelled = false
        let dispose: (() => void) | undefined
        void import('@/animations/gsapConfig').then(({ ScrollTrigger }) => {
            if (cancelled) return
            const updateActive = () => {
                if (pathname !== '/') { setActiveHref(''); return }
                const marker = Math.min(window.innerHeight * .3, 200)
                let current = '/'
                for (const link of resolvedLinks) {
                    const id = getSectionIdFromHref(link.href)
                    const section = id && document.getElementById(id)
                    if (section && section.getBoundingClientRect().top <= marker) current = link.href
                }
                setActiveHref(current)
            }
            const trigger = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: updateActive, onRefresh: updateActive })
            updateActive()
            dispose = () => trigger.kill()
        }).catch((error) => {
            if (!cancelled) console.error('No se pudo actualizar el enlace activo:', error)
        })
        return () => { cancelled = true; dispose?.() }
    }, [isPrimary, pathname, resolvedLinks])

    useEffect(() => {
        if (!isPrimary) return
        const nav = navRef.current
        const indicator = indicatorRef.current
        if (!nav || !indicator) return
        const shownHref = hoverHref ?? activeHref
        const index = resolvedLinks.findIndex((link) => link.href === shownHref)
        const target = nav.querySelectorAll<HTMLElement>('.navbarLink')[index]
        let cancelled = false
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled) return
            if (!target) { gsap.to(indicator, { autoAlpha: 0, duration: .2 }); return }
            const navBox = nav.getBoundingClientRect()
            const targetBox = target.getBoundingClientRect()
            const indicatorInset = 10
            gsap.to(indicator, {
                x: targetBox.left - navBox.left + indicatorInset,
                width: Math.max(0, targetBox.width - indicatorInset * 2),
                autoAlpha: 1,
                duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : .3,
                ease: 'power2.out',
                overwrite: 'auto',
            })
        }).catch((error) => {
            if (!cancelled) console.error('No se pudo animar el indicador del navbar:', error)
        })
        return () => { cancelled = true }
    }, [activeHref, hoverHref, isPrimary, resolvedLinks])

    const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href === '/' && pathname === '/') {
            event.preventDefault()
            void navigateToSectionWithFade('inicio', '/')
            if (isPrimary) setActiveHref('/')
            onClose?.()
            return
        }

        const sectionId = getSectionIdFromHref(href)

        if (sectionId && pathname === '/') {
            event.preventDefault()
            void navigateToSectionWithFade(sectionId, `/#${sectionId}`)
            if (isPrimary) setActiveHref(href)
            onClose?.()
            return
        }

        onClose?.()
    }

    if (isFooter) {
        const footerLinks = links?.map((link) => ({ name: link.label, href: link.href })) ?? navLinks
        const midIndex = Math.ceil(footerLinks.length / 2)
        const firstColumn = footerLinks.slice(0, midIndex)
        const secondColumn = footerLinks.slice(midIndex)

        return (
            <div className="navbarLinks footerLinks">
                <div className="footerColumn">
                    {firstColumn.map((link) => (
                        <div key={link.name} className="navbarLink">
                            <Link href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                                {link.name}
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="footerColumn">
                    {secondColumn.map((link) => (
                        <div key={link.name} className="navbarLink">
                            <Link href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                                {link.name}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={`navbarLinks ${isAsideBar ? 'asideBarLinks' : 'primaryNavLinks'}`} ref={navRef} onMouseLeave={() => setHoverHref(null)}>
            {resolvedLinks.map((link, index) => (
                <div key={link.name} className={`navbarLink${isPrimary && activeHref === link.href ? ' is-active' : ''}`}>
                    <Link href={link.href} aria-current={isPrimary && activeHref === link.href ? (link.href === '/' ? 'page' : 'location') : undefined} onClick={(event) => handleLinkClick(event, link.href)} onMouseEnter={() => { if (isPrimary) setHoverHref(link.href) }} onFocus={() => { if (isPrimary) setHoverHref(link.href) }} onBlur={() => { if (isPrimary) setHoverHref(null) }}>
                        {isAsideBar && <span className="asideLinkNumber" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}
                        {link.name}
                        {isAsideBar && <span className="asideLinkArrow" aria-hidden="true">↗</span>}
                    </Link>
                </div>
            ))}
            {isPrimary && <span className="navIndicator" ref={indicatorRef} aria-hidden="true" />}
        </div>
    )
}
