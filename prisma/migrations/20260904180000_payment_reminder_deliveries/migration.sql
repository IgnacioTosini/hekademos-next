CREATE TABLE "PaymentReminderDelivery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "reminderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "channel" TEXT,
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentReminderDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentReminderDelivery_studentId_periodStart_reminderType_key"
    ON "PaymentReminderDelivery"("studentId", "periodStart", "reminderType");
CREATE INDEX "PaymentReminderDelivery_periodStart_status_idx"
    ON "PaymentReminderDelivery"("periodStart", "status");
ALTER TABLE "PaymentReminderDelivery" ADD CONSTRAINT "PaymentReminderDelivery_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
