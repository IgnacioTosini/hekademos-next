-- CreateEnum
CREATE TYPE "ScheduleChangeRequestType" AS ENUM ('ONE_TIME', 'PERMANENT');

-- CreateEnum
CREATE TYPE "ScheduleChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ScheduleChangeRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "ScheduleChangeRequestType" NOT NULL,
    "status" "ScheduleChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentScheduleIds" TEXT[] NOT NULL,
    "requestedScheduleIds" TEXT[] NOT NULL,
    "requestedDate" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "reviewNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleChangeRequest_studentId_status_idx" ON "ScheduleChangeRequest"("studentId", "status");

-- CreateIndex
CREATE INDEX "ScheduleChangeRequest_type_status_idx" ON "ScheduleChangeRequest"("type", "status");

-- CreateIndex
CREATE INDEX "ScheduleChangeRequest_createdAt_idx" ON "ScheduleChangeRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
