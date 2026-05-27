#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$root"

failures=0
warnings=0

note() {
  printf 'OK: %s\n' "$1"
}

warn() {
  warnings=$((warnings + 1))
  printf 'WARN: %s\n' "$1"
}

fail() {
  failures=$((failures + 1))
  printf 'FAIL: %s\n' "$1"
}

section() {
  printf '\n== %s ==\n' "$1"
}

section "Repository state"

if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  warn "Worktree has uncommitted or untracked changes; review them before making the repository public or tagging a release."
else
  note "Worktree is clean."
fi

if [[ -f LICENSE || -f LICENSE.md || -f COPYING ]]; then
  note "A license file is present."
else
  warn "No LICENSE, LICENSE.md, or COPYING file found. Choose a license before announcing this as open source."
fi

section "Tracked file blocklist"

while IFS= read -r -d '' path; do
  case "$path" in
    docs/codex-sessions|docs/codex-sessions/*|\
    docs/raw-sessions|docs/raw-sessions/*|\
    docs/session-exports|docs/session-exports/*|\
    marketing/crm|marketing/crm/*|\
    marketing/operations/social-accounts.md|\
    3d-print|3d-print/*|\
    tmp|tmp/*|\
    AGENTS.local.md|*/AGENTS.local.md|\
    .env|*/.env|*.env|*.env.local|*.env.production|*.env.development|\
    local.properties|*/local.properties|\
    signing.properties|*/signing.properties|*signing*.properties|\
    play-service-account*.json|*/play-service-account*.json|\
    google-play*.json|*/google-play*.json|\
    *upload-keystore*|AuthKey_*.p8|*.p8|*.jks|*.keystore|*.p12|*.mobileprovision|*.provisionprofile|\
    *.apk|*.aab|*.idsig)
      fail "Blocked file is tracked by git: $path"
      ;;
  esac
done < <(git ls-files -z)

if [[ "$failures" -eq 0 ]]; then
  note "No blocked filenames are tracked."
fi

section "High-confidence secret scan"

secret_pattern='(sk-[A-Za-z0-9_-]{32,}|sk-proj-[A-Za-z0-9_-]{32,}|ghp_[A-Za-z0-9_]{32,}|github_pat_[A-Za-z0-9_]{32,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|"private_key"[[:space:]]*:[[:space:]]*"-----BEGIN)'
secret_matches="$(git grep -n -I -E "$secret_pattern" -- . ':!package-lock.json' ':!OPEN_SOURCE_RELEASE.md' ':!scripts/open_source_check.sh' || true)"

if [[ -n "$secret_matches" ]]; then
  fail "Potential secret material found in tracked files:"
  printf '%s\n' "$secret_matches"
else
  note "No high-confidence secret strings found."
fi

section "Local/private reference scan"

local_pattern='(/Users/andreabertoncini|/Users/[^[:space:]]+/\.config/chuchotage|hetzner_wofi_ed25519|namecheap\.env|appstore-connect\.env|notarizationpassword|AuthKey_[A-Za-z0-9]+\.p8|@s\.whatsapp\.net|(^|[^[:alnum:]_])wacli([^[:alnum:]_]|$))'
local_matches="$(git grep -n -I -E "$local_pattern" -- . ':!.gitignore' ':!OPEN_SOURCE_RELEASE.md' ':!scripts/open_source_check.sh' || true)"

if [[ -n "$local_matches" ]]; then
  warn "Local-only paths, infrastructure references, or private workflow traces found; confirm they are not public-release material:"
  printf '%s\n' "$local_matches"
else
  note "No local-only path or private workflow references found outside the open-source guide/check."
fi

section "Generated path scan"

generated_matches="$(git ls-files | grep -E '^(build|app/build|dist|node_modules|tmp|\.gradle|\.kotlin)/' || true)"

if [[ -n "$generated_matches" ]]; then
  warn "Generated or bulky paths are tracked; confirm they are intentional:"
  printf '%s\n' "$generated_matches"
else
  note "No generated build/cache directories are tracked."
fi

section "Result"

if [[ "$failures" -gt 0 ]]; then
  printf 'Open-source check failed with %d failure(s) and %d warning(s).\n' "$failures" "$warnings"
  exit 1
fi

printf 'Open-source check completed with %d warning(s).\n' "$warnings"
