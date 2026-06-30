'use client';

import { IoMdClose } from 'react-icons/io';
import type { MembershipPlanWithRelations } from '@/types/schema/memberships';
import { MembershipPlanForm } from '../membershipPlanForm/MembershipPlanForm';
import './_membershipPlanModal.scss';

type Props = {
    isOpen: boolean;
    plan: MembershipPlanWithRelations | null;
    onClose: () => void;
};

export const MembershipPlanModal = ({ isOpen, plan, onClose }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="membership-plan-modal-container">
            <div className="membership-plan-modal">
                <div className="membership-plan-modal-header">
                    <h2>{plan ? 'Editar plan' : 'Nuevo plan'}</h2>
                    <button type="button" onClick={onClose} aria-label="Cerrar modal">
                        <IoMdClose />
                    </button>
                </div>

                <MembershipPlanForm plan={plan} onClose={onClose} />
            </div>
        </div>
    );
};
