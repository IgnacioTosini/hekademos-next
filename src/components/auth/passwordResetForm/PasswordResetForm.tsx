"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!token) {
            setError("El link de recuperacion no es valido.");
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
                router.replace("/auth/login");
            }, 1200);
        });
    };

    return (
        <form className="password-reset-form" onSubmit={handleSubmit}>
            <div className="password-reset-form-header">
                <h1>Nueva contraseña</h1>
                <p>Elegí una contraseña nueva para volver a ingresar.</p>
            </div>

            {!token && (
                <p className="password-reset-form-error">El link de recuperacion no es valido.</p>
            )}

            <div className="password-reset-form-group">
                <label htmlFor="reset-password">Nueva contraseña</label>
                <input
                    id="reset-password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nueva contraseña"
                    autoComplete="new-password"
                    disabled={!token}
                    required
                />
            </div>

            <div className="password-reset-form-group">
                <label htmlFor="reset-confirm-password">Confirmar contraseña</label>
                <input
                    id="reset-confirm-password"
                    type="password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repetir contraseña"
                    autoComplete="new-password"
                    disabled={!token}
                    required
                />
            </div>

            {error && token && <p className="password-reset-form-error">{error}</p>}
            {message && <p className="password-reset-form-message">{message}</p>}

            <button type="submit" disabled={isPending || !token}>
                {isPending ? "Guardando..." : "Guardar contraseña"}
            </button>

            <Link className="password-reset-back" href="/auth/login">
                Volver a ingresar
            </Link>
        </form>
    );
};
