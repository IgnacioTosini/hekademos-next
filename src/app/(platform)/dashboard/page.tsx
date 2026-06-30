import { getCurrentAuthSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await getCurrentAuthSession();

    if (!session) {
        redirect("/auth/login?next=/dashboard");
    }

    if (session.role === "ADMIN") {
        redirect("/admin");
    }

    if (session.role === "COACH") {
        redirect("/coach/dashboard");
    }

    redirect("/perfil");
}
