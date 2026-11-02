#!/usr/bin/env bash
# Shared helpers for backup-production.sh and restore-drill.sh (Linux/WSL).
# Provides a pinned PostgreSQL 18 client without root and loads connection
# settings from a URL into libpq environment variables, so credentials never
# appear in command-line arguments.

pg_tools_version=18.6-3.pgdg22.04+1
pg_tools_root="${XDG_CACHE_HOME:-$HOME/.cache}/ombelle-pg18/$pg_tools_version"

ensure_pg_tools() {
  # Use an installed client when it is new enough (CI installs one from PGDG).
  if command -v pg_dump >/dev/null && command -v psql >/dev/null &&
    [ "$(pg_dump --version | awk '{print $3}' | cut -d. -f1)" -ge 18 ] 2>/dev/null; then
    return 0
  fi
  local bin="$pg_tools_root/usr/lib/postgresql/18/bin"
  if [ ! -x "$bin/pg_dump" ]; then
    local pool=https://apt.postgresql.org/pub/repos/apt/pool/main/p/postgresql-18
    local work; work=$(mktemp -d)
    (
      set -e
      cd "$work"
      curl -fsSL -o client.deb "$pool/postgresql-client-18_18.6-3.pgdg22.04%2B1_amd64.deb"
      curl -fsSL -o libpq.deb "$pool/libpq5_18.6-3.pgdg22.04%2B1_amd64.deb"
      sha256sum -c - <<'EOF'
55494e9ff6bedcae7fbc6c7d56c8b7bda434de8cb61bb5ad58409af001da3e86  client.deb
17acf4ff67aa8655a725614eeaa2fc39e9be8f3c0b05ce59aafdc622a5f3be07  libpq.deb
EOF
      mkdir -p "$pg_tools_root"
      dpkg-deb -x client.deb "$pg_tools_root"
      dpkg-deb -x libpq.deb "$pg_tools_root"
    ) || { rm -rf "$work"; echo "Could not install the pinned PostgreSQL client." >&2; return 1; }
    rm -rf "$work"
  fi
  export PATH="$bin:$PATH"
  export LD_LIBRARY_PATH="$pg_tools_root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
}

# Usage: load_pg_url "$URL" — exports PGHOST, PGPORT, PGUSER, PGPASSWORD,
# PGDATABASE and PGSSLMODE=verify-full. Refuses pooled hosts.
load_pg_url() {
  local parsed
  parsed=$(python3 -I -c '
import sys, urllib.parse
u = urllib.parse.urlsplit(sys.stdin.read().strip())
if u.scheme not in ("postgres", "postgresql") or not u.hostname or not u.username or not u.password or len(u.path) < 2:
    sys.exit("invalid connection URL")
if "-pooler." in u.hostname:
    sys.exit("use the direct (unpooled) connection, not a -pooler host")
for k, v in (("PGHOST", u.hostname), ("PGPORT", str(u.port or 5432)), ("PGUSER", urllib.parse.unquote(u.username)),
             ("PGPASSWORD", urllib.parse.unquote(u.password)), ("PGDATABASE", urllib.parse.unquote(u.path[1:]))):
    print(k + "=" + v.replace("\n", ""))
' <<<"$1") || return 1
  while IFS='=' read -r key value; do export "$key=$value"; done <<<"$parsed"
  export PGSSLMODE=verify-full PGSSLROOTCERT=system PGCONNECT_TIMEOUT=15
}

# Prints "table count" lines and a publications fingerprint for the ombelle schema.
snapshot_summary() {
  psql -X -A -t -F ' ' -v ON_ERROR_STOP=1 -c "
    SELECT 'publications', count(*) FROM ombelle.publications
    UNION ALL SELECT 'withdrawals', count(*) FROM ombelle.withdrawals
    UNION ALL SELECT 'idempotency_keys', count(*) FROM ombelle.idempotency_keys
    UNION ALL SELECT 'rate_buckets', count(*) FROM ombelle.rate_buckets
    UNION ALL SELECT 'schema_version', version FROM ombelle.schema_version
    UNION ALL SELECT 'capacity_records', records FROM ombelle.capacity
    UNION ALL SELECT 'capacity_bytes', bytes FROM ombelle.capacity" &&
  psql -X -A -t -v ON_ERROR_STOP=1 -c "
    SELECT 'fingerprint ' || encode(sha256(convert_to(coalesce(
      string_agg(id || ':' || response_hash, ',' ORDER BY id), ''), 'UTF8')), 'hex')
    FROM ombelle.publications"
}
