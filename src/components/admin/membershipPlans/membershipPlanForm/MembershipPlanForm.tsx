'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { createMembershipPlan, updateMembershipPlan } from '@/app/actions/membership.actions';
import type { MembershipPlanWithRelations } from '@/types/schema/memberships';
import './_membershipPlanForm.scss';

type Props = {
    plan: MembershipPlanWithRelations | null;
    onClose: () => void;
};

type MembershipPlanFormState = {
    name: string;
    trainingDaysPerWeek: string;
    pricePesos: string;
    currency: string;
    isRecommended: boolean;
    isActive: boolean;
};

const getInitialState = (plan: MembershipPlanWithRelations | null): MembershipPlanFormState => ({
    name: plan?.name ?? '',
    trainingDaysPerWeek: plan ? String(plan.trainingDaysPerWeek) : '2',
    pricePesos: plan ? String(plan.priceCents / 100) : '',
    currency: plan?.currency ?? 'ARS',
    isRecommended: plan?.isRecommended ?? false,
    isActive: plan?.isActive ?? true,
});

export const MembershipPlanForm = ({ plan, onClose }: Props) => {
    const router = useRouter();
    const [form, setForm] = useState<MembershipPlanFormState>(() => getInitialState(plan));
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const isEditing = !!plan;

    const updateField = <Key extends keyof MembershipPlanFormState>(key: Key, value: MembershipPlanFormState[Key]) => {
        setForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        const trainingDaysPerWeek = Number(form.trainingDaysPerWeek);
        const pricePesos = Number(form.pricePesos.replace(',', '.'));

        if (!form.name.trim()) {
            setError('El nombre del plan es obligatorio.');
            return;
        }

        if (!Number.isInteger(trainingDaysPerWeek) || trainingDaysPerWeek < 1) {
            setError('Los dias por semana deben ser un numero mayor a cero.');
            return;
        }

        if (!Number.isFinite(pricePesos) || pricePesos < 0) {
            setError('El precio mensual no es valido.');
            return;
        }

        startTransition(async () => {
            const payload = {
                name: form.name.trim(),
                trainingDaysPerWeek,
                priceCents: Math.round(pricePesos * 100),
                currency: form.currency.trim().toUpperCase() || 'ARS',
                isRecommended: form.isRecommended,
                isActive: form.isActive,
            };
            const result = isEditing
                ? await updateMembershipPlan(plan.id, payload)
                : await createMembershipPlan(payload);

            if (result.ok) {
                toast.success(isEditing ? 'Plan actualizado' : 'Plan creado');
                router.refresh();
                onClose();
                return;
            }

            setError(result.error);
            toast.error(result.error);
        });
    };

    return (
        <form className="membership-plan-form" onSubmit={handleSubmit}>
            <div className="membership-plan-form-row">
                <div className="membership-plan-form-group">
                    <label htmlFor="plan-name">Nombre</label>
                    <input
                        id="plan-name"
                        value={form.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        placeholder="Plan 2"
                        required
                    />
                </div>

                <div className="membership-plan-form-group">
                    <label htmlFor="plan-days">Dias por semana</label>
                    <input
                        id="plan-days"
                        type="number"
                        min="1"
                        step="1"
                        value={form.trainingDaysPerWeek}
                        onChange={(event) => updateField('trainingDaysPerWeek', event.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="membership-plan-form-row">
                <div className="membership-plan-form-group">
                    <label htmlFor="plan-price">Precio mensual</label>
                    <input
                        id="plan-price"
                        type="number"
                        min="0"
                        step="1"
                        value={form.pricePesos}
                        onChange={(event) => updateField('pricePesos', event.target.value)}
                        placeholder="55000"
                        required
                    />
                </div>

                <div className="membership-plan-form-group">
                    <label htmlFor="plan-currency">Moneda</label>
                    <input
                        id="plan-currency"
                        value={form.currency}
                        onChange={(event) => updateField('currency', event.target.value)}
                        placeholder="ARS"
                    />
                </div>
            </div>

            <div className="membership-plan-form-checks">
                <label>
                    <input
                        type="checkbox"
                        checked={form.isRecommended}
                        onChange={(event) => updateField('isRecommended', event.target.checked)}
                    />
                    Recomendado
                </label>

                <label>
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) => updateField('isActive', event.target.checked)}
                    />
                    Activo
                </label>
            </div>

            {error && <p className="membership-plan-form-error">{error}</p>}

            <div className="membership-plan-form-actions">
                <button type="button" onClick={onClose} disabled={isPending}>
                    Cancelar
                </button>
                <button type="submit" disabled={isPending}>
                    {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear plan'}
                </button>
            </div>
        </form>
    );
};
