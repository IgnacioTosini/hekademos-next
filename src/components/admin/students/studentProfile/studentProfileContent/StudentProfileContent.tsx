import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaArrowLeft, FaExternalLinkAlt } from "react-icons/fa";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import type { AttendanceStatus, WeeklyClassSchedule } from "@/types/schema/classes";
import type { StudentMembershipWithRelations } from "@/types/schema/memberships";
import type { Payment, PaymentStatus } from "@/types/schema/payments";
import type { AdminStudentProfile } from "@/types/schema/users";
import { formatCurrency, formatDate } from "@/utils/format";
import { getActiveMembership, getMembershipAmountCents } from "@/utils/membership";
import {
    getAmountWithLateSurcharge,
    getPaymentForPeriod,
    getPaymentMonthRange,
    getPaymentWindowLabel,
    shouldApplyLateSurcharge,
} from "@/utils/payment";
import { addMinutesToTime, dayLabels, dayOrderIndex } from "@/utils/schedule";
import { getInitials } from "@/utils/strings";
import { getStudentName } from "@/utils/student";
import "./_studentProfileContent.scss";

type Props = {
    student: AdminStudentProfile;
    actions?: ReactNode;
    backHref?: string;
    backLabel?: string;
    paymentsHref?: string;
    showInternalNotes?: boolean;
    attendanceBaseHref?: string;
    selectedAttendanceMonth?: number;
    selectedAttendanceYear?: number;
    scheduleActions?: ReactNode;
};

export type StudentProfilePaymentStatus = PaymentStatus | "NO_MEMBERSHIP";

export type StudentProfilePaymentSummary = {
    status: StudentProfilePaymentStatus;
    activeMembership: StudentMembershipWithRelations | null;
    currentPayment: Payment | null;
    visibleAmount: number | null;
    currency: string;
    isLate: boolean;
};

const userStatusLabels = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    SUSPENDED: "Suspendido",
};

