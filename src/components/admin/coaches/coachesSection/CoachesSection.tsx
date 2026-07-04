'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteUser } from '@/app/actions/user.actions';
import { EmptyState } from '@/components/ui';
import type { UserWithRelations } from '@/types/schema/users';
import { CoachModal } from '../coachModal/CoachModal';
import { CoachStudentsModal } from '../coachStudentsModal/CoachStudentsModal';
import '../../users/usersSection/_usersSection.scss';

type Props = {
    coaches: UserWithRelations[];
};

const getCoachName = (coach: UserWithRelations) => coach.name || coach.email;

export const CoachesSection = ({ coaches }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
    const [selectedCoach, setSelectedCoach] = useState<UserWithRelations | null>(null);

    const filteredCoaches = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return coaches;

        return coaches.filter((coach) => {
            const values = [
                coach.name,
                coach.email,
                coach.phone,
                coach.coach?.specialty,
                coach.coach?.instagram,
                coach.coach?.bio,
            ];

            return values.some((value) => value?.toLowerCase().includes(search));
        });
    }, [coaches, query]);

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

    const handleDelete = async (coach: UserWithRelations) => {
        const confirmed = window.confirm(`Eliminar coach ${getCoachName(coach)}?`);

        if (!confirmed) return;

        const result = await deleteUser(coach.id);

        if (result.ok) {
            toast.success('Coach eliminado');
            router.refresh();
            return;
        }

        toast.error(result.error);
    };

    return (
        <section className="users-section">
            <div className="users-header">
                <div className="users-header-text">
                    <h1 className="users-title">Coaches</h1>
                    <p className="users-description">
                        {coaches.length} {coaches.length === 1 ? 'coach registrado' : 'coaches registrados'}
                    </p>
                </div>
                <button className="users-button" type="button" onClick={openCreate}>+ Nuevo coach</button>
            </div>

            <CoachModal isOpen={isModalOpen} coach={selectedCoach} onClose={closeModal} />
            <CoachStudentsModal isOpen={isStudentsModalOpen} coach={selectedCoach} onClose={closeStudentsModal} />

            <div className="users-table-wrapper">
                <div className="users-table-toolbar">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar coach..."
                        aria-label="Buscar coach"
                    />
                </div>

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

                    <tbody>
                        {filteredCoaches.map((coach) => {
                            const studentsCount = coach.coach?.students?.length ?? 0;

                            return (
                                <tr key={coach.id}>
                                    <td data-label="Coach">
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

                                    <td data-label="Especialidad">{coach.coach?.specialty || '-'}</td>
                                    <td data-label="Instagram">{coach.coach?.instagram ? `@${coach.coach.instagram}` : '-'}</td>
                                    <td data-label="Alumnos">
                                        <button
                                            className="students-count-button"
                                            type="button"
                                            onClick={() => openStudents(coach)}
                                        >
                                            {studentsCount}
                                        </button>
                                    </td>
                                    <td data-label="Estado">
                                        <span className={`user-status ${coach.coach?.isActive ? 'user-status-active' : 'user-status-inactive'}`}>
                                            {coach.coach?.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td data-label="Acciones">
                                        <div className="user-actions">
                                            <button type="button" onClick={() => openEdit(coach)} aria-label="Editar coach">
                                                <GoPencil />
                                            </button>
                                            <button type="button" onClick={() => handleDelete(coach)} aria-label="Eliminar coach">
                                                <FaRegTrashAlt />
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
            </div>
        </section>
    );
};
