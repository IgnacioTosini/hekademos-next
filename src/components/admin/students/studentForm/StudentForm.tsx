'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState, useTransition } from 'react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { isValidOptionalContactPhone } from '@/utils/phone';
import { toast } from 'react-toastify';
import { createStudentUser, updateStudentUser } from '@/app/actions/student.actions';
import { isValidBirthDate, isValidOptionalPhone } from '@/lib/form-validation';
import type { WeeklyClassScheduleSummary } from '@/types/schema/classes';
import type { MembershipPlan } from '@/types/schema/memberships';
import type { UserStatus, UserWithRelations } from '@/types/schema/users';
import { getClassCategoryLabel } from '@/utils/class-category';
import { centsToPesosInput, parsePesosToCents } from '@/utils/format';
import { dayOrder, getScheduleTimeLabel, uppercaseDayLabels } from '@/utils/schedule';
import { saveWithResolvedUserImage, UserImageField, type UserImageValue } from '../../users/userImageField/UserImageField';
import '../../users/userForm/_userForm.scss';

type Props = {
    student: UserWithRelations | null;
    coaches: UserWithRelations[];
    membershipPlans: MembershipPlan[];
    weeklySchedules: WeeklyClassScheduleSummary[];
    onClose: () => void;
};

type StudentFormState = {
    coachId: string;
    planId: string;
    scheduleIds: string[];
    monthlyPricePesos: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    birthDate: string;
    status: UserStatus;
    emergencyContactName: string;
    emergencyContactPhone: string;
    routineExcelUrl: string;
    notes: string;
};

const getInitialState = (student: UserWithRelations | null, membershipPlans: MembershipPlan[]): StudentFormState => {
    const activeMembership = student?.student?.memberships?.find((membership) => membership.status === 'ACTIVE');
    const plan = membershipPlans.find((membershipPlan) => membershipPlan.id === activeMembership?.planId);
    const scheduleIds = student?.student?.schedules
        ?.filter((schedule) => schedule.isActive)
        .map((schedule) => schedule.weeklyScheduleId) ?? [];

    return {
        coachId: student?.student?.coachId ?? '',
        planId: activeMembership?.planId ?? '',
        scheduleIds,
        monthlyPricePesos: centsToPesosInput(activeMembership?.monthlyPriceCents ?? plan?.priceCents),
        firstName: student?.student?.firstName ?? '',
        lastName: student?.student?.lastName ?? '',
        email: student?.email ?? '',
        password: '',
        phone: student?.phone ?? '',
        birthDate: student?.student?.birthDate ? new Date(student.student.birthDate).toISOString().slice(0, 10) : '',
        status: student?.status ?? 'ACTIVE',
        emergencyContactName: student?.student?.emergencyContactName ?? '',
        emergencyContactPhone: student?.student?.emergencyContactPhone ?? '',
        routineExcelUrl: student?.student?.routineExcelUrl ?? '',
        notes: student?.student?.notes ?? '',
    };
};

const getScheduleLabel = (schedule: WeeklyClassScheduleSummary) => {
    const coachName = schedule.coachName;

    return `${getClassCategoryLabel(schedule.classCategory)} · ${getScheduleTimeLabel(schedule)}${coachName ? ` - ${coachName}` : ''}`;
};

const getScheduleCapacityLabel = (schedule: WeeklyClassScheduleSummary, isSelected: boolean) => {
    if (schedule.capacity === null) return 'Sin cupo definido';

    const availableSpots = schedule.availableSpots ?? Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0);

    if (availableSpots <= 0 && !isSelected) return 'Completo';

    return `${availableSpots} ${availableSpots === 1 ? 'cupo libre' : 'cupos libres'}`;
};

const hasRepeatedDay = (
    scheduleIds: string[],
    schedules: WeeklyClassScheduleSummary[]
) => {
    const selectedDays = scheduleIds
        .map((scheduleId) => schedules.find((schedule) => schedule.id === scheduleId)?.dayOfWeek)
        .filter(Boolean);

    return new Set(selectedDays).size !== selectedDays.length;
};

