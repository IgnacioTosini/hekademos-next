'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteMembershipPlan } from '@/app/actions/membership.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import { usePagination } from '@/hooks/usePagination';
import type { ClassCategoryOption } from '@/types/schema/common';
import type { MembershipPlanWithRelations } from '@/types/schema/memberships';
import { getClassCategoryLabel } from '@/utils/class-category';
import { formatCurrency } from '@/utils/format';
import './_membershipPlansSection.scss';

const MembershipPlanModal = dynamic(() => import('../membershipPlanModal/MembershipPlanModal').then((module) => module.MembershipPlanModal));

type Props = {
    plans: MembershipPlanWithRelations[];
    categories: ClassCategoryOption[];
};

export const MembershipPlansSection = ({ plans, categories }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const tableRef = useRef<HTMLTableSectionElement>(null);
    const filtersInitialized = useRef(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlanWithRelations | null>(null);
    const [planToDelete, setPlanToDelete] = useState<MembershipPlanWithRelations | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const cancelDeleteRef = useRef<HTMLButtonElement>(null);

    const filteredPlans = useMemo(() => {
        const search = query.trim().toLowerCase();

        return plans.filter((plan) => {
            if (categoryFilter !== 'ALL' && getClassCategoryLabel(plan.classCategory) !== categoryFilter) return false;
            if (statusFilter !== 'ALL' && (plan.isActive ? 'ACTIVE' : 'INACTIVE') !== statusFilter) return false;
            if (!search) return true;
            const values = [
                plan.name,
                getClassCategoryLabel(plan.classCategory),
                plan.currency,
                `${plan.trainingDaysPerWeek}`,
                plan.isActive ? 'activo' : 'inactivo',
                plan.isRecommended ? 'recomendado' : '',
                categories.find((category) => category.name === plan.classCategory)?.isSpecialActivity ? 'evento especial' : '',
            ];

            return values.some((value) => value.toLowerCase().includes(search));
        });
    }, [categories, plans, query, categoryFilter, statusFilter]);
    const planPages = usePagination(filteredPlans, 12, `${query}|${categoryFilter}|${statusFilter}`);

    useEffect(() => {
        if (!filtersInitialized.current) { filtersInitialized.current = true; return; }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let cancelled = false;
        let cleanup: (() => void) | undefined;
        void import('@/animations/gsapConfig').then(({ gsap }) => {
            if (cancelled || !tableRef.current) return;
            const rows = tableRef.current.querySelectorAll('tr');
            const context = gsap.context(() => {
                gsap.fromTo(rows, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .32, stagger: .035, ease: 'power2.out', clearProps: 'all' });
            }, tableRef);
            cleanup = () => context.revert();
        });
        return () => { cancelled = true; cleanup?.(); };
    }, [categoryFilter, statusFilter]);

    useEffect(() => {
        if (!planToDelete) return;
        cancelDeleteRef.current?.focus();
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) setPlanToDelete(null);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [planToDelete, isDeleting]);

    const openCreate = () => {
        setSelectedPlan(null);
        setIsModalOpen(true);
    };

    const openEdit = (plan: MembershipPlanWithRelations) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedPlan(null);
        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        if (!planToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            const result = await deleteMembershipPlan(planToDelete.id);
            if (result.ok) {
                toast.success(result.data?.deactivated ? 'Plan desactivado' : 'Plan eliminado');
                setPlanToDelete(null);
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('No se pudo modificar el plan. Intentá de nuevo.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section className="membership-plans-section">
            <div className="membership-plans-header">
                <div className="membership-plans-header-text">
                    <h1>Planes</h1>
                    <p>{plans.length} {plans.length === 1 ? 'plan configurado' : 'planes configurados'}</p>
                </div>

                <button type="button" onClick={openCreate}>+ Nuevo plan</button>
            </div>

            {isModalOpen && <MembershipPlanModal isOpen plan={selectedPlan} categories={categories} onClose={closeModal} />}
            {planToDelete && (
                <div className="membership-plan-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setPlanToDelete(null); }}>
                    <div className="membership-plan-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="plan-delete-title" aria-describedby="plan-delete-description">
                        <span className="membership-plan-delete-eyebrow">CONFIRMAR ACCIÓN</span>
                        <h2 id="plan-delete-title">Quitar plan</h2>
                        <p id="plan-delete-description"><strong>{planToDelete.name}</strong>: si tiene membresías asociadas, se desactivará para conservar el historial. Si no, se eliminará.</p>
                        <div className="membership-plan-delete-actions">
                            <button type="button" ref={cancelDeleteRef} onClick={() => setPlanToDelete(null)} disabled={isDeleting}>Cancelar</button>
                            <button type="button" onClick={handleDelete} disabled={isDeleting} aria-busy={isDeleting}>{isDeleting ? 'Procesando...' : 'Continuar'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="membership-plans-table-wrapper">
                <div className="membership-plans-toolbar">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar plan..."
                        aria-label="Buscar plan"
                    />
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrar por categoría">
                        <option value="ALL">Todas las categorías</option>
                        {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por estado">
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activos</option>
                        <option value="INACTIVE">Inactivos</option>
                    </select>
                </div>

                <p className="membership-plans-results" aria-live="polite">Mostrando <strong>{filteredPlans.length}</strong> de {plans.length} planes</p>

                <table className="membership-plans-table">
                    <thead>
                        <tr>
                            <th>Plan</th>
                            <th>Categoría</th>
                            <th>Dias</th>
                            <th>Precio</th>
                            <th>Alumnos</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody ref={tableRef}>
                        {planPages.pageItems.map((plan) => (
                            <tr key={plan.id}>
                                <td className="plan-cell-name" data-label="Plan">
                                    <div className="membership-plan-name">
                                        <strong>{plan.name}</strong>
                                        {plan.isRecommended && <span>Recomendado</span>}
                                    </div>
                                </td>
                                <td className="plan-cell-category" data-label="Categoría">
                                    <div className="membership-plan-category">
                                        <span>{getClassCategoryLabel(plan.classCategory)}</span>
                                        {categories.find((category) => category.name === plan.classCategory)?.isSpecialActivity && (
                                            <em>Evento</em>
                                        )}
                                    </div>
                                </td>
                                <td className="plan-cell-days" data-label="Días">{plan.trainingDaysPerWeek} por semana</td>
                                <td className="plan-cell-price" data-label="Precio"><strong>{formatCurrency(plan.priceCents, plan.currency)}</strong><span>/ mes</span></td>
                                <td className="plan-cell-students" data-label="Alumnos">{plan.memberships?.length ?? 0}</td>
                                <td className="plan-cell-status" data-label="Estado">
                                    <span className={`membership-plan-status membership-plan-status-${plan.isActive ? 'active' : 'inactive'}`}>
                                        {plan.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="plan-cell-actions" data-label="Acciones">
                                    <div className="membership-plan-actions">
                                        <button type="button" onClick={() => openEdit(plan)} aria-label="Editar plan">
                                            <GoPencil /><span>Editar</span>
                                        </button>
                                        <button type="button" onClick={() => setPlanToDelete(plan)} aria-label={`Quitar ${plan.name}`}>
                                            <FaRegTrashAlt /><span>Quitar</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredPlans.length === 0 && (
                    <EmptyState
                        compact
                        title={plans.length > 0 ? 'Sin resultados' : 'Sin planes'}
                        description={plans.length > 0
                            ? 'No hay planes que coincidan con la busqueda.'
                            : 'Todavia no hay planes configurados.'}
                    />
                )}
                <Pagination page={planPages.page} pageSize={planPages.pageSize} totalItems={filteredPlans.length} onPageChange={planPages.setPage} label="planes" />
            </div>
        </section>
    );
};
