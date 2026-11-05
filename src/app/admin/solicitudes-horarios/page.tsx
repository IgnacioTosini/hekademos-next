import { getScheduleChangeRequests } from "@/app/actions/scheduleChangeRequest.actions";
import { ScheduleRequestsSection } from "@/components/scheduleRequests/scheduleRequestsSection/ScheduleRequestsSection";
import type { Metadata } from "next";
import "./_solicitudesHorariosPage.scss";

export const metadata: Metadata = {
    title: "Cambios de horario",
    description: "Historial de cambios automáticos de horario de Hekademos.",
};

export default async function SolicitudesHorariosPage() {
    const requestsResponse = await getScheduleChangeRequests();
    const initialPage = requestsResponse.ok ? requestsResponse.data : {
        pending: [], reviewed: [], pendingPage: 1, reviewedPage: 1,
        pendingCount: 0, reviewedCount: 0, filteredTotal: 0, total: 0, coachOptions: [],
    };

    return (
        <div className="solicitudes-horarios-page">
            <ScheduleRequestsSection
                errorMessage={requestsResponse.ok ? null : requestsResponse.error}
                initialPage={initialPage}
            />
        </div>
    );
}
