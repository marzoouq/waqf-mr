#!/usr/bin/env bash
# install-git-hooks.sh — يُثبّت pre-push hook محلياً (بدون husky).
set -e
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HOOK_DIR="$ROOT/.git/hooks"
SRC="$ROOT/.husky/pre-push"

if [ ! -d "$HOOK_DIR" ]; then
  echo "✗ لم يُعثر على .git/hooks — هل المستودع مُهيّأ بـ git؟"
  exit 1
fi
if [ ! -f "$SRC" ]; then
  echo "✗ الملف $SRC غير موجود."
  exit 1
fi

cp "$SRC" "$HOOK_DIR/pre-push"
chmod +x "$HOOK_DIR/pre-push"
echo "✓ تم تثبيت pre-push hook في $HOOK_DIR/pre-push"
echo "  لتعطيله مؤقتاً: استخدم  git push --no-verify"
