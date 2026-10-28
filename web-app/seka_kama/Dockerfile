# seka_kama/Dockerfile
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json .npmrc ./

# Install dependencies
RUN npm ci

# Rebuild stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_ENABLE_SCENARIOS=false
ARG NEXT_PUBLIC_MAP_STYLE_URL=
ARG NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
ENV NEXT_PUBLIC_ENABLE_SCENARIOS=$NEXT_PUBLIC_ENABLE_SCENARIOS \
    NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL \
    NEXT_PUBLIC_MAP_TILE_URL=$NEXT_PUBLIC_MAP_TILE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000').catch(() => process.exit(1))"

CMD ["npm", "start"]
