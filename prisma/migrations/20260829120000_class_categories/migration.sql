-- CreateEnum
CREATE TYPE "ClassCategory" AS ENUM ('CALISTHENICS', 'MOBILITY', 'SPECIAL');

-- AlterTable
ALTER TABLE "MembershipPlan"
ADD COLUMN "classCategory" "ClassCategory" NOT NULL DEFAULT 'CALISTHENICS';

-- AlterTable
ALTER TABLE "WeeklyClassSchedule"
ADD COLUMN "classCategory" "ClassCategory" NOT NULL DEFAULT 'CALISTHENICS';

-- CreateIndex
CREATE INDEX "WeeklyClassSchedule_classCategory_idx" ON "WeeklyClassSchedule"("classCategory");
