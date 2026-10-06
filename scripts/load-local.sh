#!/bin/sh
# Load every SQL migration, in order, into a database you already created (no Docker).
#   createdb -p 5431 filmbox
#   sh scripts/load-local.sh "postgres://YOUR_MAC_USER@localhost:5431/filmbox"
# Safe to run again: filmbox.sql drops and recreates every table first.
set -e
URL="${1:-$DATABASE_URL}"
[ -n "$URL" ] || { echo "Usage: sh scripts/load-local.sh <postgres-url>"; exit 1; }
for f in db/migrations/*.sql; do
  echo "-> $f"
  psql "$URL" -v ON_ERROR_STOP=1 -q -f "$f"
done
echo "Done. Next: point DATABASE_URL in .env at the same database, then npm run dev."
