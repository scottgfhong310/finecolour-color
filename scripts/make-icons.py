#!/usr/bin/env python3
"""make-icons — 由母版參數產出整套 icon（SVG / PNG / .ico / manifest）。

icon 的概念：**三乘三色票矩陣**——把「依色系瀏覽的色票牆」縮成一枚標記。
三欄＝三個色系（RV 紅紫／YG 黃綠／B 藍），三列＝由淺到深。
Finecolour 的色號**不可分解**（號碼是全域唯一的流水號，不像 COPIC 能拆成兩個軸），
所以這裡的三列是我們挑的明度梯度，不是品牌自己的編號軸——註解寫清楚免得被當成後者。
與家族其他色彩 app 清楚區隔（faber-castell-color＝橫向色帶的平面色卡、
caran-dache-color＝色卡扇、thangka-trace＝三欄對照）。
**刻意不用 Finecolour 的品牌 logo**——避免冒用商標，標記只描述資料的形狀。

**九格全部是真實 Finecolour 色，且由 `data/finecolour-colors.js` 現查**（不寫死 hex）：
資料換了 icon 就跟著換，也讓「這九格是真的」變成可驗證的，而不是註解裡的宣稱。
色號找不到會直接拋錯——**寧可產不出來，不要默默配一個假顏色**。

⚠️ PyMuPDF 的兩個限制（faber-castell-color / thangka-trace 也踩過）：
  ① **不渲染 linearGradient**，會整片退成黑色 → 母版一律純色底。
  ② **以 SVG 宣告的 width/height 為渲染基準、不是 viewBox** → 倍率要用
     「目標 ÷ 實際 page 寬」反推，寫死 size/100 會得到完全錯誤的尺寸。

用法：python3 scripts/make-icons.py
"""
import json
import os
import re
import fitz
from PIL import Image

APP = os.path.join(os.path.dirname(__file__), '..', 'public', 'apps', 'finecolour-color')
OUT = os.path.join(APP, 'icons')
DATA = os.path.join(APP, 'data', 'finecolour-colors.js')

# 三欄＝色系、三列＝Intensity（淺 → 深）。只寫色號，hex 由資料現查。
CODES = [['RV216', 'YG13', 'B239'],
         ['RV202', 'YG27', 'B241'],
         ['RV139', 'YG37', 'B237']]

DARK_TILE = '#151a24'
DARK_EDGE = '#10131a'
LIGHT_TILE = '#f6f8fa'
LIGHT_EDGE = '#ffffff'


def hexes():
    """由 data/finecolour-colors.js 取九格的 hex；缺任何一個就拋錯。"""
    src = open(DATA, encoding='utf-8').read()
    out = []
    for row in CODES:
        r = []
        for code in row:
            m = re.search(r'\{"code":"%s",[^}]*?"hex":"(#[0-9a-fA-F]{6})"' % re.escape(code), src)
            if not m:
                raise SystemExit(f'資料裡找不到色號 {code} —— icon 不產出（不編造顏色）')
            r.append(m.group(1))
        out.append(r)
    return out


def grid(xs, ys, w, h, rx, stroke, sw, fills):
    """九格色票；列優先排列，與 CODES 的讀法一致。"""
    cells = ''.join(
        f'<rect x="{xs[c]}" y="{ys[r]}" width="{w}" height="{h}" rx="{rx}" fill="{fills[r][c]}"/>'
        for r in range(3) for c in range(3))
    return f'<g stroke="{stroke}" stroke-width="{sw}">{cells}</g>'


def tile(size, inner, bg, hairline=False):
    # 淺色 tile 加一圈髮絲邊，否則在白底頁籤上整塊消失
    hl = ('<rect x="0.6" y="0.6" width="98.8" height="98.8" rx="22" fill="none" '
          'stroke="#d4dae2" stroke-width="1.2"/>') if hairline else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" '
            f'width="{size}" height="{size}">'
            f'<rect width="100" height="100" rx="22.5" fill="{bg}"/>{hl}{inner}</svg>')


def build_svgs(fills):
    m_d = grid((16, 40, 64), (21, 42, 63), 20, 16, 3.5, DARK_EDGE, 1.4, fills)
    m_l = grid((16, 40, 64), (21, 42, 63), 20, 16, 3.5, LIGHT_EDGE, 1.4, fills)
    # favicon：格子刻意放大（26×22 vs 母版 20×16），否則 16px 糊成一塊
    f_d = grid((7, 37, 67), (12, 39, 66), 26, 22, 4.5, DARK_EDGE, 2, fills)
    f_l = grid((7, 37, 67), (12, 39, 66), 26, 22, 4.5, LIGHT_EDGE, 2, fills)
    files = {
        'finecolour-color-icon.svg':       tile(512, m_d, DARK_TILE),
        'finecolour-color-icon-light.svg': tile(512, m_l, LIGHT_TILE, True),
        'favicon.svg':                tile(64, f_d, DARK_TILE),
        'favicon-light.svg':          tile(64, f_l, LIGHT_TILE, True),
    }
    for name, svg in files.items():
        open(os.path.join(OUT, name), 'w').write(svg)
    return list(files)


def build_pngs():
    src = {16: 'favicon.svg', 32: 'favicon.svg', 48: 'favicon.svg'}
    for s in (64, 128, 180, 192, 256, 512):
        src[s] = 'finecolour-color-icon.svg'
    for size, f in sorted(src.items()):
        page = fitz.open(os.path.join(OUT, f))[0]
        z = size / page.rect.width          # ⚠️ 由實際 page 寬反推，不可寫死 size/100
        pm = page.get_pixmap(alpha=True, matrix=fitz.Matrix(z, z))
        assert pm.width == size == pm.height, f'{size} → {pm.width}x{pm.height}'
        pm.save(os.path.join(OUT, f'icon-{size}.png'))
    Image.open(os.path.join(OUT, 'icon-48.png')).convert('RGBA').save(
        os.path.join(OUT, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])


def build_manifest():
    m = {
        "name": "finecolour-color",
        "short_name": "Finecolour colour",
        "description": "Finecolour colour code → CSS reference, browsed along the "
                       "Finecolour Color System's three axes.",
        "start_url": "/apps/finecolour-color/",
        "scope": "/apps/finecolour-color/",
        "display": "standalone",
        "background_color": "#0f1115",
        "theme_color": "#0f1115",
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    open(os.path.join(OUT, 'manifest.json'), 'w').write(
        json.dumps(m, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    fills = hexes()
    for row, f in zip(CODES, fills):
        print('  ', '  '.join(f'{c} {h}' for c, h in zip(row, f)))
    print('SVG 母版 :', ', '.join(build_svgs(fills)))
    build_pngs()
    build_manifest()
    print('產出       :', len(os.listdir(OUT)), '個檔於 icons/')
