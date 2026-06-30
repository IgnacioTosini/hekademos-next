DROP INDEX "WeeklyClassSchedule_dayOfWeek_startTime_key";

CREATE UNIQUE INDEX "WeeklyClassSchedule_dayOfWeek_startTime_coachId_key" ON "WeeklyClassSchedule"("dayOfWeek", "startTime", "coachId");
