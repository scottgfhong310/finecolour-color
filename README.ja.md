# finecolour-color

> [English](README.md) ｜ [繁體中文](README.zh-Hant.md) ｜ [日本語](README.ja.md)

Finecolour のマーカーとファインライナーの色番号 → CSS 変数の対照。**528 色**を色系と
プロダクトラインで閲覧でき、**43 セットの収録対照表**も備えています。

GitHub Pages とは非互換です（フロントエンドが絶対パスで資産を取得するため、本プロジェクトの
Node サーバーが必要）。

## 機能

- **528 色・2 つの番号体系**：マーカー 480 色（`BV321` のように色系接頭辞＋番号、0–479 は
  ブランド内で一意）とファインライナー 48 色（`02`／`03`、独立した番号体系）。
- **プロダクトライン別の収録**：EF100／EF101／EF102／EF103／EF300 のどの世代に実際に
  収録されているか——フィルターでき、詳細カードにも列挙されます。
- **43 セット**：8 つの専門セットライン（景観園林／室内設計／建築城規／環芸設計／服装設計／
  アニメ／工業デザイン／考研快題）と肌色セットを含みます。
- **公式名を常に主名とする——ただし公式名は英語とは限りません**：マーカーの色譜は英語、
  ファインライナーの色譜は中国語です。各色が `official` 欄を持ち、検証可能な名前を先に、
  訳名は補助行として表示します。
- `var()`／hex／`rgb()`／ユーティリティクラスをワンクリックでコピー、全体を `.css` として書き出し。
- 最も近い色の判定（ΔE00）、三言語（`zh-Hant`／`en`／`ja`）、ライト／ダークテーマ。

## 実行

```bash
npm install
npm start        # http://localhost:3000/apps/finecolour-color/
```

`PORT` でポートを上書きできます。`/` は `/apps/finecolour-color/` へ 302 リダイレクトします。

## ディレクトリ

```
app.js                                   Express エントリ（port 3000、静的配信 ＋ 302）
public/apps/finecolour-color/
  index.html · finecolour-color.css/.js  カラーウォール（構造／スタイル／コントローラ）
  finecolour-color-lib.js                コアライブラリ、DOM に触れない（window.FinecolourColorLib）
  sets.html · sets.css · sets.js         セット収録対照表
  colour-detail.js · nearest-panel.js    両ページ共用
  data/finecolour-colors.js              528 色 ＋ 23 色系 ＋ meta
  data/finecolour-sets.js                43 セット
```

## データ

`data/*.js` は**生成物です。手で編集しないでください**。ファミリーの色データベース
（`db_artcolor`＝System of Record）から書き出され、その上流はメーカー公式サイト
`finecolour.com.cn` が公開する公式リーフレットです。

リーフレット自体が「印刷色は参考であり、実際のインクは試し描きで確認すること」と
明記しているため、**hex は画面上の近似値であり公式仕様ではありません**。
抽出方法と検証は [DESIGN.md](DESIGN.md) を参照してください。

```json
{
  "code": "R140", "num": 140, "official": "en",
  "name": "Bloody Red", "nameZh": "血紅色", "nameJa": "ブラッディレッド",
  "hex": "#e70044", "r": 231, "g": 0, "b": 68,
  "cssVar": "--finecolour-r140", "space": "marker", "family": "R",
  "lines": ["EF100", "EF101", "EF102", "EF103"]
}
```

```json
{ "code": "standard-24", "name": "Standard 24 Colors", "nameZh": "標準-24",
  "line": "EF102", "size": 24, "theme": "standard", "subset": "標準",
  "complete": true, "colors": ["Y3", "YG27", "…"] }
```

## コアライブラリ

```js
FinecolourColorLib.officialName(color)              // 主名（official に従い en か zh）
FinecolourColorLib.localName(color, 'ja')           // 補助行；公式言語のときは ''
FinecolourColorLib.nearestFinecolour({r,g,b}, { n: 5 })          // 既定はマーカーのみ
FinecolourColorLib.nearestFinecolour({r,g,b}, { space: 'fineliner' })
FinecolourColorLib.buildCss(colors, meta)           // :root 変数 ＋ ユーティリティクラス
```

---

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
