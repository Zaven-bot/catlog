import { Router, Request, Response } from 'express';
import { checkDatabaseConnection, getDatabaseConfig } from '../../config/database';

const router = Router();

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    const config = getDatabaseConfig();
    
    const healthStatus = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        isRDS: config.isRDS,
        isProduction: config.isProduction
      },
      service: 'catlog-backend',
      version: process.env.npm_package_version || '1.0.0'
    };

    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      database: { connected: false }
    });
  }
});

// Ready check endpoint (for Kubernetes-style deployments)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbConnected = await checkDatabaseConnection();
    
    if (dbConnected) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'database unavailable' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', reason: 'health check failed' });
  }
});

export default router;
