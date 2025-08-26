#!/bin/bash
# Production startup script

echo "🏭 Starting CatLog in PRODUCTION mode..."

# Check if production env file exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production settings."
    exit 1
fi

# Load production environment
set -a
source .env.production
set +a

# Start production environment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "✅ Production environment started!"
echo "🌐 Application: ${FRONTEND_URL}"
echo "🔧 API: ${NEXT_PUBLIC_API_URL}"
