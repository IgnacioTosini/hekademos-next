"use server";

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ADMIN_USER_PAGE_SIZE } from '@/lib/admin-user-page';
import { getAdminActionErrorMessage, logAdminActionError, requireAdminSession } from '@/lib/admin-session';
import type { UserWithRelations } from '@/types/schema/users';
import { getCoachWithRelations, sanitizeUserForClient, userInclude, type ActionResponse } from './_shared';

export type AdminUserPageKind = 'users' | 'students' | 'coaches';
export type AdminUserPageFilters = {
    query?: string;
    page?: number;
    role?: string;
    status?: string;
    coachId?: string;
    specialty?: string;
};
export type AdminUserPage = {
    items: UserWithRelations[];
    total: number;
    filteredTotal: number;
    page: number;
    coachStudentCounts?: Record<string, number>;
};

const studentInclude = {
    image: true,
    coach: true,
    student: {
        include: {
            memberships: { where: { status: 'ACTIVE' as const }, orderBy: { createdAt: 'desc' as const }, take: 1, include: { plan: true } },
            schedules: {
                where: { isActive: true },
                include: { weeklySchedule: true },
                orderBy: { createdAt: 'asc' as const },
            },
        },
    },
} as const;

export const getAdminUserPage = async (
    kind: AdminUserPageKind,
    filters: AdminUserPageFilters = {},
): Promise<ActionResponse<AdminUserPage>> => {
    try {
        await requireAdminSession();
        if (!['users', 'students', 'coaches'].includes(kind)) throw new Error('Listado inválido');

        const baseWhere: Prisma.UserWhereInput = kind === 'students' ? { role: 'STUDENT' } : kind === 'coaches' ? { role: 'COACH' } : {};
        const conditions: Prisma.UserWhereInput[] = [baseWhere];
        const query = filters.query?.trim().slice(0, 100);
        if (kind === 'users' && ['ADMIN', 'COACH', 'STUDENT'].includes(filters.role ?? '')) {
            conditions.push({ role: filters.role as 'ADMIN' | 'COACH' | 'STUDENT' });
        }
        if (kind !== 'coaches' && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(filters.status ?? '')) {
            conditions.push({ status: filters.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' });
        }
        if (kind === 'coaches' && ['ACTIVE', 'INACTIVE'].includes(filters.status ?? '')) {
            conditions.push({ coach: { is: { isActive: filters.status === 'ACTIVE' } } });
        }
        if (kind === 'students' && filters.coachId && filters.coachId !== 'ALL') {
            conditions.push({ student: { is: { coachId: filters.coachId === 'UNASSIGNED' ? null : filters.coachId } } });
        }
        if (kind === 'coaches' && filters.specialty && filters.specialty !== 'ALL') {
            conditions.push({ coach: { is: { specialty: filters.specialty } } });
        }
        if (query) {
            const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
            const common: Prisma.UserWhereInput[] = [
                { name: contains(query) }, { email: contains(query) }, { phone: contains(query) },
            ];
            if (kind === 'users') {
                for (const [role, label] of Object.entries({ ADMIN: 'admin', COACH: 'coach', STUDENT: 'alumno' })) {
                    if (label.includes(query.toLowerCase())) common.push({ role: role as 'ADMIN' | 'COACH' | 'STUDENT' });
                }
                for (const [status, label] of Object.entries({ ACTIVE: 'activo', INACTIVE: 'inactivo', SUSPENDED: 'suspendido' })) {
                    if (label.includes(query.toLowerCase())) common.push({ status: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' });
                }
            }
            if (kind === 'students') {
                const nameParts = query.split(/\s+/);
                if (nameParts.length > 1) common.push({ student: { is: {
                    firstName: contains(nameParts[0]), lastName: contains(nameParts.slice(1).join(' ')),
                } } });
                common.push({ student: { is: { OR: [
                    { firstName: contains(query) }, { lastName: contains(query) },
                    { routineExcelUrl: contains(query) }, { notes: contains(query) },
                    { coach: { is: { user: { is: { name: contains(query) } } } } },
                ] } } });
            }
            if (kind === 'coaches') common.push({ coach: { is: { OR: [
                { specialty: contains(query) }, { instagram: contains(query) },
                { bio: contains(query) }, { paymentAlias: contains(query) },
                { paymentAccountHolder: contains(query) },
            ] } } });
            conditions.push({ OR: common });
        }

        const where: Prisma.UserWhereInput = { AND: conditions };
        const [total, filteredTotal] = await Promise.all([
            prisma.user.count({ where: baseWhere }),
            prisma.user.count({ where }),
        ]);
        const requestedPage = Number.isSafeInteger(filters.page) ? Math.max(1, filters.page!) : 1;
        const page = Math.min(requestedPage, Math.max(1, Math.ceil(filteredTotal / ADMIN_USER_PAGE_SIZE)));
        const pagination = { where, skip: (page - 1) * ADMIN_USER_PAGE_SIZE, take: ADMIN_USER_PAGE_SIZE };
        const rows = kind === 'students'
            ? await prisma.user.findMany({ ...pagination, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: studentInclude })
            : kind === 'coaches'
                ? await prisma.user.findMany({ ...pagination, orderBy: [{ name: 'asc' }, { id: 'asc' }], include: {
                    image: true,
                    coach: { include: { _count: { select: { students: true } } } },
                } })
                : await prisma.user.findMany({ ...pagination, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: userInclude });

        const coachStudentCounts = kind === 'coaches'
            ? Object.fromEntries(rows.flatMap((row) => {
                const coach = row.coach;
                return coach && '_count' in coach ? [[coach.id, coach._count.students]] : [];
            })) as Record<string, number>
            : undefined;
        return { ok: true, data: { items: rows.map((row) => sanitizeUserForClient(row)), total, filteredTotal, page, coachStudentCounts } };
    } catch (error) {
        logAdminActionError('Error al obtener el listado paginado del admin:', error);
        return { ok: false, data: null, error: getAdminActionErrorMessage(error, 'No se pudo cargar el listado') };
    }
};

export const getAdminCoachWithStudents = async (userId: string): Promise<ActionResponse<UserWithRelations | null>> => {
    try {
        await requireAdminSession();
        const coach = await prisma.user.findFirst({ where: { id: userId, role: 'COACH' }, select: { id: true } });
        if (!coach) return { ok: true, data: null };
        return { ok: true, data: await getCoachWithRelations(userId) };
    } catch (error) {
        logAdminActionError('Error al obtener los alumnos del coach:', error);
        return { ok: false, data: null, error: getAdminActionErrorMessage(error, 'No se pudieron cargar los alumnos del coach') };
    }
};

export const getCoachSpecialties = async (): Promise<ActionResponse<string[]>> => {
    try {
        await requireAdminSession();
        const rows = await prisma.coach.groupBy({ by: ['specialty'], where: { specialty: { not: null } } });
        return { ok: true, data: [...new Set(rows.map((row) => row.specialty?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'es')) };
    } catch (error) {
        logAdminActionError('Error al obtener las especialidades:', error);
        return { ok: false, data: null, error: getAdminActionErrorMessage(error, 'No se pudieron cargar las especialidades') };
    }
};
