'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteUser } from '@/app/actions/user.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import type { UserWithRelations } from '@/types/schema/users';
import { formatDate } from '@/utils/format';
import { getInitials } from '@/utils/strings';
import './_usersSection.scss';

const UserModal = dynamic(() => import('../userModal/UserModal').then((module) => module.UserModal));

type Props = {
    users: UserWithRelations[];
};

const roleLabels: Record<UserWithRelations['role'], string> = {
    ADMIN: 'Admin',
    COACH: 'Coach',
    STUDENT: 'Alumno',
};

const statusLabels: Record<UserWithRelations['status'], string> = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    SUSPENDED: 'Suspendido',
};

export const UsersSection = ({ users }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithRelations | null>(null);

    const filteredUsers = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return users;

        return users.filter((user) => {
            const values = [
                user.name,
                user.email,
                user.phone,
                roleLabels[user.role],
                statusLabels[user.status],
            ];

            return values.some((value) => value?.toLowerCase().includes(search));
        });
    }, [query, users]);

    const openCreate = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const openEdit = (user: UserWithRelations) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedUser(null);
        setIsModalOpen(false);
    };

    const handleDelete = async (user: UserWithRelations) => {
        const confirmed = window.confirm(`Eliminar usuario ${user.name || user.email}?`);

        if (!confirmed) return;

        const result = await deleteUser(user.id);

        if (result.ok) {
            toast.success('Usuario eliminado');
            router.refresh();
            return;
        }

        toast.error(result.error);
    };

    return (
        <section className="users-section">
            <div className="users-header">
                <div className="users-header-text">
                    <h1 className="users-title">Usuarios</h1>
                    <p className="users-description">
                        {users.length} {users.length === 1 ? 'usuario registrado' : 'usuarios registrados'}
                    </p>
                </div>
                <button className="users-button" type="button" onClick={openCreate}>+ Nuevo usuario</button>
            </div>

            {isModalOpen && <UserModal isOpen user={selectedUser} onClose={closeModal} />}

            <div className="users-table-wrapper">
                <div className="users-table-toolbar">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar usuario..."
                        aria-label="Buscar usuario"
                    />
                </div>

                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Telefono</th>
                            <th>Alta</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td data-label="Usuario">
                                    <div className="user-info">
                                        <div className="user-avatar">
                                            {user.image?.url ? (
                                                <Image src={user.image.url} alt={user.name || user.email} width={100} height={100} />
                                            ) : (
                                                <span>{getInitials(user.name, user.email)}</span>
                                            )}
                                        </div>

                                        <div>
                                            <strong>{user.name || 'Sin nombre'}</strong>
                                            <span>{user.email}</span>
                                        </div>
                                    </div>
                                </td>

                                <td data-label="Rol">
                                    <span className="user-badge">{roleLabels[user.role]}</span>
                                </td>

                                <td data-label="Estado">
                                    <span className={`user-status user-status-${user.status.toLowerCase()}`}>
                                        {statusLabels[user.status]}
                                    </span>
                                </td>

                                <td data-label="Telefono">{user.phone || '-'}</td>
                                <td data-label="Alta">{formatDate(user.createdAt)}</td>
                                <td data-label="Acciones">
                                    <div className="user-actions">
                                        <button type="button" onClick={() => openEdit(user)} aria-label="Editar usuario">
                                            <GoPencil />
                                        </button>
                                        <button type="button" onClick={() => handleDelete(user)} aria-label="Eliminar usuario">
                                            <FaRegTrashAlt />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <EmptyState
                        compact
                        title={users.length > 0 ? 'Sin resultados' : 'Sin usuarios'}
                        description={users.length > 0
                            ? 'No hay usuarios que coincidan con la busqueda.'
                            : 'Todavia no hay usuarios cargados en el sistema.'}
                    />
                )}
            </div>
        </section>
    );
};
