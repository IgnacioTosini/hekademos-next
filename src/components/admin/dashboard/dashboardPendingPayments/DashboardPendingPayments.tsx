import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";
import type { DashboardPendingPaymentsSummary } from "@/app/actions/payment.actions";
import { formatCurrency } from "@/utils/format";
import "./_dashboardPendingPayments.scss";

type Props = {
    summary: DashboardPendingPaymentsSummary;
};

export const DashboardPendingPayments = ({ summary }: Props) => {
    const hiddenRowsCount = summary.totalCount - summary.rows.length;

    return (
        <section className="dashboard-pending-payments">
            <div className="dashboard-pending-payments-header">
                <div>
                    <h2>Pendientes de pago</h2>
                    <p>Mes actual · {summary.totalCount} alumnos</p>
                </div>

                <Link href="/admin/pagos" aria-label="Ver pagos">
                    <FaArrowRight />
                </Link>
            </div>

            {summary.rows.length > 0 ? (
                <div className="dashboard-pending-payments-list">
                    {summary.rows.map((row) => (
                        <article className="dashboard-pending-payment" key={row.studentId}>
                            <div className="dashboard-pending-payment-info">
                                <strong>{row.studentName}</strong>
                                <span>{row.coachName} · {row.planName}</span>
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
