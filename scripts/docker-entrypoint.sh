#!/bin/sh
# Runs database migrations (and the optional demo seed) before starting the app.
set -eu

echo "[agencykit] applying database migrations..."
node scripts/migrate.mjs

if [ "${SEED_DEMO:-false}" = "true" ]; then
  node scripts/seed-demo.mjs
fi

echo "[agencykit] starting on port ${PORT:-3000}"
exec node server.js
