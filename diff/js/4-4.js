/* 第4章 4.4節 積・商・合成関数の微分 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   axes(g, o)    … 方眼と目盛り（目盛りの数字もすべて TeX）
 *   chipRow(...)  … 選択ボタンの列
 *   rectW(...)    … 図の座標で長方形を塗る
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const fm = (v, d) => D.fmt(v, d == null ? 2 : d);
  const sig = (x) => 1 / (1 + Math.exp(-x));

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
  const unpress = (btns) => btns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
  function setHTML(node, h) { node.innerHTML = h; typeset(node); }

  // 方眼と目盛り（目盛りの文字は TeX）
  function axes(g, o) {
    o = o || {};
    const c = g.c, sx = o.sx || 1, sy = o.sy || 1;
    g.grid({ stepX: sx, stepY: sy, labels: false, xlabel: o.xlabel == null ? 'x' : o.xlabel, ylabel: o.ylabel == null ? 'y' : o.ylabel });
    const lx = o.lx || sx, ly = o.ly || sy;
    let m = 1;
    while (g.pxPerX * lx * m < (o.minPx || 30)) m++;
    const hasX0 = g.ymin <= 0 && g.ymax >= 0, y0 = hasX0 ? g.Y(0) : g.h - 16;
    for (let i = Math.ceil(g.xmin / lx - 1e-9); i * lx <= g.xmax + 1e-9; i++) {
      if (i === 0 || i % m) continue;
      const px = g.X(i * lx);
      if (px > g.w - 20 || px < 12) continue;
      g.texPx(num(i * lx, 2), px, y0 + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
    }
    const pxy = (g.h / (g.ymax - g.ymin)) * ly;
    let my = 1;
    while (pxy * my < 24) my++;
    const hasY0 = g.xmin <= 0 && g.xmax >= 0, x0 = o.yLeft ? 2 : hasY0 ? g.X(0) : 30;
    for (let j = Math.ceil(g.ymin / ly - 1e-9); j * ly <= g.ymax + 1e-9; j++) {
      if (!j || j % my) continue;
      const py = g.Y(j * ly);
      if (py < 24 || py > g.h - 10) continue;
      const inR = x0 < 28;
      g.texPx(o.yfmt ? o.yfmt(j * ly) : num(j * ly, 2), inR ? x0 + 5 : x0 - 6, py, { align: inR ? 'left' : 'right', size: 13, color: c.muted });
    }
    if (hasX0 && hasY0) g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
  }

  // 図の座標 [x0,x1]×[y0,y1] の長方形を塗る（枠線つき）
  function rectW(g, x0, y0, x1, y1, o) {
    const ctx = g.ctx, px = g.X(Math.min(x0, x1)), py = g.Y(Math.max(y0, y1));
    const w = Math.abs(g.X(x1) - g.X(x0)), h = Math.abs(g.Y(y1) - g.Y(y0));
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 0.25 : o.alpha;
    ctx.fillStyle = o.fill; ctx.fillRect(px, py, w, h);
    ctx.globalAlpha = 1;
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.setLineDash(o.dash || []); ctx.strokeRect(px, py, w, h); }
    ctx.restore();
  }

  // 曲線の上をドラッグする点（緑）
  function curveHandle(plot, get, set, f) {
    return plot.addHandle({
      get x() { return get(); }, get y() { return f(get()); },
      get color() { return plot.c ? plot.c.teal : '#0d9c86'; }, r: 8,
      drag(x) { set(x); },
    });
  }

  /* ==========================================================
     4.4(1) 長方形の面積 f×g の増え方
     ========================================================== */
  const PROD = [
    { tex: 'f=x,\\ g=x', ft: 'x', gt: 'x', f: (x) => x, df: () => 1, g: (x) => x, dg: () => 1, finv: (v) => v, lo: 0.5, hi: 2, x: 1.4,
      form: "(x\\cdot x)'=1\\cdot x+x\\cdot1=2x" },
    { tex: 'f=x,\\ g=x^2', ft: 'x', gt: 'x^2', f: (x) => x, df: () => 1, g: (x) => x * x, dg: (x) => 2 * x, finv: (v) => v, lo: 0.6, hi: 1.6, x: 1.2,
      form: "(x\\cdot x^2)'=1\\cdot x^2+x\\cdot2x=3x^2" },
    { tex: 'f=x+1,\\ g=\\sqrt{x}', ft: 'x+1', gt: '\\sqrt{x}', f: (x) => x + 1, df: () => 1, g: Math.sqrt, dg: (x) => 1 / (2 * Math.sqrt(x)), finv: (v) => v - 1, lo: 0.3, hi: 2.4, x: 1,
      form: "\\bigl((x+1)\\sqrt{x}\\bigr)'=1\\cdot\\sqrt{x}+(x+1)\\cdot\\frac{1}{2\\sqrt{x}}" },
  ];
  const DXMAX = 0.6;
  function initProd() {
    const root = $id('w-prod');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1, xmax: 3, ymin: -0.5, ymax: 3, ratio: [0.85, 0.5] });
    const st = { k: 0, x: PROD[0].x, dx: 0.4 };
    const P = () => PROD[st.k];
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: 'x', min: 0.5, max: 2, step: 0.01, value: st.x, color: 'primary', aria: 'x の値' });
    const sD = slider(ctl, { tex: '\\red{\\Delta x}', min: 0.02, max: DXMAX, step: 0.01, value: st.dx, color: 'accent', aria: '増分 Δx' });
    sX.on((v) => { st.x = v; update(); });
    sD.on((v) => { st.dx = v; update(); });
    function view() {
      const p = P(), W = p.f(p.hi + DXMAX), G = p.g(p.hi + DXMAX);
      plot.setView({ xmin: -0.3 * W, xmax: W * 1.32, ymin: -0.2 * G, ymax: G * 1.16 });
    }
    chipRow(R(root, 'presets'), PROD, 0, (it, i) => {
      st.k = i; st.x = it.x;
      sX.input.min = it.lo; sX.input.max = it.hi; sX.set(st.x);
      view(); update();
    });
    // 長方形の右上の角（青）と、伸びたあとの角（赤）をドラッグ
    plot.addHandle({ get x() { return P().f(st.x); }, get y() { return P().g(st.x); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 7,
      drag(x) { const p = P(); st.x = clamp(Math.round(p.finv(x) * 100) / 100, p.lo, p.hi); sX.set(st.x); update(); } });
    plot.addHandle({ get x() { return P().f(st.x + st.dx); }, get y() { return P().g(st.x + st.dx); },
      get color() { return plot.c ? plot.c.accent : '#d6453d'; }, r: 7,
      drag(x) { const p = P(); st.dx = clamp(Math.round((p.finv(x) - st.x) * 100) / 100, 0.02, DXMAX); sD.set(st.dx); update(); } });
    let lastHow = -1;
    function update() {
      const p = P(), x = st.x, h = st.dx, f0 = p.f(x), g0 = p.g(x), Df = p.f(x + h) - f0, Dg = p.g(x + h) - g0;
      const a = g0 * Df, b = f0 * Dg, cc = Df * Dg, tot = a + b + cc;
      tex(root, 'parts', '\\Delta(fg)=\\underbrace{' + fm(a, 3) + '}_{g\\Delta f}+\\underbrace{' + fm(b, 3) + '}_{f\\Delta g}+\\underbrace{' + fm(cc, 4) + '}_{\\Delta f\\Delta g}');
      tex(root, 'ratio', '\\dfrac{\\Delta(fg)}{\\red{\\Delta x}}=\\dfrac{' + fm(tot, 3) + '}{\\red{' + fm(h) + '}}\\approx' + fm(tot / h, 3) + '\\ \\to\\ ' + fm(p.df(x) * g0 + f0 * p.dg(x), 3));
      tex(root, 'formula', p.form);
      const pc = 100 * cc / tot, k = pc < 3 ? 0 : 1;
      if (k !== lastHow) {
        lastHow = k;
        setHTML(R(root, 'how'), k ? '右上の灰色の角 $\\Delta f\\,\\Delta g$ は、まだ見える大きさ。$\\red{\\Delta x}$ を小さくしてみよう。'
          : '角（灰色）は、増えた面積のほんの少し。$\\red{\\Delta x}\\to0$ では、細長い2つの部分だけが残る。');
      }
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, p = P(), x = st.x, h = st.dx, f0 = p.f(x), g0 = p.g(x), f1 = p.f(x + h), g1 = p.g(x + h);
      const W = p.f(p.hi + DXMAX), G = p.g(p.hi + DXMAX);
      // 目盛りは軸だけ
      g.line(g.xmin, 0, g.xmax, 0, { color: c.axis, width: 1.4 });
      g.line(0, g.ymin, 0, g.ymax, { color: c.axis, width: 1.4 });
      rectW(g, 0, 0, f0, g0, { fill: c.primary, alpha: 0.16, stroke: c.primary, lw: 2.5 });
      rectW(g, f0, 0, f1, g0, { fill: c.accent, alpha: 0.35 });
      rectW(g, 0, g0, f0, g1, { fill: c.violet, alpha: 0.35 });
      rectW(g, f0, g0, f1, g1, { fill: c.muted, alpha: 0.6 });
      rectW(g, 0, 0, f1, g1, { fill: c.bg, alpha: 0, stroke: c.accent, lw: 1.6, dash: [5, 4] });
      // 面積のラベル
      g.tex('\\blue{fg}', f0 / 2, g0 / 2, { align: 'center', size: 18 });
      const pxH = g.Y(g0) - g.Y(g1), pxW = g.X(f1) - g.X(f0);
      g.tex('\\red{g\\,\\Delta f}', f1, g0 / 2, { align: 'left', dx: 8, size: 15, avoid: true });
      g.tex('\\violet{f\\,\\Delta g}', f0 / 2, g1, { align: 'center', valign: 'bottom', dy: -4, size: 15, avoid: true });
      g.tex('\\Delta f\\,\\Delta g', f1, g1, { align: 'left', valign: 'bottom', dx: 6, dy: -2, size: 14, color: c.muted, avoid: true });
      // 辺の長さ
      g.tex('\\blue{f=' + p.ft + '}', f0 / 2, 0, { align: 'center', valign: 'top', dy: 6, size: 14 });
      if (pxW > 26) g.tex('\\red{\\Delta f}', (f0 + f1) / 2, 0, { align: 'center', valign: 'top', dy: 6, size: 14, avoid: true });
      g.tex('\\blue{g=' + p.gt + '}', 0, g0 / 2, { align: 'right', dx: -6, size: 14 });
      if (pxH > 16) g.tex('\\red{\\Delta g}', 0, (g0 + g1) / 2, { align: 'right', dx: -6, size: 14, avoid: true });
      void W; void G;
    };
    view(); update();
  }

  /* ==========================================================
     4.4(3) つないだ装置のメーター
     ========================================================== */
  const CHAIN = [
    { tex: 'u=2x,\\ y=3u', gT: 'u=2x', fT: 'y=3u', g: (x) => 2 * x, dg: () => 2, f: (u) => 3 * u, df: () => 3,
      dgT: '2', dfT: '3', lo: -1.4, hi: 1.4, vmin: -9.5, vmax: 9.5, step: 1, lab: 3, x: -1,
      how: 'まっすぐな装置。$x$ が $1$ 進む間に $u$ は $2$、$y$ は $3\\times2=6$ 進む。速さはいつも $6$ 倍。' },
    { tex: 'u=x^2,\\ y=\\sin u', gT: 'u=x^2', fT: 'y=\\sin u', g: (x) => x * x, dg: (x) => 2 * x, f: Math.sin, df: Math.cos,
      dgT: '2x', dfT: '\\cos u', lo: 0, hi: 2.1, vmin: -1.4, vmax: 4.6, step: 0.5, lab: 1, x: 0.6,
      how: '曲がった装置では、速さの倍率が場所で変わる。$u$ が $\\frac{\\pi}{2}\\approx1.57$ を過ぎると $\\cos u\\lt0$ なので、$y$ は逆向きに動く。' },
    { tex: 'u=-x^2,\\ y=e^u', gT: 'u=-x^2', fT: 'y=e^u', g: (x) => -x * x, dg: (x) => -2 * x, f: Math.exp, df: Math.exp,
      dgT: '-2x', dfT: 'e^u', lo: -2, hi: 2, vmin: -4.5, vmax: 2.3, step: 0.5, lab: 1, x: -1.5,
      how: '$y=e^{-x^2}$（つりがね形）。$x=0$ を通るとき、$u$ も $y$ も一瞬止まる（$\\frac{du}{dx}=-2x=0$）。' },
  ];
  function initChain() {
    const root = $id('w-chain');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -10, xmax: 10, ymin: -0.75, ymax: 2.75, height: (w) => (w < 520 ? 300 : clamp(w * 0.36, 250, 320)) });
    const st = { k: 0, x: CHAIN[0].x, play: false, dir: 1 };
    const C = () => CHAIN[st.k];
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: '\\blue{x}', min: CHAIN[0].lo, max: CHAIN[0].hi, step: 0.01, value: st.x, color: 'primary', aria: 'x の値' });
    sX.on((v) => { st.x = v; st.play = false; showPlay(); update(); });
    function view() {
      const m = C(), span = m.vmax - m.vmin;
      plot.setView({ xmin: m.vmin - span * (plot.w < 520 ? 0.2 : 0.3), xmax: m.vmax + span * 0.03 });
    }
    chipRow(R(root, 'mode'), CHAIN, 0, (it, i) => {
      st.k = i; st.x = it.x; st.play = false; showPlay();
      sX.input.min = it.lo; sX.input.max = it.hi; sX.set(st.x);
      view(); update(true);
    });
    plot.onResize = () => view();
    const bP = R(root, 'play');
    const showPlay = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      const m = C();
      st.x += st.dir * dt * 0.5;
      if (st.x >= m.hi) { st.x = m.hi; st.dir = -1; }
      if (st.x <= m.lo) { st.x = m.lo; st.dir = 1; }
      sX.set(Math.round(st.x * 100) / 100);
      update();
      return true;
    });
    bP.addEventListener('click', () => { st.play = !st.play; showPlay(); if (st.play) anim.kick(); });
    plot.addHandle({ get x() { return st.x; }, y: 2, get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 8,
      drag(x) { const m = C(); st.x = clamp(Math.round(x * 100) / 100, m.lo, m.hi); st.play = false; showPlay(); sX.set(st.x); update(); } });
    function update(force) {
      const m = C(), x = st.x, u = m.g(x), y = m.f(u), a = m.dg(x), b = m.df(u);
      tex(root, 'val', '\\blue{x}=' + fm(x) + ',\\ \\ \\violet{u}=' + fm(u) + ',\\ \\ \\amber{y}=' + fm(y, 3));
      const eq = (t, v) => (t === v ? t : t + '=' + v);
      tex(root, 'rates', '\\dfrac{du}{dx}=' + eq(m.dgT, fm(a)) + ',\\ \\ \\dfrac{dy}{du}=' + eq(m.dfT, fm(b, 3)));
      tex(root, 'dy', '\\dfrac{dy}{dx}=\\dfrac{dy}{du}\\cdot\\dfrac{du}{dx}=' + fm(b, 3) + '\\times' + (a < 0 ? '(' + fm(a) + ')' : fm(a)) + '=' + fm(a * b, 3));
      if (force || !R(root, 'how').innerHTML) setHTML(R(root, 'how'), m.how);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, m = C(), x = st.x, u = m.g(x), y = m.f(u), a = m.dg(x), b = m.df(u);
      const T = 0.5;   // 矢印の長さ ＝ 0.5 秒で進む量（x は 1 秒に 1 の速さ）
      const rows = [
        { v: x, s: 1, n: 'x', col: c.primary, y: 2 },
        { v: u, s: a, n: 'u', col: c.violet, y: 1 },
        { v: y, s: a * b, n: 'y', col: c.amber, y: 0 },
      ];
      rows.forEach(function (r) {
        g.line(m.vmin, r.y, m.vmax, r.y, { color: c.axis, width: 1.6 });
        let k = 1;
        while (g.pxPerX * m.step * k < 18) k++;
        for (let i = Math.ceil(m.vmin / m.step - 1e-9); i * m.step <= m.vmax + 1e-9; i++) {
          if (i % k) continue;
          const v = i * m.step, big = Math.abs(v / m.lab - Math.round(v / m.lab)) < 1e-9;
          g.line(v, r.y - (big ? 0.09 : 0.05), v, r.y + (big ? 0.09 : 0.05), { color: c.muted, width: big ? 1.6 : 1 });
          if (big && g.pxPerX * m.lab >= 22) g.tex(num(v, 2), v, r.y, { align: 'center', valign: 'top', dy: 9, size: 12, color: c.muted });
        }
        g.tex(r.n, m.vmin, r.y, { align: 'right', dx: -10, size: 17, color: r.col });
        // 速さの矢印（0.5 秒で進む量）
        const end = clamp(r.v + r.s * T, m.vmin - 0.5, m.vmax + 0.5);
        if (Math.abs(g.X(end) - g.X(r.v)) > 3) g.arrow(r.v, r.y + 0.3, end, r.y + 0.3, { color: r.col, width: 3, head: 11 });
        g.tex('\\text{速さ }' + fm(r.s, 2), (r.v + end) / 2, r.y + 0.3, { align: 'center', valign: 'bottom', dy: -5, size: 13, color: r.col, avoid: true });
        if (r.n !== 'x') g.dot(r.v, r.y, { r: 7, color: r.col });
      });
      // 装置（つなぎ目）
      const px = 8;
      g.texPx('\\downarrow\\ \\boxed{' + m.gT + '}\\ \\ \\times' + fm(a), px, g.Y(1.5), { align: 'left', size: 14, color: c.violet });
      g.texPx('\\downarrow\\ \\boxed{' + m.fT + '}\\ \\ \\times' + fm(b, 2), px, g.Y(0.5), { align: 'left', size: 14, color: c.amber });
    };
    view(); showPlay(); update(true);
  }

  /* ==========================================================
     4.4(3) 動画のスロー・早送り
     ========================================================== */
  const TD = 2;   // もとの動きの長さ（秒）
  const P0 = (s) => { if (s <= 0) return 0; if (s >= TD) return 1; const q = s / TD; return 3 * q * q - 2 * q * q * q; };
  const dP0 = (s) => { if (s <= 0 || s >= TD) return 0; const q = s / TD; return (6 * q - 6 * q * q) / TD; };
  function initRetime() {
    const root = $id('w-retime');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.35, xmax: 4.35, ymin: -0.2, ymax: 1.35, ratio: [0.7, 0.42] });
    const st = { k: 2, t: 0.5, play: false };
    const ctl = root.querySelector('.controls');
    const sK = slider(ctl, { tex: '\\violet{k}', min: 0.25, max: 3, step: 0.05, value: st.k, color: 'violet', aria: '再生速度 k' });
    const sT = slider(ctl, { tex: 't', min: 0, max: 4, step: 0.01, value: st.t, color: 'teal', aria: '時刻 t（秒）' });
    const pre = chipRow(R(root, 'presets'), [{ tex: '\\times0.5' , k: 0.5 }, { tex: '\\times1', k: 1 }, { tex: '\\times2', k: 2 }, { tex: '\\times3', k: 3 }], 2, (it) => { st.k = it.k; sK.set(it.k); update(); });
    sK.on((v) => { st.k = v; unpress(pre); update(); });
    sT.on((v) => { st.t = v; st.play = false; showPlay(); update(); });
    const q = (t) => P0(st.k * t), dq = (t) => st.k * dP0(st.k * t);
    const bP = R(root, 'play');
    const showPlay = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 再生'; };
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt * 0.8;
      if (st.t >= 4) { st.t = 4; st.play = false; showPlay(); }
      sT.set(Math.round(st.t * 100) / 100); update();
      return st.play;
    });
    bP.addEventListener('click', () => { st.play = !st.play; if (st.play && st.t >= 4) st.t = 0; showPlay(); if (st.play) anim.kick(); });
    curveHandle(plot, () => st.t, (t) => { st.t = clamp(Math.round(t * 100) / 100, 0, 4); st.play = false; showPlay(); sT.set(st.t); update(); }, q);
    function update() {
      const t = st.t, s = st.k * t, ks = fm(st.k);
      tex(root, 'scene', 't=' + fm(t) + '\\ \\to\\ \\text{もとの }\\blue{' + fm(Math.min(s, 9)) + '}\\text{ 秒}' + (s > TD ? '\\ (\\text{止まった})' : ''));
      tex(root, 'v0', "\\blue{p'(kt)}=p'(" + fm(s) + ')\\approx' + fm(dP0(s), 3));
      tex(root, 'v1', "\\violet{\\bigl(p(kt)\\bigr)'}=" + ks + '\\times' + fm(dP0(s), 3) + '\\approx\\teal{' + fm(dq(t), 3) + '}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, t = st.t, s = st.k * t;
      axes(g, { xlabel: 't', ylabel: '位置', sy: 0.5 });
      D.curve(g, P0, { color: c.primary, width: 2.5, x0: 0, x1: g.xmax, alpha: 0.7 });
      D.curve(g, q, { color: c.violet, width: 3, x0: 0, x1: g.xmax });
      // もとの動画の同じ場面（時刻 kt）
      if (s <= g.xmax) {
        D.tangent(g, P0, s, { df: dP0, color: c.primary, width: 1.6, dash: [6, 5], point: false });
        g.dot(s, P0(s), { r: 5, color: c.primary });
        g.line(t, q(t), s, P0(s), { color: c.muted, width: 1.2, dash: [2, 4] });
      }
      D.tangent(g, q, t, { df: dq, point: false });
      g.tex('y=p(t)', 1.55, P0(1.55), { align: 'left', valign: 'top', dx: 10, dy: 2, size: 14, color: c.primary, avoid: true });
      { const tl = Math.min(TD / st.k, 4), lft = tl < 1.3;
        g.tex('y=p(' + fm(st.k) + 't)', tl, 1, { align: lft ? 'left' : 'right', valign: 'bottom', dx: lft ? 4 : 0, dy: -6, size: 14, color: c.violet, avoid: true }); }
    };
    showPlay(); update();
  }

  /* ==========================================================
     4.4(4) シグモイドとその傾き
     ========================================================== */
  function initSig() {
    const root = $id('w-sig');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -6.4, xmax: 6.4, ymin: -0.22, ymax: 1.22, ratio: [0.72, 0.4] });
    const st = { x: 1, n: 3 };
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: '\\teal{x}', min: -6, max: 6, step: 0.05, value: st.x, color: 'teal', aria: '接点の x 座標' });
    const sN = slider(ctl, { tex: 'n', min: 1, max: 10, step: 1, value: st.n, color: 'amber', aria: 'つなぐ層の数 n' });
    sX.on((v) => { st.x = v; update(); });
    sN.on((v) => { st.n = v; update(); });
    const dsig = (x) => sig(x) * (1 - sig(x));
    curveHandle(plot, () => st.x, (x) => { st.x = clamp(Math.round(x * 20) / 20, -6, 6); sX.set(st.x); update(); }, sig);
    let lastHow = -1;
    function update() {
      const s = sig(st.x), m = dsig(st.x), n = st.n, mx = Math.pow(0.25, n);
      tex(root, 'val', '\\sigma(' + fm(st.x) + ')\\approx' + fm(s, 3));
      tex(root, 'm', "\\sigma'=\\sigma(1-\\sigma)=" + fm(s, 3) + '\\times' + fm(1 - s, 3) + '\\approx\\amber{' + fm(m, 3) + '}');
      const sci = (v) => { const e = Math.floor(Math.log10(v)), mnt = v / Math.pow(10, e); return e >= -2 ? fm(v, 4) : fm(mnt, 2) + '\\times10^{' + e + '}'; };
      tex(root, 'layers', "(\\sigma')^{" + n + '}\\leqq\\left(\\tfrac14\\right)^{' + n + '}\\approx' + sci(mx));
      const k = Math.abs(st.x) < 0.3 ? 0 : Math.abs(st.x) > 3 ? 2 : 1;
      if (k !== lastHow) {
        lastHow = k;
        setHTML(R(root, 'how'), [
          '$x=0$ で傾きがいちばん大きく、ちょうど $\\sigma\'(0)=\\frac12\\cdot\\frac12=\\frac14$。',
          '$\\sigma(1-\\sigma)$ は、$\\sigma$ が $\\frac12$ から離れるほど小さくなる。',
          '端のほうではグラフがほとんど平ら。傾きはほぼ $0$ で、学習の手がかりがほとんどない。',
        ][k]);
      }
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, x0 = st.x;
      axes(g, { sx: 1, sy: 0.25, lx: 2, ly: 0.25, yLeft: true, yfmt: (v) => (Math.abs(v - 0.25) < 1e-9 ? '\\dfrac14' : Math.abs(v - 0.5) < 1e-9 ? '\\dfrac12' : Math.abs(v - 0.75) < 1e-9 ? '\\dfrac34' : num(v, 2)) });
      g.line(g.xmin, 1, g.xmax, 1, { color: c.muted, width: 1.2, dash: [5, 5] });
      g.line(g.xmin, 0.25, g.xmax, 0.25, { color: c.amber, width: 1.2, dash: [4, 5], alpha: 0.7 });
      D.curve(g, dsig, { color: c.amber, width: 2.5 });
      D.curve(g, sig, { color: c.primary, width: 3 });
      D.tangent(g, sig, x0, { df: dsig, point: false });
      g.line(x0, sig(x0), x0, dsig(x0), { color: c.amber, width: 1.2, dash: [3, 4], alpha: 0.8 });
      g.dot(x0, dsig(x0), { r: 5, color: c.amber });
      g.tex('y=\\sigma(x)', 4.6, sig(4.6), { align: 'center', valign: 'top', dy: 8, size: 15, color: c.primary, avoid: true });
      g.tex("y=\\sigma'(x)", -3.4, dsig(-3.4), { align: 'center', valign: 'bottom', dy: -8, size: 14, color: c.amber, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.4(6) チャレンジ：装置をつなげ
     ========================================================== */
  // 中身 in / 外側 out の候補（関数つき）。外側の t は「#」に中身を入れる型
  const GSTAGES = [
    { name: '累乗', q: '(2x^2+1)^3', F: (x) => Math.pow(2 * x * x + 1, 3),
      inner: [{ t: '2x^2+1', f: (x) => 2 * x * x + 1 }, { t: 'x^2', f: (x) => x * x }, { t: 'x^3', f: (x) => x * x * x }, { t: '2x+1', f: (x) => 2 * x + 1 }],
      outer: [{ t: '(#)^3', f: (u) => u * u * u }, { t: '(#)^2', f: (u) => u * u }, { t: '3(#)', f: (u) => 3 * u }, { t: 'e^{#}', f: Math.exp }],
      du: '4x', dy: '3u^2',
      deriv: ['12x(2x^2+1)^2', '3(2x^2+1)^2', '4x(2x^2+1)^3', '6x(2x^2+1)^2'],
      hint: '一番外側の形は「（何か）の3乗」。その「何か」が中身。$\\left(u^3\\right)\'=3u^2$、$(2x^2+1)\'=4x$。',
      ans: '中身 $u=2x^2+1$、外側 $y=u^3$。<br>$\\dfrac{dy}{dx}=3u^2\\cdot4x=12x(2x^2+1)^2$<br>（$u$ を $x$ の式にもどす。$3(2x^2+1)^2$ だけでは中身の微分 $4x$ を忘れている）' },
    { name: '三角の3乗', q: '\\sin^3x', F: (x) => Math.pow(Math.sin(x), 3),
      inner: [{ t: '\\sin x', f: Math.sin }, { t: 'x^3', f: (x) => x * x * x }, { t: '\\cos x', f: Math.cos }, { t: '3x', f: (x) => 3 * x }],
      outer: [{ t: '(#)^3', f: (u) => u * u * u }, { t: '\\sin (#)', f: Math.sin }, { t: '(#)^2', f: (u) => u * u }, { t: '\\cos (#)', f: Math.cos }],
      du: '\\cos x', dy: '3u^2',
      deriv: ['3\\sin^2x\\cos x', '3\\sin^2x', '\\cos^3x', '3x^2\\cos x^3'],
      hint: '$\\sin^3x$ は $(\\sin x)^3$ のこと（$\\sin(x^3)$ ではない）。',
      ans: '$\\sin^3x=(\\sin x)^3$ なので、中身 $u=\\sin x$、外側 $y=u^3$。<br>$\\dfrac{dy}{dx}=3u^2\\cdot\\cos x=3\\sin^2x\\cos x$' },
    { name: '指数', q: 'e^{-x^2}', F: (x) => Math.exp(-x * x),
      inner: [{ t: '-x^2', f: (x) => -x * x }, { t: 'x^2', f: (x) => x * x }, { t: 'e^x', f: Math.exp }, { t: '-2x', f: (x) => -2 * x }],
      outer: [{ t: 'e^{#}', f: Math.exp }, { t: '\\log (#)', f: Math.log }, { t: '(#)^2', f: (u) => u * u }, { t: '-(#)', f: (u) => -u }],
      du: '-2x', dy: 'e^u',
      deriv: ['-2xe^{-x^2}', 'e^{-x^2}', '-x^2e^{-x^2-1}', '2xe^{-x^2}'],
      hint: '肩（指数）にのっている $-x^2$ が中身。$(e^u)\'=e^u$ なので、外側を微分しても $e^{-x^2}$ のまま。',
      ans: '中身 $u=-x^2$、外側 $y=e^u$。<br>$\\dfrac{dy}{dx}=e^u\\cdot(-2x)=-2xe^{-x^2}$<br>（$e^x$ の微分は $xe^{x-1}$ ではない！）' },
    { name: 'ルート', q: '\\sqrt{x^2+1}', F: (x) => Math.sqrt(x * x + 1),
      inner: [{ t: 'x^2+1', f: (x) => x * x + 1 }, { t: 'x^2', f: (x) => x * x }, { t: '\\sqrt{x}', f: Math.sqrt }, { t: 'x+1', f: (x) => x + 1 }],
      outer: [{ t: '\\sqrt{#}', f: Math.sqrt }, { t: '(#)^2', f: (u) => u * u }, { t: '\\dfrac{1}{#}', f: (u) => 1 / u }, { t: '#+1', f: (u) => u + 1 }],
      du: '2x', dy: '\\dfrac{1}{2\\sqrt{u}}',
      deriv: ['\\dfrac{x}{\\sqrt{x^2+1}}', '\\dfrac{1}{2\\sqrt{x^2+1}}', '\\dfrac{2x}{\\sqrt{x^2+1}}', 'x\\sqrt{x^2+1}'],
      hint: '$\\sqrt{u}=u^{\\frac12}$ なので $(\\sqrt{u})\'=\\dfrac12u^{-\\frac12}=\\dfrac{1}{2\\sqrt u}$。',
      ans: '中身 $u=x^2+1$、外側 $y=\\sqrt u$。<br>$\\dfrac{dy}{dx}=\\dfrac{1}{2\\sqrt{u}}\\cdot2x=\\dfrac{x}{\\sqrt{x^2+1}}$' },
    { name: '対数', q: '\\log(\\cos x)', F: (x) => Math.log(Math.cos(x)), dom: [-1.2, 1.2],
      inner: [{ t: '\\cos x', f: Math.cos }, { t: '\\log x', f: Math.log }, { t: '-\\sin x', f: (x) => -Math.sin(x) }, { t: 'x', f: (x) => x }],
      outer: [{ t: '\\log (#)', f: Math.log }, { t: '\\cos (#)', f: Math.cos }, { t: '\\dfrac{1}{#}', f: (u) => 1 / u }, { t: 'e^{#}', f: Math.exp }],
      du: '-\\sin x', dy: '\\dfrac1u',
      deriv: ['-\\tan x', '\\dfrac{1}{\\cos x}', '\\tan x', '-\\dfrac{\\sin x}{\\cos^2x}'],
      hint: '$(\\log u)\'=\\dfrac1u$、$(\\cos x)\'=-\\sin x$。答えは $\\dfrac{\\sin x}{\\cos x}=\\tan x$ を使ってまとめる。',
      ans: '中身 $u=\\cos x$、外側 $y=\\log u$（$\\cos x\\gt0$ の範囲で考える）。<br>$\\dfrac{dy}{dx}=\\dfrac1u\\cdot(-\\sin x)=-\\dfrac{\\sin x}{\\cos x}=-\\tan x$<br>（(5) の対数微分法の $\\dfrac{f\'}{f}$ の形そのもの）' },
  ];
  const showU = (t) => t.replace('(#)', 'u').replace('#', 'u');
  const comp = (o, i) => o.t.replace('#', i.t);
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function sameFn(F, G, dom) {
    const lo = dom ? dom[0] : 0.2, hi = dom ? dom[1] : 1.7;
    for (let i = 0; i <= 6; i++) {
      const x = lo + (hi - lo) * i / 6, a = F(x), b = G(x);
      if (!isFinite(a) || !isFinite(b) || Math.abs(a - b) > 1e-7 * (1 + Math.abs(a))) return false;
    }
    return true;
  }
  function initGameChain() {
    const root = $id('w-game-chain');
    const plot = new Plot(root.querySelector('canvas'), { height: (w) => (w < 560 ? 284 : 170) });
    const st = { inner: -1, outer: -1, joined: false, done: false, miss: 0, wrong: null };
    const qBox = R(root, 'q'), step1 = R(root, 'step1'), step2 = R(root, 'step2');
    const bJoin = R(root, 'join');
    const ctl = root.querySelector('.controls');
    const row = el('div', 'btn-row');
    const bRetry = el('button', 'btn', 'やり直す'), bNext = el('button', 'btn', '次のステージへ →');
    [bRetry, bNext].forEach((b) => { b.type = 'button'; row.append(b); });
    ctl.append(row);
    const note = el('p', 'note-txt', '外側の装置の u のところに、中身の装置の出力が入ります。いちばん最後に計算する操作（3乗する、ルートをとる、など）が外側です。');
    note.style.margin = '10px 0 0';
    ctl.append(note);
    const conf = L.game.Confetti(root, plot);
    let S = GSTAGES[0], inOpts = [], outOpts = [], dOpts = [], inBtns = [], outBtns = [];
    const game = L.game.GameShell(root, { key: '4-4:game', stages: GSTAGES.map((G) => ({ name: G.name, text: '下の関数を、中身と外側の2つの装置に分けてつなごう。', hint: G.hint, answer: G.ans })),
      idle: '中身と外側を選んで「つなぐ」',
      onStage(k) { reset(k); typeset(R(root, 'mission')); } });
    const fr = R(root, 'formula'); if (fr) fr.closest('.row').remove();
    function pickRow(box, opts, isOuter) {
      box.innerHTML = '';
      return opts.map(function (o, i) {
        const b = el('button', 'chip ta-chip'); b.type = 'button';
        const s = el('span'); b.append(s); setTex(s, isOuter ? 'y=' + showU(o.t) : 'u=' + o.t);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          if (st.joined) return;
          (isOuter ? outBtns : inBtns).forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
          if (isOuter) st.outer = i; else st.inner = i;
          st.wrong = null; plot.invalidate();
        });
        box.append(b); return b;
      });
    }
    function showMiss() { R(root, 'miss').textContent = st.miss + ' 回'; }
    function reset(k) {
      S = GSTAGES[k];
      st.inner = st.outer = -1; st.joined = st.done = false; st.miss = 0; st.wrong = null;
      setTex(qBox, 'y=' + S.q);
      inOpts = shuffle(S.inner); outOpts = shuffle(S.outer);
      inBtns = pickRow(R(root, 'inner'), inOpts, false);
      outBtns = pickRow(R(root, 'outer'), outOpts, true);
      step1.hidden = false; step2.hidden = true; bJoin.disabled = false;
      bNext.hidden = true;
      const box = R(root, 'deriv');
      box.innerHTML = '';
      dOpts = shuffle(S.deriv.map((t, i) => ({ t, ok: i === 0 })));
      dOpts.forEach(function (o) {
        const b = el('button', 'chip ta-chip'); b.type = 'button';
        const s = el('span'); b.append(s); setTex(s, o.t);
        b.addEventListener('click', () => pickDeriv(b, o));
        box.append(b);
      });
      showMiss(); plot.invalidate();
    }
    bJoin.addEventListener('click', function () {
      if (st.joined) return;
      if (st.inner < 0 || st.outer < 0) { game.result('中身と外側を1つずつ選んでから「つなぐ」を押そう'); return; }
      const I = inOpts[st.inner], O = outOpts[st.outer];
      if (sameFn(S.F, (x) => O.f(I.f(x)), S.dom)) {
        st.joined = true; st.wrong = null;
        inBtns.concat(outBtns).forEach((b) => { b.disabled = true; if (b.getAttribute('aria-pressed') === 'true') b.classList.add('ok'); });
        bJoin.disabled = true; step2.hidden = false;
        game.result('○ 正しくつながった！ 次は導関数を選ぼう', 'hit');
      } else {
        st.miss++; st.wrong = comp(O, I);
        game.result('× つなぐと $y=' + st.wrong + '$ になってしまう。もう一度選ぼう', 'miss');
      }
      showMiss(); plot.invalidate();
    });
    function pickDeriv(b, o) {
      if (!st.joined || st.done) return;
      if (o.ok) {
        st.done = true;
        b.classList.add('ok');
        R(root, 'deriv').querySelectorAll('button').forEach((x) => { x.disabled = true; });
        const n = st.miss === 0 ? 3 : st.miss === 1 ? 2 : 1;
        game.result('🏁 クリア ' + L.game.starStr(n) + '（まちがい ' + st.miss + ' 回）' + (n < 3 ? '　まちがい 0 で★3！' : ''), 'hit');
        game.award(n);
        if (n === 3) conf.fire(plot.w / 2, plot.h / 3);
        bNext.hidden = game.k >= GSTAGES.length - 1;
      } else {
        st.miss++; b.classList.add('ng'); b.disabled = true;
        game.result('× ちがう。外側の微分 $' + S.dy + '$ と、中身の微分 $' + S.du + '$ をかけよう', 'miss');
      }
      showMiss(); plot.invalidate();
    }
    bRetry.addEventListener('click', () => game.setStage(game.k));
    bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, GSTAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, w = g.w, h = g.h, vert = w < 560;
      const I = st.inner >= 0 ? inOpts[st.inner] : null, O = st.outer >= 0 ? outOpts[st.outer] : null;
      const box = (cx, cy, bw, bh, col) => {
        ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.12;
        ctx.beginPath(); ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10); ctx.fill();
        ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      };
      const arr = (x0, y0, x1, y1) => {
        ctx.save(); ctx.strokeStyle = ctx.fillStyle = c.muted; ctx.lineWidth = 2.5;
        const a = Math.atan2(y1 - y0, x1 - x0);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - 6 * Math.cos(a), y1 - 6 * Math.sin(a)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 11 * Math.cos(a - 0.45), y1 - 11 * Math.sin(a - 0.45)); ctx.lineTo(x1 - 11 * Math.cos(a + 0.45), y1 - 11 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
        ctx.restore();
      };
      const gT = I ? 'u=' + I.t : 'u=\\ ?', fT = O ? 'y=' + showU(O.t) : 'y=\\ ?';
      const rateG = st.joined ? '\\dfrac{du}{dx}=' + S.du : '', rateF = st.joined ? '\\dfrac{dy}{du}=' + S.dy : '';
      if (!vert) {
        const cy = h * 0.42, bw = Math.min(170, w * 0.24), bh = 58;
        const xs = [w * 0.05, w * 0.29, w * 0.5, w * 0.71, w * 0.95];
        g.texPx('x', xs[0], cy, { align: 'center', size: 20, color: c.primary });
        box(xs[1], cy, bw, bh, c.violet); box(xs[3], cy, bw, bh, c.amber);
        g.texPx('\\text{中身 } g', xs[1], cy - bh / 2 - 4, { align: 'center', valign: 'bottom', size: 13, color: c.violet });
        g.texPx('\\text{外側 } f', xs[3], cy - bh / 2 - 4, { align: 'center', valign: 'bottom', size: 13, color: c.amber });
        g.texPx(gT, xs[1], cy, { align: 'center', size: 16, color: c.text });
        g.texPx(fT, xs[3], cy, { align: 'center', size: 16, color: c.text });
        g.texPx('u', xs[2], cy, { align: 'center', size: 20, color: c.violet });
        g.texPx('y', xs[4], cy, { align: 'center', size: 20, color: c.amber });
        arr(xs[0] + 12, cy, xs[1] - bw / 2 - 4, cy); arr(xs[1] + bw / 2 + 4, cy, xs[2] - 12, cy);
        arr(xs[2] + 12, cy, xs[3] - bw / 2 - 4, cy); arr(xs[3] + bw / 2 + 4, cy, xs[4] - 12, cy);
        if (rateG) { g.texPx(rateG, xs[1], cy + bh / 2 + 8, { align: 'center', valign: 'top', size: 14, color: c.violet }); g.texPx(rateF, xs[3], cy + bh / 2 + 8, { align: 'center', valign: 'top', size: 14, color: c.amber }); }
      } else {
        const cx = w * 0.44, bw = Math.min(180, w * 0.46), bh = 46;
        const ys = [16, 62, 112, 162, 210];
        g.texPx('x', cx, ys[0], { align: 'center', size: 19, color: c.primary });
        box(cx, ys[1], bw, bh, c.violet); box(cx, ys[3], bw, bh, c.amber);
        g.texPx(gT, cx, ys[1], { align: 'center', size: 15, color: c.text });
        g.texPx(fT, cx, ys[3], { align: 'center', size: 15, color: c.text });
        g.texPx('\\text{中身}', cx - bw / 2 - 6, ys[1], { align: 'right', size: 13, color: c.violet });
        g.texPx('\\text{外側}', cx - bw / 2 - 6, ys[3], { align: 'right', size: 13, color: c.amber });
        g.texPx('u', cx, ys[2], { align: 'center', size: 19, color: c.violet });
        g.texPx('y', cx, ys[4], { align: 'center', size: 19, color: c.amber });
        arr(cx, ys[0] + 12, cx, ys[1] - bh / 2 - 2); arr(cx, ys[1] + bh / 2 + 2, cx, ys[2] - 12);
        arr(cx, ys[2] + 12, cx, ys[3] - bh / 2 - 2); arr(cx, ys[3] + bh / 2 + 2, cx, ys[4] - 12);
        if (rateG) { g.texPx(rateG, cx + bw / 2 + 6, ys[1], { align: 'left', size: 12, color: c.violet }); g.texPx(rateF, cx + bw / 2 + 6, ys[3], { align: 'left', size: 12, color: c.amber }); }
      }
      if (st.wrong) g.texPx('\\text{つなぐと }y=' + st.wrong + '\\ \\ne\\ ' + S.q, w / 2, h - 8, { align: 'center', valign: 'bottom', size: 14, color: c.accent });
      else if (st.joined) g.texPx('\\dfrac{dy}{dx}=\\dfrac{dy}{du}\\cdot\\dfrac{du}{dx}', w / 2, h - 6, { align: 'center', valign: 'bottom', size: 14, color: c.teal });
      conf.draw(g);
    };
    game.setStage(0);
  }

  D.boot([
    [initProd, 'w-prod'],
    [initChain, 'w-chain'],
    [initRetime, 'w-retime'],
    [initSig, 'w-sig'],
    [initGameChain, 'w-game-chain'],
  ]);
})();
