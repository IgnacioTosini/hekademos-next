import { redirect } from 'next/navigation';
import { getCoachTodayAttendance } from '@/app/actions/attendance.actions';
import { getCommunityFeed } from '@/app/actions/community.actions';
import { ChangePasswordButton } from '@/components/account/changePasswordButton/ChangePasswordButton';
import { LogoutIconButton } from '@/components/auth/logoutIconButton/LogoutIconButton';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { CoachDashboard, type CoachDashboardStudent } from '@/components/platform/coach/coachDashboard/CoachDashboard';
import { CoachProfileEditor } from '@/components/platform/coach/coachProfileEditor/CoachProfileEditor';
import { getCurrentAuthSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { getClassCategoryLabel } from '@/utils/class-category';
import { formatCurrency } from '@/utils/format';
import { getActiveMembership, getMembershipAmountCents } from '@/utils/membership';
import { getAmountWithLateSurcharge, getPaymentForPeriod, getPaymentMonthRange, shouldApplyLateSurcharge } from '@/utils/payment';
import { addMinutesToTime, dayLabels } from '@/utils/schedule';
import { getStudentName } from '@/utils/student';
import './_coachDashboardPage.scss';

export default async function CoachDashboardPage() {
    const session = await getCurrentAuthSession();

    if (!session) {
        redirect('/auth/login?next=/coach/dashboard');
    }

    if (session.role === 'ADMIN') {
        redirect('/admin');
    }

    if (session.role !== 'COACH') {
        redirect('/perfil');
    }

    const [coach, attendanceResponse, communityResponse] = await Promise.all([
        prisma.coach.findUnique({
        where: {
            userId: session.userId,
        },
        include: {
            user: {
                include: {
                    image: true,
                },
            },
            students: {
                orderBy: [
                    {
                        firstName: 'asc',
                    },
                    {
                        lastName: 'asc',
                    },
                ],
                include: {
                    user: {
                        include: {
                            image: true,
                        },
                    },
                    memberships: {
                        orderBy: {
                            createdAt: 'desc',
                        },
                        include: {
                            plan: true,
                            payments: {
                                orderBy: {
                                    createdAt: 'desc',
                                },
                            },
                        },
                    },
                    payments: {
                        orderBy: {
                            createdAt: 'desc',
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
                            createdAt: 'asc',
                        },
                    },
                },
            },
        },
        }),
        getCoachTodayAttendance(),
        getCommunityFeed(),
    ]);

    if (!coach) {
        redirect('/');
    }

    const today = new Date();
    const attendanceSchedules = attendanceResponse.ok ? attendanceResponse.data : [];
    const { start, end, dueDate } = getPaymentMonthRange(today);
    const students: CoachDashboardStudent[] = coach.students.map((student) => {
        const activeMembership = getActiveMembership(student.memberships, today);
        const membershipPayments = activeMembership?.payments ?? [];
        const currentMonthPayment = getPaymentForPeriod([...membershipPayments, ...student.payments], start, end);
        const rawPaymentStatus = activeMembership ? currentMonthPayment?.status ?? 'PENDING' : 'NO_MEMBERSHIP';
        const paymentStatus: CoachDashboardStudent['paymentStatus'] = rawPaymentStatus === 'PAID'
            ? 'PAID'
            : activeMembership
                ? 'PENDING'
                : 'NO_MEMBERSHIP';
        const baseAmountCents = getMembershipAmountCents(activeMembership);
        const isLate = paymentStatus === 'PENDING' && shouldApplyLateSurcharge(today, dueDate, currentMonthPayment?.status);
        const amountCents = currentMonthPayment?.status === 'PAID'
            ? currentMonthPayment.amountCents
            : baseAmountCents === null
                ? null
                : getAmountWithLateSurcharge(baseAmountCents, isLate);
        const currency = activeMembership?.plan.currency ?? currentMonthPayment?.currency ?? 'ARS';
        const schedules = student.schedules
            .map((scheduleAssignment) => {
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

    return (
        <main className="coach-dashboard-page">
            <LogoutIconButton />
            <CoachDashboard
                coachName={coach.user.name || coach.user.email}
                students={students}
                attendanceSchedules={attendanceSchedules}
                accountActions={(
                    <>
                        <CoachProfileEditor
                            account={{
                                email: coach.user.email,
                                name: coach.user.name,
                                phone: coach.user.phone,
                                bio: coach.bio,
                                specialty: coach.specialty,
                                instagram: coach.instagram,
                                paymentAlias: coach.paymentAlias,
                                paymentAccountHolder: coach.paymentAccountHolder,
                                image: coach.user.image,
                            }}
                        />
                        <ChangePasswordButton />
                    </>
                )}
            />
            {communityResponse.ok && <CommunityFeed data={communityResponse.data} embedded />}
        </main>
    )
}
