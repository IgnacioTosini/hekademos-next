"use client";

import { useEffect, useRef, useState } from "react";
import { getAuditLogs, type AuditLogPage } from "@/app/actions/audit.actions";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import { Pagination } from "@/components/ui/pagination/Pagination";
import { actionFilterLabels, formatDate, getActionLabel, getAuditSummary, getEntityLabel, roleLabels, type ActionFilter, type ActorFilter } from "./auditSectionUtils";
import "./_auditSection.scss";

type Props = {
    initialPage: AuditLogPage;
};

export const AuditSection = ({ initialPage }: Props) => {
    const [query, setQuery] = useState("");
    const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
    const [actorFilter, setActorFilter] = useState<ActorFilter>("all");
    const [dateFilter, setDateFilter] = useState("");
    const [pageData, setPageData] = useState(initialPage);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const requestVersion = useRef(0);
    const firstLoad = useRef(true);
    const logs = pageData.logs;
    const resultsRef = useRef<HTMLDivElement>(null);
    const filtersInitialized = useRef(false);

    useEffect(() => {
        if (!filtersInitialized.current) { filtersInitialized.current = true; return; }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import("@/animations/gsapConfig").then(({ gsap }) => {
            if (cancelled || !resultsRef.current) return;
            const context = gsap.context(() => {
                gsap.fromTo(resultsRef.current, { autoAlpha: .65, y: 8 }, { autoAlpha: 1, y: 0, duration: .28, ease: "power2.out", clearProps: "all" });
            });
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [pageData]);

    useEffect(() => {
        if (firstLoad.current) { firstLoad.current = false; return; }
        const version = ++requestVersion.current;
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            const result = await getAuditLogs({ query, actionGroup: actionFilter, actorRole: actorFilter, date: dateFilter, page });
            if (version !== requestVersion.current) return;
            if (result.ok) {
                setPageData(result.data);
                setLoadError(null);
                if (result.data.page !== page) setPage(result.data.page);
            } else setLoadError(result.error);
            setIsLoading(false);
        }, query ? 250 : 0);
        return () => { requestVersion.current += 1; window.clearTimeout(timer); };
    }, [query, actionFilter, actorFilter, dateFilter, page]);

    const hasFilters = Boolean(query.trim() || actionFilter !== "all" || actorFilter !== "all" || dateFilter);

    const clearFilters = () => {
        setQuery("");
        setActionFilter("all");
        setActorFilter("all");
        setDateFilter("");
        setPage(1);
    };

    return (
        <section className="audit-section">
            <div className="audit-header">
                <div>
                    <span className="audit-eyebrow">ACTIVIDAD ADMINISTRATIVA</span>
                    <h1>Auditoría</h1>
                    <p>
                        {pageData.filteredTotal} de {pageData.total} movimientos{isLoading ? ' · Cargando...' : ''}.
                    </p>
                </div>
            </div>

            <div className="audit-table-wrapper">
                <div className="audit-table-toolbar">
                    <label>
                        <span>Acción</span>
                        <select
                            value={actionFilter}
                            onChange={(event) => { setActionFilter(event.target.value as ActionFilter); setPage(1); }}
                            aria-label="Filtrar por acción"
                        >
                            <option value="all">Todas</option>
                            <option value="payments">Pagos</option>
                            <option value="attendance">Asistencia</option>
                            <option value="students">Alumnos y horarios</option>
                            <option value="community">Comunidad</option>
                            <option value="content">Contenido web</option>
                            <option value="whatsapp">WhatsApp</option>
                        </select>
                    </label>

                    <label>
                        <span>Usuario</span>
                        <select
                            value={actorFilter}
                            onChange={(event) => { setActorFilter(event.target.value as ActorFilter); setPage(1); }}
                            aria-label="Filtrar por usuario"
                        >
                            <option value="all">Todos</option>
                            <option value="ADMIN">Admin</option>
                            <option value="COACH">Coach</option>
                            <option value="STUDENT">Alumno</option>
                        </select>
                    </label>

                    <label>
                        <span>Fecha</span>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(event) => { setDateFilter(event.target.value); setPage(1); }}
                            aria-label="Filtrar por fecha"
                        />
                    </label>

                    <label className="audit-search-field">
                        <span>Buscar</span>
                        <input
                            value={query}
                            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                            placeholder="Buscar usuario, registro o resumen..."
                            aria-label="Buscar auditoría"
                        />
                    </label>

                </div>

                {hasFilters && <div className="audit-active-filters" aria-label="Filtros activos">
                    {actionFilter !== "all" && <span>{actionFilterLabels[actionFilter]}</span>}
                    {actorFilter !== "all" && <span>{roleLabels[actorFilter]}</span>}
                    {dateFilter && <span>{dateFilter}</span>}
                    {query.trim() && <span>“{query.trim()}”</span>}
                    <button type="button" onClick={clearFilters}>Limpiar filtros</button>
                </div>}

                {loadError && <p role="alert">{loadError}</p>}
                <div ref={resultsRef} className="audit-results">{logs.length > 0 ? (
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Acción</th>
                                <th>Usuario</th>
                                <th>Registro</th>
                                <th>Resumen</th>
                            </tr>
                        </thead>

                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id}>
                                    <td data-label="Fecha"><time dateTime={new Date(log.createdAt).toISOString()}>{formatDate(log.createdAt)}</time></td>
                                    <td data-label="Acción">
                                        <span className="audit-action">{getActionLabel(log.action)}</span>
                                    </td>
                                    <td data-label="Usuario">
                                        <strong>{log.actorEmail ?? "Sin usuario"}</strong>
                                        {log.actorRole && <span>{roleLabels[log.actorRole]}</span>}
                                    </td>
                                    <td data-label="Registro">
                                        <strong>{getEntityLabel(log.entityType)}</strong>
                                    </td>
                                    <td data-label="Resumen" className="audit-detail">
                                        {getAuditSummary(log)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <EmptyState
                        compact
                        className="audit-empty"
                        title={pageData.total > 0 ? "Sin resultados" : "Sin movimientos"}
                        description={pageData.total > 0
                            ? "No hay movimientos que coincidan con los filtros."
                            : "Todavía no hay acciones registradas."}
                    />
                )}</div>
                <Pagination page={page} pageSize={20} totalItems={pageData.filteredTotal} onPageChange={setPage} label="movimientos" />
            </div>
        </section>
    );
};
