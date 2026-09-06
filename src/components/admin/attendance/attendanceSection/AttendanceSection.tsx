'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { markAdminStudentAttendance } from '@/app/actions/attendance.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import type { AdminAttendanceSchedule, AdminMonthlyAttendanceSummary, AttendanceStatus } from '@/types/schema/classes';
import type { UserWithRelations } from '@/types/schema/users';
import { formatDate } from '@/utils/format';
import { getInitials } from '@/utils/strings';
import './_attendanceSection.scss';

type Props = {
    schedules: AdminAttendanceSchedule[];
    coaches: UserWithRelations[];
    selectedDate: string;
    selectedCoachId: string;
    selectedMonth: number;
    selectedYear: number;
    monthlySummary: AdminMonthlyAttendanceSummary | null;
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
    PRESENT: 'Presente',
    ABSENT: 'Ausente',
    LATE: 'Tarde',
    EXCUSED: 'Justificado',
};

const attendanceOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

const getCoachName = (coach: UserWithRelations) => coach.name || coach.email;

const getDateLabel = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = year && month && day ? new Date(year, month - 1, day) : new Date();

    return new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(parsedDate);
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

export const AttendanceSection = ({
    schedules,
    coaches,
    selectedDate,
    selectedCoachId,
    selectedMonth,
    selectedYear,
    monthlySummary,
}: Props) => {
    const router = useRouter();
    const [pendingAttendanceKey, setPendingAttendanceKey] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const coachOptions = useMemo(() => (
        coaches
            .filter((coach) => coach.coach?.id)
            .map((coach) => ({
                id: coach.coach!.id,
                name: getCoachName(coach),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
    ), [coaches]);
    const totalStudents = schedules.reduce((total, schedule) => total + schedule.students.length, 0);
    const markedStudents = schedules.reduce((total, schedule) => (
        total + schedule.students.filter((student) => student.status).length
    ), 0);
    const yearOptions = useMemo(() => getYearOptions(selectedYear), [selectedYear]);
    const monthLabel = new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(selectedYear, selectedMonth - 1, 1));

    const updateFilters = (date: string, coachId: string, month = selectedMonth, year = selectedYear) => {
        const params = new URLSearchParams();

        if (date) params.set('date', date);
        if (coachId && coachId !== 'all') params.set('coachId', coachId);
        params.set('month', String(month));
        params.set('year', String(year));

        router.push(`/admin/asistencia?${params.toString()}`);
    };

    const handleExportMonthlySummary = () => {
        if (!monthlySummary || monthlySummary.students.length === 0) {
            toast.info('No hay asistencias para exportar');
            return;
        }

        const headers = ['Mes', 'Alumno', 'Email', 'Coach', 'Total', 'Presentes', 'Ausentes', 'Tarde', 'Justificadas', 'Ultima asistencia'];
        const lines = monthlySummary.students.map((student) => ([
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
        const csv = [headers.map(escapeCsvValue).join(';'), ...lines].join('\n');
        const filename = `asistencia-hekademos-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;

        downloadCsv(csv, filename);
        toast.success('Archivo CSV generado');
    };

    const handleAttendance = (
        scheduleId: string,
        studentId: string,
        status: AttendanceStatus
    ) => {
        const attendanceKey = `${scheduleId}-${studentId}`;
        setPendingAttendanceKey(attendanceKey);

        startTransition(async () => {
            const result = await markAdminStudentAttendance(scheduleId, studentId, status, selectedDate);

            if (result.ok) {
                toast.success('Asistencia actualizada');
                router.refresh();
            } else {
                toast.error(result.error);
            }

            setPendingAttendanceKey(null);
        });
    };

    return (
        <section className="attendance-section">
            <div className="attendance-header">
                <div className="attendance-header-text">
                    <h1>Asistencia</h1>
                    <p>{getDateLabel(selectedDate)} · {markedStudents}/{totalStudents} alumnos con asistencia marcada</p>
                </div>
            </div>

            <div className="attendance-toolbar">
                <div className="attendance-toolbar-group">
                    <label htmlFor="attendance-date">Fecha</label>
                    <input
                        id="attendance-date"
                        type="date"
                        value={selectedDate}
                        onChange={(event) => updateFilters(event.target.value, selectedCoachId)}
                    />
                </div>

                <div className="attendance-toolbar-group">
                    <label htmlFor="attendance-coach">Coach</label>
                    <select
                        id="attendance-coach"
                        value={selectedCoachId}
                        onChange={(event) => updateFilters(selectedDate, event.target.value)}
                    >
                        <option value="all">Todos los coaches</option>
                        {coachOptions.map((coach) => (
                            <option key={coach.id} value={coach.id}>{coach.name}</option>
                        ))}
                    </select>
                </div>

                <div className="attendance-toolbar-group">
                    <label htmlFor="attendance-month">Mes resumen</label>
                    <select
                        id="attendance-month"
                        value={selectedMonth}
                        onChange={(event) => updateFilters(selectedDate, selectedCoachId, Number(event.target.value), selectedYear)}
                    >
                        {monthOptions.map((month) => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                    </select>
                </div>

                <div className="attendance-toolbar-group">
                    <label htmlFor="attendance-year">Año resumen</label>
                    <select
                        id="attendance-year"
                        value={selectedYear}
                        onChange={(event) => updateFilters(selectedDate, selectedCoachId, selectedMonth, Number(event.target.value))}
                    >
                        {yearOptions.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <article className="attendance-monthly-summary">
                <div className="attendance-monthly-header">
                    <div>
                        <h2>Resumen mensual</h2>
                        <p>{monthLabel} · {monthlySummary?.totalCount ?? 0} asistencias registradas</p>
                    </div>

                    <button type="button" onClick={handleExportMonthlySummary}>
                        <FaDownload />
                        Exportar CSV
                    </button>
                </div>

                <div className="attendance-monthly-kpis">
                    <div>
                        <span>Presentes</span>
                        <strong>{monthlySummary?.presentCount ?? 0}</strong>
                    </div>
                    <div>
                        <span>Ausentes</span>
                        <strong>{monthlySummary?.absentCount ?? 0}</strong>
                    </div>
                    <div>
                        <span>Tarde</span>
                        <strong>{monthlySummary?.lateCount ?? 0}</strong>
                    </div>
                    <div>
                        <span>Justificadas</span>
                        <strong>{monthlySummary?.excusedCount ?? 0}</strong>
                    </div>
                </div>

                {monthlySummary && monthlySummary.students.length > 0 ? (
                    <div className="attendance-monthly-table-wrapper">
                        <table className="attendance-monthly-table">
                            <thead>
                                <tr>
                                    <th>Alumno</th>
                                    <th>Coach</th>
                                    <th>Total</th>
                                    <th>Presentes</th>
                                    <th>Ausentes</th>
                                    <th>Tarde</th>
                                    <th>Justificadas</th>
                                    <th>Ultima</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlySummary.students.map((student) => (
                                    <tr key={student.studentId}>
                                        <td data-label="Alumno">
                                            <strong>{student.name}</strong>
                                            <span>{student.email}</span>
                                        </td>
                                        <td data-label="Coach">{student.coachName}</td>
                                        <td data-label="Total">{student.totalCount}</td>
                                        <td data-label="Presentes">{student.presentCount}</td>
                                        <td data-label="Ausentes">{student.absentCount}</td>
                                        <td data-label="Tarde">{student.lateCount}</td>
                                        <td data-label="Justificadas">{student.excusedCount}</td>
                                        <td data-label="Ultima">{formatDate(student.lastAttendanceAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState
                        compact
                        className="attendance-empty"
                        title="Sin asistencias registradas"
                        description="No hay registros para el mes y coach seleccionados."
                    />
                )}
            </article>

            {schedules.length > 0 ? (
                <div className="attendance-schedules">
                    {schedules.map((schedule) => (
                        <article className="attendance-schedule" key={schedule.scheduleId}>
                            <div className="attendance-schedule-header">
                                <div>
                                    <h2>{schedule.label}</h2>
                                    <p>{schedule.coachName}</p>
                                </div>
                                <span>{schedule.students.length} {schedule.students.length === 1 ? 'alumno' : 'alumnos'}</span>
                            </div>

                            {schedule.students.length > 0 ? (
                                <div className="attendance-students">
                                    {schedule.students.map((student) => {
                                        const attendanceKey = `${schedule.scheduleId}-${student.studentId}`;
                                        const isSavingAttendance = isPending && pendingAttendanceKey === attendanceKey;

                                        return (
                                            <div className="attendance-student" key={student.studentId}>
                                                <div className="attendance-student-main">
                                                    <div className="attendance-avatar">
                                                        {student.imageUrl ? (
                                                            <Image src={student.imageUrl} alt={student.name} width={44} height={44} />
                                                        ) : (
                                                            <span>{getInitials(student.name)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <strong>{student.name}</strong>
                                                        <span>{student.status ? attendanceStatusLabels[student.status] : 'Sin marcar'}</span>
                                                    </div>
                                                </div>

                                                <div className="attendance-actions">
                                                    {attendanceOptions.map((status) => (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            className={student.status === status ? 'attendance-action-active' : ''}
                                                            onClick={() => handleAttendance(schedule.scheduleId, student.studentId, status)}
                                                            disabled={isSavingAttendance}
                                                        >
                                                            {isSavingAttendance && student.status === status ? '...' : attendanceStatusLabels[status]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    compact
                                    className="attendance-empty"
                                    title="Sin alumnos en este turno"
                                    description="Todavia no hay alumnos asignados a este horario."
                                />
                            )}
                        </article>
                    ))}
                </div>
            ) : (
                <EmptyState
                    className="attendance-empty attendance-empty-page"
                    title="Sin turnos para esta fecha"
                    description="No hay turnos activos que coincidan con los filtros seleccionados."
                />
            )}
        </section>
    );
};
