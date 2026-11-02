#!/usr/bin/env bash
# Usage: site/build.sh you@zohomail.com [https://qalamcreative.surge.sh]
# Builds site/dist with the real contact email, then deploy with: npx surge site/dist qalamcreative.surge.sh
set -euo pipefail
EMAIL="${1:?contact email required}"; SITE="${2:-https://qalamcreative.surge.sh}"
cd "$(dirname "$0")"; rm -rf dist; mkdir -p dist
cp -r index.html concepts dist/
grep -rl 'hello@qalamcreative.com' dist | xargs sed -i "s/hello@qalamcreative\.com/${EMAIL}/g"
echo "Built dist/ with contact ${EMAIL} for ${SITE}"
