import Link from "next/link";
import type { ReactNode } from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import type { AttendanceStatus } from "@/types/schema/classes";
import type { AdminStudentProfile } from "@/types/schema/users";
import { formatDate } from "@/utils/format";
import { getScheduleLabel } from "@/utils/schedule";
import { AttendanceFilterForm } from "./AttendanceFilterForm";
import { StudentPaymentHistory } from "./StudentPaymentHistory";

type Props = {
    student: AdminStudentProfile;
    paymentsHref?: string;
    paymentHistoryTotal?: number;
    paymentHistoryContent?: ReactNode;
    attendanceBaseHref?: string;
    selectedAttendanceMonth?: number;
    selectedAttendanceYear?: number;
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
    PRESENT: "Presente",
    ABSENT: "Ausente",
    LATE: "Tarde",
    EXCUSED: "Justificado",
};

const attendanceStatusOrder: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat("es-AR", {
        month: "long",
    }).format(new Date(2026, index, 1)),
}));

const getYearOptions = (selectedYear: number) => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>();

    for (let year = currentYear - 3; year <= currentYear + 1; year += 1) {
        years.add(year);
    }

    years.add(selectedYear);

    return Array.from(years).sort((a, b) => b - a);
};

const getAttendanceDate = (value: Date | string | null | undefined) => {
    if (!value) return 0;

    return new Date(value).getTime();
};

const getAttendanceScheduleLabel = (attendance: NonNullable<AdminStudentProfile["attendance"]>[number]) => {
    const session = attendance.session;
    const schedule = session?.schedule;

    if (schedule) return getScheduleLabel(schedule);
    if (session?.startsAt) {
        return new Intl.DateTimeFormat("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(session.startsAt));
    }

    return "Clase";
};

export const StudentProfileHistoryCards = ({ student, paymentsHref, paymentHistoryTotal, paymentHistoryContent, attendanceBaseHref, selectedAttendanceMonth, selectedAttendanceYear }: Props) => {
    const today = new Date();
    const attendanceMonth = selectedAttendanceMonth ?? today.getMonth() + 1;
    const attendanceYear = selectedAttendanceYear ?? today.getFullYear();
    const attendanceMonthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(attendanceYear, attendanceMonth - 1, 1));
    const attendanceYearOptions = getYearOptions(attendanceYear);
    const paymentHistory = student.payments ?? [];
    const totalPayments = paymentHistoryTotal ?? paymentHistory.length;
    const attendanceHistory = [...(student.attendance ?? [])].sort((a, b) => (
        getAttendanceDate(b.session?.startsAt ?? b.createdAt) - getAttendanceDate(a.session?.startsAt ?? a.createdAt)
    ));
    const latestAttendance = attendanceHistory.slice(0, 6);
    const attendanceCounts = attendanceStatusOrder.reduce((counts, status) => ({
        ...counts,
        [status]: attendanceHistory.filter((attendance) => attendance.status === status).length,
    }), {} as Record<AttendanceStatus, number>);

    return (
        <>
            <article className="student-profile-card student-profile-card-wide">
                <div className="student-profile-card-header">
                    <div>
                        <h2>Historial de pagos</h2>
                        <p>{totalPayments} pagos registrados</p>
                    </div>
                    {paymentsHref && (
                        <Link href={paymentsHref}>
                            Ver detalle
                            <FaExternalLinkAlt />
                        </Link>
                    )}
                </div>

                {totalPayments > 0 ? (
                    paymentHistoryContent ?? <StudentPaymentHistory payments={paymentHistory} />
                ) : (
                    <EmptyState
                        compact
                        className="student-profile-empty"
                        title="Sin pagos registrados"
                        description="Todavia no hay movimientos de pago para este alumno."
                    />
                )}
            </article>

            <article className="student-profile-card student-profile-card-wide">
                <div className="student-profile-card-header">
                    <div>
                        <h2>Asistencia</h2>
                        <p>{attendanceMonthLabel} · {attendanceHistory.length} clases registradas</p>
                    </div>

                    {attendanceBaseHref && (
                        <AttendanceFilterForm baseHref={attendanceBaseHref}>
                            <select name="month" defaultValue={attendanceMonth} aria-label="Filtrar asistencia por mes">
                                {monthOptions.map((month) => (
                                    <option key={month.value} value={month.value}>{month.label}</option>
                                ))}
                            </select>

                            <select name="year" defaultValue={attendanceYear} aria-label="Filtrar asistencia por año">
                                {attendanceYearOptions.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>

                        </AttendanceFilterForm>
                    )}
                </div>

                {attendanceHistory.length > 0 ? (
                    <>
                        <div className="student-profile-attendance-summary">
                            {attendanceStatusOrder.map((status) => (
                                <div key={status}>
                                    <span>{attendanceStatusLabels[status]}</span>
                                    <strong>{attendanceCounts[status]}</strong>
                                </div>
                            ))}
                        </div>

                        <div className="student-profile-attendance-list" role="region" aria-label="Clases registradas" tabIndex={0}>
                            {latestAttendance.map((attendance) => (
                                <div className="student-profile-attendance-item" key={attendance.id}>
                                    <div>
                                        <strong>{getAttendanceScheduleLabel(attendance)}</strong>
                                        <span>{formatDate(attendance.session?.startsAt ?? attendance.createdAt)}</span>
                                    </div>
                                    <span className={`student-profile-attendance-status student-profile-attendance-status-${attendance.status.toLowerCase()}`}>
                                        {attendanceStatusLabels[attendance.status]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        compact
                        className="student-profile-empty"
                        title="Sin asistencias registradas"
                        description="Todavia no hay clases registradas para el filtro seleccionado."
                    />
                )}
            </article>

        </>
    );

};
