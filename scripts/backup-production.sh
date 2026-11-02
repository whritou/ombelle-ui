#!/usr/bin/env bash
# Back up the production snapshot store (Linux/WSL).
# Usage: OMBELLE_BACKUP_DATABASE_URL='postgresql://…' scripts/backup-production.sh /absolute/backup/dir
# The URL must be the direct (unpooled) connection of the production Neon
# branch. Writes ombelle-<UTC timestamp>.dump plus .summary and .sha256 files.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
source "$here/pg-tools.sh"

destination="${1:-}"
if [ -z "$destination" ] || [ "${destination:0:1}" != / ]; then
  echo "Usage: OMBELLE_BACKUP_DATABASE_URL=… $0 /absolute/backup/dir" >&2; exit 2
fi
if [ -z "${OMBELLE_BACKUP_DATABASE_URL:-}" ]; then
  echo "Set OMBELLE_BACKUP_DATABASE_URL to the direct production connection URL." >&2; exit 2
fi
umask 077
mkdir -p "$destination"
ensure_pg_tools
load_pg_url "$OMBELLE_BACKUP_DATABASE_URL"
unset OMBELLE_BACKUP_DATABASE_URL

stamp=$(date -u +%Y%m%dT%H%M%SZ)
base="$destination/ombelle-$stamp"
for suffix in dump summary sha256; do
  if [ -e "$base.$suffix" ]; then echo "Refusing to overwrite $base.$suffix" >&2; exit 1; fi
done

# The summary is read just before the dump, not in the same snapshot. A
# publication or counter change between the two shows up as a mismatch in the
# restore drill rather than silently; rerun the backup in that case.
echo "host $PGHOST" >"$base.summary"
echo "created_at $stamp" >>"$base.summary"
snapshot_summary >>"$base.summary"
pg_dump --format=custom --schema=ombelle --no-owner --no-privileges --file="$base.dump"
pg_restore --list "$base.dump" >/dev/null
(cd "$destination" && sha256sum "$(basename "$base.dump")" >"$base.sha256")

echo "Backup written: $base.dump ($(stat -c %s "$base.dump") bytes)"
cat "$base.summary"
