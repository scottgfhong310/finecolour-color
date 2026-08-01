# finecolour-color

> [English](README.md) ｜ [繁體中文](README.zh-Hant.md) ｜ [日本語](README.ja.md)

Finecolour marker and fineliner colour codes → CSS variables. **528 colours** browsable by
colour family and by product line, plus a **43-assortment coverage table**.

Not compatible with GitHub Pages: the front end fetches its assets from the site root, so it
needs this project's Node server.

## Features

- **528 colours in two code spaces.** 480 markers (family-prefixed codes such as `BV321`,
  numbered 0–479 and unique brand-wide) and 48 fineliners (`02`, `03`, a separate numbering).
- **Product-line availability.** Which of EF100 / EF101 / EF102 / EF103 / EF300 actually
  carries a colour — filter by it, or read it off the detail card.
- **43 assortments**, including eight professional series (landscape, interior, architecture,
  environmental art, fashion, anime, industrial design, exam sketching) and skin-tone sets.
- **The official name is always the primary one — and it is not always English.** The marker
  chart is in English, the fineliner chart is in Chinese. Each colour carries `official`
  so the app shows the verifiable name first and translations as a secondary line.
- Copy `var()` / hex / `rgb()` / utility class; export the whole palette as a `.css` file.
- Nearest-colour matching (ΔE00), three languages (`zh-Hant` / `en` / `ja`), light & dark.

## Run

```bash
npm install
npm start        # http://localhost:3000/apps/finecolour-color/
```

`PORT` overrides the port. `/` redirects to `/apps/finecolour-color/`.

## Layout

```
app.js                                   Express entry (port 3000, static + 302)
public/apps/finecolour-color/
  index.html · finecolour-color.css/.js  colour wall (structure / style / controller)
  finecolour-color-lib.js                core library, no DOM (window.FinecolourColorLib)
  sets.html · sets.css · sets.js         assortment coverage table
  colour-detail.js · nearest-panel.js    shared across both pages
  data/finecolour-colors.js              528 colours + 23 families + meta
  data/finecolour-sets.js                43 assortments
```

## Data

`data/*.js` are **build artefacts — do not hand-edit.** They are exported from the family
colour database (`db_artcolor`, the System of Record), whose upstream is the official
leaflets published by the manufacturer at `finecolour.com.cn`.

The leaflets state that the printed chart is for reference only and that the actual ink
should be checked by drawing, so **hex values are screen approximations, not an official
specification**. See [DESIGN.md](DESIGN.md) for the extraction and its verification.

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

## Library

```js
FinecolourColorLib.officialName(color)              // primary name (en or zh per `official`)
FinecolourColorLib.localName(color, 'ja')           // secondary line; '' when it is the official one
FinecolourColorLib.nearestFinecolour({r,g,b}, { n: 5 })          // markers only by default
FinecolourColorLib.nearestFinecolour({r,g,b}, { space: 'fineliner' })
FinecolourColorLib.buildCss(colors, meta)           // :root variables + utility classes
```

---

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
