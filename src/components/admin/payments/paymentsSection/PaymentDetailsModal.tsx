import type { FormEvent } from 'react';
import { IoMdClose } from 'react-icons/io';
import type { PaymentOverviewRow } from '@/types/schema/payments';
import { getPaymentStudentName } from './paymentSectionUtils';

type Props = {
    detailsRow: PaymentOverviewRow;
    currentMonthLabel: string;
    reference: string;
    notes: string;
    detailsError: string;
    isPending: boolean;
    pendingStudentId: string | null;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onReferenceChange: (value: string) => void;
    onNotesChange: (value: string) => void;
};

export const PaymentDetailsModal = ({ detailsRow, currentMonthLabel, reference, notes, detailsError, isPending, pendingStudentId, onClose, onSubmit, onReferenceChange, onNotesChange }: Props) => (
        <div className="payment-details-modal-container">
            <div className="payment-details-modal">
                <div className="payment-details-header">
                    <div>
                        <h2>Detalle de pago</h2>
                        <p>{getPaymentStudentName(detailsRow)} · {currentMonthLabel}</p>
                    </div>

                    <button type="button" onClick={onClose} aria-label="Cerrar detalle">
                        <IoMdClose />
                    </button>
                </div>

                <form className="payment-details-form" onSubmit={onSubmit}>
                    <div className="payment-details-form-group">
                        <label htmlFor="payment-reference">Referencia</label>
                        <input
                            id="payment-reference"
                            value={reference}
                            onChange={(event) => onReferenceChange(event.target.value)}
                            placeholder="Nro. de transferencia, comprobante o identificador"
                        />
                    </div>

                    <div className="payment-details-form-group">
                        <label htmlFor="payment-notes">Notas</label>
                        <textarea
                            id="payment-notes"
                            value={notes}
                            onChange={(event) => onNotesChange(event.target.value)}
                            placeholder="Observaciones internas del pago"
                        />
                    </div>

                    {detailsError && <p className="payment-details-error">{detailsError}</p>}

                    <div className="payment-details-actions">
                        <button type="button" onClick={onClose} disabled={isPending}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={isPending && pendingStudentId === detailsRow.student.id}>
                            {isPending && pendingStudentId === detailsRow.student.id ? 'Guardando...' : 'Guardar detalle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
);
