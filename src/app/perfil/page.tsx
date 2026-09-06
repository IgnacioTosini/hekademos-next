import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getWeeklyClassSchedules } from "@/app/actions/class.actions";
import { getCommunityFeed } from "@/app/actions/community.actions";
import { getCurrentAuthSession } from "@/lib/auth-session";
import { getEffectiveScheduleStudentIds, getOneTimeScheduleChangesForDate } from "@/lib/one-time-schedule-change";
import { prisma } from "@/lib/prisma";
import { ChangePasswordButton } from "@/components/account/changePasswordButton/ChangePasswordButton";
import { StudentProfileContent } from "@/components/admin/students/studentProfile/studentProfileContent/StudentProfileContent";
import { LogoutIconButton } from "@/components/auth/logoutIconButton/LogoutIconButton";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { StudentProfileEditor } from "@/components/platform/student/studentProfileEditor/StudentProfileEditor";
import { StudentRoutineEditor } from "@/components/platform/student/studentRoutineEditor/StudentRoutineEditor";
import { StudentScheduleChangeRequest } from "@/components/platform/student/studentScheduleChangeRequest/StudentScheduleChangeRequest";
import { getLocalDayRange, getNextScheduleOccurrence } from "@/utils/schedule";
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

    const { start: todayStart } = getLocalDayRange(new Date());
    const oneTimeCandidateStart = new Date(todayStart);

    oneTimeCandidateStart.setDate(oneTimeCandidateStart.getDate() - 7);

    const [student, schedulesResponse, communityResponse] = await Promise.all([
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
                scheduleChangeRequests: {
                    where: {
                        type: "ONE_TIME",
                        status: "APPROVED",
                        requestedDate: {
                            gte: oneTimeCandidateStart,
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 10,
                },
            },
        }),
        getWeeklyClassSchedules(),
        getCommunityFeed(),
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
    const now = new Date();
    const temporaryScheduleChangeCandidate = student.scheduleChangeRequests
        .flatMap((request) => {
            const sourceScheduleId = request.currentScheduleIds[0];
            const requestedScheduleId = request.requestedScheduleIds[0];
            const sourceSchedule = weeklySchedules.find((schedule) => schedule.id === sourceScheduleId);
            const requestedSchedule = weeklySchedules.find((schedule) => schedule.id === requestedScheduleId);

            if (
                !request.requestedDate
                || request.currentScheduleIds.length !== 1
                || request.requestedScheduleIds.length !== 1
                || !sourceSchedule
                || !requestedSchedule
            ) {
                return [];
            }

            const sourceDate = getNextScheduleOccurrence(sourceSchedule, request.createdAt);
            const lastAffectedDate = sourceDate > request.requestedDate ? sourceDate : request.requestedDate;
            const expiresAt = getLocalDayRange(lastAffectedDate).end;

            if (expiresAt <= now) return [];

            return [{
                id: request.id,
                sourceScheduleId,
                sourceDate,
                sourceSchedule,
                requestedDate: request.requestedDate,
                expiresAt,
                weeklySchedule: requestedSchedule,
            }];
        })[0] ?? null;
    const temporaryScheduleChange = temporaryScheduleChangeCandidate
        ? await (async () => {
            const firstAffectedDate = temporaryScheduleChangeCandidate.sourceDate < temporaryScheduleChangeCandidate.requestedDate
                ? temporaryScheduleChangeCandidate.sourceDate
                : temporaryScheduleChangeCandidate.requestedDate;
            let cancelDisabledReason: string | null = null;

            if (firstAffectedDate <= now) {
                cancelDisabledReason = "La primera clase involucrada ya comenzó y el cambio no se puede cancelar.";
            } else if (temporaryScheduleChangeCandidate.sourceSchedule.capacity !== null) {
                const [changes, sourceAssignments] = await Promise.all([
                    getOneTimeScheduleChangesForDate(temporaryScheduleChangeCandidate.sourceDate),
                    prisma.studentScheduleAssignment.findMany({
                        where: {
                            weeklyScheduleId: temporaryScheduleChangeCandidate.sourceSchedule.id,
                            isActive: true,
                        },
                        select: {
                            studentId: true,
                        },
                    }),
                ]);
                const effectiveStudentIds = getEffectiveScheduleStudentIds({
                    scheduleId: temporaryScheduleChangeCandidate.sourceSchedule.id,
                    fixedStudentIds: sourceAssignments.map((assignment) => assignment.studentId),
                    changes,
                });
                const occupiedAfterCancellation = new Set([...effectiveStudentIds, student.id]).size;

                if (occupiedAfterCancellation > temporaryScheduleChangeCandidate.sourceSchedule.capacity) {
                    cancelDisabledReason = "Tu lugar en el horario habitual ya fue ocupado. Comunicate con administración.";
                }
            }

            return {
                ...temporaryScheduleChangeCandidate,
                canCancel: cancelDisabledReason === null,
                cancelDisabledReason,
            };
        })()
        : null;

    return (
        <main className="perfil-page">
            <LogoutIconButton />
            <StudentProfileContent
                student={sanitizedStudent}
                temporaryScheduleChange={temporaryScheduleChange}
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
                        activeOneTimeChange={temporaryScheduleChange}
                        referenceDate={now}
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
                allowPaymentReport
                attendanceBaseHref="/perfil"
                selectedAttendanceMonth={attendancePeriod.selectedMonth}
                selectedAttendanceYear={attendancePeriod.selectedYear}
            />
            {communityResponse.ok && <CommunityFeed data={communityResponse.data} embedded />}
        </main>
    );
}
