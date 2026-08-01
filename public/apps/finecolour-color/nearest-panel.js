/**
 * nearest-panel — 最接近色側欄（index.html 與 sets.html 兩頁共用）
 *
 * **碰 DOM，所以不進 lib**；但兩頁都要用，所以也不留在任一控制器裡
 * （DESIGN_GUIDELINES §4.1 的第三種：跨頁共用但碰 DOM 的模組，同 colour-detail.js）。
 *
 * 為什麼是側欄不是 Modal：比對是「查一次、逐一讀」的動作——輸入 hex 得到一串候選，
 * 然後要一支一支點開看色號分解、產品線、收錄套組，再回頭比較第二名和第三名。
 * Modal 一次只能站一個，點結果就得把查詢條件關掉。側欄常駐、明細 Modal 疊在它上面開，
 * 關掉明細就回到同一份清單並保留高亮。形制沿用 markdown-reader 的檔案清單側欄，
 * 與 faber-castell-color／caran-dache-color 兩支色彩 registry 逐條對齊。
 *
 * 差異行為（點了結果要做什麼）用 onPick callback 交給呼叫端，模組不判斷「我在哪一頁」。
 *
 * 用法：FinecolourNearest.init({ onPick: function (color) { … } });
 *       側鍵的 click 由各頁控制器綁 → FinecolourNearest.open()
 */
