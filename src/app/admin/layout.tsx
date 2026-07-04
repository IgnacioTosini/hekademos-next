import { Dashboard } from "@/components/admin/dashboard";
import { getCurrentAuthSession } from "@/lib/auth-session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
/* import { Analytics } from "@vercel/analytics/next" */

export const metadata: Metadata = {
  title: {
    default: "Panel de administración",
    template: "%s | Admin Hekademos",
  },
  description: "Panel de administración de Hekademos",

  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentAuthSession();

  if (!session) {
    redirect("/auth/login?next=/admin");
  }

  if (session.role !== "ADMIN") {
    redirect(session.role === "COACH" ? "/coach/dashboard" : "/perfil");
  }

  return (
    <main className="admin-layout">
      <Dashboard />
      {children}
      {/* <Analytics /> */}
    </main>
  );
}
