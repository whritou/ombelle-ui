#!/usr/bin/env bash
# Production check run by .github/workflows/monitor-production.yml (requested hourly; GitHub's scheduler actually
# runs it every few hours, so this is a quota and consistency check, not an uptime monitor).
# Exits non-zero (GitHub emails the workflow owner) when the site, the snapshot API, a quota, the published CLI or
# the backups need attention. Optional settings, from repository secrets or variables:
#   MONITOR_DATABASE_URL       read-only role on the production Neon branch: quota and capacity checks
#   MONITOR_KNOWN_CODE         an existing published code, e.g. ps_<32 hex>@1, and
#   MONITOR_KNOWN_ETAG         its ETag including the quotes (curl -I the code's route once). Proves reads still
#                              pass the service's integrity checks, which the unknown-code probe does not
#   MONITOR_ALERT_WEBHOOK_URL  a second alert channel: gets a JSON { "text", "content" } post on failure
#   MONITOR_HEARTBEAT_URL      a dead-man's-switch URL (healthchecks.io style): pinged on success, "/fail" on
#                              failure. The service alerts when pings stop, which catches a monitor that no longer runs
# See docs/production-operations.md.
set -uo pipefail
origin="${OMBELLE_MONITOR_ORIGIN:-https://ombelle-ui.vercel.app}"
npm_registry="${OMBELLE_MONITOR_NPM_REGISTRY:-https://registry.npmjs.org}"
warn_percent="${OMBELLE_MONITOR_WARN_PERCENT:-80}"
# Neon Free's per-project storage allowance. Set it from the plan page; the default assumes 1 GiB.
db_limit_bytes="${OMBELLE_MONITOR_DB_LIMIT_BYTES:-1073741824}"
backup_max_days="${OMBELLE_MONITOR_BACKUP_MAX_DAYS:-3}"
failures=0
messages=()
fail() { echo "::error::$*"; messages+=("$*"); failures=$((failures + 1)); }
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

# A known published code must be readable and unchanged: the service verifies integrity on every read.
if [ -n "${MONITOR_KNOWN_CODE:-}" ] && [ -n "${MONITOR_KNOWN_ETAG:-}" ]; then
  if ! [[ "$MONITOR_KNOWN_CODE" =~ ^(ps|rc)_[0-9a-f]{32}@1$ ]]; then
    fail "MONITOR_KNOWN_CODE is not a valid code"
  else
    route=presets; [ "${MONITOR_KNOWN_CODE:0:3}" = "rc_" ] && route=recipes
    headers=$(curl -sS -I --max-time 20 "$origin/api/v1/$route/${MONITOR_KNOWN_CODE%@*}/${MONITOR_KNOWN_CODE#*@}") || headers=""
    status=$(printf '%s' "$headers" | head -1 | tr -d '\r' | awk '{print $2}')
    etag=$(printf '%s' "$headers" | tr -d '\r' | sed -n 's/^[Ee][Tt]ag: *//p' | head -1)
    if [ "$status" = 200 ] && [ "$etag" = "$MONITOR_KNOWN_ETAG" ]; then
      ok "known code $MONITOR_KNOWN_CODE reads unchanged"
    else
      fail "known code $MONITOR_KNOWN_CODE returned status '$status' and ETag '$etag', expected 200 and $MONITOR_KNOWN_ETAG"
    fi
  fi
else
  echo "::warning::MONITOR_KNOWN_CODE or MONITOR_KNOWN_ETAG is not set; the known-code read probe is skipped"
fi

# The installer the site advertises must exist on npm: deploying the site before publishing it breaks every command.
installer_file="${OMBELLE_MONITOR_INSTALL_COMMAND_FILE:-apps/www/src/snapshots/install-command.ts}"
if [ -f "$installer_file" ]; then
  advertised=$(sed -n "s/.*publishedInstaller = { packageName: publicCliPackageName, version: '\([0-9][0-9.]*\)'.*/\1/p" "$installer_file" | head -1)
  if [ -z "$advertised" ]; then
    fail "could not read the advertised installer version from $installer_file"
  else
    status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$npm_registry/@ombelle-ui%2Fcli/$advertised") || status="curl-error"
    if [ "$status" = 200 ]; then ok "advertised installer @ombelle-ui/cli@$advertised exists on npm"
    else fail "the site advertises @ombelle-ui/cli@$advertised but npm answered $status"; fi
  fi
else
  echo "::warning::$installer_file is not checked out; the advertised-installer check is skipped"
fi

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
  # capacity table constraints; the database allowance is OMBELLE_MONITOR_DB_LIMIT_BYTES.
  # Verify the server certificate even when the secret says sslmode=require (SEC-06), as pg-tools.sh does.
  # A URL parameter would override PGSSLMODE, so drop sslmode/sslrootcert from the URL first.
  monitor_url=$(printf '%s' "$MONITOR_DATABASE_URL" | sed -E 's/([?&])(sslmode|sslrootcert)=[^&]*/\1/g; s/&&+/\&/g; s/[?&]+$//; s/\?&/?/')
  row=$(PGSSLMODE=verify-full PGSSLROOTCERT=system PGCONNECT_TIMEOUT=15 psql "$monitor_url" -X -A -t -F ' ' -v ON_ERROR_STOP=1 -c "
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
    check_ratio "database size" "$size" "$db_limit_bytes"
  fi
fi

# The daily "Back up production" workflow must have succeeded recently.
if [ -z "${GH_TOKEN:-}" ] || [ -z "${GITHUB_REPOSITORY:-}" ]; then
  echo "::warning::GH_TOKEN or GITHUB_REPOSITORY is not set; backup freshness check skipped"
else
  last=$(curl -sS --max-time 20 -H "Authorization: Bearer $GH_TOKEN" -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/$GITHUB_REPOSITORY/actions/workflows/backup-production.yml/runs?status=success&per_page=1" |
    sed -n 's/.*"created_at": *"\([^"]*\)".*/\1/p' | head -1)
  if [ -z "$last" ]; then
    fail "no successful production backup found"
  elif [ "$(date -u -d "$last" +%s)" -lt "$(date -u -d "-$backup_max_days days" +%s)" ]; then
    fail "last successful production backup ran at $last, more than $backup_max_days days ago"
  else
    ok "last successful production backup at $last"
  fi
fi

# Second alert channel and dead-man's switch. A failure of either never changes the exit code.
ping() { if [ -n "${MONITOR_HEARTBEAT_URL:-}" ]; then curl -sS -o /dev/null --max-time 15 --retry 2 "${MONITOR_HEARTBEAT_URL%/}$1" || echo "::warning::heartbeat ping failed"; fi; }
if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) need attention"
  if [ -n "${MONITOR_ALERT_WEBHOOK_URL:-}" ]; then
    text="Ombelle production monitor: $failures check(s) failed: $(printf '%s; ' "${messages[@]}")"
    payload=$(printf '%s' "$text" | python3 -I -c 'import json,sys; t=sys.stdin.read()[:1800]; print(json.dumps({"text": t, "content": t}))' 2>/dev/null) || payload=""
    if [ -n "$payload" ]; then
      curl -sS -o /dev/null --max-time 15 --retry 2 -H 'Content-Type: application/json' -d "$payload" "$MONITOR_ALERT_WEBHOOK_URL" || echo "::warning::alert webhook failed"
    fi
  fi
  ping /fail
  exit 1
fi
ping ""
echo "all checks passed"
