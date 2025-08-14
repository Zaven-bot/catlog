import { Router } from 'express';
import { LivePopularityService } from '../services/livePopularityService';

export function createLivePopularityRoutes(livePopularityService: LivePopularityService) {
  const router = Router();

  // Get latest live popularity updates
  router.get('/updates', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const updates = await livePopularityService['getLatestUpdates'](limit);
      
      res.json({
        success: true,
        data: updates,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching live updates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch live updates'
      });
    }
  });

  // Get trending anime based on recent activity
  router.get('/trending', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const trending = await livePopularityService['getTrendingAnime'](limit);
      
      res.json({
        success: true,
        data: trending,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending anime'
      });
    }
  });

  // Get WebSocket connection count
  router.get('/stats', async (req, res) => {
    try {
      const connectionCount = await livePopularityService.getConnectionCount();
      
      res.json({
        success: true,
        data: {
          activeConnections: connectionCount,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching live stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch live stats'
      });
    }
  });

  return router;
}