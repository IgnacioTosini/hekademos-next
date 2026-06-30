import { getPaymentOverview } from '@/app/actions/payment.actions';
import { PaymentsSection } from '@/components/admin/payments/paymentsSection/PaymentsSection';
import type { Metadata } from 'next';
import './_pagosPage.scss';

export const metadata: Metadata = {
    title: 'Pagos',
    description: 'Administracion de pagos y membresias de Hekademos.',
};

type Props = {
    searchParams?: Promise<{
        month?: string;
        year?: string;
    }>;
};

const getSelectedPeriod = (month?: string, year?: string) => {
    const today = new Date();
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    const selectedMonth = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : today.getMonth() + 1;
    const selectedYear = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
        ? parsedYear
        : today.getFullYear();

    return { selectedMonth, selectedYear };
};

export default async function PagosPage({ searchParams }: Props) {
    const params = await searchParams;
    const { selectedMonth, selectedYear } = getSelectedPeriod(params?.month, params?.year);
    const paymentsResponse = await getPaymentOverview({
        month: selectedMonth,
        year: selectedYear,
    });
    const rows = paymentsResponse.ok ? paymentsResponse.data : [];

    return (
        <div className="pagos-page">
            <PaymentsSection
                rows={rows}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
            />
        </div>
    );
}
