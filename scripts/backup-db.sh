#!/usr/bin/env bash
set -euo pipefail

# Usage: PG_URI="postgresql://..." scripts/backup-db.sh [outfile.sql.gz]
OUT="${1:-dentora-backup-$(date +%Y%m%d-%H%M%S).sql.gz}"
if [[ -z "${PG_URI:-}" ]]; then
  echo "Set PG_URI (e.g. postgresql://user:pass@host:5432/db)" >&2
  exit 1
fi
pg_dump --no-owner --no-privileges --format=plain "$PG_URI" | gzip > "$OUT"
echo "Wrote $OUT"
