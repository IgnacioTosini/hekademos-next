'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IoExitOutline } from 'react-icons/io5';
import { logout } from '@/app/actions/auth.actions';
import './_logoutIconButton.scss';

export const LogoutIconButton = () => {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleLogout = () => {
        startTransition(async () => {
            await logout();
            router.replace('/auth/login');
            router.refresh();
        });
    };

    return (
        <button
            className="logout-icon-button"
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
        >
            <IoExitOutline />
        </button>
    );
};
