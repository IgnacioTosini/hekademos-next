'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FaRegTrashAlt } from 'react-icons/fa';
import { GoPencil } from 'react-icons/go';
import { toast } from 'react-toastify';
import { deleteUser } from '@/app/actions/user.actions';
import { EmptyState } from '@/components/ui';
import type { WeeklyClassScheduleWithRelations } from '@/types/schema/classes';
import type { MembershipPlan } from '@/types/schema/memberships';
import type { UserWithRelations } from '@/types/schema/users';
import { StudentModal } from '../studentModal/StudentModal';
import '../../users/usersSection/_usersSection.scss';

type Props = {
    students: UserWithRelations[];
    coaches: UserWithRelations[];
    membershipPlans: MembershipPlan[];
    weeklySchedules: WeeklyClassScheduleWithRelations[];
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<UserWithRelations | null>(null);

    const filteredStudents = useMemo(() => {
        const search = query.trim().toLowerCase();

        if (!search) return students;

        return students.filter((student) => {
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
    }, [coaches, query, students]);

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

    const handleDelete = async (student: UserWithRelations) => {
        const confirmed = window.confirm(`Eliminar alumno ${getFullName(student)}?`);

        if (!confirmed) return;

        const result = await deleteUser(student.id);

        if (result.ok) {
            toast.success('Alumno eliminado');
            router.refresh();
            return;
        }

        toast.error(result.error);
    };

    return (
        <section className="users-section">
            <div className="users-header">
                <div className="users-header-text">
                    <h1 className="users-title">Alumnos</h1>
                    <p className="users-description">
                        {students.length} {students.length === 1 ? 'alumno registrado' : 'alumnos registrados'}
                    </p>
                </div>
                <button className="users-button" type="button" onClick={openCreate}>+ Nuevo alumno</button>
            </div>

            <StudentModal
                isOpen={isModalOpen}
                student={selectedStudent}
                coaches={coaches}
                membershipPlans={membershipPlans}
                weeklySchedules={weeklySchedules}
                onClose={closeModal}
            />

            <div className="users-table-wrapper">
                <div className="users-table-toolbar">
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar alumno..."
                        aria-label="Buscar alumno"
                    />
                </div>

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

                    <tbody>
                        {filteredStudents.map((student) => {
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
                                    <td data-label="Alumno">
                                        {profileHref ? (
                                            <Link className="user-info user-info-link" href={profileHref}>
                                                {identity}
                                            </Link>
                                        ) : (
                                            <div className="user-info">{identity}</div>
                                        )}
                                    </td>

                                    <td data-label="Telefono">{student.phone || '-'}</td>
                                    <td data-label="Coach">{getCoachName(student, coaches)}</td>
                                    <td data-label="Rutina">
                                        {student.student?.routineExcelUrl ? (
                                            <a className="user-badge" href={student.student.routineExcelUrl} target="_blank" rel="noreferrer">
                                                Ver rutina
                                            </a>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td data-label="Estado">
                                        <span className={`user-status user-status-${student.status.toLowerCase()}`}>
                                            {student.status === 'ACTIVE' ? 'Activo' : student.status === 'INACTIVE' ? 'Inactivo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td data-label="Acciones">
                                        <div className="user-actions">
                                            <button type="button" onClick={() => openEdit(student)} aria-label="Editar alumno">
                                                <GoPencil />
                                            </button>
                                            <button type="button" onClick={() => handleDelete(student)} aria-label="Eliminar alumno">
                                                <FaRegTrashAlt />
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
            </div>
        </section>
    );
};
