import Image from 'next/image';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import type { AdminAttendanceSchedule, AttendanceStatus } from '@/types/schema/classes';
import { getInitials } from '@/utils/strings';

type Props = {
    schedules: AdminAttendanceSchedule[];
    isPending: boolean;
    pendingAttendanceKey: string | null;
    pendingAttendanceStatus: AttendanceStatus | null;
    onAttendance: (scheduleId: string, studentId: string, status: AttendanceStatus) => void;
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
    PRESENT: 'Presente',
    ABSENT: 'Ausente',
    LATE: 'Tarde',
    EXCUSED: 'Justificado',
};

const attendanceOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

export const AttendanceScheduleList = ({ schedules, isPending, pendingAttendanceKey, pendingAttendanceStatus, onAttendance }: Props) => (
    <>
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
                                    <div className={`attendance-student${!student.status ? ' attendance-student-unmarked' : ''}${isSavingAttendance ? ' attendance-student-saving' : ''}`} key={student.studentId} aria-busy={isSavingAttendance}>
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
                                                <span>{isSavingAttendance ? 'Guardando asistencia...' : student.status ? attendanceStatusLabels[student.status] : 'Sin marcar'}</span>
                                            </div>
                                        </div>

                                        <div className="attendance-actions">
                                            {attendanceOptions.map((status) => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    className={`attendance-action-${status.toLowerCase()}${(isSavingAttendance ? pendingAttendanceStatus === status : student.status === status) ? ' attendance-action-active' : ''}`}
                                                    onClick={() => onAttendance(schedule.scheduleId, student.studentId, status)}
                                                    disabled={isPending}
                                                >
                                                    {(isSavingAttendance ? pendingAttendanceStatus === status : student.status === status) ? '✓ ' : ''}{attendanceStatusLabels[status]}
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
    </>
);
