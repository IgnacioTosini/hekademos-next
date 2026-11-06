import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FaArrowLeft, FaExternalLinkAlt } from "react-icons/fa";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import type { StudentMembershipWithRelations } from "@/types/schema/memberships";
import type { Payment, PaymentStatus } from "@/types/schema/payments";
import type { AdminStudentProfile } from "@/types/schema/users";
import { getClassCategoryLabel } from "@/utils/class-category";
import { formatCurrency, formatDate } from "@/utils/format";
import { getActiveMembership, getMembershipAmountCents } from "@/utils/membership";
import {
    getAmountWithLateSurcharge,
    getPaymentForPeriod,
    getPaymentMonthRange,
    getPaymentWindowLabel,
    shouldApplyLateSurcharge,
} from "@/utils/payment";
import { getInitials } from "@/utils/strings";
import { getStudentName } from "@/utils/student";
import { CoachPaymentCard } from "./CoachPaymentCard";
import { StudentProfileHistoryCards } from "./StudentProfileHistoryCards";
import { StudentProfileScheduleCard, type TemporaryScheduleChange } from "./StudentProfileScheduleCard";
import "./_studentProfileContent.scss";

type Props = {
    student: AdminStudentProfile;
    actions?: ReactNode;
    backHref?: string;
    backLabel?: string;
    paymentsHref?: string;
    paymentHistoryTotal?: number;
    paymentHistoryContent?: ReactNode;
    showInternalNotes?: boolean;
    allowPaymentReport?: boolean;
    attendanceBaseHref?: string;
    selectedAttendanceMonth?: number;
    selectedAttendanceYear?: number;
    scheduleActions?: ReactNode;
    temporaryScheduleChange?: TemporaryScheduleChange | null;
    routineActions?: ReactNode;
    selfProfile?: boolean;
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
    paymentHistoryTotal,
    paymentHistoryContent,
    showInternalNotes = true,
    allowPaymentReport = false,
    attendanceBaseHref,
    selectedAttendanceMonth,
    selectedAttendanceYear,
    scheduleActions,
    temporaryScheduleChange,
    routineActions,
    selfProfile = false,
}: Props) => {
    const today = new Date();
    const studentName = getStudentName(student);
    const paymentSummary = getStudentProfilePaymentSummary(student, today);
    const paymentPeriodLabel = new Intl.DateTimeFormat("es-AR", {
        month: "long",
        year: "numeric",
    }).format(today);
    const activeMembership = paymentSummary.activeMembership;
    const membershipAmount = getMembershipAmountCents(activeMembership);
    const coachName = student.coach?.user?.name || student.coach?.user?.email || "Sin coach asignado";
    const scheduleCard = (
        <StudentProfileScheduleCard
            student={student}
            scheduleActions={scheduleActions}
            temporaryScheduleChange={temporaryScheduleChange}
        />
    );

    const paymentCard = (
        <CoachPaymentCard
            coachName={coachName}
            paymentAlias={student.coach?.paymentAlias ?? null}
            paymentAccountHolder={student.coach?.paymentAccountHolder ?? null}
            coachPhone={student.coach?.user?.phone ?? null}
            studentName={studentName}
            amountLabel={formatCurrency(paymentSummary.visibleAmount, paymentSummary.currency)}
            paymentPeriodLabel={paymentPeriodLabel}
            hasActiveMembership={Boolean(activeMembership)}
            isCurrentPaymentPaid={paymentSummary.status === "PAID"}
            allowPaymentReport={allowPaymentReport}
        />
    );

    const historyCards = (
        <StudentProfileHistoryCards
            student={student}
            paymentsHref={paymentsHref}
            paymentHistoryTotal={paymentHistoryTotal}
            paymentHistoryContent={paymentHistoryContent}
            attendanceBaseHref={attendanceBaseHref}
            selectedAttendanceMonth={selectedAttendanceMonth}
            selectedAttendanceYear={selectedAttendanceYear}
        />
    );

    return (
        <div className={`student-profile-content${selfProfile ? " student-profile-content-self" : ""}`}>
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
                        {selfProfile && <span className="student-profile-eyebrow">MI ESPACIO</span>}
                        <span className={`student-profile-status student-profile-status-${student.user.status.toLowerCase()}`}>
                            {userStatusLabels[student.user.status]}
                        </span>
                        <h1>{studentName}</h1>
                        <p>{student.user.email}</p>
                    </div>
                </div>

                {selfProfile && <div className="student-profile-hero-summary">
                    <div>
                        <span>Tu membresía</span>
                        <strong>{activeMembership?.plan?.name ?? "Sin plan activo"}</strong>
                        <p>{activeMembership?.plan
                            ? `${getClassCategoryLabel(activeMembership.plan.classCategory)} · ${activeMembership.plan.trainingDaysPerWeek} días por semana`
                            : "Consultá los planes disponibles para empezar."}</p>
                    </div>
                    <div>
                        <span>Pago del mes</span>
                        <strong>{paymentStatusLabels[paymentSummary.status]}</strong>
                        <p>{formatCurrency(paymentSummary.visibleAmount, paymentSummary.currency)} · {getPaymentWindowLabel(today)}</p>
                    </div>
                </div>}

                {actions}
            </div>

            {selfProfile && <section className="student-profile-priority" aria-labelledby="student-profile-priority-title">
                <div className="student-profile-priority-heading">
                    <span>ORGANIZÁ TU ENTRENAMIENTO</span>
                    <h2 id="student-profile-priority-title">Tus próximos pasos</h2>
                    <p>Revisá tus turnos y coordiná cualquier cambio desde acá.</p>
                </div>
                <div className="student-profile-priority-grid">
                    {scheduleCard}
                    {paymentCard}
                </div>
            </section>}

            <div className="student-profile-kpis">
                {!selfProfile && <article>
                    <span>Membresia</span>
                    <strong>{activeMembership?.plan?.name ?? "Sin plan"}</strong>
                    <p>{activeMembership?.plan
                        ? `${getClassCategoryLabel(activeMembership.plan.classCategory)} · ${activeMembership.plan.trainingDaysPerWeek} dias/semana`
                        : "Sin membresia activa"}</p>
                </article>}

                {!selfProfile && <article>
                    <span>Pago del mes</span>
                    <strong>{paymentStatusLabels[paymentSummary.status]}</strong>
                    <p>{formatCurrency(paymentSummary.visibleAmount, paymentSummary.currency)} · {getPaymentWindowLabel(today)}</p>
                </article>}

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
                                <dt>Categoría</dt>
                                <dd>{getClassCategoryLabel(activeMembership.plan.classCategory)}</dd>
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
                    {!showInternalNotes && (
                        <p className="student-profile-membership-helper">
                            Para cambiar tu plan, consultá con tu coach.
                        </p>
                    )}
                </article>

                {!selfProfile && scheduleCard}
                {!selfProfile && paymentCard}

                {!selfProfile && historyCards}

                {showInternalNotes && (
                    <article className="student-profile-card">
                        <h2>Notas internas</h2>
                        <p className="student-profile-notes">{student.notes || "Sin notas cargadas."}</p>
                    </article>
                )}

                <article className="student-profile-card">
                    <div className="student-profile-card-header student-profile-card-header-compact">
                        <h2>Rutina</h2>
                        {routineActions}
                    </div>
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
            {selfProfile && <section className="student-profile-history" aria-labelledby="student-profile-history-title">
                <div className="student-profile-history-heading">
                    <span>TU RECORRIDO</span>
                    <h2 id="student-profile-history-title">Historial</h2>
                    <p>Consultá tus pagos y asistencias cuando lo necesites.</p>
                </div>
                <div className="student-profile-history-grid">{historyCards}</div>
            </section>}
        </div>
    );
};
