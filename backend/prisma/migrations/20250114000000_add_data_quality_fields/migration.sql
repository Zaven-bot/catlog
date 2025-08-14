-- Add data quality validation fields to EtlLogs table
ALTER TABLE "EtlLogs" ADD COLUMN "validationSuccess" BOOLEAN;
ALTER TABLE "EtlLogs" ADD COLUMN "validationRunId" TEXT;
ALTER TABLE "EtlLogs" ADD COLUMN "totalExpectations" INTEGER;
ALTER TABLE "EtlLogs" ADD COLUMN "successfulExpectations" INTEGER;
ALTER TABLE "EtlLogs" ADD COLUMN "failedExpectations" INTEGER;
ALTER TABLE "EtlLogs" ADD COLUMN "validationSuccessPercent" DOUBLE PRECISION;
ALTER TABLE "EtlLogs" ADD COLUMN "validationDetails" JSONB;