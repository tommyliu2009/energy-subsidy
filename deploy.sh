#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 build_site.py
V=$(TZ=Asia/Taipei date +%Y%m%d%H%M)
sed -i -E "s/\?v=[0-9]+/?v=$V/g" index.html
if grep -Eq 'GetGrant|日報|紀錄檔|彙整報告|20260920|drive\.google|docs\.google|user_files' data.js; then echo "ERROR: 偵測到私人資料" >&2; exit 1; fi
git add -A
git diff --cached --quiet && { echo "無變動"; exit 0; }
git -c user.name=tommyliu2009 -c user.email=tommyliu2009@users.noreply.github.com commit -qm "資料更新 $(TZ=Asia/Taipei date '+%Y-%m-%d %H:%M')"
git push -q origin main
echo 已部署
