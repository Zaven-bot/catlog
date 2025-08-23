import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { authRoutes } from './routes/auth';
import { animeRoutes } from './routes/anime';
import { userRoutes } from './routes/user';
import { userAnimeRoutes } from './routes/userAnimeList';
import { errorHandler } from './middleware/errorHandler';
import { checkDatabaseConnection, getDatabaseConfig } from '../config/database';
import healthRoutes from './routes/health'; // Add the health routes

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(json());

// Health check endpoint (keep this one without /api for direct health checks)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'CatLog API is running!' });
});

// Mount all API routes under /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user/anime-list', userAnimeRoutes);
app.use('/api/health', healthRoutes); // Add comprehensive health routes

app.use(errorHandler);

// Environment validation function
async function validateEnvironment() {
  console.log('🔍 Validating environment configuration...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL environment variable is required');
  }
  
  try {
    // Test database connection on startup
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('❌ Database connection failed');
    }
    
    const config = getDatabaseConfig();
    console.log(`✅ Database connected successfully`);
    console.log(`📍 Database type: ${config.isRDS ? 'AWS RDS' : 'Local PostgreSQL'}`);
    console.log(`🔒 SSL enabled: ${config.isRDS ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ Database validation failed:', error);
    throw error;
  }
}

// Start server with validation
async function startServer() {
  try {
    await validateEnvironment();
    
    app.listen(PORT, () => {
        console.log(`🐾 CatLog Server is running on http://localhost:${PORT}`);
        console.log(`🌐 Health check: http://localhost:${PORT}/health`);
        console.log(`🏥 Detailed health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();