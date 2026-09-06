ALTER TABLE "CommunityPost"
ALTER COLUMN "type" TYPE TEXT USING "type"::text;

UPDATE "CommunityPost"
SET "type" = CASE "type"
    WHEN 'QUESTION' THEN 'Pregunta'
    WHEN 'REFLECTION' THEN 'Reflexión'
    WHEN 'VIDEO' THEN 'Video'
    ELSE "type"
END;

ALTER TABLE "CommunityPost"
ADD COLUMN "authorCoachId" TEXT;

CREATE INDEX "CommunityPost_authorCoachId_idx"
ON "CommunityPost"("authorCoachId");

ALTER TABLE "CommunityPost"
ADD CONSTRAINT "CommunityPost_authorCoachId_fkey"
FOREIGN KEY ("authorCoachId") REFERENCES "Coach"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

DROP TYPE "CommunityPostType";
