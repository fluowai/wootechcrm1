-- Migration: Add closing flow tables
-- Execute this SQL in Supabase SQL Editor

-- CreateTable: ContractSignature
CREATE TABLE "ContractSignature" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerCpf" TEXT,
    "signerEmail" TEXT,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PaymentTransaction
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "contractId" TEXT,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'PIX',
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalId" TEXT,
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "pixCopiaECola" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CloserChecklistItem
CREATE TABLE "CloserChecklistItem" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedBy" TEXT,
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloserChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "ContractSignature_contractId_idx" ON "ContractSignature"("contractId");
CREATE INDEX "ContractSignature_organizationId_idx" ON "ContractSignature"("organizationId");
CREATE INDEX "PaymentTransaction_clientId_idx" ON "PaymentTransaction"("clientId");
CREATE INDEX "PaymentTransaction_contractId_idx" ON "PaymentTransaction"("contractId");
CREATE INDEX "PaymentTransaction_organizationId_idx" ON "PaymentTransaction"("organizationId");
CREATE INDEX "PaymentTransaction_externalId_idx" ON "PaymentTransaction"("externalId");
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");
CREATE INDEX "CloserChecklistItem_clientId_idx" ON "CloserChecklistItem"("clientId");
CREATE INDEX "CloserChecklistItem_organizationId_idx" ON "CloserChecklistItem"("organizationId");

-- Foreign Keys
ALTER TABLE "ContractSignature" ADD CONSTRAINT "ContractSignature_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CloserChecklistItem" ADD CONSTRAINT "CloserChecklistItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
