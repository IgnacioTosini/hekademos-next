'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { FaDownload, FaEnvelope } from 'react-icons/fa';
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
import { Pagination } from '@/components/ui/pagination/Pagination';
import type { PaymentOverviewRow } from '@/types/schema/payments';
import { buildCsv, downloadCsv, filterPaymentRows, getCoachId, getCoachName, getPaymentDateLabel, getYearOptions, monthOptions, type CoachGroup } from './paymentSectionUtils';
import { PaymentsCoachGroups } from './PaymentsCoachGroups';
import { PaymentHistoryModal } from './PaymentHistoryModal';
import { PaymentDetailsModal } from './PaymentDetailsModal';
import './_paymentsSection.scss';

type Props = {
    initialPage: PaymentOverviewPage;
    selectedMonth: number;
    selectedYear: number;
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
                    <PaymentsCoachGroups groups={groupedRows} isPending={isPending} pendingStudentId={pendingStudentId} onMarkPaid={handleMarkPaid} onMarkPending={handleMarkPending} onOpenDetails={openDetailsModal} onOpenHistory={openHistoryModal} />
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
                <PaymentHistoryModal
                    historyRow={historyRow}
                    paymentHistory={paymentHistory}
                    isLoadingHistory={isLoadingHistory}
                    historyError={historyError}
                    onClose={closeHistoryModal}
                    onPageChange={(nextPage) => void loadHistoryPage(historyRow.student.id, nextPage)}
                />
            )}

            {detailsRow && (
                <PaymentDetailsModal
                    detailsRow={detailsRow}
                    currentMonthLabel={currentMonthLabel}
                    reference={reference}
                    notes={notes}
                    detailsError={detailsError}
                    isPending={isPending}
                    pendingStudentId={pendingStudentId}
                    onClose={closeDetailsModal}
                    onSubmit={handleDetailsSubmit}
                    onReferenceChange={setReference}
                    onNotesChange={setNotes}
                />
            )}
        </section>
    );
};
