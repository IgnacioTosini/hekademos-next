import type { WeeklyClassScheduleSummary } from "@/types/schema/classes";
import type { MembershipPlan } from "@/types/schema/memberships";
import type { AdminStudentProfile, UserWithRelations } from "@/types/schema/users";
import {
    getStudentProfilePaymentSummary,
    StudentProfileContent,
} from "../studentProfileContent/StudentProfileContent";
import { StudentProfileAdminActions } from "../studentProfileAdminActions/StudentProfileAdminActions";
import "./_studentProfileSection.scss";

type Props = {
    student: AdminStudentProfile;
    studentUser: UserWithRelations;
    coaches: UserWithRelations[];
    membershipPlans: MembershipPlan[];
    weeklySchedules: WeeklyClassScheduleSummary[];
    selectedAttendanceMonth?: number;
    selectedAttendanceYear?: number;
};

export const StudentProfileSection = ({
    student,
    studentUser,
    coaches,
    membershipPlans,
    weeklySchedules,
    selectedAttendanceMonth,
    selectedAttendanceYear,
}: Props) => {
    const paymentSummary = getStudentProfilePaymentSummary(student);

    return (
        <section className="student-profile-section">
            <StudentProfileContent
                student={student}
                backHref="/admin/alumnos"
                backLabel="Volver a alumnos"
                paymentsHref="/admin/pagos"
                attendanceBaseHref={`/admin/alumnos/${student.id}`}
                selectedAttendanceMonth={selectedAttendanceMonth}
                selectedAttendanceYear={selectedAttendanceYear}
                actions={(
                    <StudentProfileAdminActions
                        student={studentUser}
                        coaches={coaches}
                        membershipPlans={membershipPlans}
                        weeklySchedules={weeklySchedules}
                        paymentStatus={paymentSummary.status}
                        hasActiveMembership={!!paymentSummary.activeMembership}
                    />
                )}
            />
        </section>
    );
};
