'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Navbar } from '../Navbar/Navbar'
import { AsideNavbar } from '../AsideNavbar/AsideNavbar';
import { UserSubmenu } from '../UserSubmenu/UserSubmenu';
import { handleScrollTo } from '@/utils';
import type { AuthUser } from '@/app/actions/auth.actions';

type Props = {
    user: AuthUser | null;
};

export const HeaderClient = ({ user }: Props) => {
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkIsMobile = () => {
            if (window.innerWidth <= 768) {
                setIsDashboardOpen(false);
            }
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const handleToggleDashboard = () => {
        setIsDashboardOpen(!isDashboardOpen);
    };

    const handleClick = () => {
        if (isDashboardOpen) {
            setIsDashboardOpen(false);
        }
        if (location.pathname !== '/') {
            router.push('/');
            return;
        }
        handleScrollTo('contacto');
    };

    return (
        <div className="header">
            <Image src="/LogoHekademos.png" alt="Hekademos Logo" className='logo' width={70} height={70} priority={true} quality={90} />
            <div className="headerRightSection">
                <Navbar onToggleMobileMenu={handleToggleDashboard} />
                <button className='button' onClick={handleClick}>
                    Sumate a Hekademos
                </button>
                <UserSubmenu user={user} />
                {isDashboardOpen && <AsideNavbar isOpen={isDashboardOpen} onClose={handleToggleDashboard} />}
            </div>
        </div>
    )
};
