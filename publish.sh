#!/usr/bin/env bash
# Публикация изменений: bash publish.sh ["сообщение коммита"]
set -euo pipefail
cd "$(dirname "$0")"

node scripts/build.mjs

git add -A
git diff --cached --quiet && { echo "Нечего публиковать."; exit 0; }
git commit -q -m "${1:-update: симуляторы}"
git push -q origin main

OWNER=$(gh api user --jq .login 2>/dev/null || echo "")
echo "✓ Отправлено. Сайт обновится через ~1 мин."
[ -n "$OWNER" ] && echo "  https://$OWNER.github.io/$(basename "$(git remote get-url origin)" .git)/"
