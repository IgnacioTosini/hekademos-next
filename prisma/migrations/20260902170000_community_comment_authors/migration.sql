ALTER TABLE "CommunityComment"
DROP CONSTRAINT "CommunityComment_studentId_fkey";

ALTER TABLE "CommunityComment"
ALTER COLUMN "studentId" DROP NOT NULL,
ADD COLUMN "coachId" TEXT,
ADD COLUMN "authorRole" "Role" NOT NULL DEFAULT 'STUDENT',
ADD COLUMN "authorName" TEXT,
ADD COLUMN "createdByUserId" TEXT;

UPDATE "CommunityComment" AS comment
SET
    "authorName" = COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', student."firstName", student."lastName")), ''),
        account."name",
        'Alumno'
    ),
    "createdByUserId" = student."userId"
FROM "Student" AS student
INNER JOIN "User" AS account ON account."id" = student."userId"
WHERE comment."studentId" = student."id";

CREATE INDEX "CommunityComment_coachId_idx"
ON "CommunityComment"("coachId");

CREATE INDEX "CommunityComment_createdByUserId_idx"
ON "CommunityComment"("createdByUserId");

ALTER TABLE "CommunityComment"
ADD CONSTRAINT "CommunityComment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunityComment"
ADD CONSTRAINT "CommunityComment_coachId_fkey"
FOREIGN KEY ("coachId") REFERENCES "Coach"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
