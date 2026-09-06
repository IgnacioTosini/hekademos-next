'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaCheck, FaUndo } from 'react-icons/fa';
import { markCurrentMonthPaymentPaid, markCurrentMonthPaymentPending } from '@/app/actions/payment.actions';
import type { WeeklyClassScheduleSummary } from '@/types/schema/classes';
import type { MembershipPlan } from '@/types/schema/memberships';
import type { PaymentOverviewStatus } from '@/types/schema/payments';
import type { UserWithRelations } from '@/types/schema/users';
import { StudentModal } from '../../studentModal/StudentModal';
import './_studentProfileAdminActions.scss';

type Props = {
    student: UserWithRelations;
    coaches: UserWithRelations[];
    membershipPlans: MembershipPlan[];
    weeklySchedules: WeeklyClassScheduleSummary[];
    paymentStatus: PaymentOverviewStatus;
    hasActiveMembership: boolean;
};

export const StudentProfileAdminActions = ({
    student,
    coaches,
    membershipPlans,
    weeklySchedules,
    paymentStatus,
    hasActiveMembership,
}: Props) => {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const studentId = student.student?.id;
    const isPaid = paymentStatus === 'PAID';

    const handlePaymentToggle = () => {
        if (!studentId || !hasActiveMembership) return;

        startTransition(async () => {
            const result = isPaid
                ? await markCurrentMonthPaymentPending(studentId)
                : await markCurrentMonthPaymentPaid(studentId);

            if (result.ok) {
                toast.success(isPaid ? 'Pago desmarcado' : 'Pago marcado como pagado');
                router.refresh();
                return;
            }

            toast.error(result.error);
        });
    };

    return (
        <>
            <div className="student-profile-admin-actions">
                <button type="button" onClick={() => setIsModalOpen(true)}>
                    Editar alumno
                </button>

                <button
                    type="button"
                    onClick={handlePaymentToggle}
                    disabled={!hasActiveMembership || isPending}
                >
                    {isPaid ? <FaUndo /> : <FaCheck />}
                    {isPending ? 'Guardando' : isPaid ? 'Desmarcar pago' : 'Marcar pagado'}
                </button>

                <Link href="/admin/pagos">Ver pagos</Link>
            </div>

            <StudentModal
                isOpen={isModalOpen}
                student={student}
                coaches={coaches}
                membershipPlans={membershipPlans}
                weeklySchedules={weeklySchedules}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};
