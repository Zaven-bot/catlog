import { PrismaClient } from '@prisma/client';
import { getAnimeRecommendations } from './openAI';

const prisma = new PrismaClient();

export const getRecommendations = async (userId: string) => {
    try {
        // Fetch user's watched anime from userAnime table
        const watchedAnime = await prisma.userAnime.findMany({
            where: { userId: parseInt(userId) },
            include: { 
                anime: {
                    select: { title: true, genres: true, score: true }
                }
            },
        });

        // Extract anime data for recommendations
        const animeData = watchedAnime.map((entry: any) => entry.anime);

        // Generate recommendations based on watched anime
        const recommendations = await getAnimeRecommendations(animeData);

        return recommendations;
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        throw new Error("Could not fetch recommendations");
    } finally {
        await prisma.$disconnect();
    }
};