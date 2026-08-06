#!/usr/bin/env sh
# Reproducible frontend gate. Every command is intentionally explicit so a
# missing build, browser, or security check exits non-zero under `set -e`.
set -eu

if command -v pnpm >/dev/null 2>&1; then
  pnpm_cmd=pnpm
elif command -v pnpm.cmd >/dev/null 2>&1; then
  pnpm_cmd=pnpm.cmd
else
  echo "pnpm is required to verify the frontend" >&2
  exit 127
fi

"$pnpm_cmd" run ci
"$pnpm_cmd" frontend:build
"$pnpm_cmd" test
"$pnpm_cmd" playwright test
"$pnpm_cmd" secrets
