-- Migration: Add user phone and account contact verification
-- Execute this SQL in Supabase SQL Editor

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifiedContactAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNormalized_key" ON "User"("phoneNormalized");
CREATE INDEX IF NOT EXISTS "User_phoneNormalized_idx" ON "User"("phoneNormalized");

CREATE TABLE IF NOT EXISTS "AccountVerification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountVerification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountVerification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AccountVerification_userId_channel_idx" ON "AccountVerification"("userId", "channel");
CREATE INDEX IF NOT EXISTS "AccountVerification_expiresAt_idx" ON "AccountVerification"("expiresAt");
CREATE INDEX IF NOT EXISTS "AccountVerification_consumedAt_idx" ON "AccountVerification"("consumedAt");
