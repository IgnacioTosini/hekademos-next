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
    const initialPage = logsResponse.ok ? logsResponse.data : { logs: [], total: 0, filteredTotal: 0, page: 1 };

    return (
        <div className="auditoria-page">
            <AuditSection initialPage={initialPage} />
        </div>
    );
}
