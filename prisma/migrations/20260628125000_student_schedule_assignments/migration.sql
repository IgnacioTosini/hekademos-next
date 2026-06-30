CREATE TABLE "StudentScheduleAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weeklyScheduleId" TEXT NOT NULL,
    "studentMembershipId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentScheduleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentScheduleAssignment_studentId_weeklyScheduleId_key" ON "StudentScheduleAssignment"("studentId", "weeklyScheduleId");
CREATE INDEX "StudentScheduleAssignment_studentId_isActive_idx" ON "StudentScheduleAssignment"("studentId", "isActive");
CREATE INDEX "StudentScheduleAssignment_weeklyScheduleId_idx" ON "StudentScheduleAssignment"("weeklyScheduleId");
CREATE INDEX "StudentScheduleAssignment_studentMembershipId_idx" ON "StudentScheduleAssignment"("studentMembershipId");

ALTER TABLE "StudentScheduleAssignment" ADD CONSTRAINT "StudentScheduleAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentScheduleAssignment" ADD CONSTRAINT "StudentScheduleAssignment_weeklyScheduleId_fkey" FOREIGN KEY ("weeklyScheduleId") REFERENCES "WeeklyClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentScheduleAssignment" ADD CONSTRAINT "StudentScheduleAssignment_studentMembershipId_fkey" FOREIGN KEY ("studentMembershipId") REFERENCES "StudentMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
