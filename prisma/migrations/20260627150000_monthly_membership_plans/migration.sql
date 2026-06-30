-- Rename membership plan frequency to monthly plan training days.
ALTER TABLE "MembershipPlan" RENAME COLUMN "weeklyClasses" TO "trainingDaysPerWeek";
ALTER TABLE "MembershipPlan" DROP COLUMN "monthlyClasses";

-- Simplify membership statuses.
ALTER TABLE "StudentMembership" ALTER COLUMN "status" DROP DEFAULT;
UPDATE "StudentMembership" SET "status" = 'CANCELLED' WHERE "status" = 'PAUSED';

CREATE TYPE "MembershipStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
ALTER TABLE "StudentMembership"
    ALTER COLUMN "status" TYPE "MembershipStatus_new"
    USING ("status"::text::"MembershipStatus_new");
ALTER TYPE "MembershipStatus" RENAME TO "MembershipStatus_old";
ALTER TYPE "MembershipStatus_new" RENAME TO "MembershipStatus";
DROP TYPE "MembershipStatus_old";
ALTER TABLE "StudentMembership" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- Simplify payment statuses.
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
UPDATE "Payment" SET "status" = 'PENDING' WHERE "status" = 'FAILED';

CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED');
ALTER TABLE "Payment"
    ALTER COLUMN "status" TYPE "PaymentStatus_new"
    USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
