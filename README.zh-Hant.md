# finecolour-color

> [English](README.md) ｜ [繁體中文](README.zh-Hant.md) ｜ [日本語](README.ja.md)

Finecolour（法卡勒）麥克筆與彩針筆的色號 → CSS 變數對照。**528 色**可依色系與產品線瀏覽，
另有 **43 組套裝的收錄對照表**。

不相容 GitHub Pages：前端以絕對路徑取資產，需由本專案的 Node 伺服器供應。

## 功能

- **528 色、兩個色號空間**：麥克筆 480 色（色系字首＋號碼，如 `BV321`；號碼 0–479 品牌內唯一）
  與彩針筆 48 色（`02`、`03`，獨立編號）。
- **產品線可得性**：EF100／EF101／EF102／EF103／EF300 哪幾代實際有出這支色——可篩選，
  明細卡也逐條列出。
- **43 組套裝**，含八條專業套裝線（景觀園林／室內設計／建築城規／環藝設計／服裝設計／
  動漫設計／工業設計／考研快題）與膚色套裝。
- **官方名恆為主名——而官方名不一定是英文**：麥克筆色譜是英文的、彩針筆色譜是中文的。
  每支色帶 `official` 欄，app 先顯示可查證的那個名字，譯名只作輔助行。
- 一鍵複製 `var()`／hex／`rgb()`／utility class，或整份匯出成 `.css`。
- 最接近色比對（ΔE00）、三語（`zh-Hant`／`en`／`ja`）、light／dark 主題。

## 執行

```bash
npm install
npm start        # http://localhost:3000/apps/finecolour-color/
```

`PORT` 可覆寫連接埠；`/` 會 302 轉到 `/apps/finecolour-color/`。

## 目錄

```
app.js                                   Express 入口（port 3000、靜態檔 ＋ 302）
public/apps/finecolour-color/
  index.html · finecolour-color.css/.js  色彩牆（結構／樣式／控制器）
  finecolour-color-lib.js                核心 library，不碰 DOM（window.FinecolourColorLib）
  sets.html · sets.css · sets.js         套組收錄對照
  colour-detail.js · nearest-panel.js    兩頁共用
  data/finecolour-colors.js              528 色 ＋ 23 色系 ＋ meta
  data/finecolour-sets.js                43 組套裝
```

## 資料

`data/*.js` 是**生成物，不要手改**。它由家族色彩資料庫（`db_artcolor`，System of Record）
匯出，上游是製造商官網 `finecolour.com.cn` 的官方宣傳單。

圖上自述「本色譜顏色僅供參考，馬克筆準確顏色請以實際畫線為準」，所以
**hex 是螢幕近似值、不是官方規格**。抽取方法與驗收見 [DESIGN.md](DESIGN.md)。

```json
{
  "code": "R140", "num": 140, "official": "en",
  "name": "Bloody Red", "nameZh": "血紅色", "nameJa": "ブラッディレッド",
  "hex": "#e70044", "r": 231, "g": 0, "b": 68,
  "cssVar": "--finecolour-r140", "space": "marker", "family": "R",
  "lines": ["EF100", "EF101", "EF102", "EF103"]
}
```

## 核心 library

```js
FinecolourColorLib.officialName(color)              // 主名（依 official 取 en 或 zh）
FinecolourColorLib.localName(color, 'ja')           // 輔助行；語言即官方語言時回 ''
FinecolourColorLib.nearestFinecolour({r,g,b}, { n: 5 })          // 預設只比麥克筆
FinecolourColorLib.nearestFinecolour({r,g,b}, { space: 'fineliner' })
FinecolourColorLib.buildCss(colors, meta)           // :root 變數 ＋ utility classes
```

---

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
