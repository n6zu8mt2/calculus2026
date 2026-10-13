/* 第2回 指数関数・対数関数 — 各ウィジェット
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js
 * 色の約束: a(底・係数)=青, p=緑, q=赤 (1.2章と同じ) / 比べる2つ: A=緑, B=赤
 */
(function () {
  'use strict';
  const L = window.Lab;
  const { el, num, setTex, slider, Plot, clamp, snap } = L;
  const { starStr, GameShell, gameButtons, Confetti, aimToggle, gapMark, Sweep } = L.game;
  const R = (root, k) => root.querySelector('[data-r="' + k + '"]');
  const tex = (root, k, s) => setTex(R(root, k), s);
  const $id = (id) => document.getElementById(id);
  const C = (c, s) => '\\' + c + '{' + s + '}';
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const LOG2 = Math.log10(2);
  // 小数 d 桁でちょうど表せるなら「=」、そうでなければ「≈」
  const eqTeX = (v, d) => (Math.abs(parseFloat(String(num(v, d)).replace(/[^0-9.eE+-]/g, '')) - v) < 1e-12 ? '=' : '\\approx');

  /* ---------- 数の表示 ---------- */
  // 分母 den までの分数で表せればその分数を返す
  function fracParts(v, den) {
    den = den || 12;
    for (let q = 1; q <= den; q++) { const p = Math.round(v * q); if (Math.abs(v * q - p) < 1e-7) return [p, q]; }
    return null;
  }
  function fracTeX(v, den) {
    const f = fracParts(v, den);
    if (!f) return num(v, 4);
    return f[1] === 1 ? String(f[0]) : (f[0] < 0 ? '-' : '') + '\\frac{' + Math.abs(f[0]) + '}{' + f[1] + '}';
  }
  function fracTxt(v, den) {
    const f = fracParts(v, den);
    if (!f) return L.minus(num(v, 3));
    return L.minus(f[1] === 1 ? String(f[0]) : f[0] + '/' + f[1]);
  }
  // 大きな数・小さな数は m×10^k の TeX に
  function sciTeX(v, d) {
    if (v === 0) return '0';
    const k = Math.floor(Math.log10(Math.abs(v)));
    if (k >= -2 && k < 7) return Number.isInteger(v) ? v.toLocaleString('ja-JP') : num(v, d == null ? 3 : d);
    const m = v / Math.pow(10, k);
    return m.toFixed(2) + '\\times10^{' + k + '}';
  }
  // log10 の値(lv)から m×10^k の TeX (とても大きな数用)
  function sciFromLog(lv) {
    const k = Math.floor(lv), m = Math.pow(10, lv - k);
    if (k < 7) return Math.round(Math.pow(10, lv)).toLocaleString('ja-JP');
    return m.toFixed(2) + '\\times10^{' + k + '}';
  }
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = (k) => String(k).split('').map((ch) => SUP[ch] || ch).join('');
  const niceStep = (x) => { const e = Math.pow(10, Math.floor(Math.log10(x))), m = x / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };
  // 長さ(mm)を日常の単位で
  function lenTxt(mm) {
    if (mm < 10) return num(mm, 2) + ' mm';
    if (mm < 1000) return num(mm / 10, 1) + ' cm';
    if (mm < 1e6) return num(mm / 1000, 1) + ' m';
    const km = mm / 1e6;
    if (km < 1e4) return Math.round(km).toLocaleString('ja-JP') + ' km';
    if (km < 1e8) return num(km / 1e4, 1) + '万 km';
    return num(km / 1e8, 2) + '億 km';
  }
  function chipRow(box, items, cur, onPick) {
    box.innerHTML = '';
    const btns = items.map(function (it, i) {
      const b = el('button', 'chip', it.label);
      b.type = 'button';
      b.addEventListener('click', () => { btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); onPick(it, i); });
      box.append(b);
      return b;
    });
    btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === cur)));
    return btns;
  }
  // 対数目盛の定規(x = log10(値))。items: [名前, 値, 絵文字]
  function drawLogRuler(g, items, opt) {
    const c = g.c, y0 = opt.y || 0.42;
    g.line(g.xmin, y0, g.xmax, y0, { color: c.axis, width: 3 });
    for (let k = Math.ceil(g.xmin); k <= g.xmax; k++) {
      const big = k % (opt.every || 1) === 0;
      g.line(k, y0 - (big ? 0.06 : 0.03), k, y0 + (big ? 0.06 : 0.03), { color: c.axis, width: big ? 2 : 1 });
      // マーカー(▲)と重なる目盛の数字は省く(TeX はキャンバスより手前に出るため)
      const hid = (opt.avoid || []).some((v) => Math.abs(g.X(clamp(v, g.xmin, g.xmax)) - g.X(k)) < 14);
      const ek = g.X(k) < 22 ? 'left' : g.X(k) > g.w - 22 ? 'right' : 'center';
      if (big && !hid) g.tex('10^{' + k + '}', k, y0, { dy: 17, align: ek, dx: ek === 'left' ? 2 : ek === 'right' ? -2 : 0, size: 12, color: c.muted });
    }
    items.forEach(function (it, i) {
      const x = Math.log10(it[1]);
      if (x < g.xmin || x > g.xmax) return;
      const nl = opt.levels || 3, hi = opt.target === i, lvl = i % nl;
      const yy = y0 + 0.13 + lvl * (nl > 4 ? 0.09 : nl > 3 ? 0.105 : 0.13);
      g.line(x, y0, x, yy - 0.04, { color: hi ? c.teal : c.muted, width: hi ? 2.5 : 1, dash: hi ? [] : [3, 3] });
      const span = g.xmax - g.xmin, al = x > g.xmax - span * 0.1 ? 'right' : x < g.xmin + span * 0.08 ? 'left' : 'center';
      // compact：狭い画面では絵文字を省いて、となりのラベルとぶつかりにくくする
      const emo = it[2] && !(opt.compact && g.w < 520);
      // 端のラベルは少しはみ出させるが、キャンバスの外には出さない
      const edx = al === 'right' ? Math.min(6, g.w - 2 - g.X(x)) : al === 'left' ? Math.max(-6, 2 - g.X(x)) : 0;
      g.text((emo ? it[2] + ' ' : '') + it[0], x, yy, { align: al, dx: edx, size: g.w < 520 ? 10.5 : 12, bold: hi, color: hi ? c.teal : c.text });
    });
  }
  // 長さの定規(LEN_MARKS)は、狭い画面では数字を 1 つおき・ラベル 5 段・絵文字なしにして、定規を少し下げる
  const lenRulerOpt = (g, o) => (g.w < 520 ? Object.assign({ every: 2, levels: 5, compact: true, y: 0.34 }, o) : Object.assign({ every: 1 }, o));
  const lenY = (g) => (g.w < 520 ? 0.34 : 0.42);
  // 体積の定規(VOL_MARKS)も同様に：数字は 10^20 ごと・ラベル 4 段・絵文字なし
  const volRulerOpt = (g, o) => (g.w < 520 ? Object.assign({ every: 20, levels: 4, compact: true, y: 0.36 }, o) : Object.assign({ every: 10 }, o));
  const volY = (g) => (g.w < 520 ? 0.36 : 0.42);
  function rulerMarker(g, lv, label, color, y0, dyText) {
    y0 = y0 || 0.42;
    const c = g.c, x = clamp(lv, g.xmin, g.xmax), px = g.X(x), py = g.Y(y0);
    const ctx = g.ctx;
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(px, py + 4); ctx.lineTo(px - 9, py + 20); ctx.lineTo(px + 9, py + 20); ctx.closePath(); ctx.fill(); ctx.restore();
    const rt = x > (g.xmin + g.xmax) / 2; // 端ではキャンバスからはみ出さないように
    g.text(label, x, y0, { dy: dyText || 34, align: rt ? 'right' : 'left', dx: rt ? Math.min(8, g.w - 2 - px) : Math.max(-8, 2 - px), size: 12.5, bold: true, color: color });
  }

  /* ==========================================================
     2.1(1) パターンで指数を広げる(カード)
     ========================================================== */
  function initPowCards() {
    const root = $id('w-pow-cards'), box = R(root, 'table');
    const NS = [-3, -2, -1, 0, 1, 2, 3, 4];
    const st = { a: 2, open: new Set() };
    const msg = (t) => { R(root, 'msg').textContent = t; };
    chipRow(R(root, 'bases'), [{ label: '2', a: 2 }, { label: '3', a: 3 }, { label: '10', a: 10 }], 0, (it) => { st.a = it.a; reset(); });
    function valTeX(a, n) {
      if (n >= 0) return Math.pow(a, n).toLocaleString('ja-JP');
      const d = Math.pow(a, -n);
      return '\\dfrac{1}{' + d.toLocaleString('ja-JP') + '}';
    }
    // 列は固定(指数 −3〜4)。0以下の値だけ「？」で隠す
    function render() {
      const a = st.a;
      let h = '<div class="pt-h">指数</div>';
      NS.forEach((n) => { h += '<div class="pt-h' + (n <= 0 ? ' new' : '') + '">' + n + '</div>'; });
      h += '<div class="pt-h">累乗</div>';
      NS.forEach((n) => { h += '<div class="pt-e" data-tex="' + a + '^{' + n + '}"></div>'; });
      h += '<div class="pt-h">値</div>';
      NS.forEach((n, i) => {
        const hid = n <= 0 && !st.open.has(n);
        h += '<div class="pt-vc"><button type="button" class="pt-v' + (hid ? ' hidden' : '') + (n <= 0 ? ' new' : '') + '" data-n="' + n + '"' + (hid ? '' : ' data-tex="' + valTeX(a, n) + '"') + '>' + (hid ? '？' : '') + '</button>' +
          // となりの箱とのすき間に「×a →」(上)と「÷a ←」(下)
          (i < NS.length - 1 ? '<span class="pt-gap" aria-hidden="true"><span class="pt-mul"><i>×' + a + '</i><b>→</b></span><span class="pt-div"><b>←</b><i>÷' + a + '</i></span></span>' : '') + '</div>';
      });
      box.innerHTML = h;
      box.querySelectorAll('[data-tex]').forEach((x) => setTex(x, x.dataset.tex));
    }
    box.addEventListener('click', function (e) {
      const b = e.target.closest('.pt-v'); if (!b) return;
      const n = +b.dataset.n, a = st.a;
      if (n > 0 || st.open.has(n)) return;
      if (!st.open.has(n + 1) && n < 0) { msg('右どなりの ' + a + sup(n + 1) + ' から先にめくろう（右から ÷' + a + ' していく）。'); return; }
      st.open.add(n); render();
      if (n === 0) msg('🎉 ' + a + '⁰ = 1。' + a + '¹ = ' + a + ' を ' + a + ' で割ると 1。どんな数でも 0 乗は 1 です。');
      else if (n === -1) msg('🎉 ' + a + '⁻¹ = 1/' + a + '。1 を ' + a + ' で割ると 1/' + a + '。マイナス1乗は「逆数」です。');
      else msg('🎉 ' + a + sup(n) + ' = 1/' + Math.pow(a, -n).toLocaleString('ja-JP') + '。÷' + a + ' をくり返すと、分母に ' + a + ' が1個ずつかかっていきます。');
    });
    root.querySelector('[data-a="open"]').addEventListener('click', function () { NS.forEach((n) => { if (n <= 0) st.open.add(n); }); render(); msg('右から左へ、1つ進むごとに ÷' + st.a + ' になっているか確かめよう。'); });
    root.querySelector('[data-a="reset"]').addEventListener('click', reset);
    function reset() { st.open = new Set(); render(); msg('まずは ' + st.a + '⁰ の「？」から。' + st.a + '¹ = ' + st.a + ' を ÷' + st.a + ' するといくつ？'); }
    reset();
  }

  /* ==========================================================
     2.1(4) ×a と ÷a の打ち消し合い
     ========================================================== */
  function initPowCancel() {
    const root = $id('w-pow-cancel');
    const st = { m: 3, n: -2 };
    const v = (k) => (k >= 0 ? String(Math.pow(2, k)) : '\\frac{1}{' + Math.pow(2, -k) + '}');
    const p = (k) => (k < 0 ? '(' + k + ')' : String(k));
    function update() {
      const m = st.m, n = st.n, s = m + n;
      R(root, 'm').textContent = m; R(root, 'n').textContent = n;
      // m の分、n の分のトークン。×2 と ÷2 は先頭から順に打ち消す
      const toks = [];
      const add = (k, cls) => { for (let i = 0; i < Math.abs(k); i++) toks.push({ op: k > 0 ? '×2' : '÷2', cls }); };
      add(m, 'teal'); add(n, 'red');
      const mul = toks.filter((t) => t.op === '×2'), div = toks.filter((t) => t.op === '÷2');
      const c = Math.min(mul.length, div.length);
      mul.slice(0, c).forEach((t) => (t.gone = true)); div.slice(0, c).forEach((t) => (t.gone = true));
      R(root, 'left').innerHTML = '×2 が <b>' + mul.length + '</b> 個、÷2 が <b>' + div.length + '</b> 個 → ' + (c ? c + ' 組が打ち消し合って、' : '') +
        (s === 0 ? '<b>何も残らない</b>（答えは 1 ＝ 2⁰）' : '<b>' + (s > 0 ? '×2' : '÷2') + ' が ' + Math.abs(s) + ' 個残る</b>（答えは 2' + sup(s) + '）');
      tex(root, 'eq', '\\displaystyle 2^{' + C('teal', m) + '}\\times2^{' + C('red', n) + '}=' + v(m) + '\\times' + v(n) + '=' + v(s) + '=2^{' + C('teal', m) + '+' + C('red', p(n)) + '}');
    }
    root.querySelectorAll('[data-s]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.dataset.s[0], d = b.dataset.s[1] === '+' ? 1 : -1;
        st[k] = clamp(st[k] + d, -5, 5); update();
      });
    });
    update();
  }

  /* ==========================================================
     2.1(5) n乗根：y = x^n と y = a の交点
     ========================================================== */
  function initRoot() {
    const root = $id('w-root'), ctl = root.querySelector('.controls');
    // 縦は横の 2 倍まで縮める程度にして、曲線の形がわかるように
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.5, xmax: 2.9, ymin: -0.9, ymax: 5.6, height: (w) => w * (6.5 / 3.4) / 2 });
    const st = { n: 2 };
    chipRow(R(root, 'ns'), [2, 3, 4, 5].map((n) => ({ label: n === 2 ? '2乗根（ルート）' : n + '乗根', n })), 0, (it) => { st.n = it.n; update(); });
    const sa = slider(ctl, { tex: '\\amber{a}', min: 0.2, max: 5, step: 0.1, value: 4, color: 'amber' });
    const rt = () => Math.pow(sa.get(), 1 / st.n);
    const rtTeX = (n) => (n === 2 ? '\\sqrt{' : '\\sqrt[' + n + ']{');
    function update() {
      const n = st.n, a = sa.get(), r = rt(), ex = Math.abs(r - Math.round(r)) < 1e-9;
      tex(root, 'root', rtTeX(n) + C('amber', num(a, 1)) + '}' + (ex ? '=' : '\\approx') + C('red', ex ? String(Math.round(r)) : num(r, 4)));
      tex(root, 'check', C('red', ex ? String(Math.round(r)) : num(r, 4)) + '^{' + n + '}' + (ex ? '=' : '\\approx') + num(Math.pow(ex ? Math.round(r) : +num(r, 4), n), ex ? 0 : 3) + '\\quad(' + n + '\\text{ 乗すると } ' + C('amber', num(a, 1)) + ')');
      plot.invalidate();
    }
    sa.on(update);
    plot.draw = function (g) {
      const c = g.c, n = st.n, a = sa.get(), r = rt();
      g.grid({ stepX: 1, stepY: 1, xlabel: 'x', ylabel: 'y' });
      g.fn((x) => Math.pow(x, n), { x0: 0, x1: g.xmax, color: c.primary, width: 3.5 });
      g.line(g.xmin, a, g.xmax, a, { color: c.amber, width: 2.5, dash: [7, 6] });
      g.tex('y=a=' + num(a, 1), 0, a, { dx: 8, dy: -13, size: 14, color: c.amber });
      g.line(r, 0, r, a, { color: c.accent, width: 2, dash: [5, 5] });
      g.dot(r, a, { r: 7, color: c.accent });
      g.dot(r, 0, { r: 6, color: c.accent });
      // 割り切れるときは「=」。x 軸の目盛りの数字(赤い点の真下)と重ならないよう、目盛りより下に置く
      const ex = Math.abs(r - Math.round(r)) < 1e-9;
      g.tex(rtTeX(n) + num(a, 1) + '}' + (ex ? '=' + Math.round(r) : '\\approx' + num(r, 3)), r, 0, { dy: 18, align: 'center', valign: 'top', size: 14, color: c.accent });
      const yl = a > 2.5 ? 1.2 : 4, xl = Math.pow(yl, 1 / n); // 横線 y=a と重ならない高さに
      g.tex('y=x^{' + n + '}', xl, yl, { dx: 10, align: 'left', size: 15, color: c.primary });
    };
    update();
  }

  /* ==========================================================
     2.1(7) 分数の指数で間を埋める
     ========================================================== */
  function initPowFrac() {
    const root = $id('w-pow-frac');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.4, xmax: 3.4, ymin: -0.9, ymax: 9.6, ratio: [0.78, 0.5] }); // 上は説明文のぶん空ける(目盛 8 と重ならないように)
    const st = { k: 2, x: 0.5, curve: false };
    chipRow(R(root, 'ks'), [1, 2, 3, 4, 6, 12].map((k) => ({ label: 'k=' + k, k })), 1, (it) => { st.k = it.k; st.x = snap(st.x, 1 / st.k); update(); });
    R(root, 'curve').addEventListener('change', (e) => { st.curve = e.target.checked; plot.invalidate(); });
    // 2^x を「整数部分 × 累乗根」の形に(例：2^{-5/2} = 1/(4√2))
    function rootForm(x) {
      const f = fracParts(x, 12);
      if (!f || f[1] === 1) return fracTeX(Math.pow(2, x), 64);
      const P = Math.abs(f[0]), q = f[1], i = Math.floor(P / q), r = P % q;
      const g = r === 1 ? '2' : '2^{' + r + '}', rt = q === 2 ? '\\sqrt{' + g + '}' : '\\sqrt[' + q + ']{' + g + '}';
      const body = (i ? Math.pow(2, i) : '') + rt;
      return f[0] < 0 ? '\\frac{1}{' + body + '}' : body;
    }
    // かいた点を「x」「2^x」「近似値」の3行の表にする(横にスクロール)
    const dfr = (t) => t.replace(/\\frac/g, '\\dfrac');
    function listPts() {
      const k = st.k, lo = k === 1 ? -3 : -2, hi = k === 1 ? 3 : 2, box = R(root, 'list');
      const rows = [el('tr'), el('tr'), el('tr')];
      ['x', '2^x', '2^x\\ (\\text{近似値})'].forEach((h, i) => { const th = el('th'); setTex(th, h); rows[i].append(th); });
      for (let j = lo * k; j <= hi * k; j++) {
        const x = j / k, cls = (j % k === 0 ? 'int' : '');
        const c = [el('td', cls), el('td', cls), el('td', cls + ' approx')];
        c.forEach((td) => { td.dataset.j = j; });
        setTex(c[0], dfr(fracTeX(x, 12))); setTex(c[1], dfr(rootForm(x)));
        c[2].textContent = num(Math.pow(2, x), 3);
        c.forEach((td, i) => rows[i].append(td));
      }
      box.innerHTML = ''; rows.forEach((r) => box.append(r));
      R(root, 'range').textContent = '表は x = ' + lo + ' から ' + hi + ' まで（' + ((hi - lo) * k + 1) + ' 個の点）。横にスクロールできます。太字は指数が整数の点、色のついた列は赤い点で選んだ点です。';
    }
    function update() {
      const k = st.k, x = st.x, xs = fracTeX(x, 12);
      if (st.lk !== k) { st.lk = k; listPts(); }
      const r = '2^{\\frac1{' + k + '}}=' + (k === 2 ? '\\sqrt2' : '\\sqrt[' + k + ']{2}') + '\\approx' + num(Math.pow(2, 1 / k), 4);
      const ex = R(root, 'explain');
      ex.innerHTML = (k === 1 ?
        '$k=1$ では、指数 $x$ を $1$ ずつ増やします（整数の指数だけ）。1 つ進むごとに $2^x$ は $2$ 倍になります。' :
        '$k=' + k + '$ では、指数 $x$ を $\\frac1{' + k + '}$ ずつ増やします。1 つ進むごとに $2^x$ は $' + r + '$ 倍になり、' + k + ' つ進む（$x$ が $1$ 増える）とちょうど $2$ 倍になります。') +
        '<br>いま選んだ点：$x=' + xs + '$ のとき $2^{' + xs + '}=' + rootForm(x) + '\\approx' + num(Math.pow(2, x), 4) + '$';
      typeset(ex);
      const jSel = Math.round(x * k);
      R(root, 'list').querySelectorAll('td').forEach((td) => td.classList.toggle('sel', +td.dataset.j === jSel));
      const tdS = R(root, 'list').querySelector('td.sel'), wrap = root.querySelector('.k-wrap');
      if (tdS && wrap) wrap.scrollLeft = tdS.offsetLeft - wrap.clientWidth / 2 + tdS.offsetWidth / 2; // 選んだ列を表の真ん中に
      plot.invalidate();
    }
    plot.addHandle({ get x() { return st.x; }, get y() { return Math.pow(2, st.x); }, get color() { return plot.c.accent; }, r: 8,
      drag(x) { st.x = clamp(snap(x, 1 / st.k), -3, 3); update(); } });
    plot.draw = function (g) {
      const c = g.c, k = st.k;
      g.grid({ stepX: 1, stepY: 1, xlabel: 'x', ylabel: 'y' });
      if (st.curve) g.fn((x) => Math.pow(2, x), { color: c.primary, width: 3, alpha: 0.45 });
      const pts = [];
      for (let j = -3 * k; j <= 3 * k; j++) pts.push([j / k, Math.pow(2, j / k)]);
      g.poly(pts, { color: c.teal, width: 1.5, alpha: 0.6 });
      pts.forEach((p, i) => g.dot(p[0], p[1], { r: (i % k === 0) ? 6 : 4, color: (i % k === 0) ? c.primary : c.teal }));
      if (k > 1) g.tex('\\text{1歩ごとに }{\\times}' + num(Math.pow(2, 1 / k), 3), -2 + 1 / (2 * k), Math.pow(2, -2 + 1 / (2 * k)), { dy: -22, align: 'center', size: 13, color: c.teal });
      if (g.w < 480) { // 狭い画面では y 軸の左右に分けて、軸ラベル y と重ならないように
        g.texPx('\\text{大きな点：整数の指数}', 8, 17, { size: 12, color: c.muted });
        g.texPx('\\text{小さな点：}\\tfrac{1}{' + k + '}\\text{ ずつ}', g.w - 8, 17, { align: 'right', size: 12, color: c.muted });
      } else g.texPx('\\text{大きな点：整数の指数　小さな点：}\\tfrac{1}{' + k + '}\\text{ ずつの指数}', 10, 17, { size: 13, color: c.muted });
    };
    update();
  }

  /* ==========================================================
     2.1(4) チャレンジ：指数ハンター
     ========================================================== */
  const POW_STAGES = [
    { t: '\\frac18', x: -3, text: '$2^x=\\dfrac18$ となる $x$ を求めよう。', hint: '8 = 2³。「逆数」はマイナスの指数で表せる。',
      answer: '<b>x = −3</b><br>$\\dfrac18=\\dfrac1{2^3}=2^{-3}$。逆数はマイナスの指数で表せる。' },
    { t: '1', x: 0, text: '$2^x=1$ となる $x$ を求めよう。', hint: 'どんな数も ○ 乗すると 1 になる。',
      answer: '<b>x = 0</b><br>$2^0=1$。2.1章(1) のカードで、$2^1=2$ を 2 で割ると 1。' },
    { t: '\\sqrt2', x: 0.5, text: '$2^x=\\sqrt2$ となる $x$ を求めよう。', hint: '$\\sqrt2$ は「2 回かけると 2 になる数」。$2^x$ を 2 回かけると $2^{2x}$。',
      answer: '<b>x = 1/2</b><br>$\\left(2^{\\frac12}\\right)^2=2^1=2$ なので $2^{\\frac12}=\\sqrt2$。' },
    { t: '\\frac{1}{2\\sqrt2}', x: -1.5, text: '$2^x=\\dfrac{1}{2\\sqrt2}$ となる $x$ を求めよう。', hint: '$2\\sqrt2=2^1\\times2^{\\frac12}$。指数を足して、最後に逆数。',
      answer: '<b>x = −3/2</b><br>$2\\sqrt2=2^1\\cdot2^{\\frac12}=2^{\\frac32}$ なので、その逆数は $2^{-\\frac32}$。' },
    { t: '\\sqrt[3]{4}', x: 2 / 3, text: '$2^x=\\sqrt[3]{4}$ となる $x$ を求めよう。', hint: '$\\sqrt[3]{4}=4^{\\frac13}$、$4=2^2$。',
      answer: '<b>x = 2/3</b><br>$\\sqrt[3]{4}=4^{\\frac13}=\\left(2^2\\right)^{\\frac13}=2^{\\frac23}$。' },
  ];
  function initGamePow() {
    const root = $id('w-game-pow');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4.3, xmax: 4.3, ymin: -0.4, ymax: 4.2, ratio: [0.75, 0.45] });
    const ctl = root.querySelector('.controls');
    const sx = slider(ctl, { tex: 'x', min: -4, max: 4, step: 1 / 6, value: 1, color: 'accent', fmt: (v) => fracTxt(v, 6), aria: '指数 x' });
    const B = gameButtons(ctl, '✅ 決定');
    const conf = Confetti(root, plot);
    const st = { shots: [], aim: true };
    aimToggle(ctl, (v) => { st.aim = v; plot.invalidate(); });
    const S = () => POW_STAGES[game.k];
    const target = () => Math.pow(2, S().x);
    const game = GameShell(root, { key: '2-1:game', stages: POW_STAGES,
      formula: () => '2^{' + fracTeX(sx.get(), 6) + '}' + eqTeX(Math.pow(2, sx.get()), 4) + num(Math.pow(2, sx.get()), 4) + '\\qquad(\\text{目標 }' + S().t + eqTeX(target(), 4) + num(target(), 4) + ')',
      onStage() { st.shots = []; B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission')); plot.invalidate(); } });
    sx.on(() => { game.formula(); plot.invalidate(); });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const x = sx.get(); st.shots.push({ x, aim: st.aim }); game.used++; game.renderThrows();
      if (Math.abs(x - S().x) < 1e-6) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= POW_STAGES.length - 1;
        game.result('🎯 正解！ ' + starStr(n) + '（' + game.used + ' 回目）' + (st.aim ? '' : '　👑 点なしで正解！'), 'hit');
        conf.fire(plot.X(x), plot.Y(Math.pow(2, x)));
      } else {
        const v = Math.pow(2, x);
        let m = (v > target() ? '大きすぎる' : '小さすぎる') + '（$2^x\\approx' + num(v, 3) + '$、目標 $\\approx' + num(target(), 3) + '$）。$x$ を' + (v > target() ? '小さく' : '大きく') + 'しよう。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, POW_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, T = target();
      g.grid({ stepX: 1, stepY: 1, xlabel: 'x', ylabel: 'y' });
      g.fn((x) => Math.pow(2, x), { color: c.primary, width: 3 });
      g.line(g.xmin, T, g.xmax, T, { color: c.amber, width: 2.5, dash: [7, 6] });
      g.dot(0, 1, { r: 5, color: c.primary });
      g.tex('(0,\\,1)', 0, 1, { dx: -8, dy: -14, align: 'right', size: 13, color: c.primary }); // 左上（曲線は左下へ行くので空いている）
      g.dot(0, T, { r: 6.5, color: c.amber });
      g.tex('\\text{目標の高さ}' + eqTeX(T, 3) + num(T, 3), 0, T, { dx: 10, dy: -14, size: 14, color: c.amber });
      st.shots.forEach(function (s, i) {
        const ok = Math.abs(s.x - S().x) < 1e-6;
        g.line(s.x, 0, s.x, Math.pow(2, s.x), { color: ok ? c.teal : c.muted, width: 1.5, dash: [4, 4] });
        g.dot(s.x, Math.pow(2, s.x), { r: 6, color: ok ? c.teal : c.muted });
        g.text(String(i + 1), s.x, Math.pow(2, s.x), { dy: -14, align: 'center', size: 12, bold: true, color: c.muted });
      });
      if (st.aim && !game.done) {
        const x = sx.get(), y = Math.pow(2, x);
        g.line(x, 0, x, y, { color: c.accent, width: 2, dash: [5, 5] });
        g.dot(x, y, { r: 7, ring: true, color: c.accent });
      }
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     2.2(1) y=a^x のグラフの復習（x が 1 増えると ×a）
     ========================================================== */
  function initExpBasic() {
    const root = $id('w-expbasic');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4.35, xmax: 4.35, ymin: -1.3, ymax: 9.4, ratio: [0.95, 0.6] }); // 端の目盛の数字が切れないよう少し広めに
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\blue{a}', min: 0.2, max: 4, step: 0.1, value: 2, color: 'primary' });
    const aTeX = (a) => (a < 1 ? '(' + num(a) + ')' : num(a));
    function update() {
      const a = sa.get();
      tex(root, 'eq', 'y=' + C('blue', aTeX(a)) + '^x');
      tex(root, 'mul', 'y\\ \\text{は}\\ \\times' + C('blue', num(a)) + '\\ \\text{倍}');
      R(root, 'kind').textContent = a > 1 ? '右上がり（a > 1：かけるたびに大きくなる）' : a < 1 ? '右下がり（0 < a < 1：かけるたびに小さくなる）' : 'a = 1：何回かけても 1。水平な直線 y = 1（指数関数では a ≠ 1 とする）';
      plot.invalidate();
    }
    sa.on(update);
    plot.draw = function (g) {
      const c = g.c, a = sa.get(), f = (x) => Math.pow(a, x);
      g.grid({ xlabel: 'x', ylabel: 'y' });
      g.fn(f, { color: c.primary, width: 4 });
      // 階段：x が 1 増えるごとに ×a
      const pxY = g.h / (g.ymax - g.ymin);
      for (let k = -4; k < 4; k++) {
        const y0 = f(k), y1 = f(k + 1);
        if (Math.max(y0, y1) > g.ymax) continue;
        g.line(k, y0, k + 1, y0, { color: c.text, width: 1.5, alpha: 0.55 });
        if (Math.abs(y1 - y0) * pxY > 10) g.arrow(k + 1, y0, k + 1, y1, { color: c.teal, width: 2.5 });
        else g.line(k + 1, y0, k + 1, y1, { color: c.teal, width: 2.5 });
        if (Math.abs(y1 - y0) * pxY > 22 && k >= -3) g.tex('\\times' + num(a), k + 1, (y0 + y1) / 2, { dx: 5, size: 13, color: c.teal });
      }
      for (let k = -4; k <= 4; k++) if (f(k) <= g.ymax) g.dot(k, f(k), { r: 4, color: c.primary });
      g.dot(0, 1, { r: 6, color: c.text });
      g.tex('(0,\\,1)', 0, 1, { dx: -8, dy: a >= 1 ? -14 : 14, align: 'right', size: 13 });
      // 曲線の近くに式
      const lab = 'y=' + aTeX(a) + '^x';
      if (a === 1) g.tex(lab, 2.6, 1, { dy: -16, align: 'center', size: 16, color: c.primary });
      else {
        const yy = 6.5, x = clamp(Math.log(yy) / Math.log(a), -3.6, 3.6), y = f(x);
        // 階段のない側（グラフの左側）に置く
        g.tex(lab, x, Math.min(y, g.ymax - 0.6), { dx: -10, dy: a > 1 ? 0 : 10, align: 'right', size: 16, color: c.primary });
      }
    };
    update();
  }

  /* ==========================================================
     2.2(1) 指数関数のグラフと平行移動
     ========================================================== */
  function initExpGraph() {
    const root = $id('w-expgraph');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5.4, xmax: 5.4, ymin: -3.3, ymax: 9.3, ratio: [0.9, 0.62] }); // 端の目盛の数字が切れないよう少し広めに
    const st = { mirror: false, steps: true };
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\blue{a}', min: 0.2, max: 4, step: 0.1, value: 2, color: 'primary' });
    const sp = slider(ctl, { tex: '\\teal{p}', min: -4, max: 4, step: 0.5, value: 0, color: 'teal' });
    const sq = slider(ctl, { tex: '\\red{q}', min: -3, max: 3, step: 0.5, value: 0, color: 'accent' });
    const row = el('div', 'btn-row');
    row.innerHTML = '<label class="check"><input type="checkbox" data-r="mirror">$y=\\left(\\frac1a\\right)^x$ も表示</label><label class="check"><input type="checkbox" data-r="steps" checked>$\\times a$ の階段を表示</label>';
    ctl.append(row);
    typeset(row);
    R(root, 'mirror').addEventListener('change', (e) => { st.mirror = e.target.checked; plot.invalidate(); });
    R(root, 'steps').addEventListener('change', (e) => { st.steps = e.target.checked; plot.invalidate(); });
    const f = (x) => Math.pow(sa.get(), x - sp.get()) + sq.get();
    function update() {
      const a = sa.get(), p = sp.get(), q = sq.get();
      const ex = 'x' + (p === 0 ? '' : (p > 0 ? '-' : '+') + C('teal', num(Math.abs(p))));
      tex(root, 'eq', 'y=' + C('blue', num(a)) + '^{' + ex + '}' + (q === 0 ? '' : (q > 0 ? '+' : '-') + C('red', num(Math.abs(q)))));
      R(root, 'kind').textContent = a > 1 ? '右上がり（x が 1 増えると、y − q は ' + num(a) + ' 倍）' : a < 1 ? '右下がり（x が 1 増えると、y − q は ' + num(a) + ' 倍＝小さくなる）' : 'a = 1 では y = 1 + q の水平な直線（指数関数では a ≠ 1 とする）';
      tex(root, 'pt', '(' + C('teal', 'p') + ',\\ ' + C('red', 'q') + '+1)=(' + num(p) + ',\\ ' + num(q + 1) + ')');
      tex(root, 'asym', 'y=' + C('red', num(q)));
      plot.invalidate();
    }
    [sa, sp, sq].forEach((s) => s.on(update));
    plot.draw = function (g) {
      const c = g.c, a = sa.get(), p = sp.get(), q = sq.get();
      g.grid({ xlabel: 'x', ylabel: 'y' });
      g.line(g.xmin, q, g.xmax, q, { color: c.accent, width: 1.8, dash: [6, 6], alpha: 0.7 });
      // q = 0 のときは x 軸の目盛の数字より下に置く
      g.tex('\\text{漸近線 }y=' + num(q), g.xmax, q, { dx: -12, dy: q === 0 ? 30 : g.Y(q) + 26 > g.h ? -15 : 15, align: 'right', size: 14, color: c.accent });
      if (st.mirror) g.fn((x) => Math.pow(a, -(x - p)) + q, { color: c.muted, width: 2.5, dash: [7, 6] });
      g.fn(f, { color: c.primary, width: 4 });
      if (st.steps && a !== 1) {
        for (let k = 0; k < 3; k++) {
          const x0 = p + k, y0 = f(x0), y1 = f(x0 + 1);
          if (y1 > g.ymax || y0 > g.ymax) break;
          g.line(x0, y0, x0 + 1, y0, { color: c.text, width: 1.5, alpha: 0.6 });
          g.line(x0 + 1, y0, x0 + 1, y1, { color: c.teal, width: 3 });
          g.tex('\\times' + num(a), x0 + 1, (y0 + y1) / 2, { dx: 6, size: 14, color: c.teal });
        }
      }
      g.dot(p, q + 1, { r: 6, color: c.text });
      g.tex('(' + num(p) + ',\\,' + num(q + 1) + ')', p, q + 1, { dx: -10, dy: -13, align: 'right', size: 14 });
    };
    update();
  }

  /* ==========================================================
     2.2(2) 指数関数 vs 多項式
     ========================================================== */
  function initExpRace() {
    const root = $id('w-exprace');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 12, ymin: 0, ymax: 10, ratio: [0.8, 0.5] });
    const st = { k: 2, log: false };
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: 'x', min: 4, max: 70, step: 1, value: 12, color: 'primary', fmt: (v) => '〜' + v, aria: '表示する x の範囲' });
    chipRow(R(root, 'rivals'), [{ label: 'x²', k: 2 }, { label: 'x³', k: 3 }, { label: 'x¹⁰', k: 10 }], 0, (it) => { st.k = it.k; update(); });
    R(root, 'log').addEventListener('change', (e) => { st.log = e.target.checked; update(); });
    // 2^x が x^k を最後に追い抜く点: x log2 − k log x = 0 の大きいほうの解
    function crossing(k) {
      const g = (x) => x * Math.LN2 - k * Math.log(x);
      let lo = k / Math.LN2, hi = 400;
      for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (g(m) < 0) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
    function update() {
      const X = sX.get(), k = st.k, xs = crossing(k);
      let mx = 0;
      for (let i = 0; i <= 200; i++) { const x = (X * i) / 200; mx = Math.max(mx, Math.pow(2, x), Math.pow(x, k)); }
      if (st.log) { const top = Math.log10(mx) * 1.06 + 0.5; plot.setView({ xmin: 0, xmax: X, ymin: -Math.max(1, top * 0.1), ymax: top }); } // 下は目盛の数字のぶん空ける
      else plot.setView({ xmin: 0, xmax: X, ymin: -mx * 0.1, ymax: mx * 1.08 }); // 下は目盛の数字のぶん空ける(線と重ならないように)
      R(root, 'cross').innerHTML = '$x>' + num(xs, 2) + '$ では、ずっと $2^x$ の方が大きい（$x^{' + k + '}$ を追い抜く）' + (xs > X ? '　→ 範囲を広げて確かめよう' : '');
      typeset(R(root, 'cross'));
      tex(root, 'vals', '2^{' + X + '}=' + sciTeX(Math.pow(2, X)) + ',\\quad ' + X + '^{' + k + '}=' + sciTeX(Math.pow(X, k)));
      plot.invalidate();
    }
    sX.on(update);
    plot.draw = function (g) {
      const c = g.c, k = st.k, X = sX.get(), T = st.log ? (v) => Math.log10(v) : (v) => v;
      const sx = niceStep(X / 8);
      // 対数目盛の数字は 24px 以上あける(狭い画面で重ならないように)
      const ly = [1, 2, 5, 10, 20].find((d) => d * g.h / (g.ymax - g.ymin) >= 24) || 20;
      const sy = st.log ? ly : niceStep((g.ymax - g.ymin) / 5);
      g.grid({ stepX: sx, stepY: st.log ? 1 : sy, labels: false, xlabel: 'x' }); // 対数目盛の線は 1 目盛 = ×10 のまま(数字だけ間引く)
      for (let x = 0; x <= X + 1e-9; x += sx) { const ed = x === 0 ? 'left' : x > X - 1e-9 ? 'right' : 'center'; g.text(String(Math.round(x)), x, g.ymin, { dy: -10, align: ed, dx: ed === 'left' ? 3 : ed === 'right' ? -3 : 0, size: 11, color: c.muted }); }
      // 縦軸の目盛の数値（対数目盛では 1, 10, 100, … = 10^k）
      const linTeX = (v) => {
        if (v < 1e5) return Math.round(v).toLocaleString('ja-JP').replace(/,/g, '{,}');
        const e = Math.floor(Math.log10(v) + 1e-9), m = Math.round((v / Math.pow(10, e)) * 10) / 10;
        return (m === 1 ? '' : num(m) + '\\times') + '10^{' + e + '}';
      };
      const yLab = st.log ? (y) => (y === 0 ? '1' : y <= 3 ? String(Math.pow(10, y)) : '10^{' + y + '}') : linTeX;
      for (let i = 1; i * sy <= g.ymax + 1e-9; i++) {
        const y = i * sy;
        if (g.Y(y) < 12) continue;
        g.tex(yLab(y), 0, y, { dx: 5, size: 11.5, color: c.muted });
      }
      if (st.log) g.tex('1', 0, 0, { dx: 5, size: 11.5, color: c.muted });
      g.fn((x) => T(Math.pow(2, x)), { x0: 0, x1: X, color: c.primary, width: 4, samples: 300 });
      g.fn((x) => T(Math.pow(x, k)), { x0: 1e-3, x1: X, color: c.teal, width: 3, samples: 300 });
      const xs = crossing(k);
      if (xs <= X) { g.line(xs, g.ymin, xs, g.ymax, { color: c.amber, width: 1.8, dash: [6, 5] }); g.tex('\\text{追い抜く }x\\approx' + num(xs, 2), xs, g.ymax, { dx: -6, dy: 44, align: 'right', size: 14, color: c.amber }); }
      // 曲線の近くに式（青＝2^x、緑＝x^k）
      // 曲線・他のラベルと重ならない場所を候補から探す
      const fb = (x) => g.Y(T(Math.pow(2, x))), fg = (x) => g.Y(T(Math.pow(x, k)));
      const pts = [];
      for (let i = 1; i <= 160; i++) { const x = (X * i) / 160; pts.push([g.X(x), fb(x)], [g.X(x), fg(x)]); }
      const boxes = [[g.w - 230, 0, g.w, 26]];
      if (xs <= X) boxes.push([g.X(xs) - 150, 30, g.X(xs) + 4, 66]);
      const hit = (r) => r[0] < 4 || r[2] > g.w - 4 || r[1] < 4 || r[3] > g.h - 20 ||
        pts.some((p) => p[0] > r[0] - 3 && p[0] < r[2] + 3 && p[1] > r[1] - 3 && p[1] < r[3] + 3) ||
        boxes.some((b) => r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1]);
      function place(str, f, wpx, color) {
        const W = wpx, H = 22;
        for (const fr of [0.86, 0.72, 0.6, 0.48, 0.36, 0.24]) {
          const x = X * fr, px = g.X(x), py = f(x);
          if (py < 0 || py > g.h) continue;
          for (const [sx2, sy2] of [[-1, -1], [1, 1], [1, -1], [-1, 1]]) {
            const x0 = sx2 < 0 ? px - 8 - W : px + 8, y0 = sy2 < 0 ? py - 8 - H : py + 8;
            const r = [x0, y0, x0 + W, y0 + H];
            if (hit(r)) continue;
            boxes.push(r);
            g.texPx(str, x0, y0 + H / 2, { size: 16, color });
            return;
          }
        }
      }
      place('y=2^x', fb, 50, c.primary);
      place('y=x^{' + k + '}', fg, k >= 10 ? 60 : 52, c.teal);
      if (st.log) g.texPx('\\text{縦軸：対数目盛（1目盛ごとに }{\\times}10\\text{）}', g.w - 10, 16, { align: 'right', size: g.w < 480 ? 12 : 13.5, color: c.text });
    };
    update();
  }

  /* ==========================================================
     2.2(3) チャレンジ：指数関数でコインを集めろ
     ========================================================== */
  const EXPC_STAGES = [
    { text: '3枚のコインを集めよう。', coins: [[0, 1], [1, 2], [3, 8]], hint: '(0, 1) を通っていて、x が 1 増えると y が 2 倍。',
      answer: '<b>a = 2, p = 0, q = 0</b><br>$y=2^x$。$x=0$ で $1$、$x=1$ で $2$、$x=3$ で $8$。' },
    { text: '3枚のコインを集めよう。', coins: [[-1, 1 / 3], [0, 1], [2, 9]], hint: 'x が 1 増えると y は何倍？ 1/3 → 1 を見よう。',
      answer: '<b>a = 3, p = 0, q = 0</b><br>$y=3^x$。$3^{-1}=\\frac13,\\ 3^0=1,\\ 3^2=9$。' },
    { text: '右下がりの指数関数で、3枚のコインを集めよう。', coins: [[-3, 8], [-1, 2], [1, 0.5]], hint: 'x が 2 増えると y は 1/4 倍。では 1 増えると？',
      answer: '<b>a = 0.5, p = 0, q = 0</b><br>$y=\\left(\\frac12\\right)^x=2^{-x}$。$x=-3$ で $8$、$x=1$ で $\\frac12$。' },
    { text: '平行移動した指数関数で、3枚のコインを集めよう。', coins: [[2, 0.5], [3, 1], [5, 4]], hint: 'y = 1 になるのはどの x？ そこが「(p, q+1)」の点。',
      answer: '<b>a = 2, p = 3, q = 0</b><br>$y=2^{x-3}$（$y=2^x$ を $x$ 方向に 3 平行移動）。$(3,\\ 1)$ を通る。' },
    { text: '上下にも平行移動した指数関数で、3枚のコインを集めよう。', coins: [[0, -1.5], [1, -1], [3, 2]], hint: '漸近線 y = q を予想しよう。y − q が倍々になっているはず。',
      answer: '<b>a = 2, p = 1, q = −2</b><br>$y=2^{x-1}-2$。$y+2$ が $\\frac12,\\ 1,\\ 4$ と倍々。点 $(1,\\ -1)$ が $(p,\\ q+1)$。' },
  ];
  function initGameExpCoin() {
    const root = $id('w-game-expcoin');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 6.4, ymin: -3, ymax: 9.5, ratio: [0.9, 0.62] });
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\blue{a}', min: 0.5, max: 4, step: 0.5, value: 1.5, color: 'primary' });
    const sp = slider(ctl, { tex: '\\teal{p}', min: -4, max: 4, step: 1, value: 0, color: 'teal' });
    const sq = slider(ctl, { tex: '\\red{q}', min: -4, max: 4, step: 1, value: 0, color: 'accent' });
    const B = gameButtons(ctl, '🎯 発射');
    const conf = Confetti(root, plot);
    const st = { shots: [], cur: null, aim: true };
    aimToggle(ctl, (v) => { st.aim = v; plot.invalidate(); });
    const f = (s, x) => Math.pow(s.a, x - s.p) + s.q;
    const on = (s, c) => Math.abs(f(s, c[0]) - c[1]) <= 0.15;
    const cur = () => ({ a: sa.get(), p: sp.get(), q: sq.get() });
    let game = null;
    game = GameShell(root, { key: '2-2:game', stages: EXPC_STAGES,
      formula: function () {
        const s = cur(), ex = 'x' + (s.p === 0 ? '' : (s.p > 0 ? '-' : '+') + C('teal', Math.abs(s.p)));
        return '\\begin{aligned}&y=' + C('blue', num(s.a)) + '^{' + ex + '}' + (s.q === 0 ? '' : (s.q > 0 ? '+' : '-') + C('red', Math.abs(s.q))) + '\\\\' +
          '&\\text{通る点 }(' + C('teal', s.p) + ',\\ ' + C('red', s.q) + '+1)\\\\' +
          '&x\\text{ が 1 増えると}\\\\&\\quad y-' + C('red', s.q) + '\\text{ は } ' + C('blue', num(s.a)) + '\\text{ 倍}\\end{aligned}';
      },
      onStage() { st.shots = []; st.cur = null; B.bMain.disabled = false; B.bNext.hidden = true; plot.invalidate(); } });
    [sa, sp, sq].forEach((s) => s.on(() => { game.formula(); plot.invalidate(); }));
    const sweep = Sweep(root, plot, 0.7, function () {
      const S = EXPC_STAGES[game.k], s = st.cur, hit = S.coins.filter((c) => on(s, c)).length;
      st.shots.push(s); game.used++; game.renderThrows();
      if (hit === S.coins.length) {
        const n = 4 - game.used; game.award(n); game.done = true;
        game.result('🪙 コインをすべて集めた！ ' + starStr(n) + '（' + game.used + ' 回目）' + (s.aim ? '' : '　👑 照準なしで命中！'), 'hit');
        B.bMain.disabled = true; B.bNext.hidden = game.k >= EXPC_STAGES.length - 1;
        conf.fire(plot.X(S.coins[1][0]), plot.Y(S.coins[1][1]));
      } else {
        let m = 'コイン ' + S.coins.length + ' 枚のうち ' + hit + ' 枚を集めた。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      st.cur = null;
    });
    B.bMain.addEventListener('click', function () {
      if (st.cur || game.done || game.used >= 3) return;
      st.cur = Object.assign(cur(), { aim: st.aim }); game.result('…'); sweep.start();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, EXPC_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, S = EXPC_STAGES[game.k];
      g.grid({ xlabel: 'x', ylabel: 'y' });
      st.shots.forEach((s) => g.fn((x) => f(s, x), { color: c.muted, width: 2, dash: [6, 5], alpha: 0.7 }));
      if (st.cur) g.fn((x) => f(st.cur, x), { x0: g.xmin, x1: g.xmin + (g.xmax - g.xmin) * sweep.st.p, color: c.primary, width: 4 });
      if (st.aim && !st.cur && !game.done) {
        const s = cur();
        g.line(g.xmin, s.q, g.xmax, s.q, { color: c.accent, width: 1.5, dash: [3, 5], alpha: 0.7 });
        g.fn((x) => f(s, x), { color: c.primary, width: 2.5, dash: [8, 7], alpha: 0.75 });
        g.dot(s.p, s.q + 1, { r: 6, color: c.text });
        // コインと同じ点にあるときは、コインの座標ラベルと重なるので省く
        if (!S.coins.some((p) => Math.abs(p[0] - s.p) < 0.3 && Math.abs(p[1] - s.q - 1) < 0.6)) g.tex('(p,\\,q+1)', s.p, s.q + 1, { dx: -8, dy: -13, align: 'right', size: 14, avoid: true });
        S.coins.forEach((p) => gapMark(g, p[0], f(s, p[0]), p[1], p[0] <= s.p));
      }
      const last = st.shots[st.shots.length - 1];
      S.coins.forEach(function (p) {
        const got = last && on(last, p);
        g.dot(p[0], p[1], { r: 11, color: got ? c.teal : c.amber });
        g.text(got ? '✓' : '¥', p[0], p[1], { align: 'center', size: 13, bold: true, color: '#fff', halo: false });
        // コインの真上に置く(横には照準の「あと ○」ラベルが出るため)。重なったら上下にずらす
        g.tex('(' + p[0] + ',\\,' + fracTeX(p[1], 4) + ')', p[0], p[1], { dy: -24, align: 'center', size: 13, color: c.muted, avoid: true });
      });
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     2.3 倍々ゲーム：折り紙・バイバイン
     ========================================================== */
  const LEN_MARKS = [ // [名前, 長さ(mm), 絵文字, 画像]
    ['紙1枚', 0.1, '📄', 'paper.png'], ['人の身長', 1700, '🧍'], ['スカイツリー', 6.34e5, '🗼', 'skytree.png'], ['富士山', 3.776e6, '🗻'],
    ['エベレスト', 8.849e6, '⛰', 'everest.png'], ['成層圏の上', 5e7, '🌫', 'stratosphere.png'], ['宇宙ステーション', 4e8, '🛰'], ['月', 3.8e11, '🌕', 'moon.png'], ['太陽', 1.5e14, '☀️'],
  ];
  const VOL_MARKS = [ // [名前, 体積(m³), 絵文字, 画像]
    ['栗まんじゅう1個', 1e-4, '🌰', 'manju.png'], ['東京ドーム', 1.24e6, '🏟', 'dome.png'], ['琵琶湖', 2.75e10, '🏞', 'lake.png'], ['地球', 1.08e21, '🌍', 'earth.png'],
    ['太陽', 1.41e27, '☀️', 'sun.png'], ['太陽系', 3.8e38, '🪐', 'solar_system.png'], ['天の川銀河', 8e60, '🌌', 'galaxy.png'], ['宇宙(とする)', 4e80, '✨', 'universe.png'],
  ];
  function lastPassed(marks, v) { let r = -1; marks.forEach((m, i) => { if (v >= m[1]) r = i; }); return r; }
  // 「いま超えたもの」の絵(画像があれば画像、なければ大きな絵文字)
  function setPic(box, mark, pop) {
    box.innerHTML = mark[3] ? '<img src="images/' + mark[3] + '" alt="' + mark[0] + '">' : '<div class="emoji-pic">' + mark[2] + '</div>';
    if (pop) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
  }
  function showBanner(el0, text) { el0.textContent = text; el0.hidden = false; el0.classList.remove('pop'); void el0.offsetWidth; el0.classList.add('pop'); }

  function initOrigami() {
    const root = $id('w-origami');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 15, ymin: 0, ymax: 1, ratio: [0.62, 0.24] });
    const ctl = root.querySelector('.controls');
    const sn = slider(ctl, { tex: 'n', min: 0, max: 55, step: 1, value: 0, color: 'amber', fmt: (v) => v + ' 回', aria: '折った回数' });
    const row = el('div', 'btn-row');
    row.style.marginTop = '8px';
    const b1 = el('button', 'btn primary', '📄 1回折る'), b10 = el('button', 'btn', '10回折る'), bAuto = el('button', 'btn', '▶ 自動で折る'), b0 = el('button', 'btn', 'リセット');
    [b1, b10, bAuto, b0].forEach((b) => { b.type = 'button'; row.append(b); });
    ctl.append(row);
    const st = { auto: false, acc: 0, i: -1, reached: false };
    const paper = R(root, 'paper'), banner = R(root, 'banner');
    const mm = () => 0.1 * Math.pow(2, sn.get());
    function update(folded) {
      const n = sn.get(), t = mm(), i = lastPassed(LEN_MARKS, t), nx = LEN_MARKS[i + 1];
      R(root, 'n').textContent = n;
      R(root, 'human').textContent = lenTxt(t);
      // 6回(64枚)までは1枚ずつ線で描く。それ以上は縮小して描き、縮尺を表示
      const shown = Math.min(n, 6), layers = Math.pow(2, shown);
      paper.style.height = (layers * 2.2 + 2) + 'px';
      paper.style.backgroundSize = '100% ' + (n <= 6 ? 2.2 : 2.2 / Math.pow(2, n - 6)) + 'px';
      paper.classList.toggle('dense', n > 6);
      R(root, 'scale').textContent = n > 6 ? '🔍 縮小表示：実際は この絵の ' + Math.pow(2, n - 6).toLocaleString('ja-JP') + ' 倍の厚さ' : '';
      const lc = (2n ** BigInt(n)).toString();
      R(root, 'layers').textContent = lc.length <= 12 ? Number(lc).toLocaleString('ja-JP') : lc[0] + '.' + lc.slice(1, 3) + '×10' + sup(lc.length - 1);
      R(root, 'layersTx').textContent = '2' + sup(n) + ' 枚';
      if (folded) { paper.classList.remove('fold'); void paper.offsetWidth; paper.classList.add('fold'); }
      if (i !== st.i) { setPic(R(root, 'pic'), LEN_MARKS[i], st.i >= 0 && i > st.i); st.i = i; }
      R(root, 'cap').textContent = n === 0 ? '紙1枚ぶん' : i === 0 ? '紙 ' + Math.pow(2, n) + ' 枚ぶん（まだ手のひらサイズ）' : LEN_MARKS[i][0] + 'を超えた！';
      R(root, 'next').textContent = nx ? '次は ' + nx[2] + ' ' + nx[0] + '（' + lenTxt(nx[1]) + '）まで あと ' + (Math.ceil(Math.log2(nx[1] / 0.1)) - n) + ' 回' : 'もう太陽まで届いた！';
      tex(root, 'thick', '0.1\\times2^{' + n + '}\\ \\text{mm}=' + sciTeX(t) + '\\ \\text{mm}');
      R(root, 'reach').textContent = i >= 1 ? LEN_MARKS[i][2] + ' ' + LEN_MARKS[i][0] + 'を超えた' : '紙 ' + Math.pow(2, n) + ' 枚分';
      if (t >= 3.8e11 && !st.reached) { st.reached = true; showBanner(banner, '🌕 月に到達しました！ たった ' + n + ' 回折っただけで、厚さが 38 万 km を超えた！'); }
      if (t < 3.8e11) { st.reached = false; banner.hidden = true; }
      plot.invalidate();
    }
    sn.on(() => update(false));
    const step = (k) => { sn.set(clamp(sn.get() + k, 0, 55)); update(true); };
    b1.addEventListener('click', () => step(1));
    b10.addEventListener('click', () => step(10));
    b0.addEventListener('click', () => { st.auto = false; bAuto.textContent = '▶ 自動で折る'; sn.set(0); update(false); });
    const anim = L.animate(root, function (dt) {
      if (!st.auto) return false;
      st.acc += dt;
      if (st.acc > 0.32) { st.acc = 0; step(1); if (sn.get() >= 42) { st.auto = false; bAuto.textContent = '▶ 自動で折る'; return false; } }
      return true;
    });
    bAuto.addEventListener('click', function () { if (sn.get() >= 42) sn.set(0); st.auto = !st.auto; bAuto.textContent = st.auto ? '⏸ 止める' : '▶ 自動で折る'; anim.kick(); });
    plot.draw = function (g) {
      const c = g.c;
      drawLogRuler(g, LEN_MARKS, lenRulerOpt(g, { avoid: [Math.log10(mm())] }));
      rulerMarker(g, Math.log10(mm()), '紙の厚さ（' + sn.get() + '回）', c.amber, lenY(g));
      g.texPx('\\text{対数目盛：1目盛ごとに 10 倍（単位 }\\mathrm{mm}\\text{）}', 10, 15, { size: 13, color: c.muted });
    };
    update(false);
  }

  function initBaibain() {
    const root = $id('w-baibain');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 82, ymin: 0, ymax: 1, ratio: [0.5, 0.24] });
    const ctl = root.querySelector('.controls');
    const stt = slider(ctl, { tex: 't', min: 0, max: 1500, step: 5, value: 0, color: 'amber', fmt: (v) => v + ' 分', aria: '経過時間（分）' });
    const row = el('div', 'btn-row');
    row.style.marginTop = '8px';
    const bp = el('button', 'btn primary', '▶ 時間を進める'), b0 = el('button', 'btn', 'リセット');
    [bp, b0].forEach((b) => { b.type = 'button'; row.append(b); });
    ctl.append(row);
    const st = { play: false, acc: 0, rain: 0, i: -1, done: false };
    const rain = R(root, 'rain'), banner = R(root, 'banner');
    const lv = () => -4 + (stt.get() / 5) * LOG2; // 体積の log10
    function update() {
      const t = stt.get(), n = t / 5, c = (2n ** BigInt(n)).toString();
      R(root, 'time').textContent = t < 60 ? t + '分' : Math.floor(t / 60) + '時間' + (t % 60) + '分';
      R(root, 'count').textContent = (c.length <= 13 ? Number(c).toLocaleString('ja-JP') : c[0] + '.' + c.slice(1, 3) + '×10' + sup(c.length - 1)) + ' 個';
      R(root, 'digits').textContent = '栗まんじゅうの数（' + c.length + ' 桁の数）';
      tex(root, 'countTex', '2^{' + n + '}\\ \\text{個}');
      // 小さいうちは小数でちょうど表せるので「=」(以前は 0 と表示されていた)
      tex(root, 'vol', '10^{-4}\\times2^{' + n + '}' + (lv() < 7 ? '=' + sciTeX(1e-4 * Math.pow(2, n), 4) : '\\approx' + sciFromLog(lv())) + '\\ \\mathrm{m^3}');
      const i = lastPassed(VOL_MARKS, Math.pow(10, Math.min(lv(), 300))), nx = VOL_MARKS[i + 1];
      if (i !== st.i) { setPic(R(root, 'pic'), VOL_MARKS[i], st.i >= 0 && i > st.i); st.i = i; }
      R(root, 'cap').textContent = i === 0 ? 'まだ栗まんじゅう1個ぶん' : VOL_MARKS[i][0] + 'を埋め尽くす量！';
      R(root, 'next').textContent = nx ? '次は ' + nx[2] + ' ' + nx[0] + ' まで あと ' + Math.max(0, Math.ceil(Math.log2(nx[1] / 1e-4)) * 5 - t) + ' 分' : '';
      if (t >= 1410 && !st.done) { st.done = true; showBanner(banner, '🌌 宇宙が栗まんじゅうで埋まりました！ かかった時間は、たった 23 時間 30 分'); }
      if (t < 1410) { st.done = false; banner.hidden = true; }
      plot.invalidate();
    }
    // 栗まんじゅうを降らせる(埋め尽くしたものが大きいほどたくさん)
    function drop() {
      if (rain.childElementCount > 70) return;
      const m = el('img', 'drop');
      m.src = 'images/manju.png'; m.alt = '';
      m.style.left = (Math.random() * 96) + '%';
      m.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
      const s = 18 + Math.random() * 18; m.style.width = s + 'px';
      m.addEventListener('animationend', () => m.remove());
      rain.append(m);
    }
    stt.on(update);
    b0.addEventListener('click', () => { st.play = false; bp.textContent = '▶ 時間を進める'; stt.set(0); rain.innerHTML = ''; update(); });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.acc += dt; st.rain += dt;
      while (st.acc > 0.07) { st.acc -= 0.07; stt.set(Math.min(1500, stt.get() + 5)); }
      const every = Math.max(0.03, 0.5 - Math.max(0, st.i) * 0.065);
      while (st.rain > every) { st.rain -= every; drop(); }
      update();
      if (stt.get() >= 1410) { st.play = false; bp.textContent = '▶ 時間を進める'; for (let k = 0; k < 40; k++) setTimeout(drop, k * 40); return false; }
      return true;
    });
    bp.addEventListener('click', function () { if (stt.get() >= 1410) { stt.set(0); rain.innerHTML = ''; } st.play = !st.play; bp.textContent = st.play ? '⏸ 止める' : '▶ 時間を進める'; anim.kick(); });
    plot.draw = function (g) {
      const c = g.c;
      drawLogRuler(g, VOL_MARKS, volRulerOpt(g, { avoid: [lv()] }));
      rulerMarker(g, lv(), '栗まんじゅう全体', c.amber, volY(g));
      g.texPx(g.w < 520 ? '\\text{対数目盛（}\\mathrm{m^3}\\text{）：数字は }10^{20}\\text{ ごと}' : '\\text{対数目盛（単位 }\\mathrm{m^3}\\text{）：目盛は 10 倍ずつ、数字は }10^{10}\\text{ ごと}', 10, 15, { size: 13, color: c.muted });
    };
    update();
  }

  /* ==========================================================
     2.3(3) チャレンジ：予想して確かめよう
     ========================================================== */
  const PRED_STAGES = [
    { name: '富士山', kind: 'fold', mm: 3.776e6, ans: 26, max: 60, step: 1, unit: '回', tol: [0, 1, 3],
      text: '厚さ 0.1 mm の紙を何回折ると、🗻 富士山（3,776 m）の高さを超える？' },
    { name: '宇宙ステーション', kind: 'fold', mm: 4e8, ans: 32, max: 60, step: 1, unit: '回', tol: [0, 1, 3],
      text: '何回折ると、🛰 国際宇宙ステーション（高度 約 400 km）に届く？' },
    { name: '月', kind: 'fold', mm: 3.8e11, ans: 42, max: 60, step: 1, unit: '回', tol: [0, 1, 3],
      text: '何回折ると、🌕 月（約 38万 km）に届く？' },
    { name: '太陽', kind: 'fold', mm: 1.5e14, ans: 51, max: 60, step: 1, unit: '回', tol: [0, 1, 3],
      text: '何回折ると、☀️ 太陽（約 1.5億 km）に届く？' },
    { name: 'バイバイン', kind: 'bai', ans: 23.5, max: 48, step: 0.5, unit: '時間', tol: [0.5, 2, 6],
      text: 'バイバインをかけた栗まんじゅう（100 cm³）が、🌌 宇宙（4×10⁸⁰ m³ とする）を埋め尽くすのは何時間後？' },
  ];
  PRED_STAGES.forEach(function (S) {
    S.hint = S.kind === 'fold' ? '厚さが 0.1 × 2ⁿ mm。2¹⁰ ≈ 1000（10³）なので、10 回折るごとに約 1000 倍になる。' :
      '5 分で 2 倍 → 1 時間で 2¹² 倍 ≈ 4000 倍。必要な倍率は 4×10⁸⁰ ÷ 10⁻⁴ = 4×10⁸⁴ 倍。';
    S.answer = S.kind === 'fold' ?
      '<b>' + S.ans + ' 回</b><br>$0.1\\times2^n\\geqq' + sciTeX(S.mm) + '$ より $2^n\\geqq' + sciTeX(S.mm / 0.1) + '$。両辺の $\\log_{10}$ をとると $n\\geqq\\dfrac{' + num(Math.log10(S.mm / 0.1), 2) + '}{0.3010}\\approx' + num(Math.log10(S.mm / 0.1) / LOG2, 1) + '$ なので ' + S.ans + ' 回。' :
      '<b>約 23.5 時間（1410 分）</b><br>$10^{-4}\\times2^n\\geqq4\\times10^{80}$ より $2^n\\geqq4\\times10^{84}$。$n\\geqq\\log_2 4+84\\log_2 10\\approx2+279.0=281.0$ なので 282 回分の 2 倍。$282\\times5=1410$ 分 $=23.5$ 時間。';
  });
  function initGamePredict() {
    const root = $id('w-game-predict');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 15, ymin: 0, ymax: 1, ratio: [0.72, 0.3] });
    const ctl = root.querySelector('.controls');
    const sg = slider(ctl, { tex: '\\text{予想}', min: 0, max: 60, step: 1, value: 20, color: 'amber', aria: '予想' });
    const B = gameButtons(ctl, '✅ 決定');
    const conf = Confetti(root, plot);
    const st = { shown: null };
    const S = () => PRED_STAGES[game.k];
    const game = GameShell(root, { key: '2-3:game', stages: PRED_STAGES, max: 1, idle: 'まだ予想していません',
      formula: () => '\\text{あなたの予想：}' + num(sg.get(), 1) + '\\ \\text{' + S().unit + '}',
      onStage(k, s) {
        st.shown = null; B.bMain.disabled = false; B.bNext.hidden = true;
        sg.input.max = s.max; sg.input.step = s.step; sg.set(clamp(sg.get(), 0, s.max));
        if (s.kind === 'bai') plot.setView({ xmin: -5, xmax: 82 }); else plot.setView({ xmin: -1.6, xmax: 15 });
        plot.invalidate();
      } });
    sg.on(() => game.formula());
    B.bMain.addEventListener('click', function () {
      if (st.shown) return;
      const g = sg.get(), s = S(), e = Math.abs(g - s.ans);
      st.shown = { g }; game.used = 1; game.renderThrows();
      const n = e <= s.tol[0] ? 3 : e <= s.tol[1] ? 2 : e <= s.tol[2] ? 1 : 0;
      if (n) game.award(n);
      game.result((n === 3 ? '🎯 ぴったり！ ' : n ? 'おしい！ ' : '予想とかなり違った！ ') + starStr(n) + '　正解は ' + s.ans + ' ' + s.unit + '（あなたの予想：' + g + ' ' + s.unit + '）', n ? 'hit' : 'miss');
      B.bMain.disabled = true; B.bNext.hidden = game.k >= PRED_STAGES.length - 1;
      if (n === 3) conf.fire(plot.w / 2, plot.h / 2);
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, PRED_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, s = S();
      if (s.kind === 'fold') {
        const ti = LEN_MARKS.findIndex((m) => m[1] === s.mm);
        drawLogRuler(g, LEN_MARKS, lenRulerOpt(g, { target: ti, avoid: st.shown ? [Math.log10(0.1 * Math.pow(2, st.shown.g)), Math.log10(0.1 * Math.pow(2, s.ans))] : [] }));
        if (st.shown) {
          rulerMarker(g, Math.log10(0.1 * Math.pow(2, st.shown.g)), 'あなた：' + st.shown.g + '回', c.accent, lenY(g));
          rulerMarker(g, Math.log10(0.1 * Math.pow(2, s.ans)), '正解：' + s.ans + '回', c.teal, lenY(g), 52);
        }
        g.texPx('\\text{対数目盛（単位 }\\mathrm{mm}\\text{）}', 10, 15, { size: 13, color: c.muted });
      } else {
        drawLogRuler(g, VOL_MARKS, volRulerOpt(g, { target: VOL_MARKS.length - 1, avoid: st.shown ? [-4 + (st.shown.g * 12) * LOG2, -4 + (s.ans * 12) * LOG2] : [] }));
        if (st.shown) {
          rulerMarker(g, -4 + (st.shown.g * 12) * LOG2, 'あなた：' + st.shown.g + '時間後', c.accent, volY(g));
          rulerMarker(g, -4 + (s.ans * 12) * LOG2, '正解：' + s.ans + '時間後', c.teal, volY(g), 52);
        }
        g.texPx('\\text{対数目盛（単位 }\\mathrm{m^3}\\text{）}', 10, 15, { size: 13, color: c.muted });
      }
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     2.4(1) 指数関数と対数関数(逆関数)
     ========================================================== */
  function initLogDef() {
    const root = $id('w-logdef');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4, xmax: 8.5, equal: true, yc: 1.5, ratio: [0.9, 0.72] });
    const BASES = [{ label: '2', a: 2, t: '2' }, { label: 'e', a: Math.E, t: 'e' }, { label: '10', a: 10, t: '10' }, { label: '1/2', a: 0.5, t: '\\frac12' }];
    const st = { a: 2, t: '2', x: 4 };
    const chips = chipRow(R(root, 'bases'), BASES, 0, (it) => { st.a = it.a; st.t = it.t; sa.set(Math.round(it.a * 10) / 10); update(); });
    // 底 a のスライダー（a = 1 は対数の底にできないのでとばす）
    const sa = slider(root.querySelector('.controls'), { tex: '\\blue{a}', min: 0.3, max: 5, step: 0.1, value: 2, color: 'primary', aria: '底 a' });
    let lastA = 2;
    sa.on(function (v) {
      if (v === 1) { v = lastA < 1 ? 1.1 : 0.9; sa.set(v); }
      lastA = v; st.a = v; st.t = num(v);
      chips.forEach((b, j) => b.setAttribute('aria-pressed', String(Math.abs(BASES[j].a - v) < 1e-9)));
      update();
    });
    const lg = (x) => Math.log(x) / Math.log(st.a);
    function update() {
      const y = lg(st.x);
      tex(root, 'log', '\\log_{' + st.t + '}' + num(st.x, 2) + '=' + num(y, 3));
      tex(root, 'exp', st.t + '^{' + num(y, 3) + '}=' + num(st.x, 2) + '\\quad(' + st.t + '\\text{ を } ' + num(y, 3) + '\\text{ 乗すると } ' + num(st.x, 2) + ')');
      plot.invalidate();
    }
    plot.addHandle({ get x() { return st.x; }, get y() { return lg(st.x); }, get color() { return plot.c.primary; }, r: 8,
      drag(x) { st.x = clamp(snap(x, 0.05), 0.05, 8); update(); } });
    plot.draw = function (g) {
      const c = g.c, a = st.a, x = st.x, y = lg(x);
      g.grid({ xlabel: 'x', ylabel: 'y' });
      g.fn((t) => t, { color: c.muted, width: 1.5, dash: [6, 6] });
      g.tex('y=x', 4.6, 4.6, { dx: 8, size: 14, color: c.muted });
      g.fn((t) => Math.pow(a, t), { color: c.amber, width: 3.5 });
      g.fn(lg, { x0: 0.001, x1: g.xmax, color: c.primary, width: 4, samples: 400 });
      g.line(x, 0, x, y, { color: c.primary, width: 1.5, dash: [4, 4] });
      g.line(0, y, x, y, { color: c.primary, width: 1.5, dash: [4, 4] });
      g.line(x, y, y, x, { color: c.text, width: 1.5, dash: [3, 4], alpha: 0.7 });
      g.dot(y, x, { r: 6, color: c.amber });
      // 金の点が y 軸のすぐ右にあるときは、ラベルを右側に出して y 軸の目盛りとぶつけない
      const nearAxis = g.X(y) > g.X(0) && g.X(y) - g.X(0) < 90;
      g.tex('(' + num(y, 2) + ',\\,' + num(x, 2) + ')', y, x, nearAxis ? { dx: 10, dy: -4, align: 'left', valign: 'bottom', size: 14, color: c.amber, avoid: true } : { dx: -8, dy: -13, align: 'right', size: 14, color: c.amber, avoid: true });
      g.tex('(' + num(x, 2) + ',\\,' + num(y, 2) + ')', x, y, { dx: 12, dy: 15, size: 14, color: c.primary });
      // 曲線の近くに式（青＝対数、金＝指数）。画面内に入る点を探して置く
      const inView = (yy) => yy > g.ymin + 0.7 && yy < g.ymax - 0.7;
      const find = (f, xs) => xs.find((t) => inView(f(t)));
      // 曲線の左側（a>1 なら上、0<a<1 なら下）は空いている
      const xb = [7.6, 6.5, 5.5, 4.5, 3.5, 2.5, 2, 1.6, 1.3].find((t) => lg(t) > g.ymin + (a > 1 ? 0.7 : 1.4) && lg(t) < g.ymax - (a > 1 ? 1.4 : 0.7));
      if (xb != null) g.tex('y=\\log_{' + st.t + '}x', xb, lg(xb), a > 1 ? { dy: -10, align: 'right', valign: 'bottom', size: 16, color: c.primary } : { dy: 10, align: 'right', valign: 'top', size: 16, color: c.primary });
      const ex = (t) => Math.pow(a, t);
      const xa = find(ex, [lg(6), lg(5), lg(4), lg(3), a > 1 ? 0.5 : -0.5].filter((t) => t > g.xmin + 0.3 && t < g.xmax - 0.3));
      // a が大きいと曲線が y 軸に張りつくので、左に置くと y 軸・目盛りと重なる → そのときは曲線の右側に置く
      const crowd = a > 1 && xa != null && g.X(xa) - g.X(0) < 75;
      if (xa != null) g.tex('y=' + st.t + '^x', xa, ex(xa), a > 1 && !crowd ? { dx: -10, align: 'right', size: 16, color: c.amber, avoid: true } : { dx: 10, align: 'left', size: 16, color: c.amber, avoid: true });
    };
    update();
  }

  /* ==========================================================
     2.5(3) 桁数
     ========================================================== */
  function initDigits() {
    const root = $id('w-digits'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 5, ymin: 0, ymax: 1.1, ratio: [0.7, 0.34] });
    const sa = slider(ctl, { tex: 'a', min: 2, max: 9, step: 1, value: 2, color: 'primary' });
    const sn = slider(ctl, { tex: 'n', min: 1, max: 100, step: 1, value: 10, color: 'accent' });
    const val = () => sn.get() * Math.log10(sa.get());
    const big = () => (BigInt(sa.get()) ** BigInt(sn.get())).toString();
    // 数 N の短い表示(長ければ m×10^k)
    const grp = (v) => Number(v).toLocaleString('ja-JP').replace(/,/g, '{,}');
    const nTxt = (s) => s.length <= 9 ? grp(s) : s[0] + '.' + s.slice(1, 3) + '\\times10^{' + (s.length - 1) + '}';
    const pow10 = (j) => j <= 4 ? grp(Math.pow(10, j)) : '10^{' + j + '}';
    function update() {
      const a = sa.get(), n = sn.get(), la = Math.log10(a), v = val(), k = Math.floor(v) + 1;
      tex(root, 'calc', '\\log_{10}' + a + '^{' + n + '}=' + n + '\\times' + num(la, 4) + '\\approx' + num(v, 3));
      tex(root, 'range', (k - 1) + '\\leqq' + num(v, 3) + '\\lt ' + k);
      tex(root, 'digits', '10^{' + (k - 1) + '}\\leqq' + a + '^{' + n + '}\\lt 10^{' + k + '}\\ \\to\\ \\teal{' + k + '\\ \\text{桁}}');
      const s = big();
      R(root, 'actual').textContent = (s.length > 48 ? s.slice(0, 20) + ' … ' + s.slice(-12) : s) + '（実際に ' + s.length + ' 桁）';
      const lo = Math.max(0, Math.floor(v) - 2);
      plot.setView({ xmin: lo - 0.35, xmax: lo + 5.35 });
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, v = val(), yN = 0.52, yT = 0.86, yL = 0.2, sm = g.w < 480;
      // 上：数 N を「桁の部屋」に分ける(1部屋 = 10倍の範囲)
      for (let j = Math.max(0, Math.floor(g.xmin)); j < g.xmax; j++) {
        const on = v >= j && v < j + 1, x0 = g.X(j), x1 = g.X(j + 1);
        ctx.save(); ctx.globalAlpha = on ? 0.25 : (j % 2 ? 0.07 : 0.13);
        ctx.fillStyle = on ? c.teal : c.muted; ctx.fillRect(x0, g.Y(yT), x1 - x0, g.Y(yN) - g.Y(yT)); ctx.restore();
        // 部屋の大半が画面の外にあるときは、文字が切れるのでラベルを出さない
        if (j + 0.5 < g.xmin + 0.25 || j + 0.5 > g.xmax - 0.25) continue;
        g.text((j + 1) + (g.w < 560 ? ' 桁' : ' 桁の数'), j + 0.5, 0.75, { align: 'center', size: sm ? 12 : 14.5, bold: true, color: on ? c.teal : c.muted });
        g.tex(pow10(j) + '\\text{〜}' + (j <= 3 ? grp(Math.pow(10, j + 1) - 1) : ''), j + 0.5, 0.62, { align: 'center', size: sm ? 9 : 12.5, color: on ? c.teal : c.muted });
      }
      g.line(g.xmin, yN, g.xmax, yN, { color: c.axis, width: 2 });
      g.line(g.xmin, yL, g.xmax, yL, { color: c.axis, width: 2 });
      for (let j = Math.max(0, Math.ceil(g.xmin)); j <= g.xmax; j++) {
        g.line(j, yL, j, yN, { color: c.muted, width: 1, dash: [3, 4] });
        g.line(j, yN - 0.03, j, yN + 0.03, { color: c.axis, width: 2 });
        g.tex(pow10(j), j, yN, { dy: 13, align: 'center', size: 12.5, color: c.text });
        g.line(j, yL - 0.03, j, yL + 0.03, { color: c.axis, width: 2 });
        g.text(String(j), j, yL, { dy: 13, align: 'center', size: 12, bold: true, color: c.text });
      }
      g.tex('\\text{数 }N', g.xmin, yN, { dx: 4, dy: -11, size: 13, color: c.muted });
      g.tex('\\log_{10}N', g.xmin, yL, { dx: 4, dy: -11, size: 13, color: c.muted });
      // a^n の位置(上下で同じ位置)
      const x = clamp(v, g.xmin, g.xmax);
      g.line(x, yL, x, yT + 0.06, { color: c.accent, width: 2.5 });
      g.dot(x, yN, { r: 6, color: c.accent }); g.dot(x, yL, { r: 6, color: c.accent });
      const right = x > (g.xmin + g.xmax) / 2, al = right ? 'right' : 'left', dx = right ? -8 : 8;
      g.tex(sa.get() + '^{' + sn.get() + '}=' + nTxt(big()), x, yT + 0.06, { dx, dy: -3, align: al, size: 14, color: c.accent });
      g.tex('\\log_{10}N\\approx' + num(v, 3), x, yL, { dx, dy: -13, align: al, size: 14, color: c.accent });
    };
    sa.on(update); sn.on(update);
    update();
  }

  /* ==========================================================
     2.4(4) チャレンジ：対数を求めよ
     ========================================================== */
  const LOG_STAGES = [
    { a: 2, at: '2', x: 8, xt: '8', ans: 3, hint: '2 を何回かけると 8？', answer: '<b>3</b><br>$2^3=8$ なので $\\log_2 8=3$。' },
    { a: 3, at: '3', x: 1 / 9, xt: '\\frac19', ans: -2, hint: '9 = 3²。逆数はマイナスの指数。', answer: '<b>−2</b><br>$\\dfrac19=\\dfrac1{3^2}=3^{-2}$ なので $\\log_3\\dfrac19=-2$。' },
    { a: 4, at: '4', x: 2, xt: '2', ans: 0.5, hint: '4 の「平方根」は？', answer: '<b>1/2</b><br>$4^{\\frac12}=\\sqrt4=2$ なので $\\log_4 2=\\dfrac12$。' },
    { a: 10, at: '10', x: 0.001, xt: '0.001', ans: -3, hint: '0.001 = 1/1000。', answer: '<b>−3</b><br>$0.001=\\dfrac1{10^3}=10^{-3}$ なので $\\log_{10}0.001=-3$。' },
    { a: 8, at: '8', x: 4, xt: '4', ans: 2 / 3, hint: '8 = 2³、4 = 2²。2 の何乗で表して比べよう。', answer: '<b>2/3</b><br>$8^{\\frac23}=\\left(2^3\\right)^{\\frac23}=2^2=4$ なので $\\log_8 4=\\dfrac23$。底の変換を使うと $\\dfrac{\\log_2 4}{\\log_2 8}=\\dfrac23$。' },
  ];
  LOG_STAGES.forEach((S) => { S.text = '$\\log_{' + S.at + '}' + S.xt + '$ を求めよう。'; });
  function initGameLog() {
    const root = $id('w-game-log');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4.3, xmax: 4.3, ymin: -1, ymax: 9.8, ratio: [0.75, 0.45] });
    const ctl = root.querySelector('.controls');
    const sy = slider(ctl, { tex: '\\text{答え}', min: -4, max: 4, step: 1 / 6, value: 1, color: 'accent', fmt: (v) => fracTxt(v, 6) });
    const B = gameButtons(ctl, '✅ 決定');
    const conf = Confetti(root, plot);
    const st = { shots: [] };
    const S = () => LOG_STAGES[game.k];
    const game = GameShell(root, { key: '2-4:game', stages: LOG_STAGES,
      formula: () => S().at + '^{' + fracTeX(sy.get(), 6) + '}' + eqTeX(Math.pow(S().a, sy.get()), 4) + num(Math.pow(S().a, sy.get()), 4) + '\\qquad(\\text{目標 }' + S().xt + ')',
      onStage() { st.shots = []; B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission')); plot.invalidate(); } });
    sy.on(() => { game.formula(); plot.invalidate(); });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const y = sy.get(); st.shots.push(y); game.used++; game.renderThrows();
      if (Math.abs(y - S().ans) < 1e-6) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= LOG_STAGES.length - 1;
        game.result('🎯 正解！ ' + starStr(n) + '（' + game.used + ' 回目）', 'hit'); conf.fire(plot.X(y), plot.Y(Math.min(S().x, 8)));
      } else {
        const v = Math.pow(S().a, y);
        let m = S().at.replace(/\\frac(\d)(\d)/, '$1/$2') + ' の ' + fracTxt(y, 6) + ' 乗は ≈ ' + num(v, 4) + '。目標の ' + num(S().x, 4) + ' より' + (v > S().x ? '大きい' : '小さい') + '。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, LOG_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, s = S();
      g.grid({ stepX: 1, stepY: 1, xlabel: 'x', ylabel: 'y' });
      g.fn((x) => Math.pow(s.a, x), { color: c.amber, width: 3 });
      g.line(g.xmin, s.x, g.xmax, s.x, { color: c.teal, width: 2.5, dash: [7, 6] });
      g.dot(0, 1, { r: 5, color: c.amber });
      g.tex('(0,\\,1)', 0, 1, { dx: -8, dy: -14, align: 'right', size: 13, color: c.amber, avoid: true }); // 左上（a > 1 の曲線は左下へ行くので空いている）
      g.dot(0, s.x, { r: 6.5, color: c.teal });
      // 目標が 1 以上なら y 軸の左上（曲線も右上の説明文もない）に置く
      g.tex('\\text{目標の高さ }' + s.xt + '\\text{（真数）}', 0, s.x, s.x < 1 ? { dx: 10, dy: -18, size: 14, color: c.teal, avoid: true } : { dx: -10, dy: -14, align: 'right', size: 14, color: c.teal, avoid: true });
      const y = sy.get();
      g.line(y, 0, y, Math.pow(s.a, y), { color: c.accent, width: 2, dash: [5, 5] });
      g.dot(y, Math.pow(s.a, y), { r: 7, ring: true, color: c.accent });
      st.shots.forEach((v, i) => g.text(String(i + 1), v, 0, { dy: 16, align: 'center', size: 12, bold: true, color: c.muted }));
      g.texPx('\\text{金：}y=' + (/^\d+$/.test(s.at) ? s.at : '\\left(' + s.at + '\\right)') + '^x', g.w - 10, 17, { align: 'right', size: 14, color: c.amber });
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     2.5(1) 対数目盛：大きさくらべ
     ========================================================== */
  const SIZE_MARKS = [
    ['ウイルス', 1e-7, '🦠'], ['細菌', 2e-6, '🧫'], ['髪の毛の太さ', 8e-5, '〰'], ['アリ', 4e-3, '🐜'], ['人', 1.7, '🧍'],
    ['スカイツリー', 634, '🗼'], ['富士山', 3776, '🗻'], ['日本列島', 3e6, '🗾'], ['地球の直径', 1.27e7, '🌍'], ['月まで', 3.84e8, '🌕'],
    ['太陽まで', 1.5e11, '☀️'], ['海王星まで', 4.5e12, '🪐'], ['1光年', 9.46e15, '✨'], ['天の川銀河', 1e21, '🌌'],
  ];
  function initLogScale() {
    const root = $id('w-logscale');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -8, xmax: 22, ymin: 0, ymax: 1, ratio: [0.7, 0.36] });
    const st = { log: false };
    function setMode(log) {
      st.log = log;
      if (log) plot.setView({ xmin: -8, xmax: 22 }); else plot.setView({ xmin: -0.04e21, xmax: 1.08e21 });
      R(root, 'msg').textContent = log ? '対数目盛では、1目盛ごとに 10 倍。ウイルスから銀河まで、28 桁の違いが1本の定規に収まる。' :
        '普通の目盛では、銀河以外はすべて左端の 0 のところに重なってしまう（人もスカイツリーも地球も、銀河と比べると点にすらならない）。';
      plot.invalidate();
    }
    chipRow(R(root, 'mode'), [{ label: '普通の目盛', log: false }, { label: '対数目盛', log: true }], 0, (it) => setMode(it.log));
    plot.draw = function (g) {
      const c = g.c;
      if (st.log) {
        const sm = g.w < 520; // 狭い画面では目盛の数字を 10^4 ごとに、ラベルは 4 段に
        drawLogRuler(g, SIZE_MARKS, { every: sm ? 4 : 2, levels: sm ? 4 : 3, compact: true });
        g.texPx('\\text{単位 }\\mathrm{m}', 10, g.h - 14, { size: 13, color: c.muted }); return;
      }
      const y0 = 0.42;
      g.line(0, y0, g.xmax, y0, { color: c.axis, width: 3 });
      for (let k = 0; k <= 10; k++) { const x = k * 1e20; g.line(x, y0 - 0.04, x, y0 + 0.04, { color: c.axis, width: 1 }); if (k % 2 === 0) g.tex(k === 0 ? '0' : k + '\\times10^{20}', x, y0, { dy: 17, align: 'center', size: 12, color: c.muted }); }
      // 銀河以外の 13 個は 0 の位置に重なるので、名前を重ねて書かずに 1 つの説明ラベルにまとめる
      const last = SIZE_MARKS[SIZE_MARKS.length - 1], k = SIZE_MARKS.length - 1, sm = g.w < 520;
      g.line(last[1], y0, last[1], y0 + 0.08, { color: c.muted, width: 1, dash: [3, 3] });
      g.text(last[2] + ' ' + last[0], last[1], y0 + 0.12, { align: 'right', size: 11.5, color: c.text });
      g.line(0, y0, 0, y0 + 0.4, { color: c.muted, width: 1, dash: [3, 3] });
      g.text(SIZE_MARKS[0][2] + ' ' + SIZE_MARKS[0][0] + ' から ' + SIZE_MARKS[k - 1][2] + ' ' + SIZE_MARKS[k - 1][0] + ' まで ' + k + ' 個', 0, y0 + 0.4, { dx: 6, size: sm ? 11.5 : 13, bold: true, color: c.text });
      g.text('← ぜんぶ 0 の位置に重なっている', 0, y0 + 0.28, { dx: 6, size: sm ? 11.5 : 13, color: c.muted });
      g.texPx('\\text{単位 }\\mathrm{m}\\text{（普通の目盛）}', 10, g.h - 14, { size: 13, color: c.muted });
    };
    setMode(false);
  }

  /* ==========================================================
     2.5(2) 対数スケール変換器
     ========================================================== */
  const KINDS = [
    { label: '🔊 音（dB）', min: 0, max: 130, step: 1, A: 60, B: 80, unit: 'dB',
      axis: '横軸：音の大きさ（デシベル）', axisTeX: 'L\\ [\\mathrm{dB}]',
      def: 'L=10\\log_{10}\\dfrac{I}{I_0}', ratio: (a, b) => Math.pow(10, (b - a) / 10),
      qty: (v) => 'I=10^{' + num(v / 10 - 12, 1) + '}\\ \\mathrm{W/m^2}',
      desc: '<p><b>図の見方</b>：横軸は音の大きさ $L$ で、単位は <b>dB（デシベル）</b>です。上に身近な音の目安を並べています。</p>' +
        '<p><b>音の強さ $I$ とは</b>：音が運ぶエネルギーの量のことで、「音の進む向きに垂直な 1 m² の面を、1 秒間に通りぬける音のエネルギー」です。単位は <b>W/m²</b>（ワット毎平方メートル）。' +
        '基準の $I_0=10^{-12}$ W/m² は、人がやっと聞こえる強さです。$L=10\\log_{10}\\dfrac{I}{I_0}$ なので、<b>10 dB 上がるごとに $I$ は 10 倍</b>、20 dB で 100 倍になります。</p>' +
        '<p><b>A, B を動かすと</b>：dB の差は「引き算」なのに、音の強さの違いは「かけ算（何倍）」で決まることがわかります。たとえば会話（60 dB）と電車の車内（80 dB）は、目盛では 20 しか違いませんが、強さは 100 倍です。</p>',
      say: (r) => 'B の音は A の音の ' + rtxt(r) + 'の強さ（10 dB 上がるごとに 10 倍）',
      ex: [[0, '聞こえる限界'], [20, '木の葉の音'], [40, '図書館'], [60, '会話'], [80, '電車の車内'], [100, 'ガード下'], [120, '飛行機の近く']] },
    { label: '🌏 地震（M）', min: 3, max: 9.5, step: 0.1, A: 7.3, B: 9, unit: '',
      axis: '横軸：マグニチュード', axisTeX: 'M', rows: 3,
      def: '\\log_{10}E=4.8+1.5M', ratio: (a, b) => Math.pow(10, 1.5 * (b - a)),
      qty: (v) => 'E\\approx' + sciTeX(Math.pow(10, 4.8 + 1.5 * v)) + '\\ \\mathrm{J}',
      desc: '<p><b>図の見方</b>：横軸は地震の<b>マグニチュード $M$</b>（単位なし）。上に過去の大きな地震を並べています。</p>' +
        '<p><b>エネルギー $E$ とは</b>：地震で震源から放出されるエネルギーの量で、単位は <b>J（ジュール）</b>です（1 J は約 100 g の物を 1 m 持ち上げる仕事）。' +
        '$\\log_{10}E=4.8+1.5M$ なので、<b>M が 1 増えると $E$ は $10^{1.5}\\approx32$ 倍、2 増えると $10^3=1000$ 倍</b>になります。</p>' +
        '<p><b>A, B を動かすと</b>：兵庫県南部地震（M7.3）と東北地方太平洋沖地震（M9.0）は、M では 1.7 の差ですが、エネルギーは約 355 倍も違うことがわかります。</p>',
      say: (r) => 'B の地震のエネルギーは A の ' + rtxt(r) + '（M が 1 増えると約 32 倍、2 増えると 1000 倍）',
      ex: [[4, 'M4'], [5, 'M5'], [6, 'M6'], [7.3, '兵庫県南部(1995)'], [7.6, '能登半島(2024)'], [9.0, '東北地方太平洋沖(2011)']] },
    { label: '🧪 pH', min: 0, max: 14, step: 0.1, A: 7, B: 3, unit: '',
      axis: '横軸：pH（ピーエイチ）', axisTeX: '\\mathrm{pH}',
      def: '\\mathrm{pH}=-\\log_{10}[\\mathrm{H^+}]', ratio: (a, b) => Math.pow(10, a - b),
      qty: (v) => '[\\mathrm{H^+}]=10^{' + num(-v, 1) + '}\\ \\mathrm{mol/L}',
      desc: '<p><b>図の見方</b>：横軸は <b>pH</b>（単位なし）。7 が中性、7 より小さいと酸性、大きいとアルカリ性です。上に身近な液体の目安を並べています。</p>' +
        '<p><b>水素イオン濃度 $[\\mathrm{H^+}]$ とは</b>：水溶液 1 L の中に水素イオン $\\mathrm{H^+}$ がどれだけ含まれるかを表す量で、単位は <b>mol/L</b>（モル毎リットル）です。$\\mathrm{H^+}$ が多いほど酸性が強くなります。' +
        '$\\mathrm{pH}=-\\log_{10}[\\mathrm{H^+}]$ なので、たとえば純水は $[\\mathrm{H^+}]=10^{-7}$ mol/L で pH 7。<b>pH が 1 小さいと $[\\mathrm{H^+}]$ は 10 倍</b>です（マイナスがつくので、数字が小さいほど濃い）。</p>' +
        '<p><b>A, B を動かすと</b>：純水（pH 7）と炭酸飲料（pH 3）では、pH の差は 4 でも、水素イオン濃度は $10^4=10000$ 倍違うことがわかります。</p>',
      say: (r) => 'B の水素イオン濃度は A の ' + rtxt(r) + '（pH が 1 小さいと 10 倍。小さいほど酸性が強い）',
      ex: [[2, 'レモン汁'], [3, '炭酸飲料'], [5.6, '雨水'], [7, '純水'], [8.2, '海水'], [10, 'せっけん水'], [13, '強いアルカリ洗剤']] },
    { label: '⭐ 星の等級', min: -2, max: 7, step: 0.1, A: 6, B: 1, unit: '等',
      axis: '横軸：見かけの等級（等）', axisTeX: 'm\\ [\\text{等}]',
      def: 'm_A-m_B=2.5\\log_{10}\\dfrac{\\ell_B}{\\ell_A}', ratio: (a, b) => Math.pow(10, 0.4 * (a - b)),
      qty: (v) => '\\ell=10^{' + num(-0.4 * v, 2) + '}\\ \\ell_0',
      desc: '<p><b>図の見方</b>：横軸は星の<b>見かけの等級 $m$</b>（単位は「等」）。<b>数字が小さいほど明るい</b>星で、明るい星はマイナスの等級になります。上に代表的な星を並べています。</p>' +
        '<p><b>星の明るさ $\\ell$ とは</b>：地球から見たときの明るさ（見かけの明るさ）で、星から地球に届く光の量のことです。0 等星の明るさを $\\ell_0$ とすると、$m$ 等星の明るさは $\\ell=10^{-0.4m}\\,\\ell_0$。' +
        '<b>5 等級違うとちょうど 100 倍</b>、1 等級違うと $100^{\\frac15}\\approx2.5$ 倍の明るさの違いになります。</p>' +
        '<p><b>A, B を動かすと</b>：肉眼でやっと見える 6 等星と 1 等星では、等級の差は 5 なのに、明るさは 100 倍も違うことがわかります。</p>',
      say: (r) => 'B の星は A の星の ' + rtxt(r) + '明るい（5 等級違うとちょうど 100 倍。数字が小さいほど明るい）',
      ex: [[-1.5, 'シリウス'], [0, 'ベガ'], [1, '1等星'], [2, '北極星'], [6, '肉眼の限界']] },
  ];
  function rtxt(r) {
    if (r >= 1) return '約 ' + (r < 1000 ? num(r, r < 10 ? 2 : 0) : r < 1e8 ? Math.round(r).toLocaleString('ja-JP') : (r / Math.pow(10, Math.floor(Math.log10(r)))).toFixed(1) + '×10' + sup(Math.floor(Math.log10(r)))) + ' 倍';
    return '約 1/' + (1 / r < 1000 ? num(1 / r, 1 / r < 10 ? 2 : 0) : Math.round(1 / r).toLocaleString('ja-JP')) + ' 倍';
  }
  function initScales() {
    const root = $id('w-scales'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 130, ymin: 0, ymax: 1, ratio: [0.5, 0.28] });
    const st = { k: KINDS[0] };
    let sA = null, sB = null;
    function build() {
      ctl.innerHTML = '';
      const k = st.k;
      sA = slider(ctl, { tex: '\\teal{A}', min: k.min, max: k.max, step: k.step, value: k.A, color: 'teal' });
      sB = slider(ctl, { tex: '\\red{B}', min: k.min, max: k.max, step: k.step, value: k.B, color: 'accent' });
      sA.on(update); sB.on(update);
      const pad = (k.max - k.min) * 0.05;
      plot.setView({ xmin: k.min - pad, xmax: k.max + pad });
      tex(root, 'def', k.def);
      const d = R(root, 'desc');
      if (d) { d.innerHTML = k.desc; typeset(d); }
      update();
    }
    function update() {
      const k = st.k, a = sA.get(), b = sB.get(), r = k.ratio(a, b);
      if (R(root, 'qa')) { tex(root, 'qa', k.qty(a)); tex(root, 'qb', k.qty(b)); }
      tex(root, 'ratio', '\\red{B}\\div\\teal{A}' + '\\approx' + (r >= 1e6 || r < 1e-3 ? sciTeX(r) : num(r, r < 10 ? 3 : 1)) + '\\ \\text{倍}');
      R(root, 'say').textContent = k.say(r);
      plot.invalidate();
    }
    chipRow(R(root, 'kinds'), KINDS, 0, (it) => { st.k = it; build(); });
    plot.draw = function (g) {
      const c = g.c, k = st.k, y0 = 0.45;
      g.line(k.min, y0, k.max, y0, { color: c.axis, width: 3 });
      const sx = niceStep((k.max - k.min) / 10);
      for (let x = Math.ceil(k.min / sx) * sx; x <= k.max + 1e-9; x += sx) { g.line(x, y0 - 0.04, x, y0 + 0.04, { color: c.axis }); g.text(L.minus(num(x, 1)), x, y0, { dy: 16, align: 'center', size: 11, color: c.muted }); }
      k.ex.forEach(function (e, i) {
        const nr = g.w < 520 ? 3 : (k.rows || 2), yy = y0 + 0.17 + (i % nr) * (nr > 2 ? 0.12 : 0.16); // 狭い画面は 3 段にして横のラベルとぶつけない
        g.line(e[0], y0, e[0], yy - 0.05, { color: c.muted, width: 1, dash: [3, 3] });
        const fr = (e[0] - k.min) / (k.max - k.min), al = fr < 0.08 ? 'left' : fr > 0.92 ? 'right' : 'center';
        if (/^M\d+$/.test(e[1])) g.tex('M' + e[1].slice(1), e[0], yy, { align: al, dx: al === 'left' ? -6 : al === 'right' ? 6 : 0, size: 13, color: c.text });
        else g.text(e[1], e[0], yy, { align: al, dx: al === 'left' ? -6 : al === 'right' ? 6 : 0, size: 11.5, color: c.text });
      });
      [[sA.get(), 'A', c.teal], [sB.get(), 'B', c.accent]].forEach(function (m) {
        const px = g.X(m[0]), py = g.Y(y0), ctx = g.ctx;
        ctx.save(); ctx.fillStyle = m[2]; ctx.beginPath(); ctx.moveTo(px, py + 4); ctx.lineTo(px - 9, py + 22); ctx.lineTo(px + 9, py + 22); ctx.closePath(); ctx.fill(); ctx.restore();
        g.tex(m[1], m[0], y0, { dy: 34, align: 'center', size: 16, color: m[2] });
      });
      g.texPx('\\text{' + k.axis.replace('pH', '}\\mathrm{pH}\\text{') + '}', 10, g.h - 11, { size: 13, color: c.muted });
      g.tex(k.axisTeX, g.xmax, y0, { dx: -4, dy: 54, align: 'right', size: 13, color: c.muted });
    };
    build();
  }

  /* ==========================================================
     2.5(3) ピアノと周波数
     ========================================================== */
  function initPiano() {
    const root = $id('w-piano'), box = R(root, 'keys');
    const NAMES = ['ド', 'ド♯', 'レ', 'レ♯', 'ミ', 'ファ', 'ファ♯', 'ソ', 'ソ♯', 'ラ', 'ラ♯', 'シ'];
    const BLACK = [1, 3, 6, 8, 10];
    const JUST = [[1, 1], [16, 15], [9, 8], [6, 5], [5, 4], [4, 3], [45, 32], [3, 2], [8, 5], [5, 3], [9, 5], [15, 8]]; // 純正律(ドを基準)
    const N = 25; // C4〜C6
    const C4 = 440 * Math.pow(2, -9 / 12);
    const fET = (n) => 440 * Math.pow(2, (n - 9) / 12);
    const fJust = (n) => C4 * Math.pow(2, Math.floor(n / 12)) * JUST[n % 12][0] / JUST[n % 12][1];
    const st = { last: [9], log: false, just: false };
    const freq = (n) => (st.just ? fJust(n) : fET(n));
    let ctx = null, wave = null;
    function audio() {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      if (!wave) { // 倍音を含んだ、ピアノに少し近い音色
        const amp = [0, 1, 0.5, 0.3, 0.22, 0.12, 0.08, 0.05, 0.03];
        wave = ctx.createPeriodicWave(new Float32Array(amp.length), new Float32Array(amp));
      }
      return ctx;
    }
    function play(ns) {
      try {
        const a = audio(), t = a.currentTime, vol = 0.22 / Math.sqrt(ns.length);
        ns.forEach(function (n) {
          const o = a.createOscillator(), g = a.createGain();
          o.setPeriodicWave(wave); o.frequency.value = freq(n);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
          g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0005, t + 2.2);
          o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 2.3);
        });
      } catch (e) { /* 音が出せない環境では何もしない */ }
    }
    // 白鍵を並べ、黒鍵を白鍵の境目に重ねる
    const whites = [];
    for (let n = 0; n < N; n++) if (BLACK.indexOf(n % 12) < 0) whites.push(n);
    const W = 100 / whites.length;
    const keyEls = {};
    for (let n = 0; n < N; n++) {
      const isB = BLACK.indexOf(n % 12) >= 0, k = el('button', 'pkey ' + (isB ? 'black' : 'white'));
      k.type = 'button';
      k.setAttribute('aria-label', NAMES[n % 12] + ' ' + num(fET(n), 1) + 'Hz');
      if (isB) { const wi = whites.indexOf(n - 1); k.style.left = ((wi + 1) * W - W * 0.32) + '%'; k.style.width = (W * 0.64) + '%'; }
      else { const wi = whites.indexOf(n); k.style.left = (wi * W) + '%'; k.style.width = W + '%'; k.innerHTML = '<span>' + NAMES[n % 12] + '</span>'; }
      k.addEventListener('click', () => { st.last = [n]; play([n]); update(); });
      box.append(k); keyEls[n] = k;
    }
    chipRow(R(root, 'tune'), [{ label: '平均律（ピアノ）', j: false }, { label: '純正律', j: true }], 0, (it) => { st.just = it.j; update(); });
    const CHORDS = { scale: [0, 2, 4, 5, 7, 9, 11, 12], major: [0, 4, 7], fifth: [0, 7], oct: [0, 12], dla: [2, 9], compare: [0, 4, 7] };
    const tuneChips = R(root, 'tune').querySelectorAll('button');
    const setJust = (j) => { st.just = j; tuneChips.forEach((x, i) => x.setAttribute('aria-pressed', String(i === (j ? 1 : 0)))); };
    root.querySelectorAll('[data-chord]').forEach(function (b) {
      b.addEventListener('click', function () {
        const ns = CHORDS[b.dataset.chord];
        if (b.dataset.chord === 'compare') { // 同じドミソを 平均律 → 純正律 の順に
          setJust(false); st.last = ns.slice(); play(ns); update();
          setTimeout(() => { setJust(true); play(ns); update(); }, 2300);
          return;
        }
        if (b.dataset.chord === 'scale') {
          ns.forEach((n, i) => setTimeout(() => { st.last = [n]; play([n]); update(); }, i * 330));
        } else { st.last = ns.slice(); play(ns); update(); }
      });
    });
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1, xmax: 25, ymin: 80, ymax: 1400, ratio: [0.55, 0.3] });
    // 上端は説明文(1〜2行)、下端は「ド」の目盛のぶん空けておく(点と重ならないように)
    R(root, 'log').addEventListener('change', (e) => { st.log = e.target.checked; plot.setView(st.log ? { ymin: 7.15, ymax: 11 } : { ymin: 80, ymax: 1400 }); plot.invalidate(); });
    function update() {
      const n = st.last[st.last.length - 1], f = freq(n), cents = 1200 * Math.log2(fJust(n) / fET(n));
      Object.keys(keyEls).forEach((k) => keyEls[k].classList.toggle('on', st.last.indexOf(+k) >= 0));
      const nm = '\\text{' + NAMES[n % 12] + (n >= 12 ? (n >= 24 ? '（2オクターブ上）' : '（1オクターブ上）') : '') + '}\\quad ';
      const r = JUST[n % 12], oc = Math.floor(n / 12);
      tex(root, 'freq', nm + (st.just ? '261.6\\times' + (oc ? (oc === 1 ? '2' : '4') + '\\times' : '') + (r[1] === 1 ? r[0] : '\\frac{' + r[0] + '}{' + r[1] + '}') : '440\\times2^{\\frac{' + (n - 9) + '}{12}}') + '\\approx' + num(f, 1) + '\\ \\mathrm{Hz}');
      const ct = (m) => 1200 * Math.log2(fJust(m) / fET(m));
      R(root, 'cents').textContent = st.last.length > 1 ?
        '純正律 − 平均律：' + st.last.map((m) => NAMES[m % 12] + ' ' + (Math.abs(ct(m)) < 0.05 ? '0' : (ct(m) > 0 ? '+' : '−') + num(Math.abs(ct(m)), 1)) + ' セント').join('、') + '（半音 = 100 セント）' :
        Math.abs(cents) < 0.05 ? 'どちらでも同じ（ドとオクターブは一致）' :
        '純正律は平均律より ' + num(Math.abs(cents), 1) + ' セント' + (cents > 0 ? '高い' : '低い') + '（半音 = 100 セント）';
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, T = st.log ? (f) => Math.log2(f) : (f) => f;
      g.grid({ stepX: 12, stepY: st.log ? 0.5 : 100, labels: false });
      // 端の「ド」は左右にそろえて切れないように
      for (let n = 0; n <= 24; n += 12) g.text(['ド(C4)', 'ド(C5)', 'ド(C6)'][n / 12], n, g.ymin, { dy: -10, align: n === 0 ? 'left' : n === 24 ? 'right' : 'center', dx: n === 0 ? -8 : n === 24 ? 8 : 0, size: 11, color: c.muted });
      // 262 Hz は左端だと点と重なるので右端に(右下は点がない)
      [262, 523, 1047].forEach((f) => f === 262 ? g.tex(f + '\\ \\mathrm{Hz}', g.xmax, T(f), { dx: -6, dy: -9, align: 'right', size: 12, color: c.muted })
        : g.tex(f + '\\ \\mathrm{Hz}', -1, T(f), { dx: 6, dy: f > 1000 ? 10 : -9, size: 12, color: c.muted }));
      const pts = [];
      for (let n = 0; n < N; n++) pts.push([n, T(fET(n))]);
      g.poly(pts, { color: c.primary, width: 2, alpha: 0.5 });
      for (let n = 0; n < N; n++) {
        const on = st.last.indexOf(n) >= 0;
        g.dot(n, T(freq(n)), { r: on ? 8 : 4, color: on ? c.accent : st.just ? c.teal : (BLACK.indexOf(n % 12) >= 0 ? c.text : c.primary) });
      }
      g.textPx(st.log ? '縦軸：対数目盛 → 点が一直線に並ぶ（半音ごとに同じ倍率）' : '縦軸：普通の目盛 → 右へ行くほど急に上がる（指数関数）', 10, 16, { size: g.w < 420 ? 10.5 : 12, bold: true, color: c.text });
      if (st.just) g.textPx('緑の点：純正律（青い線＝平均律から少しずれる）', 10, 34, { size: g.w < 420 ? 10.5 : 12, bold: true, color: c.teal });
    };
    update();
  }

  /* ==========================================================
     2.5(5) 数当て：コンピュータが当てる
     ========================================================== */
  function initGuessCpu() {
    const root = $id('w-guess-cpu');
    // 右側は「○個」のラベル用に空けておく(バーの上に重ねない)
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.01, xmax: 1.33, ymin: 0, ymax: 1, ratio: [0.4, 0.2] });
    const st = { N: 100, lo: 1, hi: 100, count: 0, active: false, hist: [] };
    const bS = root.querySelector('[data-a="start"]'), bY = root.querySelector('[data-a="yes"]'), bN = root.querySelector('[data-a="no"]');
    const q = (t) => { R(root, 'q').textContent = t; };
    const msg = (t) => { R(root, 'msg').textContent = t; };
    chipRow(R(root, 'ns'), [{ label: '1〜100', N: 100 }, { label: '1〜1000', N: 1000 }, { label: '1〜100万', N: 1e6 }], 0, (it) => { st.N = it.N; reset(); });
    function reset() {
      st.lo = 1; st.hi = st.N; st.count = 0; st.active = false; st.hist = [];
      bY.disabled = bN.disabled = true;
      q('1〜' + st.N.toLocaleString('ja-JP') + ' の中から、好きな数を1つ思い浮かべてください。');
      msg('最大 ' + Math.ceil(Math.log2(st.N)) + ' 回の質問で当てます（log₂ ' + st.N.toLocaleString('ja-JP') + ' ≈ ' + num(Math.log2(st.N), 2) + '）。');
      plot.invalidate();
    }
    function ask() {
      if (st.lo === st.hi) {
        st.active = false; bY.disabled = bN.disabled = true;
        q('あなたの数は「' + st.lo.toLocaleString('ja-JP') + '」ですね！');
        msg('🎉 ' + st.count + ' 回の質問で当てました。候補が毎回半分になるので、' + st.N.toLocaleString('ja-JP') + ' 個でも ' + Math.ceil(Math.log2(st.N)) + ' 回あれば足ります。');
        return;
      }
      const mid = Math.floor((st.lo + st.hi) / 2);
      st.mid = mid;
      q('質問 ' + (st.count + 1) + '：あなたの数は ' + mid.toLocaleString('ja-JP') + ' より大きいですか？');
      plot.invalidate();
    }
    bS.addEventListener('click', function () { reset(); st.active = true; bY.disabled = bN.disabled = false; ask(); });
    bY.addEventListener('click', function () { if (!st.active) return; st.hist.push([st.lo, st.hi]); st.lo = st.mid + 1; st.count++; ask(); plot.invalidate(); });
    bN.addEventListener('click', function () { if (!st.active) return; st.hist.push([st.lo, st.hi]); st.hi = st.mid; st.count++; ask(); plot.invalidate(); });
    plot.draw = function (g) {
      const c = g.c, rows = st.hist.concat([[st.lo, st.hi]]), n = Math.max(rows.length, 6), H = 0.8 / n;
      rows.forEach(function (r, i) {
        const y = 0.9 - (i + 1) * H, x0 = (r[0] - 1) / st.N, x1 = r[1] / st.N;
        g.line(0, y, 1, y, { color: c.grid, width: Math.max(4, g.h * H * 0.5) });
        g.line(x0, y, Math.max(x1, x0 + 0.004), y, { color: i === rows.length - 1 ? c.accent : c.primary, width: Math.max(4, g.h * H * 0.5), alpha: i === rows.length - 1 ? 1 : 0.5 });
        g.text((r[1] - r[0] + 1).toLocaleString('ja-JP') + ' 個', 1, y, { dx: 6, align: 'left', size: g.w < 420 ? 10 : 11, bold: true, color: c.muted });
      });
      g.textPx('候補の範囲（質問のたびに半分になる）', 10, 14, { size: 12, bold: true, color: c.muted });
    };
    reset();
  }

  /* ==========================================================
     2.5(4) チャレンジ：あなたが当てる
     ========================================================== */
  const GUESS_STAGES = [100, 1000, 10000].map((N) => ({
    N, name: '1〜' + N.toLocaleString('ja-JP'),
    text: '1〜' + N.toLocaleString('ja-JP') + ' の中からコンピュータが選んだ数を当てよう。' + Math.ceil(Math.log2(N)) + ' 回以内なら★3！',
    hint: 'いつも「残っている候補のちょうど真ん中」を答えると、候補が毎回半分になる。',
    answer: '<b>二分探索</b><br>候補が $N$ 個のとき、真ん中を答え続けると $k$ 回で候補は $N/2^k$ 個に減ります。$2^k\\geqq N$、つまり $k\\geqq\\log_2 N\\approx' + num(Math.log2(N), 2) + '$ なので、' + Math.ceil(Math.log2(N)) + ' 回あれば必ず当たります。',
  }));
  function initGameGuess() {
    const root = $id('w-game-guess');
    const tr = R(root, 'throws');
    if (tr) tr.closest('.row').remove();
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.3, 0.16] });
    const ctl = root.querySelector('.controls');
    const row = el('div', 'btn-row');
    row.innerHTML = '<input type="number" class="numin" min="1" step="1" inputmode="numeric" aria-label="予想する数" placeholder="数を入力">';
    ctl.append(row);
    const inp = row.querySelector('input');
    const B = gameButtons(ctl, '🔍 これだ！');
    const conf = Confetti(root, plot);
    const st = { secret: 1, lo: 1, hi: 100, guesses: [] };
    const S = () => GUESS_STAGES[game.k];
    const game = GameShell(root, { key: '2-5:game', stages: GUESS_STAGES, max: 99, idle: 'まだ当てていません',
      // 狭い画面でも切れないよう 2 行に
      formula: () => '\\begin{array}{l}\\text{残りの候補：}' + st.lo + '\\sim' + st.hi + '\\ (' + (st.hi - st.lo + 1) + '\\text{ 個})\\\\ \\log_2' + (st.hi - st.lo + 1) + '\\approx' + num(Math.log2(st.hi - st.lo + 1), 2) + '\\end{array}',
      onStage(k, s) {
        st.secret = 1 + Math.floor(Math.random() * s.N); st.lo = 1; st.hi = s.N; st.guesses = [];
        inp.max = s.N; inp.value = ''; B.bMain.disabled = false; B.bNext.hidden = true; plot.invalidate();
      } });
    function guess() {
      if (game.done) return;
      const v = Math.round(+inp.value), s = S();
      if (!(v >= 1 && v <= s.N)) { game.result('1〜' + s.N.toLocaleString('ja-JP') + ' の数を入力してください', 'miss'); return; }
      game.used++; st.guesses.push(v);
      if (v === st.secret) {
        const best = Math.ceil(Math.log2(s.N)), n = game.used <= best ? 3 : game.used <= best + 3 ? 2 : 1;
        game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= GUESS_STAGES.length - 1;
        game.result('🎉 正解！ ' + v + '（' + game.used + ' 回目） ' + starStr(n) + (n < 3 ? '　二分探索なら ' + best + ' 回以内で当たる！' : ''), 'hit');
        conf.fire(plot.w / 2, plot.h / 2);
      } else if (v < st.secret) { st.lo = Math.max(st.lo, v + 1); game.result(game.used + ' 回目：' + v + ' より大きい ⬆', 'miss'); }
      else { st.hi = Math.min(st.hi, v - 1); game.result(game.used + ' 回目：' + v + ' より小さい ⬇', 'miss'); }
      game.formula(); plot.invalidate(); inp.select();
    }
    B.bMain.addEventListener('click', guess);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') guess(); });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, GUESS_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, N = S().N, y = 0.5;
      g.line(0, y, 1, y, { color: c.grid, width: 18 });
      g.line((st.lo - 1) / N, y, st.hi / N, y, { color: c.teal, width: 18, alpha: 0.6 });
      st.guesses.forEach((v) => g.line((v - 0.5) / N, y - 0.25, (v - 0.5) / N, y + 0.25, { color: c.accent, width: 2 }));
      g.text('1', 0, y, { dy: 22, size: 11, color: c.muted }); g.text(N.toLocaleString('ja-JP'), 1, y, { dy: 22, align: 'right', size: 11, color: c.muted });
      g.textPx('緑：まだ候補として残っている範囲　赤：これまでの答え', 10, 14, { size: g.w < 420 ? 10.5 : 12, bold: true, color: c.muted });
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     2.6(1) 単利・複利
     ========================================================== */
  function initCompound() {
    const root = $id('w-compound');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 30, ymin: 0, ymax: 500, ratio: [0.7, 0.45] });
    const inP = R(root, 'P'), inR = R(root, 'rate'), inY = R(root, 'years');
    const MS = [{ label: '年1回', m: 1 }, { label: '半年ごと', m: 2 }, { label: '毎月', m: 12 }, { label: '毎日', m: 365 }, { label: '連続（e）', m: Infinity }];
    const st = { m: MS[0], sel: -1 };
    chipRow(R(root, 'ms'), MS, 0, (it) => { st.m = it; update(); });
    const get = () => ({ P: Math.max(0, +inP.value || 0), r: clamp(+inR.value || 0, 0, 100) / 100, Y: clamp(Math.round(+inY.value || 1), 1, 100) });
    const simple = (P, r, t) => P * (1 + r * t);
    const comp = (P, r, t) => st.m.m === Infinity ? P * Math.exp(r * t) : P * Math.pow(1 + r / st.m.m, st.m.m * t);
    const yen = (v) => (v >= 1e12 ? num(v / 1e12, 2) + ' 兆円' : v >= 1e8 ? num(v / 1e8, 2) + ' 億円' : v >= 1e4 ? num(v / 1e4, 1) + ' 万円' : Math.round(v).toLocaleString('ja-JP') + ' 円');
    const dblC = (r) => r > 0 ? (st.m.m === Infinity ? Math.log(2) / r : Math.log(2) / (st.m.m * Math.log(1 + r / st.m.m))) : Infinity;
    const card = (cls, k, v, sub) => '<div class="sum-card ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + sub + '</div></div>';
    function update() {
      const { P, r, Y } = get();
      if (st.sel > Y) st.sel = -1;
      const S = simple(P, r, Y), Cp = comp(P, r, Y);
      const dbl = dblC(r), dbs = r > 0 ? 1 / r : Infinity;
      R(root, 'summary').innerHTML =
        card('gray', '元金', yen(P), '年利 ' + num(r * 100, 2) + '%・' + Y + ' 年間') +
        card('teal', '単利で ' + Y + ' 年後', yen(S), '利息の合計 ' + yen(S - P)) +
        card('blue', '複利（' + st.m.label + '）で ' + Y + ' 年後', yen(Cp), '利息の合計 ' + yen(Cp - P)) +
        card('accent', '差＝利息の利息', yen(Cp - S), S > 0 ? '単利の ' + num(Cp / S, 2) + ' 倍' : '') +
        card('amber', '元金が2倍になるまで', isFinite(dbl) ? '<span class="t-teal">単利 ' + num(dbs, 1) + ' 年</span><br><span class="t-blue">複利 ' + num(dbl, 1) + ' 年</span>' : '—',
          r > 0 ? '複利の方が ' + num(dbs - dbl, 1) + ' 年早い／72の法則：72÷' + num(r * 100, 2) + '≈' + num(72 / (r * 100), 1) + ' 年' : '');
      const rr = num(r, 4);
      tex(root, 'simple', 'P(1+rn)=P(1+' + rr + '\\times' + Y + ')\\approx\\text{' + yen(S) + '}');
      tex(root, 'comp', (st.m.m === Infinity ? 'Pe^{rn}=Pe^{' + rr + '\\times' + Y + '}' : st.m.m === 1 ? 'P(1+r)^n=P(1+' + rr + ')^{' + Y + '}' : 'P\\left(1+\\frac{r}{' + st.m.m + '}\\right)^{' + st.m.m + 'n}=P\\left(1+\\frac{' + rr + '}{' + st.m.m + '}\\right)^{' + (st.m.m * Y) + '}') + '\\approx\\text{' + yen(Cp) + '}');
      // 年ごとの表
      let h = '';
      for (let t = 0; t <= Y; t++) {
        const s1 = simple(P, r, t), c1 = comp(P, r, t), c0 = t ? comp(P, r, t - 1) : P;
        h += '<tr data-y="' + t + '"' + (t === st.sel ? ' class="on"' : '') + '><td>' + t + '</td><td>' + (t ? yen(P * r) : '—') + '</td><td>' + yen(s1) + '</td><td>' + (t ? yen(c1 - c0) : '—') + '</td><td>' + yen(c1) + '</td><td>' + yen(c1 - s1) + '</td></tr>';
      }
      R(root, 'tbody').innerHTML = h;
      plot.setView({ xmin: 0, xmax: Y, ymin: 0, ymax: Math.max(S, Cp, P * 2) * 1.4 || 1 }); // 上は説明文のぶん空ける
    }
    R(root, 'tbody').addEventListener('click', function (e) {
      const tr = e.target.closest('tr'); if (!tr) return;
      st.sel = +tr.dataset.y === st.sel ? -1 : +tr.dataset.y;
      R(root, 'tbody').querySelectorAll('tr').forEach((x) => x.classList.toggle('on', +x.dataset.y === st.sel));
      plot.invalidate();
    });
    [inP, inR, inY].forEach((x) => x.addEventListener('input', update));
    root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { inR.value = b.dataset.preset; update(); }));
    plot.draw = function (g) {
      const c = g.c, { P, r, Y } = get(), U = P >= 1e8 ? 1e8 : P >= 1e4 ? 1e4 : 1, un = U === 1e8 ? '億円' : U === 1e4 ? '万円' : '円';
      g.grid({ stepX: niceStep(Math.max(1, g.xmax) / 6), stepY: niceStep(g.ymax / 5), labels: false });
      const sx = niceStep(Math.max(1, g.xmax) / 6), sy = niceStep(g.ymax / 5);
      // 両端の目盛の数字は内側にそろえて切れないように。上端付近(説明文の行)の数字は省く
      for (let x = 0; x <= g.xmax + 1e-9; x += sx) { const ed = x === 0 ? 'left' : x > g.xmax - 1e-9 ? 'right' : 'center'; g.text(String(Math.round(x)), x, 0, { dy: -10, align: ed, dx: ed === 'left' ? 2 : ed === 'right' ? -2 : 0, size: 11, color: c.muted }); }
      for (let y = sy; y < g.ymax; y += sy) if (g.Y(y) > 62) g.text(num(y / U, 1), 0, y, { dx: 4, size: 11, color: c.muted });
      g.textPx('（' + un + '）', 6, 14, { size: 11, color: c.muted });
      g.textPx('年', g.w - 8, g.h - 28, { align: 'right', size: 11, color: c.muted });
      // 差(利息の利息)を塗る
      const ctx = g.ctx, K = 120;
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = c.primary; ctx.beginPath();
      for (let i = 0; i <= K; i++) { const t = Y * i / K; ctx[i ? 'lineTo' : 'moveTo'](g.X(t), g.Y(comp(P, r, t))); }
      for (let i = K; i >= 0; i--) { const t = Y * i / K; ctx.lineTo(g.X(t), g.Y(simple(P, r, t))); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      g.line(0, 2 * P, g.xmax, 2 * P, { color: c.amber, width: 1.5, dash: [5, 5] });
      g.text('元金の2倍', 0, 2 * P, { dx: 34, dy: -10, size: 11.5, bold: true, color: c.amber });
      g.line(0, P, g.xmax, P, { color: c.muted, width: 1, dash: [3, 4] });
      g.text('元金', 0, P, { dx: 34, dy: 9, size: 11, color: c.muted }); // 線の下側(グラフは線より上にある)
      g.fn((t) => simple(P, r, t), { x0: 0, x1: Y, color: c.teal, width: 3.5 });
      g.fn((t) => comp(P, r, t), { x0: 0, x1: Y, color: c.primary, width: 4 });
      // 2倍になる時点(単利・複利)
      const dS = r > 0 ? 1 / r : Infinity, dC = dblC(r);
      [[dS, c.teal, '単利 ', 46], [dC, c.primary, '複利 ', 28]].forEach(function (d) {
        if (!(d[0] <= Y)) return;
        g.line(d[0], 0, d[0], 2 * P, { color: d[1], width: 1.5, dash: [4, 4] });
        g.dot(d[0], 2 * P, { r: 6, color: d[1] });
        g.text(d[2] + num(d[0], 1) + '年で2倍', d[0], 0, { dy: -d[3], align: 'center', size: 11.5, bold: true, color: d[1] });
      });
      // 線の名前(右端の近く)
      const S = simple(P, r, Y), Cp = comp(P, r, Y), near = g.Y(S) - g.Y(Cp) < 30;
      if (/e/.test(st.m.label)) g.tex('\\text{複利（' + st.m.label.replace(/e/, '}e\\text{') + '）}', Y, Cp, { dx: -10, dy: near ? -16 : -4, align: 'right', size: 14, color: c.primary });
      else g.text('複利（' + st.m.label + '）', Y, Cp, { dx: -10, dy: near ? -16 : -4, align: 'right', size: 13, bold: true, color: c.primary });
      g.text('単利', Y, S, { dx: -10, dy: 16, align: 'right', size: 13, bold: true, color: c.teal });
      // 差＝利息の利息(選んだ年、なければ最後の年)
      const t = st.sel >= 0 ? st.sel : Y, s1 = simple(P, r, t), c1 = comp(P, r, t), xt = t === Y ? Y - Y * 0.012 : t;
      if (st.sel >= 0) g.line(t, 0, t, Math.min(s1, c1), { color: c.text, width: 1, dash: [4, 4] });
      if (c1 - s1 > 0) {
        g.arrow(xt, (s1 + c1) / 2, xt, c1, { color: c.accent, width: 2.5, head: 10 });
        g.arrow(xt, (s1 + c1) / 2, xt, s1, { color: c.accent, width: 2.5, head: 10 });
        g.text('差＝利息の利息 ' + yen(c1 - s1), xt, (s1 + c1) / 2, { dx: t > Y / 2 ? -12 : 12, align: t > Y / 2 ? 'right' : 'left', size: 12.5, bold: true, color: c.accent });
      }
      if (st.sel >= 0) { g.dot(t, s1, { r: 6, color: c.teal }); g.dot(t, c1, { r: 6, color: c.primary }); g.text(t + '年後', t, 0, { dy: -64, align: 'center', size: 11.5, bold: true, color: c.text }); }
      g.textPx('色を塗った部分＝単利と複利の差（利息の利息）', 10, 32, { size: 12, bold: true, color: c.muted });
      if (!(dS <= Y) && isFinite(dS)) g.textPx('※ 単利で2倍になるのは ' + num(dS, 1) + ' 年後（グラフの外）', 10, 50, { size: 12, bold: true, color: c.teal });
    };
    update();
  }

  /* ==========================================================
     2.6(2) 利息を細かくつけるシミュレーター(元金100万円・年利100%・1年)
     ========================================================== */
  function initEBank() {
    const root = $id('w-ebank');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.02, xmax: 1.04, ymin: 85, ymax: 325, ratio: [0.75, 0.42] });
    const NS = [{ label: '年1回', n: 1 }, { label: '半年ごと', n: 2 }, { label: '3か月ごと', n: 4 }, { label: '毎月', n: 12 }, { label: '毎週', n: 52 },
      { label: '毎日', n: 365 }, { label: '毎時', n: 8760 }, { label: '毎分', n: 525600 }, { label: '毎秒', n: 31536000 }];
    const P = 1e6, LIM = P * Math.E;
    const st = { i: 3 };
    const bal = (n, k) => P * Math.exp(k * Math.log1p(1 / n)); // k 回つけた後の残高(円)
    const fin = (n) => bal(n, n);
    const yenI = (v) => Math.round(v).toLocaleString('ja-JP') + ' 円';
    const yenS = (v) => (v < 100 ? num(v, 2) : Math.round(v).toLocaleString('ja-JP')) + ' 円';
    const nTeX = (n) => n.toLocaleString('en-US').replace(/,/g, '{,}');
    const pct = (n) => { const p = 100 / n; return (p >= 1 ? num(p, 2) : String(Number(p.toPrecision(3)))) + '%'; };
    const card = (cls, k, v, sub) => '<div class="sum-card ' + cls + '"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + sub + '</div></div>';
    chipRow(R(root, 'ns'), NS, st.i, (it) => { st.i = NS.indexOf(it); update(); });
    function pick(i) {
      st.i = i;
      R(root, 'ns').querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
      update();
    }
    function update() {
      const it = NS[st.i], n = it.n, v = fin(n);
      R(root, 'summary').innerHTML =
        card('gray', '元金', '100 万円', '年利 100%・1 年間') +
        card('blue', it.label + '（' + n.toLocaleString('ja-JP') + ' 回）で 1 年後', yenI(v), '元金の ' + num(v / P, 6) + ' 倍') +
        card('teal', '年1回（200 万円）との差', '+' + yenI(v - 2 * P), '利息の利息がつく分') +
        card('accent', '上限：e 倍', yenI(LIM), 'あと ' + yenS(LIM - v));
      tex(root, 'calc', '100\\left(1+\\frac{1}{' + nTeX(n) + '}\\right)^{' + nTeX(n) + '}\\approx' + num(v / 1e4, 4) + '\\ \\text{万円}');
      let h = '';
      NS.forEach(function (s, i) {
        const f = fin(s.n), prev = i ? fin(NS[i - 1].n) : P;
        h += '<tr data-i="' + i + '"' + (i === st.i ? ' class="on"' : '') + '><td>' + s.label + '</td><td>' + s.n.toLocaleString('ja-JP') + '</td><td>' + pct(s.n) + '</td><td>' + yenI(f) +
          '</td><td>' + (i ? '+' + yenS(f - prev) : '+' + yenI(f - P) + '（元金から）') + '</td><td>' + yenS(LIM - f) + '</td></tr>';
      });
      R(root, 'tbody').innerHTML = h;
      plot.invalidate();
    }
    R(root, 'tbody').addEventListener('click', function (e) { const tr = e.target.closest('tr'); if (tr) pick(+tr.dataset.i); });
    plot.draw = function (g) {
      const c = g.c, n = NS[st.i].n, M = 1e4, sm = g.w < 480;
      g.grid({ stepX: 0.25, stepY: 50, labels: false });
      ['0', '3か月', '6か月', '9か月', '1年'].forEach((t, i) => g.text(t, i / 4, g.ymin, { dy: -10, align: 'center', size: 11, color: c.muted }));
      for (let y = 100; y <= 250; y += 50) g.text(String(y), g.xmin, y, { dx: 4, dy: -8, size: 11, color: c.muted });
      g.textPx('（万円）', 6, 14, { size: 11, color: c.muted });
      // 上限 e 倍と、年1回の 200 万円
      g.line(0, LIM / M, 1, LIM / M, { color: c.accent, width: 2, dash: [7, 6] });
      g.tex('\\text{上限}\\ 100e\\approx271.8\\ \\text{万円}', 0.04, LIM / M, { dy: -14, size: sm ? 13 : 15, color: c.accent });
      g.fn((t) => P * Math.exp(t) / M, { x0: 0, x1: 1, color: c.accent, width: 1.5, alpha: 0.5 });
      // 選んだ回数の階段
      const pts = [];
      if (n <= 600) {
        for (let k = 0; k < n; k++) { const b = bal(n, k) / M; pts.push([k / n, b], [(k + 1) / n, b]); }
        pts.push([1, fin(n) / M]);
        g.poly(pts, { color: c.primary, width: 3 });
      } else g.fn((t) => bal(n, Math.floor(t * n)) / M, { x0: 0, x1: 1, color: c.primary, width: 3 });
      // 年1回の階段(比較用)：青い階段の下に隠れないよう、上から点線で重ねる
      if (n !== 1) {
        g.poly([[0, 100], [1, 100], [1, 200]], { color: c.text, width: 2, dash: [6, 5], alpha: 0.75 });
        g.dot(1, 200, { r: 4.5, color: c.muted });
        // ラベルは縦の点線の左、青い階段より下の空いたところに
        g.text('年1回（比較）：200 万円', 1, 135, { dx: -8, align: 'right', size: 11.5, bold: true, color: c.muted });
      }
      g.dot(1, fin(n) / M, { r: 6, color: c.primary });
      g.text(NS[st.i].label + '：' + num(fin(n) / M, n >= 8760 ? 4 : 1) + ' 万円', 1, fin(n) / M, { dx: -8, dy: n === 1 ? -14 : 16, align: 'right', size: 12.5, bold: true, color: c.primary });
    };
    update();
  }

  /* ==========================================================
     2.6(2) (1+1/n)^n → e
     ========================================================== */
  function initELimit() {
    const root = $id('w-elimit'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.2, xmax: 6.3, ymin: 1.8, ymax: 3.1, ratio: [0.6, 0.4] }); // 上は説明文、下は目盛の数字のぶん空ける
    const su = slider(ctl, { tex: 'n', min: 0, max: 6, step: 0.05, value: 1, color: 'primary', fmt: (u) => Math.round(Math.pow(10, u)).toLocaleString('ja-JP'), aria: 'n（対数で選ぶ）' });
    const val = (n) => Math.pow(1 + 1 / n, n);
    function update() {
      const n = Math.round(Math.pow(10, su.get())), v = val(n);
      tex(root, 'val', '\\left(1+\\frac{1}{' + n + '}\\right)^{' + n + '}=' + v.toFixed(8));
      tex(root, 'diff', 'e-(\\text{値})\\approx' + (Math.E - v).toExponential(2).replace(/e([+-]\d+)/, '\\times10^{$1}') + '\\quad(\\text{一致する桁：}' + (Math.E - v).toFixed(12).replace(/^0\.(0*)\d*$/, (m, z) => z.length) + '\\text{ 桁})');
      plot.invalidate();
    }
    su.on(update);
    plot.draw = function (g) {
      const c = g.c, u = su.get();
      g.grid({ stepX: 1, stepY: 0.1, labels: false });
      for (let k = 0; k <= 6; k++) g.tex('10^{' + k + '}', k, g.ymin, { dy: -11, align: 'center', size: 12, color: c.muted });
      for (let y = 2; y <= 2.8 + 1e-9; y += 0.2) g.text(num(y, 1), g.xmin, y, { dx: 4, size: 11, color: c.muted });
      g.line(g.xmin, Math.E, g.xmax, Math.E, { color: c.accent, width: 2, dash: [7, 6] });
      g.tex('e=2.71828\\cdots', g.xmax, Math.E, { dx: -6, dy: -13, align: 'right', size: 14, color: c.accent });
      g.fn((x) => val(Math.pow(10, x)), { x0: 0, x1: 6, color: c.primary, width: 3 });
      [1, 2, 3, 5, 10, 100, 1000, 1e4, 1e5, 1e6].forEach((n) => g.dot(Math.log10(n), val(n), { r: 3.5, color: c.primary }));
      g.dot(u, val(Math.round(Math.pow(10, u))), { r: 8, color: c.amber });
      g.texPx(g.w < 480 ? '\\text{横軸：回数 }n\\text{（対数目盛）　縦軸：何倍か}' : '\\text{横軸：利息をつける回数 }n\\text{（対数目盛）　縦軸：1年後に元金の何倍か}', 34, 17, { size: 13, color: c.text });
    };
    update();
  }

  /* ==========================================================
     2.6(3) リボ払い
     ========================================================== */
  function initRevo() {
    const root = $id('w-revo'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 40, ymin: 0, ymax: 35, ratio: [0.6, 0.38] });
    const sP = slider(ctl, { tex: '\\text{買い物}', min: 10, max: 100, step: 5, value: 30, color: 'accent', fmt: (v) => v + '万円' });
    const sR = slider(ctl, { tex: '\\text{年率}', min: 0, max: 30, step: 0.5, value: 15, color: 'amber', fmt: (v) => num(v, 1) + '%' });
    const sM = slider(ctl, { tex: '\\text{返済}', min: 0.3, max: 5, step: 0.1, value: 1, color: 'teal', fmt: (v) => num(v, 1) + '万円' });
    const mr = () => sR.get() / 1200; // 月利 = 年率 ÷ 12
    let sim = null;
    function simulate() {
      let bal = sP.get() * 1e4, total = 0, months = 0;
      const r = mr(), pay = sM.get() * 1e4, hist = [bal], rows = [];
      const never = pay <= Math.round(bal * r);
      const lim = never ? 24 : 600;
      while (bal > 0 && months < lim) {
        const it = Math.round(bal * r), p = never ? pay : Math.min(pay, bal + it);
        bal = bal + it - p; total += p; months++; hist.push(bal);
        rows.push([months, p, it, p - it, bal]);
      }
      return { never, months, total, hist, rows, first: Math.round(sP.get() * 1e4 * r) };
    }
    function update() {
      sim = simulate();
      const P = sP.get() * 1e4, yen = (v) => Math.round(v).toLocaleString('ja-JP');
      R(root, 'tbody').innerHTML = sim.rows.map((w) => '<tr><td>' + w[0] + '</td><td>' + yen(w[1]) + '</td><td>' + yen(w[2]) + '</td><td' + (w[3] < 0 ? ' class="t-red"' : '') + '>' + (w[3] < 0 ? '−' + yen(-w[3]) : yen(w[3])) + '</td><td>' + yen(w[4]) + '</td></tr>').join('') +
        (sim.never ? '<tr><td colspan="5">… 利息が返済額以上なので、残高は増え続けます</td></tr>' : '');
      if (sim.never) {
        R(root, 'months').textContent = '⚠ 終わりません！';
        R(root, 'total').textContent = '毎月の利息（' + sim.first.toLocaleString('ja-JP') + ' 円）が返済額以上なので、借金が減らない';
        R(root, 'interest').textContent = '返済額を増やそう';
        plot.setView({ xmin: -24 * 0.09, xmax: 24, ymin: -P / 1e4 * 0.16, ymax: P / 1e4 * 1.3 });
      } else {
        R(root, 'months').textContent = sim.months + ' か月（' + Math.floor(sim.months / 12) + ' 年 ' + (sim.months % 12) + ' か月）';
        R(root, 'total').textContent = sim.total.toLocaleString('ja-JP') + ' 円';
        R(root, 'interest').textContent = (sim.total - P).toLocaleString('ja-JP') + ' 円（買い物の ' + num((sim.total - P) / P * 100, 1) + '%）';
        // 下に少し余白(目盛の数字と「か月」が重ならないように)、右は「か月」のぶん空ける
        // 左は縦軸の数字と原点 O のぶんも空ける
        const xm = Math.max(6, sim.months * 1.1);
        plot.setView({ xmin: -xm * 0.09, xmax: xm, ymin: -P / 1e4 * 0.16, ymax: P / 1e4 * 1.3 });
      }
      plot.invalidate();
    }
    [sP, sR, sM].forEach((s) => s.on(update));
    plot.draw = function (g) {
      const c = g.c;
      g.grid({ stepX: niceStep(g.xmax / 8), stepY: niceStep(g.ymax / 5), xlabel: 'か月', ylabel: '万円' });
      if (sim.never) {
        g.fn((t) => sP.get() * Math.pow(1 + mr(), t) - sM.get() * (Math.pow(1 + mr(), t) - 1) / mr(), { x0: 0, x1: g.xmax, color: c.accent, width: 4 });
        g.textPx('⚠ 残高が減らない（むしろ増える）', g.w - 10, g.Y(sP.get() * 0.55), { align: 'right', size: 13, bold: true, color: c.accent });
        return;
      }
      g.poly(sim.hist.map((b, i) => [i, b / 1e4]), { color: c.accent, width: 3.5 });
      g.line(0, sP.get(), sP.get() / sM.get(), 0, { color: c.teal, width: 2, dash: [5, 5] });
      // 凡例(色つき)に完済までの月数もまとめる。右上は線がないので、右寄せで置く(左上は「万円」の軸ラベル)
      const n0 = sP.get() / sM.get(), fs = g.w < 480 ? 11.5 : 12.5;
      g.textPx('赤：リボ払いの残高（' + (sim.hist.length - 1) + ' か月で完済）', g.w - 10, 16, { align: 'right', size: fs, bold: true, color: c.accent });
      g.textPx('緑の点線：利息がなければ ' + Math.ceil(n0) + ' か月で完済', g.w - 10, 34, { align: 'right', size: fs, bold: true, color: c.teal });
    };
    update();
  }

  /* ==========================================================
     2.6(4) チャレンジ：接線の傾きを合わせろ
     ========================================================== */
  const E_STAGES = [
    { s: 1, text: '$y=a^x$ の $x=0$ での接線の傾きが <b>ちょうど 1</b> になる $a$ を見つけよう。',
      hint: 'a = 2 だと傾きは 1 より小さく、a = 3 だと 1 より大きい。その間にある。',
      answer: '<b>a = e ≈ 2.718</b><br>$y=a^x$ の $x=0$ での接線の傾きは $\\log a$（自然対数）。$\\log a=1$ となるのは $a=e$。だから $(e^x)\'=e^x$ で、$y=e^x$ はどこでも「傾き＝高さ」。' },
    { s: 2, text: '傾きが <b>2</b> になる $a$ を見つけよう。',
      hint: '傾きは log a。log a = 2 となる a は e の何乗？',
      answer: '<b>a = e² ≈ 7.389</b><br>$\\log a=2$ より $a=e^2$。' },
    { s: 0.5, text: '傾きが <b>0.5</b> になる $a$ を見つけよう。',
      hint: 'log a = 1/2 となる a は？ e の平方根。',
      answer: '<b>a = √e ≈ 1.649</b><br>$\\log a=\\frac12$ より $a=e^{\\frac12}=\\sqrt e$。' },
  ];
  function initGameE() {
    const root = $id('w-game-e');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.2, xmax: 3.2, ymin: -0.6, ymax: 8.2, ratio: [0.95, 0.62] });
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\blue{a}', min: 1.1, max: 8, step: 0.01, value: 2, color: 'primary', fmt: (v) => v.toFixed(2) });
    const B = gameButtons(ctl, '✅ 決定');
    const conf = Confetti(root, plot);
    const st = { shots: [] };
    const S = () => E_STAGES[game.k];
    const game = GameShell(root, { key: '2-6:game', stages: E_STAGES,
      formula: () => 'y=' + C('blue', sa.get().toFixed(2)) + '^{x}\\quad(\\text{目標の傾き }' + S().s + ')',
      onStage() { st.shots = []; B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission')); plot.invalidate(); } });
    sa.on(() => { game.formula(); plot.invalidate(); });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const a = sa.get(), k = Math.log(a), e = Math.abs(k - S().s);
      st.shots.push(a); game.used++; game.renderThrows();
      const n = e <= 0.005 ? 3 : e <= 0.02 ? 2 : e <= 0.06 ? 1 : 0;
      if (n) game.award(n);
      const msg = '傾き ＝ ' + k.toFixed(4) + '（目標 ' + S().s + '）　' + (n ? starStr(n) : '★なし');
      if (n === 3) { game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= E_STAGES.length - 1; game.result('🎉 ぴったり！ a = ' + a.toFixed(2) + '　' + msg, 'hit'); conf.fire(plot.X(0), plot.Y(1)); }
      else if (game.used >= 3) { B.bMain.disabled = true; B.bNext.hidden = game.k >= E_STAGES.length - 1; game.result(msg + '　― 判定を使い切りました（記録：' + starStr(game.best[game.k + 1] || 0) + '）', n ? 'hit' : 'miss'); }
      else game.result(msg + '　' + (k > S().s ? 'a を小さく' : 'a を大きく') + 'しよう', n ? 'hit' : 'miss');
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, E_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, a = sa.get(), k = Math.log(a), s = S().s;
      g.grid({ xlabel: 'x', ylabel: 'y' });
      g.fn((x) => 1 + s * x, { color: c.amber, width: 3, dash: [8, 6] });
      const narrow = g.w < 480; // 狭い画面では目標の傾きは上の説明文に入れる(ラベルの重なりを避ける)
      if (!narrow) g.tex('\\text{目標の傾き }' + s, 2, 1 + s * 2, { dx: 10, dy: 22, size: 14, color: c.amber });
      g.fn((x) => Math.pow(a, x), { color: c.primary, width: 4 });
      g.fn((x) => 1 + k * x, { color: c.teal, width: 2.5 });
      // 接線の傾き(x が 1 進むと y が k 上がる)を小さな三角形で示す
      g.line(0, 1, 1, 1, { color: c.teal, width: 1.5, dash: [3, 3] });
      g.line(1, 1, 1, 1 + k, { color: c.teal, width: 1.5, dash: [3, 3] });
      g.tex('\\text{傾き }' + num(k, 3), 1, 1 + k / 2, { dx: 6, size: 14, color: c.teal });
      g.dot(0, 1, { r: 6, color: c.text });
      const yl = Math.min(Math.pow(a, 2.3), 6.5), xl = Math.log(yl) / k;
      g.tex('y=' + a.toFixed(2) + '^x', xl, yl, { dx: -10, align: 'right', size: 15, color: c.primary });
      // 説明文は y 軸の左（グラフがない左上）に 2 行で。y 軸や目盛の数字と重ならないように
      const lf = { size: narrow ? 12 : 13.5, color: c.text };
      g.texPx(narrow ? '\\text{青：}y=a^x\\text{　緑：接線}' : '\\text{青：}y=a^x\\text{　緑：}(0,\\,1)\\text{ での接線}', 8, 17, lf);
      g.texPx(narrow ? '\\text{金：傾き }' + s + '\\text{ の直線}' : '\\text{金：目標の傾きの直線}', 8, 39, lf);
      conf.draw(g);
    };
    game.setStage(0);
  }


  function boot() {
    [[initPowCards, 'w-pow-cards'], [initPowCancel, 'w-pow-cancel'], [initRoot, 'w-root'], [initPowFrac, 'w-pow-frac'], [initGamePow, 'w-game-pow'],
      [initExpBasic, 'w-expbasic'], [initExpGraph, 'w-expgraph'], [initExpRace, 'w-exprace'], [initGameExpCoin, 'w-game-expcoin'],
      [initOrigami, 'w-origami'], [initBaibain, 'w-baibain'], [initGamePredict, 'w-game-predict'],
      [initLogDef, 'w-logdef'], [initDigits, 'w-digits'], [initGameLog, 'w-game-log'],
      [initLogScale, 'w-logscale'], [initScales, 'w-scales'], [initPiano, 'w-piano'], [initGuessCpu, 'w-guess-cpu'], [initGameGuess, 'w-game-guess'],
      [initCompound, 'w-compound'], [initEBank, 'w-ebank'], [initELimit, 'w-elimit'], [initRevo, 'w-revo'], [initGameE, 'w-game-e'],
    ].forEach(function (e) {
      if (!$id(e[1])) return;
      try { e[0](); } catch (err) { console.error(e[0].name, err); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
