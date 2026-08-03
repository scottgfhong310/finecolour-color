/**
 * finecolour-color — 主頁控制器（碰 DOM 的那一半；純邏輯在 finecolour-color-lib.js）
 *
 * 這支 app 的兩條軸線都是 Finecolour 自己的事實，不是套來的版面：
 *
 * ① **色系分群（分組 chips，單選）**——色碼字首就是色系（`BV321` ＝ BV 群第 321 號）。
 *    但號碼是**全域唯一**的，不像 COPIC 那樣可以再分解成兩個軸，所以這裡沒有矩陣，
 *    就是一維色票牆。末尾另立「彩針筆」一群：EF300 是**另一個色號空間**
 *    （48 色、兩位數色碼、官方只有中文名），與 480 色的麥克筆不共用編號。
 *
 * ② **產品線可得性（篩選 chips，多選）**——同一支色不見得每一代都有出。
 *    這是 Finecolour 的招牌事實（資料來自色譜上實印的 ○●■ 符號，並以各代自己的
 *    宣傳單獨立驗證過），也是唯一能回答「我手上是 1 代，這支買得到嗎」的資訊。
 *
 * 兩種 chips 的視覺與行為不可混用，見 DESIGN_GUIDELINES §5.13：
 * 分組 chips 單選互斥、恆有一個 active、自備「全部」那顆；
 * 篩選 chips 多選 toggle、帶勾號、可全部取消。
 */
