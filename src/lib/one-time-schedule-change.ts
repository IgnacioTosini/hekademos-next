import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getLocalDayRange, getNextScheduleOccurrence } from "@/utils/schedule";

type ScheduleChangeDatabase = Pick<
    Prisma.TransactionClient,
    "scheduleChangeRequest" | "weeklyClassSchedule"
>;

export type OneTimeScheduleChange = {
    id: string;
    studentId: string;
    sourceScheduleId: string;
    sourceDate: Date;
    targetScheduleId: string;
    requestedDate: Date;
};

export const getOneTimeScheduleChangesForDate = async (
    date: Date,
    database: ScheduleChangeDatabase = prisma
): Promise<OneTimeScheduleChange[]> => {
    const { start, end } = getLocalDayRange(date);
    const candidateStart = new Date(start);
    const candidateEnd = new Date(end);

    candidateStart.setDate(candidateStart.getDate() - 7);
    candidateEnd.setDate(candidateEnd.getDate() + 7);

    const requests = await database.scheduleChangeRequest.findMany({
        where: {
            type: "ONE_TIME",
            status: "APPROVED",
            requestedDate: {
                gte: candidateStart,
                lt: candidateEnd,
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            id: true,
            studentId: true,
            currentScheduleIds: true,
            requestedScheduleIds: true,
            requestedDate: true,
            createdAt: true,
        },
    });
    const sourceScheduleIds = Array.from(new Set(requests.flatMap((request) => request.currentScheduleIds)));
    const sourceSchedules = sourceScheduleIds.length > 0
        ? await database.weeklyClassSchedule.findMany({
            where: {
                id: {
                    in: sourceScheduleIds,
                },
            },
            select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
            },
        })
        : [];
    const sourceScheduleById = new Map(sourceSchedules.map((schedule) => [schedule.id, schedule]));
    const seenStudentIds = new Set<string>();

    return requests.flatMap((request) => {
        const sourceScheduleId = request.currentScheduleIds[0];
        const sourceSchedule = sourceScheduleById.get(sourceScheduleId);

        if (
            seenStudentIds.has(request.studentId)
            || request.currentScheduleIds.length !== 1
            || request.requestedScheduleIds.length !== 1
            || !request.requestedDate
            || !sourceSchedule
        ) {
            return [];
        }

        const sourceDate = getNextScheduleOccurrence(sourceSchedule, request.createdAt);
        const affectsSelectedDate = (
            (sourceDate >= start && sourceDate < end)
            || (request.requestedDate >= start && request.requestedDate < end)
        );

        if (!affectsSelectedDate) return [];

        seenStudentIds.add(request.studentId);

        return [{
            id: request.id,
            studentId: request.studentId,
            sourceScheduleId,
            sourceDate,
            targetScheduleId: request.requestedScheduleIds[0],
            requestedDate: request.requestedDate,
        }];
    });
};

export const getEffectiveScheduleStudentIds = ({
    scheduleId,
    fixedStudentIds,
    changes,
}: {
    scheduleId: string;
    fixedStudentIds: string[];
    changes: OneTimeScheduleChange[];
}) => {
    const studentIds = new Set(fixedStudentIds);

    changes.forEach((change) => {
        if (change.sourceScheduleId === scheduleId) studentIds.delete(change.studentId);
        if (change.targetScheduleId === scheduleId) studentIds.add(change.studentId);
    });

    return Array.from(studentIds);
};

export const isStudentInScheduleForDate = ({
    studentId,
    scheduleId,
    hasFixedAssignment,
    changes,
}: {
    studentId: string;
    scheduleId: string;
    hasFixedAssignment: boolean;
    changes: OneTimeScheduleChange[];
}) => {
    const change = changes.find((item) => item.studentId === studentId);

    if (!change) return hasFixedAssignment;
    if (change.targetScheduleId === scheduleId) return true;
    if (change.sourceScheduleId === scheduleId) return false;

    return hasFixedAssignment;
};
