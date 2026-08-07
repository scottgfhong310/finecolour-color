# finecolour-color — Session 起手 context

> 版本 v1.2｜最後更新 2026-08-03

Finecolour（法卡勒）色號 → CSS 對照。家族**第四支色彩 registry**、第三支雙頁 app。
**三個色號空間**：麥克筆 480 ／彩針筆 48 ／壓克力筆 120，共 648 色。
零後端資料庫、public repo、`clone` 下來 `npm start` 就能跑。

## 動手前必讀

- 家族規範：<https://github.com/scottgfhong310/nodeapp-webapp-family/blob/main/DESIGN_GUIDELINES.md>
  ——特別是 **§11.1**（色票明細卡形制，四支色彩 app 共用）、**§5.13**（分組 chips vs 篩選 chips）、
  **§6.2**（資料的多語名稱怎麼顯示）。
- 本 repo 的 [`DESIGN.md`](DESIGN.md)——**為什麼長這樣**。動任何與色名、色號空間、
  產品線有關的東西之前先讀 §1.2。

## 結構

```
app.js                                   Express（morgan + static + 302 + JSON 404 + PORT||3000）
public/apps/finecolour-color/
  index.html                             純結構（含防閃爍開機腳本）
  finecolour-color.css / .js             樣式 / 控制器（碰 DOM）
  finecolour-color-lib.js                核心，不碰 DOM，IIFE → window.FinecolourColorLib
  sets.html / sets.css / sets.js         套組收錄對照（第二頁）
  colour-detail.js                       明細卡（兩頁共用；markup 由模組自己注入）
  nearest-panel.js                       最接近色面板（兩頁共用）
  i18n.js + locales/{zh-Hant,en,ja}.js    預設 zh-Hant
  data/finecolour-colors.js / -sets.js   **生成物，不手改**
```

## 三條不可違反的

1. **`data/*.js` 是生成物。** 由 `My Projects/Art Colour/export/a3-export.js` 自
   `db_artcolor` 匯出。要改資料就去改 DB 再跑 `--write`，然後 `--check` 確認逐位元組相同。
   **手改產物＝下次匯出被蓋掉，而且庫與 repo 從此不一致。**

2. **主名一律走 `L.officialName(color)`，不可直接讀 `.name`，也不可自己再寫一份。**
   官方名不一定是英文——麥克筆的色譜是英文的、彩針筆的是中文的、
   **壓克力筆（EF600）根本沒有色名**，靠資料的 `official` 欄（`'en'`／`'zh'`／`'none'`）決定。
   直接讀 `.name` 會讓彩針筆顯示成我們這邊的譯名，**拿去問賣家對不到任何東西**；
   `'none'` 時要用 `L.hasOfficialName()` 判斷並**明講「原廠不發佈色名」**，不可留白
   ——留白會被讀成「我們沒抽到」。譯名走 `L.localName(color, lang)`。
   ⚠️ 控制器裡曾經有一份自己的 `officialName` 複製，第三個色號空間進來時它認不得
   `'none'`、卡片顯示空白。**同一條規則不要有第二份實作。**

3. **兩類 chips 的視覺不可混用**（§5.13）：色系是**分組**（單選、無勾號、自備「全部」那顆），
   產品線是**篩選**（多選、帶勾號、可全部取消）。搜尋時分組 bar 要收起。

4. **EF600 的「色相」chips 是我們算的，不是原廠分類。**
   DB 的 `fd_color_family_idx` 對 EF600 恆為 NULL 且**刻意不填**（兩條推導路都實測失敗，
   見 [`DESIGN.md`](DESIGN.md) §1.1）。分群只活在 lib 的 `hueGroupOf()`，chips 獨立一列
   並前置「非原廠分類」。**不要把它寫進資料、也不要放進卡片的名稱欄**
   ——那個欄位放的是官方色名。

5. **套組的識別是 `key` 不是 `code`。** `code` 只在**產品線內**唯一——四條產品線
   各有一組 `standard-120`。拿 `code` 當識別會把它們當成同一組（症狀：選一個，
   四欄同時亮起）。一律走 `L.setKey(s)`／`L.findSet(sets, id)`；`?set=` 深連結
   給 key，舊的 code 只在全域唯一時才認，撞號時當作沒選。

## 複製件（共用件改版時要回來同步）

| 檔案 | 權威版 |
| --- | --- |
| `materialize-dark.css` | 家族 repo 根 |
| `side-tool.css` / `side-tool.js` | 家族 repo 根 |
| `filter-clear.css` / `filter-clear.js` | 以 `local-reader` 那份為準 |
| `i18n.js` | 家族 repo 根 |
| `color-family.js` | 家族 repo `nodeapp-webapp-family/color-family.js`（§4 A 類權威版，byte-identical）。**色系分群的單一權威規則**；本 app 的 lib 只包一層薄的 `colorFamily()` 把無彩度門檻寫在那裡。⚠️ `<script>` 必須早於用到它的 lib |

`colour-detail.js`／`nearest-panel.js` 是**本 repo 內**的跨頁共用模組（不是家族共用件），
形制與另外三支色彩 app 一致但各自維護。

**本 app 是別人的上游**：`color-palette`／`thangka-trace`／`color-mixer` 借走
`finecolour-color-lib.js` ＋ `data/finecolour-colors.js` 做 `nearestFinecolour`
（`color-mixer` 於 2026-08-07 接上，是第三個消費端）。**改了 lib 或資料就要跑**
`bash scripts/sync-copies.sh`——它同步 InProgress 鏡像與三支消費端（含各自的鏡像），
並以 md5 驗**八份**複製件是不是單一 hash。
**權威版改了、複製點沒跟上，沒有任何東西會報錯。**

## 驗證（不靠肉眼猜）

```bash
npm start   # → http://localhost:3000/apps/finecolour-color/
```

- `/` 302 → `/apps/finecolour-color/`；資產 200；API 404 回 JSON
- 色系 chips 26 顆（全部 ＋ 23 色系 ＋ 彩針筆 ＋ 壓克力筆）、產品線 chips 6 顆且帶勾號
- 選「壓克力筆」才出現色相子列（10 顆：全部 120／紅 16／橙 20／黃 17／綠 17／青 5／藍 18／紫 4／洋紅 11／中性 12），
  前置「非原廠分類」；切到別的分組要收起並歸零
- 明細卡：marker 主名英文＋中文輔助行；**fineliner 主名中文、輔助行隱藏**；
  **acrylic 主名為色號、輔助行寫「原廠不發佈色名」**
- `sets.html` 63 組、434 列；系列列顯示「系列」而非「子系列」
- **選一個套組後只有 1 欄被標成選中**（見下面第 4 條）
- 三語切換、light/dark 切換、**`nearestFinecolour` 預設只比 marker**（壓克力是不透明媒材，混進酒精麥克筆的推薦會誤導）
- 原始碼不得含 NUL 位元組（家族稽核，見 SHARED_LIBRARY_GUIDELINES §6）
