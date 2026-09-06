CREATE TYPE "CommunityPostType" AS ENUM ('QUESTION', 'REFLECTION', 'VIDEO');

CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "type" "CommunityPostType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "videoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdByName" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityPost_isPublished_createdAt_idx" ON "CommunityPost"("isPublished", "createdAt");
CREATE INDEX "CommunityPost_type_idx" ON "CommunityPost"("type");
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");
CREATE INDEX "CommunityComment_studentId_idx" ON "CommunityComment"("studentId");

ALTER TABLE "CommunityComment"
ADD CONSTRAINT "CommunityComment_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityComment"
ADD CONSTRAINT "CommunityComment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
