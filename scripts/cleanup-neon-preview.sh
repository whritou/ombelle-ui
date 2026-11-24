#!/usr/bin/env bash
# Delete the Neon branches that the Vercel Neon integration created for preview
# deployments (named "preview/<git branch>"). The integration never removes them,
# and Neon Free allows 10 branches per project.
#
# Usage:
#   NEON_API_KEY=… scripts/cleanup-neon-preview.sh <git branch>
#       Delete preview/<git branch>. Used when a pull request closes or a branch is deleted.
#   NEON_API_KEY=… scripts/cleanup-neon-preview.sh --sweep <live-branches-file> [--dry-run]
#       Delete every preview/* branch whose git branch is not listed in the file (one name per
#       line: every git branch plus the head branch of every open pull request). The sweep
#       catches what the single-branch path missed: closes by Dependabot, API timeouts, and
#       branches that never had a pull request.
#
# Safety checks, all kept from the single-branch script and extended for the sweep:
#   * only names that start with "preview/" are ever deleted;
#   * a default or protected branch is never deleted, even with a preview name;
#   * git branch names with unexpected characters are refused;
#   * the sweep refuses an empty live list or one without the default branch's name (a failed
#     GitHub call must never look like "no branch is alive");
#   * the sweep skips branches younger than OMBELLE_SWEEP_MIN_AGE_HOURS (default 24), so a
#     preview created while the list was being built survives.
set -euo pipefail
project="${NEON_PROJECT_ID:-delicate-tooth-65251690}"
api="${NEON_API_BASE:-https://console.neon.tech/api/v2}"
min_age_hours="${OMBELLE_SWEEP_MIN_AGE_HOURS:-24}"
default_branch="${OMBELLE_DEFAULT_BRANCH:-main}"

mode=single
git_branch=""
live_file=""
dry_run=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --sweep) mode=sweep; live_file="${2:-}"; shift 2 || { echo "--sweep needs a file" >&2; exit 2; } ;;
    --dry-run) dry_run=1; shift ;;
    -*) echo "::error::Unknown option: $1" >&2; exit 2 ;;
    *) git_branch="$1"; shift ;;
  esac
done

if [ "$mode" = single ] && [ -z "$git_branch" ]; then
  echo "Usage: NEON_API_KEY=… $0 <git branch> | --sweep <live-branches-file> [--dry-run]" >&2; exit 2
fi
if [ "$mode" = sweep ] && { [ -z "$live_file" ] || [ ! -f "$live_file" ]; }; then
  echo "::error::--sweep needs the path of a file listing the live git branches" >&2; exit 2
fi
if [ "$mode" = single ]; then
  case "$git_branch" in
    -*|*..*|*[!A-Za-z0-9._/-]*) echo "::error::Refusing unexpected git branch name: $git_branch" >&2; exit 1 ;;
  esac
fi
if [ -z "${NEON_API_KEY:-}" ]; then
  echo "::error::NEON_API_KEY is not set" >&2; exit 1
fi

auth=(-H "Authorization: Bearer $NEON_API_KEY" -H 'Accept: application/json')
# One timeout is how a cleanup was lost before: retry connection errors and 5xx/429 answers.
curl_api() { curl -fsS --max-time 30 --retry 4 --retry-delay 3 --retry-all-errors "${auth[@]}" "$@"; }

branches=$(curl_api "$api/projects/$project/branches")

if [ "$mode" = single ]; then
  name="preview/$git_branch"
  # Print the id of the exact match; refuse a default or protected branch even if it carried a preview name.
  id=$(python3 -I -c '
import json, sys
name = sys.argv[1]
for branch in json.load(sys.stdin).get("branches", []):
    if branch.get("name") != name:
        continue
    if branch.get("default") or branch.get("protected") or not name.startswith("preview/"):
        sys.exit("refusing to delete default or protected branch " + name)
    print(branch["id"])
' "$name" <<<"$branches")
  if [ -z "$id" ]; then
    echo "No Neon branch named $name; nothing to delete."
    exit 0
  fi
  curl_api -X DELETE "$api/projects/$project/branches/$id" >/dev/null
  echo "Deleted Neon branch $name ($id)."
  exit 0
fi

# Sweep. The live list must contain the default branch, or it is not a real listing.
if ! grep -Fxq "$default_branch" "$live_file"; then
  echo "::error::The live branch list does not contain '$default_branch'; refusing to sweep on an incomplete listing." >&2; exit 1
fi
# One "<id> <name>" line per stale preview branch.
stale=$(python3 -I -c '
import json, sys, datetime
live = {line.strip() for line in open(sys.argv[1], encoding="utf-8") if line.strip()}
min_age = float(sys.argv[2]) * 3600
now = datetime.datetime.now(datetime.timezone.utc)
for branch in json.load(sys.stdin).get("branches", []):
    name = branch.get("name", "")
    if not name.startswith("preview/") or branch.get("default") or branch.get("protected"):
        continue
    git_branch = name[len("preview/"):]
    if not git_branch or git_branch in live:
        continue
    created = branch.get("created_at")
    if created:
        age = (now - datetime.datetime.fromisoformat(created.replace("Z", "+00:00"))).total_seconds()
        if age < min_age:
            print("# keeping young branch " + name, file=sys.stderr)
            continue
    print(branch["id"] + " " + name)
' "$live_file" "$min_age_hours" <<<"$branches")

if [ -z "$stale" ]; then
  echo "No stale preview branches."
  exit 0
fi
deleted=0
while read -r id name; do
  [ -n "$id" ] || continue
  if [ "$dry_run" = 1 ]; then
    echo "Would delete Neon branch $name ($id)."
  else
    curl_api -X DELETE "$api/projects/$project/branches/$id" >/dev/null
    echo "Deleted stale Neon branch $name ($id)."
  fi
  deleted=$((deleted + 1))
done <<<"$stale"
echo "$deleted stale preview branch(es) $([ "$dry_run" = 1 ] && echo found || echo deleted)."
