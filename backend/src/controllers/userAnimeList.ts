import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnimeStatus } from '@shared/types';

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

    // Calculate total episodes watched
    const completedAnimeWithEpisodes = await prisma.userAnime.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { anime: true }
    });

    const totalEpisodesWatched = completedAnimeWithEpisodes.reduce((total: number, entry) => {
      return total + (entry.anime.episodes || 0);
    }, 0);

    res.json({
      totalAnime,
      completedAnime,
      watchingAnime,
      plannedAnime,
      droppedAnime,
      onHoldAnime,
      totalEpisodesWatched
    });
  } catch (error) {
    console.error('Get user anime stats error:', error);
    res.status(500).json({ error: 'Failed to get anime statistics' });
  }
};