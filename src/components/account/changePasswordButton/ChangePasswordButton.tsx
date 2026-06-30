'use client';

import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { IoMdClose } from 'react-icons/io';
import { FaKey } from 'react-icons/fa';
import { changeCurrentUserPassword } from '@/app/actions/account.actions';
import './_changePasswordButton.scss';

type ChangePasswordForm = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

const initialForm: ChangePasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
};

export const ChangePasswordButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<ChangePasswordForm>(initialForm);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();

    const closeModal = () => {
        setIsOpen(false);
        setForm(initialForm);
        setError('');
    };

    const updateField = <Key extends keyof ChangePasswordForm>(key: Key, value: ChangePasswordForm[Key]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        if (form.newPassword.trim().length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (form.newPassword !== form.confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        startTransition(async () => {
            const result = await changeCurrentUserPassword(form);

            if (result.ok) {
                toast.success('Contraseña actualizada');
                closeModal();
                return;
            }

            setError(result.error);
            toast.error(result.error);
        });
    };

    return (
        <>
            <button className="change-password-button" type="button" onClick={() => setIsOpen(true)}>
                <FaKey />
                Cambiar contraseña
            </button>

            {isOpen && (
                <div className="change-password-modal-container">
                    <div className="change-password-modal">
                        <div className="change-password-modal-header">
                            <div>
                                <h2>Cambiar contraseña</h2>
                                <p>Actualizá el acceso a tu cuenta.</p>
                            </div>

                            <button type="button" onClick={closeModal} aria-label="Cerrar">
                                <IoMdClose />
                            </button>
                        </div>

                        <form className="change-password-form" onSubmit={handleSubmit}>
                            <div className="change-password-form-group">
                                <label htmlFor="current-password">Contraseña actual</label>
                                <input
                                    id="current-password"
                                    type="password"
                                    value={form.currentPassword}
                                    onChange={(event) => updateField('currentPassword', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="change-password-form-group">
                                <label htmlFor="new-password">Nueva contraseña</label>
                                <input
                                    id="new-password"
                                    type="password"
                                    minLength={6}
                                    value={form.newPassword}
                                    onChange={(event) => updateField('newPassword', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="change-password-form-group">
                                <label htmlFor="confirm-password">Confirmar contraseña</label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    minLength={6}
                                    value={form.confirmPassword}
                                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                                    required
                                />
                            </div>

                            {error && <p className="change-password-error">{error}</p>}

                            <div className="change-password-actions">
                                <button type="button" onClick={closeModal} disabled={isPending}>
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isPending}>
                                    {isPending ? 'Guardando...' : 'Guardar contraseña'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
