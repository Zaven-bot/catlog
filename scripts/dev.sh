#!/bin/bash
# Development startup script

echo "🚀 Starting CatLog in DEVELOPMENT mode..."

# Load development environment
set -a
source .env.development
set +a

# Start development environment
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "🐘 Database: localhost:5432"
