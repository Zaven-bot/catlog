# 🐳 Docker Configuration Guide

This project uses a multi-environment Docker setup optimized for both development and production.

## 🏗️ Architecture

- **Multi-stage Dockerfiles**: Separate stages for development and production
- **Environment-specific compose files**: Different configurations for each environment
- **Volume mounts**: Hot reload for development, optimized builds for production
- **Health checks**: Comprehensive monitoring for all services

## 🚀 Quick Start

### Development Mode
```bash
# Start development environment with hot reload
./scripts/dev.sh

# Or manually:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Production Mode
```bash
# Start production environment
./scripts/prod.sh

# Or manually:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 📁 File Structure

```
├── docker-compose.yml              # Base configuration
├── docker-compose.dev.yml          # Development overrides
├── docker-compose.prod.yml         # Production overrides
├── .env.development                # Development environment variables
├── .env.production                 # Production environment variables
├── scripts/
│   ├── dev.sh                     # Development startup script
│   └── prod.sh                    # Production startup script
├── frontend/
│   ├── Dockerfile                 # Multi-stage frontend build
│   └── .dockerignore              # Frontend ignore patterns
└── backend/
    ├── Dockerfile                 # Multi-stage backend build
    └── .dockerignore              # Backend ignore patterns
```

## 🔧 Development Features

- **Hot Reload**: Code changes reflect immediately
- **Volume Mounts**: Local filesystem mapped to container
- **Debug Mode**: Full development tools available
- **Local Database**: PostgreSQL with persistent volumes
- **Live Logs**: Real-time container output

## 🏭 Production Features

- **Optimized Builds**: Multi-stage builds with minimal layers
- **Resource Limits**: Memory and CPU constraints
- **Health Checks**: Automatic service monitoring
- **Security**: Non-root users, minimal attack surface
- **Caching**: Redis for performance
- **Reverse Proxy**: Nginx for load balancing and SSL

## 🌍 Environment Variables

### Development (.env.development)
- `NODE_ENV=development`
- `DATABASE_URL=postgresql://postgres:password@postgres:5432/catlog_dev`
- `NEXT_PUBLIC_API_URL=http://localhost:3001/api`

### Production (.env.production)
- `NODE_ENV=production`
- `DATABASE_URL=your-production-database-url`
- `NEXT_PUBLIC_API_URL=https://api.catlog.com/api`
- `JWT_SECRET=secure-secret-key`

## 📊 Services

### Development
- **Frontend**: Next.js dev server with hot reload
- **Backend**: Node.js with nodemon for auto-restart
- **Database**: PostgreSQL with development data
- **ETL**: Python pipeline (sleeping mode)

### Production
- **Frontend**: Next.js optimized production build
- **Backend**: Node.js production server
- **Database**: PostgreSQL with production data
- **Redis**: Caching layer
- **Nginx**: Reverse proxy and SSL termination
- **ETL**: Automated data pipeline

## 🛠️ Commands

```bash
# Development
./scripts/dev.sh                   # Start development environment
docker compose -f docker-compose.dev.yml down  # Stop development

# Production
./scripts/prod.sh                  # Start production environment
docker compose -f docker-compose.prod.yml down # Stop production

# Utilities
docker compose logs -f frontend    # View frontend logs
docker compose logs -f backend     # View backend logs
docker compose exec backend sh     # Access backend container
docker compose exec postgres psql -U postgres -d catlog_dev  # Database access
```

## 🔍 Monitoring

All services include health checks:
- **Frontend**: HTTP health endpoint
- **Backend**: API health endpoint
- **Database**: PostgreSQL ready check
- **Redis**: Ping command

## 🚨 Best Practices

1. **Never commit .env.production** - Use environment-specific secrets
2. **Use .dockerignore** - Exclude unnecessary files from builds
3. **Multi-stage builds** - Keep production images minimal
4. **Health checks** - Enable automatic recovery
5. **Resource limits** - Prevent containers from consuming excessive resources
6. **Non-root users** - Enhance security in containers

## 🐛 Troubleshooting

### Development Issues
- Check if ports 3000, 3001, 5432 are available
- Ensure Docker has sufficient resources allocated
- Verify volume mounts are working: `docker compose exec frontend ls -la`

### Production Issues
- Check environment variables are set correctly
- Verify SSL certificates (if using HTTPS)
- Monitor resource usage: `docker stats`
- Check logs: `docker compose logs -f [service]`
