'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
import { handleScrollTo } from '@/utils';

type Props = {
    children: ReactNode;
};

export const HomeAnimations = ({ children }: Props) => {
    const { containerRef } = useScrollAnimations();

    useEffect(() => {
        const sectionId = window.location.hash.replace('#', '');
        if (!sectionId) return;

        const timeoutId = window.setTimeout(() => handleScrollTo(sectionId), 100);

        return () => window.clearTimeout(timeoutId);
    }, []);

    return (
        <div className="homePage" ref={containerRef}>
            {children}
        </div>
    );
};
