import { prisma } from '@/lib/prisma';
import type { PrismaDate } from '@/types/schema/common';
import type { UserWithRelations } from '@/types/schema/users';

export type ActionResponse<T = null> = {
    ok: true;
    data: T;
} | {
    ok: false;
    data: null;
    error: string;
};

export const adminUsersPath = '/admin/usuarios';
export const adminStudentsPath = '/admin/alumnos';
export const adminCoachesPath = '/admin/coaches';
export const adminPaymentsPath = '/admin/pagos';
export const adminMembershipPlansPath = '/admin/planes';
export const adminClassSchedulesPath = '/admin/turnos';
export const publicHomePath = '/';

export const userInclude = {
    image: true,
    student: true,
    coach: true,
} as const;

export const coachInclude = {
    image: true,
    student: true,
    coach: {
        include: {
            students: {
                include: {
                    user: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    },
} as const;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const toDate = (value?: PrismaDate | null) => {
    if (!value) return value;
    return value instanceof Date ? value : new Date(value);
};

export const getUserWithRelations = async (id: string) => {
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
        include: userInclude,
    });

    return sanitizeUserForClient(user);
};

export const getCoachWithRelations = async (id: string) => {
    const user = await prisma.user.findUnique({
        where: {
            id,
        },
        include: coachInclude,
    });

    return sanitizeUserForClient(user);
};

export const sanitizeUserForClient = <UserItem extends UserWithRelations | null>(
    user: UserItem
): UserItem => {
    if (!user) return user;

    return {
        ...user,
        passwordHash: null,
        student: user.student
            ? {
                ...user.student,
                user: user.student.user ? sanitizeUserForClient(user.student.user) : undefined,
            }
            : user.student,
        coach: user.coach
            ? {
                ...user.coach,
                user: user.coach.user ? sanitizeUserForClient(user.coach.user) : undefined,
                students: user.coach.students?.map((student) => ({
                    ...student,
                    user: student.user ? sanitizeUserForClient(student.user) : undefined,
                })),
            }
            : user.coach,
    } as UserItem;
};
