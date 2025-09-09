FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY services/worker-wa/package.json ./services/worker-wa/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY services/worker-wa ./services/worker-wa

# Build packages
RUN pnpm --filter @numcheck/shared build
RUN pnpm --filter @numcheck/database build
RUN pnpm --filter worker-wa build

# Production stage
FROM node:20-alpine AS production

RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY services/worker-wa/package.json ./services/worker-wa/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built code
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/database/dist ./packages/database/dist
COPY --from=base /app/services/worker-wa/dist ./services/worker-wa/dist

# Copy Prisma schema and generated client
COPY --from=base /app/packages/database/prisma ./packages/database/prisma
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD pgrep -f "worker-wa" || exit 1

# Start the application
CMD ["node", "services/worker-wa/dist/index.js"]
