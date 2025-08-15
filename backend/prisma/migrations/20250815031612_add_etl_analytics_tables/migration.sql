-- CreateTable
CREATE TABLE "RawAnimeData" (
    "id" SERIAL NOT NULL,
    "malId" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,
    "sourceApi" TEXT NOT NULL DEFAULT 'jikan',
    "endpoint" TEXT NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etlRunId" TEXT NOT NULL,

    CONSTRAINT "RawAnimeData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedAnime" (
    "id" SERIAL NOT NULL,
    "malId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "genres" TEXT[],
    "score" DECIMAL(4,2),
    "scoredBy" INTEGER,
    "rank" INTEGER,
    "popularity" INTEGER,
    "members" INTEGER,
    "favorites" INTEGER,
    "episodes" INTEGER,
    "status" TEXT,
    "season" TEXT,
    "year" INTEGER,
    "rating" TEXT,
    "studios" TEXT[],
    "imageUrl" TEXT,
    "synopsis" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etlRunId" TEXT NOT NULL,

    CONSTRAINT "ProcessedAnime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRankings" (
    "id" SERIAL NOT NULL,
    "malId" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "rank" INTEGER,
    "popularity" INTEGER,
    "score" DECIMAL(4,2),
    "scoredBy" INTEGER,
    "members" INTEGER,
    "favorites" INTEGER,
    "etlRunId" TEXT NOT NULL,

    CONSTRAINT "DailyRankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtlLogs" (
    "id" SERIAL NOT NULL,
    "runId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "pipelineStep" TEXT NOT NULL,
    "rowsProcessed" INTEGER,
    "errorMessage" TEXT,
    "apiRequestCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtlLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RawAnimeData_malId_idx" ON "RawAnimeData"("malId");

-- CreateIndex
CREATE INDEX "RawAnimeData_etlRunId_idx" ON "RawAnimeData"("etlRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedAnime_malId_key" ON "ProcessedAnime"("malId");

-- CreateIndex
CREATE INDEX "ProcessedAnime_rank_idx" ON "ProcessedAnime"("rank");

-- CreateIndex
CREATE INDEX "ProcessedAnime_popularity_idx" ON "ProcessedAnime"("popularity");

-- CreateIndex
CREATE INDEX "ProcessedAnime_etlRunId_idx" ON "ProcessedAnime"("etlRunId");

-- CreateIndex
CREATE INDEX "DailyRankings_snapshotDate_idx" ON "DailyRankings"("snapshotDate");

-- CreateIndex
CREATE INDEX "DailyRankings_rank_idx" ON "DailyRankings"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRankings_malId_snapshotDate_key" ON "DailyRankings"("malId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "EtlLogs_runId_key" ON "EtlLogs"("runId");

-- CreateIndex
CREATE INDEX "EtlLogs_status_idx" ON "EtlLogs"("status");

-- CreateIndex
CREATE INDEX "EtlLogs_startTime_idx" ON "EtlLogs"("startTime");
