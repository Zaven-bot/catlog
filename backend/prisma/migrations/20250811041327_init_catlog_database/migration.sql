-- CreateEnum
CREATE TYPE "AnimeStatus" AS ENUM ('WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLAN_TO_WATCH');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAnime" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "animeId" INTEGER NOT NULL,
    "status" "AnimeStatus" NOT NULL DEFAULT 'PLAN_TO_WATCH',
    "personalRating" SMALLINT,
    "notes" TEXT,
    "episodesWatched" INTEGER DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAnime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anime" (
    "id" SERIAL NOT NULL,
    "malId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "titleEnglish" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "genres" TEXT[],
    "episodes" INTEGER,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "year" INTEGER,
    "rating" TEXT,
    "studios" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnime_userId_animeId_key" ON "UserAnime"("userId", "animeId");

-- CreateIndex
CREATE UNIQUE INDEX "Anime_malId_key" ON "Anime"("malId");

-- AddForeignKey
ALTER TABLE "UserAnime" ADD CONSTRAINT "UserAnime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnime" ADD CONSTRAINT "UserAnime_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
