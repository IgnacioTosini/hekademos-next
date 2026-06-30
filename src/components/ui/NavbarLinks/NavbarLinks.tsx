'use client'

import { MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getSectionIdFromHref, handleScrollTo, navLinks, primaryNavLinks } from '@/utils'
import './_navbarLinks.scss'

type NavbarLinksProps = {
    isFooter?: boolean;
    isAsideBar?: boolean;
    onClose?: () => void;
}

export const NavbarLinks = ({ isFooter, isAsideBar, onClose }: NavbarLinksProps) => {
    const pathname = usePathname()

    const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
        if (href === '/' && pathname === '/') {
            event.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
            window.history.replaceState(null, '', '/')
            onClose?.()
            return
        }

        const sectionId = getSectionIdFromHref(href)

        if (sectionId && pathname === '/') {
            event.preventDefault()
            handleScrollTo(sectionId)
            window.history.replaceState(null, '', `/#${sectionId}`)
            onClose?.()
            return
        }

        onClose?.()
    }

    if (isFooter) {
        const midIndex = Math.ceil(navLinks.length / 2)
        const firstColumn = navLinks.slice(0, midIndex)
        const secondColumn = navLinks.slice(midIndex)

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
        <div className={`navbarLinks ${isAsideBar ? 'asideBarLinks' : ''}`}>
            {(isAsideBar ? navLinks : primaryNavLinks).map((link) => (
                <div key={link.name} className="navbarLink">
                    <Link href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                        {link.name}
                    </Link>
                </div>
            ))}
        </div>
    )
}
