/* 第4章 4.6節 逆関数の微分 — 図
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   axes(g, o)     … 方眼と目盛り（目盛りの数字もすべて TeX）
 *   chipRow(...)   … 選択ボタンの列
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, H = PI / 2;
  const fm = (v, d) => D.fmt(v, d == null ? 2 : d);
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  function setHTML(node, h) { if (node._h === h) return; node._h = h; node.innerHTML = h; typeset(node); }

  function chipRow(box, items, cur, onPick) {
    box.innerHTML = '';
    const btns = items.map(function (it, i) {
      const b = el('button', 'chip');
      b.type = 'button';
      const s = el('span'); b.append(s); setTex(s, it.tex);
      b.addEventListener('click', () => { btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); onPick(it, i); });
      box.append(b);
      return b;
    });
    btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === cur)));
    return btns;
  }

  // 方眼と目盛り（目盛りの文字は TeX）
  function axes(g, o) {
    o = o || {};
    const c = g.c, sx = o.sx || 1, sy = o.sy || 1;
    g.grid({ stepX: sx, stepY: sy, labels: false, xlabel: 'x', ylabel: 'y' });
    let m = 1;
    while (g.pxPerX * sx * m < 30) m++;
    const hasX0 = g.ymin <= 0 && g.ymax >= 0, y0 = hasX0 ? g.Y(0) : g.h - 16;
    for (let i = Math.ceil(g.xmin / sx - 1e-9); i * sx <= g.xmax + 1e-9; i++) {
      if (i === 0 || i % m) continue;
      const px = g.X(i * sx);
      if (px > g.w - 20 || px < 12) continue;
      g.texPx(num(i * sx, 2), px, y0 + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
    }
    const pxy = (g.h / (g.ymax - g.ymin)) * sy;
    let my = 1;
    while (pxy * my < 24) my++;
    const hasY0 = g.xmin <= 0 && g.xmax >= 0, x0 = hasY0 ? g.X(0) : 30;
    for (let j = Math.ceil(g.ymin / sy - 1e-9); j * sy <= g.ymax + 1e-9; j++) {
      if (!j || j % my) continue;
      const py = g.Y(j * sy);
      if (py < 24 || py > g.h - 10) continue;
      g.texPx(num(j * sy, 2), x0 - 6, py, { align: 'right', size: 13, color: c.muted });
    }
    if (hasX0 && hasY0) g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
  }

  /* ==========================================================
     4.6(1) y = x で折り返すと、接線の傾きは逆数
     ========================================================== */
  function initMirror() {
    const root = $id('w-mirror');
    const FS = [
      { tex: 'e^x', f: Math.exp, df: Math.exp, inv: Math.log, ar: [-1.1, 1.1], a0: 0.6, view: { xmin: -2.6, xmax: 4.6, yc: 1 },
        fx: [-2.6, 1.5], ix: [0.03, 4.6], ftex: 'y=e^x', itex: 'y=\\log x',
        fl: [0.9, Math.exp(0.9), { align: 'right', dx: -10 }], il: [4.1, Math.log(4.1), { align: 'right', valign: 'bottom', dy: -8 }],
        pt: (a, b) => ['e^{' + fm(a) + '}', '\\log' + fm(b)] },
      { tex: 'x^2', f: (x) => x * x, df: (x) => 2 * x, inv: Math.sqrt, ar: [0.15, 1.7], a0: 1, view: { xmin: -1, xmax: 4.4, yc: 1.5 },
        fx: [0, 2.2], ix: [0, 4.8], ftex: 'y=x^2\\ (x\\geqq0)', itex: 'y=\\sqrt{x}',
        fl: [1.62, 1.62 * 1.62, { align: 'right', dx: -10 }], il: [3.9, Math.sqrt(3.9), { align: 'right', valign: 'bottom', dy: -8 }] },
      { tex: 'x^3', f: (x) => x * x * x, df: (x) => 3 * x * x, inv: Math.cbrt, ar: [-1.2, 1.2], a0: 0.7, view: { xmin: -3, xmax: 3, yc: 0 },
        fx: [-1.6, 1.6], ix: [-4, 4], ftex: 'y=x^3', itex: 'y=\\sqrt[3]{x}',
        fl: [-1.12, -Math.pow(1.12, 3), { align: 'right', dx: -10 }], il: [2.7, Math.cbrt(2.7), { align: 'right', valign: 'bottom', dy: -8 }] },
      { tex: '\\sin x', f: Math.sin, df: Math.cos, inv: Math.asin, ar: [-1.35, 1.35], a0: 1, view: { xmin: -2.8, xmax: 2.8, yc: 0 },
        fx: [-H, H], ix: [-1, 1], ftex: 'y=\\sin x', itex: 'y=\\sin^{-1}x',
        fl: [1.25, Math.sin(1.25), { align: 'left', valign: 'top', dx: 8, dy: 6 }], il: [-0.95, Math.asin(-0.95), { align: 'left', dx: 12 }] },
    ];
    const st = { k: 0, a: 0.6, s: 1, play: false };
    const F = () => FS[st.k];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ equal: true, ratio: [0.95, 0.6] }, FS[0].view));
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: '\\teal{a}', min: -1.1, max: 1.1, step: 0.01, value: 0.6, color: 'teal', aria: '接点の x 座標 a' });
    sA.on((v) => { st.a = v; update(); });
    chipRow(R(root, 'fs'), FS.map((f) => ({ tex: 'y=' + f.tex })), 0, (it, i) => {
      st.k = i; const f = F();
      sA.input.min = f.ar[0]; sA.input.max = f.ar[1]; st.a = f.a0; sA.set(f.a0);
      plot.setView(f.view); update();
    });
    plot.addHandle({
      get x() { return st.a; }, get y() { return F().f(st.a); },
      get color() { return plot.c ? plot.c.teal : '#0d9c86'; }, r: 8,
      drag(x) { st.a = clamp(Math.round(x * 100) / 100, F().ar[0], F().ar[1]); sA.set(st.a); update(); },
    });
    // 折り返しのアニメーション（y = x を軸に紙を裏返す）
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.s = Math.min(1, st.s + dt / 1.8);
      if (st.s >= 1) { st.play = false; bP.disabled = false; }
      plot.invalidate();
      return st.play;
    });
    const bP = R(root, 'play');
    bP.addEventListener('click', () => {
      if (L.reduceMotion) { st.s = 1; plot.invalidate(); return; }
      st.s = 0; st.play = true; bP.disabled = true; anim.kick();
    });

    // (x, y) を y = x について角 πs だけ「裏返す」（s = 1 で (y, x)）
    const T = (p) => { const cs = Math.cos(PI * st.s), u = (p[0] + p[1]) / 2, v = (p[0] - p[1]) / 2; return [u + cs * v, u - cs * v]; };
    function geom() {
      const f = F(), a = st.a, b = f.f(a), m = f.df(a);
      let r = 1;
      while (Math.abs(m * r) > 1.3 && r > 0.26) r /= 2;
      const dir = (b + m * r > plot.ymax - 0.35 || a + r > plot.xmax - 0.3) ? -1 : 1;
      const P1 = [a, b], P2 = [a + dir * r, b], P3 = [a + dir * r, b + dir * r * m];
      return { a, b, m, r, dir, P1, P2, P3 };
    }
    function update() {
      const f = F(), q = geom(), a = q.a, b = q.b, m = q.m;
      tex(root, 'p', '\\mathrm{P}(' + fm(a) + ',\\ ' + fm(b) + ')');
      tex(root, 'm', '\\teal{' + fm(m, 3) + '}');
      tex(root, 'q', '\\mathrm{Q}(' + fm(b) + ',\\ ' + fm(a) + ')');
      const flat = Math.abs(m) < 2e-3;
      tex(root, 'mi', flat ? '\\text{（縦にまっすぐ）}' : '\\dfrac{1}{\\teal{' + fm(m, 3) + '}}\\approx\\teal{' + fm(1 / m, 3) + '}');
      setHTML(R(root, 'how'), flat
        ? '接線が水平（傾き $0$）なので、折り返すと<b>縦にまっすぐ</b>な線になり、傾きは決まりません（$0$ の逆数はない）。'
        : '金色の「縦」と灰色の「横」が、折り返すと<b>入れかわる</b>。だから傾き（縦 ÷ 横）は逆数になる。');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, f = F(), q = geom(), done = st.s >= 1;
      axes(g);
      // y = x
      g.line(Math.max(g.xmin, g.ymin), Math.max(g.xmin, g.ymin), Math.min(g.xmax, g.ymax), Math.min(g.xmax, g.ymax), { color: c.muted, width: 1.6, dash: [6, 5] });
      { const v = Math.min(g.xmax, g.ymax) * 0.78; g.tex('y=x', v, v, { align: 'left', valign: 'top', dx: 10, dy: 2, size: 14, color: c.muted, avoid: true }); }
      // もとのグラフ・接線・階段
      D.curve(g, f.f, { x0: f.fx[0], x1: f.fx[1], color: c.primary, width: 3 });
      D.tangent(g, f.f, q.a, { df: f.df, point: false });
      g.line(q.P1[0], q.P1[1], q.P2[0], q.P2[1], { color: c.muted, width: 1.8, dash: [4, 4] });
      g.line(q.P2[0], q.P2[1], q.P3[0], q.P3[1], { color: c.amber, width: 3 });
      // 折り返したもの（紫）
      const n = 160, pts = [];
      for (let i = 0; i <= n; i++) { const x = f.fx[0] + (f.fx[1] - f.fx[0]) * i / n, y = f.f(x); if (isFinite(y) && Math.abs(y) < 50) pts.push(T([x, y])); }
      g.poly(pts, { color: c.violet, width: 3, alpha: done ? 1 : 0.75 });
      { const len = 40 / Math.hypot(1, q.m), A = T([q.a - len, q.b - len * q.m]), B = T([q.a + len, q.b + len * q.m]);
        g.line(A[0], A[1], B[0], B[1], { color: c.teal, width: 2.5, dash: [7, 5], alpha: done ? 1 : 0.6 }); }
      const Q1 = T(q.P1), Q2 = T(q.P2), Q3 = T(q.P3);
      g.line(Q1[0], Q1[1], Q2[0], Q2[1], { color: c.muted, width: 1.8, dash: [4, 4] });
      g.line(Q2[0], Q2[1], Q3[0], Q3[1], { color: c.amber, width: 3 });
      g.dot(Q1[0], Q1[1], { r: 6, color: c.violet });
      if (done) {
        // P と Q を結ぶ点線（y = x に垂直）
        g.line(q.a, q.b, q.b, q.a, { color: c.muted, width: 1.2, dash: [2, 4] });
        const rs = String(q.r), ms = fm(q.m * q.r);
        g.tex(rs, (q.P1[0] + q.P2[0]) / 2, q.b, { align: 'center', valign: q.m * q.dir >= 0 ? 'top' : 'bottom', dy: q.m * q.dir >= 0 ? 3 : -3, size: 13, color: c.muted, avoid: true });
        if (Math.abs(q.m * q.r) > 0.05) {
          g.tex(ms, q.P2[0], (q.P2[1] + q.P3[1]) / 2, { align: q.dir > 0 ? 'left' : 'right', dx: q.dir > 0 ? 6 : -6, size: 14, color: c.amber, avoid: true });
          g.tex(ms, (Q2[0] + Q3[0]) / 2, Q2[1], { align: 'center', valign: q.dir > 0 ? 'bottom' : 'top', dy: q.dir > 0 ? -4 : 4, size: 14, color: c.amber, avoid: true });
        }
        g.tex(rs, q.b, (Q1[1] + Q2[1]) / 2, { align: q.m * q.dir >= 0 ? 'left' : 'right', dx: q.m * q.dir >= 0 ? 6 : -6, size: 13, color: c.muted, avoid: true });
        g.tex(f.ftex, f.fl[0], f.fl[1], Object.assign({ size: 15, color: c.primary, avoid: true }, f.fl[2]));
        g.tex(f.itex, f.il[0], f.il[1], Object.assign({ size: 15, color: c.violet, avoid: true }, f.il[2]));
        g.tex('\\mathrm{P}', q.a, q.b, { align: 'right', valign: 'bottom', dx: -12, dy: -10, size: 14, color: c.teal, avoid: true });
        g.tex('\\mathrm{Q}', q.b, q.a, { align: 'left', valign: 'top', dx: 8, dy: 6, size: 14, color: c.violet, avoid: true });
      }
    };
    update();
  }

  /* ==========================================================
     4.6(3) 逆三角関数のグラフと接線・導関数
     ========================================================== */
  function initAtrig() {
    const root = $id('w-atrig');
    const sq = (x) => Math.sqrt(1 - x * x);
    const MODES = [
      { tex: '\\sin^{-1}x', f: Math.asin, df: (x) => 1 / sq(x), ftex: 'y=\\sin^{-1}x', dtex: "y=(\\sin^{-1}x)'", dfT: (x) => '\\dfrac{1}{\\sqrt{1-x^2}}' },
      { tex: '\\cos^{-1}x', f: Math.acos, df: (x) => -1 / sq(x), ftex: 'y=\\cos^{-1}x', dtex: "y=(\\cos^{-1}x)'", dfT: (x) => '-\\dfrac{1}{\\sqrt{1-x^2}}' },
      { tex: '\\sin^{-1}x \\text{ と } \\cos^{-1}x', both: true },
      { tex: '\\tan^{-1}x', f: Math.atan, df: (x) => 1 / (1 + x * x), ftex: 'y=\\tan^{-1}x', dtex: "y=(\\tan^{-1}x)'", dfT: (x) => '\\dfrac{1}{1+x^2}' },
    ];
    const V1 = { xmin: -1.6, xmax: 1.6, ymin: -3.3, ymax: 3.9 }, V2 = { xmin: -5, xmax: 5, ymin: -2.1, ymax: 2.1 };
    const st = { k: 0, x: 0.5, deriv: true };
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.9, 0.55] }, V1));
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: '\\teal{x}', min: -0.95, max: 0.95, step: 0.01, value: 0.5, color: 'teal', aria: '接点の x 座標' });
    sX.on((v) => { st.x = v; update(); });
    R(root, 'deriv').addEventListener('change', (e) => { st.deriv = e.target.checked; plot.invalidate(); });
    chipRow(R(root, 'fs'), MODES, 0, (it, i) => {
      const wasTan = st.k === 3;
      st.k = i;
      const tan = i === 3;
      if (tan !== wasTan) {
        sX.input.min = tan ? -4.5 : -0.95; sX.input.max = tan ? 4.5 : 0.95;
        st.x = tan ? 1 : 0.5; sX.set(st.x);
        plot.setView(tan ? V2 : V1);
      }
      update();
    });
    plot.addHandle({
      get x() { return st.x; }, get y() { return (MODES[st.k].f || Math.asin)(st.x); },
      get color() { return plot.c ? plot.c.teal : '#0d9c86'; }, r: 8,
      drag(x) { st.x = clamp(Math.round(x * 100) / 100, +sX.input.min, +sX.input.max); sX.set(st.x); update(); },
    });
    function update() {
      const M = MODES[st.k], x = st.x;
      if (M.both) {
        const s = Math.asin(x), c = Math.acos(x), ms = 1 / sq(x);
        tex(root, 'v', '\\blue{\\sin^{-1}' + fm(x) + '}+\\violet{\\cos^{-1}' + fm(x) + '}\\approx' + fm(s, 3) + '+' + fm(c, 3) + '=' + fm(s + c, 3));
        tex(root, 'm', '\\teal{' + fm(ms, 3) + '}+(\\teal{' + fm(-ms, 3) + '})=0');
        tex(root, 'id', '\\sin^{-1}x+\\cos^{-1}x=\\dfrac{\\pi}{2}\\approx1.571');
        setHTML(R(root, 'how'), '2つの高さの和はいつも $\\frac{\\pi}{2}$（点線）。和が一定なので、傾きの和は $0$：<b>傾きはちょうど逆符号</b>。');
      } else {
        const y = M.f(x), m = M.df(x);
        tex(root, 'v', M.ftex.slice(2, -1) + '(' + fm(x) + ')' + '\\approx' + fm(y, 3));
        tex(root, 'm', '\\teal{' + fm(m, 3) + '}');
        tex(root, 'id', M.dfT(x).replace(/x\^2/g, '(' + fm(x) + ')^2') + '\\approx' + fm(m, 3));
        setHTML(R(root, 'how'), [
          '傾きはいつも正で、$x=0$ で最小の $1$。$x\\to\\pm1$ で縦に立って、傾きは限りなく大きくなる。',
          '$\\sin^{-1}x$ のグラフを上下にひっくり返して $\\frac{\\pi}{2}$ 上げた形。傾きは $\\sin^{-1}x$ のちょうど逆符号。',
          '', '傾きはいつも正で、$x=0$ で最大の $1$。遠くへ行くほど $0$ に近づき、グラフは $\\pm\\frac{\\pi}{2}$ に近づく。',
        ][st.k]);
      }
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, M = MODES[st.k], x = st.x, tan = st.k === 3;
      axes(g, { sx: tan ? 1 : 0.5, sy: 1 });
      // ±π/2, π の点線
      const lines = tan ? [[H, '\\frac{\\pi}{2}'], [-H, '-\\frac{\\pi}{2}']] : M.both ? [[H, '\\frac{\\pi}{2}']] : st.k === 1 ? [[PI, '\\pi'], [H, '\\frac{\\pi}{2}']] : [[H, '\\frac{\\pi}{2}'], [-H, '-\\frac{\\pi}{2}']];
      lines.forEach((l) => {
        g.line(g.xmin, l[0], g.xmax, l[0], { color: c.muted, width: 1.4, dash: [5, 5] });
        g.texPx(l[1], g.w - 6, g.Y(l[0]) + (l[0] > 0 ? -4 : 4), { align: 'right', valign: l[0] > 0 ? 'bottom' : 'top', size: 13, color: c.muted, avoid: true });
      });
      if (!tan) [-1, 1].forEach((v) => g.line(v, g.ymin, v, g.ymax, { color: c.grid, width: 1.4, dash: [3, 4] }));
      const opt = tan ? {} : { x0: -1, x1: 1, n: 600 };
      if (M.both) {
        const ds = (t) => 1 / sq(t);
        if (st.deriv) {
          D.curve(g, ds, { x0: -0.999, x1: 0.999, color: c.amber, width: 2.2, alpha: 0.85 });
          D.curve(g, (t) => -ds(t), { x0: -0.999, x1: 0.999, color: c.amber, width: 2.2, alpha: 0.85, dash: [6, 4] });
        }
        g.line(g.xmin, H / 2, g.xmax, H / 2, { color: c.grid, width: 1.2, dash: [2, 4] });
        D.curve(g, Math.asin, Object.assign({ color: c.primary, width: 3 }, opt));
        D.curve(g, Math.acos, Object.assign({ color: c.violet, width: 3 }, opt));
        D.tangent(g, Math.asin, x, { df: ds, point: false });
        D.tangent(g, Math.acos, x, { df: (t) => -ds(t) });
        // 高さの和：0 から sin⁻¹x（青）、そこから π/2 まで（紫） ＝ cos⁻¹x
        const s = Math.asin(x);
        g.line(x, 0, x, s, { color: c.primary, width: 5, alpha: 0.55 });
        g.line(x, s, x, H, { color: c.violet, width: 5, alpha: 0.55 });
        g.tex('y=\\sin^{-1}x', 1, H, { align: g.w < 520 ? 'right' : 'left', valign: 'top', dx: g.w < 520 ? -10 : 8, dy: 10, size: 14, color: c.primary, avoid: true });
        g.tex('y=\\cos^{-1}x', -1, PI, { align: 'left', valign: 'bottom', dx: 10, dy: -6, size: 14, color: c.violet, avoid: true });
        if (st.deriv) g.tex('\\pm\\frac{1}{\\sqrt{1-x^2}}', 0.93, -1 / sq(0.93), { align: 'right', dx: -12, size: 13, color: c.amber, avoid: true });
        return;
      }
      if (st.deriv) {
        D.curve(g, M.df, tan ? { color: c.amber, width: 2.5, alpha: 0.9 } : { x0: -0.999, x1: 0.999, n: 600, color: c.amber, width: 2.5, alpha: 0.9 });
        const m = M.df(x);
        g.line(x, M.f(x), x, m, { color: c.amber, width: 1.2, dash: [3, 4] });
        g.dot(x, m, { r: 5, color: c.amber });
      }
      D.curve(g, M.f, Object.assign({ color: c.primary, width: 3 }, opt));
      D.tangent(g, M.f, x, { df: M.df, point: false });
      if (tan) {
        g.tex(M.ftex, 4.6, Math.atan(4.6), { align: 'right', valign: 'top', dy: 8, size: 15, color: c.primary, avoid: true });
        if (st.deriv) g.tex(M.dtex, -4.6, 1 / (1 + 4.6 * 4.6), { align: 'left', valign: 'bottom', dy: -8, size: 14, color: c.amber, avoid: true });
      } else {
        if (st.k === 0) g.tex(M.ftex, 1, H, { align: g.w < 520 ? 'right' : 'left', valign: 'top', dx: g.w < 520 ? -10 : 8, dy: 10, size: 15, color: c.primary, avoid: true });
        else g.tex(M.ftex, -1, PI, { align: 'left', dx: 10, size: 15, color: c.primary, avoid: true });
        if (st.deriv) {
          const xd = 0.93, yd = M.df(xd);
          g.tex(M.dtex, xd, yd, { align: 'right', dx: -10, size: 14, color: c.amber, avoid: true });
        }
      }
    };
    update();
  }

  /* ==========================================================
     4.6(3) 直角三角形の2つの角：sin⁻¹x + cos⁻¹x = π/2
     ========================================================== */
  function initComp() {
    const root = $id('w-comp');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.7, xmax: 1.7, equal: true, yc: 0.5, ratio: [0.7, 0.5] });
    const st = { x: 0.6 };
    const sX = slider(root.querySelector('.controls'), { tex: 'x', min: 0.05, max: 0.95, step: 0.01, value: 0.6, aria: '縦の辺 x' });
    sX.on((v) => { st.x = v; update(); });
    plot.addHandle({
      get x() { return Math.sqrt(1 - st.x * st.x); }, get y() { return st.x; },
      get color() { return plot.c ? plot.c.primary : '#2f6fde'; }, r: 7,
      drag(x, y) { st.x = clamp(Math.round(y * 100) / 100, 0.05, 0.95); sX.set(st.x); update(); },
    });
    function update() {
      const a = Math.asin(st.x), b = Math.acos(st.x);
      tex(root, 'a', '\\blue{\\alpha=\\sin^{-1}' + fm(st.x) + '}\\approx' + fm(a, 3));
      tex(root, 'b', '\\violet{\\beta=\\cos^{-1}' + fm(st.x) + '}\\approx' + fm(b, 3));
      tex(root, 's', '\\alpha+\\beta\\approx' + fm(a + b, 3) + '=\\dfrac{\\pi}{2}');
      plot.invalidate();
    }
    function arc(g, cx, cy, r, t0, t1, color) {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const t = t0 + (t1 - t0) * i / 40; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
      g.poly(pts, { color, width: 3 });
    }
    plot.draw = function (g) {
      const c = g.c, x = st.x, w = Math.sqrt(1 - x * x), a = Math.asin(x);
      g.grid({ step: 0.5, labels: false, axes: false });
      // 単位円の一部（斜辺の長さ 1）
      arc(g, 0, 0, 1, -0.05, H + 0.05, c.grid);
      g.poly([[0, 0], [w, 0], [w, x], [0, 0]], { color: c.text, width: 2.5 });
      // 直角の印
      const q = 0.07;
      g.poly([[w - q, 0], [w - q, q], [w, q]], { color: c.muted, width: 1.5 });
      arc(g, 0, 0, 0.22, 0, a, c.primary);
      const tB = Math.atan2(-x, -w);
      arc(g, w, x, 0.16, tB, -H, c.violet);
      g.tex('\\alpha', 0.27 * Math.cos(a / 2), 0.27 * Math.sin(a / 2), { align: 'left', dx: 4, size: 15, color: c.primary });
      g.tex('\\beta', w + 0.21 * Math.cos((tB - H) / 2), x + 0.21 * Math.sin((tB - H) / 2), { align: 'center', valign: 'top', dy: 2, size: 15, color: c.violet });
      g.tex('1', w / 2, x / 2, { align: 'right', valign: 'bottom', dx: -6, dy: -4, size: 15, color: c.text });
      g.tex('x', w, x / 2, { align: 'left', dx: 8, size: 15, color: c.text });
      g.tex('\\sqrt{1-x^2}', w / 2, 0, { align: 'center', valign: 'top', dy: 6, size: 14, color: c.text });
      g.tex('\\mathrm{O}', 0, 0, { align: 'right', valign: 'top', dx: -4, dy: 2, size: 13, color: c.muted });
    };
    update();
  }

  D.boot([
    [initMirror, 'w-mirror'],
    [initComp, 'w-comp'],
    [initAtrig, 'w-atrig'],
  ]);
})();
