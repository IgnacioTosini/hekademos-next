import type { AdminMonthlyAttendanceSummary } from '@/types/schema/classes';
import { formatDate } from '@/utils/format';

const escapeCsvValue = (value: string | number | null | undefined) => {
    const normalizedValue = value === null || value === undefined ? '' : String(value);

    return `"${normalizedValue.replace(/"/g, '""')}"`;
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

export const buildAttendanceCsv = (summary: AdminMonthlyAttendanceSummary, monthLabel: string) => {
    const headers = ['Mes', 'Alumno', 'Email', 'Coach', 'Total', 'Presentes', 'Ausentes', 'Tarde', 'Justificadas', 'Ultima asistencia'];
    const lines = summary.students.map((student) => ([
        monthLabel,
        student.name,
        student.email,
        student.coachName,
        student.totalCount,
        student.presentCount,
        student.absentCount,
        student.lateCount,
        student.excusedCount,
        formatDate(student.lastAttendanceAt),
    ].map(escapeCsvValue).join(';')));
    return [headers.map(escapeCsvValue).join(';'), ...lines].join('\n');
};
