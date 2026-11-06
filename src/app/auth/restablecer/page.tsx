import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PasswordResetForm } from "@/components/auth/passwordResetForm/PasswordResetForm";
import "../login/_loginPage.scss";

export const metadata: Metadata = {
    title: "Nueva contraseña",
    description: "Restablecimiento de contraseña de Hekademos.",
};

export default function RestablecerPasswordPage() {
    return (
        <main className="login-page">
            <div className="login-page-shell password-reset-page-shell">
                <aside className="login-page-story">
                    <Link href="/" className="login-page-brand" aria-label="Hekademos, ir al inicio">
                        <Image src="/LogoHekademos.png" alt="" width={48} height={48} />
                        <span>HEKADEMOS</span>
                    </Link>
                    <div className="login-page-story-copy">
                        <span className="login-page-eyebrow">VOLVÉ A TU RITMO</span>
                        <h2>Un nuevo comienzo.</h2>
                        <p>Elegí una contraseña nueva y seguí conectado con tus clases, horarios y comunidad.</p>
                    </div>
                    <span className="login-page-story-footer">FUERZA · MOVILIDAD · PRESENCIA</span>
                </aside>
                <div className="login-page-content">
                    <Link className="login-page-home-link" href="/">← Volver al inicio</Link>
                    <Suspense>
                        <PasswordResetForm />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