(function () {
  'use strict';

  var L = window.FinecolourColorLib;
  var COLORS = window.FINECOLOUR_COLORS || [];
  var FAMS = window.FINECOLOUR_FAMILIES || [];
  var SETS = window.FINECOLOUR_SETS || [];
  var META = window.FINECOLOUR_META || {};
  var LINES = (META.lines || []);
  var KEY_THEME = 'finecolour-color-theme';
  var KEY_GROUP = 'finecolour-color-group';
  var KEY_LINES = 'finecolour-color-lines';

  // 分組 chips 末尾的兩群：它們是**另外兩個色號空間**，不是麥克筆的某個色系。
  var FINELINER = 'fineliner';
  var ACRYLIC = 'acrylic';
  var SPACE_GROUPS = [
    { space: FINELINER, key: 'group.fineliner', fb: '彩針筆' },
    { space: ACRYLIC, key: 'group.acrylic', fb: '壓克力筆' }
  ];

  var state = {
    group: localStorage.getItem(KEY_GROUP) || 'all',   // 'all' | 色系 code | 'fineliner' | 'acrylic'
    lines: (localStorage.getItem(KEY_LINES) || '').split(',').filter(Boolean),
    q: ''
  };

  var $fams = document.getElementById('families');
  var $lines = document.getElementById('lines');
  var $grid = document.getElementById('grid');
  var $none = document.getElementById('no-result');
  var $count = document.getElementById('count');

  // i18n.t 找不到鍵時回傳鍵名本身，故以「回傳值 === 鍵名」判定缺字典、才用 fallback
  function t(key, fb) {
    if (!window.I18n || !I18n.t) return fb;
    var v = I18n.t(key);
    return (v && v !== key) ? v : fb;
  }

  // ---- 資料選取 -----------------------------------------------------------

  /** 目前分組選中的那批（不含產品線篩選與搜尋）。 */
  function grouped() {
    if (state.group === 'all') return COLORS;
    if (state.group === FINELINER || state.group === ACRYLIC) {
      return COLORS.filter(function (c) { return c.space === state.group; });
    }
    return COLORS.filter(function (c) { return c.space === 'marker' && c.family === state.group; });
  }

  /** 套上產品線篩選（多選＝聯集：選了 EF100 與 EF300 就是「這兩線任一有出的」）。 */
  function byLines(list) {
    if (!state.lines.length) return list;
    return list.filter(function (c) {
      return (c.lines || []).some(function (id) { return state.lines.indexOf(id) >= 0; });
    });
  }

  function visible() { return L.sortColors(L.filter(byLines(grouped()), state.q), 'code', FAMS); }

  // ---- chips --------------------------------------------------------------

  function chipNode(cls, code, label, n, active, onClick) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = cls + (active ? ' active' : '');
    el.title = label;
    el.innerHTML = '<span class="fam-code"></span><span class="fam-n"></span>';
    el.querySelector('.fam-code').textContent = code;
    el.querySelector('.fam-n').textContent = n;
    el.addEventListener('click', onClick);
    return el;
  }

  function sepNode() {
    var sep = document.createElement('span');
    sep.className = 'fam-sep';
    return sep;
  }

  function pickGroup(g) {
    state.group = g;
    localStorage.setItem(KEY_GROUP, g);
    render();
  }

  function renderFamilies() {
    $fams.innerHTML = '';
    // 「全部」＝取消色系選擇的那顆。分組 chips 恆有一個 active、無法取消，
    // 所以「看全部」必須自己是一顆 chip（DESIGN_GUIDELINES §5.13 ①）。
    $fams.appendChild(chipNode('fam-chip', t('family.all', '全部'), t('family.all', '全部'),
      COLORS.length, state.group === 'all', function () { pickGroup('all'); }));
    $fams.appendChild(sepNode());

    FAMS.forEach(function (f) {
      var n = COLORS.filter(function (c) { return c.space === 'marker' && c.family === f.code; }).length;
      if (!n) return;
      $fams.appendChild(chipNode('fam-chip', f.code, f.name, n,
        state.group === f.code, function () { pickGroup(f.code); }));
    });

    // 另外兩個色號空間各自成一群（彩針筆／壓克力筆），排在色系之後。
    var first = true;
    SPACE_GROUPS.forEach(function (g) {
      var n = COLORS.filter(function (c) { return c.space === g.space; }).length;
      if (!n) return;
      if (first) { $fams.appendChild(sepNode()); first = false; }
      var label = t(g.key, g.fb);
      $fams.appendChild(chipNode('fam-chip', label, label, n,
        state.group === g.space, function () { pickGroup(g.space); }));
    });
  }

  function renderLines() {
    var base = grouped();
    $lines.innerHTML = '';
    var shown = 0;
    LINES.forEach(function (p) {
      var n = base.filter(function (c) { return (c.lines || []).indexOf(p.id) >= 0; }).length;
      if (!n) return;                       // 這個分組下該線一支都沒有 → 不顯示（無從篩起）
      shown++;
      $lines.appendChild(chipNode('type-chip', p.id, p.name + '（' + p.count + '）', n,
        state.lines.indexOf(p.id) >= 0, function () {
          var i = state.lines.indexOf(p.id);
          if (i >= 0) state.lines.splice(i, 1); else state.lines.push(p.id);
          localStorage.setItem(KEY_LINES, state.lines.join(','));
          render();
        }));
    });
    // 只有一種取值時不顯示（無從篩起）；同時把「已選但目前不存在」的剔除，避免殘留
    state.lines = state.lines.filter(function (id) {
      return base.some(function (c) { return (c.lines || []).indexOf(id) >= 0; });
    });
    $lines.style.display = shown > 1 ? '' : 'none';
  }

  // ---- 色票 ---------------------------------------------------------------

  function cardNode(c) {
    var el = document.createElement('div');
    el.className = 'cp-card';
    el.innerHTML =
      '<div class="cp-swatch"></div>' +
      '<div class="cp-meta"><div class="cp-name"></div><div class="cp-hex"></div></div>';
    var sw = el.querySelector('.cp-swatch');
    sw.style.background = c.hex;
    sw.style.color = L.pickTextColor(c);
    sw.textContent = c.code;
    // 官方名恆為主名，且**一律走 lib**（`L.officialName`）——這裡曾經有一份自己的
    // 複製，於是第三個色號空間（EF600，原廠不發佈色名）進來時它認不得 'none'、
    // 卡片顯示空白。**同一條規則不要有第二份實作。**
    var nm = L.officialName(c);
    el.querySelector('.cp-name').textContent = nm || t('note.noName', '原廠不發佈色名');
    el.querySelector('.cp-name').classList.toggle('is-noname', !nm);
    el.querySelector('.cp-hex').textContent = c.hex;
    el.title = nm ? c.code + ' ' + nm : c.code;
    el.addEventListener('click', function () { openDetail(c); });
    return el;
  }

  function render() {
    // 搜尋結果跨色系，這時留著一顆亮起的分組 chip 只會讓人以為看到的是那一群的色
    // （DESIGN_GUIDELINES §5.13 ②）。「全部」不受此限——它自己是 bar 裡的 chip。
    $fams.style.display = state.q ? 'none' : '';
    if (!state.q) renderFamilies();
    renderLines();

    var list = visible();
    $grid.style.display = list.length ? 'grid' : 'none';
    $none.style.display = list.length ? 'none' : 'block';
    $grid.innerHTML = '';
    list.forEach(function (c) { $grid.appendChild(cardNode(c)); });
    $count.textContent = list.length + ' / ' + COLORS.length;
  }

  function openDetail(c) {
    window.FinecolourDetail.open(c, {
      sets: SETS,
      lines: LINES,
      onSetClick: function (s) { window.open('./sets.html?set=' + encodeURIComponent(L.setKey(s)), '_blank'); }
    });
  }

  // ---- 側鍵 ---------------------------------------------------------------

  function applyTheme(mode) {
    var r = document.documentElement;
    r.dataset.theme = mode;
    r.classList.toggle('dark-mode', mode === 'dark');
    r.classList.toggle('light-mode', mode === 'light');
    localStorage.setItem(KEY_THEME, mode);
  }

  function initTools() {
    document.getElementById('setting-sets').addEventListener('click', function (e) {
      e.preventDefault();
      window.open('./sets.html', '_blank');
    });
    document.getElementById('setting-mode').addEventListener('click', function () {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    document.getElementById('setting-lang').addEventListener('click', function () {
      var next = I18n.cycle();
      M.toast({ html: I18n.t('toast.lang', { name: I18n.name(next) }), classes: 'teal' });
    });
    document.addEventListener('i18n:changed', function () {
      render();
      if (window.FinecolourDetail && FinecolourDetail.refresh) FinecolourDetail.refresh();
    });
    document.getElementById('setting-css').addEventListener('click', function () {
      var css = L.buildCss(visible(), META);
      document.getElementById('css-pre').textContent = css;
      document.getElementById('css-sub').textContent =
        visible().length + ' ' + t('css.vars', '個色號變數');
      M.Modal.getInstance(document.getElementById('css-modal')).open();
    });
    document.getElementById('css-copy').addEventListener('click', function () {
      L.copyText(document.getElementById('css-pre').textContent)
        .then(function () { M.toast({ html: I18n.t('toast.copied'), classes: 'teal' }); })
        .catch(function () { M.toast({ html: I18n.t('toast.copyFail'), classes: 'red' }); });
    });
    function download() {
      L.downloadText('finecolour_colors.css', L.buildCss(visible(), META));
      M.toast({ html: I18n.t('toast.downloaded', { n: 'finecolour_colors.css' }), classes: 'teal' });
      window.SideTool.setIconDone('setting-download');
    }
    document.getElementById('css-download').addEventListener('click', download);
    document.getElementById('setting-download').addEventListener('click', download);
    document.getElementById('setting-nearest').addEventListener('click', function () {
      window.FinecolourNearest.open(COLORS, { onPick: openDetail });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    M.Modal.init(document.querySelectorAll('.modal'));
    document.getElementById('search').addEventListener('input', function (e) {
      state.q = e.target.value.trim();
      render();
    });
    initTools();
    render();
  });
})();
