CREATE TABLE "WhatsAppIntegration" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT,
    "verifiedName" TEXT,
    "accessTokenEncrypted" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "accessTokenAuthTag" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedByUserId" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppIntegration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsAppIntegration_wabaId_idx" ON "WhatsAppIntegration"("wabaId");
CREATE INDEX "WhatsAppIntegration_phoneNumberId_idx" ON "WhatsAppIntegration"("phoneNumberId");
