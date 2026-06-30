'use client'

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HiMiniUserCircle } from 'react-icons/hi2';
import Link from 'next/link';
import { logout, type AuthUser } from '@/app/actions/auth.actions';
import './_userSubmenu.scss'

type Props = {
    user: AuthUser | null;
};

export const UserSubmenu = ({ user }: Props) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onEsc);
        };
    }, []);

    const toggle = () => setOpen(v => !v);
    const handleLogout = () => {
        setOpen(false);
        startTransition(async () => {
            await logout();
            router.replace('/auth/login');
            router.refresh();
        });
    };

    const profileHref = user?.role === 'COACH'
        ? '/coach/dashboard'
        : user?.role === 'ADMIN'
            ? '/admin'
            : '/perfil';

    return (
        <div className="userSubmenuWrapper" ref={ref}>
            <HiMiniUserCircle className="userIconBtn"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={toggle}
                title="Cuenta"
            />

            <div className={`userSubmenuContainer ${open ? 'open' : ''}`}>
                {user ? (
                    <ul role="menu" className="userSubmenu">
                        <li role="menuitem">
                            <Link href={profileHref} onClick={() => setOpen(false)}>
                                {user.name ? `Perfil (${user.name})` : 'Mi perfil'}
                            </Link>
                        </li>
                        <li role="menuitem">
                            <button onClick={handleLogout} disabled={isPending}>
                                {isPending ? 'Saliendo...' : 'Cerrar sesión'}
                            </button>
                        </li>
                    </ul>
                ) : (
                    <ul role="menu" className="userSubmenu">
                        <li role="menuitem"><Link href="/auth/login" onClick={() => setOpen(false)}>Iniciar sesión</Link></li>
                    </ul>
                )}
            </div>
        </div>
    );
}
