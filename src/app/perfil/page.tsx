import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { getStudentProfilePageData } from "@/lib/student-profile-page-data";
import { prisma } from "@/lib/prisma";
import { ChangePasswordButton } from "@/components/account/changePasswordButton/ChangePasswordButton";
import { StudentProfileContent } from "@/components/admin/students/studentProfile/studentProfileContent/StudentProfileContent";
import { StudentPaymentHistory } from "@/components/admin/students/studentProfile/studentProfileContent/StudentPaymentHistory";
import { LogoutIconButton } from "@/components/auth/logoutIconButton/LogoutIconButton";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { StudentProfileEditor } from "@/components/platform/student/studentProfileEditor/StudentProfileEditor";
import { StudentRoutineEditor } from "@/components/platform/student/studentRoutineEditor/StudentRoutineEditor";
import { StudentScheduleChangeRequest } from "@/components/platform/student/studentScheduleChangeRequest/StudentScheduleChangeRequest";
import { WhatsAppConsent } from "@/components/platform/student/whatsappConsent/WhatsAppConsent";
import { LoadingState } from "@/components/ui/loadingState/LoadingState";
import { normalizeWhatsappPhoneNumber } from "@/utils/whatsapp";
import "./_perfilPage.scss";

export const metadata: Metadata = {
    title: "Mi perfil",
    description: "Perfil del alumno en Hekademos.",
    robots: { index: false, follow: false },
};

type Props = {
    searchParams?: Promise<{ month?: string; year?: string; paymentPage?: string }>;
};

const ProfilePaymentHistory = async ({ studentId, page, totalItems, baseHref }: {
    studentId: string;
    page: number;
    totalItems: number;
    baseHref: string;
}) => {
    const payments = await prisma.payment.findMany({
        where: { studentId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 8,
        take: 8,
    });

    return <StudentPaymentHistory payments={payments} serverPagination={{ page, totalItems, baseHref }} />;
};

export default async function PerfilPage({ searchParams }: Props) {
    const session = await getCurrentAuthSession();
    if (!session) redirect("/auth/login?next=/perfil");
    if (session.role === "ADMIN") redirect("/admin");
    if (session.role === "COACH") redirect("/coach/dashboard");

    const data = await getStudentProfilePageData(session.userId, await searchParams);
    if (!data) redirect("/");

    const {
        student, communityResponse, attendancePeriod, paymentHistoryTotal,
        paymentHistoryPage, paymentHistoryParams, weeklySchedules,
        temporaryScheduleChange, now,
    } = data;
    const sanitizedStudent = {
        ...student,
        user: { ...student.user, passwordHash: null },
        coach: student.coach
            ? { ...student.coach, user: { ...student.coach.user, passwordHash: null } }
            : student.coach,
    };

    return (
        <main className="perfil-page">
            <LogoutIconButton />
            <StudentProfileContent
                student={sanitizedStudent}
                selfProfile
                paymentHistoryTotal={paymentHistoryTotal}
                paymentHistoryContent={paymentHistoryTotal > 0 ? (
                    <Suspense fallback={<LoadingState compact title="Cargando pagos" />}>
                        <ProfilePaymentHistory
                            studentId={student.id}
                            page={paymentHistoryPage}
                            totalItems={paymentHistoryTotal}
                            baseHref={`/perfil?${paymentHistoryParams}`}
                        />
                    </Suspense>
                ) : null}
                temporaryScheduleChange={temporaryScheduleChange}
                actions={(
                    <div className="student-profile-actions">
                        <StudentProfileEditor student={sanitizedStudent} />
                        <ChangePasswordButton />
                    </div>
                )}
                scheduleActions={(
                    <StudentScheduleChangeRequest
                        activeOneTimeChange={temporaryScheduleChange}
                        referenceDate={now}
                        student={sanitizedStudent}
                        weeklySchedules={weeklySchedules}
                    />
                )}
                routineActions={<StudentRoutineEditor routineExcelUrl={sanitizedStudent.routineExcelUrl} />}
                showInternalNotes={false}
                allowPaymentReport
                attendanceBaseHref="/perfil"
                selectedAttendanceMonth={attendancePeriod.selectedMonth}
                selectedAttendanceYear={attendancePeriod.selectedYear}
            />
            <WhatsAppConsent
                key={`${student.user.phone ?? ""}:${student.whatsappConsentAt?.toISOString() ?? ""}`}
                enabled={Boolean(student.whatsappConsentAt && student.whatsappConsentPhone
                    && student.whatsappConsentPhone === normalizeWhatsappPhoneNumber(student.user.phone))}
                phone={student.user.phone}
                email={student.user.email}
            />
            {communityResponse.ok && <CommunityFeed data={communityResponse.data} embedded />}
        </main>
    );
}
