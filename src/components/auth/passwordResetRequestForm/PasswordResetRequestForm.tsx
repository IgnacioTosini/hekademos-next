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

            setMessage("Si el email existe y la cuenta esta activa, vas a recibir un link para restablecer la contraseña.");
            setDevResetUrl(result.data?.resetUrl ?? "");
        });
    };

    return (
        <form className="password-reset-request-form" onSubmit={handleSubmit}>
            <div className="password-reset-request-form-header">
                <h1>Recuperar contraseña</h1>
                <p>Ingresá el email de tu cuenta y generamos un link temporal.</p>
            </div>

            <div className="password-reset-request-form-group">
                <label htmlFor="password-reset-email">Email</label>
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

            {error && <p className="password-reset-request-form-error">{error}</p>}
            {message && <p className="password-reset-request-form-message">{message}</p>}

            {devResetUrl && (
                <div className="password-reset-request-dev-link">
                    <span>Link de prueba</span>
                    <Link href={devResetUrl}>Abrir restablecimiento</Link>
                </div>
            )}

            <button type="submit" disabled={isPending}>
                {isPending ? "Generando..." : "Enviar link"}
            </button>

            <Link className="password-reset-request-back" href="/auth/login">
                Volver a ingresar
            </Link>
        </form>
    );
};
