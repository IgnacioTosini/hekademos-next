CREATE TABLE "WhatsAppMessageDelivery" (
    "messageId" TEXT NOT NULL,
    "kind" TEXT,
    "referenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "statusAt" TIMESTAMP(3),
    "errorCode" INTEGER,
    "errorText" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppMessageDelivery_pkey" PRIMARY KEY ("messageId")
);

CREATE INDEX "WhatsAppMessageDelivery_createdAt_idx" ON "WhatsAppMessageDelivery"("createdAt");
CREATE INDEX "WhatsAppMessageDelivery_kind_referenceId_idx" ON "WhatsAppMessageDelivery"("kind", "referenceId");
CREATE INDEX "WhatsAppMessageDelivery_status_createdAt_idx" ON "WhatsAppMessageDelivery"("status", "createdAt");
