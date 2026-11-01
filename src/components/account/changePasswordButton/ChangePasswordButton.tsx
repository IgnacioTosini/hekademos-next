'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<ChangePasswordForm>(initialForm);
    const [error, setError] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isPending, startTransition] = useTransition();

    const closeModal = () => {
        setIsOpen(false);
        setForm(initialForm);
        setError('');
        setShowPasswords(false);
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
                closeModal();
                router.replace('/auth/login?passwordChanged=1');
                router.refresh();
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
                    <div className="change-password-modal" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
                        <div className="change-password-modal-header">
                            <div>
                                <span className="change-password-eyebrow">SEGURIDAD DE TU CUENTA</span>
                                <h2 id="change-password-title">Cambiar contraseña</h2>
                                <p>Al guardarla, tendrás que ingresar de nuevo.</p>
                            </div>

                            <button type="button" onClick={closeModal} aria-label="Cerrar">
                                <IoMdClose />
                            </button>
                        </div>

                        <form className="change-password-form" onSubmit={handleSubmit}>
                            <button className="change-password-visibility" type="button" onClick={() => setShowPasswords((visible) => !visible)} aria-pressed={showPasswords}>{showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}</button>
                            <div className="change-password-form-group">
                                <label htmlFor="current-password">Contraseña actual</label>
                                <input
                                    id="current-password"
                                    type={showPasswords ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={form.currentPassword}
                                    onChange={(event) => updateField('currentPassword', event.target.value)}
                                    required
                                />
                            </div>

                            <div className="change-password-form-group">
                                <label htmlFor="new-password">Nueva contraseña</label>
                                <input
                                    id="new-password"
                                    type={showPasswords ? 'text' : 'password'}
                                    autoComplete="new-password"
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
                                    type={showPasswords ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    minLength={6}
                                    value={form.confirmPassword}
                                    onChange={(event) => updateField('confirmPassword', event.target.value)}
                                    required
                                />
                            </div>

                            {error && <p className="change-password-error" role="alert">{error}</p>}

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
