#!/usr/bin/env bash
# Delete the Neon branch that the Vercel Neon integration created for a git
# branch's preview deployments (named "preview/<git branch>"). The integration
# never removes them, and Neon Free allows 10 branches per project.
# Usage: NEON_API_KEY=… scripts/cleanup-neon-preview.sh <git branch>
set -euo pipefail
project="${NEON_PROJECT_ID:-delicate-tooth-65251690}"
api="${NEON_API_BASE:-https://console.neon.tech/api/v2}"
git_branch="${1:-}"

if [ -z "$git_branch" ]; then
  echo "Usage: NEON_API_KEY=… $0 <git branch>" >&2; exit 2
fi
case "$git_branch" in
  -*|*..*|*[!A-Za-z0-9._/-]*) echo "::error::Refusing unexpected git branch name: $git_branch" >&2; exit 1 ;;
esac
if [ -z "${NEON_API_KEY:-}" ]; then
  echo "::error::NEON_API_KEY is not set" >&2; exit 1
fi

name="preview/$git_branch"
auth=(-H "Authorization: Bearer $NEON_API_KEY" -H 'Accept: application/json')
branches=$(curl -fsS --max-time 30 "${auth[@]}" "$api/projects/$project/branches")
# Print the id of the exact match; refuse a default or protected branch even
# if it carried a preview name.
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
curl -fsS --max-time 30 -X DELETE "${auth[@]}" "$api/projects/$project/branches/$id" >/dev/null
echo "Deleted Neon branch $name ($id)."
