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

    const transformedAnime = searchResults.data.map(anime => {
      const transformed = JikanService.transformAnimeData(anime);
      return {
        ...transformed,
        synopsis: transformed.description,
        description: undefined // Remove description field for frontend compatibility
      };
    });

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

    // Transform description to synopsis for frontend compatibility
    const responseAnime = {
      ...anime,
      synopsis: anime.description,
      description: undefined // Remove description field
    };

    res.json(responseAnime);
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

    const transformedAnime = topAnime.data.map(anime => {
      const transformed = JikanService.transformAnimeData(anime);
      return {
        ...transformed,
        synopsis: transformed.description,
        description: undefined // Remove description field for frontend compatibility
      };
    });

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

    const transformedAnime = seasonalAnime.data.map(anime => {
      const transformed = JikanService.transformAnimeData(anime);
      return {
        ...transformed,
        synopsis: transformed.description,
        description: undefined // Remove description field for frontend compatibility
      };
    });

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
      api_start_page = 1 // New parameter to track which API page to start from
    } = req.query;

    console.log('Advanced search params:', { query, genres, year_start, year_end, status, min_score, max_score, page, api_start_page });

    // If we have genres but no search query, use a different approach
    if (genres && !query) {
      const genreArray = (genres as string).split(',');
      console.log(`Genre-based search for: ${genreArray.join(', ')}, page: ${page}, starting from API page: ${api_start_page}`);
      
      const currentPage = parseInt(page as string);
      const resultsPerPage = parseInt(limit as string);
      const startApiPage = parseInt(api_start_page as string);
      
      // Simple approach: fetch exactly 4 API pages starting from startApiPage
      const pagesToFetch = 4;
      const maxApiPage = startApiPage + pagesToFetch - 1;
      
      console.log(`Fetching API pages ${startApiPage}-${maxApiPage} (4 pages total)`);
      
      let allFilteredResults: any[] = [];
      let hasMorePages = false;
      
      // Fetch exactly 4 pages
      for (let apiPage = startApiPage; apiPage <= maxApiPage; apiPage++) {
        console.log(`Fetching API page ${apiPage}...`);
        
        try {
          const topAnimeResults = await JikanService.getTopAnime(apiPage, 25);
          
          if (!topAnimeResults.data || topAnimeResults.data.length === 0) {
            console.log(`No results from API page ${apiPage}, stopping here`);
            break;
          }
          
          // Check if there are more pages after this batch
          if (apiPage === maxApiPage && topAnimeResults.pagination.has_next_page) {
            hasMorePages = true;
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
          
          const filterRatio = filteredBatch.length / transformedAnime.length;
          console.log(`API page ${apiPage}: Got ${filteredBatch.length}/${transformedAnime.length} results (${(filterRatio * 100).toFixed(1)}% pass rate). Total: ${allFilteredResults.length}`);
          
        } catch (error) {
          console.error(`Error fetching API page ${apiPage}:`, error);
          // Continue to next page if one fails
        }
      }

      // Remove duplicates (in case of any overlap)
      const uniqueResults = allFilteredResults.filter((anime, index, self) =>
        index === self.findIndex(a => a.malId === anime.malId)
      );

      // For the first request (page 1), return the first 25 results
      // For subsequent requests, return all results from this batch
      let paginatedResults;
      let nextApiStartPage;
      
      if (currentPage === 1) {
        // First page: return first 25 results
        paginatedResults = uniqueResults.slice(0, resultsPerPage);
        nextApiStartPage = startApiPage + pagesToFetch;
      } else {
        // Subsequent pages: return all results from this batch
        paginatedResults = uniqueResults;
        nextApiStartPage = startApiPage + pagesToFetch;
      }
      
      console.log(`\n=== SIMPLE PAGINATION SUMMARY ===`);
      console.log(`Fetched API pages: ${startApiPage}-${maxApiPage}`);
      console.log(`Total filtered results from this batch: ${uniqueResults.length}`);
      console.log(`Returning: ${paginatedResults.length} results`);
      console.log(`Has more API pages: ${hasMorePages}`);
      console.log(`Next API start page: ${nextApiStartPage}`);
      console.log(`=================================\n`);

      res.json({
        data: paginatedResults,
        pagination: {
          current_page: currentPage,
          has_next_page: hasMorePages || paginatedResults.length >= resultsPerPage,
          total_results: null, // We don't know the total, and that's OK
          api_pages_fetched: `${startApiPage}-${maxApiPage}`,
          next_api_start_page: nextApiStartPage,
          results_in_batch: uniqueResults.length
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
      // Regular search with query - use the existing search function
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