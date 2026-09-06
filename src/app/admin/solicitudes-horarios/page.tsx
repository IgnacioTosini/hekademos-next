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
    const requests = requestsResponse.ok ? requestsResponse.data : [];

    return (
        <div className="solicitudes-horarios-page">
            <ScheduleRequestsSection
                errorMessage={requestsResponse.ok ? null : requestsResponse.error}
                requests={requests}
            />
        </div>
    );
}