(function (global) {
  'use strict';

  var L = global.FinecolourColorLib;
  var ID = 'nearest-panel';
  var NEAR_N = 12;
  // ΔE 級距的說法（lib 的 deltaEBand 只回代號）；文案與 faber-castell-color／
  // caran-dache-color 的 band.* 逐字相同——三支用同一把尺、同一組級距，讀法也該一樣。
  var BAND_FB = { very: '極接近', close: '接近', noticeable: '可辨差異', far: '差異大' };

  var inst = null, opts = {};

  function t(key, fb) {
    if (!global.I18n || !global.I18n.t) return fb;
    var v = global.I18n.t(key);
    return (v && v !== key) ? v : fb;
  }

  function tp(key, params, fb) {
    if (global.I18n && global.I18n.t) {
      var v = global.I18n.t(key, params);
      if (v && v !== key) return v;
    }
    return fb;
  }

  function colors() { return global.FINECOLOUR_COLORS || []; }

  // 從一段文字裡認出顏色。**認得本 app 自己複製出去的格式**——明細的四顆複製鈕給的是
  // `var(--finecolour-g43)` / `#97b564` / `rgb(151, 181, 100)` / `finecolour-bg-g43`，其中後兩者與 hex
  // 都在這裡吃得下；也認得夾在一整行 CSS 裡的 hex（`--finecolour-g43: #97b564;`）。
  // 認不出來就回 null，由呼叫端說明，**不猜、也不默默套一個顏色**。
  function parseColorText(text) {
    var s = String(text || '').trim();
    if (!s) return null;
    var m = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(s);
    if (m) {
      var v = [+m[1], +m[2], +m[3]];
      if (v.every(function (n) { return n <= 255; })) {
        return '#' + v.map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
      }
    }
    m = /(?:^|[^0-9a-z])#?([0-9a-f]{6})(?![0-9a-z])/i.exec(s);
    if (m) return '#' + m[1].toLowerCase();
    m = /(?:^|[^0-9a-z])#([0-9a-f]{3})(?![0-9a-z])/i.exec(s);   // 三碼一律要 #，否則 358／214 這種數字也會中
    if (m) return '#' + m[1].toLowerCase().split('').map(function (c) { return c + c; }).join('');
    return null;
  }

  function pasteFromClipboard() {
    var fail = function () {
      M.toast({ html: t('toast.pasteFail', '無法讀取剪貼簿（瀏覽器未授權）'), classes: 'red' });
    };
    if (!navigator.clipboard || !navigator.clipboard.readText) return fail();
    navigator.clipboard.readText().then(function (txt) {
      var hex = parseColorText(txt);
      if (!hex) {
        M.toast({ html: t('toast.pasteNoColor', '剪貼簿裡沒有可辨識的顏色'), classes: 'orange' });
        return;
      }
      document.getElementById('nearest-hex').value = hex;
      document.getElementById('nearest-input').value = hex;
      render();
      M.toast({ html: tp('toast.pasted', { v: hex }, '已貼上：' + hex), displayLength: 1400 });
    }).catch(fail);
  }

  var MARKUP =
    '<li><a class="subheader"><i class="material-icons">colorize</i>' +
      '<span data-i18n="nearest.title">找最接近的 Finecolour 色</span></a></li>' +
    '<li><div class="divider"></div></li>' +
    '<li>' +
      '<div class="nearest-form">' +
        '<input id="nearest-input" type="color" value="#0078be" />' +
        '<input id="nearest-hex" type="text" value="#0078be" spellcheck="false" autocomplete="off" ' +
               'data-i18n-placeholder="nearest.placeholder" placeholder="#RRGGBB" />' +
        '<button id="nearest-paste" class="nearest-paste" type="button" ' +
                'data-i18n-title="nearest.paste" title="從剪貼簿貼上">' +
          '<i class="material-icons">content_paste</i></button>' +
        '<select id="nearest-line" class="browser-default"></select>' +
      '</div>' +
      '<div class="nearest-hint" data-i18n="nearest.hint"></div>' +
    '</li>' +
    '<li><div class="divider"></div></li>' +
    '<div id="nearest-result" class="nearest-result"></div>';

  function fillLines() {
    var $line = document.getElementById('nearest-line');
    if (!$line) return;
    var keep = $line.value;
    var meta = global.FINECOLOUR_META || {};
    $line.innerHTML = '';
    var all = document.createElement('option');
    all.value = '';
    all.textContent = t('nearest.allLines', '全部 358 色（Sketch / Finecolour Ink）');
    $line.appendChild(all);
    (meta.lines || []).forEach(function (l) {
      if (l.id === 'sketch' || l.id === 'ink') return;    // 這兩條就是全色域
      var o = document.createElement('option');
      o.value = l.id;
      o.textContent = l.name + '（' + l.count + '）';
      $line.appendChild(o);
    });
    $line.value = keep;                                   // 換語言重建選項時保住當下選擇
  }

  function itemNode(m, c) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'near-item';
    el.innerHTML =
      '<span class="near-sw"></span>' +
      '<span class="near-meta">' +
        '<span class="near-name"></span>' +
        '<span class="near-sub"><span class="near-hex"></span>' +
        '<span class="near-de band-' + m.band + '"></span></span>' +
      '</span>';
    // 色塊字色由對比算出、寫在色塊自己身上（文字直接放在它裡面，不再包一層 span，
    // 免得 Materialize 的 span 色規則把它蓋掉——.cp-cell 踩過那顆）
    var sw = el.querySelector('.near-sw');
    sw.style.background = m.hex;
    sw.style.color = L.pickTextColor(c);
    sw.textContent = m.code;
    el.querySelector('.near-name').textContent = m.name || '';
    el.querySelector('.near-hex').textContent = m.hex;
    el.querySelector('.near-de').textContent =
      'ΔE ' + m.deltaE.toFixed(2) + ' · ' + t('band.' + m.band, BAND_FB[m.band]);
    el.addEventListener('click', function () {
      // 側欄不關：明細看完退回來還在同一份結果上
      var $out = document.getElementById('nearest-result');
      var prev = $out.querySelector('.near-item.active');
      if (prev) prev.classList.remove('active');
      el.classList.add('active');
      if (opts.onPick) opts.onPick(c);
    });
    return el;
  }

  function render() {
    var $out = document.getElementById('nearest-result');
    if (!$out) return;
    var rgb = L.hexToRgb(document.getElementById('nearest-hex').value);
    if (isNaN(rgb.r)) return;
    var line = document.getElementById('nearest-line').value;
    var res = L.nearestFinecolour(rgb, { n: NEAR_N, line: line || undefined, colors: colors() });
    $out.innerHTML = '';
    res.forEach(function (m) {
      var c = colors().filter(function (x) { return x.code === m.code; })[0];
      $out.appendChild(itemNode(m, c));
    });
  }

  function ensure() {
    if (document.getElementById(ID)) return;
    var el = document.createElement('ul');
    el.id = ID;
    el.className = 'sidenav nearest-panel';
    el.style.width = '360px';
    el.innerHTML = MARKUP;
    document.body.appendChild(el);

    inst = M.Sidenav.init(el, {
      edge: 'right',
      // 側欄開啟時把整排側鍵淡出（共用 side-tool.css 的 body.sidenav-open）
      onOpenStart: function () { document.body.classList.add('sidenav-open'); },
      onCloseEnd: function () { document.body.classList.remove('sidenav-open'); }
    });

    var $pick = document.getElementById('nearest-input');
    var $hex = document.getElementById('nearest-hex');
    $pick.addEventListener('input', function () { $hex.value = $pick.value; render(); });
    $hex.addEventListener('input', function () {
      if (/^#[0-9a-fA-F]{6}$/.test($hex.value)) { $pick.value = $hex.value.toLowerCase(); render(); }
    });
    document.getElementById('nearest-line').addEventListener('change', render);
    document.getElementById('nearest-paste').addEventListener('click', pasteFromClipboard);

    if (global.I18n && global.I18n.apply) global.I18n.apply(el);
  }

  function init(o) {
    opts = o || {};
    ensure();
    fillLines();
    render();
  }

  function open() {
    ensure();
    render();
    inst.open();
  }

  // 切語言時重建（產品線選項、提示、分級標示）；側欄常駐，可能正開著
  function refresh() {
    var el = document.getElementById(ID);
    if (!el) return;
    if (global.I18n && global.I18n.apply) global.I18n.apply(el);
    fillLines();
    render();
  }

  global.FinecolourNearest = { init: init, open: open, refresh: refresh };
})(window);
