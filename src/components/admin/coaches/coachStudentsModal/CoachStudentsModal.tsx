'use client';

import { IoMdClose } from 'react-icons/io';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
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
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || !dialogRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled || !dialogRef.current) return;
            const context = gsap.context(() => {
                gsap.fromTo(dialogRef.current, { autoAlpha: 0, y: 20, scale: .98 }, { autoAlpha: 1, y: 0, scale: 1, duration: .3, ease: 'power2.out' });
                gsap.fromTo('.coach-student-item', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .25, stagger: .045, delay: .1, ease: 'power2.out', clearProps: 'all' });
            }, dialogRef);
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [isOpen, coach]);

    if (!isOpen || !coach) return null;

    const students = coach.coach?.students ?? [];

    return (
        <div className="user-modal-container">
            <div className="user-modal coach-students-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="coach-students-title">
                <div className="user-modal-header">
                    <div><span className="coach-students-eyebrow">{students.length} {students.length === 1 ? 'ALUMNO ASIGNADO' : 'ALUMNOS ASIGNADOS'}</span><h2 id="coach-students-title" className="user-modal-title">{coach.name || coach.email}</h2></div>
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
                                <Link className="coach-student-profile-link" href={`/admin/alumnos/${student.id}`} onClick={onClose}>Ver perfil</Link>
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
