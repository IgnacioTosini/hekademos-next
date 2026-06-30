import type { TimestampFields, PrismaDate } from '../common';
import type { StudentMembership } from '../memberships';
import type { Coach, CoachWithRelations, Student } from '../users';

export type DayOfWeek =
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';

export type ClassSessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type ScheduleChangeRequestType = 'ONE_TIME' | 'PERMANENT';

export type ScheduleChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type WeeklyClassSchedule = TimestampFields & {
    id: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationMinutes: number;
    capacity: number | null;
    coachId: string | null;
    isActive: boolean;
    notes: string | null;
};

export type ClassSession = TimestampFields & {
    id: string;
    scheduleId: string | null;
    coachId: string | null;
    startsAt: PrismaDate;
    endsAt: PrismaDate | null;
    capacity: number | null;
    status: ClassSessionStatus;
    notes: string | null;
};

export type Attendance = TimestampFields & {
    id: string;
    sessionId: string;
    studentId: string;
    status: AttendanceStatus;
    checkInAt: PrismaDate | null;
    notes: string | null;
};

export type CreateWeeklyClassScheduleInput = {
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationMinutes?: number;
    capacity?: number | null;
    coachId?: string | null;
    isActive?: boolean;
    notes?: string | null;
};

export type UpdateWeeklyClassScheduleInput = Partial<CreateWeeklyClassScheduleInput>;

export type StudentScheduleAssignment = TimestampFields & {
    id: string;
    studentId: string;
    weeklyScheduleId: string;
    studentMembershipId: string | null;
    isActive: boolean;
    notes: string | null;
};

export type WeeklyClassScheduleWithRelations = WeeklyClassSchedule & {
    coach?: CoachWithRelations | null;
    sessions?: ClassSession[];
    studentAssignments?: StudentScheduleAssignment[];
    occupiedSpots?: number;
    availableSpots?: number | null;
};

export type ClassSessionWithRelations = ClassSession & {
    schedule?: WeeklyClassSchedule | null;
    coach?: Coach | null;
    attendance?: Attendance[];
};

export type AttendanceWithRelations = Attendance & {
    session?: ClassSessionWithRelations;
    student?: Student;
};

export type CoachTodayAttendanceStudent = {
    studentId: string;
    name: string;
    email: string;
    imageUrl: string | null;
    status: AttendanceStatus | null;
};

export type CoachTodayAttendanceSchedule = {
    scheduleId: string;
    sessionId: string | null;
    label: string;
    startTime: string;
    endTime: string | null;
    students: CoachTodayAttendanceStudent[];
};

export type AdminAttendanceSchedule = CoachTodayAttendanceSchedule & {
    coachId: string | null;
    coachName: string;
};

export type AdminMonthlyAttendanceStudentSummary = {
    studentId: string;
    name: string;
    email: string;
    coachName: string;
    totalCount: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    lastAttendanceAt: PrismaDate | null;
};

export type AdminMonthlyAttendanceSummary = {
    month: number;
    year: number;
    totalCount: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    students: AdminMonthlyAttendanceStudentSummary[];
};

export type StudentScheduleAssignmentWithRelations = StudentScheduleAssignment & {
    student?: Student;
    weeklySchedule?: WeeklyClassScheduleWithRelations;
    studentMembership?: StudentMembership | null;
};

export type ScheduleChangeRequest = TimestampFields & {
    id: string;
    studentId: string;
    type: ScheduleChangeRequestType;
    status: ScheduleChangeRequestStatus;
    currentScheduleIds: string[];
    requestedScheduleIds: string[];
    requestedDate: PrismaDate | null;
    reason: string;
    reviewNotes: string | null;
    reviewedByUserId: string | null;
    reviewedAt: PrismaDate | null;
};
