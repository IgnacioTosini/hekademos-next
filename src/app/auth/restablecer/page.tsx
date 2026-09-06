import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetForm } from "@/components/auth/passwordResetForm/PasswordResetForm";
import "../login/_loginPage.scss";

export const metadata: Metadata = {
    title: "Nueva contraseña",
    description: "Restablecimiento de contraseña de Hekademos.",
};

export default function RestablecerPasswordPage() {
    return (
        <main className="login-page">
            <div className="login-page-content">
                <Suspense>
                    <PasswordResetForm />
                </Suspense>

                <Link className="login-page-home-link" href="/">
                    Volver al inicio
                </Link>
            </div>
        </main>
    );
}
