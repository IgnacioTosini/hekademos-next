import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/emptyState/EmptyState";
import { RefreshAt } from "@/components/ui/RefreshAt";
import type { WeeklyClassSchedule } from "@/types/schema/classes";
import type { PrismaDate } from "@/types/schema/common";
import type { AdminStudentProfile } from "@/types/schema/users";
import { getClassCategoryLabel } from "@/utils/class-category";
import { formatDate } from "@/utils/format";
import { dayOrderIndex, getScheduleLabel } from "@/utils/schedule";

type ScheduleDisplay = Pick<
    WeeklyClassSchedule,
    "id" | "dayOfWeek" | "classCategory" | "startTime" | "durationMinutes" | "capacity"
>;

export type TemporaryScheduleChange = {
    id: string;
    sourceScheduleId: string;
    requestedDate: PrismaDate;
    expiresAt: PrismaDate;
    weeklySchedule: ScheduleDisplay;
};

type Props = {
    student: AdminStudentProfile;
    scheduleActions?: ReactNode;
    temporaryScheduleChange?: TemporaryScheduleChange | null;
};

export const StudentProfileScheduleCard = ({ student, scheduleActions, temporaryScheduleChange }: Props) => {
    const activeSchedules = (student.schedules ?? [])
        .flatMap<{
            id: string;
            isTemporary: boolean;
            requestedDate: PrismaDate | null;
            weeklySchedule: ScheduleDisplay;
        }>((scheduleAssignment) => {
            if (!scheduleAssignment.isActive || !scheduleAssignment.weeklySchedule) return [];
            if (scheduleAssignment.weeklyScheduleId === temporaryScheduleChange?.sourceScheduleId) return [];

            return [{
                id: scheduleAssignment.id,
                isTemporary: false,
                requestedDate: null,
                weeklySchedule: scheduleAssignment.weeklySchedule,
            }];
        })
        .concat(temporaryScheduleChange ? [{
            id: `temporary-${temporaryScheduleChange.id}`,
            isTemporary: true,
            requestedDate: temporaryScheduleChange.requestedDate,
            weeklySchedule: temporaryScheduleChange.weeklySchedule,
        }] : [])
        .sort((first, second) => (
            dayOrderIndex[first.weeklySchedule.dayOfWeek] - dayOrderIndex[second.weeklySchedule.dayOfWeek]
            || first.weeklySchedule.startTime.localeCompare(second.weeklySchedule.startTime)
            || getClassCategoryLabel(first.weeklySchedule.classCategory).localeCompare(
                getClassCategoryLabel(second.weeklySchedule.classCategory)
            )
        ));

    return (
        <article className="student-profile-card student-profile-schedule-card">
            {temporaryScheduleChange && <RefreshAt value={temporaryScheduleChange.expiresAt} />}
            <div className="student-profile-card-header student-profile-card-header-compact">
                <h2>Turnos elegidos</h2>
                {scheduleActions}
            </div>
            {activeSchedules.length > 0 ? (
                <div className="student-profile-schedules">
                    {activeSchedules.map((scheduleAssignment) => (
                        <div key={scheduleAssignment.id} className="student-profile-schedule">
                            <div>
                                <strong>{getScheduleLabel(scheduleAssignment.weeklySchedule)}</strong>
                                {scheduleAssignment.isTemporary && (
                                    <small className="student-profile-schedule-temporary">
                                        Solo por esta clase · {formatDate(scheduleAssignment.requestedDate)}
                                    </small>
                                )}
                            </div>
                            <span>{scheduleAssignment.isTemporary
                                ? "Después vuelve tu turno habitual"
                                : scheduleAssignment.weeklySchedule.capacity
                                    ? `Cupo ${scheduleAssignment.weeklySchedule.capacity}`
                                    : "Sin cupo definido"}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState compact className="student-profile-empty" title="Sin turnos asignados" description="Todavia no hay horarios elegidos para este alumno." />
            )}
        </article>
    );

};
