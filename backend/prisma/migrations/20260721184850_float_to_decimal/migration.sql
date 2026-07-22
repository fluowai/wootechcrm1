-- AlterTable: Float → Decimal for monetary, rate, and percentage fields
-- This migration converts float columns to decimal for precision in financial calculations.

-- Plan: pricing
ALTER TABLE "Plan" ALTER COLUMN "priceMonthly" SET DATA TYPE DECIMAL(18,2) USING "priceMonthly"::DECIMAL(18,2);
ALTER TABLE "Plan" ALTER COLUMN "priceYearly" SET DATA TYPE DECIMAL(18,2) USING "priceYearly"::DECIMAL(18,2);

-- Product: unit pricing
ALTER TABLE "Product" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(18,2) USING "unitPrice"::DECIMAL(18,2);

-- SoldProduct: billing amounts
ALTER TABLE "SoldProduct" ALTER COLUMN "setupValue" SET DATA TYPE DECIMAL(18,2) USING "setupValue"::DECIMAL(18,2);
ALTER TABLE "SoldProduct" ALTER COLUMN "monthlyValue" SET DATA TYPE DECIMAL(18,2) USING "monthlyValue"::DECIMAL(18,2);
ALTER TABLE "SoldProduct" ALTER COLUMN "commissionValue" SET DATA TYPE DECIMAL(18,2) USING "commissionValue"::DECIMAL(18,2);

-- AdMetricSnapshot: ad spend metrics
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "spend" SET DATA TYPE DECIMAL(18,2) USING "spend"::DECIMAL(18,2);
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "conversions" SET DATA TYPE DECIMAL(18,6) USING "conversions"::DECIMAL(18,6);
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "conversionValue" SET DATA TYPE DECIMAL(18,2) USING "conversionValue"::DECIMAL(18,2);
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "ctr" SET DATA TYPE DECIMAL(18,6) USING "ctr"::DECIMAL(18,6);
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "cpc" SET DATA TYPE DECIMAL(18,6) USING "cpc"::DECIMAL(18,6);
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "cpm" SET DATA TYPE DECIMAL(18,6) USING "cpm"::DECIMAL(18,6);
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "cpa" SET DATA TYPE DECIMAL(18,2) USING "cpa"::DECIMAL(18,2);
ALTER TABLE "AdMetricSnapshot" ALTER COLUMN "roas" SET DATA TYPE DECIMAL(18,6) USING "roas"::DECIMAL(18,6);

-- AdInsightRecommendation: estimated lift
ALTER TABLE "AdInsightRecommendation" ALTER COLUMN "estimatedLift" SET DATA TYPE DECIMAL(18,6) USING "estimatedLift"::DECIMAL(18,6);

-- LandingPage: conversion rate
ALTER TABLE "LandingPage" ALTER COLUMN "conversionRate" SET DATA TYPE DECIMAL(18,6) USING "conversionRate"::DECIMAL(18,6);

-- QuizResponse: percentage
ALTER TABLE "QuizResponse" ALTER COLUMN "percentage" SET DATA TYPE DECIMAL(18,6) USING "percentage"::DECIMAL(18,6);

-- ClientHealth: engagement rate
ALTER TABLE "ClientHealth" ALTER COLUMN "engagementRate" SET DATA TYPE DECIMAL(18,6) USING "engagementRate"::DECIMAL(18,6);

-- ProspectLearningMetric: rates
ALTER TABLE "ProspectLearningMetric" ALTER COLUMN "responseRate" SET DATA TYPE DECIMAL(18,6) USING "responseRate"::DECIMAL(18,6);
ALTER TABLE "ProspectLearningMetric" ALTER COLUMN "bookingRate" SET DATA TYPE DECIMAL(18,6) USING "bookingRate"::DECIMAL(18,6);

-- OnboardingResponse: average ticket
ALTER TABLE "OnboardingResponse" ALTER COLUMN "averageTicket" SET DATA TYPE DECIMAL(18,2) USING "averageTicket"::DECIMAL(18,2);

-- AiAgent: temperature
ALTER TABLE "AiAgent" ALTER COLUMN "temperature" SET DATA TYPE DECIMAL(18,6) USING "temperature"::DECIMAL(18,6);

-- GoogleLocalScan: scan metrics
ALTER TABLE "GoogleLocalScan" ALTER COLUMN "radiusKm" SET DATA TYPE DECIMAL(18,6) USING "radiusKm"::DECIMAL(18,6);
ALTER TABLE "GoogleLocalScan" ALTER COLUMN "averageRank" SET DATA TYPE DECIMAL(18,6) USING "averageRank"::DECIMAL(18,6);
ALTER TABLE "GoogleLocalScan" ALTER COLUMN "top3Percent" SET DATA TYPE DECIMAL(18,6) USING "top3Percent"::DECIMAL(18,6);
ALTER TABLE "GoogleLocalScan" ALTER COLUMN "top10Percent" SET DATA TYPE DECIMAL(18,6) USING "top10Percent"::DECIMAL(18,6);
ALTER TABLE "GoogleLocalScan" ALTER COLUMN "foundPercent" SET DATA TYPE DECIMAL(18,6) USING "foundPercent"::DECIMAL(18,6);

-- AcpDiagnosis: financial metrics
ALTER TABLE "AcpDiagnosis" ALTER COLUMN "ticketMedio" SET DATA TYPE DECIMAL(18,2) USING "ticketMedio"::DECIMAL(18,2);
ALTER TABLE "AcpDiagnosis" ALTER COLUMN "cacEstimado" SET DATA TYPE DECIMAL(18,2) USING "cacEstimado"::DECIMAL(18,2);
ALTER TABLE "AcpDiagnosis" ALTER COLUMN "ltvEstimado" SET DATA TYPE DECIMAL(18,2) USING "ltvEstimado"::DECIMAL(18,2);
ALTER TABLE "AcpDiagnosis" ALTER COLUMN "scoreMaturidade" SET DATA TYPE DECIMAL(18,6) USING "scoreMaturidade"::DECIMAL(18,6);

-- Qualification: score percent
ALTER TABLE "Qualification" ALTER COLUMN "scorePercent" SET DATA TYPE DECIMAL(18,6) USING "scorePercent"::DECIMAL(18,6);
