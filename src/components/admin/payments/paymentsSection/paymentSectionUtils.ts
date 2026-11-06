import type { PaymentOverviewRow, PaymentOverviewStatus } from '@/types/schema/payments';
import { getClassCategoryLabel } from '@/utils/class-category';
import { formatDate } from '@/utils/format';
import { getStudentName } from '@/utils/student';

export type CoachGroup = {
    coachId: string;
    coachName: string;
    rows: PaymentOverviewRow[];
};

export const statusLabels: Record<PaymentOverviewStatus, string> = {
    PAID: 'Pagado',
    PENDING: 'Pendiente',
    REFUNDED: 'Reembolsado',
    CANCELLED: 'Cancelado',
    NO_MEMBERSHIP: 'Sin membresia',
};

export const getPaymentStudentName = (row: PaymentOverviewRow) => getStudentName(row.student);

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

export const getPlanLabel = (row: PaymentOverviewRow) => {
    if (!row.activeMembership) return 'Sin plan activo';

    return `${row.activeMembership.plan.name} · ${getClassCategoryLabel(row.activeMembership.plan.classCategory)} · ${row.activeMembership.plan.trainingDaysPerWeek} dias/semana`;
};

export const getPaymentDateLabel = (row: PaymentOverviewRow) => (
    `${formatPaymentDay(row.paymentPeriodStart)} al ${formatPaymentPeriodEnd(row.paymentPeriodEnd)}`
);

export const getCoachId = (row: PaymentOverviewRow) => row.student.coach?.id ?? 'unassigned';

export const getCoachName = (row: PaymentOverviewRow) => row.student.coach?.user?.name || 'Sin coach asignado';

export const getGroupCounts = (groupRows: PaymentOverviewRow[]) => {
    const paid = groupRows.filter((row) => row.status === 'PAID').length;
    const pending = groupRows.filter((row) => row.status === 'PENDING').length;

    return { paid, pending };
};

export const filterPaymentRows = (rows: PaymentOverviewRow[], query: string, coachId: string, status: string) => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
        if (coachId !== 'all' && getCoachId(row) !== coachId) return false;
        if (status !== 'ALL' && row.status !== status) return false;
        if (!search) return true;
        return [getPaymentStudentName(row), row.student.user.email, getCoachName(row), getPlanLabel(row), statusLabels[row.status], row.status]
            .some((value) => value.toLowerCase().includes(search));
    });
};

export const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat('es-AR', {
        month: 'long',
    }).format(new Date(2026, index, 1)),
}));

export const getYearOptions = (selectedYear: number) => {
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

export const buildCsv = (rows: PaymentOverviewRow[], periodLabel: string) => {
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

export const downloadCsv = (content: string, filename: string) => {
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

