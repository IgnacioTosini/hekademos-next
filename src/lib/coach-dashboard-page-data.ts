import { getCoachTodayAttendance } from '@/app/actions/attendance.actions';
import { getCommunityFeed } from '@/app/actions/community.actions';
import type { CoachDashboardStudent } from '@/components/platform/coach/coachDashboard/CoachDashboard';
import { prisma } from '@/lib/prisma';
import { getClassCategoryLabel } from '@/utils/class-category';
import { formatCurrency } from '@/utils/format';
import { getActiveMembership, getMembershipAmountCents } from '@/utils/membership';
import { getAmountWithLateSurcharge, getPaymentForPeriod, getPaymentMonthRange, getPaymentPeriodStart, shouldApplyLateSurcharge } from '@/utils/payment';
import { addMinutesToTime, dayLabels } from '@/utils/schedule';
import { getStudentName } from '@/utils/student';

export const getCoachDashboardPageData = async (userId: string) => {
    const today = new Date();
    const { start, end, dueDate } = getPaymentMonthRange(today);
    const currentPaymentWhere = {
        OR: [
            { periodStart: getPaymentPeriodStart(start) },
            { dueDate: { gte: start, lt: end } },
            { paidAt: { gte: start, lt: end } },
        ],
    };
    const currentPaymentSelect = {
        status: true,
        amountCents: true,
        currency: true,
        periodStart: true,
        dueDate: true,
        paidAt: true,
    } as const;
    const [coach, attendanceResponse, communityResponse] = await Promise.all([
        prisma.coach.findUnique({
            where: { userId },
            select: {
                bio: true,
                specialty: true,
                instagram: true,
                paymentAlias: true,
                paymentAccountHolder: true,
                user: {
                    select: { email: true, name: true, phone: true, image: true },
                },
                students: {
                    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        routineExcelUrl: true,
                        notes: true,
                        user: {
                            select: {
                                email: true,
                                name: true,
                                phone: true,
                                image: { select: { url: true } },
                            },
                        },
                        memberships: {
                            where: {
                                status: 'ACTIVE',
                                OR: [{ endDate: null }, { endDate: { gte: today } }],
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: {
                                status: true,
                                endDate: true,
                                monthlyPriceCents: true,
                                plan: {
                                    select: {
                                        name: true,
                                        trainingDaysPerWeek: true,
                                        priceCents: true,
                                        currency: true,
                                    },
                                },
                                payments: {
                                    where: currentPaymentWhere,
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                    select: currentPaymentSelect,
                                },
                            },
                        },
                        payments: {
                            where: currentPaymentWhere,
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: currentPaymentSelect,
                        },
                        schedules: {
                            where: { isActive: true },
                            select: {
                                weeklySchedule: {
                                    select: {
                                        classCategory: true,
                                        dayOfWeek: true,
                                        startTime: true,
                                        durationMinutes: true,
                                    },
                                },
                            },
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                },
            },
        }),
        getCoachTodayAttendance(),
        getCommunityFeed(),
    ]);

    if (!coach) return null;

    const students: CoachDashboardStudent[] = coach.students.map((student) => {
        const activeMembership = getActiveMembership(student.memberships, today);
        const membershipPayments = activeMembership?.payments ?? [];
        const currentMonthPayment = getPaymentForPeriod([...membershipPayments, ...student.payments], start, end);
        const rawPaymentStatus = activeMembership ? currentMonthPayment?.status ?? 'PENDING' : 'NO_MEMBERSHIP';
        const paymentStatus: CoachDashboardStudent['paymentStatus'] = rawPaymentStatus === 'PAID'
            ? 'PAID'
            : activeMembership ? 'PENDING' : 'NO_MEMBERSHIP';
        const baseAmountCents = getMembershipAmountCents(activeMembership);
        const isLate = paymentStatus === 'PENDING' && shouldApplyLateSurcharge(today, dueDate, currentMonthPayment?.status);
        const amountCents = currentMonthPayment?.status === 'PAID'
            ? currentMonthPayment.amountCents
            : baseAmountCents === null ? null : getAmountWithLateSurcharge(baseAmountCents, isLate);
        const currency = activeMembership?.plan.currency ?? currentMonthPayment?.currency ?? 'ARS';
        const schedules = student.schedules.map((scheduleAssignment) => {
            const schedule = scheduleAssignment.weeklySchedule;
            const endsAt = addMinutesToTime(schedule.startTime, schedule.durationMinutes);
            return `${getClassCategoryLabel(schedule.classCategory)} · ${dayLabels[schedule.dayOfWeek]} ${schedule.startTime}${endsAt ? ` a ${endsAt}` : ''}`;
        });

        return {
            id: student.id,
            name: getStudentName(student),
            email: student.user.email,
            phone: student.user.phone,
            imageUrl: student.user.image?.url ?? null,
            routineExcelUrl: student.routineExcelUrl,
            notes: student.notes,
            membershipName: activeMembership?.plan.name ?? null,
            trainingDaysPerWeek: activeMembership?.plan.trainingDaysPerWeek ?? null,
            schedules,
            monthlyPriceCents: baseAmountCents,
            paymentStatus,
            paymentAmountLabel: formatCurrency(amountCents, currency),
            isLate,
            hasActiveMembership: !!activeMembership,
        };
    });

    return {
        coach,
        students,
        attendanceSchedules: attendanceResponse.ok ? attendanceResponse.data : [],
        communityResponse,
    };
};
