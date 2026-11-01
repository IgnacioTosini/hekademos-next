'use client';

import { FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { login } from '@/app/actions/auth.actions';
import './_loginForm.scss';

export const LoginForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const passwordChanged = searchParams.get('passwordChanged') === '1';

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        startTransition(async () => {
            const result = await login({
                email,
                password,
            });

            if (!result.ok) {
                setError(result.error);
                return;
            }

            if (!result.data) {
                setError('No se pudo iniciar sesion');
                return;
            }

            const requestedNext = searchParams.get('next');
            const redirectTo = requestedNext?.startsWith('/') ? requestedNext : result.data.redirectTo;

            router.replace(redirectTo);
            router.refresh();
        });
    };

    return (
        <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-header">
                <span className="login-form-eyebrow">TU CUENTA</span>
                <h1>Bienvenido de nuevo</h1>
                <p>Acceso para alumnos, coaches y administración.</p>
            </div>

            <div className="login-form-group">
                <label htmlFor="login-email">Email</label>
                <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                />
            </div>

            <div className="login-form-group">
                <label htmlFor="login-password">Contraseña</label>
                <div className="login-password-field">
                    <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Tu contraseña"
                        autoComplete="current-password"
                        required
                    />
                    <button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>
                        {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                    </button>
                </div>
            </div>

            {passwordChanged && !error && (
                <p className="login-form-message">
                    Contraseña actualizada. Cerramos tus sesiones por seguridad; volvé a ingresar.
                </p>
            )}
            {error && <p className="login-form-error" role="alert">{error}</p>}

            <button type="submit" className="login-submit" disabled={isPending}>
                {isPending ? 'Ingresando...' : 'Entrar'}
            </button>

            <Link className="login-form-reset-link" href="/auth/recuperar">
                Olvidé mi contraseña
            </Link>
        </form>
    );
};
