#!/usr/bin/env bash
#
# Bootstrap the org's supporting repositories for the Digitalization Portal.
#
# Creates and seeds the two repos the app reads and writes at runtime:
#   - du-demands        the intake funnel (seeded from ./demands)
#   - du-agent-registry the skills & playbooks registry (seeded from ./skills + ./playbooks)
#
# The uc-* repos are NOT created here — the PoC builder creates them at the PoC
# stage. Run this once, from the portal repo root, with the GitHub CLI installed
# and authenticated (`gh auth login`) as a member who can create repos in the org.
#
# Usage:  scripts/bootstrap-org.sh [org]           (default org: ops-digit-io)
#
set -euo pipefail

ORG="${1:-ops-digit-io}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

command -v gh >/dev/null 2>&1 || { echo "error: GitHub CLI (gh) is required — https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: run 'gh auth login' first"; exit 1; }

# create_and_seed <repo> <description> <src-dir...>
create_and_seed() {
  local repo="$1"; shift
  local desc="$1"; shift
  echo "== ${ORG}/${repo} =="

  if gh repo view "${ORG}/${repo}" >/dev/null 2>&1; then
    echo "   already exists — leaving its contents untouched."
    return 0
  fi

  local tmp; tmp="$(mktemp -d)"
  git -C "$tmp" init -q
  printf '# %s\n\nManaged by the Digitalization Portal. %s\n' "$repo" "$desc" > "$tmp/README.md"
  for src in "$@"; do
    if [ -d "${ROOT}/${src}" ]; then
      mkdir -p "${tmp}/${src}"
      cp -R "${ROOT}/${src}/." "${tmp}/${src}/"
    fi
  done
  git -C "$tmp" add -A
  git -C "$tmp" -c user.email=bootstrap@local -c user.name=bootstrap commit -q -m "Seed ${repo} from the portal bundle"
  git -C "$tmp" branch -M main
  gh repo create "${ORG}/${repo}" --private --description "$desc" --source "$tmp" --remote origin --push
  rm -rf "$tmp"
  echo "   created and seeded (main)."
}

create_and_seed "du-demands" \
  "Intake funnel — every demand/case is a folder of markdown." \
  "demands"

create_and_seed "du-agent-registry" \
  "Agent skills & playbooks registry." \
  "skills" "playbooks"

cat <<EOF

Done. Next:
  1. Install the GitHub App on ${ORG}, scoped to du-demands, du-agent-registry, and uc-*.
     (docs/SETUP-github-app.md)
  2. Set GITHUB_ORG=${ORG}, DEMANDS_REPO=du-demands, REGISTRY_REPO=du-agent-registry
     plus the App credentials in Vercel. The app then reads AND writes these repos live.
  3. Branch-protect uc-* main (CODEOWNERS review, no app merge) — that is the gate.
EOF
