import type { TimestampFields, PrismaDate } from '../common';
import type { Coach, Student, User } from '../users';
import type { MembershipPlan, StudentMembership } from '../memberships';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED';

export type Payment = TimestampFields & {
    id: string;
    studentId: string;
    studentMembershipId: string | null;
    amountCents: number;
    currency: string;
    status: PaymentStatus;
    dueDate: PrismaDate | null;
    paidAt: PrismaDate | null;
    reference: string | null;
    notes: string | null;
};

export type PaymentWithRelations = Payment & {
    student?: Student;
    studentMembership?: StudentMembership | null;
};

export type PaymentOverviewStatus = 'PAID' | 'PENDING' | 'REFUNDED' | 'CANCELLED' | 'NO_MEMBERSHIP';

export type PaymentOverviewStudent = Student & {
    user: User;
    coach?: (Coach & {
        user?: User;
    }) | null;
};

export type PaymentOverviewMembership = StudentMembership & {
    plan: MembershipPlan;
};

export type PaymentOverviewRow = {
    student: PaymentOverviewStudent;
    activeMembership: PaymentOverviewMembership | null;
    currentMonthPayment: Payment | null;
    latestPayment: Payment | null;
    status: PaymentOverviewStatus;
    amountCents: number | null;
    baseAmountCents: number | null;
    currency: string;
    paymentPeriodStart: PrismaDate;
    paymentPeriodEnd: PrismaDate;
    isLate: boolean;
    lateSurchargePercent: number;
};

export type PaymentOverviewPeriodInput = {
    month?: number;
    year?: number;
};

export type SavePaymentDetailsInput = PaymentOverviewPeriodInput & {
    reference?: string | null;
    notes?: string | null;
};
