#!/usr/bin/env bash
# Restore a production backup into an empty, non-production database and check
# it against the backup summary (Linux/WSL).
# Usage: OMBELLE_DRILL_DATABASE_URL='postgresql://…/restore_drill' scripts/restore-drill.sh /path/ombelle-<stamp>.dump
# Use the direct URL of an empty database on a temporary Neon branch. The
# script refuses the production host and any database that already has data.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
source "$here/pg-tools.sh"

production_host="${OMBELLE_PRODUCTION_DB_HOST:-ep-bitter-meadow-b9plx52i.c-7.eu-central-1.aws.neon.tech}"
dump="${1:-}"
base="${dump%.dump}"
if [ -z "$dump" ] || [ ! -f "$dump" ] || [ ! -f "$base.summary" ] || [ ! -f "$base.sha256" ]; then
  echo "Usage: OMBELLE_DRILL_DATABASE_URL=… $0 /path/ombelle-<stamp>.dump (with its .summary and .sha256)" >&2; exit 2
fi
if [ -z "${OMBELLE_DRILL_DATABASE_URL:-}" ]; then
  echo "Set OMBELLE_DRILL_DATABASE_URL to the direct URL of an empty drill database." >&2; exit 2
fi
(cd "$(dirname "$dump")" && sha256sum -c --quiet "$(basename "$base.sha256")")
ensure_pg_tools
load_pg_url "$OMBELLE_DRILL_DATABASE_URL"
unset OMBELLE_DRILL_DATABASE_URL

if [ "${PGHOST,,}" = "${production_host,,}" ]; then
  echo "Refusing to restore into the production host $PGHOST." >&2; exit 1
fi
if [ "$(psql -X -A -t -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_namespace WHERE nspname='ombelle'")" != 0 ]; then
  echo "Database $PGDATABASE on $PGHOST already has an ombelle schema; use an empty database." >&2; exit 1
fi

pg_restore --no-owner --no-privileges --exit-on-error --single-transaction --dbname="$PGDATABASE" "$dump"
expected=$(grep -v -E '^(host|created_at) ' "$base.summary")
actual=$(snapshot_summary)
if [ "$expected" != "$actual" ]; then
  echo "Restore drill FAILED: restored data differs from the backup summary." >&2
  diff <(echo "$expected") <(echo "$actual") >&2 || true
  exit 1
fi
echo "Restore drill passed on $PGHOST/$PGDATABASE:"
echo "$actual"
