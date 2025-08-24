# Simplified Dockerfile for development
FROM node:18-alpine

WORKDIR /app

# Install dumb-init and required SSL libraries for Prisma
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S catlog -u 1001

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# While still root (has all permissions):
RUN chown -R catlog:nodejs /app    # Give ownership to catlog

# Switch to non-root user
USER catlog

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-3001}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose port
EXPOSE 3001

# Use startup script instead of direct npm start
ENTRYPOINT ["dumb-init", "--"]
CMD ["./scripts/start.sh"]