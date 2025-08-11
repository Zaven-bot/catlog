import { PrismaClient } from '@prisma/client';
import { getAnimeRecommendations } from './openAI'; // Assuming you have a function to get recommendations from OpenAI

const prisma = new PrismaClient();

export const getRecommendations = async (userId: string) => {
    try {
        // Fetch user's watched anime
        const watchedAnime = await prisma.anime.findMany({
            where: { userId },
            select: { title: true, genre: true, rating: true },
        });

        // Generate recommendations based on watched anime
        const recommendations = await getAnimeRecommendations(watchedAnime);

        return recommendations;
    } catch (error) {
        console.error("Error fetching recommendations:", error);
        throw new Error("Could not fetch recommendations");
    } finally {
        await prisma.$disconnect();
    }
};