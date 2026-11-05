'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteWeeklyClassSchedule, type AdminWeeklyClassSchedule } from '@/app/actions/class.actions';
import type { AdminCoachOption } from '@/app/actions/coach.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import { usePagination } from '@/hooks/usePagination';
import type { DayOfWeek, WeeklyClassScheduleWithRelations } from '@/types/schema/classes';
import type { ClassCategoryOption } from '@/types/schema/common';
import { getClassCategoryLabel } from '@/utils/class-category';
import { addMinutesToTime, dayLabels, dayOrder } from '@/utils/schedule';
import './_classSchedulesSection.scss';

const ClassScheduleModal = dynamic(() => import('../classScheduleModal/ClassScheduleModal').then((module) => module.ClassScheduleModal));

type Props = {
    schedules: AdminWeeklyClassSchedule[];
    coaches: AdminCoachOption[];
    categories: ClassCategoryOption[];
};

const getCoachName = (schedule: AdminWeeklyClassSchedule) => schedule.coachName;

const getCapacityLabel = (schedule: WeeklyClassScheduleWithRelations) => {
    const occupiedSpots = schedule.occupiedSpots ?? schedule.studentAssignments?.length ?? 0;

    if (schedule.capacity === null) return `${occupiedSpots} ocupados · sin limite`;

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - occupiedSpots, 0);

    return `${availableSpots} libres · ${occupiedSpots}/${schedule.capacity}`;
};

