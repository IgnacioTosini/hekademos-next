import Link from 'next/link';
import { IoMdClose } from 'react-icons/io';
import type { AdminPaymentHistoryPage } from '@/app/actions/payment.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { LoadingState } from '@/components/ui/loadingState/LoadingState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import type { PaymentOverviewRow } from '@/types/schema/payments';
import { formatCurrency, formatDate } from '@/utils/format';
import { getPaymentStudentName, getPlanLabel, statusLabels } from './paymentSectionUtils';

type Props = {
    historyRow: PaymentOverviewRow;
    paymentHistory: AdminPaymentHistoryPage;
    isLoadingHistory: boolean;
    historyError: string;
    onClose: () => void;
    onPageChange: (page: number) => void;
};

export const PaymentHistoryModal = ({ historyRow, paymentHistory, isLoadingHistory, historyError, onClose, onPageChange }: Props) => (
        <div className="payment-history-modal-container">
            <div className="payment-history-modal">
                <div className="payment-history-header">
                    <div>
                        <h2>Historial de {getPaymentStudentName(historyRow)}</h2>
                        <p>{getPlanLabel(historyRow)}</p>
                    </div>

                    <div className="payment-history-header-actions">
                        <Link href={`/admin/alumnos/${historyRow.student.id}`}>
                            Ver perfil
                        </Link>
                        <button type="button" onClick={onClose} aria-label="Cerrar historial">
                            <IoMdClose />
                        </button>
                    </div>
                </div>

                <div className="payment-history-list">
                    {isLoadingHistory ? (
                        <LoadingState
                            compact
                            title="Cargando historial"
                            description="Estamos buscando los pagos registrados de este alumno."
                        />
                    ) : historyError ? (
                        <EmptyState
                            compact
                            title="No se pudo cargar"
                            description={historyError}
                        />
                    ) : paymentHistory.payments.length > 0 ? (
                        paymentHistory.payments.map((payment) => (
                            <div className="payment-history-item" key={payment.id}>
                                <div className="payment-history-item-main">
                                    <div>
                                        <strong>{formatCurrency(payment.amountCents, payment.currency)}</strong>
                                        <span>{payment.paidAt ? formatDate(payment.paidAt) : payment.dueDate ? formatDate(payment.dueDate) : '-'}</span>
                                    </div>

                                    {(payment.reference || payment.notes) && (
                                        <small>
                                            {[payment.reference, payment.notes].filter(Boolean).join(' · ')}
                                        </small>
                                    )}
                                </div>
                                <span className={`payment-status payment-status-${payment.status.toLowerCase()}`}>
                                    {statusLabels[payment.status]}
                                </span>
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            compact
                            title="Sin pagos registrados"
                            description="Este alumno todavia no tiene movimientos de pago."
                        />
                    )}
                </div>
                <Pagination page={paymentHistory.page} pageSize={8} totalItems={paymentHistory.total} onPageChange={(nextPage) => void onPageChange(nextPage)} label="pagos" />
            </div>
        </div>
);
