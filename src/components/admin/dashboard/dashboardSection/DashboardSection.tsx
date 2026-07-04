import { DashboardItem } from '../dashboardItem/DashboardItem';
import { FaRegUser } from 'react-icons/fa';
import { PiStudent } from "react-icons/pi";
import { MdFactCheck, MdOutlinePayments, MdOutlineSportsGymnastics } from "react-icons/md";
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

    return (
        <div className="dashboard-section">
            <div className="dashboard-section-header">
                <h1 className="dashboard-section-title">Dashboard</h1>
                <p className="dashboard-section-description">Bienvenido al panel de administración de Hekademos.</p>
            </div>
            <div className="dashboard-items">
                <DashboardItem title="Usuarios" count={userSummary.usersCount} icon={<FaRegUser className="dashboard-item-icon" />} href="/admin/usuarios" />
                <DashboardItem title="Alumnos" count={userSummary.studentsCount} icon={<PiStudent className="dashboard-item-icon" />} href="/admin/alumnos" />
                <DashboardItem title="Coaches" count={userSummary.coachesCount} icon={<MdOutlineSportsGymnastics className="dashboard-item-icon" />} href="/admin/coaches" />
                <DashboardItem title="Activos" count={userSummary.activeUsersCount} icon={<MdOutlinePayments className="dashboard-item-icon" />} />
                <DashboardItem title="Asistencia pendiente" count={attendanceSummary?.pendingCount ?? 0} icon={<MdFactCheck className="dashboard-item-icon" />} href="/admin/asistencia" />
            </div>

            <div className="dashboard-section-footer">
                <DashboardSummary summary={userSummary} />
                <DashboardPendingPayments summary={pendingPayments} />
                <DashboardAttendanceSummary summary={attendanceSummary} />
                <DashboardAlerts alerts={alerts} />
            </div>
        </div>
    )
}
