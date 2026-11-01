import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "@/components/auth/loginForm/LoginForm";
import "./_loginPage.scss";

export const metadata: Metadata = {
    title: "Ingresar",
    description: "Ingreso a Hekademos.",
};

export default function LoginPage() {
    return (
        <main className="login-page">
            <div className="login-page-shell">
                <aside className="login-page-story">
                    <Link href="/" className="login-page-brand" aria-label="Hekademos, ir al inicio">
                        <Image src="/LogoHekademos.png" alt="" width={48} height={48} />
                        <span>HEKADEMOS</span>
                    </Link>
                    <div className="login-page-story-copy">
                        <span className="login-page-eyebrow">MOVIMIENTO CONSCIENTE</span>
                        <h2>Volvé a tu entrenamiento.</h2>
                        <p>Tu espacio para seguir avanzando, clase a clase y a tu ritmo.</p>
                    </div>
                    <span className="login-page-story-footer">FUERZA · MOVILIDAD · PRESENCIA</span>
                </aside>

                <div className="login-page-content">
                    <Link className="login-page-home-link" href="/">← Volver al inicio</Link>
                    <Suspense>
                        <LoginForm />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
