import { Router } from 'express';
import {
  addAnimeToList,
  getUserAnimeList,
  updateAnimeInList,
  removeAnimeFromList,
  getUserAnimeStats
} from '../controllers/userAnimeList';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Add anime to user's list
router.post('/', addAnimeToList);

// Get user's anime list (with optional status filter)
router.get('/', getUserAnimeList);

// Get user's anime statistics
router.get('/stats', getUserAnimeStats);

// Update anime in user's list
router.put('/:id', updateAnimeInList);

// Remove anime from user's list
router.delete('/:id', removeAnimeFromList);

export const userAnimeRoutes = router;