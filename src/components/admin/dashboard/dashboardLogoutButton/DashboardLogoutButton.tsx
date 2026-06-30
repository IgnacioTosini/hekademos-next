'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IoExitOutline } from 'react-icons/io5';
import { logout } from '@/app/actions/auth.actions';
import './_dashboardLogoutButton.scss';

export const DashboardLogoutButton = () => {
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
            className="dashboard-logout-button"
            type="button"
            onClick={handleLogout}
            disabled={isPending}
        >
            <IoExitOutline />
            {isPending ? 'Saliendo' : 'Cerrar sesion'}
        </button>
    );
};
