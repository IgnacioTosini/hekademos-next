import { notFound } from "next/navigation";
import { getWeeklyClassSchedules } from "@/app/actions/class.actions";
import { getCoaches } from "@/app/actions/coach.actions";
import { getMembershipPlans } from "@/app/actions/membership.actions";
import { getStudentById } from "@/app/actions/student.actions";
import { StudentProfileSection } from "@/components/admin/students";
import type { Metadata } from "next";
import type { StudentWithRelations, UserWithRelations } from "@/types/schema/users";
import "./_studentProfilePage.scss";

type Props = {
    params: Promise<{
        id: string;
    }>;
    searchParams?: Promise<{
        month?: string;
        year?: string;
    }>;
};

export const metadata: Metadata = {
    title: "Perfil de alumno",
    description: "Detalle administrativo del alumno.",
};

const getSelectedAttendancePeriod = (month?: string, year?: string) => {
    const today = new Date();
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    return {
        selectedMonth: Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
            ? parsedMonth
            : today.getMonth() + 1,
        selectedYear: Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
            ? parsedYear
            : today.getFullYear(),
    };
};

export default async function StudentProfilePage({ params, searchParams }: Props) {
    const { id } = await params;
    const query = await searchParams;
    const { selectedMonth, selectedYear } = getSelectedAttendancePeriod(query?.month, query?.year);
    const [studentResponse, coachesResponse, plansResponse, schedulesResponse] = await Promise.all([
        getStudentById(id, {
            attendanceMonth: selectedMonth,
            attendanceYear: selectedYear,
        }),
        getCoaches(),
        getMembershipPlans(),
        getWeeklyClassSchedules(),
    ]);

    if (!studentResponse.ok || !studentResponse.data) {
        notFound();
    }

    const student = studentResponse.data;
    const studentForModal: StudentWithRelations = {
        id: student.id,
        userId: student.userId,
        coachId: student.coachId,
        firstName: student.firstName,
        lastName: student.lastName,
        birthDate: student.birthDate,
        emergencyContactName: student.emergencyContactName,
        emergencyContactPhone: student.emergencyContactPhone,
        routineExcelUrl: student.routineExcelUrl,
        notes: student.notes,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
        coach: student.coach
            ? {
                ...student.coach,
                user: student.coach.user ?? undefined,
            }
            : null,
        memberships: student.memberships,
        payments: student.payments,
        attendance: student.attendance,
        schedules: student.schedules,
    };
    const studentUser: UserWithRelations = {
        ...student.user,
        passwordHash: null,
        image: student.user.image ?? null,
        student: studentForModal,
        coach: null,
    };
    const coaches = coachesResponse.ok ? coachesResponse.data : [];
    const membershipPlans = plansResponse.ok ? plansResponse.data : [];
    const weeklySchedules = schedulesResponse.ok ? schedulesResponse.data : [];

    return (
        <div className="student-profile-page">
            <StudentProfileSection
                student={student}
                studentUser={studentUser}
                coaches={coaches}
                membershipPlans={membershipPlans}
                weeklySchedules={weeklySchedules}
                selectedAttendanceMonth={selectedMonth}
                selectedAttendanceYear={selectedYear}
            />
        </div>
    );
}
