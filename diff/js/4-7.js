/* 第4章 4.7節 テイラー展開と近似 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   axesAuto(g, o)  … 表示範囲に合わせて目盛りの間隔を決める方眼（目盛りの数字もすべて TeX）。o.pi で横軸を π/2 ごとに
 *   polyTeX(...)    … 係数の列から多項式の TeX を作る（0 の項は省く）
 *   coefTeX(c)      … 係数を分数（√3 入りも）で書けるなら分数、だめなら小数
 *   errTeX(v)       … 小さいずれを 3.2×10^{-6} のように
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI, H = PI / 2;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const fm = (v, d) => D.fmt(v, d == null ? 2 : d);
  const FACT = [1];
  for (let i = 1; i <= 20; i++) FACT[i] = FACT[i - 1] * i;

  /* ---------- 小さな部品 ---------- */
  function chipRow(box, items, cur, onPick) {
    box.innerHTML = '';
    const btns = items.map(function (it, i) {
      const b = el('button', 'chip', it.tex ? '' : it.label);
      b.type = 'button';
      if (it.tex) { const s = el('span'); b.append(s); setTex(s, it.tex); }
      b.addEventListener('click', () => { btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); onPick(it, i); });
      box.append(b);
      return b;
    });
    btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === cur)));
    return btns;
  }
  function setHTML(node, h) { if (node._h === h) return; node._h = h; node.innerHTML = h; typeset(node); }
  function piTeX(v) {
    const k = Math.round(v / H);
    if (!k) return '0';
    const s = k < 0 ? '-' : '', a = Math.abs(k);
    if (a % 2 === 0) { const n = a / 2; return s + (n === 1 ? '' : n) + '\\pi'; }
    return s + '\\frac{' + (a === 1 ? '' : a) + '\\pi}{2}';
  }
  function angTeX(th) {
    const k = th / (PI / 12);
    if (Math.abs(k - Math.round(k)) < 1e-6) {
      const n = Math.round(k);
      if (!n) return '0';
      let p = n, q = 12;
      const gcd = (a, b) => (b ? gcd(b, a % b) : a), g0 = gcd(Math.abs(p), q);
      p /= g0; q /= g0;
      const t = (Math.abs(p) === 1 ? '' : Math.abs(p)) + '\\pi';
      return (p < 0 ? '-' : '') + (q === 1 ? t : '\\frac{' + t + '}{' + q + '}');
    }
    return fm(th, 2);
  }
  function niceStep(span, n) {
    const raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  }
  const decOf = (step) => Math.max(0, -Math.floor(Math.log10(step) + 1e-9));

  // 方眼と目盛り（目盛りの文字は TeX）。範囲に合わせて間隔を自動で決める
  function axesAuto(g, o) {
    o = o || {};
    const c = g.c, narrow = g.w < 520;
    const sx = o.pi ? H : niceStep(g.xmax - g.xmin, narrow ? 5 : 8);
    const sy = niceStep(g.ymax - g.ymin, g.h < 260 ? 4 : 6);
    g.grid({ stepX: sx, stepY: sy, labels: false, xlabel: o.xlabel == null ? 'x' : o.xlabel, ylabel: o.ylabel == null ? 'y' : o.ylabel });
    const dx = decOf(sx), dy = decOf(sy);
    let m = 1;
    while (g.pxPerX * sx * m < (o.pi ? 38 : 40)) m++;
    const hasX0 = g.ymin <= 0 && g.ymax >= 0, y0 = hasX0 ? Math.min(g.Y(0), g.h - 22) : g.h - 20;
    const hasY0 = g.xmin <= 0 && g.xmax >= 0;
    for (let i = Math.ceil(g.xmin / sx - 1e-9); i * sx <= g.xmax + 1e-9; i++) {
      if ((i === 0 && hasY0) || i % m) continue;
      const px = g.X(i * sx);
      if (px > g.w - 22 || px < 14) continue;
      g.texPx(o.pi ? piTeX(i * sx) : num(i * sx, dx), px, y0 + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
    }
    const pxy = (g.h / (g.ymax - g.ymin)) * sy;
    let my = 1;
    while (pxy * my < 26) my++;
    const x0 = hasY0 ? g.X(0) : 0, inR = x0 < 40;
    for (let j = Math.ceil(g.ymin / sy - 1e-9); j * sy <= g.ymax + 1e-9; j++) {
      if ((j === 0 && hasX0) || j % my) continue;
      const py = g.Y(j * sy);
      if (py < 34 || py > g.h - 12) continue;
      g.texPx(num(j * sy, dy), inR ? x0 + 5 : x0 - 6, py, { align: inR ? 'left' : 'right', size: 13, color: c.muted });
    }
    if (hasX0 && hasY0) g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
  }
  // 曲線の上をドラッグする点（緑）
  function curveHandle(plot, get, set, f, o) {
    o = o || {};
    return plot.addHandle({
      get x() { return get(); }, get y() { return f(get()); },
      get color() { return plot.c ? plot.c.teal : '#0d9c86'; }, r: 8,
      drag(x) { set(x); },
    });
  }
  // 係数 c を、分数（分母 1024 まで）→ √3 の分数 → 小数 の順で TeX に
  function coefTeX(c) {
    const fr = (v, den) => {
      for (let q = 1; q <= den; q++) { const p = Math.round(v * q); if (p && Math.abs(v * q - p) < 1e-9 * Math.max(1, q)) return [p, q]; }
      return null;
    };
    let r = fr(c, 1024);
    if (r) return r[1] === 1 ? String(r[0]) : (r[0] < 0 ? '-' : '') + '\\frac{' + Math.abs(r[0]) + '}{' + r[1] + '}';
    r = fr(c / Math.sqrt(3), 48);
    if (r) { const p = Math.abs(r[0]); return (r[0] < 0 ? '-' : '') + (r[1] === 1 ? (p === 1 ? '' : p) + '\\sqrt3' : '\\frac{' + (p === 1 ? '' : p) + '\\sqrt3}{' + r[1] + '}'); }
    return fm(c, 4);
  }
  // terms: [{k, body}] の body は符号なし。sign は ±1
  function joinTerms(terms) {
    if (!terms.length) return '0';
    return terms.map((t, i) => (i === 0 ? (t.sign < 0 ? '-' : '') : t.sign < 0 ? '-' : '+') + t.body).join('');
  }
  const powTeX = (v, k) => (k === 0 ? '' : k === 1 ? v : v + '^{' + k + '}');
  function errTeX(v) {
    v = Math.abs(v);
    if (v === 0) return '0';
    if (v >= 1e-4) return fm(v, v >= 0.01 ? 4 : 6);
    const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    return num(m, 1) + '\\times10^{' + e + '}';
  }

  /* ==========================================================
     4.7(1) f'' の符号とグラフの曲がり方
     ========================================================== */
  function initCurv() {
    const root = $id('w-curv');
    const FS = [
      { t: 'x^3-3x', f: (x) => x * x * x - 3 * x, d1: (x) => 3 * x * x - 3, d2: (x) => 6 * x, d1t: '3x^2-3', d2t: '6x', view: { xmin: -2.6, xmax: 2.6, ymin: -3.2, ymax: 3.2 }, r: [-2.2, 2.2], x: -1.4 },
      { t: 'x^4-2x^2', f: (x) => x ** 4 - 2 * x * x, d1: (x) => 4 * x ** 3 - 4 * x, d2: (x) => 12 * x * x - 4, d1t: '4x^3-4x', d2t: '12x^2-4', view: { xmin: -1.9, xmax: 1.9, ymin: -1.7, ymax: 2.4 }, r: [-1.6, 1.6], x: 1 },
      { t: '\\sin x', f: Math.sin, d1: Math.cos, d2: (x) => -Math.sin(x), d1t: '\\cos x', d2t: '-\\sin x', view: { xmin: -0.5, xmax: TAU + 0.5, ymin: -1.75, ymax: 1.75 }, r: [0, TAU], x: 1.2, pi: true },
      { t: 'e^x', f: Math.exp, d1: Math.exp, d2: Math.exp, d1t: 'e^x', d2t: 'e^x', view: { xmin: -3, xmax: 2.2, ymin: -1.9, ymax: 6 }, r: [-2.6, 1.7], x: 0.5 },
    ];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.85, 0.5] }, FS[0].view));
    const st = { k: 0, x: FS[0].x, d1: false, d2: false };
    const F = () => FS[st.k];
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: '\\teal{x}', min: -2.2, max: 2.2, step: 0.02, value: st.x, color: 'teal', aria: '接点の x 座標' });
    sX.on((v) => { st.x = v; update(); });
    chipRow(R(root, 'fs'), FS.map((T) => ({ tex: 'y=' + T.t })), 0, (it, i) => {
      st.k = i; const T = F();
      sX.input.min = T.r[0]; sX.input.max = T.r[1]; st.x = T.x; sX.set(st.x);
      plot.setView(T.view); update();
    });
    R(root, 'd1').addEventListener('change', (e) => { st.d1 = e.target.checked; plot.invalidate(); });
    R(root, 'd2').addEventListener('change', (e) => { st.d2 = e.target.checked; plot.invalidate(); });
    curveHandle(plot, () => st.x, (x) => { const T = F(); st.x = clamp(Math.round(x * 50) / 50, T.r[0], T.r[1]); sX.set(st.x); update(); }, (x) => F().f(x));
    function update() {
      const T = F(), x = st.x, m = T.d1(x), m2 = T.d2(x);
      tex(root, 'f', 'f(x)=\\blue{' + T.t + '}');
      tex(root, 'm', "f'(x)=\\amber{" + T.d1t + "},\\ \\ f'(" + fm(x) + ')=\\teal{' + fm(m, 3) + '}');
      tex(root, 'm2', "f''(x)=" + T.d2t + ",\\ \\ f''(" + fm(x) + ')=' + fm(m2, 3) + (Math.abs(m2) < 0.05 ? '\\approx0' : m2 > 0 ? '\\gt0' : '\\lt0'));
      let h;
      if (Math.abs(m2) < 0.05) h = '<b>変曲点</b>のあたり。ここで曲がり方が切りかわり、接線がグラフを<b>横切る</b>。';
      else if (m2 > 0) h = '$f\'\'\\gt0$ なので<b>下に凸</b>（∪）。点を右へ動かすと接線の傾きが増えていく。グラフは接線より<b>上</b>。';
      else h = '$f\'\'\\lt0$ なので<b>上に凸</b>（∩）。点を右へ動かすと接線の傾きが減っていく。グラフは接線より<b>下</b>。';
      setHTML(R(root, 'how'), h);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, T = F(), x0 = st.x;
      // f'' の符号で背景を塗る（下に凸 = 紫、上に凸 = ピンク）
      const N = 300, runs = [];
      let cur = null;
      for (let i = 0; i <= N; i++) {
        const x = g.xmin + (g.xmax - g.xmin) * i / N, s = T.d2(x) > 0 ? 1 : -1;
        if (!cur || cur.s !== s) { if (cur) cur.x1 = x; cur = { s, x0: x, x1: g.xmax }; runs.push(cur); }
      }
      runs.forEach((r) => {
        ctx.save(); ctx.globalAlpha = r.s > 0 ? 0.09 : 0.13; ctx.fillStyle = r.s > 0 ? c.violet : c.pink;
        ctx.fillRect(g.X(r.x0), 0, g.X(r.x1) - g.X(r.x0), g.h); ctx.restore();
      });
      axesAuto(g, { pi: T.pi });
      runs.forEach((r) => {
        const w = g.X(r.x1) - g.X(r.x0);
        if (w < 84) return;
        let px = (g.X(r.x0) + g.X(r.x1)) / 2;
        if (g.xmin < 0 && g.xmax > 0 && Math.abs(px - g.X(0)) < 64) px = g.X(0) + (px >= g.X(0) ? 64 : -64);
        if (px < g.X(r.x0) + 36 || px > g.X(r.x1) - 36) return;
        g.texPx(r.s > 0 ? '\\text{下に凸}\\ \\cup' : '\\text{上に凸}\\ \\cap', px, 8, { align: 'center', valign: 'top', size: 14, color: r.s > 0 ? c.violet : c.pink });
      });
      // 変曲点
      for (let i = 1; i < runs.length; i++) {
        let lo = runs[i].x0 - (g.xmax - g.xmin) / N, hi = runs[i].x0;
        for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if ((T.d2(mid) > 0) === (T.d2(lo) > 0)) lo = mid; else hi = mid; }
        const xi = (lo + hi) / 2;
        g.dot(xi, T.f(xi), { r: 5, color: c.muted });
        g.tex('\\text{変曲点}', xi, T.f(xi), { align: 'left', valign: 'top', dx: 6, dy: 6, size: 13, color: c.muted, avoid: true });
      }
      if (st.d2) D.curve(g, T.d2, { color: c.muted, width: 2.2, dash: [7, 5] });
      if (st.d1) D.curve(g, T.d1, { color: c.amber, width: 2.4, alpha: 0.85 });
      D.curve(g, T.f, { color: c.primary, width: 3 });
      D.tangent(g, T.f, x0, { df: T.d1, point: false });
      const legend = ['\\blue{y=f(x)}', '\\teal{\\text{接線}}'];
      if (st.d1) legend.push("\\amber{y=f'(x)}");
      if (st.d2) legend.push("\\class{d47-gray}{y=f''(x)}");
      g.texPx(legend.join('\\quad'), g.w - 10, g.h - 8, { align: 'right', valign: 'bottom', size: 14 });
    };
    update();
  }

  /* ==========================================================
     4.7(1) n 回微分のパターン
     ========================================================== */
  function initNth() {
    const root = $id('w-nth');
    const invT = (n) => {
      if (n === 0) return '\\dfrac{1}{x}';
      const s = n % 2 ? '-' : '';
      return s + '\\dfrac{' + FACT[n] + '}{x^{' + (n + 1) + '}}' + (n >= 2 ? '=' + s + '\\dfrac{' + n + '!}{x^{' + (n + 1) + '}}' : '');
    };
    const FS = [
      { t: 'e^x', d: () => 'e^x', rule: '\\left(e^x\\right)^{(n)}=e^x', how: '何回微分しても $e^x$ のまま。「傾き ＝ 高さ」の関数だから。' },
      { t: '\\sin x', d: (n) => ['\\sin x', '\\cos x', '-\\sin x', '-\\cos x'][n % 4] + (n ? '=\\sin\\left(x+' + piTeX(n * H) + '\\right)' : ''),
        rule: '\\left(\\sin x\\right)^{(n)}=\\sin\\left(x+\\dfrac{n\\pi}{2}\\right)', how: '4 回微分すると元の $\\sin x$ にもどる。1 回ごとにグラフが左へ $\\frac{\\pi}{2}$ ずれる。' },
      { t: '\\dfrac1x', d: invT, rule: '\\left(\\dfrac1x\\right)^{(n)}=\\dfrac{(-1)^n\\,n!}{x^{n+1}}', how: '$x^{-1}$ を微分するたびに、前に $-1,\\ -2,\\ -3,\\ \\ldots$ がかかる。符号は交互、分子は $n!$。' },
      { t: 'x^4', d: (n) => ['x^4', '4x^3', '12x^2', '24x', '24'][n] || '0', rule: '\\left(x^4\\right)^{(4)}=4!=24,\\quad \\left(x^4\\right)^{(5)}=0',
        how: '多項式は微分するたびに次数が 1 つ下がる。4 次式は 4 回で定数 $4!=24$、5 回目からは $0$。' },
      { t: '\\log x', d: (n) => (n === 0 ? '\\log x' : invT(n - 1)), rule: '\\left(\\log x\\right)^{(n)}=\\dfrac{(-1)^{n-1}(n-1)!}{x^n}', how: '1 回微分すると $\\frac1x$。そこから先は $\\frac1x$ の微分と同じパターン。' },
    ];
    const MAXN = 8;
    const st = { k: 0, n: 0 };
    const list = R(root, 'list');
    const lab = (k) => (k === 0 ? 'f(x)' : k <= 3 ? 'f' + "'".repeat(k) + '(x)' : 'f^{(' + k + ')}(x)');
    chipRow(R(root, 'fs'), FS.map((T) => ({ tex: T.t })), 0, (it, i) => { st.k = i; st.n = 0; render(); });
    R(root, 'go').addEventListener('click', () => { st.n = Math.min(MAXN, st.n + 1); render(); });
    R(root, 'back').addEventListener('click', () => { st.n = Math.max(0, st.n - 1); render(); });
    R(root, 'reset').addEventListener('click', () => { st.n = 0; render(); });
    function render() {
      const T = FS[st.k];
      list.innerHTML = '';
      for (let k = 0; k <= st.n; k++) {
        const row = el('div', 'd47-nrow' + (k === st.n ? ' on' : ''));
        const nm = el('span', 'd47-nk'); nm.textContent = k === 0 ? 'もとの関数' : k + ' 回微分';
        const s = el('span', 'd47-nt');
        row.append(nm, s); list.append(row);
        setTex(s, lab(k) + '=' + (k === 0 ? '\\blue{' + T.d(0) + '}' : T.d(k)));
      }
      R(root, 'go').disabled = st.n >= MAXN;
      tex(root, 'rule', T.rule);
      setHTML(R(root, 'how'), T.how);
    }
    render();
  }

  /* ==========================================================
     4.7(2) 接線で見積もる（1次近似）
     ========================================================== */
  function initLin() {
    const root = $id('w-lin');
    const FS = [
      { t: '\\sqrt{x}', nm: (x) => '\\sqrt{' + x + '}', f: Math.sqrt, df: (x) => 0.5 / Math.sqrt(x), d2: (x) => -0.25 * Math.pow(x, -1.5), a: 1, h: 0.5, hr: [-0.8, 2.4], step: 0.01,
        view: { xmin: -0.4, xmax: 3.8, ymin: -0.4, ymax: 2.3 } },
      { t: '\\sin x', nm: (x) => '\\sin ' + x, f: Math.sin, df: Math.cos, d2: (x) => -Math.sin(x), a: 0, h: 0.5, hr: [-2.5, 2.5], step: 0.01,
        view: { xmin: -3.1, xmax: 3.1, ymin: -1.9, ymax: 1.9 } },
      { t: 'x^{10}', nm: (x) => '(' + x + ')^{10}', f: (x) => Math.pow(x, 10), df: (x) => 10 * Math.pow(x, 9), d2: (x) => 90 * Math.pow(x, 8), a: 1, h: 0.05, hr: [-0.15, 0.12], step: 0.005,
        view: { xmin: 0.7, xmax: 1.22, ymin: -0.4, ymax: 3.4 } },
      { t: 'e^x', nm: (x) => 'e^{' + x + '}', f: Math.exp, df: Math.exp, d2: Math.exp, a: 0, h: 0.5, hr: [-2, 1.5], step: 0.01,
        view: { xmin: -2.6, xmax: 2.1, ymin: -0.8, ymax: 5 } },
      { t: '\\log x', nm: (x) => '\\log ' + x, f: (x) => (x > 0 ? Math.log(x) : NaN), df: (x) => 1 / x, d2: (x) => -1 / (x * x), a: 1, h: 0.5, hr: [-0.8, 3], step: 0.01,
        view: { xmin: -0.3, xmax: 4.4, ymin: -2.2, ymax: 1.9 } },
    ];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.85, 0.5] }, FS[0].view));
    const st = { k: 0, h: FS[0].h, zoom: false };
    const F = () => FS[st.k];
    const ctl = root.querySelector('.controls');
    const sH = slider(ctl, { tex: '\\red{h}', min: FS[0].hr[0], max: FS[0].hr[1], step: 0.005, value: st.h, color: 'accent', aria: '増分 h', fmt: (v) => fm(v, 3) });
    sH.on((v) => { st.h = v; update(); });
    chipRow(R(root, 'fs'), FS.map((T) => ({ tex: T.t + ',\\ a=' + T.a })), 0, (it, i) => {
      st.k = i; const T = F();
      sH.input.min = T.hr[0]; sH.input.max = T.hr[1]; st.h = T.h; sH.set(st.h);
      update();
    });
    R(root, 'zoom').addEventListener('change', (e) => { st.zoom = e.target.checked; update(); });
    plot.addHandle({ get x() { return F().a + st.h; }, get y() { const T = F(); return T.f(T.a); },
      get color() { return plot.c ? plot.c.accent : '#d6453d'; }, r: 8, hidden: () => st.zoom,
      drag(x) { const T = F(); const s = T.step; st.h = clamp(Math.round((x - T.a) / s) * s, T.hr[0], T.hr[1]); sH.set(st.h); update(); } });
    function setZoom() {
      const T = F();
      if (!st.zoom) { plot.setView(T.view); return; }
      const hw = Math.max(Math.abs(st.h) * 1.5, 0.01), cx = T.a + st.h / 2;
      const x0 = cx - hw, x1 = cx + hw;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 60; i++) {
        const x = x0 + (x1 - x0) * i / 60, y = T.f(x), t = T.f(T.a) + T.df(T.a) * (x - T.a);
        [y, t].forEach((v) => { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
      }
      const pad = Math.max((hi - lo) * 0.18, 1e-3);
      plot.setView({ xmin: x0, xmax: x1, ymin: lo - pad, ymax: hi + pad });
    }
    function update() {
      const T = F(), a = T.a, h = st.h, fa = T.f(a), m = T.df(a), ap = fa + m * h, tr = T.f(a + h), err = tr - ap;
      const hs = fm(h, 3), hp = h < 0 ? '(' + hs + ')' : hs, xs = fm(a + h, 3);
      tex(root, 'ap', '\\teal{f(a)+f\'(a)\\red{h}}=' + fm(fa, 3) + '+' + fm(m, 3) + '\\times\\red{' + hp + '}=\\teal{' + fm(ap, 6) + '}');
      tex(root, 'tr', '\\blue{' + T.nm(xs) + '}=\\blue{' + fm(tr, 6) + '}');
      tex(root, 'err', '\\blue{' + fm(tr, 6) + '}-\\teal{' + fm(ap, 6) + '}=' + (err < 0 ? '-' : '') + errTeX(err));
      const ratio = Math.abs(h) > 0.004 ? err / (h * h) : T.d2(a) / 2;
      setHTML(R(root, 'how'), Math.abs(h) < 0.004 ? '$h$ がほぼ $0$ なので、ずれもほぼ $0$。'
        : 'ずれ $\\div\\,h^2\\approx' + fm(ratio, 3) + '$。$h$ を小さくすると $\\dfrac{f\'\'(a)}{2}=' + fm(T.d2(a) / 2, 3) + '$ に近づく' + (Math.abs(T.d2(a)) < 1e-9 ? '（$\\sin x$ は $x=0$ で曲がっていないので、ずれがとくに小さい）' : '') + '。');
      setZoom();
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, T = F(), a = T.a, h = st.h, fa = T.f(a), m = T.df(a), ap = fa + m * h, tr = T.f(a + h);
      axesAuto(g, {});
      D.curve(g, T.f, { color: c.primary, width: 3 });
      D.tangent(g, T.f, a, { df: T.df, point: false });
      // 横に h（赤）、接線に沿って縦に f'(a)h、本当の値とのずれ
      g.line(a, fa, a + h, fa, { color: c.accent, width: 3 });
      g.line(a + h, fa, a + h, ap, { color: c.teal, width: 1.6, dash: [4, 4] });
      if (isFinite(tr)) g.line(a + h, ap, a + h, tr, { color: c.muted, width: 5, alpha: 0.55 });
      g.dot(a, fa, { r: 5.5, color: c.teal });
      g.dot(a + h, ap, { r: 5, color: c.teal });
      if (isFinite(tr)) g.dot(a + h, tr, { r: 5, color: c.primary });
      const right = h >= 0;
      const below = m * h >= 0 && !st.zoom;
      g.tex('\\red{h}', a + h / 2, fa, { align: 'center', valign: below ? 'top' : 'bottom', dy: below ? 5 : -5, size: 15, avoid: true });
      g.tex('(a,\\,f(a))', a, fa, { align: right && a !== 0 ? 'right' : 'left', valign: 'bottom', dx: right && a !== 0 ? -8 : 8, dy: -6, size: 13, color: c.teal, avoid: true });
      if (isFinite(tr) && Math.abs(g.Y(tr) - g.Y(ap)) > 14) g.tex('\\text{ずれ}', a + h, (ap + tr) / 2, { align: right ? 'left' : 'right', dx: right ? 10 : -10, size: 13, color: c.muted, avoid: true });
      const top = g.ymin > 0 || g.ymax < 0 || g.Y(0) > g.h - 44;   // 横軸が見えないとき（拡大中）は、目盛りとぶつからないように上に
      g.texPx('\\blue{y=' + T.t + '}\\quad\\teal{\\text{接線}}', g.w - 10, top ? 8 : g.h - 8, { align: 'right', valign: top ? 'top' : 'bottom', size: 14 });
    };
    update();
  }

  /* ==========================================================
     4.7(3) マクローリン展開：次数を上げると重なる
     ========================================================== */
  function initMac() {
    const root = $id('w-mac');
    // coef(k): {s: 符号, den: 分母, fact: 分母を k! と書けるか} または null（係数 0）
    const MF = [
      { t: 'e^x', f: Math.exp, coef: (k) => ({ s: 1, den: FACT[k], fact: true }), view: { xmin: -4.2, xmax: 3.2, ymin: -2.5, ymax: 8 }, x0: 2, xr: [-4, 3] },
      { t: '\\sin x', f: Math.sin, coef: (k) => (k % 2 ? { s: ((k - 1) / 2) % 2 ? -1 : 1, den: FACT[k], fact: true } : null), view: { xmin: -7.6, xmax: 7.6, ymin: -2.6, ymax: 2.6 }, x0: 3, xr: [-7.4, 7.4] },
      { t: '\\cos x', f: Math.cos, coef: (k) => (k % 2 ? null : { s: (k / 2) % 2 ? -1 : 1, den: FACT[k], fact: true }), view: { xmin: -7.6, xmax: 7.6, ymin: -2.6, ymax: 2.6 }, x0: 3, xr: [-7.4, 7.4] },
      { t: '\\log(1+x)', f: (x) => (x > -1 ? Math.log(1 + x) : NaN), coef: (k) => (k ? { s: k % 2 ? 1 : -1, den: k } : null), view: { xmin: -1.8, xmax: 3.2, ymin: -3.4, ymax: 2.6 }, x0: 0.6, xr: [-0.98, 3], conv: [-1, 1, false] },
      { t: '\\dfrac{1}{1-x}', f: (x) => 1 / (1 - x), coef: () => ({ s: 1, den: 1 }), view: { xmin: -2.6, xmax: 2.2, ymin: -2.8, ymax: 6 }, x0: 0.5, xr: [-2.4, 2], conv: [-1, 1, true] },
    ];
    const MAXN = 12;
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.85, 0.52] }, MF[0].view));
    const st = { k: 0, n: 1, x0: MF[0].x0, numMode: false, play: false, t: 0 };
    const F = () => MF[st.k];
    const ctl = root.querySelector('.controls');
    const sN = slider(ctl, { tex: '\\teal{n}', min: 0, max: MAXN, step: 1, value: st.n, color: 'teal', aria: '次数 n' });
    const sX = slider(ctl, { tex: '\\violet{x}', min: MF[0].xr[0], max: MF[0].xr[1], step: 0.02, value: st.x0, color: 'violet', aria: '紫の点の x 座標' });
    sN.on((v) => { st.n = v; st.play = false; showPlay(); update(); });
    sX.on((v) => { st.x0 = v; update(); });
    chipRow(R(root, 'fs'), MF.map((T) => ({ tex: T.t })), 0, (it, i) => {
      st.k = i; const T = F();
      sX.input.min = T.xr[0]; sX.input.max = T.xr[1]; st.x0 = T.x0; sX.set(st.x0);
      plot.setView(T.view); update();
    });
    R(root, 'num').addEventListener('change', (e) => { st.numMode = e.target.checked; update(); });
    const bP = R(root, 'play');
    const showPlay = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 次数を上げていく'; };
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt;
      if (st.t >= 0.7) {
        st.t = 0;
        if (st.n >= MAXN) { st.play = false; showPlay(); return false; }
        st.n++; sN.set(st.n); update();
      }
      return true;
    });
    bP.addEventListener('click', () => {
      st.play = !st.play;
      if (st.play) { if (st.n >= MAXN) { st.n = 0; sN.set(0); update(); } st.t = 0; anim.kick(); }
      showPlay();
    });
    plot.addHandle({ get x() { return st.x0; }, get y() { return 0; },
      get color() { return plot.c ? plot.c.violet : '#7c4dcc'; }, r: 8,
      drag(x) { const T = F(); st.x0 = clamp(Math.round(x * 50) / 50, T.xr[0], T.xr[1]); sX.set(st.x0); update(); } });
    const cval = (T, k) => { const q = T.coef(k); return q ? q.s / q.den : 0; };
    const P = (T, n, x) => { let s = 0, p = 1; for (let k = 0; k <= n; k++) { s += cval(T, k) * p; p *= x; } return s; };
    function polyStr(T, n) {
      const terms = [];
      for (let k = 0; k <= n; k++) {
        const q = T.coef(k);
        if (!q) continue;
        const pw = powTeX('x', k);
        let body;
        if (q.den === 1) body = pw || '1';
        else body = '\\frac{' + (pw || '1') + '}{' + (q.fact && !st.numMode && k >= 2 ? k + '!' : q.den) + '}';
        terms.push({ sign: q.s, body });
      }
      return joinTerms(terms);
    }
    function update() {
      const T = F(), n = st.n, x = st.x0, fv = T.f(x), pv = P(T, n, x);
      const ps = polyStr(T, n);
      setTex(R(root, 'poly'), T.t + '\\approx P_{' + n + '}(x)=\\teal{' + ps + '}', true);
      tex(root, 'pt', '\\violet{x}=' + fm(x) + ':\\ \\blue{f=' + fm(fv, 5) + '},\\ \\teal{P_{' + n + '}=' + fm(pv, 5) + '}');
      tex(root, 'err', '|\\blue{f(x)}-\\teal{P_{' + n + '}(x)}|=' + errTeX(fv - pv));
      let h;
      const inside = !T.conv || (x > T.conv[0] && (T.conv[2] ? x < T.conv[1] : x <= T.conv[1] + 1e-9));
      if (!inside) {
        h = '紫の点は、近づく範囲（' + (T.conv[2] ? '$-1\\lt x\\lt1$' : '$-1\\lt x\\leqq1$') + '）の<b>外</b>。次数を上げても、ずれは小さくならず、<b>かえって大きくなる</b>。';
      } else if (T.conv) {
        h = '範囲 ' + (T.conv[2] ? '$-1\\lt x\\lt1$' : '$-1\\lt x\\leqq1$') + ' の中なので、次数を上げるとずれが小さくなる（$x=\\pm1$ に近いほどゆっくり）。';
      } else h = '次数を上げるほど、重なる範囲が広がっていく。中心 $x=0$ から遠い点ほど、たくさんの項が必要。';
      setHTML(R(root, 'how'), h);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, T = F(), n = st.n, x0 = st.x0;
      if (T.conv) {
        ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = c.grid;
        ctx.fillRect(0, 0, g.X(T.conv[0]), g.h); ctx.fillRect(g.X(T.conv[1]), 0, g.w - g.X(T.conv[1]), g.h); ctx.restore();
      }
      axesAuto(g, {});
      if (T.conv) {
        T.conv.slice(0, 2).forEach((v) => g.line(v, g.ymin, v, g.ymax, { color: c.muted, width: 1.3, dash: [5, 5] }));
        g.texPx('\\text{近づく範囲}', g.X(0) + 6, 28, { align: 'left', valign: 'top', size: 13, color: c.muted });
      }
      const clip = (y) => (Math.abs(y) > 1e4 ? NaN : y);
      D.curve(g, T.f, { color: c.primary, width: 4.5, alpha: 0.85 });
      // これまでの次数（うすく）
      for (let k = 0; k < n; k++) {
        if (T.coef(k) === null && k > 0) continue;   // 1つ前の次数と同じ式は描かない
        D.curve(g, (x) => clip(P(T, k, x)), { color: c.teal, width: 1.6, alpha: 0.12 + 0.33 * (k + 1) / n });
      }
      D.curve(g, (x) => clip(P(T, n, x)), { color: c.teal, width: 2.8 });
      // 紫の点での比較
      const fv = T.f(x0), pv = P(T, n, x0);
      if (isFinite(fv)) g.line(x0, 0, x0, fv, { color: c.violet, width: 1.3, dash: [3, 4] });
      if (isFinite(pv) && Math.abs(pv) < 1e4) g.line(x0, 0, x0, clamp(pv, g.ymin - 1, g.ymax + 1), { color: c.violet, width: 1.3, dash: [3, 4] });
      if (isFinite(fv)) g.dot(x0, fv, { r: 5, color: c.primary });
      if (isFinite(pv) && pv > g.ymin && pv < g.ymax) g.dot(x0, pv, { r: 5, color: c.teal });
      g.texPx('\\blue{y=' + T.t.replace('\\dfrac', '\\frac') + '}\\quad\\teal{y=P_{' + n + '}(x)}', g.w - 10, g.h - 8, { align: 'right', valign: 'bottom', size: 14 });
    };
    showPlay(); update();
  }

  /* ==========================================================
     4.7(4) 中心 a を動かすテイラー展開
     ========================================================== */
  function initTaylor() {
    const root = $id('w-taylor');
    const TF = [
      { t: '\\sqrt{x}', f: Math.sqrt, d: (k, a) => { let p = 1; for (let j = 0; j < k; j++) p *= 0.5 - j; return p * Math.pow(a, 0.5 - k); },
        a: 4, ar: [0.4, 8.5], step: 0.1, view: { xmin: -0.6, xmax: 9.6, ymin: -0.9, ymax: 4 }, dt: 0.5 },
      { t: '\\cos x', f: Math.cos, d: (k, a) => Math.cos(a + k * H), a: PI / 3, ar: [0, TAU], step: PI / 12, view: { xmin: -0.6, xmax: TAU + 0.6, ymin: -1.9, ymax: 1.9 }, pi: true, dt: 0.5 },
      { t: 'e^x', f: Math.exp, d: (k, a) => Math.exp(a), a: 1, ar: [-2, 2], step: 0.1, view: { xmin: -3.2, xmax: 3, ymin: -1.9, ymax: 8 }, dt: 0.5 },
      { t: '\\log x', f: (x) => (x > 0 ? Math.log(x) : NaN), d: (k, a) => (k === 0 ? Math.log(a) : (k % 2 ? 1 : -1) * FACT[k - 1] / Math.pow(a, k)),
        a: 1, ar: [0.3, 5.5], step: 0.1, view: { xmin: -0.4, xmax: 6.6, ymin: -3, ymax: 2.6 }, dt: 0.5 },
    ];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.85, 0.52] }, TF[0].view));
    const st = { k: 0, a: TF[0].a, n: 2 };
    const F = () => TF[st.k];
    const ctl = root.querySelector('.controls');
    const snapA = (v) => { const T = F(); return clamp(Math.round(v / T.step) * T.step, T.ar[0], T.ar[1]); };
    const sA = slider(ctl, { tex: '\\teal{a}', min: TF[0].ar[0], max: TF[0].ar[1], step: 0.1, value: st.a, color: 'teal', aria: '中心 a', fmt: (v) => fm(snapA(v), 2) });
    const sN = slider(ctl, { tex: 'n', min: 0, max: 6, step: 1, value: st.n, color: 'primary', aria: '次数 n' });
    sA.on((v) => { st.a = snapA(v); update(); });
    sN.on((v) => { st.n = v; update(); });
    chipRow(R(root, 'fs'), TF.map((T) => ({ tex: T.t })), 0, (it, i) => {
      st.k = i; const T = F();
      sA.input.min = T.ar[0]; sA.input.max = T.ar[1];
      st.a = T.a; sA.set(st.a); plot.setView(T.view); update();
    });
    curveHandle(plot, () => st.a, (x) => { st.a = snapA(x); sA.set(st.a); update(); }, (x) => F().f(x));
    const coefs = (T, a, n) => { const r = []; for (let k = 0; k <= n; k++) r.push(T.d(k, a) / FACT[k]); return r; };
    const Pv = (cs, a, x) => { let s = 0, p = 1; for (let k = 0; k < cs.length; k++) { s += cs[k] * p; p *= x - a; } return s; };
    const aTeX = () => (F().pi ? angTeX(st.a) : fm(st.a, 2));
    function update() {
      const T = F(), a = st.a, n = st.n, cs = coefs(T, a, n);
      const aT = aTeX(), v = Math.abs(a) < 1e-9 ? 'x' : a < 0 ? '(x+' + fm(-a, 2) + ')' : '(x-' + aT + ')';
      const terms = [];
      cs.forEach((cv, k) => {
        if (Math.abs(cv) < 1e-12) return;
        const ct = coefTeX(Math.abs(cv)), pw = powTeX(v, k);
        terms.push({ sign: cv < 0 ? -1 : 1, body: k === 0 ? ct : (ct === '1' ? '' : ct) + pw });
      });
      setTex(R(root, 'poly'), T.t + '\\approx\\teal{' + joinTerms(terms) + '}', true);
      tex(root, 'c', '\\teal{a}=' + aT + ',\\quad f(a)=' + coefTeX(T.f(a)));
      const xt = a + T.dt, fv = T.f(xt), pv = Pv(cs, a, xt);
      tex(root, 'test', 'x=a+' + T.dt + ':\\ \\blue{' + fm(fv, 5) + '},\\ \\teal{' + fm(pv, 5) + '}\\ (\\text{差 }' + errTeX(fv - pv) + ')');
      setHTML(R(root, 'how'), n === 0 ? '$n=0$ は高さ $f(a)$ の水平な直線。$n$ を上げてみよう。'
        : n === 1 ? '$n=1$ は $x=a$ での<b>接線</b>。中心を動かすと、接線もいっしょに動く。'
        : '中心 $a$ のまわりで、値・傾き・曲がり方… を合わせた $' + n + '$ 次式。中心の近くほどよく重なる。');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, T = F(), a = st.a, n = st.n;
      axesAuto(g, { pi: T.pi });
      const clip = (y) => (Math.abs(y) > 1e4 ? NaN : y);
      D.curve(g, T.f, { color: c.primary, width: 4.5, alpha: 0.85, x0: T.t === '\\sqrt{x}' ? 0 : g.xmin });
      for (let k = 0; k < n; k++) { const cs = coefs(T, a, k); D.curve(g, (x) => clip(Pv(cs, a, x)), { color: c.teal, width: 1.6, alpha: 0.15 + 0.3 * (k + 1) / n }); }
      const cs = coefs(T, a, n);
      D.curve(g, (x) => clip(Pv(cs, a, x)), { color: c.teal, width: 2.8 });
      const fa = T.f(a);
      g.line(a, 0, a, fa, { color: c.teal, width: 1.3, dash: [4, 4] });
      g.tex('\\teal{a}', a, 0, { align: 'center', valign: fa >= 0 ? 'bottom' : 'top', dy: fa >= 0 ? -4 : 4, dx: 9, size: 15, avoid: true });
      g.texPx('\\blue{y=' + T.t + '}\\quad\\teal{\\text{テイラー展開 }' + n + '\\text{ 次}}', g.w - 10, g.h - 8, { align: 'right', valign: 'bottom', size: 14 });
    };
    update();
  }

  /* ==========================================================
     4.7(5) 多項式で sin x を計算する
     ========================================================== */
  function initSinCalc() {
    const root = $id('w-sincalc');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.3, xmax: PI + 0.35, ymin: -0.6, ymax: 1.35, ratio: [0.62, 0.36] });
    const st = { x: 0.5, N: 3, red: false };
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: '\\blue{x}', min: 0, max: 3.14, step: 0.01, value: st.x, color: 'primary', aria: '角 x（ラジアン）' });
    sX.on((v) => { st.x = v; update(); });
    chipRow(R(root, 'ns'), [1, 2, 3, 4, 5, 6].map((k) => ({ label: k + ' 項' })), 2, (it, i) => { st.N = i + 1; update(); });
    R(root, 'red').addEventListener('change', (e) => { st.red = e.target.checked; update(); });
    plot.addHandle({ get x() { return st.x; }, get y() { return Math.sin(st.x); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 8,
      drag(x) { st.x = clamp(Math.round(x * 100) / 100, 0, 3.14); sX.set(st.x); update(); } });
    const body = R(root, 'rows');
    const rows = [];
    for (let k = 0; k < 6; k++) {
      const tr = el('tr'), th = el('th'), t1 = el('td'), t2 = el('td'), t3 = el('td');
      tr.append(th, t1, t2, t3); body.append(tr);
      rows.push({ tr, th, t1, t2, t3 });
    }
    const useU = () => st.red && st.x > H;
    const ang = () => (useU() ? PI - st.x : st.x);
    const Ps = (u, N) => { let s = 0; for (let k = 0; k < N; k++) s += (k % 2 ? -1 : 1) * Math.pow(u, 2 * k + 1) / FACT[2 * k + 1]; return s; };
    const dec = (v) => L.minus(v.toFixed(7));
    function update() {
      const u = ang(), v = useU() ? 'u' : 'x', truth = Math.sin(st.x);
      let s = 0;
      rows.forEach((r, k) => {
        r.tr.hidden = k >= st.N;
        if (k >= st.N) return;
        const t = (k % 2 ? -1 : 1) * Math.pow(u, 2 * k + 1) / FACT[2 * k + 1];
        s += t;
        setTex(r.th, k === 0 ? v : (k % 2 ? '-' : '+') + '\\dfrac{' + v + '^{' + (2 * k + 1) + '}}{' + (2 * k + 1) + '!}');
        r.t1.textContent = dec(t);
        r.t2.textContent = dec(s);
        setTex(r.t3, errTeX(s - truth));
        r.tr.classList.toggle('on', k === st.N - 1);
      });
      tex(root, 'u', useU() ? 'u=\\pi-x=' + fm(u, 4) + '\\ \\ (\\sin u=\\sin x)' : 'x=' + fm(st.x, 2));
      tex(root, 'tr', '\\sin ' + fm(st.x, 2) + '=' + truth.toFixed(10));
      const e = Math.abs(s - truth);
      setHTML(R(root, 'how'), e < 5e-9 ? 'ずれは $10^{-8}$ より小さい。電卓の表示（8〜10 桁）とほとんど同じ精度。'
        : e < 1e-4 ? '小数第 4 位までは正しい。項を増やすと、さらにずれが小さくなる。'
        : st.x > H && !st.red ? '$x$ が大きいので、少ない項ではずれが大きい。項を増やすか、下のチェックで角を小さくしてみよう。'
        : '項がまだ足りない。項を増やしてみよう。');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, x = st.x, u = ang();
      axesAuto(g, { pi: true });
      D.curve(g, Math.sin, { color: c.primary, width: 4.5, alpha: 0.85 });
      D.curve(g, (t) => Ps(t, st.N), { color: c.teal, width: 2.6 });
      if (useU()) {
        g.dot(u, Math.sin(u), { r: 5, color: c.teal });
        g.line(u, Math.sin(u), x, Math.sin(x), { color: c.muted, width: 1.4, dash: [4, 4] });
        g.tex('u=\\pi-x', u, Math.sin(u), { align: 'left', valign: 'top', dx: 6, dy: 8, size: 13, color: c.teal, avoid: true });
      }
      g.line(x, 0, x, Math.sin(x), { color: c.primary, width: 1.3, dash: [3, 4] });
      g.texPx('\\blue{y=\\sin x}\\quad\\teal{' + st.N + '\\text{ 項の多項式}}', g.w - 10, g.h - 8, { align: 'right', valign: 'bottom', size: 14 });
    };
    update();
  }

  /* ==========================================================
     4.7(6) チャレンジ：近似で当てろ
     ========================================================== */
  // tol: [★3, ★2, ★1] になるずれの上限
  const GS = [
    { name: 'ルート', q: '\\sqrt{1.02}', ft: '\\sqrt{x}', f: Math.sqrt, df: (x) => 0.5 / Math.sqrt(x), d2: (x) => -0.25 * Math.pow(x, -1.5), a: 1, h: 0.02,
      tol: [1e-5, 1e-4, 2e-3], view: { xmin: -0.3, xmax: 2.7, ymin: -0.3, ymax: 1.9 },
      text: '$\\sqrt{1.02}$ はいくつ？ $f(x)=\\sqrt{x}$ の $x=1$ での接線を使って見積もろう。',
      hint: '$f(1)=1$、$f\'(x)=\\dfrac{1}{2\\sqrt{x}}$ より $f\'(1)=\\dfrac12$。$h=0.02$ として $f(1)+f\'(1)h$。★3 には 2次の項 $\\dfrac{f\'\'(1)}{2}h^2$（$f\'\'(1)=-\\dfrac14$）も足そう。',
      answer: '$f(x)=\\sqrt{x},\\ a=1,\\ h=0.02$ とする。<br>1次：$\\sqrt{1.02}\\approx1+\\dfrac12\\times0.02=1.01$<br>2次：$f\'\'(1)=-\\dfrac14$ より $-\\dfrac18h^2=-0.00005$ を足して $1.00995$<br>本当の値は $1.0099505\\ldots$' },
    { name: 'サイン', q: '\\sin0.1', ft: '\\sin x', f: Math.sin, df: Math.cos, d2: (x) => -Math.sin(x), a: 0, h: 0.1,
      tol: [5e-5, 5e-4, 5e-3], view: { xmin: -1.6, xmax: 1.8, ymin: -1.3, ymax: 1.4 },
      text: '$\\sin0.1$ はいくつ？（$0.1$ はラジアン）',
      hint: '1次近似は $\\sin x\\approx x$。★3 には、マクローリン展開の次の項まで使って $\\sin x\\approx x-\\dfrac{x^3}{6}$。',
      answer: '1次：$\\sin0.1\\approx0.1$<br>3次：$0.1-\\dfrac{0.1^3}{6}=0.1-0.000167=0.099833$<br>本当の値は $0.0998334\\ldots$（確認問題 3 も参照）' },
    { name: '指数', q: 'e^{0.2}', ft: 'e^x', f: Math.exp, df: Math.exp, d2: Math.exp, a: 0, h: 0.2,
      tol: [2e-3, 0.025, 0.06], view: { xmin: -1.6, xmax: 1.4, ymin: -0.3, ymax: 3.2 },
      text: '$e^{0.2}$ はいくつ？ $e^x$ の $x=0$ のまわりの近似を使おう。',
      hint: '1次：$e^x\\approx1+x$。2次：$e^x\\approx1+x+\\dfrac{x^2}{2}$。$x=0.2$ を入れる。',
      answer: '1次：$e^{0.2}\\approx1+0.2=1.2$<br>2次：$1+0.2+\\dfrac{0.04}{2}=1.22$<br>3次：$+\\dfrac{0.008}{6}$ で $1.22133$<br>本当の値は $1.2214028\\ldots$' },
    { name: 'コサイン', q: '\\cos0.1', ft: '\\cos x', f: Math.cos, df: (x) => -Math.sin(x), d2: (x) => -Math.cos(x), a: 0, h: 0.1,
      tol: [1e-4, 6e-3, 0.02], view: { xmin: -1.6, xmax: 1.8, ymin: -0.4, ymax: 1.5 },
      text: '$\\cos0.1$ はいくつ？ $x=0$ での接線は水平なので…？',
      hint: '$\\cos x$ の $x=0$ での接線は $y=1$（1次近似では $1$）。★3 には 2次まで：$\\cos x\\approx1-\\dfrac{x^2}{2}$。',
      answer: '1次：$f\'(0)=-\\sin0=0$ なので $\\cos0.1\\approx1$<br>2次：$1-\\dfrac{0.1^2}{2}=1-0.005=0.995$<br>本当の値は $0.9950042\\ldots$' },
    { name: '5乗', q: '(1.03)^5', ft: 'x^5', f: (x) => Math.pow(x, 5), df: (x) => 5 * Math.pow(x, 4), d2: (x) => 20 * Math.pow(x, 3), a: 1, h: 0.03,
      tol: [1e-3, 0.012, 0.04], view: { xmin: 0.35, xmax: 1.4, ymin: -0.4, ymax: 3.3 },
      text: '$(1.03)^5$ はいくつ？ 年利 3% で 5 年預けると、お金は何倍？',
      hint: '$f(x)=x^5,\\ a=1$。$f\'(1)=5$、$f\'\'(1)=20$ なので $(1+h)^5\\approx1+5h+10h^2$。',
      answer: '1次：$(1.03)^5\\approx1+5\\times0.03=1.15$<br>2次：$+\\dfrac{20}{2}\\times0.03^2=+0.009$ で $1.159$<br>本当の値は $1.1592741\\ldots$<br>（1次近似は「単利」と同じ。2次の項が「利息の利息」）' },
  ];
  function initGame() {
    const root = $id('w-game-approx');
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.7, 0.42] }, GS[0].view));
    const ctl = root.querySelector('.controls');
    const row = el('label', 'd47-in');
    const lk = el('span', 'd47-ink'); lk.textContent = '見積もり';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('inputmode', 'decimal');
    inp.placeholder = '例 1.01'; inp.setAttribute('aria-label', '見積もった値');
    row.append(lk, inp); ctl.append(row);
    const B = L.game.gameButtons(ctl, '判定');
    const note = el('p', 'note-txt', '図の色：<span class="tx-blue">青</span>＝関数、<span class="tx-amber">金の点</span>＝あなたの値。判定が終わると、<span class="tx-teal">緑</span>＝接線（1次近似）、<span class="d47-gray">灰色の点線</span>＝2次近似 も表示されます。');
    note.style.margin = '10px 0 0';
    ctl.append(note);
    const conf = L.game.Confetti(root, plot);
    const st = { guesses: [], done: false };
    const S = () => GS[game.k];
    const game = L.game.GameShell(root, { key: '4-7:game', stages: GS, max: 3, idle: '値を入力して「判定」を押そう',
      formula: () => '\\text{問題：}' + S().q + '\\approx\\ ?',
      onStage(k) { st.guesses = []; st.done = false; inp.value = ''; inp.disabled = false; B.bMain.disabled = false; B.bNext.hidden = true; plot.setView(GS[k].view); typeset(R(root, 'mission')); plot.invalidate(); } });
    function parse(s) {
      s = String(s).trim().replace(/[０-９．－／]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0)).replace(/[−ー]/g, '-').replace(/,/g, '');
      if (!s) return NaN;
      const m = s.match(/^(-?\d*\.?\d+)\s*\/\s*(-?\d*\.?\d+)$/);
      if (m) return +m[1] / +m[2];
      return /^-?\d*\.?\d+$/.test(s) ? +s : NaN;
    }
    function judge() {
      if (st.done) return;
      const v = parse(inp.value);
      if (!isFinite(v)) { game.result('数を入力してください（例 1.01）', 'miss'); return; }
      const T = S(), truth = T.f(T.a + T.h), err = Math.abs(v - truth);
      game.used++; game.renderThrows();
      st.guesses.push(v);
      const tier = err <= T.tol[0] ? 3 : err <= T.tol[1] ? 2 : err <= T.tol[2] ? 1 : 0;
      if (tier) {
        const n = Math.max(1, tier - (game.used - 1));
        st.done = true;
        game.award(n);
        const msg = tier === 3 ? '2次近似の精度！' : tier === 2 ? '1次近似の精度。★3 は 2次の項まで' : 'おしい。接線の式を見直そう';
        game.result('○ ' + L.game.starStr(n) + '　ずれ $' + errTeX(err) + '$（' + msg + '）', 'hit');
        if (n === 3) conf.fire(plot.w / 2, plot.h / 3);
        B.bNext.hidden = game.k >= GS.length - 1;
      } else if (game.used < game.max) {
        game.result('× ずれが大きい。本当の値より' + (v > truth ? '大きい' : '小さい') + '。もう一度！', 'miss');
      } else {
        st.done = true;
        game.result('残念… 本当の値は $' + truth.toFixed(7) + '\\ldots$。「答えと解説」で確かめよう', 'miss');
      }
      if (st.done) { inp.disabled = true; B.bMain.disabled = true; }
      plot.invalidate();
    }
    B.bMain.addEventListener('click', judge);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') judge(); });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, GS.length - 1)));
    plot.draw = function (g) {
      const c = g.c, T = S(), a = T.a, h = T.h, x1 = a + h, fa = T.f(a), truth = T.f(x1);
      axesAuto(g, {});
      D.curve(g, T.f, { color: c.primary, width: 3, x0: T.ft === '\\sqrt{x}' ? 0 : g.xmin });
      if (st.done) {
        D.tangent(g, T.f, a, { df: T.df, point: false });
        const q = T.d2(a) / 2;
        D.curve(g, (x) => fa + T.df(a) * (x - a) + q * (x - a) * (x - a), { color: c.muted, width: 2, dash: [7, 5] });
      }
      g.line(x1, g.ymin, x1, g.ymax, { color: c.accent, width: 1.3, dash: [4, 5], alpha: 0.8 });
      g.dot(a, fa, { r: 5.5, color: c.teal });
      g.tex('x=' + a, a, fa, { align: 'left', valign: 'top', dx: 8, dy: 6, size: 13, color: c.teal, avoid: true });
      g.tex('\\red{x=' + num(x1, 2) + '}', x1, g.ymax, { align: 'left', valign: 'top', dx: 6, dy: 8, size: 13, avoid: true });
      st.guesses.forEach((v) => { if (v > g.ymin && v < g.ymax) g.dot(x1, v, { r: 4.5, color: c.amber }); });
      if (st.done) g.dot(x1, truth, { r: 5, color: c.primary });
      conf.draw(g);
    };
    game.setStage(0);
  }

  D.boot([
    [initCurv, 'w-curv'],
    [initNth, 'w-nth'],
    [initLin, 'w-lin'],
    [initMac, 'w-mac'],
    [initTaylor, 'w-taylor'],
    [initSinCalc, 'w-sincalc'],
    [initGame, 'w-game-approx'],
  ]);
})();
