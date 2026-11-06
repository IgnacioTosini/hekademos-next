import { FaCheck, FaHistory, FaRegEdit, FaUndo } from 'react-icons/fa';
import type { PaymentOverviewRow } from '@/types/schema/payments';
import { formatCurrency } from '@/utils/format';
import { getInitials } from '@/utils/strings';
import { getGroupCounts, getPaymentDateLabel, getPaymentStudentName, getPlanLabel, statusLabels, type CoachGroup } from './paymentSectionUtils';

type Props = {
    groups: CoachGroup[];
    isPending: boolean;
    pendingStudentId: string | null;
    onMarkPaid: (row: PaymentOverviewRow) => void;
    onMarkPending: (row: PaymentOverviewRow) => void;
    onOpenDetails: (row: PaymentOverviewRow) => void;
    onOpenHistory: (row: PaymentOverviewRow) => void;
};

export const PaymentsCoachGroups = ({ groups, isPending, pendingStudentId, onMarkPaid, onMarkPending, onOpenDetails, onOpenHistory }: Props) => (
    <>
        {groups.map((group) => {
            const counts = getGroupCounts(group.rows);

            return (
                <div className="payments-coach-group" key={group.coachId}>
                    <div className="payments-coach-header">
                        <div>
                            <h2>{group.coachName}</h2>
                            <p>{group.rows.length} alumnos · {counts.paid} pagados · {counts.pending} pendientes</p>
                        </div>
                    </div>

                    <table className="payments-table">
                        <thead>
                            <tr>
                                <th>Alumno</th>
                                <th>Membresia</th>
                                <th>Monto</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {group.rows.map((row) => {
                                const studentName = getPaymentStudentName(row);
                                const isMarkingPaid = isPending && pendingStudentId === row.student.id;
                                const canMarkPaid = row.status !== 'PAID' && !!row.activeMembership;
                                const canMarkPending = row.status === 'PAID';

                                return (
                                    <tr className={isMarkingPaid ? 'payment-row-saving' : ''} key={row.student.id} aria-busy={isMarkingPaid}>
                                        <td className="payment-cell-student" data-label="Alumno">
                                            <div className="payment-student">
                                                <div className="payment-avatar">
                                                    <span>{getInitials(studentName)}</span>
                                                </div>

                                                <div>
                                                    <strong>{studentName}</strong>
                                                    <span>{row.student.user.email}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="payment-cell-plan" data-label="Membresía">{getPlanLabel(row)}</td>
                                        <td className="payment-cell-amount" data-label="Monto">
                                            <div className="payment-amount">
                                                <strong>{formatCurrency(row.amountCents, row.currency)}</strong>
                                                {row.isLate && row.status === 'PENDING' && (
                                                    <span>+{row.lateSurchargePercent}% recargo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="payment-cell-date" data-label="Fecha">
                                            <div className="payment-date">
                                                <strong>{getPaymentDateLabel(row)}</strong>
                                                {row.isLate && row.status === 'PENDING' && (
                                                    <span>Fuera de termino</span>
                                                )}
                                                {(row.currentMonthPayment?.reference || row.currentMonthPayment?.notes) && (
                                                    <small>
                                                        {[row.currentMonthPayment.reference, row.currentMonthPayment.notes].filter(Boolean).join(' · ')}
                                                    </small>
                                                )}
                                            </div>
                                        </td>
                                        <td className="payment-cell-status" data-label="Estado">
                                            <span className={`payment-status payment-status-${row.status.toLowerCase().replace('_', '-')}`}>
                                                {statusLabels[row.status]}
                                            </span>
                                        </td>
                                        <td className="payment-cell-actions" data-label="Acciones">
                                            <div className="payment-actions">
                                                {canMarkPending ? (
                                                    <button
                                                        className="payment-action-button payment-action-undo"
                                                        type="button"
                                                        onClick={() => onMarkPending(row)}
                                                        disabled={isPending}
                                                    >
                                                        <FaUndo />
                                                        {isMarkingPaid ? 'Guardando' : 'Desmarcar'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="payment-action-button payment-action-pay"
                                                        type="button"
                                                        onClick={() => onMarkPaid(row)}
                                                        disabled={!canMarkPaid || isPending}
                                                    >
                                                        <FaCheck />
                                                        {isMarkingPaid ? 'Guardando' : 'Marcar pagado'}
                                                    </button>
                                                )}
                                                <button
                                                    className="payment-icon-button"
                                                    type="button"
                                                    onClick={() => onOpenDetails(row)}
                                                    disabled={!row.activeMembership}
                                                    aria-label={`Editar detalle de pago de ${studentName}`}
                                                >
                                                    <FaRegEdit /><span>Detalle</span>
                                                </button>
                                                <button
                                                    className="payment-icon-button"
                                                    type="button"
                                                    onClick={() => onOpenHistory(row)}
                                                    aria-label={`Ver historial de ${studentName}`}
                                                >
                                                    <FaHistory /><span>Historial</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
        })}
    </>
);
