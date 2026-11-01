'use client';

import { IoMdClose } from 'react-icons/io';
import type { UserWithRelations } from '@/types/schema/users';
import { CoachForm } from '../coachForm/CoachForm';
import '../../users/userModal/_userModal.scss';
import './_coachModal.scss';

type Props = {
    isOpen: boolean;
    coach: UserWithRelations | null;
    onClose: () => void;
};

export const CoachModal = ({ isOpen, coach, onClose }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="user-modal-container">
            <div className="user-modal coach-modal">
                <div className="user-modal-header">
                    <div><span className="coach-modal-eyebrow">EQUIPO HEKADEMOS</span><h2 className="user-modal-title">{coach ? 'Editar coach' : 'Nuevo coach'}</h2></div>
                    <button className="user-modal-close" type="button" onClick={onClose} aria-label="Cerrar modal">
                        <IoMdClose />
                    </button>
                </div>
                <CoachForm coach={coach} onClose={onClose} />
            </div>
        </div>
    );
};
