-- Convert the fixed enum to editable category names without touching plans,
-- schedules or student assignments.
ALTER TABLE "MembershipPlan" ALTER COLUMN "classCategory" DROP DEFAULT;
ALTER TABLE "WeeklyClassSchedule" ALTER COLUMN "classCategory" DROP DEFAULT;

ALTER TABLE "MembershipPlan"
ALTER COLUMN "classCategory" TYPE TEXT
USING CASE "classCategory"::TEXT
    WHEN 'CALISTHENICS' THEN 'Calistenia'
    WHEN 'MOBILITY' THEN 'Movilidad'
    WHEN 'SPECIAL' THEN 'Clase especial'
    ELSE COALESCE("classCategory"::TEXT, 'Calistenia')
END;

ALTER TABLE "WeeklyClassSchedule"
ALTER COLUMN "classCategory" TYPE TEXT
USING CASE "classCategory"::TEXT
    WHEN 'CALISTHENICS' THEN 'Calistenia'
    WHEN 'MOBILITY' THEN 'Movilidad'
    WHEN 'SPECIAL' THEN 'Clase especial'
    ELSE COALESCE("classCategory"::TEXT, 'Calistenia')
END;

ALTER TABLE "MembershipPlan" ALTER COLUMN "classCategory" SET DEFAULT 'Calistenia';
ALTER TABLE "WeeklyClassSchedule" ALTER COLUMN "classCategory" SET DEFAULT 'Calistenia';

DROP TYPE "ClassCategory";

CREATE TABLE "ClassCategoryOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassCategoryOption_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ClassCategoryOption" ("id", "name", "normalizedName", "updatedAt")
VALUES
    ('category-calistenia', 'Calistenia', 'calistenia', CURRENT_TIMESTAMP),
    ('category-movilidad', 'Movilidad', 'movilidad', CURRENT_TIMESTAMP),
    ('category-clase-especial', 'Clase especial', 'clase especial', CURRENT_TIMESTAMP);

CREATE UNIQUE INDEX "ClassCategoryOption_normalizedName_key" ON "ClassCategoryOption"("normalizedName");
CREATE INDEX "ClassCategoryOption_name_idx" ON "ClassCategoryOption"("name");
