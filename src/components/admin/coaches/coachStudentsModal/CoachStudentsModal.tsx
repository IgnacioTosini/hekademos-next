'use client';

import { IoMdClose } from 'react-icons/io';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import type { UserWithRelations } from '@/types/schema/users';
import { getStudentName } from '@/utils/student';
import '../../users/userModal/_userModal.scss';
import './_coachStudentsModal.scss';

type Props = {
    isOpen: boolean;
    coach: UserWithRelations | null;
    onClose: () => void;
};

export const CoachStudentsModal = ({ isOpen, coach, onClose }: Props) => {
    if (!isOpen || !coach) return null;

    const students = coach.coach?.students ?? [];

    return (
        <div className="user-modal-container">
            <div className="user-modal coach-students-modal">
                <div className="user-modal-header">
                    <h2 className="user-modal-title">Alumnos de {coach.name || coach.email}</h2>
                    <button className="user-modal-close" type="button" onClick={onClose} aria-label="Cerrar modal">
                        <IoMdClose />
                    </button>
                </div>

                <div className="coach-students-list">
                    {students.length > 0 ? (
                        students.map((student) => (
                            <div className="coach-student-item" key={student.id}>
                                <div className="user-info">
                                    <div className="user-avatar">
                                        <span>{getStudentName(student).slice(0, 2).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <strong>{getStudentName(student)}</strong>
                                        <span>{student.user?.email ?? 'Sin email'}</span>
                                    </div>
                                </div>
                                <span className="user-badge">
                                    {student.routineExcelUrl ? 'Con rutina' : 'Sin rutina'}
                                </span>
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            compact
                            title="Sin alumnos asignados"
                            description="Este coach todavia no tiene alumnos vinculados."
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
