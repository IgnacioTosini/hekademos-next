import type { ClassCategory, TimestampFields, PrismaDate } from '../common';
import type { Payment } from '../payments';
import type { Student } from '../users';

export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export type MembershipPlan = TimestampFields & {
    id: string;
    name: string;
    classCategory: ClassCategory;
    trainingDaysPerWeek: number;
    priceCents: number;
    currency: string;
    isRecommended: boolean;
    isActive: boolean;
};

export type CreateMembershipPlanInput = {
    name: string;
    classCategory: ClassCategory;
    trainingDaysPerWeek: number;
    priceCents: number;
    currency?: string;
    isRecommended?: boolean;
    isActive?: boolean;
};

export type UpdateMembershipPlanInput = Partial<CreateMembershipPlanInput>;

export type StudentMembership = TimestampFields & {
    id: string;
    studentId: string;
    planId: string;
    startDate: PrismaDate;
    endDate: PrismaDate | null;
    status: MembershipStatus;
    classesUsed: number;
    monthlyPriceCents: number | null;
    notes: string | null;
};

export type MembershipPlanWithRelations = MembershipPlan & {
    memberships?: StudentMembership[];
};

export type StudentMembershipWithRelations = StudentMembership & {
    student?: Student;
    plan?: MembershipPlan;
    payments?: Payment[];
};
