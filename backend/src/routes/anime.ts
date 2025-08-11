import { Router } from 'express';
import {
  searchAnime,
  searchAnimeAdvanced,
  getAnimeDetails,
  getTopAnime,
  getSeasonalAnime
} from '../controllers/anime';

const router = Router();

// Advanced search with filters
router.get('/search/advanced', searchAnimeAdvanced);

// Search anime
router.get('/search', searchAnime);

// Get top anime
router.get('/top', getTopAnime);

// Get seasonal anime
router.get('/seasonal', getSeasonalAnime);

// Get anime details by MAL ID
router.get('/:id', getAnimeDetails);

export const animeRoutes = router;