export const StudentForm = ({ student, coaches, membershipPlans, weeklySchedules, onClose }: Props) => {
    const router = useRouter();
    const [form, setForm] = useState<StudentFormState>(() => getInitialState(student, membershipPlans));
    const [image, setImage] = useState<UserImageValue>(undefined);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const isEditing = !!student;
    const selectedPlan = membershipPlans.find((plan) => plan.id === form.planId) ?? null;
    const maxSelectedSchedules = selectedPlan?.trainingDaysPerWeek ?? 0;
    const availableWeeklySchedules = useMemo(() => (
        weeklySchedules.filter((schedule) => (
            !form.coachId || !schedule.coachId || schedule.coachId === form.coachId
        ) && (
            !selectedPlan || getClassCategoryLabel(schedule.classCategory) === getClassCategoryLabel(selectedPlan.classCategory)
        ))
    ), [form.coachId, selectedPlan, weeklySchedules]);
    const schedulesByDay = useMemo(() => (
        dayOrder
            .map((dayOfWeek) => ({
                dayOfWeek,
                schedules: availableWeeklySchedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek),
            }))
            .filter((group) => group.schedules.length > 0)
    ), [availableWeeklySchedules]);

    const updateField = <Key extends keyof StudentFormState>(key: Key, value: StudentFormState[Key]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const updatePlan = (planId: string) => {
        const plan = membershipPlans.find((membershipPlan) => membershipPlan.id === planId);

        setForm((current) => ({
            ...current,
            planId,
            scheduleIds: plan
                ? current.scheduleIds
                    .filter((scheduleId) => weeklySchedules.some((schedule) => (
                        schedule.id === scheduleId
                        && getClassCategoryLabel(schedule.classCategory) === getClassCategoryLabel(plan.classCategory)
                    )))
                    .slice(0, plan.trainingDaysPerWeek)
                : [],
            monthlyPricePesos: plan ? centsToPesosInput(plan.priceCents) : '',
        }));
    };

    const updateCoach = (coachId: string) => {
        setForm((current) => {
            const validScheduleIds = weeklySchedules
                .filter((schedule) => !coachId || !schedule.coachId || schedule.coachId === coachId)
                .map((schedule) => schedule.id);

            return {
                ...current,
                coachId,
                scheduleIds: current.scheduleIds.filter((scheduleId) => validScheduleIds.includes(scheduleId)),
            };
        });
    };

    const toggleSchedule = (scheduleId: string) => {
        if (!selectedPlan) return;

        setForm((current) => {
            const isSelected = current.scheduleIds.includes(scheduleId);
            const selectedSchedule = availableWeeklySchedules.find((schedule) => schedule.id === scheduleId);

            if (isSelected) {
                return {
                    ...current,
                    scheduleIds: current.scheduleIds.filter((selectedScheduleId) => selectedScheduleId !== scheduleId),
                };
            }

            if (current.scheduleIds.length >= selectedPlan.trainingDaysPerWeek) return current;
            if (
                selectedSchedule
                && current.scheduleIds.some((selectedScheduleId) => (
                    availableWeeklySchedules.find((schedule) => schedule.id === selectedScheduleId)?.dayOfWeek === selectedSchedule.dayOfWeek
                ))
            ) return current;

            return {
                ...current,
                scheduleIds: [...current.scheduleIds, scheduleId],
            };
        });
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        if (!form.email.trim()) {
            setError('El email es obligatorio.');
            return;
        }

        if (!isEditing && form.password.trim().length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (isEditing && form.password.trim() && form.password.trim().length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        const monthlyPriceCents = parsePesosToCents(form.monthlyPricePesos);

        if (!isValidOptionalContactPhone(form.phone) || !isValidOptionalPhone(form.emergencyContactPhone)) {
            setError('Revisá los teléfonos: usá solo números, espacios, +, - o paréntesis.');
            return;
        }

        if (!isValidBirthDate(form.birthDate)) {
            setError('La fecha de nacimiento no parece válida.');
            return;
        }

        if (form.planId && (!monthlyPriceCents || monthlyPriceCents <= 0)) {
            setError('El costo mensual es obligatorio.');
            return;
        }

        if (selectedPlan && form.scheduleIds.length > selectedPlan.trainingDaysPerWeek) {
            setError(`El plan permite hasta ${selectedPlan.trainingDaysPerWeek} turnos por semana.`);
            return;
        }

        if (hasRepeatedDay(form.scheduleIds, weeklySchedules)) {
            setError('El alumno no puede elegir dos turnos el mismo dia.');
            return;
        }

        startTransition(async () => {
            try {
                const { result, previousImageDeleteFailed } = await saveWithResolvedUserImage({
                    image,
                    previousImagePublicId: student?.image?.publicId,
                    save: (resolvedImage) => {
                        const payload = {
                            coachId: form.coachId || null,
                            planId: form.planId || null,
                            scheduleIds: form.planId ? form.scheduleIds : [],
                            monthlyPriceCents: form.planId ? monthlyPriceCents : null,
                            firstName: form.firstName.trim() || null,
                            lastName: form.lastName.trim() || null,
                            name: [form.firstName, form.lastName].map((value) => value.trim()).filter(Boolean).join(' ') || null,
                            email: form.email,
                            password: form.password.trim() || null,
                            phone: form.phone.trim() || null,
                            birthDate: form.birthDate || null,
                            status: form.status,
                            emergencyContactName: form.emergencyContactName.trim() || null,
                            emergencyContactPhone: form.emergencyContactPhone.trim() || null,
                            routineExcelUrl: form.routineExcelUrl.trim() || null,
                            notes: form.notes.trim() || null,
                            image: resolvedImage,
                        };

                        return isEditing
                            ? updateStudentUser(student.id, payload)
                            : createStudentUser(payload);
                    },
                });

                if (result.ok) {
                    if (previousImageDeleteFailed) {
                        toast.warning('Alumno guardado, pero no se pudo borrar la imagen anterior de Cloudinary');
                    }

                    toast.success(isEditing ? 'Alumno actualizado' : 'Alumno creado');
                    router.refresh();
                    onClose();
                    return;
                }

                setError(result.error);
                toast.error(result.error);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'No se pudo guardar el alumno';
                setError(message);
                toast.error(message);
            }
        });
    };

    return (
        <form className="user-form" onSubmit={handleSubmit}>
            <UserImageField
                id="student-image"
                existingImage={student?.image}
                value={image}
                onChange={setImage}
                disabled={isPending}
            />

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="student-first-name">Nombre</label>
                    <input
                        id="student-first-name"
                        value={form.firstName}
                        onChange={(event) => updateField('firstName', event.target.value)}
                        placeholder="Nombre"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="student-last-name">Apellido</label>
                    <input
                        id="student-last-name"
                        value={form.lastName}
                        onChange={(event) => updateField('lastName', event.target.value)}
                        placeholder="Apellido"
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="student-email">Email</label>
                    <input
                        id="student-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder="alumno@email.com"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="student-phone">Telefono</label>
                    <PhoneInput
                        id="student-phone"
                        value={form.phone}
                        onChange={(value) => updateField('phone', value)}
                        disabled={isPending}
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="student-password">Contraseña</label>
                <input
                    id="student-password"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder={isEditing ? 'Dejar en blanco para mantenerla' : 'Minimo 6 caracteres'}
                    required={!isEditing}
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="student-birth-date">Nacimiento</label>
                    <input
                        id="student-birth-date"
                        type="date"
                        value={form.birthDate}
                        onChange={(event) => updateField('birthDate', event.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="student-emergency-name">Contacto de emergencia</label>
                    <input
                        id="student-emergency-name"
                        value={form.emergencyContactName}
                        onChange={(event) => updateField('emergencyContactName', event.target.value)}
                        placeholder="Nombre del contacto"
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="student-emergency-phone">Telefono emergencia</label>
                <input
                    id="student-emergency-phone"
                    inputMode="tel"
                    value={form.emergencyContactPhone}
                    onChange={(event) => updateField('emergencyContactPhone', event.target.value)}
                    placeholder="11 5555-5555"
                />
            </div>

            <div className="form-group">
                <label htmlFor="student-routine">Rutina / Excel</label>
                <input
                    id="student-routine"
                    value={form.routineExcelUrl}
                    onChange={(event) => updateField('routineExcelUrl', event.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="student-coach">Coach asignado</label>
                    <select
                        id="student-coach"
                        value={form.coachId}
                        onChange={(event) => updateCoach(event.target.value)}
                    >
                        <option value="">Sin asignar</option>
                        {coaches.map((coach) => (
                            <option key={coach.id} value={coach.coach?.id ?? ''}>
                                {coach.name || coach.email}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="student-status">Estado</label>
                    <select
                        id="student-status"
                        value={form.status}
                        onChange={(event) => updateField('status', event.target.value as UserStatus)}
                    >
                        <option value="ACTIVE">Activo</option>
                        <option value="INACTIVE">Inactivo</option>
                        <option value="SUSPENDED">Suspendido</option>
                    </select>
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="student-plan">Membresia mensual</label>
                    <select
                        id="student-plan"
                        value={form.planId}
                        onChange={(event) => updatePlan(event.target.value)}
                    >
                        <option value="">Sin membresia</option>
                        {membershipPlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name} - {getClassCategoryLabel(plan.classCategory)} - {plan.trainingDaysPerWeek} dias/semana
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="student-monthly-price">Costo mensual</label>
                    <input
                        id="student-monthly-price"
                        type="number"
                        min="0"
                        step="1"
                        value={form.monthlyPricePesos}
                        onChange={(event) => updateField('monthlyPricePesos', event.target.value)}
                        placeholder="55000"
                        disabled={!form.planId}
                    />
                </div>
            </div>

            <div className="form-group schedule-picker">
                <div className="schedule-picker-header">
                    <label>Turnos elegidos</label>
                    <span>{form.scheduleIds.length}/{maxSelectedSchedules || 0}</span>
                </div>

                <div className="schedule-options">
                    {schedulesByDay.map((group) => (
                        <div className="schedule-day" key={group.dayOfWeek}>
                            <strong>{uppercaseDayLabels[group.dayOfWeek]}:</strong>

                            <div className="schedule-day-options">
                                {group.schedules.map((schedule) => {
                                    const isSelected = form.scheduleIds.includes(schedule.id);
                                    const availableSpots = schedule.availableSpots ?? (
                                        schedule.capacity === null
                                            ? null
                                            : Math.max(schedule.capacity - (schedule.occupiedSpots ?? 0), 0)
                                    );
                                    const isFull = availableSpots !== null && availableSpots <= 0;
                                    const hasAnotherScheduleSameDay = !isSelected && form.scheduleIds.some((selectedScheduleId) => (
                                        availableWeeklySchedules.find((selectedSchedule) => selectedSchedule.id === selectedScheduleId)?.dayOfWeek === schedule.dayOfWeek
                                    ));
                                    const isDisabled = !selectedPlan
                                        || (!isSelected && isFull)
                                        || hasAnotherScheduleSameDay
                                        || (!isSelected && form.scheduleIds.length >= maxSelectedSchedules);

                                    return (
                                        <button
                                            key={schedule.id}
                                            type="button"
                                            className={`schedule-option${isSelected ? ' schedule-option-selected' : ''}${isFull ? ' schedule-option-full' : ''}`}
                                            onClick={() => toggleSchedule(schedule.id)}
                                            disabled={isDisabled}
                                        >
                                            <span>{getScheduleLabel(schedule)}</span>
                                            <small>
                                                {hasAnotherScheduleSameDay
                                                    ? 'Dia ya elegido'
                                                    : getScheduleCapacityLabel(schedule, isSelected)}
                                            </small>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {!form.planId && (
                    <p className="schedule-helper">Elegir una membresia para asignar turnos.</p>
                )}

                {selectedPlan && (
                    <p className="schedule-helper">
                        Mostrando solamente clases de {getClassCategoryLabel(selectedPlan.classCategory).toLowerCase()}.
                    </p>
                )}

                {form.planId && availableWeeklySchedules.length === 0 && (
                    <p className="schedule-helper">No hay turnos activos para el coach seleccionado.</p>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="student-notes">Notas</label>
                <textarea
                    id="student-notes"
                    value={form.notes}
                    onChange={(event) => updateField('notes', event.target.value)}
                    placeholder="Observaciones internas"
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="button-group">
                <button className="cancel-button" type="button" onClick={onClose} disabled={isPending}>
                    Cancelar
                </button>
                <button className="submit-button" type="submit" disabled={isPending}>
                    {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear alumno'}
                </button>
            </div>
        </form>
    );
};
