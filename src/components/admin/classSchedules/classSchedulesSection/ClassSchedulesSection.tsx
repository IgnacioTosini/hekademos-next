'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteWeeklyClassSchedule } from '@/app/actions/class.actions';
import { EmptyState } from '@/components/ui';
import type { DayOfWeek, WeeklyClassScheduleWithRelations } from '@/types/schema/classes';
import type { UserWithRelations } from '@/types/schema/users';
import { addMinutesToTime, dayLabels, dayOrder } from '@/utils/schedule';
import { ClassScheduleModal } from '../classScheduleModal/ClassScheduleModal';
import './_classSchedulesSection.scss';

type Props = {
    schedules: WeeklyClassScheduleWithRelations[];
    coaches: UserWithRelations[];
};

const getCoachName = (schedule: WeeklyClassScheduleWithRelations) => (
    schedule.coach?.user?.name || schedule.coach?.user?.email || 'Sin asignar'
);

const getCoachOptionName = (coach: UserWithRelations) => coach.name || coach.email;

const getCapacityLabel = (schedule: WeeklyClassScheduleWithRelations) => {
    const occupiedSpots = schedule.occupiedSpots ?? schedule.studentAssignments?.length ?? 0;

    if (schedule.capacity === null) return `${occupiedSpots} ocupados · sin limite`;

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - occupiedSpots, 0);

    return `${availableSpots} libres · ${occupiedSpots}/${schedule.capacity}`;
};

export const ClassSchedulesSection = ({ schedules, coaches }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [selectedDay, setSelectedDay] = useState<'all' | DayOfWeek>('all');
    const [selectedCoachId, setSelectedCoachId] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<WeeklyClassScheduleWithRelations | null>(null);
    const coachOptions = useMemo(() => (
        coaches
            .filter((coach) => coach.coach?.id)
            .map((coach) => ({
                id: coach.coach!.id,
                name: getCoachOptionName(coach),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
    ), [coaches]);

    const filteredSchedules = useMemo(() => {
        const search = query.trim().toLowerCase();

        return schedules.filter((schedule) => {
            if (selectedDay !== 'all' && schedule.dayOfWeek !== selectedDay) return false;
            if (selectedCoachId === 'unassigned' && schedule.coachId) return false;
            if (selectedCoachId !== 'all' && selectedCoachId !== 'unassigned' && schedule.coachId !== selectedCoachId) return false;
            if (!search) return true;

            const values = [
                dayLabels[schedule.dayOfWeek],
                schedule.startTime,
                getCoachName(schedule),
                schedule.notes,
                schedule.isActive ? 'activo' : 'inactivo',
            ];

            return values.some((value) => value?.toLowerCase().includes(search));
        });
    }, [query, schedules, selectedCoachId, selectedDay]);

    const groupedSchedules = dayOrder
        .map((day) => ({
            day,
            schedules: filteredSchedules.filter((schedule) => schedule.dayOfWeek === day),
        }))
        .filter((group) => group.schedules.length > 0);

    const openCreate = () => {
        setSelectedSchedule(null);
        setIsModalOpen(true);
    };

    const openEdit = (schedule: WeeklyClassScheduleWithRelations) => {
        setSelectedSchedule(schedule);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedSchedule(null);
        setIsModalOpen(false);
    };

    const handleDelete = async (schedule: WeeklyClassScheduleWithRelations) => {
        const confirmed = window.confirm(`Eliminar o desactivar el turno de ${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}?`);

        if (!confirmed) return;

        const result = await deleteWeeklyClassSchedule(schedule.id);

        if (result.ok) {
            toast.success(result.data?.deactivated ? 'Turno desactivado' : 'Turno eliminado');
            router.refresh();
            return;
        }

        toast.error(result.error);
    };

    return (
        <section className="class-schedules-section">
            <div className="class-schedules-header">
                <div className="class-schedules-header-text">
                    <h1>Turnos</h1>
                    <p>{schedules.length} {schedules.length === 1 ? 'turno configurado' : 'turnos configurados'}</p>
                </div>

                <button type="button" onClick={openCreate}>+ Nuevo turno</button>
            </div>

            <ClassScheduleModal
                isOpen={isModalOpen}
                schedule={selectedSchedule}
                coaches={coaches}
                onClose={closeModal}
            />

            <div className="class-schedules-table-wrapper">
                <div className="class-schedules-toolbar">
                    <select
                        value={selectedDay}
                        onChange={(event) => setSelectedDay(event.target.value as 'all' | DayOfWeek)}
                        aria-label="Filtrar por dia"
                    >
                        <option value="all">Todos los dias</option>
                        {dayOrder.map((day) => (
                            <option key={day} value={day}>{dayLabels[day]}</option>
                        ))}
                    </select>

                    <select
                        value={selectedCoachId}
                        onChange={(event) => setSelectedCoachId(event.target.value)}
                        aria-label="Filtrar por coach"
                    >
                        <option value="all">Todos los coaches</option>
                        <option value="unassigned">Sin asignar</option>
                        {coachOptions.map((coach) => (
                            <option key={coach.id} value={coach.id}>{coach.name}</option>
                        ))}
                    </select>

                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar turno, coach o nota..."
                        aria-label="Buscar turno"
                    />
                </div>

                {groupedSchedules.map((group) => (
                    <div className="class-schedules-day-group" key={group.day}>
                        <div className="class-schedules-day-title">
                            <h2>{dayLabels[group.day]}</h2>
                            <span>{group.schedules.length} {group.schedules.length === 1 ? 'turno' : 'turnos'}</span>
                        </div>

                        <table className="class-schedules-table">
                            <thead>
                                <tr>
                                    <th>Horario</th>
                                    <th>Coach</th>
                                    <th>Cupos</th>
                                    <th>Estado</th>
                                    <th>Notas</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {group.schedules.map((schedule) => {
                                    const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);

                                    return (
                                        <tr key={schedule.id}>
                                            <td data-label="Horario">
                                                <div className="class-schedule-time">
                                                    <strong>{schedule.startTime}{endsAt ? ` a ${endsAt}` : ''}</strong>
                                                    <span>{schedule.durationMinutes} min</span>
                                                </div>
                                            </td>
                                            <td data-label="Coach">{getCoachName(schedule)}</td>
                                            <td data-label="Cupos">{getCapacityLabel(schedule)}</td>
                                            <td data-label="Estado">
                                                <span className={`class-schedule-status class-schedule-status-${schedule.isActive ? 'active' : 'inactive'}`}>
                                                    {schedule.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td data-label="Notas">{schedule.notes || '-'}</td>
                                            <td data-label="Acciones">
                                                <div className="class-schedule-actions">
                                                    <button type="button" onClick={() => openEdit(schedule)} aria-label="Editar turno">
                                                        <GoPencil />
                                                    </button>
                                                    <button type="button" onClick={() => handleDelete(schedule)} aria-label="Eliminar turno">
                                                        <FaRegTrashAlt />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}

                {filteredSchedules.length === 0 && (
                    <EmptyState
                        compact
                        title={schedules.length > 0 ? 'Sin resultados' : 'Sin turnos'}
                        description={schedules.length > 0
                            ? 'No hay turnos que coincidan con los filtros.'
                            : 'Todavia no hay turnos configurados.'}
                    />
                )}
            </div>
        </section>
    );
};
