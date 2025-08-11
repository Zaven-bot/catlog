import { Router } from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

export const authRoutes = router;