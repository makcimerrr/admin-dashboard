# syntax=docker/dockerfile:1
# Admin Dashboard — image de production (Next.js 15 standalone, pnpm).
# Build en CI (GHCR) ; le VPS ne fait que pull + run.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ── Dépendances ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variables NEXT_PUBLIC_* inlinées au build (publiques) — requises notamment par
# Stack Auth lors du prerender.
ARG NEXT_PUBLIC_STACK_PROJECT_ID
ARG NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
ARG NEXT_PUBLIC_ACCESS_TOKEN
ARG NEXT_PUBLIC_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_STACK_PROJECT_ID=$NEXT_PUBLIC_STACK_PROJECT_ID \
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=$NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY \
    NEXT_PUBLIC_ACCESS_TOKEN=$NEXT_PUBLIC_ACCESS_TOKEN \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
RUN pnpm build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Sortie standalone : serveur + node_modules minimal + assets.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
