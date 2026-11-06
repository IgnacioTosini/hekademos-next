// Read-only query plans for the month with the latest recorded attendance.
// Run with: node -r dotenv/config scripts/measure-attendance-readonly.mjs
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
    const [{ month }] = await prisma.$queryRaw`
        SELECT date_trunc('month', MAX(cs."startsAt")) AS month
        FROM "Attendance" a
        JOIN "ClassSession" cs ON cs."id" = a."sessionId"
    `;
    if (!month) {
        console.log('No hay asistencias para medir.');
        process.exitCode = 0;
    } else {
        const start = new Date(month);
        const end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
        const queries = {
            totals: `SELECT COUNT(DISTINCT a."studentId"), COUNT(*)
                FROM "Attendance" a JOIN "ClassSession" cs ON cs."id" = a."sessionId"
                WHERE cs."startsAt" >= $1 AND cs."startsAt" < $2`,
            page: `WITH filtered_attendance AS (
                    SELECT a."studentId", a."status", cs."startsAt" AS "attendanceAt",
                        s."firstName", s."lastName", u."name" AS "userName", u."email",
                        cu."name" AS "coachUserName", cu."email" AS "coachUserEmail"
                    FROM "Attendance" a
                    JOIN "ClassSession" cs ON cs."id" = a."sessionId"
                    JOIN "Student" s ON s."id" = a."studentId"
                    JOIN "User" u ON u."id" = s."userId"
                    LEFT JOIN "Coach" c ON c."id" = cs."coachId"
                    LEFT JOIN "User" cu ON cu."id" = c."userId"
                    WHERE cs."startsAt" >= $1 AND cs."startsAt" < $2
                ), student_summary AS (
                    SELECT "studentId", MAX("firstName") AS "firstName",
                        MAX("lastName") AS "lastName", MAX("userName") AS "userName",
                        MAX("email") AS "email", COUNT(*)::int AS "totalCount",
                        COUNT(*) FILTER (WHERE "status" = 'PRESENT')::int AS "presentCount",
                        COUNT(*) FILTER (WHERE "status" = 'ABSENT')::int AS "absentCount",
                        COUNT(*) FILTER (WHERE "status" = 'LATE')::int AS "lateCount",
                        COUNT(*) FILTER (WHERE "status" = 'EXCUSED')::int AS "excusedCount",
                        MAX("attendanceAt") AS "lastAttendanceAt"
                    FROM filtered_attendance GROUP BY "studentId"
                ), latest_coach AS (
                    SELECT DISTINCT ON ("studentId") "studentId", "coachUserName", "coachUserEmail"
                    FROM filtered_attendance ORDER BY "studentId", "attendanceAt" DESC
                )
                SELECT ss.*, lc."coachUserName", lc."coachUserEmail"
                FROM student_summary ss LEFT JOIN latest_coach lc ON lc."studentId" = ss."studentId"
                ORDER BY COALESCE(NULLIF(TRIM(CONCAT_WS(' ', ss."firstName", ss."lastName")), ''), ss."userName", ss."email") COLLATE "C", ss."studentId"
                LIMIT 15 OFFSET 0`,
        };
        const [{ attendanceRows, studentCount }] = await prisma.$queryRaw`
            SELECT COUNT(*) AS "attendanceRows", COUNT(DISTINCT a."studentId") AS "studentCount"
            FROM "Attendance" a JOIN "ClassSession" cs ON cs."id" = a."sessionId"
            WHERE cs."startsAt" >= ${start} AND cs."startsAt" < ${end}
        `;
        console.log(JSON.stringify({ attendanceRows: Number(attendanceRows), studentCount: Number(studentCount) }));
        for (const [name, query] of Object.entries(queries)) {
            const [{ 'QUERY PLAN': [plan] }] = await prisma.$queryRawUnsafe(
                `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
                start,
                end,
            );
            console.log(JSON.stringify({
                month: start.toISOString().slice(0, 7),
                query: name,
                executionMs: plan['Execution Time'],
                planningMs: plan['Planning Time'],
                rootNode: plan.Plan['Node Type'],
                rows: plan.Plan['Actual Rows'],
                sharedReadBlocks: plan.Plan['Shared Read Blocks'],
                sharedHitBlocks: plan.Plan['Shared Hit Blocks'],
            }));
        }
    }
} catch (error) {
    console.error(`No se pudo medir la base de datos: ${error.code || error.name}; ${String(error.message).split('\n').filter(Boolean).at(-1)}`);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
