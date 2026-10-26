#!/usr/bin/env sh
# Creates .env from .env.example with freshly generated secrets.
# Refuses to overwrite an existing .env so you never lose your keys.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  echo "[setup] .env already exists. Leaving it untouched."
  echo "[setup] Delete it yourself if you really want new secrets (this will break an existing database)."
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "[setup] openssl is required to generate secrets." >&2
  exit 1
fi

DB_PASSWORD="$(openssl rand -hex 24)"
APP_DB_PASSWORD="$(openssl rand -hex 24)"
AUTH_SECRET="$(openssl rand -base64 64 | tr -d '\n' | tr '+/' '-_' | tr -d '=')"

umask 077
sed \
  -e "s|__GENERATED_DB_PASSWORD__|${DB_PASSWORD}|g" \
  -e "s|__GENERATED_APP_DB_PASSWORD__|${APP_DB_PASSWORD}|g" \
  -e "s|__GENERATED_AUTH_SECRET__|${AUTH_SECRET}|g" \
  .env.example > .env
chmod 600 .env

echo "[setup] Created .env with random database passwords and AUTH_SECRET (permissions 600)."
echo "[setup] Next: docker compose up -d --build"
