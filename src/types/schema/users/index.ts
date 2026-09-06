import type { TimestampFields, PrismaDate } from '../common';
import type { AttendanceWithRelations, StudentScheduleAssignmentWithRelations } from '../classes';
import type { Payment } from '../payments';
import type { StudentMembership, StudentMembershipWithRelations } from '../memberships';
import type { ClassSession, WeeklyClassSchedule } from '../classes';

export type Role = 'ADMIN' | 'COACH' | 'STUDENT';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type User = TimestampFields & {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    passwordHash: string | null;
    sessionVersion: number;
    emailVerified: PrismaDate | null;
    role: Role;
    status: UserStatus;
};

export type UserImage = {
    id: string;
    url: string;
    publicId: string;
    userId: string;
    createdAt: PrismaDate;
};

export type Student = TimestampFields & {
    id: string;
    userId: string;
    coachId: string | null;
    firstName: string | null;
    lastName: string | null;
    birthDate: PrismaDate | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    routineExcelUrl: string | null;
    notes: string | null;
};

export type Coach = TimestampFields & {
    id: string;
    userId: string;
    bio: string | null;
    specialty: string | null;
    instagram: string | null;
    paymentAlias: string | null;
    paymentAccountHolder: string | null;
    isActive: boolean;
};

export type CoachStudent = Student & {
    user?: User;
};

export type UserWithRelations = User & {
    student?: StudentWithRelations | null;
    coach?: CoachWithRelations | null;
    image?: UserImage | null;
};

export type StudentWithRelations = Student & {
    user?: UserWithRelations;
    coach?: CoachWithRelations | null;
    memberships?: StudentMembership[];
    payments?: Payment[];
    attendance?: AttendanceWithRelations[];
    schedules?: StudentScheduleAssignmentWithRelations[];
};

export type CoachWithRelations = Coach & {
    user?: UserWithRelations;
    students?: CoachStudent[];
    weeklySchedules?: WeeklyClassSchedule[];
    classSessions?: ClassSession[];
};

export type AdminStudentProfile = Student & {
    user: User & {
        image?: UserImage | null;
    };
    coach?: (Coach & {
        user?: (User & {
            image?: UserImage | null;
        }) | null;
    }) | null;
    memberships?: StudentMembershipWithRelations[];
    payments?: Payment[];
    attendance?: AttendanceWithRelations[];
    schedules?: StudentScheduleAssignmentWithRelations[];
};

export type CreateUserImageInput = {
    url: string;
    publicId: string;
};

export type UpdateUserImageInput = CreateUserImageInput;

export type CreateUserInput = {
    email: string;
    name?: string | null;
    phone?: string | null;
    password?: string | null;
    passwordHash?: string | null;
    emailVerified?: PrismaDate | null;
    role?: Role;
    status?: UserStatus;
    image?: CreateUserImageInput | null;
};

export type UpdateUserInput = {
    email?: string;
    name?: string | null;
    phone?: string | null;
    password?: string | null;
    passwordHash?: string | null;
    emailVerified?: PrismaDate | null;
    role?: Role;
    status?: UserStatus;
    image?: UpdateUserImageInput | null;
};

export type CreateStudentUserInput = CreateUserInput & {
    coachId?: string | null;
    planId?: string | null;
    scheduleIds?: string[];
    monthlyPriceCents?: number | null;
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: PrismaDate | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    routineExcelUrl?: string | null;
    notes?: string | null;
};

export type UpdateStudentUserInput = UpdateUserInput & {
    coachId?: string | null;
    planId?: string | null;
    scheduleIds?: string[];
    monthlyPriceCents?: number | null;
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: PrismaDate | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    routineExcelUrl?: string | null;
    notes?: string | null;
};

export type CreateCoachUserInput = CreateUserInput & {
    bio?: string | null;
    specialty?: string | null;
    instagram?: string | null;
    paymentAlias?: string | null;
    paymentAccountHolder?: string | null;
    isActive?: boolean;
};

export type UpdateCoachUserInput = UpdateUserInput & {
    bio?: string | null;
    specialty?: string | null;
    instagram?: string | null;
    paymentAlias?: string | null;
    paymentAccountHolder?: string | null;
    isActive?: boolean;
};
