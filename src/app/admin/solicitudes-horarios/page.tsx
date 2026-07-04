import { getScheduleChangeRequests } from "@/app/actions/scheduleChangeRequest.actions";
import { ScheduleRequestsSection } from "@/components/scheduleRequests";
import type { Metadata } from "next";
import "./_solicitudesHorariosPage.scss";

export const metadata: Metadata = {
    title: "Solicitudes de horario",
    description: "Revision de solicitudes de cambio de horario de Hekademos.",
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
