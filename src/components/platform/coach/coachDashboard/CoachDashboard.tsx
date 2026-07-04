'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useTransition, type ReactNode } from 'react';
import { FaCheck, FaExternalLinkAlt, FaPencilAlt, FaUndo } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { toast } from 'react-toastify';
import { markCoachStudentAttendance } from '@/app/actions/attendance.actions';
import {
    markCoachStudentCurrentMonthPaymentPaid,
    markCoachStudentCurrentMonthPaymentPending,
    updateCoachStudent,
} from '@/app/actions/coach.actions';
import { EmptyState } from '@/components/ui';
import type { AttendanceStatus, CoachTodayAttendanceSchedule } from '@/types/schema/classes';
import { getInitials } from '@/utils/strings';
import './_coachDashboard.scss';

export type CoachDashboardStudent = {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    imageUrl: string | null;
    routineExcelUrl: string | null;
    notes: string | null;
    membershipName: string | null;
    trainingDaysPerWeek: number | null;
    schedules: string[];
    monthlyPriceCents: number | null;
    paymentStatus: 'PAID' | 'PENDING' | 'NO_MEMBERSHIP';
    paymentAmountLabel: string;
    isLate: boolean;
    hasActiveMembership: boolean;
};

type Props = {
    coachName: string;
    students: CoachDashboardStudent[];
    attendanceSchedules: CoachTodayAttendanceSchedule[];
    accountActions?: ReactNode;
};

const getPaymentLabel = (status: CoachDashboardStudent['paymentStatus']) => {
    if (status === 'PAID') return 'Pagado';
    if (status === 'PENDING') return 'Pendiente';

    return 'Sin membresia';
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
    PRESENT: 'Presente',
    ABSENT: 'Ausente',
    LATE: 'Tarde',
    EXCUSED: 'Justificado',
};

const attendanceOptions: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

const scheduleDayOrder: Record<string, number> = {
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
    domingo: 7,
};

const getScheduleSortParts = (schedule: string) => {
    const [day = '', time = ''] = schedule.split(' ');
    const [hours = '0', minutes = '0'] = time.split(':');

    return {
        dayOrder: scheduleDayOrder[day.toLowerCase()] ?? 99,
        minutes: (Number(hours) || 0) * 60 + (Number(minutes) || 0),
    };
};

