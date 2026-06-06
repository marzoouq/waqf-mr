#!/usr/bin/env bash
# install-git-hooks.sh — يُثبّت pre-commit + pre-push hooks محلياً (بدون husky).
set -e
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
HOOK_DIR="$ROOT/.git/hooks"

if [ ! -d "$HOOK_DIR" ]; then
  echo "✗ لم يُعثر على .git/hooks — هل المستودع مُهيّأ بـ git؟"
  exit 1
fi

install_hook() {
  local name="$1"
  local src="$ROOT/.husky/$name"
  if [ ! -f "$src" ]; then
    echo "✗ الملف $src غير موجود."
    return 1
  fi
  cp "$src" "$HOOK_DIR/$name"
  chmod +x "$HOOK_DIR/$name"
  echo "✓ تم تثبيت $name hook في $HOOK_DIR/$name"
}

install_hook "pre-commit"
install_hook "pre-push"

echo ""
echo "للتجاوز الطارئ:"
echo "  git commit --no-verify   # تخطي pre-commit"
echo "  git push   --no-verify   # تخطي pre-push"
