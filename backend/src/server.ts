import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { authRoutes } from './routes/auth';
import { animeRoutes } from './routes/anime';
import { userRoutes } from './routes/user';
import { userAnimeRoutes } from './routes/userAnimeList';
import { recommendationsRoutes } from './routes/recommendations';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'CatLog API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/anime-list', userAnimeRoutes);
app.use('/api/recommendations', recommendationsRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🐾 CatLog Server is running on http://localhost:${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});