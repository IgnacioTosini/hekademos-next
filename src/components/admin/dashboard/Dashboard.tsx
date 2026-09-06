'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IoMdAppstore } from 'react-icons/io';
import { FaRegUser } from 'react-icons/fa';
import { PiStudent } from 'react-icons/pi';
import {
    MdFactCheck,
    MdHistory,
    MdOutlineCalendarMonth,
    MdOutlineDashboard,
    MdOutlinePayments,
    MdOutlineSportsGymnastics,
    MdPublishedWithChanges,
    MdWeb,
    MdForum,
    MdWorkspacePremium,
} from "react-icons/md";
import { DashboardLogoutButton } from './dashboardLogoutButton/DashboardLogoutButton';
import './_dashboard.scss';

export const Dashboard = () => {
    const [isOpen, setIsOpen] = useState(false);
    const closeMenu = () => setIsOpen(false);
    return (
        <>
            {isOpen && (
                <div
                    className="dashboard-overlay"
                    onClick={closeMenu}
                />
            )}

            <button
                className="dashboard-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                ☰
            </button>
            <div className={`dashboard ${isOpen ? 'open' : ''}`}>
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Hekademos</h1>
                    <p className="dashboard-subtitle">Panel de administración</p>
                </div>

                <div className="dashboard-links">
                    <Link href="/admin" className="dashboard-link" onClick={closeMenu}><MdOutlineDashboard />Dashboard</Link>
                    <Link href="/admin/usuarios" className="dashboard-link" onClick={closeMenu}><FaRegUser />Usuarios</Link>
                    <Link href="/admin/alumnos" className="dashboard-link" onClick={closeMenu}><PiStudent />Alumnos</Link>
                    <Link href="/admin/coaches" className="dashboard-link" onClick={closeMenu}><MdOutlineSportsGymnastics />Coaches</Link>
                    <Link href="/admin/planes" className="dashboard-link" onClick={closeMenu}><MdWorkspacePremium />Planes</Link>
                    <Link href="/admin/turnos" className="dashboard-link" onClick={closeMenu}><MdOutlineCalendarMonth />Turnos</Link>
                    <Link href="/admin/solicitudes-horarios" className="dashboard-link" onClick={closeMenu}><MdPublishedWithChanges />Cambios de horario</Link>
                    <Link href="/admin/asistencia" className="dashboard-link" onClick={closeMenu}><MdFactCheck />Asistencia</Link>
                    <Link href="/admin/pagos" className="dashboard-link" onClick={closeMenu}><MdOutlinePayments />Pagos</Link>
                    <Link href="/admin/auditoria" className="dashboard-link" onClick={closeMenu}><MdHistory />Auditoría</Link>
                    <Link href="/admin/comunidad" className="dashboard-link" onClick={closeMenu}><MdForum />Comunidad</Link>
                    <Link href="/admin/contenido" className="dashboard-link" onClick={closeMenu}><MdWeb />Contenido web</Link>
                </div>

                <div className="dashboard-footer">
                    <Link href="/" className="dashboard-link"><IoMdAppstore />Ver sitio</Link>
                    <DashboardLogoutButton />
                </div>
            </div>
        </>
    )
}
