'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import {
    createClassCategory,
    deleteClassCategory,
    updateClassCategory,
} from '@/app/actions/classCategory.actions';
import type { ClassCategoryOption } from '@/types/schema/common';

type Props = {
    categories: ClassCategoryOption[];
    selectedCategory: string;
    onCategoriesChange: (categories: ClassCategoryOption[]) => void;
    onSelectCategory: (name: string) => void;
};

const sortCategories = (categories: ClassCategoryOption[]) => (
    [...categories].sort((a, b) => a.name.localeCompare(b.name))
);

export const ClassCategoryManager = ({
    categories,
    selectedCategory,
    onCategoriesChange,
    onSelectCategory,
}: Props) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [isSpecialActivity, setIsSpecialActivity] = useState(false);
    const [error, setError] = useState('');
    const [isPending, startTransition] = useTransition();
    const isEditing = editingCategoryId !== null;

    const resetEditor = () => {
        setEditingCategoryId(null);
        setName('');
        setIsSpecialActivity(false);
        setError('');
        setIsEditorOpen(false);
    };

    const startCreate = () => {
        resetEditor();
        setIsOpen(true);
        setIsEditorOpen(true);
    };

    const startEdit = (category: ClassCategoryOption) => {
        setEditingCategoryId(category.id);
        setName(category.name);
        setIsSpecialActivity(category.isSpecialActivity);
        setError('');
        setIsOpen(true);
        setIsEditorOpen(true);
    };

    const handleSave = () => {
        const normalizedName = name.trim().replace(/\s+/g, ' ');

        if (normalizedName.length < 2 || normalizedName.length > 60) {
            setError('El nombre debe tener entre 2 y 60 caracteres.');
            return;
        }

        const previousCategory = editingCategoryId
            ? categories.find((category) => category.id === editingCategoryId)
            : null;

        setError('');
        startTransition(async () => {
            const result = editingCategoryId
                ? await updateClassCategory(editingCategoryId, {
                    name: normalizedName,
                    isSpecialActivity,
                })
                : await createClassCategory({
                    name: normalizedName,
                    isSpecialActivity,
                });

            if (!result.ok) {
                setError(result.error);
                toast.error(result.error);
                return;
            }

            const nextCategories = editingCategoryId
                ? categories.map((category) => (
                    category.id === result.data.id ? result.data : category
                ))
                : [...categories, result.data];

            onCategoriesChange(sortCategories(nextCategories));

            if (!previousCategory || selectedCategory === previousCategory.name) {
                onSelectCategory(result.data.name);
            }

            toast.success(isEditing ? 'Categoría actualizada' : 'Categoría creada');
            resetEditor();
            router.refresh();
        });
    };

    const handleDelete = (category: ClassCategoryOption) => {
        const confirmed = window.confirm(`¿Eliminar la categoría ${category.name}? Solo se puede eliminar si no está en uso.`);

        if (!confirmed) return;

        setError('');
        startTransition(async () => {
            const result = await deleteClassCategory(category.id);

            if (!result.ok) {
                setError(result.error);
                toast.error(result.error);
                return;
            }

            const nextCategories = categories.filter((item) => item.id !== category.id);
            onCategoriesChange(nextCategories);

            if (selectedCategory === category.name) {
                onSelectCategory(nextCategories[0]?.name ?? '');
            }

            if (editingCategoryId === category.id) resetEditor();

            toast.success('Categoría eliminada');
            router.refresh();
        });
    };

    return (
        <div className="class-category-manager">
            <button
                className="class-category-manager-toggle"
                type="button"
                onClick={() => {
                    setIsOpen((current) => !current);
                    setError('');
                }}
            >
                {isOpen ? 'Cerrar categorías' : 'Administrar categorías'}
            </button>

            {isOpen && (
                <div className="class-category-manager-panel">
                    <div className="class-category-manager-header">
                        <div>
                            <strong>Categorías de clase</strong>
                            <small>Los cambios de nombre también se aplican a planes y turnos.</small>
                        </div>
                        <button type="button" onClick={startCreate} disabled={isPending}>+ Nueva</button>
                    </div>

                    <div className="class-category-manager-list">
                        {categories.map((category) => (
                            <div className="class-category-manager-item" key={category.id}>
                                <div>
                                    <span>{category.name}</span>
                                    {category.isSpecialActivity && <em>Evento</em>}
                                </div>
                                <div className="class-category-manager-item-actions">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(category)}
                                        aria-label={`Editar categoría ${category.name}`}
                                        disabled={isPending}
                                    >
                                        <GoPencil />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(category)}
                                        aria-label={`Eliminar categoría ${category.name}`}
                                        disabled={isPending}
                                    >
                                        <FaRegTrashAlt />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {categories.length === 0 && <p>Todavía no hay categorías.</p>}
                    </div>

                    {(isEditorOpen || categories.length === 0) && (
                        <div className="class-category-manager-editor">
                            <label htmlFor="category-name">{isEditing ? 'Editar nombre' : 'Nueva categoría'}</label>
                            <input
                                id="category-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Ej: Movilidad"
                                maxLength={60}
                                disabled={isPending}
                            />
                            <label className="class-category-manager-special">
                                <input
                                    type="checkbox"
                                    checked={isSpecialActivity}
                                    onChange={(event) => setIsSpecialActivity(event.target.checked)}
                                    disabled={isPending}
                                />
                                Actividad especial (evento)
                            </label>
                            <div className="class-category-manager-editor-actions">
                                <button type="button" onClick={resetEditor} disabled={isPending}>Cancelar</button>
                                <button type="button" onClick={handleSave} disabled={isPending}>
                                    {isPending ? 'Guardando...' : isEditing ? 'Guardar categoría' : 'Agregar categoría'}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && <p className="class-category-manager-error">{error}</p>}
                </div>
            )}
        </div>
    );
};
