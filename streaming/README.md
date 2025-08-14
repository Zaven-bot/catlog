# CatLog Streaming - Real-time Anime Popularity Updates

This directory contains the Kafka-based streaming infrastructure for simulating real-time anime popularity updates in CatLog.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Kafka         │    │   Kafka         │    │   PostgreSQL    │    │   WebSocket     │
│   Producer      │───▶│   Topic         │───▶│   Database      │───▶│   Frontend      │
│   (Simulator)   │    │   (Events)      │    │   (Storage)     │    │   (Live UI)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. Kafka Producer (`producer.js`)
- Simulates anime popularity events every minute
- Generates realistic data for score updates, member changes, and trending rankings
- Supports configurable event intervals

### 2. Kafka Consumer (`consumer.js`)
- Processes events from Kafka topic
- Updates PostgreSQL `live_popularity` table
- Maintains event history for analytics

### 3. WebSocket Service (`../backend/src/services/livePopularityService.ts`)
- Real-time broadcasting to frontend clients
- Periodic updates every 30 seconds
- Room-based subscriptions for specific anime

### 4. Frontend Widget (`../frontend/src/components/LivePopularityWidget.tsx`)
- Real-time popularity updates display
- Trending anime section
- Connection status indicator

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- PostgreSQL running with CatLog database

### 1. Start Kafka Infrastructure
```bash
cd streaming
docker-compose up -d
```

This starts:
- Zookeeper (port 2181)
- Kafka Broker (port 9092)
- Kafka UI (port 8080) - for monitoring

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
cp .env.example .env
# Edit .env with your database connection details
```

### 4. Start Producer (Terminal 1)
```bash
npm run producer
# Or for development with auto-restart:
npm run dev:producer
```

### 5. Start Consumer (Terminal 2)
```bash
npm run consumer
# Or for development with auto-restart:
npm run dev:consumer
```

### 6. Start Backend with WebSocket Support
```bash
cd ../backend
npm install socket.io
npm run dev
```

### 7. Start Frontend
```bash
cd ../frontend
npm install socket.io-client
npm run dev
```

## Monitoring

### Kafka UI
Access Kafka UI at http://localhost:8080 to monitor:
- Topics and partitions
- Consumer groups
- Message flow
- Broker health

### Database Monitoring
Check the `live_popularity` table for incoming events:
```sql
SELECT * FROM "LivePopularity" ORDER BY "lastUpdate" DESC LIMIT 10;
```

### WebSocket Connections
Check active WebSocket connections via API:
```bash
curl http://localhost:3001/api/live/stats
```

## Configuration

### Producer Settings
- `PRODUCER_INTERVAL_MS`: Event generation interval (default: 60000ms = 1 minute)
- `KAFKA_BROKER`: Kafka broker connection string

### Consumer Settings
- `CONSUMER_GROUP_ID`: Kafka consumer group ID
- `DATABASE_URL`: PostgreSQL connection string

### Sample Events

The producer generates three types of events:

**Score Update:**
```json
{
  "malId": 1,
  "title": "Cowboy Bebop",
  "eventType": "SCORE_UPDATE",
  "currentScore": "8.75",
  "popularityChange": "+0.05",
  "timestamp": "2025-08-14T18:30:00.000Z"
}
```

**Member Update:**
```json
{
  "malId": 5,
  "title": "Fullmetal Alchemist: Brotherhood",
  "eventType": "MEMBER_UPDATE",
  "liveMembers": 125000,
  "popularityChange": "+0.8",
  "timestamp": "2025-08-14T18:31:00.000Z"
}
```

**Trending Change:**
```json
{
  "malId": 9253,
  "title": "Steins;Gate",
  "eventType": "TRENDING_CHANGE",
  "trendingRank": 15,
  "popularityChange": "+2.3",
  "timestamp": "2025-08-14T18:32:00.000Z"
}
```

## Frontend Integration

The `LivePopularityWidget` component automatically connects to the WebSocket server and displays:
- Real-time popularity updates
- Top trending anime
- Connection status
- Formatted time stamps and percentage changes

## Development

### Testing the Flow
1. Start all services as described above
2. Watch the producer logs for event generation
3. Check consumer logs for database updates
4. Open the frontend dashboard to see live updates
5. Use Kafka UI to monitor message flow

### Debugging
- Check Kafka broker health: `docker-compose logs kafka`
- Monitor consumer lag in Kafka UI
- Check database for stored events
- Verify WebSocket connections in browser dev tools

## Production Considerations

1. **Scaling**: Configure multiple Kafka partitions and consumer instances
2. **Persistence**: Use external volumes for Kafka data
3. **Security**: Add authentication for Kafka and WebSocket connections
4. **Monitoring**: Integrate with application monitoring (Prometheus, Grafana)
5. **Error Handling**: Implement dead letter queues for failed messages

## Troubleshooting

### Common Issues

**Producer can't connect to Kafka:**
- Ensure Kafka is running: `docker-compose ps`
- Check firewall settings for port 9092

**Consumer not processing messages:**
- Verify database connection in .env
- Check consumer group status in Kafka UI

**WebSocket not connecting:**
- Ensure backend server is running with socket.io
- Check CORS configuration for frontend URL

**No data in frontend widget:**
- Verify WebSocket connection in browser console
- Check backend API endpoints: `/api/live/updates`

### Health Checks
```bash
# Check Kafka broker
docker exec catlog-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Check topic creation
docker exec catlog-kafka kafka-topics --bootstrap-server localhost:9092 --list

# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"LivePopularity\";"
```