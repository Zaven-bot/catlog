import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
// Import from Prisma generated types instead
import { AnimeStatus } from '@prisma/client';

import { JikanService } from '../services/jikanService';

const prisma = new PrismaClient();

// Add anime to user's list
export const addAnimeToList = async (req: Request, res: Response) => {
  try {
    const { malId, status, personalRating, notes } = req.body;
    const userId = req.user?.id; // From auth middleware

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!malId || !status) {
      return res.status(400).json({ error: 'malId and status are required' });
    }

    // First, ensure the anime exists in our database
    let anime = await prisma.anime.findUnique({
      where: { malId: parseInt(malId) }
    });

    if (!anime) {
      // Fetch from Jikan API and save to database
      const jikanAnime = await JikanService.getAnimeById(parseInt(malId));
      const transformedData = JikanService.transformAnimeData(jikanAnime);
      
      anime = await prisma.anime.create({
        data: transformedData
      });
    }

    // Check if anime is already in user's list
    const existingEntry = await prisma.userAnime.findUnique({
      where: {
        userId_animeId: {
          userId,
          animeId: anime.id
        }
      }
    });

    if (existingEntry) {
      // Update existing entry
      const updatedEntry = await prisma.userAnime.update({
        where: { id: existingEntry.id },
        data: {
          status: status as AnimeStatus,
          personalRating,
          notes,
          startDate: status === 'WATCHING' ? new Date() : existingEntry.startDate,
          completedDate: status === 'COMPLETED' ? new Date() : null,
          updatedAt: new Date()
        },
        include: {
          anime: true
        }
      });

      return res.json({
        message: 'Anime updated in your list',
        userAnime: updatedEntry
      });
    } else {
      // Create new entry
      const newEntry = await prisma.userAnime.create({
        data: {
          userId,
          animeId: anime.id,
          status: status as AnimeStatus,
          personalRating,
          notes,
          startDate: status === 'WATCHING' ? new Date() : undefined,
          completedDate: status === 'COMPLETED' ? new Date() : undefined
        },
        include: {
          anime: true
        }
      });

      return res.json({
        message: 'Anime added to your list',
        userAnime: newEntry
      });
    }
  } catch (error) {
    console.error('Add anime to list error:', error);
    res.status(500).json({ error: 'Failed to add anime to list' });
  }
};

// Get user's anime list
export const getUserAnimeList = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [userAnimeList, total] = await Promise.all([
      prisma.userAnime.findMany({
        where,
        include: {
          anime: true
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.userAnime.count({ where })
    ]);

    res.json({
      data: userAnimeList,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get user anime list error:', error);
    res.status(500).json({ error: 'Failed to get anime list' });
  }
};

// Update anime in user's list
export const updateAnimeInList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, personalRating, notes, episodesWatched, isFavorite } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userAnime = await prisma.userAnime.findFirst({
      where: {
        id: parseInt(id),
        userId
      }
    });

    if (!userAnime) {
      return res.status(404).json({ error: 'Anime not found in your list' });
    }

    const updatedEntry = await prisma.userAnime.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status: status as AnimeStatus }),
        ...(personalRating !== undefined && { personalRating }),
        ...(notes !== undefined && { notes }),
        ...(episodesWatched !== undefined && { episodesWatched }),
        ...(isFavorite !== undefined && { isFavorite }),
        ...(status === 'WATCHING' && !userAnime.startDate && { startDate: new Date() }),
        ...(status === 'COMPLETED' && { completedDate: new Date() }),
        updatedAt: new Date()
      },
      include: {
        anime: true
      }
    });

    res.json({
      message: 'Anime updated successfully',
      userAnime: updatedEntry
    });
  } catch (error) {
    console.error('Update anime in list error:', error);
    res.status(500).json({ error: 'Failed to update anime' });
  }
};

// Remove anime from user's list
export const removeAnimeFromList = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const userAnime = await prisma.userAnime.findFirst({
      where: {
        id: parseInt(id),
        userId
      }
    });

    if (!userAnime) {
      return res.status(404).json({ error: 'Anime not found in your list' });
    }

    await prisma.userAnime.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Anime removed from your list' });
  } catch (error) {
    console.error('Remove anime from list error:', error);
    res.status(500).json({ error: 'Failed to remove anime' });
  }
};

