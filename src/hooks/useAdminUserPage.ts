'use client';

import { useEffect, useRef, useState } from 'react';
import { getAdminUserPage, type AdminUserPage, type AdminUserPageFilters, type AdminUserPageKind } from '@/app/actions/admin-user-page.actions';

export const useAdminUserPage = (kind: AdminUserPageKind, initialPage: AdminUserPage, filters: AdminUserPageFilters) => {
    const [data, setData] = useState(initialPage);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const firstRender = useRef(true);
    const { query, role, status, coachId, specialty } = filters;

    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            const response = await getAdminUserPage(kind, { query, role, status, coachId, specialty, page });
            if (cancelled) return;
            if (response.ok) {
                setData(response.data);
                setError(null);
                if (response.data.page !== page) setPage(response.data.page);
            } else {
                setError(response.error);
            }
            setIsLoading(false);
        }, query ? 250 : 0);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [kind, query, role, status, coachId, specialty, page]);

    const refresh = async () => {
        setIsLoading(true);
        const response = await getAdminUserPage(kind, { query, role, status, coachId, specialty, page });
        if (response.ok) {
            setData(response.data);
            setError(null);
            if (response.data.page !== page) setPage(response.data.page);
        }
        else setError(response.error);
        setIsLoading(false);
    };

    return { data, page, setPage, isLoading, error, refresh };
};
