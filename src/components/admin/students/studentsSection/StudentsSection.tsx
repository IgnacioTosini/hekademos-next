'use client';

import Image from 'next/image';
import Link from 'next/link';
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
import type { WeeklyClassScheduleSummary } from '@/types/schema/classes';
import type { MembershipPlan } from '@/types/schema/memberships';
import type { UserWithRelations } from '@/types/schema/users';
import '../../users/usersSection/_usersSection.scss';
import './_studentsSection.scss';

const StudentModal = dynamic(() => import('../studentModal/StudentModal').then((module) => module.StudentModal));

type Props = {
    students: UserWithRelations[];
    coaches: UserWithRelations[];
    membershipPlans: MembershipPlan[];
    weeklySchedules: WeeklyClassScheduleSummary[];
};

const getFullName = (student: UserWithRelations) => {
    const profileName = [student.student?.firstName, student.student?.lastName].filter(Boolean).join(' ');
    return profileName || student.name || 'Sin nombre';
};

const getCoachName = (student: UserWithRelations, coaches: UserWithRelations[]) => {
    const coachUser = coaches.find((coach) => coach.coach?.id === student.student?.coachId);
    return coachUser?.name || coachUser?.email || 'Sin asignar';
};

export const StudentsSection = ({ students, coaches, membershipPlans, weeklySchedules }: Props) => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [coachFilter, setCoachFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const tableRef = useRef<HTMLTableSectionElement>(null);
    const filtersInitialized = useRef(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<UserWithRelations | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<UserWithRelations | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const cancelDeleteRef = useRef<HTMLButtonElement>(null);

    const filteredStudents = useMemo(() => {
        const search = query.trim().toLowerCase();

        return students.filter((student) => {
            if (coachFilter !== 'ALL' && (student.student?.coachId || 'UNASSIGNED') !== coachFilter) return false;
            if (statusFilter !== 'ALL' && student.status !== statusFilter) return false;
            if (!search) return true;
            const values = [
                getFullName(student),
                student.email,
                student.phone,
                getCoachName(student, coaches),
                student.student?.routineExcelUrl,
                student.student?.notes,
            ];

            return values.some((value) => value?.toLowerCase().includes(search));
        });
    }, [coachFilter, coaches, query, statusFilter, students]);
    const studentPages = usePagination(filteredStudents, 12, `${query}|${coachFilter}|${statusFilter}`);

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
    }, [coachFilter, statusFilter]);

    useEffect(() => {
        if (!studentToDelete) return;
        cancelDeleteRef.current?.focus();
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isDeleting) setStudentToDelete(null);
        };
        window.addEventListener('keydown', onEscape);
        return () => window.removeEventListener('keydown', onEscape);
    }, [studentToDelete, isDeleting]);

    const openCreate = () => {
        setSelectedStudent(null);
        setIsModalOpen(true);
    };

    const openEdit = (student: UserWithRelations) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedStudent(null);
        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        if (!studentToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            const result = await deleteUser(studentToDelete.id);
            if (result.ok) {
                toast.success('Alumno eliminado');
                setStudentToDelete(null);
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch {
            toast.error('No se pudo eliminar el alumno. Intentá de nuevo.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section className="users-section students-section">
            <div className="users-header">
                <div className="users-header-text">
                    <h1 className="users-title">Alumnos</h1>
                    <p className="users-description">
                        {students.length} {students.length === 1 ? 'alumno registrado' : 'alumnos registrados'}
                    </p>
                </div>
                <button className="users-button" type="button" onClick={openCreate}>+ Nuevo alumno</button>
            </div>

            {isModalOpen && <StudentModal
                isOpen={isModalOpen}
                student={selectedStudent}
                coaches={coaches}
                membershipPlans={membershipPlans}
                weeklySchedules={weeklySchedules}
                onClose={closeModal}
            />}
            {studentToDelete && (
                <div className="user-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setStudentToDelete(null); }}>
                    <div className="user-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="student-delete-title" aria-describedby="student-delete-description">
                        <span className="user-delete-eyebrow">CONFIRMAR ACCIÓN</span>
                        <h2 id="student-delete-title">Eliminar alumno</h2>
                        <p id="student-delete-description">Vas a eliminar a <strong>{getFullName(studentToDelete)}</strong>. Esta acción no se puede deshacer.</p>
                        <div className="user-delete-actions">
                            <button type="button" ref={cancelDeleteRef} onClick={() => setStudentToDelete(null)} disabled={isDeleting}>Cancelar</button>
                            <button type="button" onClick={handleDelete} disabled={isDeleting} aria-busy={isDeleting}>
                                {isDeleting && <span className="user-delete-spinner" aria-hidden="true" />}
                                {isDeleting ? 'Eliminando...' : 'Eliminar alumno'}
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
                        placeholder="Buscar alumno..."
                        aria-label="Buscar alumno"
                    />
                    <select value={coachFilter} onChange={(event) => setCoachFilter(event.target.value)} aria-label="Filtrar por coach">
                        <option value="ALL">Todos los coaches</option>
                        <option value="UNASSIGNED">Sin asignar</option>
                        {coaches.filter((coach) => coach.coach?.id).map((coach) => (
                            <option key={coach.id} value={coach.coach!.id}>{coach.name || coach.email}</option>
                        ))}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por estado">
                        <option value="ALL">Todos los estados</option>
                        <option value="ACTIVE">Activo</option>
                        <option value="INACTIVE">Inactivo</option>
                        <option value="SUSPENDED">Suspendido</option>
                    </select>
                </div>

                <p className="users-results" aria-live="polite">Mostrando <strong>{filteredStudents.length}</strong> de {students.length} alumnos</p>

                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Alumno</th>
                            <th>Telefono</th>
                            <th>Coach</th>
                            <th>Rutina</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody ref={tableRef}>
                        {studentPages.pageItems.map((student) => {
                            const studentName = getFullName(student);
                            const profileHref = student.student ? `/admin/alumnos/${student.student.id}` : null;
                            const identity = (
                                <>
                                    <div className="user-avatar">
                                        {student.image?.url ? (
                                            <Image src={student.image.url} alt={studentName} width={100} height={100} />
                                        ) : (
                                            <span>{studentName.slice(0, 2).toUpperCase()}</span>
                                        )}
                                    </div>

                                    <div>
                                        <strong>{studentName}</strong>
                                        <span>{student.email}</span>
                                    </div>
                                </>
                            );

                            return (
                                <tr key={student.id}>
                                    <td className="user-cell-primary" data-label="Alumno">
                                        {profileHref ? (
                                            <Link className="user-info user-info-link" href={profileHref}>
                                                {identity}
                                            </Link>
                                        ) : (
                                            <div className="user-info">{identity}</div>
                                        )}
                                    </td>

                                    <td className="student-cell-phone" data-label="Teléfono">{student.phone || '-'}</td>
                                    <td className="student-cell-coach" data-label="Coach">{getCoachName(student, coaches)}</td>
                                    <td className="student-cell-routine" data-label="Rutina">
                                        {student.student?.routineExcelUrl ? (
                                            <a className="user-badge student-routine-link" href={student.student.routineExcelUrl} target="_blank" rel="noreferrer">
                                                Ver rutina
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="user-cell-status" data-label="Estado">
                                        <span className={`user-status user-status-${student.status.toLowerCase()}`}>
                                            {student.status === 'ACTIVE' ? 'Activo' : student.status === 'INACTIVE' ? 'Inactivo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td className="user-cell-actions" data-label="Acciones">
                                        <div className="user-actions">
                                            {profileHref && <Link className="student-profile-action" href={profileHref}>Ver perfil</Link>}
                                            <button type="button" onClick={() => openEdit(student)} aria-label="Editar alumno">
                                                <GoPencil /><span>Editar</span>
                                            </button>
                                            <button type="button" onClick={() => setStudentToDelete(student)} aria-label={`Eliminar a ${studentName}`}>
                                                <FaRegTrashAlt /><span>Eliminar</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredStudents.length === 0 && (
                    <EmptyState
                        compact
                        title={students.length > 0 ? 'Sin resultados' : 'Sin alumnos'}
                        description={students.length > 0
                            ? 'No hay alumnos que coincidan con la busqueda.'
                            : 'Todavia no hay alumnos cargados.'}
                    />
                )}
                <Pagination page={studentPages.page} pageSize={studentPages.pageSize} totalItems={filteredStudents.length} onPageChange={studentPages.setPage} label="alumnos" />
            </div>
        </section>
    );
};
