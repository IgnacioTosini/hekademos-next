'use client';

import type { Payment } from '@/types/schema/payments';
import { useRouter } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatCurrency, formatDate } from '@/utils/format';

const statusLabels: Record<Payment['status'], string> = {
    PENDING: 'Pendiente',
    PAID: 'Pagado',
    REFUNDED: 'Reembolsado',
    CANCELLED: 'Cancelado',
};

type Props = {
    payments: Payment[];
    serverPagination?: { page: number; totalItems: number; baseHref: string };
};

export const StudentPaymentHistory = ({ payments, serverPagination }: Props) => {
    const router = useRouter();
    const pages = usePagination(payments, 8);
    const pageItems = serverPagination ? payments : pages.pageItems;
    const page = serverPagination?.page ?? pages.page;
    const totalItems = serverPagination?.totalItems ?? payments.length;
    const onPageChange = (nextPage: number) => {
        if (!serverPagination) {
            pages.setPage(nextPage);
            return;
        }
        router.replace(`${serverPagination.baseHref}&paymentPage=${nextPage}`, { scroll: false });
    };

    return (
        <>
            <div className="student-profile-payments" role="region" aria-label="Pagos registrados">
                {pageItems.map((payment) => (
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
            <Pagination page={page} pageSize={pages.pageSize} totalItems={totalItems} onPageChange={onPageChange} label="pagos" />
        </>
    );
};
