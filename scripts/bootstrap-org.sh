#!/usr/bin/env bash
#
# Bootstrap the org's supporting repositories for the Digitalization Portal.
#
# Creates and seeds the two repos the app reads and writes at runtime:
#   - du-demands        the intake funnel, seeded with ONE first use case
#                       (UC-2026-0071 — a complete case: demand + requirements +
#                       analysis + research). Add more via the app's Intake.
#   - du-agent-registry the skills & playbooks registry (seeded from ./skills + ./playbooks)
#
# The uc-* repos are NOT created here — the PoC builder creates them at the PoC
# stage. Run this once, from the portal repo root, with the GitHub CLI installed
# and authenticated (`gh auth login`) as a member who can create repos in the org.
#
# Usage:  scripts/bootstrap-org.sh [org] [first-case-id]
#         defaults: org=ops-digit-io  first-case-id=UC-2026-0071
#
set -euo pipefail

ORG="${1:-ops-digit-io}"
FIRST_CASE="${2:-UC-2026-0071}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

command -v gh >/dev/null 2>&1 || { echo "error: GitHub CLI (gh) is required — https://cli.github.com"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: run 'gh auth login' first"; exit 1; }

# push_seed <repo> <description> <staging-dir>
push_seed() {
  local repo="$1" desc="$2" stage="$3"
  echo "== ${ORG}/${repo} =="
  if gh repo view "${ORG}/${repo}" >/dev/null 2>&1; then
    # Repo exists — push the seed onto main only if main has no commits yet.
    if gh api "repos/${ORG}/${repo}/commits" --jq '.[0].sha' >/dev/null 2>&1; then
      echo "   already has commits — leaving it untouched (seed manually if intended)."
      return 0
    fi
  else
    gh repo create "${ORG}/${repo}" --private --description "$desc" >/dev/null
    echo "   created."
  fi
  git -C "$stage" init -q
  git -C "$stage" add -A
  git -C "$stage" -c user.email=bootstrap@local -c user.name=bootstrap commit -q -m "Seed ${repo}"
  git -C "$stage" branch -M main
  git -C "$stage" remote add origin "https://github.com/${ORG}/${repo}.git" 2>/dev/null || true
  git -C "$stage" push -u origin main
  echo "   seeded (main)."
}

# --- du-demands: README + the one first use case -----------------------------
demands_stage="$(mktemp -d)"
printf '# du-demands\n\nThe intake funnel. Every demand/case is a folder of markdown. Managed by the Digitalization Portal.\n' > "${demands_stage}/README.md"
if [ -d "${ROOT}/demands/${FIRST_CASE}" ]; then
  mkdir -p "${demands_stage}/demands/${FIRST_CASE}"
  cp -R "${ROOT}/demands/${FIRST_CASE}/." "${demands_stage}/demands/${FIRST_CASE}/"
else
  echo "warning: ${ROOT}/demands/${FIRST_CASE} not found — seeding du-demands with README only."
fi
push_seed "du-demands" "Intake funnel — every demand/case is a folder of markdown." "$demands_stage"
rm -rf "$demands_stage"

# --- du-agent-registry: README + skills + playbooks --------------------------
registry_stage="$(mktemp -d)"
printf '# du-agent-registry\n\nAgent skills & playbooks for the Digitalization Portal.\n' > "${registry_stage}/README.md"
for d in skills playbooks; do
  if [ -d "${ROOT}/${d}" ]; then mkdir -p "${registry_stage}/${d}"; cp -R "${ROOT}/${d}/." "${registry_stage}/${d}/"; fi
done
push_seed "du-agent-registry" "Agent skills & playbooks registry." "$registry_stage"
rm -rf "$registry_stage"

cat <<EOF

Seeded. To let the app INTERFACE with these repos (read + write live):
  1. Install the GitHub App on ${ORG}, scoped to du-demands, du-agent-registry, uc-*
     (Administration + Contents + Pull requests + Metadata — never merge). docs/SETUP-github-app.md
  2. Set in the deployment (Vercel):
       GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID
       GITHUB_ORG=${ORG}
       DEMANDS_REPO=du-demands
       REGISTRY_REPO=du-agent-registry
  The moment those App vars are present the app reads AND writes these repos live —
  the funnel shows ${FIRST_CASE}, and new demands land in du-demands.
EOF
