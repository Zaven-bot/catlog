require('dotenv').config();
const { Kafka } = require('kafkajs');

// Sample anime data for simulation
const SAMPLE_ANIME = [
  { malId: 1, title: "Cowboy Bebop" },
  { malId: 5, title: "Fullmetal Alchemist: Brotherhood" },
  { malId: 28977, title: "Gintama°" },
  { malId: 9253, title: "Steins;Gate" },
  { malId: 38524, title: "Shingeki no Kyojin Season 3 Part 2" },
  { malId: 11061, title: "Hunter x Hunter (2011)" },
  { malId: 820, title: "Ginga Eiyuu Densetsu" },
  { malId: 918, title: "Gintama" },
  { malId: 2904, title: "Code Geass: Hangyaku no Lelouch R2" },
  { malId: 19, title: "Monster" }
];

const EVENT_TYPES = ['SCORE_UPDATE', 'MEMBER_UPDATE', 'TRENDING_CHANGE'];

class AnimePopularityProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'anime-popularity-producer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
    });
    
    this.producer = this.kafka.producer();
    this.isRunning = false;
  }

  async connect() {
    try {
      await this.producer.connect();
      console.log('🚀 Kafka producer connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect producer:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.producer.disconnect();
      console.log('👋 Kafka producer disconnected');
    } catch (error) {
      console.error('❌ Error disconnecting producer:', error);
    }
  }

  generatePopularityEvent() {
    const anime = SAMPLE_ANIME[Math.floor(Math.random() * SAMPLE_ANIME.length)];
    const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    
    let event = {
      malId: anime.malId,
      title: anime.title,
      eventType,
      timestamp: new Date().toISOString()
    };

    // Generate realistic data based on event type
    switch (eventType) {
      case 'SCORE_UPDATE':
        event.currentScore = (Math.random() * 3 + 7).toFixed(2); // 7.00 - 10.00
        event.popularityChange = (Math.random() * 0.2 - 0.1).toFixed(3); // -0.1 to +0.1
        break;
      case 'MEMBER_UPDATE':
        event.liveMembers = Math.floor(Math.random() * 50000 + 100000); // 100k - 150k
        event.popularityChange = (Math.random() * 2 - 1).toFixed(2); // -1% to +1%
        break;
      case 'TRENDING_CHANGE':
        event.trendingRank = Math.floor(Math.random() * 100 + 1); // 1-100
        event.popularityChange = (Math.random() * 10 - 5).toFixed(2); // -5% to +5%
        break;
    }

    return event;
  }

  async sendEvent() {
    try {
      const event = this.generatePopularityEvent();
      
      await this.producer.send({
        topic: 'anime-popularity-updates',
        messages: [{
          key: event.malId.toString(),
          value: JSON.stringify(event),
          timestamp: Date.now().toString()
        }]
      });

      console.log(`📡 Sent ${event.eventType} for ${event.title} (MAL ID: ${event.malId})`);
      return event;
    } catch (error) {
      console.error('❌ Error sending event:', error);
      throw error;
    }
  }

  async startProducing(intervalMs = 60000) { // Default: 1 minute
    if (this.isRunning) {
      console.log('⚠️ Producer is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🎬 Starting anime popularity event producer (interval: ${intervalMs}ms)`);

    // Send initial event immediately
    await this.sendEvent();

    // Set up interval for subsequent events
    this.interval = setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.sendEvent();
        } catch (error) {
          console.error('❌ Error in production interval:', error);
        }
      }
    }, intervalMs);
  }

  stopProducing() {
    if (!this.isRunning) {
      console.log('⚠️ Producer is not running');
      return;
    }

    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    console.log('⏹️ Stopped anime popularity event producer');
  }
}

// CLI interface
async function main() {
  const producer = new AnimePopularityProducer();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down producer...');
    producer.stopProducing();
    await producer.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down producer...');
    producer.stopProducing();
    await producer.disconnect();
    process.exit(0);
  });

  try {
    await producer.connect();
    
    // Start producing events every minute (configurable via env var)
    const interval = parseInt(process.env.PRODUCER_INTERVAL_MS) || 60000;
    await producer.startProducing(interval);
    
    console.log('✅ Producer is running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('💥 Failed to start producer:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { AnimePopularityProducer };