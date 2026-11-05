'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { FaCheck, FaDownload, FaEnvelope, FaHistory, FaRegEdit, FaUndo } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { toast } from 'react-toastify';
import {
    getPaymentOverview,
    getPaymentOverviewPage,
    getStudentPaymentHistory,
    markCurrentMonthPaymentPaid,
    markCurrentMonthPaymentPending,
    savePaymentDetails,
    sendPaymentReminderEmails,
    type AdminPaymentHistoryPage,
} from '@/app/actions/payment.actions';
import type { PaymentOverviewPage } from '@/app/actions/payment.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { LoadingState } from '@/components/ui/loadingState/LoadingState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import type { PaymentOverviewRow, PaymentOverviewStatus } from '@/types/schema/payments';
import { getClassCategoryLabel } from '@/utils/class-category';
import { formatCurrency, formatDate } from '@/utils/format';
import { getInitials } from '@/utils/strings';
import { getStudentName } from '@/utils/student';
import './_paymentsSection.scss';

type Props = {
    initialPage: PaymentOverviewPage;
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

const filterPaymentRows = (rows: PaymentOverviewRow[], query: string, coachId: string, status: string) => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
        if (coachId !== 'all' && getCoachId(row) !== coachId) return false;
        if (status !== 'ALL' && row.status !== status) return false;
        if (!search) return true;
        return [getPaymentStudentName(row), row.student.user.email, getCoachName(row), getPlanLabel(row), statusLabels[row.status], row.status]
            .some((value) => value.toLowerCase().includes(search));
    });
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

