'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useTransition, type ReactNode } from 'react';
import { FaCheck, FaExternalLinkAlt, FaPencilAlt, FaSearch, FaUndo } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { toast } from 'react-toastify';
import { markCoachStudentAttendance } from '@/app/actions/attendance.actions';
import {
    markCoachStudentCurrentMonthPaymentPaid,
    markCoachStudentCurrentMonthPaymentPending,
    updateCoachStudent,
} from '@/app/actions/coach.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import { usePagination } from '@/hooks/usePagination';
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
    const [category = '', dayAndTime = schedule] = schedule.split(' · ');
    const match = dayAndTime.match(/^(.+?)\s+(\d{1,2}:\d{2})\s+a\s+(\d{1,2}:\d{2})$/i);
    const day = match?.[1] ?? 'Otros';
    const start = match?.[2] ?? dayAndTime;
    const end = match?.[3] ?? '';
    const [hours = '0', minutes = '0'] = start.split(':');

    return {
        category: category || 'Clase',
        day,
        time: end ? `${start} a ${end}` : dayAndTime,
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
            ...getScheduleSortParts(schedule),
            students: scheduleStudents.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => {
            return a.dayOrder - b.dayOrder
                || a.minutes - b.minutes
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
    const studentPages = usePagination(filteredStudents, 8, normalizedQuery);
    const scheduleGroups = getScheduleGroups(filteredStudents);
    const scheduleDays = Array.from(scheduleGroups.reduce((days, group) => {
        const turns = days.get(group.day) ?? [];
        turns.push(group);
        days.set(group.day, turns);
        return days;
    }, new Map<string, typeof scheduleGroups>()).entries());
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
                    <span className="coach-dashboard-eyebrow">TU ESPACIO DE TRABAJO</span>
                    <h1>Panel de coach</h1>
                    <p>Hola, {coachName}. Seguí la asistencia de hoy y el progreso de tus alumnos desde un solo lugar.</p>
                </div>
                {accountActions && (
                    <div className="coach-dashboard-account-actions">
                        {accountActions}
                    </div>
                )}
            </div>

            <div className="coach-dashboard-stats">
                <article className="coach-stat-students">
                    <span>Alumnos</span>
                    <strong>{students.length}</strong>
                    <p>Asignados a tu seguimiento.</p>
                </article>

                <article className="coach-stat-routines">
                    <span>Rutinas cargadas</span>
                    <strong>{studentsWithRoutine}</strong>
                    <p>Alumnos con rutina disponible.</p>
                </article>

                <article className="coach-stat-payments">
                    <span>Pagos del mes</span>
                    <strong>{paidStudents}</strong>
                    <p>Alumnos marcados como pagados.</p>
                </article>
            </div>

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
                        <span className="coach-dashboard-section-label">02 / ALUMNOS</span>
                        <h2>Mis clases</h2>
                        <p>Lista de alumnos asignados, rutinas y estado de pago del mes.</p>
                    </div>
                    <span className="coach-dashboard-count">{filteredStudents.length} {filteredStudents.length === 1 ? 'alumno' : 'alumnos'}</span>
                </div>

                <div className="coach-dashboard-search">
                    <FaSearch aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar alumno, email, plan u horario..."
                        aria-label="Buscar alumno"
                    />
                    {query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">Limpiar</button>}
                </div>

                {filteredStudents.length > 0 ? (
                    <div className="coach-students-list">
                        {studentPages.pageItems.map((student) => {
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
                                        <span className="coach-student-meta-label">Plan y horarios</span>
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
                                        <span className="coach-student-meta-label">Estado del mes</span>
                                        <span className={`coach-payment-status coach-payment-status-${student.paymentStatus.toLowerCase().replace('_', '-')}`}>
                                            {getPaymentLabel(student.paymentStatus)}
                                        </span>
                                        <small>{student.paymentAmountLabel}</small>
                                        {student.isLate && student.paymentStatus === 'PENDING' && (
                                            <em>Fuera de termino</em>
                                        )}
                                    </div>

                                    <div className="coach-student-footer">
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
                <Pagination page={studentPages.page} pageSize={studentPages.pageSize} totalItems={filteredStudents.length} onPageChange={studentPages.setPage} label="alumnos" />
            </article>

            <article className="coach-dashboard-card">
                <div className="coach-dashboard-card-header">
                    <div>
                        <span className="coach-dashboard-section-label">03 / ORGANIZACIÓN</span>
                        <h2>Tu semana de clases</h2>
                        <p>Horarios, alumnos y rutinas organizados por día.</p>
                    </div>
                    <span className="coach-dashboard-count">{scheduleGroups.length} {scheduleGroups.length === 1 ? 'turno' : 'turnos'}</span>
                </div>

                {scheduleGroups.length > 0 ? (
                    <div className="coach-schedule-days">
                        {scheduleDays.map(([day, turns]) => (
                            <section className="coach-schedule-day" key={day} aria-label={`Clases del ${day}`}>
                                <div className="coach-schedule-day-header">
                                    <h3>{day}</h3>
                                    <span>{turns.length} {turns.length === 1 ? 'turno' : 'turnos'}</span>
                                </div>
                                <div className="coach-schedule-day-turns">
                                    {turns.map((group) => (
                                        <div className="coach-schedule-turn" key={group.schedule}>
                                            <div className="coach-schedule-turn-header">
                                                <div>
                                                    <strong>{group.time}</strong>
                                                    <span>{group.category}</span>
                                                </div>
                                                <small>{group.students.length} {group.students.length === 1 ? 'alumno' : 'alumnos'}</small>
                                            </div>
                                            <div className="coach-schedule-students">
                                                {group.students.map((student) => (
                                                    <div className="coach-schedule-student" key={student.id}>
                                                        <span>{student.name}</span>
                                                        {student.routineExcelUrl ? (
                                                            <a href={student.routineExcelUrl} target="_blank" rel="noreferrer" aria-label={`Ver rutina de ${student.name}`}>
                                                                Rutina <FaExternalLinkAlt />
                                                            </a>
                                                        ) : <small>Sin rutina</small>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
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
