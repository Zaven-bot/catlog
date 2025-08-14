-- CreateTable
CREATE TABLE "LivePopularity" (
    "id" SERIAL NOT NULL,
    "malId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "currentScore" DOUBLE PRECISION,
    "liveMembers" INTEGER,
    "trendingRank" INTEGER,
    "popularityChange" DOUBLE PRECISION,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" TEXT NOT NULL,

    CONSTRAINT "LivePopularity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LivePopularity_malId_idx" ON "LivePopularity"("malId");

-- CreateIndex
CREATE INDEX "LivePopularity_lastUpdate_idx" ON "LivePopularity"("lastUpdate");
