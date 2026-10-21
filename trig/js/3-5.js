/* 第3章 3.5節 円運動・回転と加法定理 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 *
 * この節だけの部品
 *   fitBox(plot, x0, x1, y0, y1) … equal の図で、指定した範囲がまるごと入るように表示範囲を決める
 *   arcAt(g, cx, cy, r, a0, a1, o) … 中心 (cx,cy)・半径 r の弧（矢印つき・ラベルつき）
 *   playButton(btn, st, anim)    … 再生／一時停止ボタン
 *   parseNum(str)                … 「√3/2」「(√6+√2)/4」「0.866」などを数に（チャレンジの入力用）
 *
 * アニメーションはどれも Lab.animate（画面外・非表示タブでは止まる）。
 * 回る点の図は、円の点・右の sin・下の cos を 1 つの角 st.th で、円運動の図は点・影・ばねを 1 つの時計 st.t で動かす（ずれない）。
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI, DEG = PI / 180;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const mod2pi = (a) => { a = a % TAU; if (a < 0) a += TAU; return a; };
  const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
  const sgnTeX = (v) => (v < 0 ? '-' : '+');

  /* ---------- 小さな部品 ---------- */
  function fitBox(plot, x0, x1, y0, y1) {
    const w = plot.w || 300, h = plot.h || 200;
    const s = Math.max((x1 - x0) / w, (y1 - y0) / h), cx = (x0 + x1) / 2;
    plot.setView({ xmin: cx - s * w / 2, xmax: cx + s * w / 2, yc: (y0 + y1) / 2 });
  }
  function fitCircle(plot, half) {
    const w = plot.w || 300, h = plot.h || 300;
    const hx = half * Math.max(1, w / h);
    plot.setView({ xmin: -hx, xmax: hx, yc: 0 });
  }
  // 弧（a0 → a1、反時計回りが正）。ラベルは弧のまん中の外側
  function arcAt(g, cx, cy, r, a0, a1, o) {
    o = o || {};
    const col = o.color || g.c.primary, d = a1 - a0;
    if (Math.abs(d) < 1e-4) return;
    const n = Math.max(8, Math.ceil(Math.abs(d) / 0.04)), pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + d * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    g.poly(pts, { color: col, width: o.width || 2.5 });
    if (o.arrow !== false && Math.abs(d) * r * g.pxPerX > 14) {
      const p1 = pts[n], p0 = pts[Math.max(0, n - 2)];
      g.arrow(p0[0], p0[1], p1[0], p1[1], { color: col, width: 2, head: 9 });
    }
    if (o.label) {
      const m = a0 + d / 2, rr = r + (o.ldist != null ? o.ldist : r * 0.45);
      g.tex(o.label, cx + rr * Math.cos(m), cy + rr * Math.sin(m), { color: col, size: o.size || 15, align: 'center', avoid: o.avoid });
    }
  }
  function playButton(btn, st, anim) {
    const show = () => { btn.textContent = st.play ? '一時停止' : '再生'; btn.classList.toggle('primary', !st.play); };
    btn.addEventListener('click', () => { st.play = !st.play; show(); if (st.play) anim.kick(); });
    show();
    return show;
  }
  function circlePx(g, cx, cy, r, o) {
    const ctx = g.ctx; o = o || {};
    ctx.save(); ctx.strokeStyle = o.color || g.c.muted; ctx.lineWidth = o.width || 1.5;
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.arc(g.X(cx), g.Y(cy), r * g.pxPerX, 0, TAU);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    ctx.stroke(); ctx.restore();
  }
  // 「1.0」「0.40」のような係数（整数ならそのまま）
  const co = (v, d) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(d || 2));

  /* ==========================================================
     3.5(1) 回る点の影：右に sin、下に cos のグラフ（同じ目盛り）
     ========================================================== */
  function initUnroll() {
    const root = $id('w-unroll');
    const K = 0.5, G = 1.5, LEN = TAU * K;          // θ の目盛り（1 rad = 0.5）、グラフの始まり
    const X0 = -1.32, X1 = G + LEN + 0.42, Y1 = 1.5, Y0 = -(G + LEN + 0.42);
    const plot = new Plot(root.querySelector('canvas'), { xmin: X0, xmax: X1, equal: true, yc: (Y0 + Y1) / 2,
      height: (w) => (w < 520 ? Math.round(w * (Y1 - Y0) / (X1 - X0)) : Math.min(Math.round(w * 0.82), 600)) });
    const layout = () => fitBox(plot, X0, X1, Y0, Y1);
    plot.onResize = layout; layout();
    const st = { th: 0, play: !L.reduceMotion, hold: 0 };
    const ctl = root.querySelector('.controls');
    const sT = slider(ctl, { tex: '\\blue{\\theta}', min: 0, max: 360, step: 1, value: 0, color: 'primary', aria: '角 θ（度）', fmt: (v) => v + '°' });
    let show = null;
    const stop = () => { if (st.play) { st.play = false; st.hold = 0; if (show) show(); } };
    sT.on((v) => { stop(); st.th = v * DEG; update(); });
    function update() {
      sT.set(Math.round(st.th / DEG));
      const d = st.th / DEG, nice = Math.abs(d - Math.round(d / 15) * 15) < 1e-6;
      tex(root, 'th', '\\blue{\\theta}=' + (nice ? T.angleTeX(Math.round(d) * DEG) : num(Math.round(d), 0) + '^\\circ'));
      tex(root, 'sin', 'y=\\red{\\sin\\theta}\\approx' + num(clean(Math.sin(st.th)), 2));
      tex(root, 'cos', 'x=\\teal{\\cos\\theta}\\approx' + num(clean(Math.cos(st.th)), 2));
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      if (st.hold > 0) { st.hold -= dt; if (st.hold <= 0) st.th = 0; }
      else { st.th += dt * 0.7; if (st.th >= TAU) { st.th = TAU; st.hold = 1.4; } }
      update();
      return true;
    });
    show = playButton(R(root, 'play'), st, anim);
    R(root, 'play').addEventListener('click', () => { if (st.play && st.th >= TAU - 1e-9) { st.th = 0; st.hold = 0; } });
    R(root, 'reset').addEventListener('click', () => { st.th = 0; st.hold = 0; update(); });
    plot.addHandle({
      get x() { return Math.cos(st.th); }, get y() { return Math.sin(st.th); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 8, tex: '\\mathrm{P}', lalign: 'center',
      get ldx() { return 20 * Math.cos(st.th); }, get ldy() { return -20 * Math.sin(st.th); },
      drag(x, y) {
        stop();
        let d = Math.atan2(y, x) - mod2pi(st.th);
        d = T.wrapPi(d);
        st.th = clamp(st.th + d, 0, TAU); update();
      },
    });
    const gx = (t) => G + K * t, gy = (t) => -(G + K * t);
    plot.draw = function (g) {
      const c = g.c, th = st.th, px = Math.cos(th), py = Math.sin(th);
      const TK = [[0, '0'], [PI / 2, '\\frac{\\pi}{2}'], [PI, '\\pi'], [3 * PI / 2, '\\frac{3\\pi}{2}'], [TAU, '2\\pi']];
      // 目盛りの補助線（±1 と π/2 ごと）
      [1, -1].forEach(function (v) {
        g.line(v === 1 ? 0 : 0, v, gx(TAU), v, { color: c.grid, width: 1, dash: [3, 4] });
        g.line(v, 0, v, gy(TAU), { color: c.grid, width: 1, dash: [3, 4] });
      });
      TK.forEach(function (k) {
        if (!k[0]) return;
        g.line(gx(k[0]), -1.05, gx(k[0]), 1.05, { color: c.grid, width: 1 });
        g.line(-1.05, gy(k[0]), 1.05, gy(k[0]), { color: c.grid, width: 1 });
      });
      // 軸：円の x 軸の続きが sin の θ 軸、円の y 軸の続きが cos の θ 軸
      g.arrow(-1.25, 0, gx(TAU) + 0.32, 0, { color: c.axis, width: 1.5, head: 8 });
      g.arrow(0, 1.32, 0, gy(TAU) - 0.32, { color: c.axis, width: 1.5, head: 8 });
      g.line(gx(0), -1.12, gx(0), 1.12, { color: c.axis, width: 1.5 });
      g.line(-1.12, gy(0), 1.12, gy(0), { color: c.axis, width: 1.5 });
      g.tex('x', 1.22, 0, { dy: 11, align: 'center', size: 13, color: c.muted });
      g.tex('y', 0, 1.32, { dx: 8, valign: 'top', size: 13, color: c.muted });
      g.tex('\\theta', gx(TAU) + 0.32, 0, { dy: 12, align: 'right', size: 14, color: c.primary });
      g.tex('\\theta', 0, gy(TAU) - 0.32, { dx: -8, align: 'right', valign: 'bottom', size: 14, color: c.primary });
      // 目盛りの数字（波の外側に）
      TK.forEach(function (k) {
        g.tex(k[1], gx(k[0]), -1.12, { valign: 'top', align: 'center', size: 12, color: c.muted });
        g.tex(k[1], 1.14, gy(k[0]), { align: 'left', size: 12, color: c.muted });
      });
      g.tex('1', gx(0), 1, { dx: -5, align: 'right', size: 12, color: c.muted });
      g.tex('-1', gx(0), -1, { dx: -5, align: 'right', size: 12, color: c.muted });
      g.tex('1', 1, gy(0), { dy: -9, align: 'center', size: 12, color: c.muted });
      g.tex('-1', -1, gy(0), { dy: -9, align: 'center', size: 12, color: c.muted });
      // 単位円
      circlePx(g, 0, 0, 1, { color: c.muted, width: 1.6 });
      // グラフ：1 周分はうすく、いままでの分は濃く
      const N = 120, sinPts = (t1) => { const a = []; for (let i = 0; i <= N; i++) { const t = t1 * i / N; a.push([gx(t), Math.sin(t)]); } return a; };
      const cosPts = (t1) => { const a = []; for (let i = 0; i <= N; i++) { const t = t1 * i / N; a.push([Math.cos(t), gy(t)]); } return a; };
      g.poly(sinPts(TAU), { color: c.accent, width: 2, alpha: 0.22 });
      g.poly(cosPts(TAU), { color: c.teal, width: 2, alpha: 0.22 });
      if (th > 1e-3) { g.poly(sinPts(th), { color: c.accent, width: 3.2 }); g.poly(cosPts(th), { color: c.teal, width: 3.2 }); }
      g.tex('y=\\sin\\theta', gx(PI / 2), 1, { dy: -14, align: 'center', size: 15, color: c.accent });
      g.tex('x=\\cos\\theta', 1, gy(7 * PI / 4), { dx: 34, align: 'left', size: 15, color: c.teal });
      // 角 θ の弧
      arcAt(g, 0, 0, 0.28, 0, Math.min(th, TAU - 1e-3), { color: c.primary, label: th > 0.35 ? '\\theta' : null, ldist: 0.14, size: 14 });
      // 影：x 軸上（cos）と y 軸上（sin）
      g.line(0, 0, px, 0, { color: c.teal, width: 4.5 });
      g.line(0, 0, 0, py, { color: c.accent, width: 4.5 });
      g.line(0, 0, px, py, { color: c.text, width: 2 });
      // 点線で写す：高さは右へ、横の位置は下へ
      const sx = gx(th), cy = gy(th);
      g.line(px, py, sx, py, { color: c.accent, width: 1.5, dash: [6, 4] });
      g.line(px, py, px, cy, { color: c.teal, width: 1.5, dash: [6, 4] });
      g.dot(sx, py, { r: 6, color: c.accent });
      g.dot(px, cy, { r: 6, color: c.teal });
    };
    update();
    if (st.play) anim.kick();
  }

  /* ==========================================================
     3.5(2) 円運動・影・ばね（1つの時計）
     ========================================================== */
  function initShm() {
    const root = $id('w-shm');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 3, equal: true, yc: 0.15, ratio: [0.78, 0.46] });
    const XS = 2.35, YC = 1.68;                     // ばねの位置と天井の高さ
    const layout = () => fitBox(plot, -1.55, 3.0, -1.5, 1.85);
    plot.onResize = layout; layout();
    const st = { r: 1, w: 1.5, t: 0, play: !L.reduceMotion };
    const ctl = root.querySelector('.controls');
    const sR = slider(ctl, { tex: 'r', min: 0.4, max: 1.2, step: 0.1, value: st.r, color: 'violet', aria: '半径 r', fmt: (v) => v.toFixed(1) });
    const sW = slider(ctl, { tex: '\\omega', min: 0.5, max: 3, step: 0.1, value: st.w, color: 'primary', aria: '角速度 ω（rad/秒）', fmt: (v) => v.toFixed(1) + ' rad/秒' });
    sR.on((v) => { st.r = v; readout(); plot.invalidate(); });
    sW.on((v) => { st.w = v; readout(); plot.invalidate(); });
    const nowBox = R(root, 'now');
    function readout() {
      tex(root, 'pos', 'x=' + co(st.r, 1) + '\\,\\teal{\\cos ' + co(st.w, 1) + 't},\\quad y=' + co(st.r, 1) + '\\,\\red{\\sin ' + co(st.w, 1) + 't}');
      tex(root, 'per', 'T=\\dfrac{2\\pi}{\\omega}=\\dfrac{2\\pi}{' + co(st.w, 1) + '}\\approx' + num(TAU / st.w, 2) + '\\ \\text{秒}');
      tex(root, 'vel', 'v=r\\omega=' + co(st.r, 1) + '\\times' + co(st.w, 1) + '=' + num(st.r * st.w, 2));
    }
    function now() { nowBox.textContent = 't = ' + st.t.toFixed(1) + ' 秒'; }
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt; if (st.t > 600) st.t = 0;
      now(); plot.invalidate();
      return true;
    });
    playButton(R(root, 'play'), st, anim);
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, r = st.r, a = st.w * st.t, x = r * Math.cos(a), y = r * Math.sin(a);
      // 軸
      g.line(-1.5, 0, 1.45, 0, { color: c.axis, width: 1.5 });
      g.line(0, -1.45, 0, 1.6, { color: c.axis, width: 1.5 });
      g.tex('x', 1.45, 0, { dx: -2, dy: -10, align: 'right', size: 14, color: c.muted });
      g.tex('y', 0, 1.6, { dx: 8, valign: 'top', size: 14, color: c.muted });
      circlePx(g, 0, 0, r, { color: c.muted, width: 1.5 });
      // 天井とつり合いの位置
      g.line(XS - 0.4, YC, XS + 0.4, YC, { color: c.text, width: 3 });
      for (let k = 0; k < 6; k++) { const x0 = XS - 0.36 + k * 0.14; g.line(x0, YC, x0 + 0.1, YC + 0.1, { color: c.muted, width: 1.2 }); }
      g.line(XS - 0.45, 0, XS + 0.45, 0, { color: c.muted, width: 1.2, dash: [4, 4] });
      // 角 ωt
      arcAt(g, 0, 0, 0.24, 0, mod2pi(a), { color: c.primary, label: '\\omega t', ldist: 0.17, size: 14 });
      // 同じ高さの線（点 → y 軸 → おもり）
      g.line(Math.min(0, x), y, XS, y, { color: c.accent, width: 1.3, dash: [5, 4], alpha: 0.8 });
      // y 軸上の影（sin）
      g.line(0, 0, 0, y, { color: c.accent, width: 4 });
      g.dot(0, y, { r: 6, color: c.accent });
      // 半径・点・速度
      g.line(0, 0, x, y, { color: c.text, width: 2.2 });
      const vs = 0.28, vx = -r * st.w * Math.sin(a) * vs, vy = r * st.w * Math.cos(a) * vs;
      g.arrow(x, y, x + vx, y + vy, { color: c.amber, width: 2.5, head: 10 });
      g.dot(x, y, { r: 7, color: c.primary });
      g.tex('v', x + vx, y + vy, { dx: vx >= 0 ? 6 : -6, dy: vy >= 0 ? -8 : 8, align: vx >= 0 ? 'left' : 'right', size: 14, color: c.amber });
      // ばね（ジグザグ）とおもり
      const m = 0.17, yTop = y + m, n = 14, pts = [[XS, YC], [XS, YC - 0.08]];
      const L0 = YC - 0.08, L1 = yTop + 0.06;
      for (let k = 1; k < n; k++) pts.push([XS + (k % 2 ? 0.12 : -0.12), L0 + (L1 - L0) * k / n]);
      pts.push([XS, L1], [XS, yTop]);
      g.poly(pts, { color: c.text, width: 1.8 });
      ctx.save(); ctx.fillStyle = c.accent;
      const bx = g.X(XS - m), by = g.Y(y + m), bs = 2 * m * g.pxPerX;
      ctx.fillRect(bx, by, bs, bs); ctx.restore();
      g.tex('\\text{ばね}', XS + 0.2, (YC + yTop) / 2, { size: 12, color: c.muted });
    };
    readout(); now();
    if (st.play) anim.kick();
  }

  /* ==========================================================
     3.5(3) 点を回す
     ========================================================== */
  function initRot() {
    const root = $id('w-rot');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.4, xmax: 3.4, equal: true, yc: 0, ratio: [0.95, 0.56] });
    plot.onResize = () => fitCircle(plot, 3.2);
    fitCircle(plot, 3.2);
    const st = { x: 2, y: 1, a: 60 };
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: '\\blue{\\alpha}', min: -180, max: 180, step: 15, value: st.a, color: 'primary', aria: '回す角 α（度）', fmt: (v) => v + '°' });
    sA.on((v) => { st.a = v; update(); });
    plot.addHandle({
      get x() { return st.x; }, get y() { return st.y; },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, tex: '\\mathrm{P}', ldx: 10, ldy: 14,
      drag(x, y) { st.x = clamp(Math.round(x * 2) / 2, -3, 3); st.y = clamp(Math.round(y * 2) / 2, -3, 3); update(); },
    });
    const vt = (v) => T.exactTeX(clean(v));
    function update() {
      const a = st.a * DEG, ca = clean(Math.cos(a)), sa = clean(Math.sin(a)), x = st.x, y = st.y;
      const X = x * ca - y * sa, Y = x * sa + y * ca;
      const nx = (v) => co(v, 1);
      tex(root, 'p', '\\mathrm{P}(\\teal{' + nx(x) + '},\\ \\red{' + nx(y) + '}),\\quad \\blue{\\alpha}=' + T.angleTeX(a));
      tex(root, 'q', '\\begin{aligned}x\'&=\\teal{x}\\cos\\alpha-\\red{y}\\sin\\alpha\\\\ y\'&=\\teal{x}\\sin\\alpha+\\red{y}\\cos\\alpha\\end{aligned}');
      const par = (v) => (v < 0 ? '\\left(' + vt(v) + '\\right)' : vt(v));
      const yy = '\\red{' + (y < 0 ? '(' + nx(y) + ')' : nx(y)) + '}', xx = '\\teal{' + nx(x) + '}';
      tex(root, 'num', 'x\'=' + xx + '\\cdot' + par(ca) + '-' + yy + '\\cdot' + par(sa) + '\\approx' + num(clean(X), 2));
      tex(root, 'num2', 'y\'=' + xx + '\\cdot' + par(sa) + '+' + yy + '\\cdot' + par(ca) + '\\approx' + num(clean(Y), 2));
      tex(root, 'len', '\\mathrm{OP}=\\mathrm{OP\'}\\approx' + num(Math.hypot(x, y), 2) + '\\ \\text{（距離は同じ）}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, a = st.a * DEG, ca = Math.cos(a), sa = Math.sin(a), x = st.x, y = st.y;
      const e1 = [ca, sa], e2 = [-sa, ca], X = x * ca - y * sa, Y = x * sa + y * ca;
      g.grid({ step: 1, xlabel: 'x', ylabel: 'y' });
      // 回した方眼（うすい紫）
      for (let k = -5; k <= 5; k++) {
        g.line(k * e1[0] - 6 * e2[0], k * e1[1] - 6 * e2[1], k * e1[0] + 6 * e2[0], k * e1[1] + 6 * e2[1], { color: c.violet, width: 1, alpha: 0.18 });
        g.line(k * e2[0] - 6 * e1[0], k * e2[1] - 6 * e1[1], k * e2[0] + 6 * e1[0], k * e2[1] + 6 * e1[1], { color: c.violet, width: 1, alpha: 0.18 });
      }
      // もとの行き方（点線）
      g.line(0, 0, x, 0, { color: c.teal, width: 2.5, dash: [6, 5], alpha: 0.7 });
      g.line(x, 0, x, y, { color: c.accent, width: 2.5, dash: [6, 5], alpha: 0.7 });
      // もとの矢印
      g.arrow(0, 0, 1, 0, { color: c.muted, width: 2, head: 10 });
      g.arrow(0, 0, 0, 1, { color: c.muted, width: 2, head: 10 });
      // 回したあとの行き方
      g.line(0, 0, x * e1[0], x * e1[1], { color: c.teal, width: 4.5 });
      g.line(x * e1[0], x * e1[1], X, Y, { color: c.accent, width: 4.5 });
      // 回した矢印
      g.arrow(0, 0, e1[0], e1[1], { color: c.text, width: 2.8, head: 12 });
      g.arrow(0, 0, e2[0], e2[1], { color: c.text, width: 2.8, head: 12 });
      g.tex('(\\cos\\alpha,\\,\\sin\\alpha)', 0.6 * e1[0] - 0.42 * e2[0], 0.6 * e1[1] - 0.42 * e2[1], { size: 13, align: 'center', avoid: true });
      g.tex('(-\\sin\\alpha,\\,\\cos\\alpha)', 1.12 * e2[0], 1.12 * e2[1], { size: 13, align: e2[0] >= -0.2 ? 'left' : 'right', dy: e2[1] >= 0 ? -6 : 8, avoid: true });
      // 角 α（OP → OP'）
      const r0 = Math.hypot(x, y);
      if (r0 > 0.2) {
        const a0 = Math.atan2(y, x);
        g.line(0, 0, x, y, { color: c.muted, width: 1.2 });
        g.line(0, 0, X, Y, { color: c.muted, width: 1.2 });
        arcAt(g, 0, 0, Math.min(r0 * 0.45, 1.1), a0, a0 + a, { color: c.primary, label: '\\alpha', ldist: 0.22, avoid: true });
      }
      g.dot(X, Y, { r: 8, color: c.violet });
      g.tex('\\mathrm{P}\'', X, Y, { dx: 10, dy: -14, size: 15, color: c.violet, avoid: true });
    };
    update();
  }

  /* ==========================================================
     3.5(4) 回転を2回：加法定理
     ========================================================== */
  function initAdd() {
    const root = $id('w-add');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.5, xmax: 1.5, equal: true, yc: 0, ratio: [0.95, 0.56] });
    plot.onResize = () => fitCircle(plot, 1.3);
    fitCircle(plot, 1.3);
    const st = { a: 30, b: 45, p: 1, run: false };
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: '\\blue{\\alpha}', min: -180, max: 180, step: 15, value: st.a, color: 'primary', aria: '1回目の角 α（度）', fmt: (v) => v + '°' });
    const sB = slider(ctl, { tex: '\\violet{\\beta}', min: -180, max: 180, step: 15, value: st.b, color: 'violet', aria: '2回目の角 β（度）', fmt: (v) => v + '°' });
    sA.on((v) => { st.a = v; st.p = 1; update(); });
    sB.on((v) => { st.b = v; st.p = 1; update(); });
    const anim = L.animate(root, function (dt) {
      if (!st.run) return false;
      st.p = Math.min(1, st.p + dt / 2.6); plot.invalidate();
      if (st.p >= 1) { st.run = false; return false; }
      return true;
    });
    R(root, 'go').addEventListener('click', () => { st.p = 0; st.run = true; anim.kick(); });
    const nv = (v) => { v = clean(v); return Math.abs(v) < 5e-4 ? '0' : num(v, 3); };
    const tv = (v, col) => '\\' + col + '{' + (v < 0 ? '(' + nv(v) + ')' : nv(v)) + '}';
    function update() {
      const a = st.a * DEG, b = st.b * DEG;
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const t1 = ca * cb, t2 = -sa * sb, u1 = sa * cb, u2 = ca * sb;
      tex(root, 'c', '\\begin{aligned}\\cos(\\blue{\\alpha}+\\violet{\\beta})&=\\teal{\\cos\\alpha\\cos\\beta}\\red{\\,-\\,\\sin\\alpha\\sin\\beta}\\\\ &=' + tv(t1, 'teal') + '+' + tv(t2, 'red') + '=' + nv(t1 + t2) + '\\end{aligned}');
      tex(root, 's', '\\begin{aligned}\\sin(\\blue{\\alpha}+\\violet{\\beta})&=\\teal{\\sin\\alpha\\cos\\beta}\\red{\\,+\\,\\cos\\alpha\\sin\\beta}\\\\ &=' + tv(u1, 'teal') + '+' + tv(u2, 'red') + '=' + nv(u1 + u2) + '\\end{aligned}');
      tex(root, 'chk', '\\begin{aligned}&\\alpha+\\beta=' + T.angleTeX(a + b) + '\\\\ &\\mathrm{B}=(' + nv(Math.cos(a + b)) + ',\\ ' + nv(Math.sin(a + b)) + ')\\end{aligned}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, a = st.a * DEG, b = st.b * DEG;
      const A = [Math.cos(a), Math.sin(a)], Ap = [-Math.sin(a), Math.cos(a)], cb = Math.cos(b), sb = Math.sin(b);
      const B = [Math.cos(a + b), Math.sin(a + b)], M = [cb * A[0], cb * A[1]];
      g.grid({ stepX: 0.5, stepY: 0.5, labels: false, xlabel: 'x', ylabel: 'y' });
      circlePx(g, 0, 0, 1, { color: c.muted, width: 1.5, alpha: 0.8 });
      g.tex('1', 1, 0, { dx: 5, dy: 10, valign: 'top', size: 13, color: c.muted });
      // A の向きと、それと直角な向き（うすい補助線）
      g.line(-1.4 * A[0], -1.4 * A[1], 1.4 * A[0], 1.4 * A[1], { color: c.violet, width: 1, alpha: 0.3 });
      g.line(M[0] - 1.2 * Ap[0], M[1] - 1.2 * Ap[1], M[0] + 1.2 * Ap[0], M[1] + 1.2 * Ap[1], { color: c.violet, width: 1, alpha: 0.3 });
      // 弧：α（青）と β（紫）
      arcAt(g, 0, 0, 0.2, 0, a, { color: c.primary, label: '\\alpha', ldist: 0.12 });
      arcAt(g, 0, 0, 0.36, a, a + b, { color: c.violet, label: '\\beta', ldist: 0.12 });
      g.line(0, 0, A[0], A[1], { color: c.muted, width: 2 });
      // 2回目の回転を分けて：A の向きへ cosβ（緑）、直角の向きへ sinβ（赤）
      g.line(0, 0, M[0], M[1], { color: c.teal, width: 5 });
      g.line(M[0], M[1], B[0], B[1], { color: c.accent, width: 5 });
      if (Math.abs(cb) > 0.08 && Math.abs(sb) > 0.08) {
        const k = 0.06 * Math.sign(cb), s2 = Math.sign(sb);
        g.poly([[M[0] - k * A[0], M[1] - k * A[1]], [M[0] - k * A[0] + 0.06 * s2 * Ap[0], M[1] - k * A[1] + 0.06 * s2 * Ap[1]], [M[0] + 0.06 * s2 * Ap[0], M[1] + 0.06 * s2 * Ap[1]]], { color: c.muted, width: 1.2 });
      }
      g.line(0, 0, B[0], B[1], { color: c.text, width: 2.5 });
      const sg = sb >= 0 ? 1 : -1;
      if (Math.abs(cb) > 0.15) g.tex('\\cos\\beta', 0.72 * M[0] - 0.12 * sg * Ap[0], 0.72 * M[1] - 0.12 * sg * Ap[1], { color: c.teal, size: 14, align: 'center', avoid: true });
      if (Math.abs(sb) > 0.15) g.tex('\\sin\\beta', (M[0] + B[0]) / 2, (M[1] + B[1]) / 2, { color: c.accent, size: 14, align: 'center', dx: 22 * A[0] * Math.sign(cb || 1), dy: -22 * A[1] * Math.sign(cb || 1), avoid: true });
      g.dot(A[0], A[1], { r: 5, color: c.primary });
      g.tex('\\mathrm{A}', 1.13 * A[0], 1.13 * A[1], { size: 15, align: 'center', color: c.primary, avoid: true });
      g.dot(B[0], B[1], { r: 7, color: c.text });
      g.tex('\\mathrm{B}', 1.13 * B[0], 1.13 * B[1], { size: 15, align: 'center', avoid: true });
      // 「回してみる」：2回に分けた道（●）と、まとめた道（○）
      if (st.p < 1) {
        const p = st.p, a1 = p < 0.5 ? a * 2 * p : a + b * (2 * p - 1), a2 = (a + b) * p;
        g.dot(Math.cos(a2), Math.sin(a2), { r: 10, ring: true, color: c.violet, lw: 3 });
        g.dot(Math.cos(a1), Math.sin(a1), { r: 6, color: c.primary });
      }
    };
    update();
  }

  /* ==========================================================
     3.5(5) チャレンジ：弾幕を作れ
     ========================================================== */
  // 入力を数に：0.866, -1/2, √3/2, (√6+√2)/4, 2√3, sqrt(2)/2 など
  function parseNum(str) {
    let s = String(str || '')
      .replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
      .replace(/\s+/g, '').replace(/[−ー－‐]/g, '-').replace(/[＋]/g, '+').replace(/[／÷]/g, '/').replace(/[×＊]/g, '*')
      .replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/[．]/g, '.').replace(/sqrt|ルート|r/gi, '√');
    if (!s) return NaN;
    let i = 0;
    const peek = () => s[i];
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const op = s[i++]; const w = term(); v = op === '+' ? v + w : v - w; } return v; }
    function term() {
      let v = unary();
      for (;;) {
        const ch = peek();
        if (ch === '*' || ch === '/') { i++; const w = unary(); v = ch === '*' ? v * w : v / w; }
        else if (ch === '√' || ch === '(' || (ch && /[0-9.]/.test(ch))) v *= atom();
        else break;
      }
      return v;
    }
    function unary() { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return atom(); }
    function atom() {
      const ch = peek();
      if (ch === '√') { i++; return Math.sqrt(atom()); }
      if (ch === '(') { i++; const v = expr(); if (peek() !== ')') throw new Error('paren'); i++; return v; }
      const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (!m) throw new Error('num');
      i += m[0].length; return parseFloat(m[0]);
    }
    try { const v = expr(); return i === s.length && isFinite(v) ? v : NaN; } catch (e) { return NaN; }
  }

  /* 弾幕のステージ
   *   A: 中心の弾の向き（度）、S: 1発ごとに回す角 α（度）、n: 敵の数
   *   d0: 中心の向きの TeX、a: α の TeX、step2 / step3: 手順②③に出す式（ステージが進むほど自分で計算する部分がふえる）
   *   入力するのは「中心の向きを α 回した、となりの弾の向き」の x 成分・y 成分
   */
  const DM_STAGES = [
    { name: 'れんしゅう', n: 3, A: 0, S: 30, tutorial: true, ex: ['√3/2', '1/2'],
      d0: '(1,\\ 0)', a: '30^\\circ',
      step2: '\\cos30^\\circ=\\dfrac{\\sqrt3}{2},\\quad \\sin30^\\circ=\\dfrac12',
      step3: 'x\'=1\\cdot\\dfrac{\\sqrt3}{2}-0\\cdot\\dfrac12=\\dfrac{\\sqrt3}{2},\\qquad y\'=1\\cdot\\dfrac12+0\\cdot\\dfrac{\\sqrt3}{2}=\\dfrac12',
      text: '中心の弾の向き $(1,\\ 0)$ を $30^\\circ$ 回した向きを計算して、x 成分・y 成分を入力しよう',
      hint: '下の手順③の計算がそのまま答えです。x 成分に √3/2、y 成分に 1/2 を入れて「発射」。',
      answer: '$(x\',\\ y\')=\\left(\\dfrac{\\sqrt3}{2},\\ \\dfrac12\\right)\\approx(0.866,\\ 0.5)$<br>$(1,\\ 0)$ を回すと $(\\cos\\alpha,\\ \\sin\\alpha)$ になる（3.3節の定義そのもの）。反対側の弾は $-30^\\circ$ 回して $\\left(\\dfrac{\\sqrt3}{2},\\ -\\dfrac12\\right)$。' },
    { name: '真上から', n: 3, A: 90, S: 30,
      d0: '(0,\\ 1)', a: '30^\\circ',
      step2: '\\cos30^\\circ=\\dfrac{\\sqrt3}{2},\\quad \\sin30^\\circ=\\dfrac12',
      step3: 'x\'=0\\cdot\\dfrac{\\sqrt3}{2}-1\\cdot\\dfrac12,\\qquad y\'=0\\cdot\\dfrac12+1\\cdot\\dfrac{\\sqrt3}{2}',
      text: '中心の弾の向き $(0,\\ 1)$ を $30^\\circ$ 回した向きを計算して、x 成分・y 成分を入力しよう',
      hint: '手順③の式を計算するだけ。$x\'$ にはマイナスがつきます（左へ回るから）。',
      answer: '$x\'=0\\cdot\\dfrac{\\sqrt3}{2}-1\\cdot\\dfrac12=-\\dfrac12,\\quad y\'=0\\cdot\\dfrac12+1\\cdot\\dfrac{\\sqrt3}{2}=\\dfrac{\\sqrt3}{2}$<br>$(x\',\\ y\')\\approx(-0.5,\\ 0.866)$。真上から左へ $30^\\circ$、つまり $120^\\circ$ の向き。' },
    { name: '45° 回す', n: 3, A: 30, S: 45,
      d0: '\\left(\\dfrac{\\sqrt3}{2},\\ \\dfrac12\\right)', a: '45^\\circ',
      step2: '\\cos45^\\circ=\\sin45^\\circ=\\dfrac{\\sqrt2}{2}',
      step3: 'x\'=\\dfrac{\\sqrt3}{2}\\cos45^\\circ-\\dfrac12\\sin45^\\circ,\\qquad y\'=\\dfrac{\\sqrt3}{2}\\sin45^\\circ+\\dfrac12\\cos45^\\circ',
      text: '中心の弾の向き $\\left(\\dfrac{\\sqrt3}{2},\\ \\dfrac12\\right)$ を $45^\\circ$ 回した向きを計算して、x 成分・y 成分を入力しよう',
      hint: '$\\dfrac{\\sqrt3}{2}\\cdot\\dfrac{\\sqrt2}{2}=\\dfrac{\\sqrt6}{4}$、$\\dfrac12\\cdot\\dfrac{\\sqrt2}{2}=\\dfrac{\\sqrt2}{4}$。',
      answer: '$x\'=\\dfrac{\\sqrt3}{2}\\cdot\\dfrac{\\sqrt2}{2}-\\dfrac12\\cdot\\dfrac{\\sqrt2}{2}=\\dfrac{\\sqrt6-\\sqrt2}{4}\\approx0.259$<br>$y\'=\\dfrac{\\sqrt3}{2}\\cdot\\dfrac{\\sqrt2}{2}+\\dfrac12\\cdot\\dfrac{\\sqrt2}{2}=\\dfrac{\\sqrt6+\\sqrt2}{4}\\approx0.966$<br>$30^\\circ+45^\\circ=75^\\circ$ の向き $(\\cos75^\\circ,\\ \\sin75^\\circ)$ と同じ。これが加法定理。' },
    { name: '15° 回す', n: 5, A: 45, S: 15,
      d0: '\\left(\\dfrac{\\sqrt2}{2},\\ \\dfrac{\\sqrt2}{2}\\right)', a: '15^\\circ',
      step2: '\\cos15^\\circ=\\dfrac{\\sqrt6+\\sqrt2}{4}\\approx0.966,\\quad \\sin15^\\circ=\\dfrac{\\sqrt6-\\sqrt2}{4}\\approx0.259', note: '（(4) で求めた値）',
      step3: 'x\'=x\\cos\\alpha-y\\sin\\alpha,\\qquad y\'=x\\sin\\alpha+y\\cos\\alpha',
      text: '中心の弾の向き $\\left(\\dfrac{\\sqrt2}{2},\\ \\dfrac{\\sqrt2}{2}\\right)$ を $15^\\circ$ 回した向きを計算して、x 成分・y 成分を入力しよう',
      hint: '$x=y=\\dfrac{\\sqrt2}{2}$ なので $x\'=\\dfrac{\\sqrt2}{2}(\\cos15^\\circ-\\sin15^\\circ)$、$y\'=\\dfrac{\\sqrt2}{2}(\\sin15^\\circ+\\cos15^\\circ)$。かっこの中を先に計算しよう。',
      answer: '$\\cos15^\\circ-\\sin15^\\circ=\\dfrac{2\\sqrt2}{4}=\\dfrac{\\sqrt2}{2}$、$\\cos15^\\circ+\\sin15^\\circ=\\dfrac{2\\sqrt6}{4}=\\dfrac{\\sqrt6}{2}$ なので<br>$x\'=\\dfrac{\\sqrt2}{2}\\cdot\\dfrac{\\sqrt2}{2}=\\dfrac12,\\quad y\'=\\dfrac{\\sqrt2}{2}\\cdot\\dfrac{\\sqrt6}{2}=\\dfrac{\\sqrt{12}}{4}=\\dfrac{\\sqrt3}{2}$<br>$45^\\circ+15^\\circ=60^\\circ$ の向き。' },
    { name: '最終', n: 5, A: 135, S: 30,
      d0: '(\\cos135^\\circ,\\ \\sin135^\\circ)', d0s: '135^\\circ', a: '30^\\circ',
      step2: '\\cos30^\\circ,\\ \\sin30^\\circ\\ \\text{は自分で}',
      step3: 'x\'=x\\cos\\alpha-y\\sin\\alpha,\\qquad y\'=x\\sin\\alpha+y\\cos\\alpha',
      text: '最終ステージ：$135^\\circ$ の向きの弾を $30^\\circ$ 回した向きを計算して、x 成分・y 成分を入力しよう',
      hint: 'まず中心の向き $(\\cos135^\\circ,\\ \\sin135^\\circ)=\\left(-\\dfrac{\\sqrt2}{2},\\ \\dfrac{\\sqrt2}{2}\\right)$ を出してから、回転の式へ。',
      answer: '$(x,\\ y)=\\left(-\\dfrac{\\sqrt2}{2},\\ \\dfrac{\\sqrt2}{2}\\right)$、$\\cos30^\\circ=\\dfrac{\\sqrt3}{2},\\ \\sin30^\\circ=\\dfrac12$ なので<br>$x\'=-\\dfrac{\\sqrt2}{2}\\cdot\\dfrac{\\sqrt3}{2}-\\dfrac{\\sqrt2}{2}\\cdot\\dfrac12=-\\dfrac{\\sqrt6+\\sqrt2}{4}\\approx-0.966$<br>$y\'=-\\dfrac{\\sqrt2}{2}\\cdot\\dfrac12+\\dfrac{\\sqrt2}{2}\\cdot\\dfrac{\\sqrt3}{2}=\\dfrac{\\sqrt6-\\sqrt2}{4}\\approx0.259$（$165^\\circ$ の向き）' },
  ];
  DM_STAGES.forEach((S) => {
    S.enemies = [];
    for (let k = -(S.n - 1) / 2; k <= (S.n - 1) / 2; k++) S.enemies.push((S.A + k * S.S) * DEG);
    S.c0 = [clean(Math.cos(S.A * DEG)), clean(Math.sin(S.A * DEG))];
    S.tgt = [clean(Math.cos((S.A + S.S) * DEG)), clean(Math.sin((S.A + S.S) * DEG))];
  });

  function initGameDanmaku() {
    const root = $id('w-game-danmaku'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -10, xmax: 10, equal: true, yc: 0, ratio: [0.95, 0.6] });
    const DIST = 7, ER = 0.45, BR = 0.12, SPEED = 11, TOL = 0.02, ARW = 4.1;
    plot.onResize = () => fitCircle(plot, 8.6);
    fitCircle(plot, 8.6);
    // 入力欄：？の弾の向き（x 成分・y 成分）
    const grid = el('div', 'dm-grid');
    const inp = {};
    const lab = el('span', 'dm-lab'); setTex(lab, '\\text{？の弾の向き }(x\',\\ y\')');
    grid.append(lab);
    [['x', 'x 成分'], ['y', 'y 成分']].forEach(function (p) {
      const w = el('label', 'dm-in');
      const t = el('span', 'dm-k'); t.textContent = p[1];
      const i = document.createElement('input');
      i.type = 'text'; i.autocomplete = 'off'; i.spellcheck = false; i.setAttribute('inputmode', 'text');
      i.setAttribute('aria-label', '？の弾の向きの ' + p[1]);
      i.placeholder = '例 √3/2';
      w.append(t, i); grid.append(w); inp[p[0]] = i;
      i.addEventListener('input', () => { game.formula(); });
      i.addEventListener('focus', () => { st.last = i; });
      i.addEventListener('keydown', (e) => { if (e.key === 'Enter') fire(); });
    });
    ctl.append(grid);
    const tools = el('div', 'btn-row dm-tools');
    const bSq = el('button', 'btn small', '√ を入れる'); bSq.type = 'button';
    const bEx = el('button', 'btn small', '例のとおり入れる'); bEx.type = 'button';
    tools.append(bSq, bEx);
    ctl.append(tools);
    const B = L.game.gameButtons(ctl, '🚀 発射');
    const conf = L.game.Confetti(root, plot);
    const st = { last: null, bullets: [], alive: [], shots: [], flying: false, time: 0, pending: null };
    const S = () => DM_STAGES[game.k];
    bSq.addEventListener('mousedown', (e) => e.preventDefault());
    bSq.addEventListener('click', function () {
      const i = st.last || inp.x;
      const p = i.selectionStart != null ? i.selectionStart : i.value.length;
      i.value = i.value.slice(0, p) + '√' + i.value.slice(i.selectionEnd != null ? i.selectionEnd : p);
      i.focus(); try { i.setSelectionRange(p + 1, p + 1); } catch (e) { /* noop */ }
      game.formula();
    });
    bEx.addEventListener('click', function () {
      const ex = S().ex; if (!ex) return;
      inp.x.value = ex[0]; inp.y.value = ex[1]; game.formula();
      game.result('入りました。次は「🚀 発射」を押そう。', '');
    });
    const vals = () => ({ x: parseNum(inp.x.value), y: parseNum(inp.y.value) });
    const near = (u, v) => Math.abs(u[0] - v[0]) < TOL && Math.abs(u[1] - v[1]) < TOL;
    const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
    // まちがいの見当をつけて、何を見直せばよいかを返す
    function diagnose(u) {
      const s = S(), c0 = s.c0, t = s.tgt, al = s.S * DEG, l = Math.hypot(u[0], u[1]);
      const okX = Math.abs(u[0] - t[0]) < TOL, okY = Math.abs(u[1] - t[1]) < TOL;
      if (near(u, rot(c0, -al))) return '逆向き（時計回り）に回しています。$x\'=x\\cos\\alpha\\,\\red{-}\\,y\\sin\\alpha$、$y\'=x\\sin\\alpha\\,\\red{+}\\,y\\cos\\alpha$ の符号を確かめよう。';
      if (near(u, c0)) return 'それは中心の弾と同じ向きです。$\\alpha$ 回すのを忘れていませんか。';
      if (near(u, [t[1], t[0]])) return 'x 成分と y 成分が入れかわっています。';
      if ((c0[0] !== 1 || c0[1] !== 0) && near(u, [Math.cos(al), Math.sin(al)])) return 'それは $(1,\\ 0)$ を回した向き $(\\cos\\alpha,\\ \\sin\\alpha)$ です。中心の弾の向き $(x,\\ y)$ を式に入れよう。';
      if (near(u, [-t[0], t[1]]) || near(u, [t[0], -t[1]]) || near(u, [-t[0], -t[1]])) return '数の大きさは合っています。<b>符号（＋−）</b>を見直そう。';
      if (okX && !okY) return 'x 成分は正解！ y 成分 $y\'=x\\sin\\alpha+y\\cos\\alpha$ を見直そう。';
      if (okY && !okX) return 'y 成分は正解！ x 成分 $x\'=x\\cos\\alpha-y\\sin\\alpha$ を見直そう。';
      if (Math.abs(l - 1) > 0.05) return '向きの長さが 1 になっていません（$x\'^2+y\'^2\\approx' + num(l * l, 2) + '$）。回しても長さは変わらないので、計算を見直そう。';
      return 'x 成分も y 成分もずれています。手順③の式に、1つずつ数を入れて計算しよう。';
    }
    function fire() {
      if (game.done || game.used >= game.max || st.flying) return;
      const v = vals();
      if (!isFinite(v.x) || !isFinite(v.y)) {
        game.result((!isFinite(v.x) ? 'x 成分' : 'y 成分') + 'が読み取れません。数（例 0.5、√3/2、-1/2）を入れよう。', 'miss');
        return;
      }
      const s = S(), u = [v.x, v.y], ok = near(u, s.tgt);
      // プログラムは「中心 → あなたの向き」の回転をくり返す（反対側は逆に回す）
      const c0 = s.c0, phi = ok ? s.S * DEG : Math.atan2(c0[0] * u[1] - c0[1] * u[0], c0[0] * u[0] + c0[1] * u[1]);
      game.used++; game.renderThrows();
      st.alive = s.enemies.map(() => true);
      const half = (s.n - 1) / 2, ds = [];
      for (let k = -half; k <= half; k++) ds.push(rot(c0, k * phi));
      st.bullets = ds.map((d) => ({ ux: d[0], uy: d[1], r: 0.6, on: true }));
      st.shots.push(ds);
      st.pending = { ok, msg: ok ? '' : diagnose(u), deg: phi / DEG };
      st.flying = true; st.time = 0; B.bMain.disabled = true;
      game.result('発射！', '');
      anim.kick();
    }
    function settle() {
      st.flying = false;
      const p = st.pending || {}, s = S();
      if (p.ok) {
        st.alive = s.enemies.map(() => false);
        const n = 4 - game.used; game.award(n); game.done = true; B.bNext.hidden = game.k >= DM_STAGES.length - 1;
        game.result('🎯 全滅！ ' + L.game.starStr(n) + '（' + game.used + ' 回目）', 'hit');
        conf.fire(plot.X(0), plot.Y(DIST * 0.6));
      } else {
        const left = st.alive.filter(Boolean).length;
        let t = (left ? '残った敵が ' + left + ' 機。' : Math.abs(Math.abs(p.deg) - s.S) < 0.5 ? '敵には当たったけれど、入力が「？」の弾の向きではありません。' : '当たったけれど、計算が少しずれています（小数なら第3位まで）。') +
          'あなたの弾は約 $' + num(p.deg, 1) + '^\\circ$ ずつ回りました（ねらいは $' + s.S + '^\\circ$）。' + p.msg;
        if (game.used >= game.max) t += '　― 3回使い切りました。「やり直す」で再挑戦！';
        else B.bMain.disabled = false;
        game.result(t, 'miss');
        st.alive = s.enemies.map(() => true);
      }
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      st.time += dt;
      if (st.flying) {
        const E = S().enemies;
        let any = false;
        st.bullets.forEach(function (b) {
          if (!b.on) return;
          b.r += SPEED * dt;
          const bx = b.ux * b.r, by = b.uy * b.r;
          E.forEach(function (ea, j) {
            if (!st.alive[j] || !b.on) return;
            const ex = DIST * Math.cos(ea), ey = DIST * Math.sin(ea);
            if (Math.hypot(bx - ex, by - ey) < ER + BR) { st.alive[j] = false; b.on = false; conf.fire(plot.X(ex), plot.Y(ey)); }
          });
          if (b.r > 13) b.on = false;
          if (b.on) any = true;
        });
        if (!any) settle();
      }
      plot.invalidate();
      return true;                                   // 敵がふわふわ動くので、見えている間は描き続ける（画面外では止まる）
    });
    const stepsBox = R(root, 'steps');
    function renderSteps(s) {
      const li = (no, ttl, body) => '<li><span class="dm-no">' + no + '</span><b>' + ttl + '</b>' + body + '</li>';
      let h = '<div class="dm-steps-ttl">' + (s.tutorial ? 'やり方（れんしゅう：この通りにやってみよう）' : 'やり方') + '</div><ol>';
      h += li('①', '知っている向き', '中心の弾（図の黒い矢印）$(x,\\ y)=' + s.d0 + '$');
      h += li('②', '回す角度', '$\\blue{\\alpha}=' + s.a + '$（図の青い弧）<br>' + s.step2.split(',\\quad ').map((t) => '$' + t + '$').join('、 ') + (s.note || ''));
      h += li('③', '回転の式に入れる', s.step3.split(',\\qquad ').map((t) => '<span class="dm-eq">$' + t + '$</span>').join(''));
      h += li('④', '入力して発射', '「x 成分」に $x\'$、「y 成分」に $y\'$ を入れて「🚀 発射」');
      h += '</ol>';
      if (s.tutorial) h += '<div class="dm-ex">記入例：<span class="dm-box">x 成分 <code>√3/2</code></span><span class="dm-box">y 成分 <code>1/2</code></span>（小数なら <code>0.866</code> と <code>0.5</code>）</div>';
      stepsBox.innerHTML = h; typeset(stepsBox);
    }
    const game = L.game.GameShell(root, { key: '3-5:game', stages: DM_STAGES,
      formula() {
        const v = vals();
        if (!isFinite(v.x) && !isFinite(v.y)) return '\\text{x 成分・y 成分を入力しよう}';
        const f = (w) => (isFinite(w) ? num(w, 3) : '?');
        let t = '(x\',\\ y\')\\approx(' + f(v.x) + ',\\ ' + f(v.y) + ')';
        if (isFinite(v.x) && isFinite(v.y)) t += ',\\ \\ x\'^2+y\'^2\\approx' + num(v.x * v.x + v.y * v.y, 2);
        return t;
      },
      onStage() {
        const s = S();
        inp.x.value = ''; inp.y.value = '';
        bEx.hidden = !s.tutorial;
        st.bullets = []; st.shots = []; st.flying = false; st.pending = null; st.alive = s.enemies.map(() => true);
        B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission'));
        renderSteps(s);
        plot.invalidate();
      } });
    B.bMain.addEventListener('click', fire);
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, DM_STAGES.length - 1)));
    function enemy(g, x, y, j) {
      const c = g.c, ctx = g.ctx, px = g.X(x), py = g.Y(y), r = 0.58 * g.pxPerX;      // 見た目は当たり判定より少し大きめ
      ctx.save();
      ctx.fillStyle = c.violet; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.ellipse(px, py + r * 0.15, r * 1.45, r * 0.55, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = c.violet;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';
      const blink = (st.time * 0.9 + j * 0.37) % 3 < 0.12;          // ときどき まばたき
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        if (blink) ctx.fillRect(px + s * r * 0.36 - r * 0.2, py - r * 0.12, r * 0.4, r * 0.08);
        else { ctx.arc(px + s * r * 0.36, py - r * 0.1, r * 0.22, 0, TAU); ctx.fill(); }
      });
      ctx.fillStyle = '#222';
      if (!blink) [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(px + s * r * 0.36 - 0.06 * r * Math.sign(x), py - r * 0.06, r * 0.1, 0, TAU); ctx.fill(); });
      ctx.restore();
    }
    // 矢印の横のラベル：p は向き、r は原点からの距離、side は +1（反時計回り側）か −1（時計回り側）
    function sideLabel(g, str, p, r, side, o) {
      const q = [-p[1] * side, p[0] * side], x = r * p[0] + 0.55 * q[0], y = r * p[1] + 0.55 * q[1];
      const ax = q[0] < -0.3 ? 'right' : q[0] > 0.3 ? 'left' : 'center';
      g.tex(str, x, y, Object.assign({ align: ax, dy: ax === 'center' ? (q[1] > 0 ? -8 : 8) : 0, size: 14, avoid: true }, o));
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, s = S(), a0 = s.A * DEG, al = s.S * DEG;
      // うすい円と角度の目盛り（30° ごと）
      [3.5, 7].forEach((r) => circlePx(g, 0, 0, r, { color: c.grid, width: 1, dash: [3, 6] }));
      for (let k = 0; k < 12; k++) {
        const a = k * PI / 6;
        g.line(8.0 * Math.cos(a), 8.0 * Math.sin(a), 8.4 * Math.cos(a), 8.4 * Math.sin(a), { color: c.muted, width: 1.2 });
      }
      // これまでに撃った向き
      st.shots.forEach(function (sh, i) {
        if (i === st.shots.length - 1 && st.flying) return;
        sh.forEach((d) => g.line(0, 0, 12 * d[0], 12 * d[1], { color: c.muted, width: 1.2, dash: [3, 5], alpha: 0.6 }));
      });
      // 問題の図：わかっている向き（黒）・計算する向き（？）・そのあいだの角 α
      const d0 = [Math.cos(a0), Math.sin(a0)], d1 = [Math.cos(a0 + al), Math.sin(a0 + al)];
      s.enemies.forEach(function (ea, j) {
        const k = j - (s.n - 1) / 2;
        if (k === 0 || k === 1) return;
        const p = [Math.cos(ea), Math.sin(ea)];
        g.line(4.4 * p[0], 4.4 * p[1], 5.6 * p[0], 5.6 * p[1], { color: c.muted, width: 1.3, dash: [4, 5], alpha: 0.7 });
        g.tex('?', 5.95 * p[0], 5.95 * p[1], { align: 'center', size: 13, color: c.muted });
      });
      arcAt(g, 0, 0, 2.1, a0, a0 + al, { color: c.primary, width: 2.5, arrow: true });
      const wide = g.w >= 520, aT = (wide ? '\\alpha=' : '') + s.a;
      if (s.S >= 30) g.tex(aT, 2.75 * Math.cos(a0 + al / 2), 2.75 * Math.sin(a0 + al / 2), { align: 'center', size: 14, color: c.primary, avoid: true });
      else sideLabel(g, aT, d1, 1.9, 1, { size: 14, color: c.primary });
      g.arrow(0.9 * d1[0], 0.9 * d1[1], ARW * d1[0], ARW * d1[1], { color: c.amber, width: 2.8, head: 11, dash: [7, 5] });
      g.arrow(0.9 * d0[0], 0.9 * d0[1], ARW * d0[0], ARW * d0[1], { color: c.text, width: 3.2, head: 12 });
      // 中心の向きのラベルは砲台のうしろ側（敵のいない側）に置く
      const d0t = s.d0.replace(/\\dfrac/g, '\\tfrac'), bx = -1.25 * d0[0], by = -1.25 * d0[1];
      g.tex(wide ? '\\text{中心の弾 }' + d0t : '\\text{中心 }' + (s.d0s || d0t), bx, by, { align: d0[0] > 0.3 ? 'right' : d0[0] < -0.3 ? 'left' : 'center', dy: Math.abs(d0[0]) <= 0.3 ? (d0[1] > 0 ? 12 : -12) : 0, size: 13, color: c.text, avoid: true });
      sideLabel(g, wide ? '\\text{？}\\ (x\',\\ y\')' : '\\text{？}', d1, 3.4, 1, { color: c.amber, size: wide ? 15 : 18 });
      // 敵
      s.enemies.forEach(function (ea, j) {
        if (!st.alive[j]) return;
        const wob = 0.12 * Math.sin(st.time * 2.2 + j);
        enemy(g, (DIST + wob) * Math.cos(ea), (DIST + wob) * Math.sin(ea), j);
      });
      // 弾（尾を引く）
      st.bullets.forEach(function (b) {
        if (!b.on) return;
        const x = b.ux * b.r, y = b.uy * b.r;
        g.line(b.ux * Math.max(0.6, b.r - 1.6), b.uy * Math.max(0.6, b.r - 1.6), x, y, { color: c.amber, width: 3, alpha: 0.45 });
        g.dot(x, y, { r: 5, color: c.amber });
      });
      // 砲台：中心の向きへ砲身
      ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = c.text; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(1.1 * d0[0]), g.Y(1.1 * d0[1])); ctx.stroke();
      ctx.fillStyle = c.primary; ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), 0.55 * g.pxPerX, 0, TAU); ctx.fill();
      ctx.restore();
      conf.draw(g);
    };
    game.setStage(0);
  }

  T.boot([
    [initUnroll, 'w-unroll'],
    [initShm, 'w-shm'],
    [initRot, 'w-rot'],
    [initAdd, 'w-add'],
    [initGameDanmaku, 'w-game-danmaku'],
  ]);
})();