export const PaymentsSection = ({ initialPage, selectedMonth, selectedYear }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [selectedCoachId, setSelectedCoachId] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [pageData, setPageData] = useState(initialPage);
    const [page, setPage] = useState(1);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const pageRequestRef = useRef(0);
    const firstPageRender = useRef(true);
    const rows = pageData.rows;
    const [showReminderConfirm, setShowReminderConfirm] = useState(false);
    const cancelReminderRef = useRef<HTMLButtonElement>(null);
    const [isChangingPeriod, startPeriodTransition] = useTransition();
    const periodIndicatorRef = useRef<HTMLSpanElement>(null);
    const groupsRef = useRef<HTMLDivElement>(null);
    const filtersInitialized = useRef(false);
    const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
    const [historyRow, setHistoryRow] = useState<PaymentOverviewRow | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<AdminPaymentHistoryPage>({ payments: [], total: 0, page: 1 });
    const historyRequestRef = useRef(0);
    const [historyError, setHistoryError] = useState('');
    const [detailsRow, setDetailsRow] = useState<PaymentOverviewRow | null>(null);
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [detailsError, setDetailsError] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isSendingReminders, startReminderTransition] = useTransition();

    useEffect(() => {
        if (!showReminderConfirm) return;
        cancelReminderRef.current?.focus();
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowReminderConfirm(false);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [showReminderConfirm]);

    useEffect(() => {
        if (!isChangingPeriod || !periodIndicatorRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled || !periodIndicatorRef.current) return;
            const context = gsap.context(() => {
                gsap.to(periodIndicatorRef.current, { rotation: 360, duration: .8, ease: 'none', repeat: -1 });
            });
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [isChangingPeriod]);

    useEffect(() => {
        if (!filtersInitialized.current) { filtersInitialized.current = true; return; }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled || !groupsRef.current) return;
            const groups = groupsRef.current.querySelectorAll('.payments-coach-group');
            const context = gsap.context(() => {
                gsap.fromTo(groups, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .32, stagger: .05, ease: 'power2.out', clearProps: 'all' });
            }, groupsRef);
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [selectedCoachId, selectedStatus]);

    const paidCount = pageData.paidCount;
    const pendingCount = pageData.pendingCount;
    const activeMembershipsCount = pageData.activeMembershipsCount;

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
        startPeriodTransition(() => router.replace(`/admin/pagos?month=${nextMonth}&year=${nextYear}`, { scroll: false }));
    };

    const coachOptions = pageData.coachOptions;

    useEffect(() => {
        if (firstPageRender.current) { firstPageRender.current = false; return; }
        const requestId = ++pageRequestRef.current;
        const timer = window.setTimeout(async () => {
            setIsLoadingPage(true);
            const result = await getPaymentOverviewPage({ month: selectedMonth, year: selectedYear,
                query, coachId: selectedCoachId, status: selectedStatus, page });
            if (pageRequestRef.current !== requestId) return;
            if (result.ok) {
                setPageData(result.data);
                if (result.data.page !== page) setPage(result.data.page);
            } else toast.error(result.error);
            setIsLoadingPage(false);
        }, query ? 250 : 0);
        return () => { pageRequestRef.current += 1; window.clearTimeout(timer); };
    }, [query, selectedCoachId, selectedStatus, page, selectedMonth, selectedYear]);

    const refreshPage = async () => {
        const requestId = ++pageRequestRef.current;
        const result = await getPaymentOverviewPage({ month: selectedMonth, year: selectedYear,
            query, coachId: selectedCoachId, status: selectedStatus, page });
        if (pageRequestRef.current !== requestId) return;
        if (result.ok) {
            setPageData(result.data);
            if (result.data.page !== page) setPage(result.data.page);
        } else toast.error(result.error);
    };

    const groupedRows = useMemo(() => {
        const groups = new Map<string, CoachGroup>();

        rows.forEach((row) => {
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
    }, [rows]);

    const handleExportCsv = async () => {
        if (pageData.filteredTotal === 0) {
            toast.info('No hay pagos para exportar');
            return;
        }
        setIsExporting(true);
        const result = await getPaymentOverview(selectedPeriod);
        setIsExporting(false);
        if (!result.ok) { toast.error(result.error); return; }
        const filteredRows = filterPaymentRows(result.data, query, selectedCoachId, selectedStatus);
        const filename = `pagos-hekademos-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
        const csv = buildCsv(filteredRows, currentMonthLabel);

        downloadCsv(csv, filename);
        toast.success('Archivo CSV generado');
    };

    const handleSendReminders = () => {
        setShowReminderConfirm(false);
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
            void refreshPage();
        });
    };

    const handleMarkPaid = (row: PaymentOverviewRow) => {
        setPendingStudentId(row.student.id);

        startTransition(async () => {
            const result = await markCurrentMonthPaymentPaid(row.student.id, selectedPeriod);

            if (result.ok) {
                toast.success('Pago marcado como pagado');
                router.refresh();
                void refreshPage();
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
                void refreshPage();
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

    const loadHistoryPage = async (studentId: string, nextPage: number) => {
        const requestId = ++historyRequestRef.current;
        setIsLoadingHistory(true);
        setHistoryError('');
        const result = await getStudentPaymentHistory(studentId, nextPage);
        if (requestId !== historyRequestRef.current) return;
        if (result.ok) setPaymentHistory(result.data);
        else { setHistoryError(result.error); toast.error(result.error); }
        setIsLoadingHistory(false);
    };

    const openHistoryModal = (row: PaymentOverviewRow) => {
        setHistoryRow(row);
        setPaymentHistory({ payments: [], total: 0, page: 1 });
        void loadHistoryPage(row.student.id, 1);
    };

    const closeHistoryModal = () => {
        historyRequestRef.current += 1;
        setHistoryRow(null);
        setPaymentHistory({ payments: [], total: 0, page: 1 });
        setHistoryError('');
        setIsLoadingHistory(false);
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
                void refreshPage();
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
                        {currentMonthLabel} · vencimiento {paymentWindowLabel}
                    </p>
                </div>
            </div>

            <div className="payments-overview" aria-label="Resumen de pagos del período">
                <div><span>Pendientes</span><strong>{pendingCount}</strong></div>
                <div><span>Pagados</span><strong>{paidCount}</strong></div>
                <div><span>Membresías activas</span><strong>{activeMembershipsCount}</strong></div>
            </div>

            {isChangingPeriod && <div className="payments-period-status" role="status"><span ref={periodIndicatorRef} aria-hidden="true" />Actualizando período...</div>}

            {showReminderConfirm && (
                <div className="payments-reminder-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowReminderConfirm(false); }}>
                    <div className="payments-reminder-dialog" role="alertdialog" aria-modal="true" aria-labelledby="payments-reminder-title" aria-describedby="payments-reminder-description">
                        <span className="payments-reminder-eyebrow">ENVÍO MASIVO</span>
                        <h2 id="payments-reminder-title">Enviar recordatorios</h2>
                        <p id="payments-reminder-description">Se enviarán recordatorios de <strong>{currentMonthLabel}</strong> a los alumnos con pago pendiente. Se usará WhatsApp y email como respaldo. Los ya enviados no se repetirán.</p>
                        <div className="payments-reminder-actions">
                            <button type="button" ref={cancelReminderRef} onClick={() => setShowReminderConfirm(false)}>Cancelar</button>
                            <button type="button" onClick={handleSendReminders}>Enviar recordatorios</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="payments-table-wrapper">
                <div className="payments-table-toolbar" aria-busy={isChangingPeriod}>
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
                        onClick={() => void handleExportCsv()}
                        disabled={isExporting}
                    >
                        <FaDownload />
                        {isExporting ? 'Preparando CSV...' : 'Exportar CSV'}
                    </button>

                    <button
                        className="payments-export-button"
                        type="button"
                        onClick={() => setShowReminderConfirm(true)}
                        disabled={isSendingReminders || pendingCount === 0}
                    >
                        <FaEnvelope />
                        {isSendingReminders ? 'Enviando...' : 'Enviar recordatorios'}
                    </button>

                    <select
                        value={selectedCoachId}
                        onChange={(event) => { setSelectedCoachId(event.target.value); setPage(1); }}
                        aria-label="Filtrar por coach"
                    >
                        <option value="all">Todos los coaches</option>
                        {coachOptions.map((coach) => (
                            <option key={coach.id} value={coach.id}>
                                {coach.name} ({coach.pending}/{coach.total} pendientes)
                            </option>
                        ))}
                    </select>

                    <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setPage(1); }} aria-label="Filtrar por estado de pago">
                        <option value="ALL">Todos los estados</option>
                        <option value="PENDING">Pendientes</option>
                        <option value="PAID">Pagados</option>
                        <option value="NO_MEMBERSHIP">Sin membresía</option>
                        <option value="REFUNDED">Reembolsados</option>
                        <option value="CANCELLED">Cancelados</option>
                    </select>

                    <input
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                        placeholder="Buscar alumno, coach o plan..."
                        aria-label="Buscar pago"
                    />
                </div>

                <p className="payments-results" aria-live="polite">Mostrando <strong>{pageData.filteredTotal}</strong> de {pageData.total} alumnos{isLoadingPage ? ' · Cargando...' : ''}</p>

                <div className="payments-groups" ref={groupsRef}>

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
                                                                onClick={() => handleMarkPending(row)}
                                                                disabled={isPending}
                                                            >
                                                                <FaUndo />
                                                                {isMarkingPaid ? 'Guardando' : 'Desmarcar'}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="payment-action-button payment-action-pay"
                                                                type="button"
                                                                onClick={() => handleMarkPaid(row)}
                                                                disabled={!canMarkPaid || isPending}
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
                                                            <FaRegEdit /><span>Detalle</span>
                                                        </button>
                                                        <button
                                                            className="payment-icon-button"
                                                            type="button"
                                                            onClick={() => openHistoryModal(row)}
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
                </div>
                <Pagination page={page} pageSize={15} totalItems={pageData.filteredTotal} onPageChange={setPage} label="alumnos" />

                {pageData.filteredTotal === 0 && !isLoadingPage && (
                    <EmptyState
                        compact
                        title={pageData.total > 0 ? 'Sin resultados' : 'Sin pagos'}
                        description={pageData.total > 0
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
                        <Pagination page={paymentHistory.page} pageSize={8} totalItems={paymentHistory.total} onPageChange={(nextPage) => void loadHistoryPage(historyRow.student.id, nextPage)} label="pagos" />
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
