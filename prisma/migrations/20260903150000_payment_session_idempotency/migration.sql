-- Add a canonical billing period to every payment. The value is always the
-- first day of the month at 00:00 UTC, independently of the payment date.
ALTER TABLE "Payment" ADD COLUMN "periodStart" TIMESTAMP(3);

UPDATE "Payment"
SET "periodStart" = date_trunc(
    'month',
    COALESCE("dueDate", "paidAt", "createdAt")
);

-- If historical retries produced more than one payment for the same student
-- and month, retain a paid record first, otherwise the most recently updated.
CREATE TEMP TABLE "_PaymentDuplicates" ON COMMIT DROP AS
SELECT
    "id" AS "duplicateId",
    first_value("id") OVER (
        PARTITION BY "studentId", "periodStart"
        ORDER BY ("status" = 'PAID') DESC, "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS "keeperId",
    row_number() OVER (
        PARTITION BY "studentId", "periodStart"
        ORDER BY ("status" = 'PAID') DESC, "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS "rowNumber"
FROM "Payment";

UPDATE "Payment" AS keeper
SET
    "reference" = COALESCE(keeper."reference", duplicate."reference"),
    "notes" = COALESCE(keeper."notes", duplicate."notes")
FROM "_PaymentDuplicates" AS mapping
INNER JOIN "Payment" AS duplicate ON duplicate."id" = mapping."duplicateId"
WHERE mapping."rowNumber" > 1
  AND keeper."id" = mapping."keeperId";

DELETE FROM "Payment" AS payment
USING "_PaymentDuplicates" AS mapping
WHERE mapping."rowNumber" > 1
  AND payment."id" = mapping."duplicateId";

ALTER TABLE "Payment" ALTER COLUMN "periodStart" SET NOT NULL;

CREATE UNIQUE INDEX "Payment_studentId_periodStart_key"
ON "Payment"("studentId", "periodStart");

-- Consolidate any historical duplicate class sessions before enforcing the
-- natural key. Existing attendance is moved to the retained session.
CREATE TEMP TABLE "_ClassSessionDuplicates" ON COMMIT DROP AS
SELECT
    "id" AS "duplicateId",
    first_value("id") OVER (
        PARTITION BY "scheduleId", "startsAt"
        ORDER BY "createdAt" ASC, "id" ASC
    ) AS "keeperId",
    row_number() OVER (
        PARTITION BY "scheduleId", "startsAt"
        ORDER BY "createdAt" ASC, "id" ASC
    ) AS "rowNumber"
FROM "ClassSession"
WHERE "scheduleId" IS NOT NULL;

DELETE FROM "Attendance" AS attendance
USING "_ClassSessionDuplicates" AS mapping
WHERE mapping."rowNumber" > 1
  AND attendance."sessionId" = mapping."duplicateId"
  AND EXISTS (
      SELECT 1
      FROM "Attendance" AS retained_attendance
      WHERE retained_attendance."sessionId" = mapping."keeperId"
        AND retained_attendance."studentId" = attendance."studentId"
  );

UPDATE "Attendance" AS attendance
SET "sessionId" = mapping."keeperId"
FROM "_ClassSessionDuplicates" AS mapping
WHERE mapping."rowNumber" > 1
  AND attendance."sessionId" = mapping."duplicateId";

DELETE FROM "ClassSession" AS session
USING "_ClassSessionDuplicates" AS mapping
WHERE mapping."rowNumber" > 1
  AND session."id" = mapping."duplicateId";

CREATE UNIQUE INDEX "ClassSession_scheduleId_startsAt_key"
ON "ClassSession"("scheduleId", "startsAt");
