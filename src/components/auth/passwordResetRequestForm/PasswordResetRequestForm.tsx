"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { requestPasswordReset } from "@/app/actions/auth.actions";
import "./_passwordResetRequestForm.scss";

export const PasswordResetRequestForm = () => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [devResetUrl, setDevResetUrl] = useState("");
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setDevResetUrl("");

        startTransition(async () => {
            const result = await requestPasswordReset({ email });

            if (!result.ok) {
                setError(result.error);
                return;
            }

            setMessage("Si el correo corresponde a una cuenta activa, vas a recibir un enlace para crear una contraseña nueva. Revisá también la carpeta de spam.");
            setDevResetUrl(result.data?.resetUrl ?? "");
        });
    };

    return (
        <form className="password-reset-request-form" onSubmit={handleSubmit}>
            <div className="password-reset-request-form-header">
                <span className="password-reset-request-form-eyebrow">RECUPERÁ TU ACCESO</span>
                <h1>Volvé a entrar.</h1>
                <p>Escribí el correo de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.</p>
            </div>

            <div className="password-reset-request-form-group">
                <label htmlFor="password-reset-email">Correo electrónico</label>
                <input
                    id="password-reset-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                />
            </div>

            {error && <p className="password-reset-request-form-error" role="alert">{error}</p>}
            {message && <p className="password-reset-request-form-message" role="status">{message}</p>}

            {devResetUrl && (
                <div className="password-reset-request-form-dev-link">
                    <span>Link de prueba</span>
                    <Link href={devResetUrl}>Abrir restablecimiento</Link>
                </div>
            )}

            <button className="password-reset-request-form-submit" type="submit" disabled={isPending}>
                {isPending ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <Link className="password-reset-request-form-back" href="/auth/login">
                ← Volver a ingresar
            </Link>
        </form>
    );
};
