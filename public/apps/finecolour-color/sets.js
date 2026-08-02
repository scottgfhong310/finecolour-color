/**
 * sets — 套組收錄對照（第二頁的控制器）
 *
 * 這一頁只回答一個問題：**選一個套組，其他套組涵蓋了它幾成？**
 * 版面沿用 faber-castell-color/sets.html（家族第一支雙頁 app 收斂出來的）：
 * 固定 Header（標題＋切換＋目前基準組）→ 一張表 → 頁尾說明；不包捲動外框，
 * 表頭各列自己 sticky 在 Header 底下。
 *
 * 表頭五列對應**官方型錄自己的分層**（來源：FinecolourAssortmentSort.xlsx Sheet2 的構想）：
 *   產品線 → 子系列（subset）→ 序號（subsetIndex）→ 尺寸（size）→ 相對基準組還缺幾色
 * 前四列是資料欄位（`subset`／`subsetIndex` 自 db_artcolor 匯出，**不在前端推導字串**），
 * 第五列只有選了基準組才出現。
 *
 * 產品線切換取代了原本的兩個下拉選單：點一條線＝只留那一段（再點一次回到三線並排）；
 * 基準組改成**點欄位的尺寸**選（同 FC），所以「基準套組」那個 select 不再需要。
 */
(function () {
  'use strict';

  var L = window.FinecolourColorLib;
  var COLORS = window.FINECOLOUR_COLORS || [];
  var SETS = window.FINECOLOUR_SETS || [];
  var META = window.FINECOLOUR_META || {};
  var LS_LINE = 'finecolour-color-sets-line';
  var LS_PICK = 'finecolour-color-sets-pick';

  var byCode = {};
  COLORS.forEach(function (c) { byCode[c.code] = c; });

  var $tabs = document.getElementById('line-tabs');
  var $picked = document.getElementById('picked');
  var $matrix = document.getElementById('matrix');
  var $foot = document.getElementById('matrix-foot');

  // 只列真正有套組的產品線（ink 是補充墨水、沒有套組，列出來會是一顆點不動的鍵）
  var LINES = (META.lines || []).filter(function (l) {
    return SETS.some(function (s) { return s.line === l.id; });
  });

  var line = null;      // null ＝ 三線並排；否則只留該產品線
  var pick = null;      // 基準套組的 code，null ＝ 未選

  function t(key, fb, params) {
    if (!window.I18n || !I18n.t) return fb;
    var v = I18n.t(key, params);
    return (v && v !== key) ? v : fb;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lineName(id) {
    var l = (META.lines || []).filter(function (x) { return x.id === id; })[0];
    return l ? l.name : id;
  }
  function visibleSets() {
    return line ? SETS.filter(function (s) { return s.line === line; }) : SETS.slice();
  }
  // 一律以 key 識別（見 lib 的 setKey）——`code` 只在產品線內唯一。
  function K(s) { return L.setKey(s); }
  function setByCode(id) { return L.findSet(SETS, id); }

  // ---- 固定 Header --------------------------------------------------------

  function renderTabs() {
    $tabs.innerHTML = LINES.map(function (l) {
      var n = SETS.filter(function (s) { return s.line === l.id; }).length;
      return '<button class="line-tab' + (l.id === line ? ' is-on' : '') + '" data-line="' + esc(l.id) + '">' +
        esc(l.name) +
        '<span class="line-n">' + t('sets.tabN', '{n} 組', { n: n }).replace('{n}', n) + '</span>' +
        '</button>';
    }).join('');
  }

  function renderPicked() {
    var s = pick && setByCode(pick);
    if (!s || (line && s.line !== line)) {
      $picked.innerHTML = '<span class="picked-hint">' +
        esc(t('sets.pickHint', '點欄位下方的尺寸，就只留下該套組的色')) + '</span>';
      return;
    }
    $picked.innerHTML =
      '<span class="picked-chip">' +
        '<span class="picked-name">' + esc(s.name) + (s.complete ? '' : ' ＊') + '</span>' +
        '<span class="picked-n">' + esc(t('sets.showingN', '{n} 色', { n: s.colors.length })
          .replace('{n}', s.colors.length)) + '</span>' +
        '<button class="picked-clear" id="picked-clear" title="' + esc(t('sets.clear', '清除選擇')) + '">' +
          '<i class="material-icons">close</i></button>' +
      '</span>';
  }

  // ---- 表頭：把「同一段連續欄」併成一格 ------------------------------------
  // 兩層分組（產品線、子系列）都是這個動作，故抽成一支：keyOf 決定「什麼算同一段」。
  function spans(cols, keyOf) {
    var out = [], i = 0;
    while (i < cols.length) {
      var k = keyOf(cols[i]), n = 0;
      while (i + n < cols.length && keyOf(cols[i + n]) === k) n++;
      out.push({ key: k, span: n, first: i });
      i += n;
    }
    return out;
  }

  function headHtml(cols, gaps) {
    var rowspanLabel = function (key, fb) {
      return '<th class="c-color r-label">' + esc(t(key, fb)) + '</th>';
    };
    // 第 1 列：產品線
    var h1 = spans(cols, function (s) { return s.line; }).map(function (g) {
      return '<th class="c-line" colspan="' + g.span + '">' +
        '<span>' + esc(lineName(g.key)) + '</span></th>';
    }).join('');
    // 第 2 列：子系列（subset）——直排，因為名字比欄寬長得多
    var h2 = spans(cols, function (s) { return s.line + '|' + (s.subset || s.name); }).map(function (g) {
      var label = cols[g.first].subset || cols[g.first].name;
      return '<th class="c-subset" colspan="' + g.span + '" title="' + esc(label) + '">' +
        '<span class="vtext">' + esc(label) + '</span></th>';
    }).join('');
    // 第 3 列：子系列內的序號。
    // ⚠️ 值不一定是短碼——'with the book' 這種會在 30px 欄寬裡折成三行、把整列撐高，
    // 而下一列的 sticky top 是用**宣告高度**累加的，撐高就會疊上來。故包一層 span 以
    // nowrap ＋ ellipsis 鎖成一行，全文放 title（套組全名在尺寸格的 title 裡也看得到）。
    var h3 = cols.map(function (s) {
      var v = s.subsetIndex || '－';
      return '<th class="c-sidx"><span title="' + esc(v) + '">' + esc(v) + '</span></th>';
    }).join('');
    // 第 4 列：尺寸（點它＝選為基準組）
    var h4 = cols.map(function (s, ci) {
      return '<th class="c-size' + (K(s) === pick ? ' is-picked' : '') + '" data-col="' + ci + '"' +
        ' title="' + esc(s.name + (s.complete ? '' : ' ＊')) + '">' + s.size + '</th>';
    }).join('');
    // 第 5 列：相對基準組還缺幾色（只有選了基準組才出現）
    var h5 = '';
    if (gaps) {
      h5 = '<tr class="r-gap">' + rowspanLabel('sets.gapRow', '相對基準組還缺幾色') +
        cols.map(function (s) {
          var g = gaps[K(s)];
          var cls = K(s) === pick ? ' is-picked' : (g === 0 ? ' is-full' : '');
          return '<td class="c-gap' + cls + '" title="' + esc(K(s) === pick
            ? t('sets.gapSelf', '基準組本身')
            : t('sets.gapTip', '相對基準組，這一欄還缺 {n} 色', { n: g }).replace('{n}', g)) + '">' +
            (K(s) === pick ? '—' : (g === 0 ? '0' : '−' + g)) + '</td>';
        }).join('') + '</tr>';
    }
    return '<thead>' +
      '<tr class="r-line">' + rowspanLabel('sets.rowLine', '產品線') + h1 + '</tr>' +
      // 序號列只在真的有序號時才出現：Finecolour 的系列不編號，整列留著只會是一排「－」
      '<tr class="r-subset">' + rowspanLabel('sets.rowSubset', '系列') + h2 + '</tr>' +
      (cols.some(function (x) { return x.subsetIndex; })
        ? '<tr class="r-sidx">' + rowspanLabel('sets.rowIndex', '序號') + h3 + '</tr>' : '') +
      '<tr class="r-size">' + rowspanLabel('sets.colColour', '色') + h4 + '</tr>' +
      h5 + '</thead>';
  }

  // ---- 內容 ---------------------------------------------------------------
  // 列＝色。未選基準組時列出「可見套組收錄過的所有色」（依色號正序）；
  // 選了基準組就把不在它裡面的列藏起來（同 FC：藏而不重建，捲動位置與 DOM 都穩定）。
  function bodyHtml(cols, rows) {
    return '<tbody>' + rows.map(function (r) {
      var c = byCode[r.code];
      var hidden = pick && !r.cells[pick];
      var fg = c ? L.pickTextColor(c) : 'inherit';
      var cells = cols.map(function (s) {
        var on = r.cells[K(s)];
        return '<td class="cell' + (on ? ' is-in' : '') + (K(s) === pick ? ' is-pickedcell' : '') + '">' +
          (on ? '<span class="dot"></span>' : '') + '</td>';
      }).join('');
      return '<tr data-code="' + esc(r.code) + '"' + (hidden ? ' class="is-hidden"' : '') + '>' +
        '<th class="c-color"><span class="ccell">' +
          '<span class="mini" style="background:' + esc(c ? c.hex : 'transparent') + ';color:' + fg + '">' +
            esc(r.code) + '</span>' +
          // 官方名恆為主名——哪個語言是官方的因色號空間而異（marker 英文／fineliner 中文），
          // 故走 lib 的 officialName()，不可直接讀 .name（見 DESIGN_GUIDELINES §6.2）。
          '<span class="cname" title="' + esc(L.officialName(c)) + '">' +
            esc(L.officialName(c)) + '</span>' +
        '</span></th>' + cells + '</tr>';
    }).join('') + '</tbody>';
  }

  // 列一律是「可見套組收錄過的所有色」，並用 lib 的正規色號序（與 index.html 同一把尺）。
  // ⚠️ 不能拿 FINECOLOUR_COLORS 的陣列順序當色號序——那是 tb_color.fd_sort 的順序，實查首筆是 YG23。
  // 選了基準組只是把不在它裡面的列**藏起來**（不重建、不重排），所以選/取消時版面不會跳。
  function rowCodes(cols) {
    var seen = {};
    cols.forEach(function (s) { (s.colors || []).forEach(function (code) { seen[code] = 1; }); });
    var list = COLORS.filter(function (c) { return seen[c.code]; });
    return L.sortColors(list, 'code', window.FINECOLOUR_FAMILIES || []).map(function (c) { return c.code; });
  }

  function render() {
    var cols = visibleSets();
    if (pick && !cols.some(function (s) { return K(s) === pick; })) pick = null;  // 切線後基準組不在表上

    var codes = rowCodes(cols);
    var rows = L.assortmentMatrix(SETS, pick, { codes: codes });
    var gaps = pick ? L.columnGaps(SETS, pick) : null;

    $matrix.innerHTML = '<table class="assort' + (gaps ? ' has-gap' : '') + '">' +
      headHtml(cols, gaps) + bodyHtml(cols, rows) + '</table>';
    $matrix.dataset.line = line || 'all';

    renderTabs();
    renderPicked();
    $foot.textContent = t('sets.foot',
      '點欄位的尺寸＝只留下該套組收錄的色（再點一次取消）；點左欄的色號開明細。上方切換產品線＝只留那一段。');
    syncHeadHeight();
  }

  // 固定 Header 的高度餵給表頭：thead 要黏在 Header 底下、不是視窗頂端。
  // 高度隨語言／換行變動，所以量出來寫進 CSS 變數，不寫死（同 FC）。
  function syncHeadHeight() {
    var h = document.getElementById('page-head');
    document.documentElement.style.setProperty('--head-h', (h ? h.offsetHeight : 0) + 'px');
  }

  function setLine(id) {
    line = (line === id) ? null : id;          // 再點一次＝回到三線並排
    try { localStorage.setItem(LS_LINE, line || ''); } catch (e) { }
    render();
  }
  function setPick(code) {
    pick = code || null;
    try { localStorage.setItem(LS_PICK, pick || ''); } catch (e) { }
    render();
  }

  function openDetail(c) {
    if (!c) return;
    window.FinecolourDetail.open(c, {
      sets: SETS,
      // 差異行為交給呼叫端：這一頁不跳走，就地換基準組（切換與捲動位置都保住）
      onSetClick: function (s) {
        if (line && s.line !== line) setLine(s.line);   // 跨產品線時先切過去
        setPick(K(s));
        M.Modal.getInstance(document.getElementById('cp-detail-modal')).close();
      }
    });
  }

  // ---- 側鍵 ---------------------------------------------------------------

  // 「回色票頁」＝回到**開啟本頁的那一個**色票頁，不是另外開一個新的。
  // 這頁幾乎都是從色票頁另開分頁來的，所以優先關掉本分頁——原分頁的搜尋、
  // 色系選擇、捲動位置都還在，導航過去只會得到一個乾淨的新狀態。
  // 三層退路：① 有 opener（script 開的分頁）→ 關掉自己；② 同分頁跳過來的
  // → history.back()；③ 直接開深連結進來的 → 照 href 導航。
  function backToGrid(e) {
    if (window.opener && !window.opener.closed) { e.preventDefault(); window.close(); return; }
    var fromGrid = false;
    try {
      var u = new URL(document.referrer);
      fromGrid = u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname);
    } catch (err) { }
    if (fromGrid && history.length > 1) { e.preventDefault(); history.back(); return; }
    // 其餘不攔：讓 <a href> 自己導航（無 JS 時也是這個行為）
  }

  function initTools() {
    document.getElementById('setting-back').addEventListener('click', backToGrid);
    document.getElementById('setting-mode').addEventListener('click', function () {
      var mode = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      var r = document.documentElement;
      r.dataset.theme = mode;
      r.classList.toggle('dark-mode', mode === 'dark');
      r.classList.toggle('light-mode', mode === 'light');
      localStorage.setItem('finecolour-color-theme', mode);
    });
    document.getElementById('setting-lang').addEventListener('click', function () {
      var next = I18n.cycle();
      M.toast({ html: I18n.t('toast.lang', { name: I18n.name(next) }), displayLength: 1400 });
    });
    // 最接近色側欄（與色票頁同一支模組）。在這頁特別有用：找到最接近的筆之後，
    // 明細裡的套組是可點的 → 直接就地換成那個基準組，
    // 「這個顏色該拿哪支筆 → 那支筆收在哪一盒」一條路走完，不必跳頁。
    FinecolourNearest.init({ onPick: openDetail });
    document.getElementById('setting-nearest').addEventListener('click', function () {
      FinecolourNearest.open();
    });
    document.addEventListener('i18n:changed', function () {
      render(); FinecolourDetail.refresh(); FinecolourNearest.refresh();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.I18n) I18n.apply(document);

    // 深連結 ?set= / ?line= 優先，其次記憶；認不得就當沒選（不報錯）
    var q = new URLSearchParams(location.search);
    var wantSet = q.get('set');
    var wantLine = q.get('line');
    if (!wantSet) { try { wantSet = localStorage.getItem(LS_PICK); } catch (e) { } }
    if (!wantLine) { try { wantLine = localStorage.getItem(LS_LINE); } catch (e) { } }
    var found = wantSet && setByCode(wantSet);
    if (found) pick = K(found);   // 深連結可給 key 或（唯一的）code，一律正規化成 key
    if (wantLine && LINES.some(function (l) { return l.id === wantLine; })) line = wantLine;

    initTools();
    render();
    window.addEventListener('resize', syncHeadHeight);

    $tabs.addEventListener('click', function (e) {
      var b = e.target.closest('.line-tab');
      if (b) setLine(b.dataset.line);
    });
    $picked.addEventListener('click', function (e) {
      if (e.target.closest('#picked-clear')) setPick('');
    });
    $matrix.addEventListener('click', function (e) {
      var th = e.target.closest('.c-size');
      if (th) {                                   // 點尺寸＝選為基準組（再點一次取消）
        var s = visibleSets()[+th.dataset.col];
        if (s) setPick(K(s) === pick ? '' : K(s));
        return;
      }
      var tr = e.target.closest('tbody tr');
      if (tr && e.target.closest('.c-color')) openDetail(byCode[tr.dataset.code]);
    });
  });
})();
