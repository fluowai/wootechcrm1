-- Migration: Add missionResult JSON field to ProspectMission
-- Execute this SQL in Supabase SQL Editor

ALTER TABLE "ProspectMission" ADD COLUMN IF NOT EXISTS "missionResult" JSONB;
CREATE INDEX IF NOT EXISTS "ProspectMission_missionResult_idx" ON "ProspectMission" USING gin ("missionResult");
