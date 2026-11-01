'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteUser } from '@/app/actions/user.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import { usePagination } from '@/hooks/usePagination';
import type { UserWithRelations } from '@/types/schema/users';
import '../../users/usersSection/_usersSection.scss';
import './_coachesSection.scss';

const CoachModal = dynamic(() => import('../coachModal/CoachModal').then((module) => module.CoachModal));
const CoachStudentsModal = dynamic(() => import('../coachStudentsModal/CoachStudentsModal').then((module) => module.CoachStudentsModal));

type Props = {
    coaches: UserWithRelations[];
};

const getCoachName = (coach: UserWithRelations) => coach.name || coach.email;

export const CoachesSection = ({ coaches }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [specialtyFilter, setSpecialtyFilter] = useState('ALL');
    const tableRef = useRef<HTMLTableSectionElement>(null);
    const filtersInitialized = useRef(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
    const [selectedCoach, setSelectedCoach] = useState<UserWithRelations | null>(null);
    const [coachToDelete, setCoachToDelete] = useState<UserWithRelations | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const cancelDeleteRef = useRef<HTMLButtonElement>(null);
    const specialties = useMemo(() => [...new Set(coaches.map((coach) => coach.coach?.specialty?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'es')), [coaches]);

    const filteredCoaches = useMemo(() => {
        const search = query.trim().toLowerCase();

        return coaches.filter((coach) => {
            if (statusFilter !== 'ALL' && (coach.coach?.isActive ? 'ACTIVE' : 'INACTIVE') !== statusFilter) return false;
            if (specialtyFilter !== 'ALL' && coach.coach?.specialty?.trim() !== specialtyFilter) return false;
            if (!search) return true;
            const values = [
                coach.name,
                coach.email,
                coach.phone,
                coach.coach?.specialty,
                coach.coach?.instagram,
                coach.coach?.bio,
                coach.coach?.paymentAlias,
                coach.coach?.paymentAccountHolder,
            ];

            return values.some((value) => value?.toLowerCase().includes(search));
        });
    }, [coaches, query, specialtyFilter, statusFilter]);
    const coachPages = usePagination(filteredCoaches, 12, `${query}|${specialtyFilter}|${statusFilter}`);

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
    }, [specialtyFilter, statusFilter]);

    useEffect(() => {
        if (!coachToDelete) return;
        cancelDeleteRef.current?.focus();
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) setCoachToDelete(null);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [coachToDelete, isDeleting]);

    const openCreate = () => {
        setSelectedCoach(null);
        setIsModalOpen(true);
    };

    const openEdit = (coach: UserWithRelations) => {
        setSelectedCoach(coach);
        setIsModalOpen(true);
    };

    const openStudents = (coach: UserWithRelations) => {
        setSelectedCoach(coach);
        setIsStudentsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedCoach(null);
        setIsModalOpen(false);
    };

    const closeStudentsModal = () => {
        setSelectedCoach(null);
        setIsStudentsModalOpen(false);
    };

    const handleDelete = async () => {
        if (!coachToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            const result = await deleteUser(coachToDelete.id);
            if (result.ok) {
                toast.success('Coach eliminado');
                setCoachToDelete(null);
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('No se pudo eliminar el coach. Intentá de nuevo.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section className="users-section coaches-section">
            <div className="users-header">
                <div className="users-header-text">
                    <h1 className="users-title">Coaches</h1>
                    <p className="users-description">
                        {coaches.length} {coaches.length === 1 ? 'coach registrado' : 'coaches registrados'}
                    </p>
                </div>
                <button className="users-button" type="button" onClick={openCreate}>+ Nuevo coach</button>
            </div>

            {isModalOpen && <CoachModal isOpen coach={selectedCoach} onClose={closeModal} />}
            {isStudentsModalOpen && <CoachStudentsModal isOpen coach={selectedCoach} onClose={closeStudentsModal} />}
            {coachToDelete && (
                <div className="user-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setCoachToDelete(null); }}>
                    <div className="user-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="coach-delete-title" aria-describedby="coach-delete-description">
                        <span className="user-delete-eyebrow">CONFIRMAR ACCIÓN</span>
                        <h2 id="coach-delete-title">Eliminar coach</h2>
                        <p id="coach-delete-description">Vas a eliminar a <strong>{getCoachName(coachToDelete)}</strong>. Esta acción no se puede deshacer.</p>
                        <div className="user-delete-actions">
                            <button type="button" ref={cancelDeleteRef} onClick={() => setCoachToDelete(null)} disabled={isDeleting}>Cancelar</button>
                            <button type="button" onClick={handleDelete} disabled={isDeleting} aria-busy={isDeleting}>
                                {isDeleting && <span className="user-delete-spinner" aria-hidden="true" />}
                                {isDeleting ? 'Eliminando...' : 'Eliminar coach'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="users-table-wrapper">
                <div className="users-table-toolbar">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar coach..."
                        aria-label="Buscar coach"
                    />
                    <select value={specialtyFilter} onChange={(event) => setSpecialtyFilter(event.target.value)} aria-label="Filtrar por especialidad">
                        <option value="ALL">Todas las especialidades</option>
                        {specialties.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por estado">
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activos</option>
                        <option value="INACTIVE">Inactivos</option>
                    </select>
                </div>

                <p className="users-results" aria-live="polite">Mostrando <strong>{filteredCoaches.length}</strong> de {coaches.length} coaches</p>

                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Coach</th>
                            <th>Especialidad</th>
                            <th>Instagram</th>
                            <th>Alumnos</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody ref={tableRef}>
                        {coachPages.pageItems.map((coach) => {
                            const studentsCount = coach.coach?.students?.length ?? 0;

                            return (
                                <tr key={coach.id}>
                                    <td className="user-cell-primary" data-label="Coach">
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {coach.image?.url ? (
                                                    <Image src={coach.image.url} alt={getCoachName(coach)} width={100} height={100} />
                                                ) : (
                                                    <span>{getCoachName(coach).slice(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>

                                            <div>
                                                <strong>{getCoachName(coach)}</strong>
                                                <span>{coach.email}</span>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="coach-cell-specialty" data-label="Especialidad">{coach.coach?.specialty || 'Sin especialidad'}</td>
                                    <td className="coach-cell-instagram" data-label="Instagram">{coach.coach?.instagram ? `@${coach.coach.instagram}` : '-'}</td>
                                    <td className="coach-cell-students" data-label="Alumnos">
                                        <button
                                            className="students-count-button"
                                            type="button"
                                            onClick={() => openStudents(coach)}
                                        >
                                            <strong>{studentsCount}</strong><span>{studentsCount === 1 ? 'alumno' : 'alumnos'} · Ver lista</span>
                                        </button>
                                    </td>
                                    <td className="user-cell-status" data-label="Estado">
                                        <span className={`user-status ${coach.coach?.isActive ? 'user-status-active' : 'user-status-inactive'}`}>
                                            {coach.coach?.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="user-cell-actions" data-label="Acciones">
                                        <div className="user-actions">
                                            <button type="button" onClick={() => openEdit(coach)} aria-label="Editar coach">
                                                <GoPencil /><span>Editar</span>
                                            </button>
                                            <button type="button" onClick={() => setCoachToDelete(coach)} aria-label={`Eliminar a ${getCoachName(coach)}`}>
                                                <FaRegTrashAlt /><span>Eliminar</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredCoaches.length === 0 && (
                    <EmptyState
                        compact
                        title={coaches.length > 0 ? 'Sin resultados' : 'Sin coaches'}
                        description={coaches.length > 0
                            ? 'No hay coaches que coincidan con la busqueda.'
                            : 'Todavia no hay coaches cargados.'}
                    />
                )}
                <Pagination page={coachPages.page} pageSize={coachPages.pageSize} totalItems={filteredCoaches.length} onPageChange={coachPages.setPage} label="coaches" />
            </div>
        </section>
    );
};
