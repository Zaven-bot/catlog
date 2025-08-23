import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { authRoutes } from './routes/auth';
import { animeRoutes } from './routes/anime';
import { userRoutes } from './routes/user';
import { userAnimeRoutes } from './routes/userAnimeList';
import healthRoutes from './routes/health';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3002', // Add support for the current frontend port
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
};

// Middleware
app.use(cors(corsOptions));
app.use(json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/anime-list', userAnimeRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;