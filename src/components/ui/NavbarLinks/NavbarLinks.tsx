'use client'

import Link from 'next/link'
import { navLinks } from '@/utils'
import './_navbarLinks.scss'

type NavbarLinksProps = {
    isFooter?: boolean;
    isAsideBar?: boolean;
    onClose?: () => void;
}

export const NavbarLinks = ({ isFooter, isAsideBar, onClose }: NavbarLinksProps) => {

    if (isFooter) {
        const midIndex = Math.ceil(navLinks.length / 2)
        const firstColumn = navLinks.slice(0, midIndex)
        const secondColumn = navLinks.slice(midIndex)

        return (
            <div className="navbarLinks footerLinks">
                <div className="footerColumn">
                    {firstColumn.map((link) => (
                        <div key={link.name} className="navbarLink">
                            <Link href={link.href} onClick={onClose}>
                                {link.name}
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="footerColumn">
                    {secondColumn.map((link) => (
                        <div key={link.name} className="navbarLink">
                            <Link href={link.href} onClick={onClose}>
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
            {navLinks.map((link) => (
                <div key={link.name} className="navbarLink">
                    <Link href={link.href} onClick={onClose}>
                        {link.name}
                    </Link>
                </div>
            ))}
        </div>
    )
}
