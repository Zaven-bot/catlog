#!/bin/sh
set -e

echo "🔄 Starting CatLog Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until node ./scripts/test-db.js; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "🔄 Starting application..."
npm start