'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState, useTransition } from 'react';
import { FaCheck, FaDownload, FaEnvelope, FaHistory, FaRegEdit, FaUndo } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { toast } from 'react-toastify';
import {
    getStudentPaymentHistory,
    markCurrentMonthPaymentPaid,
    markCurrentMonthPaymentPending,
    savePaymentDetails,
    sendPaymentReminderEmails,
} from '@/app/actions/payment.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import type { Payment, PaymentOverviewRow, PaymentOverviewStatus } from '@/types/schema/payments';
import { getClassCategoryLabel } from '@/utils/class-category';
import { formatCurrency, formatDate } from '@/utils/format';
import { getInitials } from '@/utils/strings';
import { getStudentName } from '@/utils/student';
import './_paymentsSection.scss';

type Props = {
    rows: PaymentOverviewRow[];
    selectedMonth: number;
    selectedYear: number;
};

type CoachGroup = {
    coachId: string;
    coachName: string;
    rows: PaymentOverviewRow[];
};

const statusLabels: Record<PaymentOverviewStatus, string> = {
    PAID: 'Pagado',
    PENDING: 'Pendiente',
    REFUNDED: 'Reembolsado',
    CANCELLED: 'Cancelado',
    NO_MEMBERSHIP: 'Sin membresia',
};

const getPaymentStudentName = (row: PaymentOverviewRow) => getStudentName(row.student);

const formatPaymentDay = (value: PaymentOverviewRow['paymentPeriodStart']) => (
    new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
    }).format(new Date(value))
);

const formatPaymentPeriodEnd = (value: PaymentOverviewRow['paymentPeriodEnd']) => (
    new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value))
);

const getPlanLabel = (row: PaymentOverviewRow) => {
    if (!row.activeMembership) return 'Sin plan activo';

    return `${row.activeMembership.plan.name} · ${getClassCategoryLabel(row.activeMembership.plan.classCategory)} · ${row.activeMembership.plan.trainingDaysPerWeek} dias/semana`;
};

const getPaymentDateLabel = (row: PaymentOverviewRow) => (
    `${formatPaymentDay(row.paymentPeriodStart)} al ${formatPaymentPeriodEnd(row.paymentPeriodEnd)}`
);

const getCoachId = (row: PaymentOverviewRow) => row.student.coach?.id ?? 'unassigned';

const getCoachName = (row: PaymentOverviewRow) => row.student.coach?.user?.name || 'Sin coach asignado';