export const ClassSchedulesSection = ({ schedules, coaches, categories }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [selectedDay, setSelectedDay] = useState<'all' | DayOfWeek>('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedCoachId, setSelectedCoachId] = useState('all');
    const groupsRef = useRef<HTMLDivElement>(null);
    const filtersInitialized = useRef(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<WeeklyClassScheduleWithRelations | null>(null);
    const [scheduleToDelete, setScheduleToDelete] = useState<WeeklyClassScheduleWithRelations | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const cancelDeleteRef = useRef<HTMLButtonElement>(null);
    const coachOptions = useMemo(() => (
        [...coaches].sort((a, b) => a.name.localeCompare(b.name))
    ), [coaches]);

    const filteredSchedules = useMemo(() => {
        const search = query.trim().toLowerCase();

        return schedules.filter((schedule) => {
            if (selectedDay !== 'all' && schedule.dayOfWeek !== selectedDay) return false;
            if (selectedCategory !== 'all' && getClassCategoryLabel(schedule.classCategory) !== selectedCategory) return false;
            if (selectedCoachId === 'unassigned' && schedule.coachId) return false;
            if (selectedCoachId !== 'all' && selectedCoachId !== 'unassigned' && schedule.coachId !== selectedCoachId) return false;
            if (!search) return true;

            const values = [
                dayLabels[schedule.dayOfWeek],
                getClassCategoryLabel(schedule.classCategory),
                schedule.startTime,
                getCoachName(schedule),
                schedule.notes,
                schedule.isActive ? 'activo' : 'inactivo',
            ];

            return values.some((value) => value?.toLowerCase().includes(search));
        });
    }, [query, schedules, selectedCategory, selectedCoachId, selectedDay]);
    const sortedSchedules = useMemo(() => [...filteredSchedules].sort((first, second) => (
        dayOrder.indexOf(first.dayOfWeek) - dayOrder.indexOf(second.dayOfWeek)
        || first.startTime.localeCompare(second.startTime)
    )), [filteredSchedules]);
    const schedulePages = usePagination(sortedSchedules, 20, `${query}|${selectedDay}|${selectedCategory}|${selectedCoachId}`);

    const groupedSchedules = dayOrder
        .map((day) => ({
            day,
            schedules: schedulePages.pageItems.filter((schedule) => schedule.dayOfWeek === day),
        }))
        .filter((group) => group.schedules.length > 0);

    useEffect(() => {
        if (!filtersInitialized.current) { filtersInitialized.current = true; return; }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled || !groupsRef.current) return;
            const groups = groupsRef.current.querySelectorAll('.class-schedules-day-group');
            const context = gsap.context(() => {
                gsap.fromTo(groups, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .34, stagger: .06, ease: 'power2.out', clearProps: 'all' });
            }, groupsRef);
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [selectedDay, selectedCategory, selectedCoachId]);

    useEffect(() => {
        if (!scheduleToDelete) return;
        cancelDeleteRef.current?.focus();
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) setScheduleToDelete(null);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [scheduleToDelete, isDeleting]);

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

    const handleDelete = async () => {
        if (!scheduleToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            const result = await deleteWeeklyClassSchedule(scheduleToDelete.id);
            if (result.ok) {
                toast.success(result.data?.deactivated ? 'Turno desactivado' : 'Turno eliminado');
                setScheduleToDelete(null);
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('No se pudo modificar el turno. Intentá de nuevo.');
        } finally {
            setIsDeleting(false);
        }
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

            {isModalOpen && <ClassScheduleModal
                isOpen={isModalOpen}
                schedule={selectedSchedule}
                coaches={coaches}
                categories={categories}
                onClose={closeModal}
            />}
            {scheduleToDelete && (
                <div className="schedule-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setScheduleToDelete(null); }}>
                    <div className="schedule-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="schedule-delete-title" aria-describedby="schedule-delete-description">
                        <span className="schedule-delete-eyebrow">CONFIRMAR ACCIÓN</span>
                        <h2 id="schedule-delete-title">Eliminar o desactivar turno</h2>
                        <p id="schedule-delete-description">{dayLabels[scheduleToDelete.dayOfWeek]} a las <strong>{scheduleToDelete.startTime}</strong>. Si tiene alumnos asignados, el turno se desactivará para conservar su historial. Si no, se eliminará.</p>
                        <div className="schedule-delete-actions">
                            <button type="button" ref={cancelDeleteRef} onClick={() => setScheduleToDelete(null)} disabled={isDeleting}>Cancelar</button>
                            <button type="button" onClick={handleDelete} disabled={isDeleting} aria-busy={isDeleting}>{isDeleting ? 'Procesando...' : 'Continuar'}</button>
                        </div>
                    </div>
                </div>
            )}

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
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                        aria-label="Filtrar por categoría"
                    >
                        <option value="all">Todas las categorías</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.name}>{category.name}</option>
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

                <p className="class-schedules-results" aria-live="polite">Mostrando <strong>{filteredSchedules.length}</strong> de {schedules.length} turnos · {groupedSchedules.length} {groupedSchedules.length === 1 ? 'día' : 'días'}</p>

                <div className="class-schedules-groups" ref={groupsRef}>
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
                                    <th>Categoría</th>
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
                                            <td className="schedule-cell-time" data-label="Horario">
                                                <div className="class-schedule-time">
                                                    <strong>{schedule.startTime}{endsAt ? ` a ${endsAt}` : ''}</strong>
                                                    <span>{schedule.durationMinutes} min</span>
                                                </div>
                                            </td>
                                            <td className="schedule-cell-category" data-label="Categoría">
                                                <div className="class-schedule-category">
                                                    <span>{getClassCategoryLabel(schedule.classCategory)}</span>
                                                    {categories.find((category) => category.name === schedule.classCategory)?.isSpecialActivity && (
                                                        <em>Evento</em>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="schedule-cell-coach" data-label="Coach">{getCoachName(schedule)}</td>
                                            <td className="schedule-cell-capacity" data-label="Cupos">{getCapacityLabel(schedule)}</td>
                                            <td className="schedule-cell-status" data-label="Estado">
                                                <span className={`class-schedule-status class-schedule-status-${schedule.isActive ? 'active' : 'inactive'}`}>
                                                    {schedule.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="schedule-cell-notes" data-label="Notas">{schedule.notes || '-'}</td>
                                            <td className="schedule-cell-actions" data-label="Acciones">
                                                <div className="class-schedule-actions">
                                                    <button type="button" onClick={() => openEdit(schedule)} aria-label="Editar turno">
                                                        <GoPencil /><span>Editar</span>
                                                    </button>
                                                    <button type="button" onClick={() => setScheduleToDelete(schedule)} aria-label="Eliminar o desactivar turno">
                                                        <FaRegTrashAlt /><span>Quitar</span>
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
                </div>
                <Pagination page={schedulePages.page} pageSize={schedulePages.pageSize} totalItems={filteredSchedules.length} onPageChange={schedulePages.setPage} label="turnos" />

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
