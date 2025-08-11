import { Request, Response } from 'express';
import { JikanService } from '../services/jikanService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const searchAnime = async (req: Request, res: Response) => {
  try {
    const { q: query, page = 1, limit = 25 } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchResults = await JikanService.searchAnime(
      query, 
      parseInt(page as string), 
      parseInt(limit as string)
    );

    const transformedAnime = searchResults.data.map(anime => 
      JikanService.transformAnimeData(anime)
    );

    res.json({
      data: transformedAnime,
      pagination: searchResults.pagination,
      query
    });
  } catch (error) {
    console.error('Search anime error:', error);
    res.status(500).json({ error: 'Failed to search anime' });
  }
};

export const getAnimeDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const malId = parseInt(id);

    if (isNaN(malId)) {
      return res.status(400).json({ error: 'Invalid anime ID' });
    }

    // First check if we have this anime in our database
    let anime = await prisma.anime.findUnique({
      where: { malId }
    });

    // If not in database, fetch from Jikan and save it
    if (!anime) {
      const jikanAnime = await JikanService.getAnimeById(malId);
      const transformedData = JikanService.transformAnimeData(jikanAnime);

      anime = await prisma.anime.create({
        data: transformedData
      });
    }

    res.json(anime);
  } catch (error) {
    console.error('Get anime details error:', error);
    res.status(500).json({ error: 'Failed to fetch anime details' });
  }
};

export const getTopAnime = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    
    const topAnime = await JikanService.getTopAnime(
      parseInt(page as string),
      parseInt(limit as string)
    );

    const transformedAnime = topAnime.data.map(anime => 
      JikanService.transformAnimeData(anime)
    );

    res.json({
      data: transformedAnime,
      pagination: topAnime.pagination
    });
  } catch (error) {
    console.error('Get top anime error:', error);
    res.status(500).json({ error: 'Failed to fetch top anime' });
  }
};

export const getSeasonalAnime = async (req: Request, res: Response) => {
  try {
    const { year, season } = req.query;
    
    const seasonalAnime = await JikanService.getSeasonalAnime(
      year ? parseInt(year as string) : undefined,
      season as string
    );

    const transformedAnime = seasonalAnime.data.map(anime => 
      JikanService.transformAnimeData(anime)
    );

    res.json({
      data: transformedAnime,
      pagination: seasonalAnime.pagination,
      year: year || new Date().getFullYear(),
      season: season || 'current'
    });
  } catch (error) {
    console.error('Get seasonal anime error:', error);
    res.status(500).json({ error: 'Failed to fetch seasonal anime' });
  }
};

