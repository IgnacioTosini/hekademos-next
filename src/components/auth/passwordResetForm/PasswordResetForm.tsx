"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { resetPassword } from "@/app/actions/auth.actions";
import "./_passwordResetForm.scss";

export const PasswordResetForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!token) {
            setError("El enlace de recuperación no es válido.");
            return;
        }

        if (password.length < 6) {
            setError("La nueva contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        startTransition(async () => {
            const result = await resetPassword({
                token,
                password,
            });

            if (!result.ok) {
                setError(result.error);
                return;
            }

            setMessage("Contraseña actualizada. Ya podés ingresar con tu nueva contraseña.");
            setPassword("");
            setConfirmPassword("");

            setTimeout(() => {
                router.replace("/auth/login?passwordChanged=1");
            }, 1200);
        });
    };

    return (
        <form className="password-reset-form" onSubmit={handleSubmit}>
            <div className="password-reset-form-header">
                <span className="password-reset-form-eyebrow">ÚLTIMO PASO</span>
                <h1>Creá tu nueva contraseña.</h1>
                <p>Usá una contraseña de al menos 6 caracteres para volver a entrar a tu cuenta.</p>
            </div>

            {!token && (
                <div className="password-reset-form-invalid" role="alert">
                    <strong>El enlace no está disponible</strong>
                    <p>Pedí uno nuevo para continuar con el restablecimiento.</p>
                    <Link href="/auth/recuperar">Solicitar otro enlace →</Link>
                </div>
            )}

            {token && <div className="password-reset-form-group">
                <label htmlFor="reset-password">Nueva contraseña</label>
                <div className="password-reset-form-input-wrap">
                    <input
                        id="reset-password"
                        type={showPassword ? "text" : "password"}
                        minLength={6}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Ingresá tu nueva contraseña"
                        autoComplete="new-password"
                        disabled={!token || Boolean(message)}
                        required
                    />
                    <button type="button" className="password-reset-form-toggle" onClick={() => setShowPassword((value) => !value)} disabled={!token || Boolean(message)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}>
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                </div>
                <small>Al menos 6 caracteres</small>
            </div>}

            {token && <div className="password-reset-form-group">
                <label htmlFor="reset-confirm-password">Confirmar contraseña</label>
                <div className="password-reset-form-input-wrap">
                    <input
                        id="reset-confirm-password"
                        type={showConfirmation ? "text" : "password"}
                        minLength={6}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Repetí tu nueva contraseña"
                        autoComplete="new-password"
                        disabled={!token || Boolean(message)}
                        required
                    />
                    <button type="button" className="password-reset-form-toggle" onClick={() => setShowConfirmation((value) => !value)} disabled={!token || Boolean(message)} aria-label={showConfirmation ? "Ocultar confirmación" : "Mostrar confirmación"} aria-pressed={showConfirmation}>
                        {showConfirmation ? <FiEyeOff /> : <FiEye />}
                    </button>
                </div>
            </div>}

            {error && token && <p className="password-reset-form-error" role="alert">{error}</p>}
            {message && <p className="password-reset-form-message" role="status">{message}</p>}

            {token && <button className="password-reset-form-submit" type="submit" disabled={isPending || Boolean(message)}>
                {isPending ? "Guardando..." : message ? "Contraseña actualizada" : "Guardar nueva contraseña"}
            </button>}

            <Link className="password-reset-back" href="/auth/login">
                ← Volver a ingresar
            </Link>
        </form>
    );
};
