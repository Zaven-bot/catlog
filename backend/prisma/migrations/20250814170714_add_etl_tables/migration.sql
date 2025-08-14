-- CreateTable
CREATE TABLE "RawAnimeData" (
    "id" SERIAL NOT NULL,
    "malId" INTEGER NOT NULL,
    "rawJson" JSONB NOT NULL,
    "sourceApi" TEXT NOT NULL DEFAULT 'jikan',
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
    "score" DOUBLE PRECISION,
    "members" INTEGER,
    "popularity" INTEGER,
    "rank" INTEGER,
    "airedFrom" TIMESTAMP(3),
    "airedTo" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "episodes" INTEGER,
    "duration" TEXT,
    "rating" TEXT,
    "studios" TEXT[],
    "year" INTEGER,
    "season" TEXT,
    "imageUrl" TEXT,
    "synopsis" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etlRunId" TEXT NOT NULL,

    CONSTRAINT "ProcessedAnime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtlLogs" (
    "id" SERIAL NOT NULL,
    "runId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "rowsProcessed" INTEGER,
    "errorMessage" TEXT,
    "pipelineStep" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtlLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedAnime_malId_key" ON "ProcessedAnime"("malId");

-- CreateIndex
CREATE UNIQUE INDEX "EtlLogs_runId_key" ON "EtlLogs"("runId");
