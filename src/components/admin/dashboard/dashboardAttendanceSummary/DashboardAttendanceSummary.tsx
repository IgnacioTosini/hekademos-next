import Link from "next/link";
import { FaExternalLinkAlt } from "react-icons/fa";
import type { AdminAttendanceSummary } from "@/app/actions/attendance.actions";
import "./_dashboardAttendanceSummary.scss";

type Props = {
    summary: AdminAttendanceSummary | null;
};

const getDateLabel = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    const parsedDate = year && month && day ? new Date(year, month - 1, day) : new Date();

    return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
    }).format(parsedDate);
};

export const DashboardAttendanceSummary = ({ summary }: Props) => {
    const items = [
        {
            label: "Presentes",
            value: summary?.presentCount ?? 0,
        },
        {
            label: "Ausentes",
            value: summary?.absentCount ?? 0,
        },
        {
            label: "Tarde",
            value: summary?.lateCount ?? 0,
        },
        {
            label: "Pendientes",
            value: summary?.pendingCount ?? 0,
        },
    ];

    return (
        <section className="dashboard-attendance-summary">
            <div className="dashboard-attendance-summary-header">
                <div>
                    <h2>Asistencia de hoy</h2>
                    <p>{summary ? getDateLabel(summary.date) : "Sin datos disponibles"}</p>
                </div>
                <Link href="/admin/asistencia">
                    Ver detalle
                    <FaExternalLinkAlt />
                </Link>
            </div>

            <div className="dashboard-attendance-summary-body">
                <div className="dashboard-attendance-summary-metrics">
                    <div className="dashboard-attendance-summary-grid">
                        {items.map((item) => (
                            <article key={item.label}>
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                            </article>
                        ))}
                    </div>

                    <div className="dashboard-attendance-summary-status">
                        <div>
                            <span>Marcados</span>
                            <strong>{summary?.markedCount ?? 0}/{summary?.studentsCount ?? 0}</strong>
                        </div>
                        <div>
                            <span>Turnos</span>
                            <strong>{summary?.schedulesCount ?? 0}</strong>
                        </div>
                    </div>
                </div>

                {summary && summary.schedulesWithoutAttendance.length > 0 ? (
                    <div className="dashboard-attendance-pending">
                        <h3>Turnos sin marcar</h3>
                        {summary.schedulesWithoutAttendance.slice(0, 4).map((schedule) => (
                            <div key={schedule.scheduleId}>
                                <strong>{schedule.label}</strong>
                                <span>{schedule.coachName} · {schedule.studentsCount} alumnos</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="dashboard-attendance-empty">
                        {summary?.studentsCount ? "No hay turnos pendientes de asistencia." : "No hay alumnos con turnos para hoy."}
                    </p>
                )}
            </div>
        </section>
    );
};