const getGroupCounts = (groupRows: PaymentOverviewRow[]) => {
    const paid = groupRows.filter((row) => row.status === 'PAID').length;
    const pending = groupRows.filter((row) => row.status === 'PENDING').length;

    return { paid, pending };
};

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat('es-AR', {
        month: 'long',
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

const escapeCsvValue = (value: string | number | null | undefined) => {
    const normalizedValue = value === null || value === undefined ? '' : String(value);

    return `"${normalizedValue.replace(/"/g, '""')}"`;
};

const buildCsv = (rows: PaymentOverviewRow[], periodLabel: string) => {
    const headers = [
        'Periodo',
        'Alumno',
        'Email',
        'Coach',
        'Membresia',
        'Estado',
        'Monto',
        'Moneda',
        'Vencimiento',
        'Fecha pago',
        'Recargo',
        'Referencia',
        'Notas',
    ];
    const lines = rows.map((row) => {
        const payment = row.currentMonthPayment;
        const values = [
            periodLabel,
            getPaymentStudentName(row),
            row.student.user.email,
            getCoachName(row),
            getPlanLabel(row),
            statusLabels[row.status],
            row.amountCents === null ? '' : row.amountCents / 100,
            row.currency,
            getPaymentDateLabel(row),
            payment?.paidAt ? formatDate(payment.paidAt) : '',
            row.isLate && row.status === 'PENDING' ? `${row.lateSurchargePercent}%` : '',
            payment?.reference ?? '',
            payment?.notes ?? '',
        ];

        return values.map(escapeCsvValue).join(';');
    });

    return [headers.map(escapeCsvValue).join(';'), ...lines].join('\n');
};

const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([`\uFEFF${content}`], {
        type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export const PaymentsSection = ({ rows, selectedMonth, selectedYear }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [selectedCoachId, setSelectedCoachId] = useState('all');
    const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
    const [historyRow, setHistoryRow] = useState<PaymentOverviewRow | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
    const [historyError, setHistoryError] = useState('');
    const [detailsRow, setDetailsRow] = useState<PaymentOverviewRow | null>(null);
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [detailsError, setDetailsError] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isLoadingHistory, startHistoryTransition] = useTransition();
    const [isSendingReminders, startReminderTransition] = useTransition();

    const paidCount = rows.filter((row) => row.status === 'PAID').length;
    const pendingCount = rows.filter((row) => row.status === 'PENDING').length;
    const activeMembershipsCount = rows.filter((row) => row.activeMembership).length;

    const currentMonthLabel = new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(selectedYear, selectedMonth - 1, 1));

    const paymentWindowLabel = rows[0] ? getPaymentDateLabel(rows[0]) : 'del 1 al 10';
    const selectedPeriod = {
        month: selectedMonth,
        year: selectedYear,
    };
    const yearOptions = useMemo(() => getYearOptions(selectedYear), [selectedYear]);

    const replacePeriod = (nextMonth: number, nextYear: number) => {
        router.replace(`/admin/pagos?month=${nextMonth}&year=${nextYear}`);
    };

    const coachOptions = useMemo(() => {
        const options = new Map<string, { id: string; name: string; total: number; pending: number }>();

        rows.forEach((row) => {
            const id = getCoachId(row);
            const current = options.get(id) ?? {
                id,
                name: getCoachName(row),
                total: 0,
                pending: 0,
            };

            current.total += 1;
            current.pending += row.status === 'PENDING' ? 1 : 0;
            options.set(id, current);
        });

        return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [rows]);

    const searchedRows = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return rows;

        return rows.filter((row) => {
            const values = [
                getPaymentStudentName(row),
                row.student.user.email,
                getCoachName(row),
                getPlanLabel(row),
                statusLabels[row.status],
            ];

            return values.some((value) => value?.toLowerCase().includes(search));
        });
    }, [query, rows]);

    const filteredRows = useMemo(() => {
        if (selectedCoachId === 'all') return searchedRows;

        return searchedRows.filter((row) => getCoachId(row) === selectedCoachId);
    }, [searchedRows, selectedCoachId]);

    const groupedRows = useMemo(() => {
        const groups = new Map<string, CoachGroup>();

        filteredRows.forEach((row) => {
            const coachId = getCoachId(row);
            const group = groups.get(coachId) ?? {
                coachId,
                coachName: getCoachName(row),
                rows: [],
            };

            group.rows.push(row);
            groups.set(coachId, group);
        });

        return Array.from(groups.values()).sort((a, b) => a.coachName.localeCompare(b.coachName));
    }, [filteredRows]);

    const handleExportCsv = () => {
        if (filteredRows.length === 0) {
            toast.info('No hay pagos para exportar');
            return;
        }

        const filename = `pagos-hekademos-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
        const csv = buildCsv(filteredRows, currentMonthLabel);

        downloadCsv(csv, filename);
        toast.success('Archivo CSV generado');
    };

    const handleSendReminders = () => {
        const confirmed = window.confirm(
            `Se enviarán recordatorios por WhatsApp (email de respaldo) a los alumnos pendientes de ${currentMonthLabel}. No se repetirán los ya enviados. ¿Continuar?`
        );

        if (!confirmed) return;

        startReminderTransition(async () => {
            const result = await sendPaymentReminderEmails(selectedPeriod);

            if (!result.ok) {
                toast.error(result.error);
                return;
            }

            const summary = [
                result.data.whatsappCount > 0 ? `${result.data.whatsappCount} por WhatsApp` : null,
                result.data.emailCount > 0 ? `${result.data.emailCount} por email` : null,
                result.data.duplicateCount > 0 ? `${result.data.duplicateCount} ya enviados o en proceso` : null,
                result.data.failedCount > 0 ? `${result.data.failedCount} fallidos` : null,
                result.data.invalidEmailCount > 0 ? `${result.data.invalidEmailCount} con email inválido` : null,
                result.data.alreadyPaidCount > 0 ? `${result.data.alreadyPaidCount} ya pagados` : null,
                result.data.skippedCount > 0 ? `${result.data.skippedCount} omitidos` : null,
            ].filter(Boolean).join(' · ');

            if (result.data.incomplete || result.data.failedCount > 0) {
                toast.warning(`${summary}. ${result.data.incomplete ? 'Quedaron alumnos por procesar. ' : ''}Podés reintentar sin repetir los enviados.`);
                return;
            }
            if (result.data.sentCount === 0 && result.data.failedCount === 0) {
                toast.info(summary || 'No hay alumnos pendientes para enviar recordatorios');
                return;
            }

            toast.success(summary || 'Recordatorios procesados');
            router.refresh();
        });
    };

    const handleMarkPaid = (row: PaymentOverviewRow) => {
        setPendingStudentId(row.student.id);

        startTransition(async () => {
            const result = await markCurrentMonthPaymentPaid(row.student.id, selectedPeriod);

            if (result.ok) {
                toast.success('Pago marcado como pagado');
                router.refresh();
            } else {
                toast.error(result.error);
            }

            setPendingStudentId(null);
        });
    };

    const handleMarkPending = (row: PaymentOverviewRow) => {
        setPendingStudentId(row.student.id);

        startTransition(async () => {
            const result = await markCurrentMonthPaymentPending(row.student.id, selectedPeriod);

            if (result.ok) {
                toast.success('Pago desmarcado');
                router.refresh();
            } else {
                toast.error(result.error);
            }

            setPendingStudentId(null);
        });
    };

    const openDetailsModal = (row: PaymentOverviewRow) => {
        setDetailsRow(row);
        setReference(row.currentMonthPayment?.reference ?? '');
        setNotes(row.currentMonthPayment?.notes ?? '');
        setDetailsError('');
    };

    const openHistoryModal = (row: PaymentOverviewRow) => {
        setHistoryRow(row);
        setPaymentHistory([]);
        setHistoryError('');

        startHistoryTransition(async () => {
            const result = await getStudentPaymentHistory(row.student.id);

            if (result.ok) {
                setPaymentHistory(result.data);
                return;
            }

            setHistoryError(result.error);
            toast.error(result.error);
        });
    };

    const closeHistoryModal = () => {
        setHistoryRow(null);
        setPaymentHistory([]);
        setHistoryError('');
    };

    const closeDetailsModal = () => {
        setDetailsRow(null);
        setReference('');
        setNotes('');
        setDetailsError('');
    };

    const handleDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!detailsRow) return;

        setDetailsError('');
        setPendingStudentId(detailsRow.student.id);

        startTransition(async () => {
            const result = await savePaymentDetails(detailsRow.student.id, {
                ...selectedPeriod,
                reference,
                notes,
            });

            if (result.ok) {
                toast.success('Detalles del pago guardados');
                router.refresh();
                closeDetailsModal();
            } else {
                setDetailsError(result.error);
                toast.error(result.error);
            }

            setPendingStudentId(null);
        });
    };

    return (
        <section className="payments-section">
            <div className="payments-header">
                <div className="payments-header-text">
                    <h1 className="payments-title">Pagos</h1>
                    <p className="payments-description">
                        {currentMonthLabel}: vencimiento {paymentWindowLabel} · {paidCount} pagados · {pendingCount} pendientes · {activeMembershipsCount} membresias activas
                    </p>
                </div>
            </div>

            <div className="payments-table-wrapper">
                <div className="payments-table-toolbar">
                    <div className="payments-period-filters">
                        <select
                            value={selectedMonth}
                            onChange={(event) => replacePeriod(Number(event.target.value), selectedYear)}
                            aria-label="Filtrar por mes"
                        >
                            {monthOptions.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedYear}
                            onChange={(event) => replacePeriod(selectedMonth, Number(event.target.value))}
                            aria-label="Filtrar por año"
                        >
                            {yearOptions.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        className="payments-export-button"
                        type="button"
                        onClick={handleExportCsv}
                    >
                        <FaDownload />
                        Exportar CSV
                    </button>

                    <button
                        className="payments-export-button"
                        type="button"
                        onClick={handleSendReminders}
                        disabled={isSendingReminders}
                    >
                        <FaEnvelope />
                        {isSendingReminders ? 'Enviando...' : 'Enviar recordatorios'}
                    </button>

                    <select
                        value={selectedCoachId}
                        onChange={(event) => setSelectedCoachId(event.target.value)}
                        aria-label="Filtrar por coach"
                    >
                        <option value="all">Todos los coaches</option>
                        {coachOptions.map((coach) => (
                            <option key={coach.id} value={coach.id}>
                                {coach.name} ({coach.pending}/{coach.total} pendientes)
                            </option>
                        ))}
                    </select>

                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar alumno, coach o plan..."
                        aria-label="Buscar pago"
                    />
                </div>

                {groupedRows.map((group) => {
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
                                            <tr key={row.student.id}>
                                                <td data-label="Alumno">
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

                                                <td data-label="Membresia">{getPlanLabel(row)}</td>
                                                <td data-label="Monto">
                                                    <div className="payment-amount">
                                                        <strong>{formatCurrency(row.amountCents, row.currency)}</strong>
                                                        {row.isLate && row.status === 'PENDING' && (
                                                            <span>+{row.lateSurchargePercent}% recargo</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td data-label="Fecha">
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
                                                <td data-label="Estado">
                                                    <span className={`payment-status payment-status-${row.status.toLowerCase().replace('_', '-')}`}>
                                                        {statusLabels[row.status]}
                                                    </span>
                                                </td>
                                                <td data-label="Acciones">
                                                    <div className="payment-actions">
                                                        {canMarkPending ? (
                                                            <button
                                                                className="payment-action-button"
                                                                type="button"
                                                                onClick={() => handleMarkPending(row)}
                                                                disabled={isMarkingPaid}
                                                            >
                                                                <FaUndo />
                                                                {isMarkingPaid ? 'Guardando' : 'Desmarcar'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="payment-action-button"
                                                                type="button"
                                                                onClick={() => handleMarkPaid(row)}
                                                                disabled={!canMarkPaid || isMarkingPaid}
                                                            >
                                                                <FaCheck />
                                                                {isMarkingPaid ? 'Guardando' : 'Marcar pagado'}
                                                            </button>
                                                        )}
                                                        <button
                                                            className="payment-icon-button"
                                                            type="button"
                                                            onClick={() => openDetailsModal(row)}
                                                            disabled={!row.activeMembership}
                                                            aria-label={`Editar detalle de pago de ${studentName}`}
                                                        >
                                                            <FaRegEdit />
                                                        </button>
                                                        <button
                                                            className="payment-icon-button"
                                                            type="button"
                                                            onClick={() => openHistoryModal(row)}
                                                            aria-label={`Ver historial de ${studentName}`}
                                                        >
                                                            <FaHistory />
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

                {filteredRows.length === 0 && (
                    <EmptyState
                        compact
                        title={rows.length > 0 ? 'Sin resultados' : 'Sin pagos'}
                        description={rows.length > 0
                            ? 'No hay alumnos que coincidan con los filtros de pago.'
                            : 'Todavia no hay alumnos o pagos para mostrar en este periodo.'}
                    />
                )}
            </div>

            {historyRow && (
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
                                <button type="button" onClick={closeHistoryModal} aria-label="Cerrar historial">
                                    <IoMdClose />
                                </button>
                            </div>
                        </div>

                        <div className="payment-history-list">
                            {isLoadingHistory ? (
                                <EmptyState
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
                            ) : paymentHistory.length > 0 ? (
                                paymentHistory.map((payment) => (
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
                    </div>
                </div>
            )}

            {detailsRow && (
                <div className="payment-details-modal-container">
                    <div className="payment-details-modal">
                        <div className="payment-details-header">
                            <div>
                                <h2>Detalle de pago</h2>
                                <p>{getPaymentStudentName(detailsRow)} · {currentMonthLabel}</p>
                            </div>

                            <button type="button" onClick={closeDetailsModal} aria-label="Cerrar detalle">
                                <IoMdClose />
                            </button>
                        </div>

                        <form className="payment-details-form" onSubmit={handleDetailsSubmit}>
                            <div className="payment-details-form-group">
                                <label htmlFor="payment-reference">Referencia</label>
                                <input
                                    id="payment-reference"
                                    value={reference}
                                    onChange={(event) => setReference(event.target.value)}
                                    placeholder="Nro. de transferencia, comprobante o identificador"
                                />
                            </div>

                            <div className="payment-details-form-group">
                                <label htmlFor="payment-notes">Notas</label>
                                <textarea
                                    id="payment-notes"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Observaciones internas del pago"
                                />
                            </div>

                            {detailsError && <p className="payment-details-error">{detailsError}</p>}

                            <div className="payment-details-actions">
                                <button type="button" onClick={closeDetailsModal} disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending && pendingStudentId === detailsRow.student.id}>
                                    {isPending && pendingStudentId === detailsRow.student.id ? 'Guardando...' : 'Guardar detalle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};
