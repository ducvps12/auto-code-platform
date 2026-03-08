# ============ Stage 1: Build ============
FROM node:20-alpine AS builder

WORKDIR /app

# Install git (needed by worker for git operations)
RUN apk add --no-cache git

# Copy root workspace files
COPY package.json ./
COPY tsconfig.base.json ./

# Copy package files for all workspaces
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/
COPY packages/worker/package.json ./packages/worker/

# Install all dependencies
RUN npm install

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/database/src/ ./packages/database/src/
COPY packages/database/tsconfig.json ./packages/database/
COPY packages/worker/ ./packages/worker/

# Generate Prisma client & Build
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build -w packages/shared
RUN npm run build -w packages/database
RUN npm run build -w packages/worker

# ============ Stage 2: Runtime ============
FROM node:20-alpine

# Git is needed at runtime for cloning repos
RUN apk add --no-cache git

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/worker/dist ./packages/worker/dist
COPY --from=builder /app/packages/worker/package.json ./packages/worker/

ENV NODE_ENV=production

CMD ["node", "packages/worker/dist/index.js"]