const getScheduleGroups = (students: CoachDashboardStudent[]) => {
    const scheduleMap = new Map<string, CoachDashboardStudent[]>();

    students.forEach((student) => {
        student.schedules.forEach((schedule) => {
            scheduleMap.set(schedule, [...(scheduleMap.get(schedule) ?? []), student]);
        });
    });

    return Array.from(scheduleMap.entries())
        .map(([schedule, scheduleStudents]) => ({
            schedule,
            students: scheduleStudents.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => {
            const first = getScheduleSortParts(a.schedule);
            const second = getScheduleSortParts(b.schedule);

            return first.dayOrder - second.dayOrder
                || first.minutes - second.minutes
                || a.schedule.localeCompare(b.schedule);
        });
};

export const CoachDashboard = ({ coachName, students, attendanceSchedules, accountActions }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<CoachDashboardStudent | null>(null);
    const [routineExcelUrl, setRoutineExcelUrl] = useState('');
    const [monthlyPricePesos, setMonthlyPricePesos] = useState('');
    const [notes, setNotes] = useState('');
    const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
    const [pendingAttendanceKey, setPendingAttendanceKey] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const studentsWithRoutine = students.filter((student) => student.routineExcelUrl).length;
    const paidStudents = students.filter((student) => student.paymentStatus === 'PAID').length;
    const normalizedQuery = query.trim().toLowerCase();
    const filteredStudents = normalizedQuery
        ? students.filter((student) => {
            const searchableValues = [
                student.name,
                student.email,
                student.phone,
                student.membershipName,
                ...student.schedules,
            ];

            return searchableValues.some((value) => value?.toLowerCase().includes(normalizedQuery));
        })
        : students;
    const scheduleGroups = getScheduleGroups(filteredStudents);
    const attendanceStudentsCount = attendanceSchedules.reduce((total, schedule) => total + schedule.students.length, 0);
    const markedAttendanceCount = attendanceSchedules.reduce((total, schedule) => (
        total + schedule.students.filter((student) => student.status).length
    ), 0);

    const openEditModal = (student: CoachDashboardStudent) => {
        setSelectedStudent(student);
        setRoutineExcelUrl(student.routineExcelUrl ?? '');
        setMonthlyPricePesos(student.monthlyPriceCents === null ? '' : String(student.monthlyPriceCents / 100));
        setNotes(student.notes ?? '');
    };

    const closeEditModal = () => {
        setSelectedStudent(null);
        setRoutineExcelUrl('');
        setMonthlyPricePesos('');
        setNotes('');
    };

    const handlePaymentToggle = (student: CoachDashboardStudent) => {
        setPendingStudentId(student.id);

        startTransition(async () => {
            const result = student.paymentStatus === 'PAID'
                ? await markCoachStudentCurrentMonthPaymentPending(student.id)
                : await markCoachStudentCurrentMonthPaymentPaid(student.id);

            if (result.ok) {
                toast.success(student.paymentStatus === 'PAID' ? 'Pago desmarcado' : 'Pago marcado como pagado');
                router.refresh();
            } else {
                toast.error(result.error);
            }

            setPendingStudentId(null);
        });
    };

    const handleAttendance = (
        scheduleId: string,
        studentId: string,
        status: AttendanceStatus
    ) => {
        const attendanceKey = `${scheduleId}-${studentId}`;
        setPendingAttendanceKey(attendanceKey);

        startTransition(async () => {
            const result = await markCoachStudentAttendance(scheduleId, studentId, status);

            if (result.ok) {
                toast.success('Asistencia actualizada');
                router.refresh();
            } else {
                toast.error(result.error);
            }

            setPendingAttendanceKey(null);
        });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedStudent) return;

        startTransition(async () => {
            const normalizedPrice = monthlyPricePesos.trim().replace(',', '.');
            const monthlyPriceCents = normalizedPrice
                ? Math.round(Number(normalizedPrice) * 100)
                : null;

            if (normalizedPrice && (!Number.isFinite(Number(normalizedPrice)) || Number(normalizedPrice) <= 0)) {
                toast.error('El precio mensual no es valido');
                return;
            }

            const result = await updateCoachStudent(selectedStudent.id, {
                routineExcelUrl,
                monthlyPriceCents,
                notes,
            });

            if (result.ok) {
                toast.success('Alumno actualizado');
                router.refresh();
                closeEditModal();
                return;
            }

            toast.error(result.error);
        });
    };

    return (
        <section className="coach-dashboard">
            <div className="coach-dashboard-header">
                <div>
                    <h1>Panel de coach</h1>
                    <p>Hola {coachName}. Estos son tus alumnos asignados y sus rutinas.</p>
                </div>
                {accountActions && (
                    <div className="coach-dashboard-account-actions">
                        {accountActions}
                    </div>
                )}
            </div>

            <div className="coach-dashboard-stats">
                <article>
                    <span>Alumnos</span>
                    <strong>{students.length}</strong>
                    <p>Asignados a tu seguimiento.</p>
                </article>

                <article>
                    <span>Rutinas cargadas</span>
                    <strong>{studentsWithRoutine}</strong>
                    <p>Alumnos con rutina disponible.</p>
                </article>

                <article>
                    <span>Pagos del mes</span>
                    <strong>{paidStudents}</strong>
                    <p>Alumnos marcados como pagados.</p>
                </article>
            </div>

            <article className="coach-dashboard-card coach-attendance-card">
                <div className="coach-dashboard-card-header">
                    <div>
                        <h2>Asistencia de hoy</h2>
                        <p>{markedAttendanceCount}/{attendanceStudentsCount} alumnos con asistencia marcada.</p>
                    </div>
                </div>

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

            <article className="coach-dashboard-card">
                <div className="coach-dashboard-card-header">
                    <div>
                        <h2>Mis clases</h2>
                        <p>Lista de alumnos asignados, rutinas y estado de pago del mes.</p>
                    </div>
                </div>

                <div className="coach-dashboard-search">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar alumno, email, plan u horario..."
                        aria-label="Buscar alumno"
                    />
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="coach-students-list">
                        {filteredStudents.map((student) => {
                            const isSavingPayment = isPending && pendingStudentId === student.id;

                            return (
                                <div className="coach-student-item" key={student.id}>
                                    <div className="coach-student-main">
                                        <div className="coach-student-avatar">
                                            {student.imageUrl ? (
                                                <Image src={student.imageUrl} alt={student.name} width={48} height={48} />
                                            ) : (
                                                <span>{getInitials(student.name)}</span>
                                            )}
                                        </div>

                                        <div>
                                            <strong>{student.name}</strong>
                                            <span>{student.email}</span>
                                            <small>{student.phone || 'Sin telefono'}</small>
                                        </div>
                                    </div>

                                    <div className="coach-student-plan">
                                        <strong>{student.membershipName ?? 'Sin membresia'}</strong>
                                        <span>
                                            {student.trainingDaysPerWeek
                                                ? `${student.trainingDaysPerWeek} dias/semana`
                                                : 'Sin plan activo'}
                                        </span>
                                        {student.schedules.length > 0 && (
                                            <div className="coach-student-schedules">
                                                {student.schedules.map((schedule) => (
                                                    <small key={schedule}>{schedule}</small>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="coach-student-payment">
                                        <span className={`coach-payment-status coach-payment-status-${student.paymentStatus.toLowerCase().replace('_', '-')}`}>
                                            {getPaymentLabel(student.paymentStatus)}
                                        </span>
                                        <small>{student.paymentAmountLabel}</small>
                                        {student.isLate && student.paymentStatus === 'PENDING' && (
                                            <em>Fuera de termino</em>
                                        )}
                                    </div>

                                    <div className="coach-student-routine">
                                        {student.routineExcelUrl ? (
                                            <a href={student.routineExcelUrl} target="_blank" rel="noreferrer">
                                                Ver rutina
                                                <FaExternalLinkAlt />
                                            </a>
                                        ) : (
                                            <span>Sin rutina</span>
                                        )}
                                    </div>

                                    <div className="coach-student-actions">
                                        <button type="button" onClick={() => openEditModal(student)}>
                                            <FaPencilAlt />
                                            Editar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handlePaymentToggle(student)}
                                            disabled={!student.hasActiveMembership || isSavingPayment}
                                        >
                                            {student.paymentStatus === 'PAID' ? <FaUndo /> : <FaCheck />}
                                            {isSavingPayment
                                                ? 'Guardando'
                                                : student.paymentStatus === 'PAID'
                                                    ? 'Desmarcar'
                                                    : 'Marcar pago'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        compact
                        className="coach-dashboard-empty"
                        title={students.length > 0 ? 'Sin resultados' : 'Sin alumnos asignados'}
                        description={students.length > 0
                            ? 'No hay alumnos que coincidan con la busqueda.'
                            : 'Todavia no tenes alumnos vinculados a tu cuenta.'}
                    />
                )}
            </article>

            <article className="coach-dashboard-card">
                <div className="coach-dashboard-card-header">
                    <div>
                        <h2>Alumnos por horario</h2>
                        <p>Resumen de tus turnos y los alumnos asignados a cada uno.</p>
                    </div>
                </div>

                {scheduleGroups.length > 0 ? (
                    <div className="coach-schedule-groups">
                        {scheduleGroups.map((group) => (
                            <div className="coach-schedule-group" key={group.schedule}>
                                <div className="coach-schedule-group-header">
                                    <strong>{group.schedule}</strong>
                                    <span>{group.students.length} {group.students.length === 1 ? 'alumno' : 'alumnos'}</span>
                                </div>

                                <div className="coach-schedule-students">
                                    {group.students.map((student) => (
                                        <div className="coach-schedule-student" key={student.id}>
                                            <span>{student.name}</span>
                                            {student.routineExcelUrl ? (
                                                <a href={student.routineExcelUrl} target="_blank" rel="noreferrer">
                                                    Rutina
                                                    <FaExternalLinkAlt />
                                                </a>
                                            ) : (
                                                <small>Sin rutina</small>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        compact
                        className="coach-dashboard-empty"
                        title="Sin horarios asignados"
                        description="Todavia no hay alumnos con turnos elegidos."
                    />
                )}
            </article>

            {selectedStudent && (
                <div className="coach-student-modal-container">
                    <div className="coach-student-modal">
                        <div className="coach-student-modal-header">
                            <div>
                                <h2>Editar {selectedStudent.name}</h2>
                                <p>Rutina y notas de seguimiento.</p>
                            </div>

                            <button type="button" onClick={closeEditModal} aria-label="Cerrar">
                                <IoMdClose />
                            </button>
                        </div>

                        <form className="coach-student-form" onSubmit={handleSubmit}>
                            <div className="coach-student-form-group">
                                <label htmlFor="coach-student-routine">Rutina / Excel</label>
                                <input
                                    id="coach-student-routine"
                                    value={routineExcelUrl}
                                    onChange={(event) => setRoutineExcelUrl(event.target.value)}
                                    placeholder="https://docs.google.com/spreadsheets/..."
                                />
                            </div>

                            <div className="coach-student-form-group">
                                <label htmlFor="coach-student-price">Precio mensual</label>
                                <input
                                    id="coach-student-price"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={monthlyPricePesos}
                                    onChange={(event) => setMonthlyPricePesos(event.target.value)}
                                    placeholder="55000"
                                    disabled={!selectedStudent.hasActiveMembership}
                                />
                            </div>

                            <div className="coach-student-form-group">
                                <label htmlFor="coach-student-notes">Notas</label>
                                <textarea
                                    id="coach-student-notes"
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Observaciones del seguimiento"
                                />
                            </div>

                            <div className="coach-student-form-actions">
                                <button type="button" onClick={closeEditModal} disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending}>
                                    {isPending ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};
