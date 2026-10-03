#!/usr/bin/env bash
# Vercel Ignored Build Step (vercel.json "ignoreCommand").
# Exit 0 skips the build. Exit 1 builds.
# Skips only when every changed path is under docs/, starts with buzon, is under
# changelog/, or ends in .md. Anything else, or any doubt, builds.
set -u

construir() {
  echo "vercel-ignore-build: build ($1)"
  exit 1
}

saltar() {
  echo "vercel-ignore-build: skip ($1)"
  exit 0
}

solo_documentos() {
  local ruta
  ruta="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
  case "$ruta" in
    docs/* | buzon* | changelog/* | *.md) return 0 ;;
  esac
  return 1
}

# Vercel sets VERCEL_GIT_PREVIOUS_SHA to the last successful deployment of this
# branch. The clone is shallow, so that commit may be missing: then build.
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$base" ]; then
  git cat-file -e "${base}^{commit}" 2>/dev/null || construir "previous deployment ${base} is not in this clone"
else
  git rev-parse -q --verify 'HEAD^' >/dev/null 2>&1 || construir "no previous commit to compare"
  base='HEAD^'
fi

# --no-renames lists both sides of a move, so moving code into docs/ still builds.
cambios="$(git -c core.quotePath=false diff --name-only --no-renames "$base" HEAD)" || construir "git diff failed"
[ -n "$cambios" ] || construir "no file changes"

while IFS= read -r ruta; do
  solo_documentos "$ruta" || construir "${ruta} changed"
done <<<"$cambios"

saltar "only docs, buzon, changelog, or markdown changed since ${base}"
