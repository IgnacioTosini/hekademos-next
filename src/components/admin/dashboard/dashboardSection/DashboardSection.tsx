import { DashboardItem } from '../dashboardItem/DashboardItem';
import { FaRegUser, FaArrowRight } from 'react-icons/fa';
import Link from 'next/link';
import { PiStudent } from "react-icons/pi";
import { MdFactCheck, MdOutlinePayments, MdOutlineSportsGymnastics, MdWarningAmber } from "react-icons/md";
import { getAdminTodayAttendanceSummary } from '@/app/actions/attendance.actions';
import { getAdminAlerts } from '@/app/actions/alert.actions';
import { getDashboardPendingPayments } from '@/app/actions/payment.actions';
import { getDashboardUserSummary } from '@/app/actions/user.actions';
import { DashboardSummary } from '../dashboardSummary/DashboardSummary';
import { DashboardPendingPayments } from '../dashboardPendingPayments/DashboardPendingPayments';
import { DashboardAttendanceSummary } from '../dashboardAttendanceSummary/DashboardAttendanceSummary';
import { DashboardAlerts } from '../dashboardAlerts/DashboardAlerts';
import './_dashboardSection.scss';

export const DashboardSection = async () => {
    const [userSummaryResponse, pendingPaymentsResponse, attendanceResponse, alertsResponse] = await Promise.all([
        getDashboardUserSummary(),
        getDashboardPendingPayments(),
        getAdminTodayAttendanceSummary(),
        getAdminAlerts(),
    ]);

    const userSummary = userSummaryResponse.ok ? userSummaryResponse.data : {
        usersCount: 0,
        studentsCount: 0,
        coachesCount: 0,
        activeUsersCount: 0,
        inactiveUsersCount: 0,
        suspendedUsersCount: 0,
        adminUsersCount: 0,
    };
    const pendingPayments = pendingPaymentsResponse.ok ? pendingPaymentsResponse.data : {
        totalCount: 0,
        rows: [],
    };
    const attendanceSummary = attendanceResponse.ok ? attendanceResponse.data : null;
    const alerts = alertsResponse.ok ? alertsResponse.data : [];
    const activeAlertsCount = alerts.filter((alert) => alert.count > 0).length;

    return (
        <div className="dashboard-section">
            <div className="dashboard-section-header">
                <span className="dashboard-section-eyebrow">HEKADEMOS / ADMINISTRACIÓN</span>
                <h1 className="dashboard-section-title">Dashboard</h1>
                <p className="dashboard-section-description">Lo que necesita tu atención y el estado general del gimnasio.</p>
            </div>
            <section className="dashboard-priorities" aria-labelledby="dashboard-priorities-title">
                <div className="dashboard-section-label">
                    <div><span>01 / EN FOCO</span><h2 id="dashboard-priorities-title">Para revisar hoy</h2></div>
                    <p>Accesos directos a las tareas pendientes</p>
                </div>
                <div className="dashboard-priorities-grid">
                    <Link href="/admin/asistencia" className="dashboard-priority-card">
                        <span className="dashboard-priority-icon"><MdFactCheck /></span>
                        <span className="dashboard-priority-label">Asistencia pendiente</span>
                        <strong>{attendanceSummary?.pendingCount ?? 0}</strong>
                        <span className="dashboard-priority-link">Revisar asistencia <FaArrowRight /></span>
                    </Link>
                    <Link href="/admin/pagos" className="dashboard-priority-card">
                        <span className="dashboard-priority-icon"><MdOutlinePayments /></span>
                        <span className="dashboard-priority-label">Pagos pendientes</span>
                        <strong>{pendingPayments.totalCount}</strong>
                        <span className="dashboard-priority-link">Ver pagos <FaArrowRight /></span>
                    </Link>
                    <a href="#dashboard-alerts" className="dashboard-priority-card">
                        <span className="dashboard-priority-icon"><MdWarningAmber /></span>
                        <span className="dashboard-priority-label">Alertas activas</span>
                        <strong>{activeAlertsCount}</strong>
                        <span className="dashboard-priority-link">Explorar alertas <FaArrowRight /></span>
                    </a>
                </div>
            </section>
            <section className="dashboard-overview" aria-labelledby="dashboard-overview-title">
                <div className="dashboard-section-label">
                    <div><span>02 / PANORAMA</span><h2 id="dashboard-overview-title">Tu comunidad</h2></div>
                </div>
            <div className="dashboard-items">
                <DashboardItem title="Usuarios" count={userSummary.usersCount} icon={<FaRegUser className="dashboard-item-icon" />} href="/admin/usuarios" />
                <DashboardItem title="Alumnos" count={userSummary.studentsCount} icon={<PiStudent className="dashboard-item-icon" />} href="/admin/alumnos" />
                <DashboardItem title="Coaches" count={userSummary.coachesCount} icon={<MdOutlineSportsGymnastics className="dashboard-item-icon" />} href="/admin/coaches" />
            </div>
            </section>

            <div className="dashboard-section-footer">
                <DashboardSummary summary={userSummary} />
                <DashboardPendingPayments summary={pendingPayments} />
                <DashboardAttendanceSummary summary={attendanceSummary} />
                <div id="dashboard-alerts"><DashboardAlerts alerts={alerts} /></div>
            </div>
        </div>
    )
}
