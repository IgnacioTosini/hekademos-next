'use client';

import './_pagination.scss';

type Props = {
    page: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    label?: string;
};

export const Pagination = ({ page, pageSize, totalItems, onPageChange, label = 'resultados' }: Props) => {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    const firstPage = Math.max(1, Math.min(page - 2, totalPages - 4));
    const lastPage = Math.min(totalPages, firstPage + 4);
    const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
    const firstItem = (page - 1) * pageSize + 1;
    const lastItem = Math.min(page * pageSize, totalItems);

    return (
        <nav className="list-pagination" aria-label={`Páginas de ${label}`}>
            <p aria-live="polite">{firstItem}–{lastItem} de {totalItems} {label}</p>
            <div className="list-pagination-controls">
                <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">Anterior</button>
                {firstPage > 1 && <span aria-hidden="true">…</span>}
                {pages.map((number) => <button type="button" key={number} className={number === page ? 'is-current' : ''} aria-label={`Página ${number}`} aria-current={number === page ? 'page' : undefined} onClick={() => onPageChange(number)}>{number}</button>)}
                {lastPage < totalPages && <span aria-hidden="true">…</span>}
                <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} aria-label="Página siguiente">Siguiente</button>
            </div>
        </nav>
    );
};
