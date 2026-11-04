import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PasswordResetRequestForm } from "@/components/auth/passwordResetRequestForm/PasswordResetRequestForm";
import "../login/_loginPage.scss";

export const metadata: Metadata = {
    title: "Recuperar contraseña",
    description: "Recuperá el acceso a tu cuenta de Hekademos.",
};

export default function RecuperarPasswordPage() {
    return (
        <main className="login-page">
            <div className="login-page-shell">
                <aside className="login-page-story">
                    <Link href="/" className="login-page-brand" aria-label="Hekademos, ir al inicio">
                        <Image src="/LogoHekademos.png" alt="" width={48} height={48} />
                        <span>HEKADEMOS</span>
                    </Link>
                    <div className="login-page-story-copy">
                        <span className="login-page-eyebrow">SEGUÍ EN MOVIMIENTO</span>
                        <h2>Tu espacio te espera.</h2>
                        <p>Recuperá el acceso para volver a tus clases, horarios y comunidad.</p>
                    </div>
                    <span className="login-page-story-footer">FUERZA · MOVILIDAD · PRESENCIA</span>
                </aside>
                <div className="login-page-content">
                    <Link className="login-page-home-link" href="/">← Volver al inicio</Link>
                    <PasswordResetRequestForm />
                </div>
            </div>
        </main>
    );
}
