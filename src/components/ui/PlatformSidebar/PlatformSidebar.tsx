'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaCalendarAlt, FaChalkboardTeacher, FaClipboardList, FaCreditCard, FaHome, FaStore, FaUsers } from 'react-icons/fa'
import './_platformSidebar.scss'

const navigationLinks = [
    { href: '/admin', label: 'Dashboard', icon: FaHome },
    { href: '/admin/alumnos', label: 'Alumnos', icon: FaUsers },
    { href: '/admin/coaches', label: 'Coaches', icon: FaChalkboardTeacher },
    { href: '/admin/pagos', label: 'Pagos', icon: FaCreditCard },
    { href: '/admin/turnos', label: 'Turnos', icon: FaCalendarAlt },
    { href: '/admin/asistencia', label: 'Asistencia', icon: FaClipboardList },
]

export const PlatformSidebar = () => {
    const pathname = usePathname()

    return (
        <aside className="platformSidebar">
            <div className="platformSidebarBrand">
                <span>Hekademos</span>
                <small>Panel de administración</small>
            </div>

            <nav className="platformSidebarNav" aria-label="Navegación interna">
                {navigationLinks.map(({ href, label, icon: Icon }) => {
                    const hrefWithoutHash = href.split('#')[0]
                    const isActive = pathname === hrefWithoutHash

                    return (
                        <Link className={isActive ? 'active' : ''} href={href} key={`${href}-${label}`}>
                            <Icon />
                            <span>{label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="platformSidebarFooter">
                <Link href="/">
                    <FaStore />
                    <span>Ver sitio</span>
                </Link>
            </div>
        </aside>
    )
}
