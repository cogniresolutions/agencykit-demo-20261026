# AgencyKit production image: multi-stage, non-root, Next.js standalone output.

ARG NODE_IMAGE=node:22.23.4-alpine3.24

# ---- 1. Install dependencies from the lockfile ---------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- 2. Build -------------------------------------------------------------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Runtime -----------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Patch OS packages and drop npm/yarn (not needed at runtime, smaller attack surface).
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
 && addgroup -S -g 1001 agencykit \
 && adduser -S -u 1001 -G agencykit -h /app agencykit

COPY --from=build --chown=agencykit:agencykit /app/.next/standalone ./
COPY --from=build --chown=agencykit:agencykit /app/.next/static ./.next/static
# Migration and seed scripts only need these two zero-dependency packages.
COPY --from=deps --chown=agencykit:agencykit /app/node_modules/postgres ./node_modules/postgres
COPY --from=deps --chown=agencykit:agencykit /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --chown=agencykit:agencykit drizzle ./drizzle
COPY --chown=agencykit:agencykit scripts/env.mjs scripts/migrate.mjs scripts/seed-demo.mjs scripts/seed-sample.mjs ./scripts/
COPY --chown=agencykit:agencykit scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

USER agencykit
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
