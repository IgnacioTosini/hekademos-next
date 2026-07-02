'use client';

import type { ReactNode } from 'react';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';

type Props = {
    children: ReactNode;
};

export const HomeAnimations = ({ children }: Props) => {
    const { containerRef } = useScrollAnimations();

    return (
        <div className="homePage" ref={containerRef}>
            {children}
        </div>
    );
};