// Get user's anime statistics
export const getUserAnimeStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [
      totalAnime,
      completedAnime,
      watchingAnime,
      plannedAnime,
      droppedAnime,
      onHoldAnime
    ] = await Promise.all([
      prisma.userAnime.count({ where: { userId } }),
      prisma.userAnime.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.userAnime.count({ where: { userId, status: 'WATCHING' } }),
      prisma.userAnime.count({ where: { userId, status: 'PLAN_TO_WATCH' } }),
      prisma.userAnime.count({ where: { userId, status: 'DROPPED' } }),
      prisma.userAnime.count({ where: { userId, status: 'ON_HOLD' } })
    ]);

    // Get all user anime with anime details for advanced analytics
    const userAnimeList = await prisma.userAnime.findMany({
      where: { userId },
      include: { anime: true }
    });

    // Calculate total episodes watched (including episodesWatched field for currently watching)
    const totalEpisodesWatched = userAnimeList.reduce((total: number, entry) => {
      if (entry.status === 'COMPLETED') {
        return total + (entry.anime.episodes || 0);
      } else if (entry.status === 'WATCHING' && entry.episodesWatched) {
        return total + entry.episodesWatched;
      }
      return total;
    }, 0);

    // Calculate estimated watch time (assuming 24 minutes per episode)
    const totalWatchTimeMinutes = totalEpisodesWatched * 24;
    const totalWatchTimeHours = Math.round(totalWatchTimeMinutes / 60);
    const totalWatchTimeDays = Math.round(totalWatchTimeHours / 24 * 10) / 10; // 1 decimal place

    // Genre analysis
    const genreMap = new Map<string, number>();
    userAnimeList.forEach(entry => {
      entry.anime.genres.forEach(genre => {
        genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
      });
    });
    
    const topGenres = Array.from(genreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([genre, count]) => ({ genre, count }));

    // Rating distribution analysis
    const ratingDistribution = {
      excellent: userAnimeList.filter(entry => entry.personalRating && entry.personalRating >= 9).length,
      great: userAnimeList.filter(entry => entry.personalRating && entry.personalRating >= 7 && entry.personalRating < 9).length,
      good: userAnimeList.filter(entry => entry.personalRating && entry.personalRating >= 5 && entry.personalRating < 7).length,
      poor: userAnimeList.filter(entry => entry.personalRating && entry.personalRating < 5).length,
      unrated: userAnimeList.filter(entry => !entry.personalRating).length
    };

    // Year analysis (when anime was released)
    const yearMap = new Map<number, number>();
    userAnimeList.forEach(entry => {
      if (entry.anime.year) {
        yearMap.set(entry.anime.year, (yearMap.get(entry.anime.year) || 0) + 1);
      }
    });
    
    const yearDistribution = Array.from(yearMap.entries())
      .sort((a, b) => b[0] - a[0]) // Sort by year descending
      .slice(0, 10) // Top 10 years
      .map(([year, count]) => ({ year, count }));

    // Score analysis (MAL scores)
    const averageScore = userAnimeList.length > 0 
      ? userAnimeList.reduce((sum, entry) => sum + (entry.anime.score || 0), 0) / userAnimeList.length
      : 0;

    const personalAverageRating = userAnimeList.filter(entry => entry.personalRating).length > 0
      ? userAnimeList
          .filter(entry => entry.personalRating)
          .reduce((sum, entry) => sum + (entry.personalRating || 0), 0) / 
        userAnimeList.filter(entry => entry.personalRating).length
      : 0;

    // Monthly activity (last 12 months)
    const now = new Date();
    const monthlyActivity = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthlyCount = userAnimeList.filter(entry => {
        const entryDate = new Date(entry.updatedAt);
        return entryDate >= monthDate && entryDate < nextMonthDate;
      }).length;

      monthlyActivity.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthlyCount
      });
    }

    // Favorite studios (top 5)
    const studioMap = new Map<string, number>();
    userAnimeList.forEach(entry => {
      entry.anime.studios.forEach(studio => {
        studioMap.set(studio, (studioMap.get(studio) || 0) + 1);
      });
    });
    
    const topStudios = Array.from(studioMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([studio, count]) => ({ studio, count }));

    // Completion rate
    const completionRate = totalAnime > 0 ? Math.round((completedAnime / totalAnime) * 100) : 0;

    // Drop rate
    const dropRate = totalAnime > 0 ? Math.round((droppedAnime / totalAnime) * 100) : 0;

    res.json({
      // Basic counts
      totalAnime,
      completedAnime,
      watchingAnime,
      plannedAnime,
      droppedAnime,
      onHoldAnime,
      
      // Episode and time stats
      totalEpisodesWatched,
      totalWatchTimeMinutes,
      totalWatchTimeHours,
      totalWatchTimeDays,
      
      // Genre analysis
      topGenres,
      
      // Rating analysis
      ratingDistribution,
      personalAverageRating: Math.round(personalAverageRating * 10) / 10,
      
      // Score analysis
      averageScore: Math.round(averageScore * 10) / 10,
      
      // Year distribution
      yearDistribution,
      
      // Activity tracking
      monthlyActivity,
      
      // Studio preferences
      topStudios,
      
      // Completion metrics
      completionRate,
      dropRate
    });
  } catch (error) {
    console.error('Get user anime stats error:', error);
    res.status(500).json({ error: 'Failed to get anime statistics' });
  }
};