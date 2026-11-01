'use client';

import { useEffect, useRef } from 'react';
import './_loadingState.scss';

type Props = { title?: string; description?: string; compact?: boolean; className?: string };

export function LoadingState({ title = 'Cargando', description, compact = false, className = '' }: Props) {
    const indicatorRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled || !indicatorRef.current) return;
            const context = gsap.context(() => {
                gsap.to(indicatorRef.current, { rotation: 360, duration: .8, ease: 'none', repeat: -1 });
            });
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, []);

    return (
        <div className={`loading-state${compact ? ' loading-state-compact' : ''}${className ? ` ${className}` : ''}`} role="status" aria-live="polite">
            <span className="loading-state-indicator" ref={indicatorRef} aria-hidden="true" />
            <strong>{title}</strong>
            {description && <p>{description}</p>}
        </div>
    );
}
