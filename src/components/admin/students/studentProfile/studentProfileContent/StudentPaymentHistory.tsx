'use client';

import type { Payment } from '@/types/schema/payments';
import { Pagination } from '@/components/ui/pagination/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatCurrency, formatDate } from '@/utils/format';

const statusLabels: Record<Payment['status'], string> = {
    PENDING: 'Pendiente',
    PAID: 'Pagado',
    REFUNDED: 'Reembolsado',
    CANCELLED: 'Cancelado',
};

export const StudentPaymentHistory = ({ payments }: { payments: Payment[] }) => {
    const pages = usePagination(payments, 8);

    return (
        <>
            <div className="student-profile-payments" role="region" aria-label="Pagos registrados">
                {pages.pageItems.map((payment) => (
                    <div className="student-profile-payment" key={payment.id}>
                        <div>
                            <strong>{formatCurrency(payment.amountCents, payment.currency)}</strong>
                            <span>{payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.dueDate)}</span>
                            {(payment.reference || payment.notes) && <small>{[payment.reference, payment.notes].filter(Boolean).join(' · ')}</small>}
                        </div>
                        <span className={`student-profile-payment-status student-profile-payment-status-${payment.status.toLowerCase()}`}>
                            {statusLabels[payment.status]}
                        </span>
                    </div>
                ))}
            </div>
            <Pagination page={pages.page} pageSize={pages.pageSize} totalItems={payments.length} onPageChange={pages.setPage} label="pagos" />
        </>
    );
};
