import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetRequestForm } from "@/components/auth";
import "../login/_loginPage.scss";

export const metadata: Metadata = {
    title: "Recuperar contraseña",
    description: "Recuperacion de contraseña de Hekademos.",
};

export default function RecuperarPasswordPage() {
    return (
        <main className="login-page">
            <div className="login-page-content">
                <PasswordResetRequestForm />

                <Link className="login-page-home-link" href="/">
                    Volver al inicio
                </Link>
            </div>
        </main>
    );
}
