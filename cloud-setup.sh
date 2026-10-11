#!/bin/sh
# Prépare une session Cloud : installe les outils puis vérifie que tout se construit.
# Usage : sh cloud-setup.sh
set -e
git config --global --add safe.directory "$(pwd)" 2>/dev/null || true
[ -d node_modules ] || npm ci --no-audit --no-fund
node scripts/build.mjs
CH=$(ls /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1)
[ -n "$CH" ] && echo "export CHROMIUM_PATH=$CH" > .cloud-env && echo "Navigateur de test : $CH"
echo "Prêt. Tests : . ./.cloud-env && npx playwright test --workers=2"
