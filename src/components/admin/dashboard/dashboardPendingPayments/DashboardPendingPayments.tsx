import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import type { PaymentOverviewRow } from "@/types/schema/payments";
import { formatCurrency } from "@/utils/format";
import { getStudentName } from "@/utils/student";
import "./_dashboardPendingPayments.scss";

type Props = {
    rows: PaymentOverviewRow[];
};

const maxVisibleRows = 5;

const getPlanLabel = (row: PaymentOverviewRow) => {
    if (!row.activeMembership) return "Sin membresia";

    return row.activeMembership.plan.name;
};

export const DashboardPendingPayments = ({ rows }: Props) => {
    const pendingRows = rows
        .filter((row) => row.status === "PENDING" || row.status === "NO_MEMBERSHIP")
        .sort((a, b) => {
            if (a.status === "PENDING" && b.status !== "PENDING") return -1;
            if (a.status !== "PENDING" && b.status === "PENDING") return 1;
            if (a.isLate && !b.isLate) return -1;
            if (!a.isLate && b.isLate) return 1;

            return getStudentName(a.student).localeCompare(getStudentName(b.student));
        });

    const visibleRows = pendingRows.slice(0, maxVisibleRows);
    const hiddenRowsCount = pendingRows.length - visibleRows.length;

    return (
        <section className="dashboard-pending-payments">
            <div className="dashboard-pending-payments-header">
                <div>
                    <h2>Pendientes de pago</h2>
                    <p>Mes actual · {pendingRows.length} alumnos</p>
                </div>

                <Link href="/admin/pagos" aria-label="Ver pagos">
                    <FaArrowRight />
                </Link>
            </div>

            {visibleRows.length > 0 ? (
                <div className="dashboard-pending-payments-list">
                    {visibleRows.map((row) => (
                        <article className="dashboard-pending-payment" key={row.student.id}>
                            <div className="dashboard-pending-payment-info">
                                <strong>{getStudentName(row.student)}</strong>
                                <span>{row.student.coach?.user?.name || "Sin coach"} · {getPlanLabel(row)}</span>
                            </div>

                            <div className="dashboard-pending-payment-amount">
                                <strong>{formatCurrency(row.amountCents, row.currency)}</strong>
                                {row.isLate && row.status === "PENDING" && (
                                    <span>+{row.lateSurchargePercent}%</span>
                                )}
                            </div>
                        </article>
                    ))}

                    {hiddenRowsCount > 0 && (
                        <Link className="dashboard-pending-payments-more" href="/admin/pagos">
                            Ver {hiddenRowsCount} mas
                        </Link>
                    )}
                </div>
            ) : (
                <div className="dashboard-pending-payments-empty">
                    <strong>Todo al dia</strong>
                    <span>No hay pagos pendientes este mes.</span>
                </div>
            )}
        </section>
    );
};
