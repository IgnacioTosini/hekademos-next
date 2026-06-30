import { DashboardItem } from '../dashboardItem/DashboardItem';
import { FaRegUser } from 'react-icons/fa';
import { PiStudent } from "react-icons/pi";
import { MdFactCheck, MdOutlinePayments, MdOutlineSportsGymnastics } from "react-icons/md";
import { getUsers } from '@/app/actions/user.actions';
import { getPaymentOverview } from '@/app/actions/payment.actions';
import { getAdminTodayAttendanceSummary } from '@/app/actions/attendance.actions';
import { getAdminAlerts } from '@/app/actions/alert.actions';
import { DashboardSummary } from '../dashboardSummary/DashboardSummary';
import { DashboardPendingPayments } from '../dashboardPendingPayments/DashboardPendingPayments';
import { DashboardAttendanceSummary } from '../dashboardAttendanceSummary/DashboardAttendanceSummary';
import { DashboardAlerts } from '../dashboardAlerts/DashboardAlerts';
import './_dashboardSection.scss';

export const DashboardSection = async () => {
    const [usersResponse, paymentsResponse, attendanceResponse, alertsResponse] = await Promise.all([
        getUsers(),
        getPaymentOverview(),
        getAdminTodayAttendanceSummary(),
        getAdminAlerts(),
    ]);

    const users = usersResponse.ok ? usersResponse.data : [];
    const paymentRows = paymentsResponse.ok ? paymentsResponse.data : [];
    const attendanceSummary = attendanceResponse.ok ? attendanceResponse.data : null;
    const alerts = alertsResponse.ok ? alertsResponse.data : [];
    const usersCount = users.length;
    const studentsCount = users.filter((user) => user.role === "STUDENT").length;
    const coachesCount = users.filter((user) => user.role === "COACH").length;
    const activeUsersCount = users.filter((user) => user.status === "ACTIVE").length;

    return (
        <div className="dashboard-section">
            <div className="dashboard-section-header">
                <h1 className="dashboard-section-title">Dashboard</h1>
                <p className="dashboard-section-description">Bienvenido al panel de administración de Hekademos.</p>
            </div>
            <div className="dashboard-items">
                <DashboardItem title="Usuarios" count={usersCount} icon={<FaRegUser className="dashboard-item-icon" />} href="/admin/usuarios" />
                <DashboardItem title="Alumnos" count={studentsCount} icon={<PiStudent className="dashboard-item-icon" />} href="/admin/alumnos" />
                <DashboardItem title="Coaches" count={coachesCount} icon={<MdOutlineSportsGymnastics className="dashboard-item-icon" />} href="/admin/coaches" />
                <DashboardItem title="Activos" count={activeUsersCount} icon={<MdOutlinePayments className="dashboard-item-icon" />} />
                <DashboardItem title="Asistencia pendiente" count={attendanceSummary?.pendingCount ?? 0} icon={<MdFactCheck className="dashboard-item-icon" />} href="/admin/asistencia" />
            </div>

            <div className="dashboard-section-footer">
                <DashboardSummary users={users} />
                <DashboardPendingPayments rows={paymentRows} />
                <DashboardAttendanceSummary summary={attendanceSummary} />
                <DashboardAlerts alerts={alerts} />
            </div>
        </div>
    )
}
