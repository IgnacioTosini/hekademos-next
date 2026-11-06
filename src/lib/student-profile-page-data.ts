import { getWeeklyClassSchedules } from "@/app/actions/class.actions";
import { getCommunityFeed } from "@/app/actions/community.actions";
import { getEffectiveScheduleStudentIds, getOneTimeScheduleChangesForDate } from "@/lib/one-time-schedule-change";
import { prisma } from "@/lib/prisma";
import { getPaymentMonthRange, getPaymentPeriodStart } from "@/utils/payment";
import { getLocalDayRange, getNextScheduleOccurrence } from "@/utils/schedule";

type ProfileParams = { month?: string; year?: string; paymentPage?: string };

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

export const getStudentProfilePageData = async (userId: string, params?: ProfileParams) => {
    const attendancePeriod = getSelectedAttendancePeriod(params?.month, params?.year);
    const requestedPaymentPage = Number(params?.paymentPage);
    const { start: todayStart } = getLocalDayRange(new Date());
    const oneTimeCandidateStart = new Date(todayStart);
    oneTimeCandidateStart.setDate(oneTimeCandidateStart.getDate() - 7);
    const now = new Date();
    const { start: paymentMonthStart, end: paymentMonthEnd } = getPaymentMonthRange(now);

    const [student, schedulesResponse, communityResponse] = await Promise.all([
        prisma.student.findUnique({
            where: { userId },
            include: {
                user: { omit: { passwordHash: true }, include: { image: true } },
                coach: {
                    include: {
                        user: { omit: { passwordHash: true }, include: { image: true } },
                    },
                },
                memberships: {
                    where: {
                        status: "ACTIVE",
                        OR: [{ endDate: null }, { endDate: { gte: now } }],
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: { plan: true },
                },
                payments: {
                    where: {
                        OR: [
                            { periodStart: getPaymentPeriodStart(paymentMonthStart) },
                            { dueDate: { gte: paymentMonthStart, lt: paymentMonthEnd } },
                            { paidAt: { gte: paymentMonthStart, lt: paymentMonthEnd } },
                        ],
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                _count: { select: { payments: true } },
                attendance: {
                    where: {
                        session: { startsAt: { gte: attendancePeriod.start, lt: attendancePeriod.end } },
                    },
                    orderBy: { createdAt: "desc" },
                    include: { session: { include: { schedule: true } } },
                },
                schedules: {
                    where: { isActive: true },
                    include: { weeklySchedule: true },
                    orderBy: { createdAt: "asc" },
                },
                scheduleChangeRequests: {
                    where: {
                        type: "ONE_TIME",
                        status: "APPROVED",
                        requestedDate: { gte: oneTimeCandidateStart },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
        }),
        getWeeklyClassSchedules(),
        getCommunityFeed(),
    ]);

    if (!student) return null;

    const paymentHistoryTotal = student._count.payments;
    const paymentHistoryPages = Math.max(1, Math.ceil(paymentHistoryTotal / 8));
    const paymentHistoryPage = Number.isInteger(requestedPaymentPage) && requestedPaymentPage > 0
        ? Math.min(requestedPaymentPage, paymentHistoryPages)
        : 1;
    const paymentHistoryParams = new URLSearchParams({
        month: String(attendancePeriod.selectedMonth),
        year: String(attendancePeriod.selectedYear),
    });
    const weeklySchedules = schedulesResponse.ok ? schedulesResponse.data : [];

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
            ) return [];

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
                        select: { studentId: true },
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

    return {
        student,
        communityResponse,
        attendancePeriod,
        paymentHistoryTotal,
        paymentHistoryPage,
        paymentHistoryParams,
        weeklySchedules,
        temporaryScheduleChange,
        now,
    };
};
