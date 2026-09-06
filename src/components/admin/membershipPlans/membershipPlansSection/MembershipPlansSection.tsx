'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteMembershipPlan } from '@/app/actions/membership.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<MembershipPlanWithRelations | null>(null);

    const filteredPlans = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return plans;

        return plans.filter((plan) => {
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
    }, [categories, plans, query]);

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

    const handleDelete = async (plan: MembershipPlanWithRelations) => {
        const confirmed = window.confirm(`Eliminar o desactivar el plan ${plan.name}?`);

        if (!confirmed) return;

        const result = await deleteMembershipPlan(plan.id);

        if (result.ok) {
            toast.success(result.data?.deactivated ? 'Plan desactivado' : 'Plan eliminado');
            router.refresh();
            return;
        }

        toast.error(result.error);
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

            <div className="membership-plans-table-wrapper">
                <div className="membership-plans-toolbar">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar plan..."
                        aria-label="Buscar plan"
                    />
                </div>

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

                    <tbody>
                        {filteredPlans.map((plan) => (
                            <tr key={plan.id}>
                                <td data-label="Plan">
                                    <div className="membership-plan-name">
                                        <strong>{plan.name}</strong>
                                        {plan.isRecommended && <span>Recomendado</span>}
                                    </div>
                                </td>
                                <td data-label="Categoría">
                                    <div className="membership-plan-category">
                                        <span>{getClassCategoryLabel(plan.classCategory)}</span>
                                        {categories.find((category) => category.name === plan.classCategory)?.isSpecialActivity && (
                                            <em>Evento</em>
                                        )}
                                    </div>
                                </td>
                                <td data-label="Dias">{plan.trainingDaysPerWeek} por semana</td>
                                <td data-label="Precio">{formatCurrency(plan.priceCents, plan.currency)}</td>
                                <td data-label="Alumnos">{plan.memberships?.length ?? 0}</td>
                                <td data-label="Estado">
                                    <span className={`membership-plan-status membership-plan-status-${plan.isActive ? 'active' : 'inactive'}`}>
                                        {plan.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td data-label="Acciones">
                                    <div className="membership-plan-actions">
                                        <button type="button" onClick={() => openEdit(plan)} aria-label="Editar plan">
                                            <GoPencil />
                                        </button>
                                        <button type="button" onClick={() => handleDelete(plan)} aria-label="Eliminar plan">
                                            <FaRegTrashAlt />
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
            </div>
        </section>
    );
};
