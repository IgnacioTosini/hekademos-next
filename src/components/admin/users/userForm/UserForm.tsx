'use client';

import { FormEvent, useState, useTransition } from 'react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { isValidOptionalContactPhone, phoneValidationMessage } from '@/utils/phone';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { createUser, updateUser } from '@/app/actions/user.actions';
import type { Role, UserStatus, UserWithRelations } from '@/types/schema/users';
import { saveWithResolvedUserImage, UserImageField, type UserImageValue } from '../userImageField/UserImageField';
import './_userForm.scss';

type Props = {
    user: UserWithRelations | null;
    onClose: () => void;
};

type UserFormState = {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: Role;
    status: UserStatus;
};

const getInitialState = (user: UserWithRelations | null): UserFormState => ({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
    role: user?.role ?? 'STUDENT',
    status: user?.status ?? 'ACTIVE',
});

export const UserForm = ({ user, onClose }: Props) => {
    const router = useRouter();
    const [form, setForm] = useState<UserFormState>(() => getInitialState(user));
    const [image, setImage] = useState<UserImageValue>(undefined);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const isEditing = !!user;

    const updateField = <Key extends keyof UserFormState>(key: Key, value: UserFormState[Key]) => {
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

        if (!isValidOptionalContactPhone(form.phone)) {
            setError(phoneValidationMessage);
            return;
        }

        startTransition(async () => {
            try {
                const { result, previousImageDeleteFailed } = await saveWithResolvedUserImage({
                    image,
                    previousImagePublicId: user?.image?.publicId,
                    save: (resolvedImage) => {
                        const payload = {
                            name: form.name.trim() || null,
                            email: form.email,
                            phone: form.phone.trim() || null,
                            password: form.password.trim() || null,
                            role: form.role,
                            status: form.status,
                            image: resolvedImage,
                        };

                        return isEditing
                            ? updateUser(user.id, payload)
                            : createUser(payload);
                    },
                });

                if (result.ok) {
                    if (previousImageDeleteFailed) {
                        toast.warning('Usuario guardado, pero no se pudo borrar la imagen anterior de Cloudinary');
                    }

                    toast.success(isEditing ? 'Usuario actualizado' : 'Usuario creado');
                    router.refresh();
                    onClose();
                    return;
                }

                setError(result.error);
                toast.error(result.error);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'No se pudo guardar el usuario';
                setError(message);
                toast.error(message);
            }
        });
    };

    return (
        <form className="user-form" onSubmit={handleSubmit}>
            <UserImageField
                id="user-image"
                existingImage={user?.image}
                value={image}
                onChange={setImage}
                disabled={isPending}
            />

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="user-name">Nombre</label>
                    <input
                        id="user-name"
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        placeholder="Nombre y apellido"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="user-email">Email</label>
                    <input
                        id="user-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder="usuario@email.com"
                        required
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="user-phone">Telefono</label>
                    <PhoneInput
                        id="user-phone"
                        value={form.phone}
                        onChange={(value) => updateField('phone', value)}
                        disabled={isPending}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="user-role">Rol</label>
                    <select
                        id="user-role"
                        value={form.role}
                        onChange={(event) => updateField('role', event.target.value as Role)}
                    >
                        <option value="ADMIN">Admin</option>
                        <option value="COACH">Coach</option>
                        <option value="STUDENT">Alumno</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="user-password">Contraseña</label>
                <input
                    id="user-password"
                    type="password"
                    value={form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                    placeholder={isEditing ? 'Dejar en blanco para mantenerla' : 'Minimo 6 caracteres'}
                    required={!isEditing}
                />
            </div>

            <div className="form-group">
                <label htmlFor="user-status">Estado</label>
                <select
                    id="user-status"
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value as UserStatus)}
                >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="SUSPENDED">Suspendido</option>
                </select>
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="button-group">
                <button className="cancel-button" type="button" onClick={onClose} disabled={isPending}>
                    Cancelar
                </button>
                <button className="submit-button" type="submit" disabled={isPending}>
                    {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
                </button>
            </div>
        </form>
    );
};
