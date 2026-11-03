#!/usr/bin/env bash
# Hourly production check run by .github/workflows/monitor-production.yml.
# Exits non-zero (and GitHub emails the workflow owner) when the site, the
# snapshot API or a quota needs attention. Quota checks need
# MONITOR_DATABASE_URL: a read-only role on the production Neon branch
# (see docs/snapshot-service-operations.md).
set -uo pipefail
origin="${OMBELLE_MONITOR_ORIGIN:-https://ombelle-ui.vercel.app}"
warn_percent="${OMBELLE_MONITOR_WARN_PERCENT:-80}"
failures=0
fail() { echo "::error::$*"; failures=$((failures + 1)); }
ok() { echo "ok: $*"; }

expect_status() {
  local path="$1" expected="$2" status
  status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$origin$path") || status="curl-error"
  if [ "$status" = "$expected" ]; then ok "$path -> $status"; else fail "$path returned $status, expected $expected"; fi
}

expect_status / 200
expect_status /privacy 200
expect_status /security 200
expect_status /ombelle-preview/editor-preview 200
expect_status /editor-compiler.worker.js 200

# An unknown code must reach the database and its schema: 503 here means the
# service is misconfigured or the schema is missing.
body=$(curl -sS --max-time 20 "$origin/api/v1/presets/ps_00000000000000000000000000000000/1") || body=""
case "$body" in
  *'"SNAPSHOT_NOT_FOUND"'*) ok "snapshot API reaches the database" ;;
  *) fail "snapshot API did not answer SNAPSHOT_NOT_FOUND for an unknown code: ${body:0:200}" ;;
esac

expires=$(curl -sS --max-time 20 "$origin/.well-known/security.txt" | sed -n 's/^Expires: *//p' | tr -d '\r')
if [ -z "$expires" ]; then
  fail "security.txt has no Expires field"
elif [ "$(date -u -d "$expires" +%s 2>/dev/null || echo 0)" -lt "$(date -u -d '+30 days' +%s)" ]; then
  fail "security.txt expires on $expires; renew it"
else
  ok "security.txt valid until $expires"
fi

check_ratio() {
  local label="$1" used="$2" limit="$3"
  local percent=$(( used * 100 / limit ))
  if [ "$percent" -ge "$warn_percent" ]; then fail "$label at ${percent}% ($used of $limit)"; else ok "$label at ${percent}% ($used of $limit)"; fi
}

if [ -z "${MONITOR_DATABASE_URL:-}" ]; then
  echo "::warning::MONITOR_DATABASE_URL is not set; quota and capacity checks skipped"
else
  # Limits mirror apps/www/src/snapshots/server/postgres-store.ts and the
  # capacity table constraints; 1 GiB is the Neon Free storage allowance.
  row=$(PGCONNECT_TIMEOUT=15 psql "$MONITOR_DATABASE_URL" -X -A -t -F ' ' -v ON_ERROR_STOP=1 -c "
    SELECT c.records, c.bytes,
      COALESCE((SELECT count FROM ombelle.rate_buckets WHERE kind='global' AND client_key=''
        AND window_start=floor(extract(epoch FROM now()) * 1000 / 86400000)::bigint), 0),
      pg_database_size(current_database())
    FROM ombelle.capacity c WHERE c.singleton=1" 2>&1) || { fail "quota query failed: $row"; row=""; }
  if [ -n "$row" ]; then
    read -r records bytes today size <<<"$row"
    check_ratio "stored publications" "$records" 100000
    check_ratio "stored response bytes" "$bytes" 268435456
    check_ratio "publications today (UTC)" "$today" 5000
    check_ratio "database size" "$size" 1073741824
  fi
fi

# The monthly "Back up production" workflow must have succeeded recently.
if [ -z "${GH_TOKEN:-}" ] || [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "::warning::GH_TOKEN or GITHUB_REPOSITORY is not set; backup freshness check skipped"
else
  last=$(curl -sS --max-time 20 -H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/workflows/backup-production.yml/runs?status=success&per_page=1" |
    sed -n 's/.*"created_at": *"\([^"]*\)".*/\1/p' | head -1)
  if [ -z "$last" ]; then
    fail "no successful production backup found"
  elif [ "$(date -u -d "$last" +%s)" -lt "$(date -u -d '-35 days' +%s)" ]; then
    fail "last successful production backup ran at $last, more than 35 days ago"
  else
    ok "last successful production backup at $last"
  fi
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) need attention"
  exit 1
fi
echo "all checks passed"