const paymentStatusLabels: Record<StudentProfilePaymentStatus, string> = {
    PENDING: "Pendiente",
    PAID: "Pagado",
    REFUNDED: "Reembolsado",
    CANCELLED: "Cancelado",
    NO_MEMBERSHIP: "Sin membresia",
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

const getScheduleLabel = (schedule: WeeklyClassSchedule) => {
    const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

    return `${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endsAt ? ` a ${endsAt}` : ""}`;
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

export const getStudentProfilePaymentSummary = (
    student: AdminStudentProfile,
    today = new Date()
): StudentProfilePaymentSummary => {
    const { start, end, dueDate } = getPaymentMonthRange(today);
    const activeMembership = getActiveMembership(student.memberships, today);
    const currentPayment = getPaymentForPeriod(student.payments, start, end);
    const status = activeMembership ? currentPayment?.status ?? "PENDING" : "NO_MEMBERSHIP";
    const membershipAmount = getMembershipAmountCents(activeMembership);
    const isLate = status === "PENDING" && shouldApplyLateSurcharge(today, dueDate, currentPayment?.status);
    const visibleAmount = currentPayment?.status === "PAID"
        ? currentPayment.amountCents
        : membershipAmount === null
            ? null
            : getAmountWithLateSurcharge(membershipAmount, isLate);

    return {
        status,
        activeMembership,
        currentPayment,
        visibleAmount,
        currency: activeMembership?.plan?.currency ?? currentPayment?.currency ?? "ARS",
        isLate,
    };
};

export const StudentProfileContent = ({
    student,
    actions,
    backHref,
    backLabel = "Volver",
    paymentsHref,
    showInternalNotes = true,
    attendanceBaseHref,
    selectedAttendanceMonth,
    selectedAttendanceYear,
    scheduleActions,
}: Props) => {
    const today = new Date();
    const attendanceMonth = selectedAttendanceMonth ?? today.getMonth() + 1;
    const attendanceYear = selectedAttendanceYear ?? today.getFullYear();
    const attendanceMonthLabel = new Intl.DateTimeFormat("es-AR", {
        month: "long",
        year: "numeric",
    }).format(new Date(attendanceYear, attendanceMonth - 1, 1));
    const attendanceYearOptions = getYearOptions(attendanceYear);
    const studentName = getStudentName(student);
    const paymentSummary = getStudentProfilePaymentSummary(student, today);
    const activeMembership = paymentSummary.activeMembership;
    const membershipAmount = getMembershipAmountCents(activeMembership);
    const paymentHistory = student.payments ?? [];
    const attendanceHistory = [...(student.attendance ?? [])].sort((a, b) => (
        getAttendanceDate(b.session?.startsAt ?? b.createdAt) - getAttendanceDate(a.session?.startsAt ?? a.createdAt)
    ));
    const latestAttendance = attendanceHistory.slice(0, 6);
    const attendanceCounts = attendanceStatusOrder.reduce((counts, status) => ({
        ...counts,
        [status]: attendanceHistory.filter((attendance) => attendance.status === status).length,
    }), {} as Record<AttendanceStatus, number>);
    const coachName = student.coach?.user?.name || student.coach?.user?.email || "Sin coach asignado";
    const activeSchedules = (student.schedules ?? [])
        .flatMap((scheduleAssignment) => {
            if (!scheduleAssignment.isActive || !scheduleAssignment.weeklySchedule) return [];

            return [{
                id: scheduleAssignment.id,
                weeklySchedule: scheduleAssignment.weeklySchedule,
            }];
        })
        .sort((first, second) => (
            dayOrderIndex[first.weeklySchedule.dayOfWeek] - dayOrderIndex[second.weeklySchedule.dayOfWeek]
            || first.weeklySchedule.startTime.localeCompare(second.weeklySchedule.startTime)
        ));

    return (
        <div className="student-profile-content">
            {backHref && (
                <Link className="student-profile-back" href={backHref}>
                    <FaArrowLeft />
                    {backLabel}
                </Link>
            )}

            <div className="student-profile-hero">
                <div className="student-profile-identity">
                    <div className="student-profile-avatar">
                        {student.user.image?.url ? (
                            <Image src={student.user.image.url} alt={studentName} width={100} height={100} />
                        ) : (
                            <span>{getInitials(studentName)}</span>
                        )}
                    </div>

                    <div>
                        <span className={`student-profile-status student-profile-status-${student.user.status.toLowerCase()}`}>
                            {userStatusLabels[student.user.status]}
                        </span>
                        <h1>{studentName}</h1>
                        <p>{student.user.email}</p>
                    </div>
                </div>

                {actions}
            </div>

            <div className="student-profile-kpis">
                <article>
                    <span>Membresia</span>
                    <strong>{activeMembership?.plan?.name ?? "Sin plan"}</strong>
                    <p>{activeMembership?.plan ? `${activeMembership.plan.trainingDaysPerWeek} dias/semana` : "Sin membresia activa"}</p>
                </article>

                <article>
                    <span>Pago del mes</span>
                    <strong>{paymentStatusLabels[paymentSummary.status]}</strong>
                    <p>{formatCurrency(paymentSummary.visibleAmount, paymentSummary.currency)} · {getPaymentWindowLabel(today)}</p>
                </article>

                <article>
                    <span>Coach</span>
                    <strong>{coachName}</strong>
                    <p>{student.coach?.specialty || "Sin especialidad cargada"}</p>
                </article>

                <article>
                    <span>Rutina</span>
                    <strong>{student.routineExcelUrl ? "Cargada" : "Sin rutina"}</strong>
                    <p>{student.routineExcelUrl ? "Archivo disponible" : "Pendiente de carga"}</p>
                </article>
            </div>

            <div className="student-profile-grid">
                <article className="student-profile-card">
                    <h2>Datos personales</h2>
                    <dl>
                        <div>
                            <dt>Telefono</dt>
                            <dd>{student.user.phone || "-"}</dd>
                        </div>
                        <div>
                            <dt>Nacimiento</dt>
                            <dd>{formatDate(student.birthDate)}</dd>
                        </div>
                        <div>
                            <dt>Contacto emergencia</dt>
                            <dd>{student.emergencyContactName || "-"}</dd>
                        </div>
                        <div>
                            <dt>Telefono emergencia</dt>
                            <dd>{student.emergencyContactPhone || "-"}</dd>
                        </div>
                    </dl>
                </article>

                <article className="student-profile-card">
                    <h2>Membresia actual</h2>
                    {activeMembership?.plan ? (
                        <dl>
                            <div>
                                <dt>Plan</dt>
                                <dd>{activeMembership.plan.name}</dd>
                            </div>
                            <div>
                                <dt>Dias por semana</dt>
                                <dd>{activeMembership.plan.trainingDaysPerWeek}</dd>
                            </div>
                            <div>
                                <dt>Precio mensual</dt>
                                <dd>{formatCurrency(membershipAmount, activeMembership.plan.currency)}</dd>
                            </div>
                            <div>
                                <dt>Inicio</dt>
                                <dd>{formatDate(activeMembership.startDate)}</dd>
                            </div>
                        </dl>
                    ) : (
                        <EmptyState
                            compact
                            className="student-profile-empty"
                            title="Sin membresia activa"
                            description="El alumno no tiene un plan activo asociado."
                        />
                    )}
                </article>

                <article className="student-profile-card">
                    <div className="student-profile-card-header student-profile-card-header-compact">
                        <h2>Turnos elegidos</h2>
                        {scheduleActions}
                    </div>
                    {activeSchedules.length > 0 ? (
                        <div className="student-profile-schedules">
                            {activeSchedules.map((scheduleAssignment) => (
                                <div key={scheduleAssignment.id} className="student-profile-schedule">
                                    <strong>{getScheduleLabel(scheduleAssignment.weeklySchedule)}</strong>
                                    <span>
                                        {scheduleAssignment.weeklySchedule.capacity
                                            ? `Cupo ${scheduleAssignment.weeklySchedule.capacity}`
                                            : "Sin cupo definido"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            compact
                            className="student-profile-empty"
                            title="Sin turnos asignados"
                            description="Todavia no hay horarios elegidos para este alumno."
                        />
                    )}
                </article>

                <article className="student-profile-card student-profile-card-wide">
                    <div className="student-profile-card-header">
                        <div>
                            <h2>Historial de pagos</h2>
                            <p>{paymentHistory.length} pagos registrados</p>
                        </div>
                        {paymentsHref && (
                            <Link href={paymentsHref}>
                                Ver detalle
                                <FaExternalLinkAlt />
                            </Link>
                        )}
                    </div>

                    {paymentHistory.length > 0 ? (
                        <div className="student-profile-payments">
                            {paymentHistory.map((payment) => (
                                <div className="student-profile-payment" key={payment.id}>
                                    <div>
                                        <strong>{formatCurrency(payment.amountCents, payment.currency)}</strong>
                                        <span>{payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.dueDate)}</span>
                                        {(payment.reference || payment.notes) && (
                                            <small>
                                                {[payment.reference, payment.notes].filter(Boolean).join(" · ")}
                                            </small>
                                        )}
                                    </div>
                                    <span className={`student-profile-payment-status student-profile-payment-status-${payment.status.toLowerCase()}`}>
                                        {paymentStatusLabels[payment.status]}
                                    </span>
                                </div>
                            ))}
                        </div>
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
                            <form className="student-profile-attendance-filters" action={attendanceBaseHref} method="get">
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

                                <button type="submit">Ver</button>
                            </form>
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

                            <div className="student-profile-attendance-list">
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

                {showInternalNotes && (
                    <article className="student-profile-card">
                        <h2>Notas internas</h2>
                        <p className="student-profile-notes">{student.notes || "Sin notas cargadas."}</p>
                    </article>
                )}

                <article className="student-profile-card">
                    <h2>Rutina</h2>
                    {student.routineExcelUrl ? (
                        <a className="student-profile-routine-link" href={student.routineExcelUrl} target="_blank" rel="noreferrer">
                            Abrir rutina
                            <FaExternalLinkAlt />
                        </a>
                    ) : (
                        <EmptyState
                            compact
                            className="student-profile-empty"
                            title="Sin rutina cargada"
                            description="Todavia no hay un enlace de rutina disponible."
                        />
                    )}
                </article>
            </div>
        </div>
    );
};
