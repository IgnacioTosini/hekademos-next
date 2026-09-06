'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Navbar } from '../Navbar/Navbar'
import { AsideNavbar } from '../AsideNavbar/AsideNavbar';
import { UserSubmenu } from '../UserSubmenu/UserSubmenu';
import { handleScrollTo } from '@/utils';
import type { AuthUser } from '@/app/actions/auth.actions';
import type { HomePageContent } from '@/lib/home-page-content';

type Props = {
    user: AuthUser | null;
    content: HomePageContent['header'];
    navigation: HomePageContent['navigation'];
};

export const HeaderClient = ({ user, content, navigation }: Props) => {
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
        const sectionId = content.ctaHref.startsWith('/#') || content.ctaHref.startsWith('#') ? content.ctaHref.split('#')[1] : '';
        if (sectionId && location.pathname !== '/') {
            router.push(`/#${sectionId}`);
            return;
        }
        if (sectionId) return handleScrollTo(sectionId);
        if (/^https?:\/\//i.test(content.ctaHref)) return window.open(content.ctaHref, '_blank', 'noopener,noreferrer');
        router.push(content.ctaHref);
    };

    return (
        <div className="header">
            <Image src={content.logo.url} alt={content.logo.alt} className='logo' width={70} height={70} priority={true} quality={90} />
            <div className="headerRightSection">
                <Navbar onToggleMobileMenu={handleToggleDashboard} links={navigation.primaryLinks} />
                <button className='button' onClick={handleClick}>
                    {content.ctaLabel}
                </button>
                <UserSubmenu user={user} />
                {isDashboardOpen && <AsideNavbar isOpen={isDashboardOpen} onClose={handleToggleDashboard} content={content} links={navigation.menuLinks} />}
            </div>
        </div>
    )
};
