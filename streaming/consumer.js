require('dotenv').config();
const { Kafka } = require('kafkajs');
const { PrismaClient } = require('@prisma/client');

class AnimePopularityConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'anime-popularity-consumer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: 'anime-popularity-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    
    this.prisma = new PrismaClient();
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.consumer.connect();
      await this.prisma.$connect();
      console.log('🚀 Kafka consumer and database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect consumer:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.consumer.disconnect();
      await this.prisma.$disconnect();
      console.log('👋 Kafka consumer and database disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting consumer:', error);
    }
  }

  async processEvent(event) {
    try {
      console.log(`📥 Processing ${event.eventType} for ${event.title} (MAL ID: ${event.malId})`);
      
      // Create a new record for each event (maintaining event history)
      const result = await this.prisma.livePopularity.create({
        data: {
          malId: event.malId,
          title: event.title,
          currentScore: event.currentScore ? parseFloat(event.currentScore) : null,
          liveMembers: event.liveMembers || null,
          trendingRank: event.trendingRank || null,
          popularityChange: event.popularityChange ? parseFloat(event.popularityChange) : null,
          lastUpdate: new Date(),
          eventType: event.eventType
        }
      });

      console.log(`✅ Updated live popularity for ${event.title}: ${event.eventType}`);
      return result;
    } catch (error) {
      console.error('❌ Error processing event:', error);
      throw error;
    }
  }

  async startConsuming() {
    if (this.isRunning) {
      console.log('⚠️ Consumer is already running');
      return;
    }

    try {
      await this.consumer.subscribe({ 
        topic: 'anime-popularity-updates',
        fromBeginning: false
      });

      this.isRunning = true;
      console.log('🎧 Starting to consume anime popularity events...');

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const event = JSON.parse(message.value.toString());
            await this.processEvent(event);
          } catch (error) {
            console.error('❌ Error processing message:', error);
            // Log the error but continue processing other messages
          }
        },
      });
    } catch (error) {
      console.error('❌ Error starting consumer:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stopConsuming() {
    if (!this.isRunning) {
      console.log('⚠️ Consumer is not running');
      return;
    }

    try {
      this.isRunning = false;
      await this.consumer.stop();
      console.log('⏹️ Stopped consuming anime popularity events');
    } catch (error) {
      console.error('❌ Error stopping consumer:', error);
    }
  }

  // Get latest live popularity data for WebSocket broadcasting
  async getLatestUpdates(limit = 10) {
    try {
      return await this.prisma.livePopularity.findMany({
        orderBy: { lastUpdate: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('❌ Error fetching latest updates:', error);
      return [];
    }
  }

  // Get trending anime based on recent activity
  async getTrendingAnime(limit = 5) {
    try {
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
        distinct: ['malId']
      });
    } catch (error) {
      console.error('❌ Error fetching trending anime:', error);
      return [];
    }
  }
}

// CLI interface
async function main() {
  const consumer = new AnimePopularityConsumer();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down consumer...');
    await consumer.stopConsuming();
    await consumer.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down consumer...');
    await consumer.stopConsuming();
    await consumer.disconnect();
    process.exit(0);
  });

  try {
    await consumer.connect();
    await consumer.startConsuming();
    
    console.log('✅ Consumer is running. Press Ctrl+C to stop.');
    
    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    console.error('💥 Failed to start consumer:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { AnimePopularityConsumer };