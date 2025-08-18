-- AlterTable
ALTER TABLE "DailyRankings" ADD COLUMN     "genres" TEXT[];

-- CreateIndex
CREATE INDEX "DailyRankings_malId_idx" ON "DailyRankings"("malId");

-- CreateIndex
CREATE INDEX "DailyRankings_malId_snapshotDate_idx" ON "DailyRankings"("malId", "snapshotDate");
