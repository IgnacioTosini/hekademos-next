'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { createWeeklyClassSchedule, updateWeeklyClassSchedule } from '@/app/actions/class.actions';
import type { DayOfWeek, WeeklyClassScheduleWithRelations } from '@/types/schema/classes';
import type { ClassCategoryOption } from '@/types/schema/common';
import type { UserWithRelations } from '@/types/schema/users';
import { getClassCategoryLabel } from '@/utils/class-category';
import { dayLabels, dayOrder } from '@/utils/schedule';
import './_classScheduleForm.scss';

type Props = {
    schedule: WeeklyClassScheduleWithRelations | null;
    coaches: UserWithRelations[];
    categories: ClassCategoryOption[];
    onClose: () => void;
};

type ClassScheduleFormState = {
    dayOfWeek: DayOfWeek;
    classCategory: string;
    startTime: string;
    durationMinutes: string;
    capacity: string;
    coachId: string;
    isActive: boolean;
    notes: string;
};

const getInitialState = (
    schedule: WeeklyClassScheduleWithRelations | null,
    categories: ClassCategoryOption[]
): ClassScheduleFormState => ({
    dayOfWeek: schedule?.dayOfWeek ?? 'MONDAY',
    classCategory: schedule
        ? getClassCategoryLabel(schedule.classCategory)
        : categories[0]?.name ?? '',
    startTime: schedule?.startTime ?? '16:00',
    durationMinutes: schedule ? String(schedule.durationMinutes) : '90',
    capacity: schedule?.capacity === null || schedule?.capacity === undefined ? '10' : String(schedule.capacity),
    coachId: schedule?.coachId ?? '',
    isActive: schedule?.isActive ?? true,
    notes: schedule?.notes ?? '',
});

const getCoachName = (coach: UserWithRelations) => coach.name || coach.email;

export const ClassScheduleForm = ({ schedule, coaches, categories, onClose }: Props) => {
    const router = useRouter();
    const coachOptions = coaches.filter((coach) => coach.coach?.id);
    const [form, setForm] = useState<ClassScheduleFormState>(() => getInitialState(schedule, categories));
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const isEditing = !!schedule;

    const updateField = <Key extends keyof ClassScheduleFormState>(key: Key, value: ClassScheduleFormState[Key]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        const durationMinutes = Number(form.durationMinutes);
        const capacity = form.capacity.trim() ? Number(form.capacity) : null;

        if (!form.startTime.trim()) {
            setError('El horario es obligatorio.');
            return;
        }

        if (!form.classCategory) {
            setError('Seleccioná una categoría. Podés crear categorías desde Planes.');
            return;
        }

        if (!Number.isInteger(durationMinutes) || durationMinutes < 15) {
            setError('La duracion debe ser de al menos 15 minutos.');
            return;
        }

        if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
            setError('La capacidad debe ser un numero mayor a cero.');
            return;
        }

        startTransition(async () => {
            const payload = {
                dayOfWeek: form.dayOfWeek,
                classCategory: form.classCategory,
                startTime: form.startTime,
                durationMinutes,
                capacity,
                coachId: form.coachId || null,
                isActive: form.isActive,
                notes: form.notes.trim() || null,
            };
            const result = isEditing
                ? await updateWeeklyClassSchedule(schedule.id, payload)
                : await createWeeklyClassSchedule(payload);

            if (result.ok) {
                toast.success(isEditing ? 'Turno actualizado' : 'Turno creado');
                router.refresh();
                onClose();
                return;
            }

            setError(result.error);
            toast.error(result.error);
        });
    };

    return (
        <form className="class-schedule-form" onSubmit={handleSubmit}>
            <div className="class-schedule-form-row">
                <div className="class-schedule-form-group">
                    <label htmlFor="schedule-day">Dia</label>
                    <select
                        id="schedule-day"
                        value={form.dayOfWeek}
                        onChange={(event) => updateField('dayOfWeek', event.target.value as DayOfWeek)}
                    >
                        {dayOrder.map((day) => (
                            <option key={day} value={day}>{dayLabels[day]}</option>
                        ))}
                    </select>
                </div>

                <div className="class-schedule-form-group">
                    <label htmlFor="schedule-category">Categoría</label>
                    <select
                        id="schedule-category"
                        value={form.classCategory}
                        onChange={(event) => updateField('classCategory', event.target.value)}
                        required
                    >
                        <option value="" disabled>Seleccioná una categoría</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.name}>
                                {category.name}{category.isSpecialActivity ? ' · Evento' : ''}
                            </option>
                        ))}
                    </select>
                    <small>
                        Las categorías se crean y editan desde Planes.
                    </small>
                </div>
            </div>

            <div className="class-schedule-form-row">
                <div className="class-schedule-form-group">
                    <label htmlFor="schedule-start">Inicio</label>
                    <input
                        id="schedule-start"
                        type="time"
                        value={form.startTime}
                        onChange={(event) => updateField('startTime', event.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="class-schedule-form-row">
                <div className="class-schedule-form-group">
                    <label htmlFor="schedule-duration">Duracion</label>
                    <input
                        id="schedule-duration"
                        type="number"
                        min="15"
                        step="15"
                        value={form.durationMinutes}
                        onChange={(event) => updateField('durationMinutes', event.target.value)}
                    />
                </div>

                <div className="class-schedule-form-group">
                    <label htmlFor="schedule-capacity">Capacidad</label>
                    <input
                        id="schedule-capacity"
                        type="number"
                        min="1"
                        step="1"
                        value={form.capacity}
                        onChange={(event) => updateField('capacity', event.target.value)}
                        placeholder="Sin limite"
                    />
                </div>
            </div>

            <div className="class-schedule-form-group">
                <label htmlFor="schedule-coach">Coach</label>
                <select
                    id="schedule-coach"
                    value={form.coachId}
                    onChange={(event) => updateField('coachId', event.target.value)}
                >
                    <option value="">Sin asignar</option>
                    {coachOptions.map((coach) => (
                        <option key={coach.coach!.id} value={coach.coach!.id}>
                            {getCoachName(coach)}
                        </option>
                    ))}
                </select>
            </div>

            <div className="class-schedule-form-group">
                <label htmlFor="schedule-notes">Notas</label>
                <textarea
                    id="schedule-notes"
                    value={form.notes}
                    onChange={(event) => updateField('notes', event.target.value)}
                    placeholder="Observaciones internas"
                />
            </div>

            <label className="class-schedule-form-check">
                <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateField('isActive', event.target.checked)}
                />
                Activo
            </label>

            {error && <p className="class-schedule-form-error">{error}</p>}

            <div className="class-schedule-form-actions">
                <button type="button" onClick={onClose} disabled={isPending}>
                    Cancelar
                </button>
                <button type="submit" disabled={isPending}>
                    {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear turno'}
                </button>
            </div>
        </form>
    );
};
