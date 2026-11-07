#!/usr/bin/env bash
# One-time setup: create/link a Vercel project, configure GitHub Actions, and push.
# Needs: Node 20+, gh (logged in), git, and a Vercel token. Terraform is not required.
set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null || { echo "Missing: $1"; exit 1; }; }
need node; need npm; need gh; need git
gh auth status >/dev/null 2>&1 || { echo "Run: gh auth login"; exit 1; }

ask() { local value; read -r -p "$1: " value; printf '%s\n' "$value"; }
asks() { local value; read -r -s -p "$1: " value; printf '\n' >&2; printf '%s' "$value"; }

echo "── Project setup ──"
NAME=$(ask "Project name (lowercase-dashes)")
OWNER=$(ask "GitHub owner [$(gh api user -q .login)]")
OWNER=${OWNER:-$(gh api user -q .login)}
SCOPE=$(ask "Vercel team slug (leave blank for your personal account)")
VTOKEN=$(asks "Vercel token (vercel.com/account/tokens)")
PRODUCTION_URL=$(ask "Production URL [https://${NAME}.vercel.app]")
PRODUCTION_URL=${PRODUCTION_URL:-https://${NAME}.vercel.app}

echo "── Install dependencies ──"
npm ci

echo "── GitHub repo ──"
if [ ! -d .git ]; then git init -b main && git add -A && git commit -qm "chore: scaffold AI code factory"; fi
if ! gh repo view "$OWNER/$NAME" >/dev/null 2>&1; then
  gh repo create "$OWNER/$NAME" --private --source=. --remote=origin
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$NAME.git"

echo "── Vercel project ──"
VERCEL_SCOPE_ARGS=()
if [ -n "$SCOPE" ]; then VERCEL_SCOPE_ARGS=(--scope "$SCOPE"); fi
if ! npx vercel project inspect "$NAME" --json --token="$VTOKEN" "${VERCEL_SCOPE_ARGS[@]}" >/dev/null 2>&1; then
  npx vercel project create "$NAME" --token="$VTOKEN" "${VERCEL_SCOPE_ARGS[@]}"
fi
npx vercel link --yes --project "$NAME" --token="$VTOKEN" "${VERCEL_SCOPE_ARGS[@]}"
npx vercel project update --framework nextjs --auto-detect output-directory --yes --token="$VTOKEN" "${VERCEL_SCOPE_ARGS[@]}"
VERCEL_ORG_ID=$(node -p "require('./.vercel/project.json').orgId")
VERCEL_PROJECT_ID=$(node -p "require('./.vercel/project.json').projectId")

echo "── GitHub Actions settings ──"
printf '%s' "$VTOKEN" | gh secret set VERCEL_TOKEN --repo "$OWNER/$NAME"
gh variable set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" --repo "$OWNER/$NAME"
gh variable set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" --repo "$OWNER/$NAME"
gh variable set PRODUCTION_URL --body "$PRODUCTION_URL" --repo "$OWNER/$NAME"

echo "If Vercel preview protection is enabled, paste its automation bypass secret."
echo "Leave blank when previews are public."
BYPASS=$(asks "Vercel automation bypass secret (optional)")
if [ -n "$BYPASS" ]; then
  printf '%s' "$BYPASS" | gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --repo "$OWNER/$NAME"
fi

echo "── Factory issue labels ──"
gh label create factory --color c084fc --description "AI code factory work" --force --repo "$OWNER/$NAME"
gh label create feature --color 0052cc --description "Feature to build" --force --repo "$OWNER/$NAME"
gh label create bug --color d93f0b --description "Confirmed product defect" --force --repo "$OWNER/$NAME"
gh label create incident --color b60205 --description "Runtime incident requiring triage" --force --repo "$OWNER/$NAME"

echo "── First production deploy ──"
git add -A && git commit -qm "chore: lockfile" || true
git push -u origin main

unset VTOKEN BYPASS
cat <<EOF

Factory ready.
  • Production deploy is running: gh run watch
  • App secrets belong in Vercel Project Settings → Environment Variables.
    CLI example: npx vercel env add API_KEY --environment production,preview --sensitive
  • Keep workflow credentials in GitHub Actions secrets; Vercel values are not available to Actions.
  • Protect the main branch in GitHub Settings and require the verify check.
  • Open the factory dashboard to create apps and assign feature issues to Copilot.
  • Or, in VS Code Copilot Chat (Agent mode), run /kickoff or /feature <description>.
EOF