export const searchAnimeAdvanced = async (req: Request, res: Response) => {
  try {
    const { 
      q: query, 
      genres,
      year_start,
      year_end,
      status,
      min_score,
      max_score,
      type,
      page = 1, 
      limit = 25,
      batch_size = 100 // How many to fetch from API before filtering
    } = req.query;

    console.log('Advanced search params:', { query, genres, year_start, year_end, status, min_score, max_score, page });

    // If we have genres but no search query, use a different approach
    if (genres && !query) {
      const genreArray = (genres as string).split(',');
      console.log(`Genre-based search for: ${genreArray.join(', ')}, page: ${page}`);
      
      const currentPage = parseInt(page as string);
      const resultsPerPage = parseInt(limit as string);
      const batchSize = parseInt(batch_size as string);
      
      // Calculate how many API pages we need to fetch to get enough filtered results
      // We'll fetch multiple pages until we have enough results or hit a reasonable limit
      let allFilteredResults: any[] = [];
      let apiPage = 1;
      const maxApiPages = Math.ceil(currentPage * resultsPerPage / 10) + 3; // Fetch extra pages to account for filtering
      
      while (allFilteredResults.length < currentPage * resultsPerPage && apiPage <= maxApiPages) {
        console.log(`Fetching API page ${apiPage} to get more results...`);
        
        try {
          const topAnimeResults = await JikanService.getTopAnime(apiPage, 25); // Standard page size
          
          if (!topAnimeResults.data || topAnimeResults.data.length === 0) {
            console.log(`No more results from API page ${apiPage}, stopping`);
            break;
          }
          
          let transformedAnime = topAnimeResults.data.map(anime => 
            JikanService.transformAnimeData(anime)
          );

          // Apply all filters to this batch
          let filteredBatch = transformedAnime;

          // Genre filtering (must include ALL selected genres)
          if (genres) {
            const genreList = (genres as string).split(',');
            filteredBatch = filteredBatch.filter(anime =>
              genreList.every(selectedGenre =>
                anime.genres.some(animeGenre =>
                  animeGenre.toLowerCase().includes(selectedGenre.toLowerCase())
                )
              )
            );
          }

          // Apply other filters
          if (year_start) {
            filteredBatch = filteredBatch.filter(anime =>
              anime.year && anime.year >= parseInt(year_start as string)
            );
          }
          
          if (year_end) {
            filteredBatch = filteredBatch.filter(anime =>
              anime.year && anime.year <= parseInt(year_end as string)
            );
          }

          if (status) {
            const statusList = (status as string).split(',');
            filteredBatch = filteredBatch.filter(anime =>
              statusList.some(s =>
                anime.status.toLowerCase().includes(s.toLowerCase())
              )
            );
          }

          if (min_score) {
            filteredBatch = filteredBatch.filter(anime =>
              anime.score && anime.score >= parseFloat(min_score as string)
            );
          }
          
          if (max_score) {
            filteredBatch = filteredBatch.filter(anime =>
              anime.score && anime.score <= parseFloat(max_score as string)
            );
          }

          // Add filtered results from this batch
          allFilteredResults = allFilteredResults.concat(filteredBatch);
          console.log(`API page ${apiPage}: Got ${filteredBatch.length} filtered results. Total so far: ${allFilteredResults.length}`);
          
          apiPage++;
        } catch (error) {
          console.error(`Error fetching API page ${apiPage}:`, error);
          break;
        }
      }

      // Remove duplicates (in case of any overlap)
      const uniqueResults = allFilteredResults.filter((anime, index, self) =>
        index === self.findIndex(a => a.malId === anime.malId)
      );

      // Paginate the final filtered results
      const startIndex = (currentPage - 1) * resultsPerPage;
      const paginatedResults = uniqueResults.slice(startIndex, startIndex + resultsPerPage);
      const hasNextPage = uniqueResults.length > startIndex + resultsPerPage;
      
      console.log(`Final results: ${uniqueResults.length} total, returning ${paginatedResults.length} for page ${currentPage}`);

      res.json({
        data: paginatedResults,
        pagination: {
          current_page: currentPage,
          has_next_page: hasNextPage,
          total_results: uniqueResults.length,
          last_visible_page: Math.ceil(uniqueResults.length / resultsPerPage),
          api_pages_fetched: apiPage - 1
        },
        filters: {
          genres: genres ? (genres as string).split(',') : [],
          year_start,
          year_end,
          status: status ? (status as string).split(',') : [],
          min_score,
          max_score
        }
      });
    } else {
      // Regular search with query - use the fixed search function
      const searchResults = await JikanService.searchAnime(
        query as string,
        parseInt(page as string),
        parseInt(limit as string)
      );

      const transformedAnime = searchResults.data.map(anime =>
        JikanService.transformAnimeData(anime)
      );

      res.json({
        data: transformedAnime,
        pagination: searchResults.pagination,
        query
      });
    }
  } catch (error) {
    console.error('Advanced search anime error:', error);
    
    // Better error handling based on the error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage?.includes('Rate limited')) {
      res.status(429).json({ 
        error: 'Too many requests. Please wait a moment and try again.',
        retry_after: 5 
      });
    } else if (errorMessage?.includes('Invalid search')) {
      res.status(400).json({ 
        error: 'Invalid search parameters. Please adjust your filters and try again.' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to search anime. Please try again later.' 
      });
    }
  }
};