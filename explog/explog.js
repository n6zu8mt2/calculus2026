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
      if (big) g.text('10' + sup(k), k, y0, { dy: 16, align: 'center', size: 11, color: c.muted });
    }
    items.forEach(function (it, i) {
      const x = Math.log10(it[1]);
      if (x < g.xmin || x > g.xmax) return;
      const hi = opt.target === i, lvl = i % 3;
      const yy = y0 + 0.13 + lvl * 0.13;
      g.line(x, y0, x, yy - 0.04, { color: hi ? c.teal : c.muted, width: hi ? 2.5 : 1, dash: hi ? [] : [3, 3] });
      const span = g.xmax - g.xmin, al = x > g.xmax - span * 0.1 ? 'right' : x < g.xmin + span * 0.08 ? 'left' : 'center';
      g.text((it[2] ? it[2] + ' ' : '') + it[0], x, yy, { align: al, dx: al === 'right' ? 6 : al === 'left' ? -6 : 0, size: g.w < 520 ? 10.5 : 12, bold: hi, color: hi ? c.teal : c.text });
    });
  }
  function rulerMarker(g, lv, label, color, y0, dyText) {
    y0 = y0 || 0.42;
    const c = g.c, x = clamp(lv, g.xmin, g.xmax), px = g.X(x), py = g.Y(y0);
    const ctx = g.ctx;
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(px, py + 4); ctx.lineTo(px - 9, py + 20); ctx.lineTo(px + 9, py + 20); ctx.closePath(); ctx.fill(); ctx.restore();
    g.text(label, x, y0, { dy: dyText || 34, align: x > (g.xmin + g.xmax) / 2 ? 'right' : 'left', dx: x > (g.xmin + g.xmax) / 2 ? 8 : -8, size: 12.5, bold: true, color: color });
  }

  /* ==========================================================
     2.1(1) パターンで指数を広げる(カード)
     ========================================================== */
  function initPowCards() {
    const root = $id('w-pow-cards'), row = R(root, 'row');
    const st = { a: 2, lo: 1, hi: 4, open: new Set() };
    const msg = (t) => { R(root, 'msg').textContent = t; };
    chipRow(R(root, 'bases'), [{ label: '2', a: 2 }, { label: '3', a: 3 }, { label: '10', a: 10 }], 0, (it) => { st.a = it.a; reset(); });
    function valTeX(a, n) {
      if (n >= 0) return Math.pow(a, n).toLocaleString('ja-JP');
      const d = Math.pow(a, -n);
      return '\\frac{1}{' + d.toLocaleString('ja-JP') + '}' + (a === 10 ? '=' + (1 / d).toFixed(-n) : '');
    }
    function render() {
      row.innerHTML = '';
      for (let n = st.lo; n <= st.hi; n++) {
        if (n > st.lo) {
          const ar = el('div', 'parrow', '<span>×' + st.a + ' →</span><span>← ÷' + st.a + '</span>');
          row.append(ar);
        }
        const hidden = n <= 0 && !st.open.has(n);
        const card = el('button', 'pcard' + (n < 0 ? ' neg' : n === 0 ? ' zero' : '') + (hidden ? ' hidden' : ''));
        card.type = 'button';
        card.innerHTML = '<span class="pe"></span><span class="pv"></span>';
        setTex(card.querySelector('.pe'), st.a + '^{' + n + '}');
        if (hidden) card.querySelector('.pv').textContent = '？';
        else setTex(card.querySelector('.pv'), '=' + valTeX(st.a, n));
        card.addEventListener('click', function () {
          if (!st.open.has(n)) {
            st.open.add(n); render();
            if (n === 0) msg('🎉 ' + st.a + '⁰ = 1。どんな数でも 0 乗は 1 になります（' + st.a + '¹ を ' + st.a + ' で割ると 1）。');
            else if (n === -1) msg('🎉 ' + st.a + '⁻¹ = 1/' + st.a + '。マイナス1乗は「逆数」です。');
            else if (n < 0) msg('🎉 ' + st.a + sup(n) + ' = 1/' + st.a + sup(-n) + '。÷' + st.a + ' をくり返すと、分母に ' + st.a + ' がかかっていきます。');
          }
        });
        row.append(card);
      }
    }
    function reset() { st.lo = 1; st.hi = 4; st.open = new Set(); render(); msg('「← 左へ1つ進む」を押して、2¹ より左のカードを作ってみよう。'); }
    root.querySelector('[data-a="left"]').addEventListener('click', function () {
      if (st.lo <= -5) { msg('ここまで！ 規則が見えてきましたか？'); return; }
      st.lo--; render(); row.scrollLeft = 0;
      msg('新しいカード ' + st.a + sup(st.lo) + ' の値を予想してから、カードをクリックしてめくろう。');
    });
    root.querySelector('[data-a="right"]').addEventListener('click', function () { if (st.hi < 6) { st.hi++; render(); row.scrollLeft = row.scrollWidth; } });
    root.querySelector('[data-a="open"]').addEventListener('click', function () { for (let n = st.lo; n <= 0; n++) st.open.add(n); render(); msg('右から左へ、1つ進むごとに ÷' + st.a + ' になっているか確かめよう。'); });
    root.querySelector('[data-a="reset"]').addEventListener('click', reset);
    reset();
  }

  /* ==========================================================
     2.1(2) 指数法則
     ========================================================== */
  function initPowLaw() {
    const root = $id('w-pow-law'), ctl = root.querySelector('.controls');
    const sm = slider(ctl, { tex: '\\teal{m}', min: -4, max: 4, step: 1, value: 3, color: 'teal' });
    const sn = slider(ctl, { tex: '\\red{n}', min: -4, max: 4, step: 1, value: -3, color: 'accent' });
    const v = (k) => (k >= 0 ? String(Math.pow(2, k)) : '\\frac{1}{' + Math.pow(2, -k) + '}');
    function update() {
      const m = sm.get(), n = sn.get();
      tex(root, 'mul', '2^{' + C('teal', m) + '}\\times2^{' + C('red', n) + '}=' + v(m) + '\\times' + v(n) + '=' + v(m + n) + '=2^{' + C('teal', m) + (n < 0 ? '' : '+') + C('red', n) + '}');
      tex(root, 'pow', '\\left(2^{' + C('teal', m) + '}\\right)^{' + C('red', n) + '}=2^{' + C('teal', m) + '\\times' + (n < 0 ? '(' + C('red', n) + ')' : C('red', n)) + '}=' + v(m * n));
      R(root, 'note').innerHTML = m + n === 0 ? '✔ $m+n=0$ なので、答えは $2^0=1$。$2^{-n}$ と $2^n$ をかけると $1$ → $2^{-n}$ は $2^n$ の逆数 $\\dfrac1{2^n}$ でなければならない。' :
        (m === 0 || n === 0) ? '✔ $2^0$ をかけても値が変わらない → $2^0=1$ でなければならない。' : '$m+n=0$ や、$m,\\ n$ のどちらかが $0$ になるようにしてみよう。';
      typeset(R(root, 'note'));
    }
    sm.on(update); sn.on(update);
    update();
  }

  /* ==========================================================
     2.1(3) 分数の指数で間を埋める
     ========================================================== */
  function initPowFrac() {
    const root = $id('w-pow-frac');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.4, xmax: 3.4, ymin: -0.7, ymax: 9, ratio: [0.78, 0.5] });
    const st = { k: 2, x: 0.5, curve: false };
    chipRow(R(root, 'ks'), [1, 2, 3, 4, 6, 12].map((k) => ({ label: String(k), k })), 1, (it) => { st.k = it.k; st.x = snap(st.x, 1 / st.k); update(); });
    R(root, 'curve').addEventListener('change', (e) => { st.curve = e.target.checked; plot.invalidate(); });
    function rootForm(x) {
      const f = fracParts(x, 12);
      if (!f || f[1] === 1) return fracTeX(Math.pow(2, x), 64);
      const p = f[0], q = f[1], inner = Math.abs(p) === 1 ? '2' : '2^{' + Math.abs(p) + '}';
      const r = q === 2 ? '\\sqrt{' + inner + '}' : '\\sqrt[' + q + ']{' + inner + '}';
      return p < 0 ? '\\frac{1}{' + r + '}' : r;
    }
    function update() {
      const k = st.k, x = st.x;
      tex(root, 'step', k === 1 ? '2^{1}=2\\ \\text{（1 歩で 2 倍）}' : '2^{\\frac1{' + k + '}}=' + (k === 2 ? '\\sqrt2' : '\\sqrt[' + k + ']{2}') + '\\approx' + num(Math.pow(2, 1 / k), 4) + '\\ \\text{（' + k + ' 歩で 2 倍）}');
      tex(root, 'pt', '2^{' + fracTeX(x, 12) + '}=' + rootForm(x) + '\\approx' + num(Math.pow(2, x), 4));
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
      if (k > 1) g.text('1歩ごとに ×' + num(Math.pow(2, 1 / k), 3), -2 + 1 / (2 * k), Math.pow(2, -2 + 1 / (2 * k)), { dy: -22, align: 'center', size: 12, bold: true, color: c.teal });
      g.textPx('大きな点：整数の指数　小さな点：1/' + k + ' ずつの指数', 10, 16, { size: 12, bold: true, color: c.muted });
    };
    update();
  }

  /* ==========================================================
     2.1(4) チャレンジ：指数ハンター
     ========================================================== */
  const POW_STAGES = [
    { t: '\\frac18', x: -3, text: '$2^x=\\frac18$ となる $x$ を求めよう。', hint: '8 = 2³。「逆数」はマイナスの指数で表せる。',
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
      formula: () => '2^{' + fracTeX(sx.get(), 6) + '}\\approx' + num(Math.pow(2, sx.get()), 4) + '\\qquad(\\text{目標 }' + S().t + '\\approx' + num(target(), 4) + ')',
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
      g.text('(0, 1)', 0, 1, { dx: -8, dy: 12, align: 'right', size: 11.5, bold: true, color: c.primary });
      g.dot(0, T, { r: 6.5, color: c.amber });
      g.text('目標の高さ ≈ ' + num(T, 3), 0, T, { dx: 10, dy: -13, size: 12.5, bold: true, color: c.amber });
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
     2.2(1) 指数関数のグラフと平行移動
     ========================================================== */
  function initExpGraph() {
    const root = $id('w-expgraph');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 5, ymin: -3, ymax: 9, ratio: [0.9, 0.62] });
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
      g.text('漸近線 y = ' + L.minus(num(q)), g.xmax, q, { dx: -8, dy: 14, align: 'right', size: 12, bold: true, color: c.accent });
      if (st.mirror) g.fn((x) => Math.pow(a, -(x - p)) + q, { color: c.muted, width: 2.5, dash: [7, 6] });
      g.fn(f, { color: c.primary, width: 4 });
      if (st.steps && a !== 1) {
        for (let k = 0; k < 3; k++) {
          const x0 = p + k, y0 = f(x0), y1 = f(x0 + 1);
          if (y1 > g.ymax || y0 > g.ymax) break;
          g.line(x0, y0, x0 + 1, y0, { color: c.text, width: 1.5, alpha: 0.6 });
          g.line(x0 + 1, y0, x0 + 1, y1, { color: c.teal, width: 3 });
          g.text('×' + num(a), x0 + 1, (y0 + y1) / 2, { dx: 6, size: 12, bold: true, color: c.teal });
        }
      }
      g.dot(p, q + 1, { r: 6, color: c.text });
      g.text('(' + L.minus(num(p)) + ', ' + L.minus(num(q + 1)) + ')', p, q + 1, { dx: -10, dy: -12, align: 'right', size: 12, bold: true });
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
      if (st.log) plot.setView({ xmin: 0, xmax: X, ymin: -1, ymax: Math.log10(mx) * 1.06 + 0.5 });
      else plot.setView({ xmin: 0, xmax: X, ymin: -mx * 0.04, ymax: mx * 1.08 });
      R(root, 'cross').innerHTML = '$x>' + num(xs, 2) + '$ では、ずっと $2^x$ の方が大きい（$x^{' + k + '}$ を追い抜く）' + (xs > X ? '　→ 範囲を広げて確かめよう' : '');
      typeset(R(root, 'cross'));
      tex(root, 'vals', '2^{' + X + '}=' + sciTeX(Math.pow(2, X)) + ',\\quad ' + X + '^{' + k + '}=' + sciTeX(Math.pow(X, k)));
      plot.invalidate();
    }
    sX.on(update);
    plot.draw = function (g) {
      const c = g.c, k = st.k, X = sX.get(), T = st.log ? (v) => Math.log10(v) : (v) => v;
      const sx = niceStep(X / 8);
      const ly = g.ymax > 30 ? 5 : g.ymax > 12 ? 2 : 1;
      g.grid({ stepX: sx, stepY: st.log ? ly : niceStep((g.ymax - g.ymin) / 5), labels: false, xlabel: 'x' });
      for (let x = 0; x <= X + 1e-9; x += sx) g.text(String(Math.round(x)), x, g.ymin, { dy: -10, align: 'center', size: 11, color: c.muted });
      if (st.log) {
        for (let y = 0; y <= g.ymax; y += ly) g.text('10' + sup(y), 0, y, { dx: 6, size: 11, color: c.muted });
      } else g.textPx('上端 ≈ ' + L.minus(Math.round(g.ymax).toExponential(1)), 10, 16, { size: 12, color: c.muted, bold: true });
      g.fn((x) => T(Math.pow(2, x)), { x0: 0, x1: X, color: c.primary, width: 4, samples: 300 });
      g.fn((x) => T(Math.pow(x, k)), { x0: 1e-3, x1: X, color: c.teal, width: 3, samples: 300 });
      const xs = crossing(k);
      if (xs <= X) { g.line(xs, g.ymin, xs, g.ymax, { color: c.amber, width: 1.8, dash: [6, 5] }); g.text('追い抜く x ≈ ' + num(xs, 2), xs, g.ymax, { dx: -6, dy: 44, align: 'right', size: 12, bold: true, color: c.amber }); }
      g.textPx('青：2ˣ　緑：x' + sup(k) + (st.log ? '　（縦軸：対数目盛）' : ''), g.w - 10, 16, { align: 'right', size: 12.5, bold: true, color: c.text });
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
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 6, ymin: -3, ymax: 9.5, ratio: [0.9, 0.62] });
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
          '&\\text{必ず通る点 }(' + C('teal', s.p) + ',\\ ' + C('red', s.q) + '+1)\\text{、} x\\text{ が 1 増えると } y-' + C('red', s.q) + '\\text{ は } ' + C('blue', num(s.a)) + '\\text{ 倍}\\end{aligned}';
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
        g.text('(p, q+1)', s.p, s.q + 1, { dx: -8, dy: -12, align: 'right', size: 12, bold: true });
        S.coins.forEach((p) => gapMark(g, p[0], f(s, p[0]), p[1], p[0] <= s.p));
      }
      const last = st.shots[st.shots.length - 1];
      S.coins.forEach(function (p) {
        const got = last && on(last, p);
        g.dot(p[0], p[1], { r: 11, color: got ? c.teal : c.amber });
        g.text(got ? '✓' : '¥', p[0], p[1], { align: 'center', size: 13, bold: true, color: '#fff', halo: false });
        g.text('(' + L.minus(p[0]) + ', ' + fracTxt(p[1], 4) + ')', p[0], p[1], { dx: 15, dy: -14, size: 12, color: c.muted, bold: true });
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
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 15, ymin: 0, ymax: 1, ratio: [0.5, 0.24] });
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
      drawLogRuler(g, LEN_MARKS, { every: 1 });
      rulerMarker(g, Math.log10(mm()), '紙の厚さ（' + sn.get() + '回）', c.amber);
      g.textPx('対数目盛：1目盛ごとに 10 倍（単位 mm）', 10, 14, { size: 12, bold: true, color: c.muted });
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
      tex(root, 'vol', '10^{-4}\\times2^{' + n + '}\\approx' + sciFromLog(lv()) + '\\ \\mathrm{m^3}');
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
      drawLogRuler(g, VOL_MARKS, { every: 10 });
      rulerMarker(g, lv(), '栗まんじゅう全体', c.amber);
      g.textPx('対数目盛（単位 m³）：目盛は 10 倍ずつ、数字は 10¹⁰ ごと', 10, 14, { size: 12, bold: true, color: c.muted });
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
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 15, ymin: 0, ymax: 1, ratio: [0.62, 0.3] });
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
        drawLogRuler(g, LEN_MARKS, { every: 1, target: ti });
        if (st.shown) {
          rulerMarker(g, Math.log10(0.1 * Math.pow(2, st.shown.g)), 'あなた：' + st.shown.g + '回', c.accent);
          rulerMarker(g, Math.log10(0.1 * Math.pow(2, s.ans)), '正解：' + s.ans + '回', c.teal, 0.42, 52);
        }
        g.textPx('対数目盛（単位 mm）', 10, 14, { size: 12, bold: true, color: c.muted });
      } else {
        drawLogRuler(g, VOL_MARKS, { every: 10, target: VOL_MARKS.length - 1 });
        if (st.shown) {
          rulerMarker(g, -4 + (st.shown.g * 12) * LOG2, 'あなた：' + st.shown.g + '時間後', c.accent);
          rulerMarker(g, -4 + (s.ans * 12) * LOG2, '正解：' + s.ans + '時間後', c.teal, 0.42, 52);
        }
        g.textPx('対数目盛（単位 m³）', 10, 14, { size: 12, bold: true, color: c.muted });
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
    const st = { b: BASES[0], x: 4 };
    chipRow(R(root, 'bases'), BASES, 0, (it) => { st.b = it; update(); });
    const lg = (x) => Math.log(x) / Math.log(st.b.a);
    function update() {
      const y = lg(st.x);
      tex(root, 'log', '\\log_{' + st.b.t + '}' + num(st.x, 2) + '=' + num(y, 3));
      tex(root, 'exp', st.b.t + '^{' + num(y, 3) + '}=' + num(st.x, 2) + '\\quad(' + st.b.t + '\\text{ を } ' + num(y, 3) + '\\text{ 乗すると } ' + num(st.x, 2) + ')');
      plot.invalidate();
    }
    plot.addHandle({ get x() { return st.x; }, get y() { return lg(st.x); }, get color() { return plot.c.primary; }, r: 8,
      drag(x) { st.x = clamp(snap(x, 0.05), 0.05, 8); update(); } });
    plot.draw = function (g) {
      const c = g.c, a = st.b.a, x = st.x, y = lg(x);
      g.grid({ xlabel: 'x', ylabel: 'y' });
      g.fn((t) => t, { color: c.muted, width: 1.5, dash: [6, 6] });
      g.text('y = x', 4.6, 4.6, { dx: 8, size: 12, color: c.muted, bold: true });
      g.fn((t) => Math.pow(a, t), { color: c.amber, width: 3.5 });
      g.fn(lg, { x0: 0.001, x1: g.xmax, color: c.primary, width: 4, samples: 400 });
      g.line(x, 0, x, y, { color: c.primary, width: 1.5, dash: [4, 4] });
      g.line(0, y, x, y, { color: c.primary, width: 1.5, dash: [4, 4] });
      g.line(x, y, y, x, { color: c.text, width: 1.5, dash: [3, 4], alpha: 0.7 });
      g.dot(y, x, { r: 6, color: c.amber });
      g.text('(' + num(y, 2) + ', ' + num(x, 2) + ')', y, x, { dx: -8, dy: -12, align: 'right', size: 12, bold: true, color: c.amber });
      g.text('(' + num(x, 2) + ', ' + num(y, 2) + ')', x, y, { dx: 12, dy: 14, size: 12, bold: true, color: c.primary });
      g.textPx('青：y = log_a x　金：y = aˣ（直線 y = x について対称）', 10, 16, { size: 12, bold: true, color: c.text });
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
    const nTxt = (s) => s.length <= 9 ? Number(s).toLocaleString('ja-JP') : s[0] + '.' + s.slice(1, 3) + '×10' + sup(s.length - 1);
    const pow10 = (j) => j <= 4 ? Math.pow(10, j).toLocaleString('ja-JP') : '10' + sup(j);
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
        g.text((j + 1) + ' 桁の数', j + 0.5, 0.75, { align: 'center', size: sm ? 12 : 14.5, bold: true, color: on ? c.teal : c.muted });
        g.text(j <= 3 ? pow10(j) + '〜' + (Math.pow(10, j + 1) - 1).toLocaleString('ja-JP') : pow10(j) + '〜', j + 0.5, 0.62, { align: 'center', size: sm ? 9.5 : 11, color: on ? c.teal : c.muted });
      }
      g.line(g.xmin, yN, g.xmax, yN, { color: c.axis, width: 2 });
      g.line(g.xmin, yL, g.xmax, yL, { color: c.axis, width: 2 });
      for (let j = Math.max(0, Math.ceil(g.xmin)); j <= g.xmax; j++) {
        g.line(j, yL, j, yN, { color: c.muted, width: 1, dash: [3, 4] });
        g.line(j, yN - 0.03, j, yN + 0.03, { color: c.axis, width: 2 });
        g.text(pow10(j), j, yN, { dy: 12, align: 'center', size: 11, bold: true, color: c.text });
        g.line(j, yL - 0.03, j, yL + 0.03, { color: c.axis, width: 2 });
        g.text(String(j), j, yL, { dy: 13, align: 'center', size: 12, bold: true, color: c.text });
      }
      g.text('数 N', g.xmin, yN, { dx: 4, dy: -10, size: 11.5, bold: true, color: c.muted });
      g.text('log₁₀N', g.xmin, yL, { dx: 4, dy: -10, size: 11.5, bold: true, color: c.muted });
      // a^n の位置(上下で同じ位置)
      const x = clamp(v, g.xmin, g.xmax);
      g.line(x, yL, x, yT + 0.06, { color: c.accent, width: 2.5 });
      g.dot(x, yN, { r: 6, color: c.accent }); g.dot(x, yL, { r: 6, color: c.accent });
      const right = x > (g.xmin + g.xmax) / 2, al = right ? 'right' : 'left', dx = right ? -8 : 8;
      g.text(sa.get() + sup(sn.get()) + ' = ' + nTxt(big()), x, yT + 0.06, { dx, dy: -2, align: al, size: 13, bold: true, color: c.accent });
      g.text('log₁₀N ≈ ' + num(v, 3), x, yL, { dx, dy: -12, align: al, size: 12.5, bold: true, color: c.accent });
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
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4.3, xmax: 4.3, ymin: -0.6, ymax: 9, ratio: [0.75, 0.45] });
    const ctl = root.querySelector('.controls');
    const sy = slider(ctl, { tex: '\\text{答え}', min: -4, max: 4, step: 1 / 6, value: 1, color: 'accent', fmt: (v) => fracTxt(v, 6) });
    const B = gameButtons(ctl, '✅ 決定');
    const conf = Confetti(root, plot);
    const st = { shots: [] };
    const S = () => LOG_STAGES[game.k];
    const game = GameShell(root, { key: '2-4:game', stages: LOG_STAGES,
      formula: () => S().at + '^{' + fracTeX(sy.get(), 6) + '}\\approx' + num(Math.pow(S().a, sy.get()), 4) + '\\qquad(\\text{目標 }' + S().xt + ')',
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
      g.text('(0, 1)', 0, 1, { dx: -8, dy: 12, align: 'right', size: 11.5, bold: true, color: c.amber });
      g.dot(0, s.x, { r: 6.5, color: c.teal });
      g.text('目標の高さ ' + num(s.x, 4) + '（真数）', 0, s.x, { dx: 10, dy: -13, size: 12.5, bold: true, color: c.teal });
      const y = sy.get();
      g.line(y, 0, y, Math.pow(s.a, y), { color: c.accent, width: 2, dash: [5, 5] });
      g.dot(y, Math.pow(s.a, y), { r: 7, ring: true, color: c.accent });
      st.shots.forEach((v, i) => g.text(String(i + 1), v, 0, { dy: 16, align: 'center', size: 12, bold: true, color: c.muted }));
      g.textPx('金：y = ' + s.at.replace(/\\frac(\d)(\d)/, '$1/$2') + 'ˣ', g.w - 10, 16, { align: 'right', size: 12.5, bold: true, color: c.amber });
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
      if (st.log) { drawLogRuler(g, SIZE_MARKS, { every: 2 }); g.textPx('単位 m', 10, 14, { size: 12, bold: true, color: c.muted }); return; }
      const y0 = 0.42;
      g.line(0, y0, g.xmax, y0, { color: c.axis, width: 3 });
      for (let k = 0; k <= 10; k++) { const x = k * 1e20; g.line(x, y0 - 0.04, x, y0 + 0.04, { color: c.axis, width: 1 }); if (k % 2 === 0) g.text(k === 0 ? '0' : k + '×10²⁰', x, y0, { dy: 16, align: 'center', size: 11, color: c.muted }); }
      SIZE_MARKS.forEach(function (it, i) {
        const x = it[1], lvl = i === SIZE_MARKS.length - 1 ? 0 : 1 + (i % 4);
        const yy = y0 + 0.12 + lvl * 0.11;
        g.line(x, y0, x, yy - 0.04, { color: c.muted, width: 1, dash: [3, 3] });
        g.text(it[2] + ' ' + it[0], x, yy, { align: i === SIZE_MARKS.length - 1 ? 'right' : 'left', dx: i === SIZE_MARKS.length - 1 ? 0 : 4, size: 11.5, color: c.text });
      });
      g.textPx('単位 m（普通の目盛）', 10, 14, { size: 12, bold: true, color: c.muted });
    };
    setMode(false);
  }

  /* ==========================================================
     2.5(2) 対数スケール変換器
     ========================================================== */
  const KINDS = [
    { label: '🔊 音（dB）', min: 0, max: 130, step: 1, A: 60, B: 80, unit: 'dB',
      def: 'L=10\\log_{10}\\dfrac{I}{I_0}\\quad(I:\\text{音の強さ})', ratio: (a, b) => Math.pow(10, (b - a) / 10),
      say: (r) => 'B の音は A の音の ' + rtxt(r) + 'の強さ（10 dB 上がるごとに 10 倍）',
      ex: [[0, '聞こえる限界'], [20, '木の葉の音'], [40, '図書館'], [60, '会話'], [80, '電車の車内'], [100, 'ガード下'], [120, '飛行機の近く']] },
    { label: '🌏 地震（M）', min: 3, max: 9.5, step: 0.1, A: 7.3, B: 9, unit: '',
      def: '\\log_{10}E=4.8+1.5M\\quad(E:\\text{エネルギー[J]})', ratio: (a, b) => Math.pow(10, 1.5 * (b - a)),
      say: (r) => 'B の地震のエネルギーは A の ' + rtxt(r) + '（M が 1 増えると約 32 倍、2 増えると 1000 倍）',
      ex: [[4, 'M4'], [5, 'M5'], [6, 'M6'], [7.3, '兵庫県南部(1995)'], [7.6, '能登半島(2024)'], [9.0, '東北地方太平洋沖(2011)']] },
    { label: '🧪 pH', min: 0, max: 14, step: 0.1, A: 7, B: 3, unit: '',
      def: '\\mathrm{pH}=-\\log_{10}[\\mathrm{H^+}]\\quad([\\mathrm{H^+}]:\\text{水素イオン濃度})', ratio: (a, b) => Math.pow(10, a - b),
      say: (r) => 'B の水素イオン濃度は A の ' + rtxt(r) + '（pH が 1 小さいと 10 倍。小さいほど酸性が強い）',
      ex: [[2, 'レモン汁'], [3, '炭酸飲料'], [5.6, '雨水'], [7, '純水'], [8.2, '海水'], [10, 'せっけん水'], [13, '強いアルカリ洗剤']] },
    { label: '⭐ 星の等級', min: -2, max: 7, step: 0.1, A: 6, B: 1, unit: '等',
      def: 'm_A-m_B=2.5\\log_{10}\\dfrac{\\ell_B}{\\ell_A}\\quad(\\ell:\\text{明るさ})', ratio: (a, b) => Math.pow(10, 0.4 * (a - b)),
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
      update();
    }
    function update() {
      const k = st.k, a = sA.get(), b = sB.get(), r = k.ratio(a, b);
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
        const yy = y0 + 0.17 + (i % 2) * 0.16;
        g.line(e[0], y0, e[0], yy - 0.05, { color: c.muted, width: 1, dash: [3, 3] });
        g.text(e[1], e[0], yy, { align: 'center', size: 11.5, color: c.text });
      });
      [[sA.get(), 'A', c.teal], [sB.get(), 'B', c.accent]].forEach(function (m) {
        const px = g.X(m[0]), py = g.Y(y0), ctx = g.ctx;
        ctx.save(); ctx.fillStyle = m[2]; ctx.beginPath(); ctx.moveTo(px, py + 4); ctx.lineTo(px - 9, py + 22); ctx.lineTo(px + 9, py + 22); ctx.closePath(); ctx.fill(); ctx.restore();
        g.text(m[1], m[0], y0, { dy: 34, align: 'center', size: 14, bold: true, color: m[2] });
      });
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
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1, xmax: 25, ymin: 200, ymax: 1100, ratio: [0.55, 0.3] });
    R(root, 'log').addEventListener('change', (e) => { st.log = e.target.checked; plot.setView(st.log ? { ymin: Math.log2(200), ymax: Math.log2(1100) } : { ymin: 200, ymax: 1100 }); plot.invalidate(); });
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
      for (let n = 0; n <= 24; n += 12) g.text(['ド(C4)', 'ド(C5)', 'ド(C6)'][n / 12], n, g.ymin, { dy: -10, align: 'center', size: 11, color: c.muted });
      [262, 523, 1047].forEach((f) => g.text(f + ' Hz', -1, T(f), { dx: 6, size: 11, color: c.muted }));
      const pts = [];
      for (let n = 0; n < N; n++) pts.push([n, T(fET(n))]);
      g.poly(pts, { color: c.primary, width: 2, alpha: 0.5 });
      for (let n = 0; n < N; n++) {
        const on = st.last.indexOf(n) >= 0;
        g.dot(n, T(freq(n)), { r: on ? 8 : 4, color: on ? c.accent : st.just ? c.teal : (BLACK.indexOf(n % 12) >= 0 ? c.text : c.primary) });
      }
      g.textPx(st.log ? '縦軸：対数目盛 → 点が一直線に並ぶ（半音ごとに同じ倍率）' : '縦軸：普通の目盛 → 右へ行くほど急に上がる（指数関数）', 10, 16, { size: 12, bold: true, color: c.text });
      if (st.just) g.textPx('緑の点：純正律（青い線＝平均律から少しずれる）', 10, 34, { size: 12, bold: true, color: c.teal });
    };
    update();
  }

  /* ==========================================================
     2.5(5) 数当て：コンピュータが当てる
     ========================================================== */
  function initGuessCpu() {
    const root = $id('w-guess-cpu');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.4, 0.2] });
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
        g.text((r[1] - r[0] + 1).toLocaleString('ja-JP') + ' 個', 1, y, { dx: -4, align: 'right', size: 11, bold: true, color: c.muted });
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
      formula: () => '\\text{残りの候補：}' + st.lo + '\\sim' + st.hi + '\\ (' + (st.hi - st.lo + 1) + '\\text{ 個}),\\quad \\log_2' + (st.hi - st.lo + 1) + '\\approx' + num(Math.log2(st.hi - st.lo + 1), 2),
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
      g.textPx('緑：まだ候補として残っている範囲　赤：これまでの答え', 10, 14, { size: 12, bold: true, color: c.muted });
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
      plot.setView({ xmin: 0, xmax: Y, ymin: 0, ymax: Math.max(S, Cp, P * 2) * 1.12 || 1 });
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
      for (let x = 0; x <= g.xmax + 1e-9; x += sx) g.text(String(Math.round(x)), x, 0, { dy: -10, align: 'center', size: 11, color: c.muted });
      for (let y = sy; y < g.ymax; y += sy) g.text(num(y / U, 1), 0, y, { dx: 4, size: 11, color: c.muted });
      g.textPx('（' + un + '）', 6, 14, { size: 11, color: c.muted });
      g.textPx('年', g.w - 8, g.h - 22, { align: 'right', size: 11, color: c.muted });
      // 差(利息の利息)を塗る
      const ctx = g.ctx, K = 120;
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = c.primary; ctx.beginPath();
      for (let i = 0; i <= K; i++) { const t = Y * i / K; ctx[i ? 'lineTo' : 'moveTo'](g.X(t), g.Y(comp(P, r, t))); }
      for (let i = K; i >= 0; i--) { const t = Y * i / K; ctx.lineTo(g.X(t), g.Y(simple(P, r, t))); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      g.line(0, 2 * P, g.xmax, 2 * P, { color: c.amber, width: 1.5, dash: [5, 5] });
      g.text('元金の2倍', 0, 2 * P, { dx: 34, dy: -10, size: 11.5, bold: true, color: c.amber });
      g.line(0, P, g.xmax, P, { color: c.muted, width: 1, dash: [3, 4] });
      g.text('元金', 0, P, { dx: 34, dy: -9, size: 11, color: c.muted });
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
      g.text('複利（' + st.m.label + '）', Y, Cp, { dx: -10, dy: near ? -16 : -4, align: 'right', size: 13, bold: true, color: c.primary });
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
     2.6(2) (1+1/n)^n → e
     ========================================================== */
  function initELimit() {
    const root = $id('w-elimit'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.2, xmax: 6.3, ymin: 1.9, ymax: 2.85, ratio: [0.6, 0.4] });
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
      for (let k = 0; k <= 6; k++) g.text('10' + sup(k), k, g.ymin, { dy: -10, align: 'center', size: 11, color: c.muted });
      for (let y = 2; y <= 2.8 + 1e-9; y += 0.2) g.text(num(y, 1), g.xmin, y, { dx: 4, size: 11, color: c.muted });
      g.line(g.xmin, Math.E, g.xmax, Math.E, { color: c.accent, width: 2, dash: [7, 6] });
      g.text('e = 2.71828…', g.xmax, Math.E, { dx: -6, dy: -12, align: 'right', size: 12.5, bold: true, color: c.accent });
      g.fn((x) => val(Math.pow(10, x)), { x0: 0, x1: 6, color: c.primary, width: 3 });
      [1, 2, 3, 5, 10, 100, 1000, 1e4, 1e5, 1e6].forEach((n) => g.dot(Math.log10(n), val(n), { r: 3.5, color: c.primary }));
      g.dot(u, val(Math.round(Math.pow(10, u))), { r: 8, color: c.amber });
      g.textPx('横軸：利息をつける回数 n（対数目盛）　縦軸：1年後に元金の何倍か', 10, 16, { size: 12, bold: true, color: c.text });
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
    const sR = slider(ctl, { tex: '\\text{月利}', min: 0.5, max: 2, step: 0.05, value: 1, color: 'amber', fmt: (v) => num(v, 2) + '%' });
    const sM = slider(ctl, { tex: '\\text{返済}', min: 0.3, max: 5, step: 0.1, value: 1, color: 'teal', fmt: (v) => num(v, 1) + '万円' });
    let sim = null;
    function simulate() {
      let bal = sP.get() * 1e4, total = 0, months = 0;
      const r = sR.get() / 100, pay = sM.get() * 1e4, hist = [bal];
      if (pay <= Math.round(bal * r)) return { never: true, hist: [bal, bal * (1 + r) - pay, bal * Math.pow(1 + r, 2) - pay * (2 + r)], first: Math.round(bal * r) };
      while (bal > 0 && months < 600) { bal += Math.round(bal * r); const p = Math.min(pay, bal); bal -= p; total += p; months++; hist.push(bal); }
      return { never: false, months, total, hist };
    }
    function update() {
      sim = simulate();
      const P = sP.get() * 1e4;
      if (sim.never) {
        R(root, 'months').textContent = '⚠ 終わりません！';
        R(root, 'total').textContent = '毎月の利息（' + sim.first.toLocaleString('ja-JP') + ' 円）が返済額以上なので、借金が減らない';
        R(root, 'interest').textContent = '返済額を増やそう';
        plot.setView({ xmin: 0, xmax: 24, ymin: 0, ymax: P / 1e4 * 1.3 });
      } else {
        R(root, 'months').textContent = sim.months + ' か月（' + Math.floor(sim.months / 12) + ' 年 ' + (sim.months % 12) + ' か月）';
        R(root, 'total').textContent = sim.total.toLocaleString('ja-JP') + ' 円';
        R(root, 'interest').textContent = (sim.total - P).toLocaleString('ja-JP') + ' 円（買い物の ' + num((sim.total - P) / P * 100, 1) + '%）';
        plot.setView({ xmin: 0, xmax: Math.max(6, sim.months * 1.05), ymin: 0, ymax: P / 1e4 * 1.15 });
      }
      plot.invalidate();
    }
    [sP, sR, sM].forEach((s) => s.on(update));
    plot.draw = function (g) {
      const c = g.c;
      g.grid({ stepX: niceStep(g.xmax / 8), stepY: niceStep(g.ymax / 5), xlabel: 'か月', ylabel: '万円' });
      if (sim.never) {
        g.fn((t) => sP.get() * Math.pow(1 + sR.get() / 100, t) - sM.get() * (Math.pow(1 + sR.get() / 100, t) - 1) / (sR.get() / 100), { x0: 0, x1: g.xmax, color: c.accent, width: 4 });
        g.textPx('⚠ 残高が減らない（むしろ増える）', 10, 16, { size: 13, bold: true, color: c.accent });
        return;
      }
      g.poly(sim.hist.map((b, i) => [i, b / 1e4]), { color: c.accent, width: 3.5 });
      g.line(0, sP.get(), sim.months, sP.get() - sM.get() * sim.months, { color: c.teal, width: 1.5, dash: [5, 5] });
      g.textPx('赤：リボ払いの残高　緑の点線：利息がなかった場合', 10, 16, { size: 12.5, bold: true, color: c.text });
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
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.5, xmax: 2.5, equal: true, yc: 1.6, ratio: [0.9, 0.7] });
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
      g.text('目標の傾き ' + s, 1.4, 1 + s * 1.4, { dx: 8, dy: 14, size: 12, bold: true, color: c.amber });
      g.fn((x) => Math.pow(a, x), { color: c.primary, width: 4 });
      g.fn((x) => 1 + k * x, { color: c.teal, width: 2.5 });
      g.dot(0, 1, { r: 6, color: c.text });
      g.textPx('青：y = aˣ　緑：(0, 1) での接線　金：目標の傾きの直線', 10, 16, { size: 12.5, bold: true, color: c.text });
      conf.draw(g);
    };
    game.setStage(0);
  }


  function boot() {
    [[initPowCards, 'w-pow-cards'], [initPowLaw, 'w-pow-law'], [initPowFrac, 'w-pow-frac'], [initGamePow, 'w-game-pow'],
      [initExpGraph, 'w-expgraph'], [initExpRace, 'w-exprace'], [initGameExpCoin, 'w-game-expcoin'],
      [initOrigami, 'w-origami'], [initBaibain, 'w-baibain'], [initGamePredict, 'w-game-predict'],
      [initLogDef, 'w-logdef'], [initDigits, 'w-digits'], [initGameLog, 'w-game-log'],
      [initLogScale, 'w-logscale'], [initScales, 'w-scales'], [initPiano, 'w-piano'], [initGuessCpu, 'w-guess-cpu'], [initGameGuess, 'w-game-guess'],
      [initCompound, 'w-compound'], [initELimit, 'w-elimit'], [initRevo, 'w-revo'], [initGameE, 'w-game-e'],
    ].forEach(function (e) {
      if (!$id(e[1])) return;
      try { e[0](); } catch (err) { console.error(e[0].name, err); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
