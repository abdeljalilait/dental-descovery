#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "==> [Dentora] Updating database schema (prisma db update)..."
  MAX_RETRIES=15
  COUNT=0
  until npx prisma db update || [ $COUNT -eq $MAX_RETRIES ]; do
    echo "==> [Dentora] Database not ready yet, retrying in 2s ($COUNT/$MAX_RETRIES)..."
    COUNT=$((COUNT + 1))
    sleep 2
  done

  echo "==> [Dentora] Verifying database schema (prisma db verify)..."
  npx prisma db verify
fi

echo "==> [Dentora] Starting Next.js application..."
exec "$@"
