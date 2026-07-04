import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth";
import "./_loginPage.scss";

export const metadata: Metadata = {
    title: "Ingresar",
    description: "Ingreso a Hekademos.",
};

export default function LoginPage() {
    return (
        <main className="login-page">
            <div className="login-page-content">
                <Suspense>
                    <LoginForm />
                </Suspense>

                <Link className="login-page-home-link" href="/">
                    Volver al inicio
                </Link>
            </div>
        </main>
    );
}
