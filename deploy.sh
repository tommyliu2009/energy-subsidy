#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source /workspace/handoff/repo_lock.sh energy-subsidy energy   # 程式鎖＋AI 鎖（RULES §7、§14，2026-10-20）
python3 build_site.py
V=$(TZ=Asia/Taipei date +%Y%m%d%H%M)
sed -i -E "s/\?v=[0-9]+/?v=$V/g" index.html
python3 /workspace/shared-data/ga_inject.py . || echo "⚠️ GA 程式碼補入或檢查有問題，請看上面訊息"   # GA4：所有頁面 <head> 補 gtag（2026-10-18）
python3 /workspace/shared-data/matrix/matrix_apply.py . || { [ $? -eq 2 ] && { echo "⛔ 聯智↔仁禾隔離檢查失敗，中止部署" >&2; exit 1; }; echo "⚠️ 矩陣區塊產生有問題（不影響部署）"; }   # 矩陣網站：相關網站、延伸閱讀、問診、GEO（2026-10-24）
if grep -Eq 'GetGrant|日報|紀錄檔|彙整報告|20260920|drive\.google|docs\.google|user_files' data.js; then echo "ERROR: 偵測到私人資料" >&2; exit 1; fi
git add -A
git diff --cached --quiet && { echo "無變動"; exit 0; }
git -c user.name=tommyliu2009 -c user.email=tommyliu2009@users.noreply.github.com commit -qm "資料更新 $(TZ=Asia/Taipei date '+%Y-%m-%d %H:%M')"
git push -q origin main
echo 已部署
