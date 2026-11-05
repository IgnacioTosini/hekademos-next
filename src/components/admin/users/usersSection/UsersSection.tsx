'use client';

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteUser } from '@/app/actions/user.actions';
import { EmptyState } from '@/components/ui/emptyState/EmptyState';
import { Pagination } from '@/components/ui/pagination/Pagination';
import type { AdminUserPage } from '@/app/actions/admin-user-page.actions';
import { ADMIN_USER_PAGE_SIZE } from '@/lib/admin-user-page';
import { useAdminUserPage } from '@/hooks/useAdminUserPage';
import type { UserWithRelations } from '@/types/schema/users';
import { formatDate } from '@/utils/format';
import { getInitials } from '@/utils/strings';
import './_usersSection.scss';

const UserModal = dynamic(() => import('../userModal/UserModal').then((module) => module.UserModal));

type Props = {
    initialPage: AdminUserPage;
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

export const UsersSection = ({ initialPage }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const { data, page, setPage, isLoading, error, refresh } = useAdminUserPage('users', initialPage, {
        query, role: roleFilter, status: statusFilter,
    });
    const users = data.items;
    const tableRef = useRef<HTMLTableSectionElement>(null);
    const filtersInitialized = useRef(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithRelations | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserWithRelations | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const cancelDeleteRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!userToDelete) return;
        cancelDeleteRef.current?.focus();
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) setUserToDelete(null);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [userToDelete, isDeleting]);

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
    }, [roleFilter, statusFilter]);

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
        void refresh();
    };

    const handleDelete = async () => {
        if (!userToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            const result = await deleteUser(userToDelete.id);
            if (result.ok) {
                toast.success('Usuario eliminado');
                setUserToDelete(null);
                router.refresh();
                void refresh();
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('No se pudo eliminar el usuario. Intentá de nuevo.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section className="users-section">
            <div className="users-header">
                <div className="users-header-text">
                    <h1 className="users-title">Usuarios</h1>
                    <p className="users-description">
                        {data.total} {data.total === 1 ? 'usuario registrado' : 'usuarios registrados'}
                    </p>
                </div>
                <button className="users-button" type="button" onClick={openCreate}>+ Nuevo usuario</button>
            </div>

            {isModalOpen && <UserModal isOpen user={selectedUser} onClose={closeModal} />}
            {userToDelete && (
                <div className="user-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setUserToDelete(null); }}>
                    <div className="user-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="user-delete-title" aria-describedby="user-delete-description">
                        <span className="user-delete-eyebrow">CONFIRMAR ACCIÓN</span>
                        <h2 id="user-delete-title">Eliminar usuario</h2>
                        <p id="user-delete-description">Vas a eliminar a <strong>{userToDelete.name || userToDelete.email}</strong>. Esta acción no se puede deshacer.</p>
                        <div className="user-delete-actions">
                            <button type="button" ref={cancelDeleteRef} onClick={() => setUserToDelete(null)} disabled={isDeleting}>Cancelar</button>
                            <button type="button" onClick={handleDelete} disabled={isDeleting} aria-busy={isDeleting}>
                                {isDeleting && <span className="user-delete-spinner" aria-hidden="true" />}
                                {isDeleting ? 'Eliminando...' : 'Eliminar usuario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="users-table-wrapper">
                <div className="users-table-toolbar">
                    <input
                        value={query}
                        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                        placeholder="Buscar usuario..."
                        aria-label="Buscar usuario"
                    />
                    <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} aria-label="Filtrar por rol">
                        <option value="ALL">Todos los roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="COACH">Coach</option>
                        <option value="STUDENT">Alumno</option>
                    </select>
                    <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filtrar por estado">
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activo</option>
                        <option value="INACTIVE">Inactivo</option>
                        <option value="SUSPENDED">Suspendido</option>
                    </select>
                </div>

                <p className="users-results" aria-live="polite">Mostrando <strong>{data.filteredTotal}</strong> de {data.total} usuarios{isLoading ? ' · Cargando...' : ''}</p>
                {error && <p role="alert">{error}</p>}

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

                    <tbody ref={tableRef}>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="user-cell-primary" data-label="Usuario">
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

                                <td className="user-cell-role" data-label="Rol">
                                    <span className="user-badge">{roleLabels[user.role]}</span>
                                </td>

                                <td className="user-cell-status" data-label="Estado">
                                    <span className={`user-status user-status-${user.status.toLowerCase()}`}>
                                        {statusLabels[user.status]}
                                    </span>
                                </td>

                                <td className="user-cell-secondary" data-label="Teléfono">{user.phone || '-'}</td>
                                <td className="user-cell-secondary" data-label="Alta">{formatDate(user.createdAt)}</td>
                                <td className="user-cell-actions" data-label="Acciones">
                                    <div className="user-actions">
                                        <button type="button" onClick={() => openEdit(user)} aria-label="Editar usuario">
                                            <GoPencil /><span>Editar</span>
                                        </button>
                                        <button type="button" onClick={() => setUserToDelete(user)} aria-label={`Eliminar a ${user.name || user.email}`}>
                                            <FaRegTrashAlt /><span>Eliminar</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {data.filteredTotal === 0 && !isLoading && (
                    <EmptyState
                        compact
                        title={data.total > 0 ? 'Sin resultados' : 'Sin usuarios'}
                        description={data.total > 0
                            ? 'No hay usuarios que coincidan con la busqueda.'
                            : 'Todavia no hay usuarios cargados en el sistema.'}
                    />
                )}
                <Pagination page={page} pageSize={ADMIN_USER_PAGE_SIZE} totalItems={data.filteredTotal} onPageChange={setPage} label="usuarios" />
            </div>
        </section>
    );
};
