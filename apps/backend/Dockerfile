# ── Stage 1 : Install dependencies ──────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/

RUN pnpm install --frozen-lockfile

# ── Stage 2 : Build ────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy source
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/shared-types/ packages/shared-types/
COPY apps/backend/ apps/backend/

# Build shared-types first, then backend
RUN pnpm turbo run build --filter=api-entreprises

# ── Stage 3 : Production image ─────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed to run
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages/shared-types/ ./packages/shared-types/
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./

# Install prod dependencies only
RUN cd /app && pnpm install --frozen-lockfile --prod

EXPOSE 3001

CMD ["node", "apps/backend/dist/main"]
