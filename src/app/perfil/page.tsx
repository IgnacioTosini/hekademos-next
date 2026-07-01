import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWeeklyClassSchedules } from "@/app/actions/class.actions";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { LogoutIconButton } from "@/components/auth/logoutIconButton/LogoutIconButton";
import { ChangePasswordButton } from "@/components/account/changePasswordButton/ChangePasswordButton";
import { StudentProfileContent } from "@/components/admin/students/studentProfile/studentProfileContent/StudentProfileContent";
import { StudentProfileEditor } from "@/components/platform/student/studentProfileEditor/StudentProfileEditor";
import { StudentRoutineEditor } from "@/components/platform/student/studentRoutineEditor/StudentRoutineEditor";
import { StudentScheduleChangeRequest } from "@/components/platform/student/studentScheduleChangeRequest/StudentScheduleChangeRequest";
import "./_perfilPage.scss";

export const metadata: Metadata = {
    title: "Mi perfil",
    description: "Perfil del alumno en Hekademos.",
};

type Props = {
    searchParams?: Promise<{
        month?: string;
        year?: string;
    }>;
};

const getSelectedAttendancePeriod = (month?: string, year?: string) => {
    const today = new Date();
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    const selectedMonth = Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
        ? parsedMonth
        : today.getMonth() + 1;
    const selectedYear = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
        ? parsedYear
        : today.getFullYear();

    return {
        selectedMonth,
        selectedYear,
        start: new Date(selectedYear, selectedMonth - 1, 1),
        end: new Date(selectedYear, selectedMonth, 1),
    };
};

export default async function PerfilPage({ searchParams }: Props) {
    const params = await searchParams;
    const attendancePeriod = getSelectedAttendancePeriod(params?.month, params?.year);
    const session = await getCurrentAuthSession();

    if (!session) {
        redirect("/auth/login?next=/perfil");
    }

    if (session.role === "ADMIN") {
        redirect("/admin");
    }

    if (session.role === "COACH") {
        redirect("/coach/dashboard");
    }

    const [student, schedulesResponse] = await Promise.all([
        prisma.student.findUnique({
            where: {
                userId: session.userId,
            },
            include: {
                user: {
                    include: {
                        image: true,
                    },
                },
                coach: {
                    include: {
                        user: {
                            include: {
                                image: true,
                            },
                        },
                    },
                },
                memberships: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        plan: true,
                        payments: {
                            orderBy: {
                                createdAt: "desc",
                            },
                        },
                    },
                },
                payments: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
                attendance: {
                    where: {
                        session: {
                            startsAt: {
                                gte: attendancePeriod.start,
                                lt: attendancePeriod.end,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    include: {
                        session: {
                            include: {
                                schedule: true,
                            },
                        },
                    },
                },
                schedules: {
                    where: {
                        isActive: true,
                    },
                    include: {
                        weeklySchedule: true,
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        }),
        getWeeklyClassSchedules(),
    ]);

    if (!student) {
        redirect("/");
    }

    const sanitizedStudent = {
        ...student,
        user: {
            ...student.user,
            passwordHash: null,
        },
        coach: student.coach
            ? {
                ...student.coach,
                user: {
                    ...student.coach.user,
                    passwordHash: null,
                },
            }
            : student.coach,
    };
    const weeklySchedules = schedulesResponse.ok ? schedulesResponse.data : [];

    return (
        <main className="perfil-page">
            <LogoutIconButton />
            <StudentProfileContent
                student={sanitizedStudent}
                actions={(
                    <div className="student-profile-actions">
                        <StudentProfileEditor
                            student={sanitizedStudent}
                        />
                        <ChangePasswordButton />
                    </div>
                )}
                scheduleActions={(
                    <StudentScheduleChangeRequest
                        student={sanitizedStudent}
                        weeklySchedules={weeklySchedules}
                    />
                )}
                routineActions={(
                    <StudentRoutineEditor
                        routineExcelUrl={sanitizedStudent.routineExcelUrl}
                    />
                )}
                showInternalNotes={false}
                attendanceBaseHref="/perfil"
                selectedAttendanceMonth={attendancePeriod.selectedMonth}
                selectedAttendanceYear={attendancePeriod.selectedYear}
            />
        </main>
    );
}
