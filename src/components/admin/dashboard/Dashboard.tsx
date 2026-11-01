'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IoMdAppstore } from 'react-icons/io';
import { FaRegUser, FaWhatsapp } from 'react-icons/fa';
import { PiStudent } from 'react-icons/pi';
import { MdClose, MdFactCheck, MdForum, MdHistory, MdMenu, MdOutlineCalendarMonth, MdOutlineDashboard, MdOutlinePayments, MdOutlineSportsGymnastics, MdPublishedWithChanges, MdWeb, MdWorkspacePremium } from 'react-icons/md';
import { DashboardLogoutButton } from './dashboardLogoutButton/DashboardLogoutButton';
import './_dashboard.scss';

const groups = [
    { title: 'General', links: [
        { href: '/admin', label: 'Inicio', icon: MdOutlineDashboard },
    ] },
    { title: 'Personas y clases', links: [
        { href: '/admin/usuarios', label: 'Usuarios', icon: FaRegUser },
        { href: '/admin/alumnos', label: 'Alumnos', icon: PiStudent },
        { href: '/admin/coaches', label: 'Coaches', icon: MdOutlineSportsGymnastics },
        { href: '/admin/turnos', label: 'Turnos', icon: MdOutlineCalendarMonth },
        { href: '/admin/solicitudes-horarios', label: 'Cambios de horario', icon: MdPublishedWithChanges },
        { href: '/admin/asistencia', label: 'Asistencia', icon: MdFactCheck },
    ] },
    { title: 'Gestión', links: [
        { href: '/admin/planes', label: 'Planes', icon: MdWorkspacePremium },
        { href: '/admin/pagos', label: 'Pagos', icon: MdOutlinePayments },
        { href: '/admin/whatsapp', label: 'WhatsApp', icon: FaWhatsapp },
        { href: '/admin/auditoria', label: 'Auditoría', icon: MdHistory },
    ] },
    { title: 'Sitio y comunidad', links: [
        { href: '/admin/comunidad', label: 'Comunidad', icon: MdForum },
        { href: '/admin/contenido', label: 'Contenido web', icon: MdWeb },
    ] },
];

export const Dashboard = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOpen]);

    return (
        <>
            {isOpen && <button className="dashboard-overlay" type="button" aria-label="Cerrar menú" onClick={() => setIsOpen(false)} />}
            <button
                className={`dashboard-toggle${isOpen ? ' is-open' : ''}`}
                type="button"
                aria-label={isOpen ? 'Cerrar menú de administración' : 'Abrir menú de administración'}
                aria-expanded={isOpen}
                aria-controls="admin-navigation"
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen ? <MdClose aria-hidden="true" /> : <MdMenu aria-hidden="true" />}
                <span>{isOpen ? 'Cerrar' : 'Menú'}</span>
            </button>
            <aside id="admin-navigation" className={`dashboard${isOpen ? ' open' : ''}`} aria-label="Navegación de administración">
                <div className="dashboard-header">
                    <span className="dashboard-brand-mark">H</span>
                    <div><strong className="dashboard-title">Hekademos</strong><p className="dashboard-subtitle">Administración</p></div>
                </div>

                <nav className="dashboard-links" aria-label="Secciones de administración">
                    {groups.map((group) => (
                        <div className="dashboard-link-group" key={group.title}>
                            <span className="dashboard-group-title">{group.title}</span>
                            {group.links.map(({ href, label, icon: Icon }) => {
                                const active = href === '/admin' ? pathname === href || pathname === '/admin/dashboard' : pathname === href || pathname.startsWith(`${href}/`);
                                return (
                                    <Link key={href} href={href} className={`dashboard-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => setIsOpen(false)}>
                                        <Icon aria-hidden="true" /><span>{label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="dashboard-footer">
                    <Link href="/" className="dashboard-link" onClick={() => setIsOpen(false)}><IoMdAppstore aria-hidden="true" />Ver sitio</Link>
                    <DashboardLogoutButton />
                </div>
            </aside>
        </>
    );
};
