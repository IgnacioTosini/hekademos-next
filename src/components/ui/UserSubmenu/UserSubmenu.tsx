'use client'

import { useEffect, useRef, useState } from 'react';
/* import { useAuth } from '../../context/authStore'; */
import { HiMiniUserCircle } from 'react-icons/hi2';
import './_userSubmenu.scss'
import Link from 'next/link';

export const UserSubmenu = () => {
    /* const { user, logout } = useAuth(); */
    const user = ''
    const logout = () => { }
    const [open, setOpen] = useState(false);
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
    const handleLogout = () => { setOpen(false); logout(); };

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
                            <Link href="/perfil" onClick={() => setOpen(false)}>
                                {/* Perfil {user?.name ? `(${user.name})` : ''} */}
                            </Link>
                        </li>
                        <li role="menuitem">
                            <button onClick={handleLogout}>Cerrar sesión</button>
                        </li>
                    </ul>
                ) : (
                    <ul role="menu" className="userSubmenu">
                        <li role="menuitem"><Link href="/auth/registro" onClick={() => setOpen(false)}>Iniciar sesión</Link></li>
                    </ul>
                )}
            </div>
        </div>
    );
}