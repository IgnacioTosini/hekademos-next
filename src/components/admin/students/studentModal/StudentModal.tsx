'use client';

import { IoMdClose } from 'react-icons/io';
import type { WeeklyClassScheduleSummary } from '@/types/schema/classes';
import type { MembershipPlan } from '@/types/schema/memberships';
import type { UserWithRelations } from '@/types/schema/users';
import { StudentForm } from '../studentForm/StudentForm';
import '../../users/userModal/_userModal.scss';

type Props = {
    isOpen: boolean;
    student: UserWithRelations | null;
    coaches: UserWithRelations[];
    membershipPlans: MembershipPlan[];
    weeklySchedules: WeeklyClassScheduleSummary[];
    onClose: () => void;
};

export const StudentModal = ({ isOpen, student, coaches, membershipPlans, weeklySchedules, onClose }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="user-modal-container">
            <div className="user-modal">
                <div className="user-modal-header">
                    <h2 className="user-modal-title">{student ? 'Editar alumno' : 'Nuevo alumno'}</h2>
                    <button className="user-modal-close" type="button" onClick={onClose} aria-label="Cerrar modal">
                        <IoMdClose />
                    </button>
                </div>
                <StudentForm
                    student={student}
                    coaches={coaches}
                    membershipPlans={membershipPlans}
                    weeklySchedules={weeklySchedules}
                    onClose={onClose}
                />
            </div>
        </div>
    );
};
