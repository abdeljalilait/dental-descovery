#!/usr/bin/env bash
set -euo pipefail

# Usage: PG_URI="..." scripts/restore-db.sh backup.sql.gz
if [[ $# -lt 1 ]]; then
  echo "Usage: PG_URI=... scripts/restore-db.sh <backup.sql.gz>" >&2
  exit 1
fi
IN="$1"
if [[ -z "${PG_URI:-}" ]]; then
  echo "Set PG_URI" >&2
  exit 1
fi
gunzip -c "$IN" | psql "$PG_URI"
echo "Restored $IN"
