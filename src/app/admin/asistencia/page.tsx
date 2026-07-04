import type { Metadata } from 'next';
import { getAdminAttendanceOverview, getAdminMonthlyAttendanceSummary } from '@/app/actions/attendance.actions';
import { getCoaches } from '@/app/actions/coach.actions';
import { AttendanceSection } from '@/components/admin/attendance';
import { toDateInputValue } from '@/utils/date';
import './_asistenciaPage.scss';

export const metadata: Metadata = {
    title: 'Asistencia',
    description: 'Administracion de asistencia de Hekademos.',
};

type Props = {
    searchParams?: Promise<{
        date?: string;
        coachId?: string;
        month?: string;
        year?: string;
    }>;
};

export default async function AsistenciaPage({ searchParams }: Props) {
    const params = await searchParams;
    const today = new Date();
    const selectedDate = params?.date || toDateInputValue(today);
    const selectedCoachId = params?.coachId || 'all';
    const parsedMonth = Number(params?.month);
    const parsedYear = Number(params?.year);
    const selectedMonth = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : today.getMonth() + 1;
    const selectedYear = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
        ? parsedYear
        : today.getFullYear();
    const [attendanceResponse, coachesResponse, monthlySummaryResponse] = await Promise.all([
        getAdminAttendanceOverview({
            date: selectedDate,
            coachId: selectedCoachId,
        }),
        getCoaches(),
        getAdminMonthlyAttendanceSummary({
            month: selectedMonth,
            year: selectedYear,
            coachId: selectedCoachId,
        }),
    ]);
    const schedules = attendanceResponse.ok ? attendanceResponse.data : [];
    const coaches = coachesResponse.ok ? coachesResponse.data : [];
    const monthlySummary = monthlySummaryResponse.ok ? monthlySummaryResponse.data : null;

    return (
        <div className="asistencia-page">
            <AttendanceSection
                schedules={schedules}
                coaches={coaches}
                selectedDate={selectedDate}
                selectedCoachId={selectedCoachId}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                monthlySummary={monthlySummary}
            />
        </div>
    );
}
