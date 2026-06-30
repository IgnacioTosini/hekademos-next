'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { createCoachUser, updateCoachUser } from '@/app/actions/coach.actions';
import { deleteImage } from '@/lib/client-cloudinary';
import { isValidOptionalPhone } from '@/lib/form-validation';
import type { UserStatus, UserWithRelations } from '@/types/schema/users';
import { UserImageField, type UserImageValue } from '../../users/userImageField/UserImageField';
import '../../users/userForm/_userForm.scss';

type Props = {
    coach: UserWithRelations | null;
    onClose: () => void;
};

type CoachFormState = {
    name: string;
    email: string;
    password: string;
    phone: string;
    status: UserStatus;
    specialty: string;
    instagram: string;
    bio: string;
    isActive: boolean;
};

const getInitialState = (coach: UserWithRelations | null): CoachFormState => ({
    name: coach?.name ?? '',
    email: coach?.email ?? '',
    password: '',
    phone: coach?.phone ?? '',
    status: coach?.status ?? 'ACTIVE',
    specialty: coach?.coach?.specialty ?? '',
    instagram: coach?.coach?.instagram ?? '',
    bio: coach?.coach?.bio ?? '',
    isActive: coach?.coach?.isActive ?? true,
});

export const CoachForm = ({ coach, onClose }: Props) => {
    const router = useRouter();
    const [form, setForm] = useState<CoachFormState>(() => getInitialState(coach));
    const [image, setImage] = useState<UserImageValue>(undefined);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const isEditing = !!coach;

    const updateField = <Key extends keyof CoachFormState>(key: Key, value: CoachFormState[Key]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
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

        if (!isValidOptionalPhone(form.phone)) {
            setError('Revisá el teléfono: usá solo números, espacios, +, - o paréntesis.');
            return;
        }

        startTransition(async () => {
            const payload = {
                name: form.name.trim() || null,
                email: form.email,
                password: form.password.trim() || null,
                phone: form.phone.trim() || null,
                status: form.status,
                specialty: form.specialty.trim() || null,
                instagram: form.instagram.trim().replace(/^@/, '') || null,
                bio: form.bio.trim() || null,
                isActive: form.isActive,
                image,
            };

            const result = isEditing
                ? await updateCoachUser(coach.id, payload)
                : await createCoachUser(payload);

            if (result.ok) {
                try {
                    if (coach?.image?.publicId && (image === null || image?.publicId)) {
                        await deleteImage(coach.image.publicId);
                    }
                } catch {
                    toast.warning('Coach guardado, pero no se pudo borrar la imagen anterior de Cloudinary');
                }

                toast.success(isEditing ? 'Coach actualizado' : 'Coach creado');
                router.refresh();
                onClose();
                return;
            }

            setError(result.error);
            toast.error(result.error);
        });
    };

    return (
        <form className="user-form" onSubmit={handleSubmit}>
            <UserImageField
                id="coach-image"
                existingImage={coach?.image}
                value={image}
                onChange={setImage}
                disabled={isPending}
            />

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="coach-name">Nombre</label>
                    <input
                        id="coach-name"
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        placeholder="Nombre y apellido"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="coach-email">Email</label>
                    <input
                        id="coach-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder="coach@email.com"
                        required
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="coach-phone">Telefono</label>
                    <input
                        id="coach-phone"
                        inputMode="tel"
                        value={form.phone}
                        onChange={(event) => updateField('phone', event.target.value)}
                        placeholder="11 5555-5555"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="coach-specialty">Especialidad</label>
                    <input
                        id="coach-specialty"
                        value={form.specialty}
                        onChange={(event) => updateField('specialty', event.target.value)}
                        placeholder="Fuerza, movilidad, tecnica..."
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="coach-password">Contraseña</label>
                <input
                    id="coach-password"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder={isEditing ? 'Dejar en blanco para mantenerla' : 'Minimo 6 caracteres'}
                    required={!isEditing}
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="coach-instagram">Instagram</label>
                    <input
                        id="coach-instagram"
                        value={form.instagram}
                        onChange={(event) => updateField('instagram', event.target.value)}
                        placeholder="@usuario"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="coach-status">Estado de cuenta</label>
                    <select
                        id="coach-status"
                        value={form.status}
                        onChange={(event) => updateField('status', event.target.value as UserStatus)}
                    >
                        <option value="ACTIVE">Activo</option>
                        <option value="INACTIVE">Inactivo</option>
                        <option value="SUSPENDED">Suspendido</option>
                    </select>
                </div>
            </div>

            <div className="form-group checkbox-field">
                <label htmlFor="coach-active">Coach activo</label>
                <input
                    id="coach-active"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateField('isActive', event.target.checked)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="coach-bio">Bio</label>
                <textarea
                    id="coach-bio"
                    value={form.bio}
                    onChange={(event) => updateField('bio', event.target.value)}
                    placeholder="Notas internas o descripcion del coach"
                />
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="button-group">
                <button className="cancel-button" type="button" onClick={onClose} disabled={isPending}>
                    Cancelar
                </button>
                <button className="submit-button" type="submit" disabled={isPending}>
                    {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear coach'}
                </button>
            </div>
        </form>
    );
};
