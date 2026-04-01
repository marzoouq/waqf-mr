#!/usr/bin/env bash
set -euo pipefail

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "[SECURITY] .env is tracked in Git. Remove it from tracking before push." >&2
  echo "Run: git rm --cached .env" >&2
  exit 1
fi

echo "[OK] .env is not tracked in Git."
