# 節能補助王--仁禾管理顧問

網址：https://web7.subsidyking.tw/ （GitHub Pages，repo：tommyliu2009/energy-subsidy）

純靜態網站：`index.html`、`style.css`（沿用補助王）、`energy.css`、`app.js`、`config.js`、`data.js`。

## 資料來源
- 補助：從 `/workspace/subsidy/補助資料庫_full.csv` 依關鍵字篩出「節能／淨零／環境部」三類（可重疊），再加上 `extra.csv`（人工上網補充，每筆都要有原始連結與截止日）。
- ESCO 廠商：`/workspace/esco/esco.json`，來自經濟部能源署 ESCO 服務能量登錄平台（https://ea01.moeaea.gov.tw/e0409/Page/Company.aspx），抓取程式 `/workspace/esco/scrape2.py`、`area.py`；得標件數由標案王 `/workspace/tender-king/raw/day` 決標公告比對公司名稱。

## 每天如何更新
1. 先讓補助王每日更新（03:07）跑完，更新 `/workspace/subsidy/補助資料庫_full.csv`。
2. 執行 `./deploy.sh`：重建 `data.js`、把 CSS/JS 的 `?v=` 版本號換成當下時間、commit 並 push，GitHub Pages 約 1 分鐘後上線。
3. ESCO 名單不常變動，建議每月重抓一次：
   `cd /workspace/esco && python3 scrape2.py && python3 area.py`，再執行合併 CSV 的步驟（見 /workspace/esco）與 `./deploy.sh`。
4. 新增網路上找到的補助：在 `extra.csv` 加一列（補助名稱、主辦單位、截止日期、對象、摘要、原始連結、狀態、年度），沒有原始連結的不收。

## 訂閱
- 名單試算表：Google 雲端硬碟 Grok 資料夾「節能補助王訂閱名單」。
- 後端：`apps_script/Code.gs`（貼到該試算表的 擴充功能 > Apps Script，部署為網頁應用程式：執行身分「我」、存取權「所有人」）。
- 把部署網址填入 `config.js` 的 `window.SUB_URL`，再 `./deploy.sh`。未填之前訂閱鈕顯示「即將開放」。

## 截圖
`python3 shot.py https://web7.subsidyking.tw/` 產生 shot.png（1366 寬）與 shot_mobile.png。
