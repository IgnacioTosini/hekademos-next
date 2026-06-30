'use client';

import { IoMdClose } from 'react-icons/io';
import type { UserWithRelations } from '@/types/schema/users';
import { UserForm } from '../userForm/UserForm';
import './_userModal.scss';

type Props = {
    isOpen: boolean;
    user: UserWithRelations | null;
    onClose: () => void;
};

export const UserModal = ({ isOpen, user, onClose }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="user-modal-container">
            <div className="user-modal">
                <div className="user-modal-header">
                    <h2 className="user-modal-title">{user ? 'Editar usuario' : 'Nuevo usuario'}</h2>
                    <button className="user-modal-close" type="button" onClick={onClose} aria-label="Cerrar modal">
                        <IoMdClose />
                    </button>
                </div>
                <UserForm user={user} onClose={onClose} />
            </div>
        </div>
    );
};
