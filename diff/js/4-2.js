/* 第4章 4.2節 微分の定義と導関数 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   chipRow(box, items, cur, onPick) … 関数を選ぶボタンの列
 *   piTicks(g)                        … 横軸の目盛りを π/2 の倍数（TeX）で書く（sin のとき）
 *   axes(g, P, yStep)                 … 方眼と目盛り（P.pi なら π の目盛り、P.v は変数名 x / t）
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, H = PI / 2, TAU = 2 * PI;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const fmt = D.fmt;
  const snap = (v, s) => Math.round(v / s) * s;

  /* ---------- 小さな部品 ---------- */
  function chipRow(box, items, cur, onPick) {
    box.innerHTML = '';
    const btns = items.map(function (it, i) {
      const b = el('button', 'chip', it.tex ? '' : it.label);
      b.type = 'button';
      if (it.tex) { const s = el('span'); b.append(s); setTex(s, it.chip || it.tex); }
      b.addEventListener('click', () => { btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); onPick(it, i); });
      box.append(b);
      return b;
    });
    btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === cur)));
    return btns;
  }
  const PI_TEX = { 1: '\\frac{\\pi}{2}', 2: '\\pi', 3: '\\frac{3\\pi}{2}', 4: '2\\pi', '-1': '-\\frac{\\pi}{2}', '-2': '-\\pi' };
  // k·π/12 を約分した TeX
  function piFrac(k) {
    if (!k) return '0';
    const gcd = (a, b) => (b ? gcd(b, a % b) : a), g = gcd(Math.abs(k), 12), n = Math.abs(k) / g, d = 12 / g;
    return (k < 0 ? '-' : '') + (d === 1 ? (n === 1 ? '' : n) + '\\pi' : '\\frac{' + (n === 1 ? '' : n) + '\\pi}{' + d + '}');
  }
  function piTicks(g) {
    const c = g.c, y0 = g.ymin <= 0 && g.ymax >= 0 ? g.Y(0) : g.h - 16;
    let m = 1;
    while (g.pxPerX * H * m < 36) m *= 2;
    for (let i = Math.ceil(g.xmin / H); i * H <= g.xmax + 1e-9; i++) {
      if (!i || i % m || !PI_TEX[i]) continue;
      const px = g.X(i * H);
      if (px < 12 || px > g.w - 14) continue;
      g.texPx(PI_TEX[i], px, y0 + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
    }
  }
  // 方眼（P: { pi, v, sx, sy }）。yl は縦軸の名前
  function axes(g, P, yl, sy, labels) {
    const v = P.v || 'x';
    if (P.pi) {
      g.grid({ stepX: H, stepY: sy || 1, labels: false, xlabel: v, ylabel: yl });
      if (labels !== false) {
        piTicks(g);
        const x0 = g.X(0), c = g.c;
        for (let j = Math.ceil(g.ymin / (sy || 1)); j * (sy || 1) <= g.ymax + 1e-9; j++) {
          if (!j) continue;
          const py = g.Y(j * (sy || 1));
          if (py < 20 || py > g.h - 8) continue;
          g.texPx(num(j * (sy || 1), 2), x0 - 5, py, { align: 'right', size: 13, color: c.muted });
        }
      }
    } else g.grid({ stepX: P.sx || 1, stepY: sy || 1, labels: labels !== false, xlabel: v, ylabel: yl });
  }

  /* ==========================================================
     4.2(1) h を小さくしていく
     ========================================================== */
  function initDef() {
    const root = $id('w-def');
    const FNS = [
      { tex: 'y=x^2', chip: 'x^2', f: (x) => x * x, df: (x) => 2 * x, dtex: '2a', view: { xmin: -1.6, xmax: 3.6, ymin: -1.4, ymax: 9.5 }, amin: -1, amax: 2.2 },
      { tex: 'y=x^3', chip: 'x^3', f: (x) => x * x * x, df: (x) => 3 * x * x, dtex: '3a^2', view: { xmin: -2, xmax: 2.9, ymin: -4.5, ymax: 13 }, amin: -1.4, amax: 1.8 },
    ];
    const st = { fi: 0, a: 1, h: 1 };
    const F = () => FNS[st.fi];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.85, 0.5] }, F().view));
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\blue{a}', min: -1, max: 2.2, step: 0.1, value: 1, color: 'primary', aria: '点 A の x 座標 a' });
    const sh = slider(ctl, { tex: '\\red{h}', min: -1.5, max: 1.5, step: 0.001, value: 1, color: 'accent', aria: '横の増分 h', fmt: (v) => num(v, 3) });
    const setH = (v) => {
      v = clamp(v, -1.5, 1.5);
      if (Math.abs(v) < 0.001) v = (st.h < 0 ? -1 : 1) * 0.001;
      st.h = Math.round(v * 1000) / 1000; sh.set(st.h); update();
    };
    const setA = (v) => { const f = F(); st.a = clamp(Math.round(v * 10) / 10, f.amin, f.amax); sa.set(st.a); update(); };
    sa.on(setA);
    sh.on(setH);
    R(root, 'div10').addEventListener('click', () => setH(st.h / 10));
    R(root, 'half').addEventListener('click', () => setH(st.h / 2));
    R(root, 'neg').addEventListener('click', () => setH(-st.h));
    R(root, 'reset').addEventListener('click', () => setH(1));
    chipRow(R(root, 'fns'), FNS, 0, (it, i) => {
      st.fi = i; const f = F();
      sa.input.min = f.amin; sa.input.max = f.amax;
      plot.setView(f.view); setA(st.a);
    });
    plot.addHandle({ get x() { return st.a; }, get y() { return F().f(st.a); }, get color() { return plot.c ? plot.c.primary : '#36c'; }, r: 7,
      tex: '\\mathrm{A}', ldx: -12, ldy: -14, lalign: 'right', drag(x) { setA(x); } });
    plot.addHandle({ get x() { return st.a + st.h; }, get y() { return F().f(st.a + st.h); }, get color() { return plot.c ? plot.c.accent : '#d33'; }, r: 7,
      tex: '\\mathrm{B}', ldx: 12, ldy: 12, drag(x) { setH(Math.round((x - st.a) * 100) / 100); } });

    const tbody = R(root, 'tbody');
    const HS = [1, 0.1, 0.01, 0.001, -0.001, -0.01, -0.1, -1];
    function table() {
      const f = F(), a = st.a, fa = f.f(a);
      let s = '';
      HS.forEach(function (h) {
        const d = f.f(a + h) - fa, on = Math.abs(h - st.h) < 1e-9;
        s += '<tr' + (on ? ' class="on"' : '') + '><td>' + L.minus(num(h, 3)) + '</td><td>' + L.minus(fmt(d, 6)) + '</td><td>' + L.minus(fmt(d / h, 6)) + '</td></tr>';
      });
      s += '<tr class="lim"><td>h → 0</td><td>→ 0</td><td>→ ' + L.minus(fmt(f.df(a), 4)) + '</td></tr>';
      tbody.innerHTML = s;
    }
    function update() {
      const f = F(), a = st.a, h = st.h, fa = f.f(a), fb = f.f(a + h), m = (fb - fa) / h;
      const aT = num(a, 1), bT = num(a + h, 4), hT = num(h, 3);
      tex(root, 'slope', '\\dfrac{f(' + bT + ')-f(' + aT + ')}{' + '\\red{' + hT + '}}=\\dfrac{' + fmt(fb - fa, 6) + '}{\\red{' + hT + '}}=\\red{' + fmt(m, 6) + '}');
      const aP = a < 0 ? '(' + aT + ')' : aT;
      tex(root, 'tan', "\\teal{f'(" + aT + ')}=' + (st.fi ? '3\\cdot' + aP + '^2' : '2\\cdot' + aP) + '=\\teal{' + fmt(f.df(a), 4) + '}');
      table();
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, f = F(), a = st.a, h = st.h, fa = f.f(a), fb = f.f(a + h);
      g.grid({ step: 1, stepY: st.fi ? 2 : 1, xlabel: 'x', ylabel: 'y' });
      // A, B から x 軸への点線
      g.line(a, 0, a, fa, { color: c.muted, width: 1, dash: [3, 4] });
      g.line(a + h, 0, a + h, fb, { color: c.muted, width: 1, dash: [3, 4] });
      D.curve(g, f.f, { color: c.primary, width: 3.5 });
      D.tangent(g, f.f, a, { df: f.df, dash: [7, 6], width: 2, point: false });
      D.secant(g, f.f, a, h, { points: false, width: 2.5 });
      // h と縦の増え方のラベル
      const wpx = Math.abs(g.X(a + h) - g.X(a)), hpx = Math.abs(g.Y(fb) - g.Y(fa));
      if (wpx > 16) g.tex('h', a + h / 2, fa, { color: c.accent, size: 15, align: 'center', valign: 'top', dy: 3 });
      if (hpx > 30 && wpx > 16) g.tex('f(a+h)-f(a)', a + h, (fa + fb) / 2, { color: c.accent, size: 13, align: h > 0 ? 'left' : 'right', dx: h > 0 ? 6 : -6, avoid: true });
      // 横軸の a と a+h
      g.tex('a', a, 0, { color: c.primary, size: 14, align: 'center', valign: 'top', dy: 16 });
      if (wpx > 40) g.tex('a+h', a + h, 0, { color: c.accent, size: 14, align: 'center', valign: 'top', dy: 16 });
      g.tex(f.tex, g.xmax - 0.1, f.f(g.xmax - 0.6) > g.ymax - 0.5 ? g.ymax - (g.ymax - g.ymin) * 0.06 : f.f(g.xmax - 0.6), { color: c.primary, size: 15, align: 'right', valign: 'top', dx: -26, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.2(4) 導関数：傾きを並べたグラフ
     ========================================================== */
  const DERIV = [
    { label: 'x²', chip: 'x^2', tex: 'x^2', dtex: '2x', f: (x) => x * x, df: (x) => 2 * x,
      x: [-3, 3], y: [-1.5, 7.5], dy: [-6.5, 6.5], sy: 2, dsy: 2, snap: 0.05, x0: -2 },
    { label: 'x³−3x', chip: 'x^3-3x', tex: 'x^3-3x', dtex: '3x^2-3', f: (x) => x * x * x - 3 * x, df: (x) => 3 * x * x - 3,
      x: [-2.5, 2.5], y: [-4.2, 4.2], dy: [-4.5, 10.5], sy: 2, dsy: 3, snap: 0.05, x0: -2 },
    { label: 'smoothstep', chip: '3t^2-2t^3', tex: '3t^2-2t^3', dtex: '6t-6t^2', v: 't', f: (t) => 3 * t * t - 2 * t * t * t, df: (t) => 6 * t - 6 * t * t,
      x: [-0.3, 1.3], y: [-0.35, 1.35], dy: [-0.9, 1.95], sx: 0.25, sy: 0.5, dsy: 0.5, snap: 0.025, x0: 0, wx: [0, 1] },
    { label: 'sin x', chip: '\\sin x', tex: '\\sin x', dtex: '\\cos x', pi: true, f: Math.sin, df: Math.cos,
      x: [-0.5, TAU + 0.5], y: [-1.6, 1.6], dy: [-1.6, 1.6], sy: 1, dsy: 1, snap: PI / 24, x0: 0 },
  ];
  function initDeriv() {
    const root = $id('w-deriv');
    const cvs = root.querySelectorAll('canvas');
    const pf = new Plot(cvs[0], { xmin: -3, xmax: 3, ymin: -1, ymax: 7, ratio: [0.62, 0.34] });
    const pd = new Plot(cvs[1], { xmin: -3, xmax: 3, ymin: -6, ymax: 6, ratio: [0.62, 0.34] });
    const st = { k: 0, x: -2, trace: new Map(), all: false, play: false };
    const P = () => DERIV[st.k];
    const N = 240;
    const range = () => { const p = P(); return p.wx ? [p.wx[0] - 0.2, p.wx[1] + 0.2] : [p.x[0] + 0.05, p.x[1] - 0.05]; };
    const sx = slider(root.querySelector('.controls'), { tex: '\\teal{x}', min: -2.9, max: 2.9, step: 0.05, value: -2, color: 'teal', aria: '接点の x 座標', fmt: (v) => num(v, 2) });
    sx.on((v) => { stop(); setX(v); });
    function record(x) { const p = P(); st.trace.set(Math.round((x - p.x[0]) / (p.x[1] - p.x[0]) * N), x); }
    function setX(x) {
      const p = P(), lo = p.wx ? p.wx[0] - 0.2 : p.x[0] + 0.05, hi = p.wx ? p.wx[1] + 0.2 : p.x[1] - 0.05;
      st.x = clamp(snap(x, p.snap), lo, hi);
      record(st.x); update();
    }
    function setK(k) {
      st.k = k; const p = P(), rg = range();
      sx.input.min = rg[0]; sx.input.max = rg[1]; sx.input.step = p.snap;
      pf.setView({ xmin: p.x[0], xmax: p.x[1], ymin: p.y[0], ymax: p.y[1] });
      pd.setView({ xmin: p.x[0], xmax: p.x[1], ymin: p.dy[0], ymax: p.dy[1] });
      st.trace = new Map(); st.play = false; showPlay();
      st.x = p.x0; record(st.x); update();
    }
    chipRow(R(root, 'fns'), DERIV.map((p) => ({ tex: p.chip })), 0, (it, i) => setK(i));
    const bPlay = R(root, 'play');
    const showPlay = () => { bPlay.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    const stop = () => { if (st.play) { st.play = false; showPlay(); } };
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      const p = P(), lo = p.wx ? p.wx[0] - 0.2 : p.x[0] + 0.05, hi = p.wx ? p.wx[1] + 0.2 : p.x[1] - 0.05;
      const nx = st.x + dt * (hi - lo) / 5;
      if (nx >= hi) { st.x = hi; st.play = false; showPlay(); }
      else st.x = nx;
      // とばした所も記録する
      for (let t = 0; t <= 4; t++) record(st.x - (hi - lo) / 5 * dt * t / 4);
      update();
      return st.play;
    });
    bPlay.addEventListener('click', () => {
      const p = P(), lo = p.wx ? p.wx[0] - 0.2 : p.x[0] + 0.05, hi = p.wx ? p.wx[1] + 0.2 : p.x[1] - 0.05;
      st.play = !st.play;
      if (st.play && st.x >= hi - 1e-6) st.x = lo;
      showPlay(); if (st.play) anim.kick();
    });
    R(root, 'clear').addEventListener('click', () => { st.trace = new Map(); record(st.x); update(); });
    R(root, 'all').addEventListener('change', (e) => { st.all = e.target.checked; update(); });
    pf.addHandle({ get x() { return st.x; }, get y() { return P().f(st.x); }, get color() { return pf.c ? pf.c.teal : '#198'; }, r: 8,
      drag(x) { stop(); setX(x); } });
    pd.addHandle({ get x() { return st.x; }, get y() { return P().df(st.x); }, get color() { return pd.c ? pd.c.amber : '#c80'; }, r: 7,
      drag(x) { stop(); setX(x); } });
    const xTeX = (x) => {
      const p = P();
      if (p.pi) { const k = Math.round(x / (PI / 24)); if (Math.abs(x - k * PI / 24) < 1e-9 && k % 2 === 0) return piFrac(k / 2); }
      return num(x, 2);
    };
    function update() {
      const p = P(), v = p.v || 'x', x = st.x, m = p.df(x);
      sx.set(x);
      const fT = p.tex, dT = st.all ? p.dtex : '?';
      tex(root, 'eq', '\\blue{f(' + v + ')=' + fT + '},\\quad \\amber{f\'(' + v + ')=' + dT + '}');
      tex(root, 'val', '\\amber{f\'(' + xTeX(x) + ')}' + (Math.abs(m - Math.round(m * 100) / 100) < 1e-9 ? '=' : '\\approx') + '\\amber{' + fmt(m, 2) + '}');
      const how = R(root, 'how');
      how.innerHTML = Math.abs(m) < 0.02
        ? '<b>接線が水平</b>：傾きは $0$ → 金色の点は<b>横軸の上</b>（山の頂上・谷の底など）'
        : m > 0 ? '<b>上り坂</b>：傾きはプラス → 金色の点は<b>横軸より上</b>'
          : '<b>下り坂</b>：傾きはマイナス → 金色の点は<b>横軸より下</b>';
      typeset(how);
      pf.invalidate(); pd.invalidate();
    }
    pf.draw = function (g) {
      const c = g.c, p = P(), x = st.x, v = p.v || 'x';
      axes(g, p, 'y', p.sy);
      if (p.wx) [p.wx[0], p.wx[1]].forEach((t) => g.line(t, g.ymin, t, g.ymax, { color: c.muted, width: 1, dash: [3, 5], alpha: 0.6 }));
      g.line(x, g.ymin, x, g.ymax, { color: c.muted, width: 1.2, dash: [4, 4] });
      D.curve(g, p.f, { color: c.primary, width: 3.5 });
      D.tangent(g, p.f, x, { df: p.df, width: 2.5, point: false });
      g.tex('y=f(' + v + ')', g.xmax, g.ymax, { color: c.primary, size: 14, align: 'right', valign: 'top', dx: -8, dy: 6 });
    };
    pd.draw = function (g) {
      const c = g.c, p = P(), x = st.x, v = p.v || 'x';
      axes(g, p, "y", p.dsy);
      if (p.wx) [p.wx[0], p.wx[1]].forEach((t) => g.line(t, g.ymin, t, g.ymax, { color: c.muted, width: 1, dash: [3, 5], alpha: 0.6 }));
      g.line(x, g.ymin, x, g.ymax, { color: c.muted, width: 1.2, dash: [4, 4] });
      if (st.all) D.curve(g, p.df, { color: c.amber, width: 2.5, alpha: 0.55 });
      st.trace.forEach((tx) => g.dot(tx, p.df(tx), { r: 2.8, color: c.amber, stroke: false }));
      g.line(x, 0, x, p.df(x), { color: c.amber, width: 3 });
      g.tex("y=f'(" + v + ')', g.xmax, g.ymax, { color: c.amber, size: 14, align: 'right', valign: 'top', dx: -8, dy: 6 });
    };
    setK(0);
  }

  /* ==========================================================
     4.2(5) 速さを指定してイージングを作る（1.4節）
     ========================================================== */
  function initEase() {
    const root = $id('w-ease');
    const cvs = root.querySelectorAll('canvas');
    const pf = new Plot(cvs[0], { xmin: -0.12, xmax: 1.12, ymin: -0.25, ymax: 1.3, height: (w) => clamp(w * 0.5, 190, 300) });
    const pv = new Plot(cvs[1], { xmin: -0.12, xmax: 1.12, ymin: -1, ymax: 3.4, height: (w) => clamp(w * 0.38, 150, 240) });
    const pm = new Plot(cvs[2], { xmin: -0.12, xmax: 1.12, ymin: -0.6, ymax: 1.9, height: () => 120 });
    const st = { v0: 0, v1: 0, t: 0.5, play: false };
    const ctl = root.querySelector('.controls');
    const s0 = slider(ctl, { tex: '\\amber{v_0}', min: 0, max: 3, step: 0.5, value: 0, color: 'amber', aria: '出だしの速さ v0' });
    const s1 = slider(ctl, { tex: '\\teal{v_1}', min: 0, max: 3, step: 0.5, value: 0, color: 'teal', aria: '終わりの速さ v1' });
    s0.on((v) => { st.v0 = v; update(); });
    s1.on((v) => { st.v1 = v; update(); });
    const PRE = [{ label: 'smoothstep', v: [0, 0] }, { label: '等速', v: [1, 1] }, { label: 'ゆっくり止まる', v: [2, 0] }, { label: 'ゆっくり出る', v: [0, 2] }];
    const chips = chipRow(R(root, 'pre'), PRE, 0, (it) => { st.v0 = it.v[0]; st.v1 = it.v[1]; s0.set(st.v0); s1.set(st.v1); update(); });
    const co = () => ({ p: st.v0 + st.v1 - 2, q: 3 - 2 * st.v0 - st.v1, r: st.v0 });
    const f = (t) => { const k = co(); return ((k.p * t + k.q) * t + k.r) * t; };
    const df = (t) => { const k = co(); return (3 * k.p * t + 2 * k.q) * t + k.r; };
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt * 0.5;
      if (st.t > 1.4) st.t = -0.2;
      draw();
      return true;
    });
    const bP = R(root, 'play');
    const showPlay = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    bP.addEventListener('click', () => { st.play = !st.play; if (st.play && st.t >= 1) st.t = -0.2; showPlay(); if (st.play) anim.kick(); });
    const tc = () => clamp(st.t, 0, 1);
    const term = (a, pw, first) => { if (Math.abs(a) < 1e-9) return ''; const sg = a < 0 ? '-' : first ? '' : '+', m = Math.abs(a); return sg + (Math.abs(m - 1) < 1e-9 && pw ? '' : fmt(m, 2)) + (pw ? 't' + (pw > 1 ? '^' + pw : '') : ''); };
    const poly = (cs) => { let out = '', first = true; cs.forEach((c) => { const t = term(c[0], c[1], first); if (t) { out += t; first = false; } }); return out || '0'; };
    function update() {
      const k = co();
      chips.forEach((b, i) => b.setAttribute('aria-pressed', String(PRE[i].v[0] === st.v0 && PRE[i].v[1] === st.v1)));
      tex(root, 'f', '\\blue{f(t)}=' + poly([[k.p, 3], [k.q, 2], [k.r, 1]]));
      tex(root, 'df', "\\amber{f'(t)}=" + poly([[3 * k.p, 2], [2 * k.q, 1], [k.r, 0]]) + ",\\quad f'(0)=\\amber{" + fmt(st.v0, 1) + "},\\ f'(1)=\\teal{" + fmt(st.v1, 1) + '}');
      draw();
    }
    function draw() {
      const t = tc();
      tex(root, 'now', 't=' + fmt(t, 2) + ',\\quad f(t)=' + fmt(f(t), 2) + ",\\quad f'(t)=" + fmt(df(t), 2));
      pf.invalidate(); pv.invalidate(); pm.invalidate();
    }
    pf.draw = function (g) {
      const c = g.c, t = tc();
      axes(g, { v: 't', sx: 0.25 }, 'f(t)', 0.5);
      g.line(0, 0, 1, 1, { color: c.muted, width: 1.5, dash: [5, 5] });
      g.line(-0.12, -0.12 * st.v0, 0.3, 0.3 * st.v0, { color: c.amber, width: 3 });
      g.line(0.7, 1 - 0.3 * st.v1, 1.12, 1 + 0.12 * st.v1, { color: c.teal, width: 3 });
      D.curve(g, f, { x0: 0, x1: 1 });
      g.dot(0, 0, { r: 5, color: c.amber }); g.dot(1, 1, { r: 5, color: c.teal });
      g.tex("\\text{傾き }\\amber{v_0}", 0.3, 0.3 * st.v0, { dx: 4, dy: 12, align: 'left', size: 13, color: c.amber, avoid: true });
      g.tex("\\text{傾き }\\teal{v_1}", 0.7, 1 - 0.3 * st.v1, { dx: -4, dy: -12, align: 'right', size: 13, color: c.teal, avoid: true });
      g.dot(t, f(t), { r: 6, color: c.primary });
    };
    pv.draw = function (g) {
      const c = g.c, t = tc();
      axes(g, { v: 't', sx: 0.25 }, "f'(t)", 1);
      g.line(0, 1, 1, 1, { color: c.muted, width: 1.5, dash: [5, 5] });
      D.curve(g, df, { x0: 0, x1: 1, color: c.amber });
      g.dot(0, st.v0, { r: 5, color: c.amber }); g.dot(1, st.v1, { r: 5, color: c.teal });
      g.line(t, 0, t, df(t), { color: c.amber, width: 1.2, dash: [3, 4] });
      g.dot(t, df(t), { r: 5.5, color: c.amber });
      g.tex('\\text{等速}=1', 1, 1, { dx: -4, dy: -10, align: 'right', size: 12, color: c.muted, avoid: true });
    };
    pm.draw = function (g) {
      const c = g.c, t = tc();
      g.line(0, 1, 1, 1, { color: c.grid, width: 6 });
      g.line(0, 0, 1, 0, { color: c.grid, width: 6 });
      [0, 1].forEach((x) => { g.line(x, -0.3, x, 1.3, { color: c.muted, width: 1.2 }); });
      g.tex('0', 0, -0.3, { dy: 2, align: 'center', valign: 'top', size: 12, color: c.muted });
      g.tex('1', 1, -0.3, { dy: 2, align: 'center', valign: 'top', size: 12, color: c.muted });
      g.dot(f(t), 1, { r: 9, color: c.primary });
      g.dot(t, 0, { r: 7, color: c.muted });
      g.texPx('\\blue{\\text{イージング}}', 6, g.Y(1) - 12, { align: 'left', valign: 'bottom', size: 12 });
      g.texPx('\\text{等速}', 6, g.Y(0) - 10, { align: 'left', valign: 'bottom', size: 12, color: c.muted });
    };
    update();
  }

  /* ==========================================================
     4.2(5) 接線の式
     ========================================================== */
  function initTanLine() {
    const root = $id('w-tanline');
    const FNS = [
      { chip: 'x^2', tex: 'x^2', dtex: '2x', f: (x) => x * x, df: (x) => 2 * x, view: { xmin: -3.2, xmax: 3.2, ymin: -2.5, ymax: 8 }, a: 1, lim: [-2.5, 2.5], sy: 1 },
      { chip: 'x^3', tex: 'x^3', dtex: '3x^2', f: (x) => x * x * x, df: (x) => 3 * x * x, view: { xmin: -2.6, xmax: 2.6, ymin: -6, ymax: 6 }, a: 1, lim: [-1.8, 1.8], sy: 2 },
      { chip: 'x^3-3x', tex: 'x^3-3x', dtex: '3x^2-3', f: (x) => x * x * x - 3 * x, df: (x) => 3 * x * x - 3, view: { xmin: -2.8, xmax: 2.8, ymin: -5, ymax: 5 }, a: 0, lim: [-2.2, 2.2], sy: 1 },
    ];
    const st = { k: 0, a: 1 };
    const F = () => FNS[st.k];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.85, 0.5] }, F().view));
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\teal{a}', min: -2.5, max: 2.5, step: 0.1, value: 1, color: 'teal', aria: '接点の x 座標 a' });
    const setA = (v) => { const f = F(); st.a = clamp(Math.round(v * 10) / 10, f.lim[0], f.lim[1]); sa.set(st.a); update(); };
    sa.on(setA);
    chipRow(R(root, 'fns'), FNS, 0, (it, i) => {
      st.k = i; const f = F();
      sa.input.min = f.lim[0]; sa.input.max = f.lim[1];
      plot.setView(f.view); setA(f.a);
    });
    plot.addHandle({ get x() { return st.a; }, get y() { return F().f(st.a); }, get color() { return plot.c ? plot.c.teal : '#198'; }, r: 8,
      drag(x) { setA(x); } });
    const n = (v) => num(v, 3);
    const par = (v) => (v < 0 ? '(' + n(v) + ')' : n(v));
    const minus = (s, v) => (Math.abs(v) < 1e-9 ? s : s + (v > 0 ? '-' + n(v) : '+' + n(-v)));
    function update() {
      const f = F(), a = st.a, fa = f.f(a), m = f.df(a), b = fa - m * a;
      const sub = (t) => t.replace(/(\d)x/g, '$1\\cdot x').replace(/x/g, par(a));
      tex(root, 'pt', '\\begin{aligned}&f(' + n(a) + ')=' + sub(f.tex) + '=' + n(fa) + '\\\\&\\text{接点 }(' + n(a) + ',\\ ' + n(fa) + ')\\end{aligned}');
      tex(root, 'm', "\\begin{aligned}&f'(x)=" + f.dtex + '\\\\&f\'(' + n(a) + ')=' + sub(f.dtex) + '=\\teal{' + n(m) + '}\\end{aligned}');
      const lhs = minus('y', fa), xa = minus('x', a);
      let rhs;
      if (Math.abs(m) < 1e-9) rhs = '0';
      else if (Math.abs(a) < 1e-9) rhs = (Math.abs(m - 1) < 1e-9 ? '' : Math.abs(m + 1) < 1e-9 ? '-' : n(m)) + 'x';
      else rhs = (Math.abs(m - 1) < 1e-9 ? '' : Math.abs(m + 1) < 1e-9 ? '-' : n(m)) + '(' + xa + ')';
      let mx = Math.abs(m) < 1e-9 ? '' : Math.abs(m - 1) < 1e-9 ? 'x' : Math.abs(m + 1) < 1e-9 ? '-x' : n(m) + 'x';
      let bb = Math.abs(b) < 1e-9 ? '' : (mx ? (b > 0 ? '+' + n(b) : '-' + n(-b)) : n(b));
      if (!mx && !bb) bb = '0';
      tex(root, 'eq', '\\begin{aligned}&' + lhs + '=' + rhs + '\\\\&\\teal{y=' + mx + bb + '}\\end{aligned}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, f = F(), a = st.a;
      g.grid({ step: 1, stepY: f.sy, xlabel: 'x', ylabel: 'y' });
      g.line(a, 0, a, f.f(a), { color: c.muted, width: 1, dash: [3, 4] });
      D.curve(g, f.f, { color: c.primary, width: 3.5 });
      D.tangent(g, f.f, a, { df: f.df, width: 3, point: false });
      g.tex('y=' + f.tex, g.xmax, g.ymin, { color: c.primary, size: 15, align: 'right', valign: 'bottom', dx: -8, dy: -6 });
    };
    update();
  }

  /* ==========================================================
     4.2(7) チャレンジ：傾きのグラフを描け
     ========================================================== */
  const KANA = ['ア', 'イ', 'ウ', 'エ'];
  const SLOPE_STAGES = [
    { name: '放物線', ftex: 'x^2', f: (x) => x * x, df: (x) => 2 * x, x: [-2.6, 2.6], y: [-0.8, 6.2], dy: [-5.6, 5.6], sy: 2, snap: 0.1, x0: -1.5,
      opts: [() => 2, (x) => 2 * x, (x) => -2 * x, (x) => x * x], ok: 1,
      text: '放物線 $y=f(x)$ の導関数 $y=f\'(x)$ のグラフはどれ？',
      hint: '左半分は下り坂、右半分は上り坂、$x=0$（谷の底）で水平です。$f\'$ は左でマイナス、右でプラス、$x=0$ で $0$ のはず。',
      answer: '<b>（イ）</b>　$f(x)=x^2$ なので $f\'(x)=2x$（原点を通る右上がりの直線）。<br>左半分（$x\\lt0$）は下り坂なので $f\'\\lt0$、右半分は上り坂なので $f\'\\gt0$、谷の底 $x=0$ で $f\'=0$。（ア）はいつも $2$、（ウ）は符号が逆、（エ）は $f$ そのもの。' },
    { name: '山と谷', ftex: 'x^3-3x', f: (x) => x * x * x - 3 * x, df: (x) => 3 * x * x - 3, x: [-2.4, 2.4], y: [-4, 4], dy: [-4.5, 9], sy: 2, dsy: 3, snap: 0.1, x0: -2,
      opts: [(x) => 3 - 3 * x * x, (x) => x * x * x - 3 * x, (x) => 3 * x * x - 3, (x) => 3 * x * x], ok: 2,
      text: '山と谷が1つずつある3次関数。$f\'$ のグラフはどれ？',
      hint: '山の頂上と谷の底の $x$ 座標（$x=-1$ と $x=1$）で $f\'=0$。その間は下り坂、外側は上り坂です。',
      answer: '<b>（ウ）</b>　$f(x)=x^3-3x$ なので $f\'(x)=3x^2-3=3(x+1)(x-1)$。<br>山 $x=-1$ と谷 $x=1$ で $f\'=0$、その間 $(-1\\lt x\\lt1)$ は下り坂で $f\'\\lt0$、外側は上り坂で $f\'\\gt0$。下に凸の放物線になる。（ア）は符号が逆、（イ）は $f$ そのもの、（エ）は $x=0$ でしか $0$ にならない。' },
    { name: 'smoothstep', ftex: '3t^2-2t^3', v: 't', f: (t) => 3 * t * t - 2 * t * t * t, df: (t) => 6 * t - 6 * t * t, x: [-0.15, 1.15], y: [-0.2, 1.2], dy: [-1.7, 1.9], sx: 0.5, sy: 0.5, dsy: 0.5, snap: 0.05, x0: 0.2, wx: [0, 1],
      opts: [(t) => 6 * t - 6 * t * t, (t) => 6 * t * t - 6 * t, (t) => 3 * t * t - 2 * t * t * t, () => 1], ok: 0,
      text: '1.4節の smoothstep（$0\\leqq t\\leqq1$ の部分を見る）。速さ $f\'(t)$ のグラフはどれ？',
      hint: '$t=0$ と $t=1$ ではグラフが水平（ゆっくり動き出して、ゆっくり止まる）。その間はずっと上り坂です。',
      answer: '<b>（ア）</b>　$f(t)=3t^2-2t^3$ なので $f\'(t)=6t-6t^2=6t(1-t)$。<br>$t=0,\\ 1$ で $f\'=0$（水平）、間はずっと上り坂なので $f\'\\gt0$、まん中 $t=\\frac12$ で最大 $\\frac32$。（イ）は符号が逆、（ウ）は $f$ そのもの（$t=1$ で $1$ になってしまう）、（エ）は等速（速さがいつも $1$）。' },
    { name: '波', ftex: '\\sin x', pi: true, f: Math.sin, df: Math.cos, x: [-0.4, TAU + 0.4], y: [-1.5, 1.5], dy: [-1.5, 1.5], sy: 1, dsy: 1, snap: PI / 24, x0: PI / 4,
      opts: [(x) => -Math.sin(x), Math.sin, (x) => -Math.cos(x), Math.cos], ok: 3,
      text: '波 $y=\\sin x$。傾きのグラフはどれ？',
      hint: '$x=0$ では急な上り坂、山の頂上 $x=\\frac{\\pi}{2}$ で水平、$x=\\pi$ では急な下り坂です。$x=0$ での $f\'$ はプラスで大きいはず。',
      answer: '<b>（エ）</b>　$x=0$ で傾き $1$（いちばん急な上り）、$x=\\frac{\\pi}{2}$（山）で $0$、$x=\\pi$ で $-1$（いちばん急な下り）、$x=\\frac{3\\pi}{2}$（谷）で $0$。これを並べると $\\cos x$ の形になる（$(\\sin x)\'=\\cos x$、4.3節）。（ア）は $x=0$ で $0$、（イ）は $f$ そのもの、（ウ）は符号が逆。' },
    { name: 'W の形', ftex: '\\frac{x^4}{4}-x^2', f: (x) => x ** 4 / 4 - x * x, df: (x) => x ** 3 - 2 * x, x: [-2.3, 2.3], y: [-1.5, 2], dy: [-4.5, 4.5], sy: 1, dsy: 2, snap: 0.1, x0: -2,
      opts: [(x) => x * x - 2, (x) => x ** 3 - 2 * x, (x) => 2 * x - x ** 3, (x) => x ** 3], ok: 1,
      text: '谷が2つ、山が1つの W の形。$f\'$ のグラフはどれ？',
      hint: '$f\'=0$ になるのは、谷の底2つと山の頂上1つの、合わせて3か所です。左から順に、下り坂・上り坂・下り坂・上り坂。',
      answer: '<b>（イ）</b>　$f(x)=\\frac{x^4}{4}-x^2$ なので $f\'(x)=x^3-2x=x(x^2-2)$。<br>$x=-\\sqrt2$（谷）、$0$（山）、$\\sqrt2$（谷）の3か所で $f\'=0$。左から 下り（$f\'\\lt0$）→ 上り（$\\gt0$）→ 下り（$\\lt0$）→ 上り（$\\gt0$）。（ア）は $0$ が2か所しかない、（ウ）は符号が逆、（エ）は $x=0$ でしか $0$ にならない。' },
  ];
  function initGameSlope() {
    const root = $id('w-game-slope');
    const top = new Plot(root.querySelector('.stage canvas'), { xmin: -2.6, xmax: 2.6, ymin: -1, ymax: 6, ratio: [0.62, 0.36] });
    const box = R(root, 'opts');
    const cards = [], minis = [];
    const st = { sel: -1, x: 0, mark: null };
    let game = null;
    const S = () => SLOPE_STAGES[game ? game.k : 0];
    KANA.forEach(function (k, i) {
      const b = el('button', 'opt-card');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', '（' + k + '）のグラフを選ぶ');
      b.innerHTML = '<span class="opt-lab">（' + k + '）</span><div class="stage"><canvas></canvas></div>';
      box.append(b);
      cards.push(b);
      const pl = new Plot(b.querySelector('canvas'), { xmin: -2.6, xmax: 2.6, ymin: -5, ymax: 5, height: (w) => clamp(w * 0.62, 110, 170) });
      pl.draw = function (g) {
        const c = g.c, s = S();
        axes(g, s, '', s.dsy || s.sy, false);
        if (s.wx) [s.wx[0], s.wx[1]].forEach((t) => g.line(t, g.ymin, t, g.ymax, { color: c.muted, width: 1, dash: [3, 5], alpha: 0.6 }));
        D.curve(g, s.opts[i], { color: c.amber, width: 3 });
        if (st.mark != null && st.mark.i === i) {
          g.line(st.mark.x, g.ymin, st.mark.x, g.ymax, { color: c.accent, width: 1.2, dash: [4, 4] });
          g.dot(st.mark.x, s.opts[i](st.mark.x), { r: 5.5, color: c.accent });
        }
      };
      minis.push(pl);
      b.addEventListener('click', function () {
        if (game.done || b.disabled) return;
        st.sel = i;
        cards.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
        game.formula();
      });
    });
    top.addHandle({ get x() { return st.x; }, get y() { return S().f(st.x); }, get color() { return top.c ? top.c.teal : '#198'; }, r: 8,
      drag(x) { const s = S(); const lo = s.wx ? s.wx[0] : s.x[0] + 0.1, hi = s.wx ? s.wx[1] : s.x[1] - 0.1; st.x = clamp(snap(x, s.snap), lo, hi); game.formula(); } });
    const ctl = root.querySelector('.controls');
    const B = L.game.gameButtons(ctl, '✅ 判定');
    const conf = L.game.Confetti(root, top);
    const xTeX = (s, x) => {
      if (s.pi) { const k = Math.round(x / (PI / 12)); if (Math.abs(x - k * PI / 12) < 1e-6) return piFrac(k); }
      return num(x, 2);
    };
    game = L.game.GameShell(root, { key: '4-2:game', stages: SLOPE_STAGES, idle: 'グラフを選んで「判定」を押そう',
      formula: function () {
        const s = S(), v = s.v || 'x', m = s.df(st.x);
        return '\\begin{aligned}&\\blue{f(' + v + ')=' + s.ftex + '}\\qquad\\text{選択：}' + (st.sel < 0 ? '\\text{まだ}' : '\\text{（' + KANA[st.sel] + '）}') +
          '\\\\&\\teal{\\text{緑の点の傾き}}\\ ' + "f'(" + xTeX(s, st.x) + ')' + (Math.abs(m - Math.round(m * 100) / 100) < 1e-9 ? '=' : '\\approx') + fmt(m, 2) + '\\end{aligned}';
      },
      onStage(k, s) {
        st.sel = -1; st.mark = null; st.x = s.x0;
        top.setView({ xmin: s.x[0], xmax: s.x[1], ymin: s.y[0], ymax: s.y[1] });
        minis.forEach((p) => p.setView({ xmin: s.x[0], xmax: s.x[1], ymin: s.dy[0], ymax: s.dy[1] }));
        cards.forEach((b) => { b.disabled = false; b.classList.remove('ok', 'ng'); b.setAttribute('aria-pressed', 'false'); });
        B.bMain.disabled = false; B.bNext.hidden = true;
        typeset(R(root, 'mission'));
        top.invalidate();
      } });
    // まちがいの理由：f' と選んだグラフの符号（＋・0・−）がちがう x を探す
    function witness(s, g) {
      const lo = s.wx ? s.wx[0] : s.x[0] + (s.x[1] - s.x[0]) * 0.06, hi = s.wx ? s.wx[1] : s.x[1] - (s.x[1] - s.x[0]) * 0.06;
      let mx = 0;
      for (let i = 0; i <= 200; i++) mx = Math.max(mx, Math.abs(s.df(lo + (hi - lo) * i / 200)));
      const tol = 0.05 * mx, cat = (v) => (v > tol ? 1 : v < -tol ? -1 : 0);
      // 符号が正反対の所を優先、なければ「0 かどうか」がちがう所
      let best = null, bs = -1;
      for (let i = 0; i <= 200; i++) {
        const x = lo + (hi - lo) * i / 200, a = s.df(x), b = g(x), ca = cat(a), cb = cat(b);
        if (ca === cb) continue;
        const sc = ca * cb < 0 ? 10 - Math.abs(Math.abs(a) / mx - 0.6) : ca === 0 ? 5 - Math.abs(a) / mx : 2 - Math.abs(Math.abs(a) / mx - 0.6);
        if (sc > bs) { bs = sc; best = { x, ca, cb }; }
      }
      if (!best) return null;
      // きりのよい値に丸めても同じ理由がつくなら丸める
      const steps = s.pi ? [PI / 4, PI / 6, PI / 12] : s.wx ? [0.25, 0.1, 0.05] : [0.5, 0.1];
      for (const step of steps) {
        const xr = snap(best.x, step);
        if (xr >= lo - 1e-9 && xr <= hi + 1e-9 && cat(s.df(xr)) === best.ca && cat(g(xr)) === best.cb) { best.x = xr; break; }
      }
      return best;
    }
    const WHY = { 1: '$f$ が上り坂なので $f\'\\gt0$ のはず', '-1': '$f$ が下り坂なので $f\'\\lt0$ のはず', 0: 'グラフが水平なので $f\'=0$ のはず' };
    const SAY = { 1: 'プラス', '-1': 'マイナス', 0: '$0$' };
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const s = S();
      if (st.sel < 0) { game.result('先に（ア）〜（エ）からグラフを1つ選ぼう', 'miss'); return; }
      game.used++; game.renderThrows();
      const i = st.sel;
      if (i === s.ok) {
        const n = 4 - game.used; game.award(n); game.done = true; st.mark = null;
        cards[i].classList.add('ok');
        game.result('🎉 正解！ ' + L.game.starStr(n) + '（' + game.used + ' 回目）', 'hit');
        B.bMain.disabled = true; B.bNext.hidden = game.k >= SLOPE_STAGES.length - 1;
        conf.fire(top.w / 2, top.h / 3);
      } else {
        cards[i].classList.add('ng'); cards[i].disabled = true; cards[i].setAttribute('aria-pressed', 'false');
        const w = witness(s, s.opts[i]);
        let m = '✗ （' + KANA[i] + '）ではありません。';
        if (w) {
          const v = s.v || 'x';
          st.mark = { i, x: w.x }; st.x = w.x;
          m += '$' + v + '=' + xTeX(s, w.x) + '$ のところでは、' + WHY[w.ca] + '。でも（' + KANA[i] + '）はそこで ' + SAY[w.cb] + '。';
        }
        st.sel = -1;
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; game.done = true; }
        game.result(m, 'miss');
      }
      game.formula();
      top.invalidate(); minis.forEach((p) => p.invalidate());
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, SLOPE_STAGES.length - 1)));
    top.draw = function (g) {
      const c = g.c, s = S(), x = st.x;
      axes(g, s, 'y', s.sy);
      if (s.wx) [s.wx[0], s.wx[1]].forEach((t) => g.line(t, g.ymin, t, g.ymax, { color: c.muted, width: 1, dash: [3, 5], alpha: 0.6 }));
      D.curve(g, s.f, { color: c.primary, width: 3.5 });
      D.tangent(g, s.f, x, { df: s.df, width: 2.2, point: false });
      g.texPx('\\text{緑の点をドラッグ}', g.w - 10, 8, { align: 'right', valign: 'top', size: 13, color: c.teal });
      conf.draw(g);
    };
    const origSet = game.setStage;
    game.setStage = function (k) { origSet(k); minis.forEach((p) => p.invalidate()); };
    game.setStage(0);
  }

  /* ==========================================================
     確認問題の答えのグラフ
     ========================================================== */
  function initQuizFigs() {
    document.querySelectorAll('#check canvas[data-q]').forEach(function (cv) {
      const q = cv.dataset.q;
      const V = q === '3' ? { xmin: -1.6, xmax: 5, ymin: -3, ymax: 10 } : { xmin: -0.15, xmax: 1.15, ymin: -0.25, ymax: 1.95 };
      const plot = new Plot(cv, Object.assign({ height: (w) => clamp(w * 0.5, 170, 280) }, V));
      plot.draw = function (g) {
        const c = g.c;
        if (q === '3') {
          g.grid({ step: 1, stepY: 2, xlabel: 'x', ylabel: 'y' });
          D.curve(g, (x) => x * x - 2 * x, { color: c.primary, width: 3 });
          g.line(g.xmin, 4 * g.xmin - 9, g.xmax, 4 * g.xmax - 9, { color: c.teal, width: 2.5 });
          g.dot(3, 3, { r: 5.5, color: c.teal });
          g.tex('(3,\\ 3)', 3, 3, { color: c.teal, size: 14, align: 'left', dx: 10, dy: 6, valign: 'top' });
          g.tex('y=x^2-2x', -1.4, 6.2, { color: c.primary, size: 14, align: 'left', avoid: true });
          g.tex('y=4x-9', 4.0, 4.2, { color: c.teal, size: 14, align: 'left', dx: 4, avoid: true });
        } else {
          g.grid({ stepX: 0.5, stepY: 0.5, xlabel: 't', ylabel: '' });
          D.curve(g, (t) => 3 * t * t - 2 * t * t * t, { x0: 0, x1: 1, color: c.primary, width: 3 });
          D.curve(g, (t) => 6 * t - 6 * t * t, { x0: 0, x1: 1, color: c.amber, width: 3 });
          g.dot(0.5, 1.5, { r: 5, color: c.amber });
          g.tex("f'(t)=6t-6t^2", 0.5, 1.5, { color: c.amber, size: 14, align: 'center', valign: 'bottom', dy: -8 });
          g.tex('f(t)=3t^2-2t^3', 0.36, 0.12, { color: c.primary, size: 14, align: 'left', avoid: true });
        }
      };
      plot.invalidate();
    });
  }

  D.boot([
    [initDef, 'w-def'],
    [initDeriv, 'w-deriv'],
    [initTanLine, 'w-tanline'],
    [initEase, 'w-ease'],
    [initGameSlope, 'w-game-slope'],
    [initQuizFigs, 'check'],
  ]);
})();
