#!/usr/bin/env bash
# Одноразовый скрипт: создаёт репозиторий на GitHub, заливает содержимое и включает Pages.
# Запускать из этой папки:  bash setup.sh
set -euo pipefail

REPO_NAME="${REPO_NAME:-simuladores}"
VISIBILITY="${VISIBILITY:-private}"   # private | public

cd "$(dirname "$0")"

command -v gh >/dev/null || { echo "✗ gh не установлен: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "✗ Нет авторизации: gh auth login"; exit 1; }

OWNER=$(gh api user --jq .login)
echo "→ Аккаунт: $OWNER"

git init -q 2>/dev/null || true
git checkout -q -B main
git add -A
git diff --cached --quiet || git commit -q -m "init: каталог симуляторов + автодеплой на GitHub Pages"

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  echo "→ Репозиторий $OWNER/$REPO_NAME уже существует, использую его"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  git push -u origin main
else
  gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push
fi

echo "→ Включаю GitHub Pages (source: GitHub Actions)"
gh api -X POST "repos/$OWNER/$REPO_NAME/pages" \
  -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$OWNER/$REPO_NAME/pages" -f build_type=workflow >/dev/null 2>&1 \
  || echo "  ⚠ Не удалось включить Pages через API."
echo "     Если репо приватный и план бесплатный — Pages недоступен."
echo "     Варианты: сделать репо публичным (gh repo edit --visibility public --accept-visibility-change-consequences)"
echo "     или включить вручную: Settings → Pages → Source: GitHub Actions"

echo
echo "✓ Готово"
echo "  Репозиторий: https://github.com/$OWNER/$REPO_NAME"
echo "  Сайт:        https://$OWNER.github.io/$REPO_NAME/"
echo "  Сборка:      gh run watch"
