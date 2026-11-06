import { FaDownload } from 'react-icons/fa';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import type { AdminMonthlyAttendanceSummary } from '@/types/schema/classes';
import { formatDate } from '@/utils/format';

type Props = {
    monthlySummary: AdminMonthlyAttendanceSummary | null;
    monthLabel: string;
    isExporting: boolean;
    onExport: () => void;
    onPageChange: (page: number) => void;
};

export const AttendanceMonthlySummary = ({ monthlySummary, monthLabel, isExporting, onExport, onPageChange }: Props) => (
    <article className="attendance-monthly-summary">
        <div className="attendance-monthly-header">
            <div>
                <h2>Resumen mensual</h2>
                <p>{monthLabel} · {monthlySummary?.totalCount ?? 0} asistencias registradas</p>
            </div>

            <button type="button" onClick={onExport} disabled={isExporting}>
                <FaDownload />
                {isExporting ? 'Preparando CSV...' : 'Exportar CSV'}
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

        {monthlySummary && monthlySummary.studentCount > 0 ? (
            <>
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
            <Pagination page={monthlySummary.page} pageSize={15} totalItems={monthlySummary.studentCount} onPageChange={(page) => onPageChange(page)} label="alumnos" />
            </>
        ) : (
            <EmptyState
                compact
                className="attendance-empty"
                title="Sin asistencias registradas"
                description="No hay registros para el mes y coach seleccionados."
            />
        )}
    </article>

);
