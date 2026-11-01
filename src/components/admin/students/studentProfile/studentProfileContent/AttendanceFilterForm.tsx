"use client";

import { useEffect, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Props = { baseHref: string; children: ReactNode };

export function AttendanceFilterForm({ baseHref, children }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const indicatorRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!isPending || !indicatorRef.current) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import("@/animations/gsapConfig").then(({ gsap }) => {
            if (cancelled || !indicatorRef.current) return;
            const context = gsap.context(() => {
                gsap.to(indicatorRef.current, { rotation: 360, duration: .8, ease: "none", repeat: -1 });
            });
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [isPending]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isPending) return;
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams({
            month: String(data.get("month") ?? ""),
            year: String(data.get("year") ?? ""),
        });
        startTransition(() => router.push(`${baseHref}?${params}`, { scroll: false }));
    };

    return (
        <form className="student-profile-attendance-filters" onSubmit={handleSubmit} aria-busy={isPending}>
            {children}
            <button type="submit" disabled={isPending}>
                {isPending && <span ref={indicatorRef} className="student-profile-loading-indicator" aria-hidden="true" />}
                {isPending ? "Buscando..." : "Ver"}
            </button>
        </form>
    );
}
