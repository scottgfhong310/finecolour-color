/**
 * colour-detail — 色票明細 Modal（index.html 與 sets.html 兩頁共用）
 *
 * **碰 DOM，所以不進 lib**；但兩頁都要用，所以也不留在任一控制器裡
 * （DESIGN_GUIDELINES §4.1 的第三種：跨頁共用但碰 DOM 的模組）。
 *
 * **形制與 faber-castell-color／caran-dache-color 的明細逐條對齊**——同一組 class
 * （`.detail-head` 色帶頭 → `.d-name`／`.d-note` → `.copy-row` → 若干 `.d-section`）、
 * 同一份 CSS 數值。三支色彩 registry 打開明細看到的應是同一張卡，只有內容不同：
 * FC 是耐光度＋套組、CDA 是事實表＋跨系列色帶、本支是色號分解＋產品線＋套組。
 * 差異行為（點了套組要做什麼）用 callback 交給呼叫端，模組不判斷「我在哪一頁」。
 *
 * 用法：FinecolourDetail.open(color, { sets, onSetClick })
 */
(function (global) {
  'use strict';

  var L = global.FinecolourColorLib;
  var ID = 'cp-detail-modal';
  var COPY_FORMATS = ['var', 'hex', 'rgb', 'class'];   // 順序同 FC／CDA
  var inst = null, current = null, currentOpts = null;

  function t(key, fallback) {
    if (!global.I18n || !global.I18n.t) return fallback;
    var v = global.I18n.t(key);
    return (v && v !== key) ? v : fallback;
  }


  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var MARKUP =
    '<div class="modal-content">' +
      '<div id="d-head" class="detail-head">' +
        '<span id="d-code" class="d-code"></span>' +
        '<span id="d-tag" class="d-tag"></span>' +
      '</div>' +
      '<div class="detail-body">' +
        '<div id="d-name" class="d-name"></div>' +
        '<div id="d-name-loc" class="d-name-loc"></div>' +
        '<div id="d-note" class="d-note"></div>' +
        '<div id="d-copy" class="copy-row"></div>' +
        '<div class="d-section">' +
          '<h6 data-i18n="detail.parse">色號分解</h6>' +
          '<div id="d-parse"></div>' +
        '</div>' +
        '<div class="d-section">' +
          '<h6 data-i18n="detail.lines">產品線</h6>' +
          '<div id="d-lines" class="line-badges"></div>' +
        '</div>' +
        '<div class="d-section">' +
          '<h6 data-i18n="detail.sets">收錄於套組</h6>' +
          '<div id="d-sets"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
      '<a href="#!" class="modal-close waves-effect btn-flat" data-i18n="detail.close">關閉</a>' +
    '</div>';


  function ensure() {
    if (document.getElementById(ID)) return;
    var el = document.createElement('div');
    el.id = ID;
    el.className = 'modal detail-modal';
    el.innerHTML = MARKUP;
    document.body.appendChild(el);
    inst = M.Modal.init(el, { preventScrolling: false });
    if (global.I18n && global.I18n.apply) global.I18n.apply(el);
  }

  // 非 HTTPS/localhost 沒有 navigator.clipboard，退回 execCommand（同 FC 的做法）
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('execCommand'));
      } catch (e) { reject(e); }
    });
  }

  function copyBtn(color, fmt) {
    var v = L.copyValue(color, fmt);
    var b = document.createElement('button');
    b.className = 'copy-btn';
    b.type = 'button';
    b.innerHTML = '<i class="material-icons">content_copy</i>' + esc(v);
    b.addEventListener('click', function () {
      copyText(v).then(function () {
        b.classList.add('copied');
        setTimeout(function () { b.classList.remove('copied'); }, 1200);
        M.toast({ html: t('toast.copied', '已複製') + '：' + esc(v), displayLength: 1400 });
      }).catch(function () {
        M.toast({ html: t('toast.copyFail', '複製失敗（需 localhost 或 HTTPS）'), classes: 'red' });
      });
    });
    return b;
  }

  function factRow(k, v) {
    return '<tr><td class="fk">' + esc(k) + '</td><td class="fv">' + esc(v) + '</td></tr>';
  }

  function open(color, opts) {
    opts = opts || {};
    ensure();
    current = color; currentOpts = opts;
    // 標題（h6／關閉）帶 data-i18n，切語言時要重跑；色名是資料不翻譯，註記與說明才會變
    if (global.I18n && global.I18n.apply) global.I18n.apply(document.getElementById(ID));

    // 色帶頭：整條就是這個顏色（同 FC／CDA），字色由對比算出。
    var head = document.getElementById('d-head');
    head.style.background = color.hex;
    head.style.color = L.pickTextColor(color);
    document.getElementById('d-code').textContent = color.code;

    var fam = (global.FINECOLOUR_FAMILIES || []).filter(function (f) { return f.code === color.family; })[0];
    document.getElementById('d-tag').textContent =
      fam ? fam.code + ' ' + fam.name : t('group.fineliner', '彩針筆');
    // 主名恆為**官方名**——它是跟賣家溝通、可查證的識別憑據。哪個語言是官方的
    // 因色號空間而異（marker 的色譜是英文、fineliner 的是中文），故一律走 lib 的
    // officialName()，不可直接讀 .name：那會讓 fineliner 顯示成譯名。
    document.getElementById('d-name').textContent = L.officialName(color);
    // 譯名只作輔助行；語言就是官方語言時不重複顯示，沒有譯名時整行隱藏
    // ——缺席是狀態不是錯誤。形制同 caran-dache-color。
    var loc = L.localName(color, (global.I18n && global.I18n.lang) || 'zh-Hant');
    var locEl = document.getElementById('d-name-loc');
    locEl.textContent = loc; locEl.style.display = loc ? '' : 'none';
    document.getElementById('d-note').textContent =
      t('note.approx', 'hex 取自製造商官方宣傳單、為螢幕近似值；圖上自述印刷色僅供參考，請以實際畫線為準');

    var cp = document.getElementById('d-copy');
    cp.innerHTML = '';
    COPY_FORMATS.forEach(function (fmt) { cp.appendChild(copyBtn(color, fmt)); });

    // 事實表：色系、號碼、色號空間。Finecolour 的色碼**不可再分解**
    // （不像 COPIC 的 BV02 能拆成兩個軸），所以這裡列的是身分欄位而非座標。
    var parse = document.getElementById('d-parse');
    if (color.space === 'fineliner') {
      parse.innerHTML = '<table class="facts-table"><tbody>' +
        factRow(t('detail.space', '色號空間'), t('space.fineliner', '彩針筆 EF300（獨立編號）')) +
        factRow(t('detail.num', '號碼'), color.num) +
        '</tbody></table>' +
        '<div class="d-empty">' + esc(t('detail.noFamily',
          '彩針筆不屬於麥克筆的色系分群，且官方只發佈中文色名')) + '</div>';
    } else {
      parse.innerHTML = '<table class="facts-table"><tbody>' +
        factRow(t('detail.family', '色系'), (fam ? fam.code + ' · ' + fam.name : color.family)) +
        factRow(t('detail.num', '號碼'), color.num) +
        factRow(t('detail.space', '色號空間'), t('space.marker', '麥克筆（0–479 全域唯一）')) +
        '</tbody></table>';
    }

    var ln = document.getElementById('d-lines');
    ln.innerHTML = '';
    ((global.FINECOLOUR_META && global.FINECOLOUR_META.lines) || []).forEach(function (line) {
      var on = (color.lines || []).indexOf(line.id) >= 0;
      var b = document.createElement('span');
      b.className = 'line-badge' + (on ? ' on' : '');
      b.textContent = line.name + (on ? ' ✓' : ' —');
      ln.appendChild(b);
    });

    // 套組依產品線分行（同 FC 的「一條產品線一行、尺寸是可點的連結」）。
    // 套組名本身已含產品線前綴（"Finecolour Sketch 72 Colors Set B"），行首既然寫了就把它去掉。
    var box = document.getElementById('d-sets');
    box.innerHTML = '';
    var mine = L.setsOfColor(opts.sets || global.FINECOLOUR_SETS || [], color.code);
    if (!mine.length) {
      box.innerHTML = '<div class="d-empty">' + esc(t('detail.noSet', '不在任何已收錄的套組裡')) + '</div>';
    } else {
      var lines = (global.FINECOLOUR_META && global.FINECOLOUR_META.lines) || [];
      lines.forEach(function (line) {
        var ofLine = mine.filter(function (s) { return s.line === line.id; });
        if (!ofLine.length) return;
        var row = document.createElement('div');
        row.className = 'set-line';
        var nm = document.createElement('span');
        nm.className = 'line-name';
        nm.textContent = line.name + '：';
        row.appendChild(nm);
        ofLine.forEach(function (s, i) {
          if (i) row.appendChild(document.createTextNode(' · '));
          var a = document.createElement('button');
          a.type = 'button';
          a.className = 'set-link';
          var label = s.name.indexOf(line.name) === 0 ? s.name.slice(line.name.length).trim() : s.name;
          a.textContent = label + (s.complete ? '' : ' *');
          a.title = s.complete ? s.name : s.name + ' — ' + (s.note || '');
          a.addEventListener('click', function () {
            if (opts.onSetClick) opts.onSetClick(s);
          });
          row.appendChild(a);
        });
        box.appendChild(row);
      });
    }

    inst.open();
  }

  // 切語言時若明細開著就重繪（同 FCDetail.refresh 的做法）
  function refresh() {
    if (current && inst && inst.isOpen) open(current, currentOpts);
  }

  global.FinecolourDetail = { open: open, refresh: refresh };
})(window);
