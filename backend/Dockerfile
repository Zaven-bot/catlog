# Multi-stage Dockerfile for backend
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init openssl
RUN addgroup -g 1001 -S nodejs && adduser -S catlog -u 1001

# Development stage
FROM base AS development
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npm cache clean --force
RUN npx prisma generate
COPY . .
USER catlog
EXPOSE 3001
CMD ["dumb-init", "npm", "run", "dev"]

# Production dependencies
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm cache clean --force
RUN npx prisma generate

# Build stage
FROM base AS builder
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# Production stage
FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

RUN chown -R catlog:nodejs /app
USER catlog
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-3001}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/start.sh"]