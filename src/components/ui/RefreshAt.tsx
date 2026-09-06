"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PrismaDate } from "@/types/schema/common";

type Props = {
    value: PrismaDate;
};

export const RefreshAt = ({ value }: Props) => {
    const router = useRouter();

    useEffect(() => {
        const delay = new Date(value).getTime() - Date.now();

        if (delay <= 0) {
            router.refresh();
            return;
        }

        const timeoutId = window.setTimeout(() => router.refresh(), delay);

        return () => window.clearTimeout(timeoutId);
    }, [router, value]);

    return null;
};
