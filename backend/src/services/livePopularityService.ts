import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient } from '@prisma/client';

export class LivePopularityService {
  private io: SocketIOServer;
  private prisma: PrismaClient;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.prisma = new PrismaClient();
    this.setupEventHandlers();
    this.startPeriodicUpdates();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📡 Client connected to live updates: ${socket.id}`);

      // Send initial data when client connects
      this.sendLatestUpdates(socket);

      // Handle client requesting specific anime updates
      socket.on('subscribe-anime', (malId: number) => {
        socket.join(`anime-${malId}`);
        console.log(`🔔 Client ${socket.id} subscribed to anime ${malId} updates`);
      });

      socket.on('unsubscribe-anime', (malId: number) => {
        socket.leave(`anime-${malId}`);
        console.log(`🔕 Client ${socket.id} unsubscribed from anime ${malId} updates`);
      });

      socket.on('disconnect', () => {
        console.log(`📴 Client disconnected: ${socket.id}`);
      });
    });
  }

  private async sendLatestUpdates(socket?: any) {
    try {
      const latestUpdates = await this.getLatestUpdates();
      const trendingAnime = await this.getTrendingAnime();

      const updateData = {
        latest: latestUpdates,
        trending: trendingAnime,
        timestamp: new Date().toISOString()
      };

      if (socket) {
        // Send to specific socket
        socket.emit('popularity-updates', updateData);
      } else {
        // Broadcast to all connected clients
        this.io.emit('popularity-updates', updateData);
      }
    } catch (error) {
      console.error('❌ Error sending live updates:', error);
    }
  }

  private async getLatestUpdates(limit: number = 10) {
    return await this.prisma.livePopularity.findMany({
      orderBy: { lastUpdate: 'desc' },
      take: limit,
      select: {
        malId: true,
        title: true,
        currentScore: true,
        liveMembers: true,
        trendingRank: true,
        popularityChange: true,
        lastUpdate: true,
        eventType: true
      }
    });
  }

  private async getTrendingAnime(limit: number = 5) {
    return await this.prisma.livePopularity.findMany({
      where: {
        eventType: 'TRENDING_CHANGE',
        lastUpdate: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: [
        { trendingRank: 'asc' },
        { lastUpdate: 'desc' }
      ],
      take: limit,
      distinct: ['malId'],
      select: {
        malId: true,
        title: true,
        trendingRank: true,
        popularityChange: true,
        lastUpdate: true
      }
    });
  }

  private startPeriodicUpdates() {
    // Send updates every 30 seconds to all connected clients
    this.updateInterval = setInterval(async () => {
      if (this.io.engine.clientsCount > 0) {
        await this.sendLatestUpdates();
      }
    }, 30000);

    console.log('⏰ Started periodic WebSocket updates (30s interval)');
  }

  // Method to be called when new data arrives from Kafka consumer
  public async notifyNewUpdate(popularityData: any) {
    try {
      // Broadcast the specific update to all clients
      this.io.emit('new-popularity-update', {
        ...popularityData,
        timestamp: new Date().toISOString()
      });

      // Send update to clients subscribed to this specific anime
      this.io.to(`anime-${popularityData.malId}`).emit('anime-specific-update', {
        ...popularityData,
        timestamp: new Date().toISOString()
      });

      console.log(`📢 Broadcasted live update for ${popularityData.title}`);
    } catch (error) {
      console.error('❌ Error notifying clients of new update:', error);
    }
  }

  public async getConnectionCount(): Promise<number> {
    return this.io.engine.clientsCount;
  }

  public cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.io.close();
    this.prisma.$disconnect();
    console.log('🧹 Live popularity service cleaned up');
  }
}