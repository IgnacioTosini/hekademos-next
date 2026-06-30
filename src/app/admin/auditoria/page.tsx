import { getAuditLogs } from "@/app/actions/audit.actions";
import { AuditSection } from "@/components/admin/audit/auditSection/AuditSection";
import type { Metadata } from "next";
import "./_auditoriaPage.scss";

export const metadata: Metadata = {
    title: "Auditoria",
    description: "Registro de acciones administrativas de Hekademos.",
};

export default async function AuditoriaPage() {
    const logsResponse = await getAuditLogs();
    const logs = logsResponse.ok ? logsResponse.data : [];

    return (
        <div className="auditoria-page">
            <AuditSection logs={logs} />
        </div>
    );
}
