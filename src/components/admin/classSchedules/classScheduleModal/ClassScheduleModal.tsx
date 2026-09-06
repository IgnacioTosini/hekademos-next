'use client';

import { IoMdClose } from 'react-icons/io';
import type { ClassCategoryOption } from '@/types/schema/common';
import type { WeeklyClassScheduleWithRelations } from '@/types/schema/classes';
import type { UserWithRelations } from '@/types/schema/users';
import { ClassScheduleForm } from '../classScheduleForm/ClassScheduleForm';
import './_classScheduleModal.scss';

type Props = {
    isOpen: boolean;
    schedule: WeeklyClassScheduleWithRelations | null;
    coaches: UserWithRelations[];
    categories: ClassCategoryOption[];
    onClose: () => void;
};

export const ClassScheduleModal = ({ isOpen, schedule, coaches, categories, onClose }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="class-schedule-modal-container">
            <div className="class-schedule-modal">
                <div className="class-schedule-modal-header">
                    <h2>{schedule ? 'Editar turno' : 'Nuevo turno'}</h2>
                    <button type="button" onClick={onClose} aria-label="Cerrar modal">
                        <IoMdClose />
                    </button>
                </div>

                <ClassScheduleForm schedule={schedule} coaches={coaches} categories={categories} onClose={onClose} />
            </div>
        </div>
    );
};
