import { useMemo, useState } from 'react';

export const usePagination = <T,>(items: T[], pageSize: number, resetKey = '') => {
    const [selection, setSelection] = useState({ key: resetKey, page: 1 });
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(selection.key === resetKey ? selection.page : 1, totalPages);
    const pageItems = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);

    const setPage = (nextPage: number) => {
        setSelection({ key: resetKey, page: Math.max(1, nextPage) });
    };

    return {
        page,
        pageSize,
        totalPages,
        pageItems,
        setPage,
    };
};
