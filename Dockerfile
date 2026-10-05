# syntax=docker/dockerfile:1

###############################################################################
# Dentora — production image
#
# Build-time database access: the route tree prerenders from PostgreSQL
# (sitemap, city and clinic pages), so `next build` needs a reachable
# DATABASE_URL. Pass one with `--build-arg`; the value is baked into the
# prerendered HTML, so it must never be a secret-bearing production URL.
# Runtime secrets (ADMIN_PASSWORD, KAPSO_API_KEY, ...) are injected by Dokploy
# as environment variables instead, never as build args.
###############################################################################

FROM node:lts-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG DATABASE_URL
ARG NEXT_PUBLIC_SITE_URL
# Placeholder keeps the build hermetic when no database is supplied: the
# prerender of DB-backed routes then fails loudly instead of silently shipping
# empty pages.
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://dentora.ma}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The contract (prisma/contract.prisma -> contract.json/.d.ts) is committed, so
# this only verifies it still resolves before the app is compiled.
RUN npx prisma contract emit

RUN npm run build

FROM base AS runner
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/prisma ./src/prisma
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]