CREATE TABLE "SiteContent" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SiteContent_updatedAt_idx" ON "SiteContent"("updatedAt");
