import { DashboardSection } from "@/components/admin/dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Resumen administrativo de Hekademos.",
};

export default async function AdminPage() {
  return (
    <>
      <DashboardSection />
    </>
  );
}
