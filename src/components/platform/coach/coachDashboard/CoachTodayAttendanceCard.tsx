import Image from 'next/image';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import type { AttendanceStatus, CoachTodayAttendanceSchedule } from '@/types/schema/classes';
import { getInitials } from '@/utils/strings';

type Props = {
    attendanceSchedules: CoachTodayAttendanceSchedule[];
    markedAttendanceCount: number;
    attendanceStudentsCount: number;
    isPending: boolean;
    pendingAttendanceKey: string | null;
    onAttendance: (scheduleId: string, studentId: string, status: AttendanceStatus) => void;
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
    PRESENT: 'Presente',
    ABSENT: 'Ausente',
    LATE: 'Tarde',
    EXCUSED: 'Justificado',
};

const attendanceOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export const CoachTodayAttendanceCard = ({ attendanceSchedules, markedAttendanceCount, attendanceStudentsCount, isPending, pendingAttendanceKey, onAttendance }: Props) => (
    <article className="coach-dashboard-card coach-attendance-card">
        <div className="coach-dashboard-card-header">
            <div>
                <span className="coach-dashboard-section-label">01 / SEGUIMIENTO DIARIO</span>
                <h2>Asistencia de hoy</h2>
                <p>{markedAttendanceCount}/{attendanceStudentsCount} alumnos con asistencia marcada.</p>
            </div>
            {attendanceStudentsCount > 0 && <strong className="coach-attendance-progress-count">{Math.round(markedAttendanceCount / attendanceStudentsCount * 100)}%</strong>}
        </div>

        {attendanceStudentsCount > 0 && <div className="coach-attendance-progress" role="progressbar" aria-label="Asistencia marcada" aria-valuenow={markedAttendanceCount} aria-valuemin={0} aria-valuemax={attendanceStudentsCount}><span style={{ width: `${markedAttendanceCount / attendanceStudentsCount * 100}%` }} /></div>}

        {attendanceSchedules.length > 0 ? (
            <div className="coach-attendance-schedules">
                {attendanceSchedules.map((schedule) => (
                    <div className="coach-attendance-schedule" key={schedule.scheduleId}>
                        <div className="coach-attendance-schedule-header">
                            <strong>{schedule.label}</strong>
                            <span>{schedule.students.length} {schedule.students.length === 1 ? 'alumno' : 'alumnos'}</span>
                        </div>

                        {schedule.students.length > 0 ? (
                            <div className="coach-attendance-students">
                                {schedule.students.map((student) => {
                                    const attendanceKey = `${schedule.scheduleId}-${student.studentId}`;
                                    const isSavingAttendance = isPending && pendingAttendanceKey === attendanceKey;

                                    return (
                                        <div className="coach-attendance-student" key={student.studentId}>
                                            <div className="coach-attendance-student-main">
                                                <div className="coach-student-avatar coach-attendance-avatar">
                                                    {student.imageUrl ? (
                                                        <Image src={student.imageUrl} alt={student.name} width={42} height={42} />
                                                    ) : (
                                                        <span>{getInitials(student.name)}</span>
                                                    )}
                                                </div>

                                                <div>
                                                    <strong>{student.name}</strong>
                                                    <span>{student.status ? attendanceStatusLabels[student.status] : 'Sin marcar'}</span>
                                                </div>
                                            </div>

                                            <div className="coach-attendance-actions">
                                                {attendanceOptions.map((status) => (
                                                    <button
                                                        key={status}
                                                        type="button"
                                                        className={student.status === status ? 'coach-attendance-action-active' : ''}
                                                        onClick={() => onAttendance(schedule.scheduleId, student.studentId, status)}
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
                                className="coach-dashboard-empty"
                                title="Sin alumnos en este turno"
                                description="Todavia no hay alumnos asignados a este horario."
                            />
                        )}
                    </div>
                ))}
            </div>
        ) : (
            <EmptyState
                compact
                className="coach-dashboard-empty"
                title="Sin turnos para hoy"
                description="No tenes turnos activos asignados para el dia de hoy."
            />
        )}
    </article>

);
