/* 第3章 3.6節 三角関数のグラフ — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 *
 * この節だけの部品
 *   waveAxes(g, o)        … 横軸の目盛りを π/2 の倍数（TeX）にした方眼
 *   waveTeX(A, B, p, q)   … y = A sin(B(x − p)) + q の式（色つき・簡単な形に）
 *   piPlain(v) / bPlain(v) … スライダーの右に出す「π/6」「1/2」などの文字
 *   ほどく図（単位円＋グラフ）は、円と同じ縮尺の座標の中で、グラフの横だけ k 倍して描く
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI, H = PI / 2;
  const C = (c, s) => '\\' + c + '{' + s + '}';
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const mod2pi = (a) => { a = a % TAU; if (a < 0) a += TAU; return a; };
  const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

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
  // スライダーの右の数字（ただの文字）
  function piPlain(v) {
    const k = Math.round(v / (PI / 12));
    if (!k) return '0';
    const g = gcd(Math.abs(k), 12), n = Math.abs(k) / g, d = 12 / g;
    return (k < 0 ? '−' : '') + (n === 1 ? '' : n) + 'π' + (d === 1 ? '' : '/' + d);
  }
  const bPlain = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : Math.round(v * 2) + '/2');
  const bTeX = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : '\\frac{' + Math.round(v * 2) + '}{2}');
  const nTeX = (v) => num(v, 2);
  // y = A sin(B(x − p)) + q を、なるべく簡単な形で（色をつけるときは col=true）
  function waveTeX(A, B, p, q, col, fn) {
    fn = fn || '\\sin';
    const cA = (s) => (col ? C('violet', s) : s), cB = (s) => (col ? C('amber', s) : s), cP = (s) => (col ? C('teal', s) : s), cQ = (s) => (col ? C('red', s) : s);
    const a = A === 1 ? '' : A === -1 ? '-' : cA(nTeX(A));
    const b = B === 1 ? '' : cB(bTeX(B));
    const pp = Math.abs(p) < 1e-9 ? '' : (p > 0 ? '-' : '+') + cP(T.radTeX(Math.abs(p)));
    let body;
    if (!pp) body = fn + (b ? ' ' + b + 'x' : ' x');
    else if (!b) body = fn + '\\left(x' + pp + '\\right)';
    else body = fn + '\\left(' + b + '\\left(x' + pp + '\\right)\\right)';
    const qq = Math.abs(q) < 1e-9 ? '' : (q > 0 ? '+' : '-') + cQ(nTeX(Math.abs(q)));
    return 'y=' + a + body + qq;
  }

  // 横軸の目盛りを π/2 の倍数にした方眼（ラベルはすべて TeX）
  function waveAxes(g, o) {
    o = o || {};
    const c = g.c, sy = o.stepY || 1;
    g.grid({ stepX: H, stepY: sy, labels: false, xlabel: o.xlabel == null ? 'x' : o.xlabel, ylabel: o.ylabel == null ? 'y' : o.ylabel });
    let m = 1;
    while (g.pxPerX * H * m < (o.minPx || 38)) m *= 2;
    const hasX0 = g.ymin <= 0 && g.ymax >= 0, y0 = hasX0 ? g.Y(0) : g.h - 16;
    for (let i = Math.ceil(g.xmin / H); i * H <= g.xmax + 1e-9; i++) {
      if (i === 0 || i % m) continue;
      const px = g.X(i * H);
      if (px > g.w - 18 || px < 14) continue;
      g.texPx(T.radTeX(i * H), px + (i < 0 ? -2 : 0), y0 + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
    }
    const pxy = (g.h / (g.ymax - g.ymin)) * sy;
    let my = 1;
    while (pxy * my < 24) my++;
    const hasY0 = g.xmin <= 0 && g.xmax >= 0, x0 = hasY0 ? g.X(0) : 30;
    for (let j = Math.ceil(g.ymin / sy); j * sy <= g.ymax + 1e-9; j++) {
      if (!j || j % my) continue;
      const py = g.Y(j * sy);
      if (py < 22 || py > g.h - 8) continue;
      const inR = x0 < 28;                                     // 縦軸が左端に近いときは、軸の右に書く
      g.texPx(num(j * sy, 2), inR ? x0 + 5 : x0 - 6, py, { align: inR ? 'left' : 'right', size: 13, color: c.muted });
    }
    if (hasX0 && hasY0) g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
  }

  /* ---------- 単位円＋グラフを1枚に（同じ縦の縮尺） ----------
     st: { gx0, k } グラフの原点の位置と横の倍率。U(x) = gx0 + k x */
  function sideLayout(plot, o) {
    const w = plot.w || 600, hh = plot.h || 300;
    const spanY = 2 * o.halfY, span = spanY * w / hh;
    const left = o.left, gap = o.gap, right = 0.35;
    let k = (left + span - right - (o.circR + gap)) / TAU;
    k = clamp(k, 0.2, o.kmax || 1);
    const content = (o.circR + gap) + TAU * k + right - left;
    const xmin = left - Math.max(0, span - content) / 2;
    plot.setView({ xmin, xmax: xmin + span, yc: 0 });
    return { gx0: o.circR + gap, k };
  }
  function sideAxes(g, lay, o) {
    const c = g.c, U = (x) => lay.gx0 + lay.k * x;
    const top = g.ymax - 0.08, bot = g.ymin + 0.08;
    // 単位円の軸
    g.line(-1.2, 0, 1.2 + (o.circExtra || 0), 0, { color: c.axis, width: 1.2 });
    g.line(0, bot, 0, top, { color: c.axis, width: 1.2 });
    // グラフの軸
    g.line(lay.gx0, 0, U(TAU) + 0.25, 0, { color: c.axis, width: 1.5 });
    g.line(lay.gx0, bot, lay.gx0, top, { color: c.axis, width: 1.5 });
    // 方眼（グラフの部分だけ）
    for (let i = 1; i <= 4; i++) g.line(U(i * H), bot, U(i * H), top, { color: c.grid, width: 1 });
    (o.yt || [-1, 1]).forEach((v) => g.line(lay.gx0, v, U(TAU), v, { color: c.grid, width: 1 }));
    // 目盛り
    let m = 1;
    while (g.pxPerX * lay.k * H * m < 34) m *= 2;
    for (let i = 1; i <= 4; i++) {
      if (i % m) continue;
      g.tex(T.radTeX(i * H), U(i * H), 0, { align: 'center', valign: 'top', dy: 5, size: 13, color: c.muted });
    }
    (o.yt || [-1, 1]).forEach((v) => g.tex(num(v), lay.gx0, v, { align: 'right', dx: -5, size: 13, color: c.muted }));
    g.tex('x', U(TAU) + 0.25, 0, { align: 'right', valign: 'bottom', dy: -4, size: 15, color: c.muted });
    g.tex('y', lay.gx0, top, { align: 'left', valign: 'top', dx: 6, size: 15, color: c.muted });
    // 単位円
    const ctx = g.ctx; ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), g.pxPerX, 0, TAU); ctx.stroke(); ctx.restore();
    return U;
  }
  function circleArc(g, th, o) {
    const n = Math.max(6, Math.ceil(th / 0.04)), pts = [], r = o.r || 1;
    for (let i = 0; i <= n; i++) { const a = th * i / n; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    if (th > 1e-6) g.poly(pts, { color: o.color, width: o.width || 4 });
  }
  function playButton(btn, st, anim) {
    const show = () => { btn.textContent = st.play ? '⏸ 止める' : '▶ 回す'; };
    btn.addEventListener('click', () => { st.play = !st.play; show(); if (st.play) anim.kick(); });
    show();
    return show;
  }

  /* ==========================================================
     3.6(1) 単位円をほどく
     ========================================================== */
  function initUnwrap() {
    const root = $id('w-unwrap');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.3, xmax: 7, equal: true, yc: 0, ratio: [0.5, 0.34] });
    const LO = { halfY: 1.42, left: -1.3, circR: 1, gap: 0.45, kmax: 1 };
    let lay = { gx0: 1.45, k: 0.8 };
    plot.onResize = () => { lay = sideLayout(plot, LO); };
    lay = sideLayout(plot, LO);
    const st = { th: PI / 3, mode: 0, play: false };
    const f = (x) => (st.mode ? Math.cos(x) : Math.sin(x));
    const ctl = root.querySelector('.controls');
    const sl = slider(ctl, { tex: '\\blue{x}', min: 0, max: 360, step: 5, value: 60, color: 'primary', aria: '回った角 x（度）', fmt: (v) => v + '°' });
    sl.on((v) => { st.th = v * PI / 180; st.play = false; showPlay(); update(); });
    const HOW = [
      '単位円の点の<b>縦の影</b>（赤）の長さを、そのまま右のグラフの高さに写す。横軸は回った角（青い弧の長さ）。',
      '<b>横の影</b>（緑）を $90^\\circ$ 起こして縦にし、右のグラフの高さに写す。$\\sin$ のグラフを左に $\\frac{\\pi}{2}$ ずらした形になる。',
    ];
    chipRow(R(root, 'mode'), [{ label: 'y = sin x' }, { label: 'y = cos x' }], 0, (it, i) => { st.mode = i; showHow(); update(); });
    function showHow() { const h = R(root, 'how'); h.innerHTML = HOW[st.mode]; typeset(h); }
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.th += dt * 0.9;
      if (st.th > TAU) st.th -= TAU;
      update();
      return true;
    });
    const showPlay = playButton(R(root, 'play'), st, anim);
    T.angleHandle(plot, () => st.th, (a) => { st.th = mod2pi(a); st.play = false; showPlay(); update(); }, { snap: PI / 36 });
    plot.addHandle({ get x() { return lay.gx0 + lay.k * st.th; }, get y() { return f(st.th); },
      get color() { return plot.c ? (st.mode ? plot.c.teal : plot.c.accent) : '#d33'; }, r: 7,
      drag(x) { st.th = clamp((x - lay.gx0) / lay.k, 0, TAU); st.th = Math.round(st.th / (PI / 36)) * (PI / 36); st.play = false; showPlay(); update(); } });
    function update() {
      const th = st.th, v = clean(f(th));
      sl.set(Math.round(th * 180 / PI));
      const near = Math.abs(th / (PI / 12) - Math.round(th / (PI / 12))) < 1e-6;
      tex(root, 'ang', '\\blue{x}=' + (near ? T.angleTeX(th) : num(th, 2) + '\\,(\\approx' + Math.round(th * 180 / PI) + '^\\circ)'));
      tex(root, 'val', (st.mode ? '\\teal{\\cos x}' : '\\red{\\sin x}') + (near ? '=' + T.exactTeX(v) : '\\approx' + num(v, 3)));
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, th = st.th, x = Math.cos(th), y = Math.sin(th), col = st.mode ? c.teal : c.accent;
      const U = sideAxes(g, lay, {});
      // もう一方のグラフ（うすく）と、このグラフの全体（点線）
      g.poly(sample((t) => [U(t), st.mode ? Math.sin(t) : Math.cos(t)]), { color: st.mode ? c.accent : c.teal, width: 1.5, alpha: 0.25 });
      g.poly(sample((t) => [U(t), f(t)]), { color: col, width: 2, dash: [5, 5], alpha: 0.55 });
      g.poly(sample((t) => [U(t), f(t)], th), { color: col, width: 4 });
      // ほどいた弧：円の上の弧と、横軸の上の長さが同じ
      circleArc(g, th, { color: c.primary, width: 4 });
      if (th > 1e-6) g.line(U(0), 0, U(th), 0, { color: c.primary, width: 4, alpha: lay.k < 0.999 ? 0.75 : 1 });
      const v = f(th);
      if (st.mode === 0) {
        g.line(x, 0, x, y, { color: c.accent, width: 3.5 });
        g.line(x, y, U(th), y, { color: c.muted, width: 1.4, dash: [4, 4] });
      } else {
        g.line(0, 0, x, 0, { color: c.teal, width: 3.5 });
        // 横の影を 90° 起こす
        const a0 = x >= 0 ? 0 : PI, r = Math.abs(x);
        if (r > 0.02) {
          const pts = [];
          for (let i = 0; i <= 20; i++) { const a = a0 + H * i / 20; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
          g.poly(pts, { color: c.teal, width: 1.5, dash: [3, 4] });
        }
        g.line(0, 0, 0, x, { color: c.teal, width: 3.5, alpha: 0.85 });
        g.line(0, x, U(th), x, { color: c.muted, width: 1.4, dash: [4, 4] });
      }
      g.line(U(th), 0, U(th), v, { color: col, width: 3.5 });
      g.line(0, 0, x, y, { color: c.text, width: 2.5 });
      g.dot(x, y, { r: 5, color: c.primary });
      g.tex('\\mathrm{P}', 1.2 * x, 1.2 * y, { color: c.primary, size: 15, align: 'center' });
      // グラフの名前
      g.tex(st.mode ? 'y=\\cos x' : 'y=\\sin x', U(st.mode ? PI : 3 * H), 1.2, { color: col, size: 15, align: 'center' });
    };
    function sample(fn, upto) {
      const end = upto == null ? TAU : upto, n = Math.max(2, Math.ceil(end / 0.03)), pts = [];
      for (let i = 0; i <= n; i++) pts.push(fn(end * i / n));
      return pts;
    }
    showHow(); update();
  }

  /* ==========================================================
     3.6(2) y = A sin(B(x − p)) + q
     ========================================================== */
  function initABPQ() {
    const root = $id('w-abpq');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -PI - 0.25, xmax: TAU + 0.35, ymin: -5.4, ymax: 5.4, ratio: [0.85, 0.5] });
    const st = { A: 1, B: 1, p: 0, q: 0 };
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: '\\violet{A}', min: -3, max: 3, step: 0.5, value: 1, color: 'violet', aria: '縦の倍率 A' });
    const sB = slider(ctl, { tex: '\\amber{B}', min: 0.5, max: 3, step: 0.5, value: 1, color: 'amber', aria: '横の縮み B', fmt: bPlain });
    const sP = slider(ctl, { tex: '\\teal{p}', min: -12, max: 12, step: 1, value: 0, color: 'teal', aria: '右へのずれ p（π/12 ごと）', fmt: (k) => piPlain(k * PI / 12) });
    const sQ = slider(ctl, { tex: '\\red{q}', min: -2, max: 2, step: 0.5, value: 0, color: 'accent', aria: '上へのずれ q' });
    const PRE = [
      { tex: '\\sin x', v: [1, 1, 0, 0] }, { tex: '2\\sin x', v: [2, 1, 0, 0] }, { tex: '\\sin 2x', v: [1, 2, 0, 0] },
      { tex: '3\\sin\\frac{x}{2}', v: [3, 0.5, 0, 0] }, { tex: '\\sin\\left(x-\\frac{\\pi}{3}\\right)+1', v: [1, 1, PI / 3, 1] },
      { tex: '\\cos x=\\sin\\left(x+\\frac{\\pi}{2}\\right)', v: [1, 1, -H, 0] },
    ];
    const pre = chipRow(R(root, 'presets'), PRE, 0, (it) => { [st.A, st.B, st.p, st.q] = it.v; sync(); update(); });
    function sync() { sA.set(st.A); sB.set(st.B); sP.set(Math.round(st.p / (PI / 12))); sQ.set(st.q); }
    const mv = () => unpress(pre);
    sA.on((v) => { if (v === 0) { v = st.A > 0 ? -0.5 : 0.5; sA.set(v); } st.A = v; mv(); update(); });
    sB.on((v) => { st.B = v; mv(); update(); });
    sP.on((k) => { st.p = k * PI / 12; mv(); update(); });
    sQ.on((v) => { st.q = v; mv(); update(); });
    const f = (x) => st.A * Math.sin(st.B * (x - st.p)) + st.q;
    function update() {
      const { A, B, p, q } = st, per = TAU / B;
      tex(root, 'eq', waveTeX(A, B, p, q, true));
      tex(root, 'amp', '|' + C('violet', 'A') + '|=' + C('violet', nTeX(Math.abs(A))) + '\\quad(\\text{高さ } ' + nTeX(q - Math.abs(A)) + '\\text{〜}' + nTeX(q + Math.abs(A)) + ')');
      tex(root, 'per', '\\dfrac{2\\pi}{' + C('amber', 'B') + '}=\\dfrac{2\\pi}{' + C('amber', bTeX(B)) + '}=' + T.radTeX(per) + (B === 1 ? '' : '\\quad(\\text{横に } ' + (B > 1 ? '\\frac{1}{' + bTeX(B) + '}' : '2') + '\\text{ 倍})'));
      tex(root, 'shift', Math.abs(p) < 1e-9 ? C('teal', 'p') + '=0\\ \\text{（ずれなし）}'
        : C('teal', 'p') + '=' + C('teal', T.radTeX(p)) + '\\ \\text{（' + (p > 0 ? '右' : '左') + 'に }' + T.radTeX(Math.abs(p)) + '\\text{）}');
      tex(root, 'mid', 'y=' + C('red', nTeX(q)) + (q === 0 ? '' : '\\ \\text{（' + (q > 0 ? '上' : '下') + 'に }' + nTeX(Math.abs(q)) + '\\text{）}'));
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, { A, B, p, q } = st, per = TAU / B;
      waveAxes(g, {});
      g.fn(Math.sin, { color: c.muted, width: 2, dash: [5, 5], alpha: 0.7 });
      // 中心の線 y = q
      if (q !== 0) g.line(g.xmin, q, g.xmax, q, { color: c.accent, width: 1.5, dash: [8, 6], alpha: 0.8 });
      g.fn(f, { color: c.primary, width: 4 });
      // 1周期ぶんの区間（p から始める。画面に入るようにずらす）
      let s = p;
      while (s - per >= g.xmin + 0.05) s -= per;
      while (s < g.xmin + 0.05) s += per;
      const e = Math.min(s + per, g.xmax - 0.05);
      let yb = Math.min(q - Math.abs(A) - 0.55, -1.3);           // 谷の下（横軸の目盛りとは重ねない）
      if (yb < g.ymin + 0.4) yb = q + Math.abs(A) + 0.6 < g.ymax - 0.9 ? q + Math.abs(A) + 0.6 : g.ymin + 0.4;
      const lbBelow = yb > g.ymin + 1.1;
      g.line(s, yb, e, yb, { color: c.amber, width: 2.5 });
      g.line(s, yb - 0.2, s, yb + 0.2, { color: c.amber, width: 2.5 });
      if (e === s + per) g.line(e, yb - 0.2, e, yb + 0.2, { color: c.amber, width: 2.5 });
      g.tex('\\text{周期 }' + T.radTeX(per), (s + e) / 2, yb, { color: c.amber, size: 14, align: 'center', valign: lbBelow ? 'top' : 'bottom', dy: lbBelow ? 4 : -4, avoid: true });
      // 波の始まりの点 (p, q) と、右へのずれ
      if (Math.abs(p) > 1e-9) g.arrow(0, q, p, q, { color: c.teal, width: 3.5, head: 12 });
      g.dot(s, q, { r: 5.5, color: c.teal });
      // 振幅：中心の線から山（A<0 なら谷）まで
      let xp = s + per / 4, best = Infinity;
      for (let n = -8; n <= 8; n++) {
        const x = p + per / 4 + n * per;
        if (x < g.xmin + 0.3 || x > g.xmax - 0.8) continue;
        const sc = Math.abs(x - 1.15 * PI) + (Math.abs(x) < 0.6 ? 10 : 0);
        if (sc < best) { best = sc; xp = x; }
      }
      g.arrow(xp, q, xp, q + A, { color: c.violet, width: 3, head: 11 });
      const tip = q + A, roomOut = A > 0 ? tip < g.ymax - 1 : tip > g.ymin + 1;
      if (roomOut) g.tex(C('violet', '|A|=' + nTeX(Math.abs(A))), xp, tip, { size: 14, align: 'center', valign: A > 0 ? 'bottom' : 'top', dy: A > 0 ? -5 : 5, avoid: true });
      else g.tex(C('violet', '|A|=' + nTeX(Math.abs(A))), xp, q + A / 2, { size: 14, dx: 8, align: 'left', avoid: true });
      // 式（曲線の上側の、あいている所）
      const topY = q + Math.abs(A);
      const above = topY + 0.9 < g.ymax;
      g.tex(waveTeX(A, B, p, q, false), g.xmax - 0.15, above ? topY : q - Math.abs(A), { color: c.primary, size: 15, align: 'right', valign: above ? 'bottom' : 'top', dy: above ? -8 : 34, avoid: true });
      g.tex('y=\\sin x', -PI + 0.1, 1, { color: c.muted, size: 13, align: 'left', valign: 'bottom', dy: -4, avoid: true });
    };
    update();
  }

  /* ==========================================================
     3.6(3) 合成
     ========================================================== */
  const R3 = Math.sqrt(3);
  function sqrtTeX(n4) {           // √(n4/4) を簡単に
    let m = 1, s = n4;
    for (let d = 2; d * d <= s; d++) while (s % (d * d) === 0) { s /= d * d; m *= d; }
    // √(n4)/2 = m√s / 2
    const g = gcd(m, 2), num0 = m / g, den = 2 / g;
    const top = s === 1 ? String(num0) : (num0 === 1 ? '' : num0) + '\\sqrt{' + s + '}';
    return den === 1 ? top : '\\frac{' + top + '}{' + den + '}';
  }
  function initSynth() {
    const root = $id('w-synth');
    const cvs = root.querySelectorAll('canvas');
    const wide = () => window.matchMedia('(min-width: 760px)').matches;
    const pv = new Plot(cvs[0], { xmin: -3.6, xmax: 3.6, equal: true, yc: 0, height: (w) => (wide() ? 280 : clamp(w * 0.7, 200, 280)) });
    const pg = new Plot(cvs[1], { xmin: -PI / 2 - 0.3, xmax: TAU + 0.3, ymin: -4.7, ymax: 4.7, height: (w) => clamp(w * 0.6, 200, 280) });
    // 表示の大きさは r に合わせて3段階（ドラッグ中は変えない）
    const zoom = () => { const r = Math.hypot(st.a, st.b); return r <= 1.5 ? 1.9 : r <= 2.6 ? 3.1 : 4.6; };
    let zv = 0;
    const fitV = () => {
      zv = zoom();
      const s = (zv + 0.3) * Math.max(1, pv.w / pv.h);
      pv.setView({ xmin: -s, xmax: s, yc: 0 });
      pg.setView({ ymin: -zv - 0.2, ymax: zv + 0.2 });
    };
    pv.onResize = fitV;
    const st = { a: 1, b: 1, aT: '1', bT: '1' };
    fitV();
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\red{a}', min: -3, max: 3, step: 0.5, value: 1, color: 'accent', aria: 'sin の係数 a', fmt: (v) => (st.aT && st.aT.indexOf('sqrt') >= 0 ? L.minus(num(st.a, 2)) : L.minus(num(v, 1))) });
    const sb = slider(ctl, { tex: '\\teal{b}', min: -3, max: 3, step: 0.5, value: 1, color: 'teal', aria: 'cos の係数 b', fmt: (v) => (st.bT && st.bT.indexOf('sqrt') >= 0 ? L.minus(num(st.b, 2)) : L.minus(num(v, 1))) });
    const PRE = [
      { tex: '\\sin x+\\cos x', v: [1, 1, '1', '1'] },
      { tex: '\\sqrt3\\sin x+\\cos x', v: [R3, 1, '\\sqrt3', '1'] },
      { tex: '\\sin x-\\cos x', v: [1, -1, '1', '-1'] },
      { tex: '-\\sin x+\\sqrt3\\cos x', v: [-1, R3, '-1', '\\sqrt3'] },
      { tex: '2\\sin x+2\\cos x', v: [2, 2, '2', '2'] },
    ];
    const pre = chipRow(R(root, 'presets'), PRE, 0, (it) => { [st.a, st.b, st.aT, st.bT] = it.v; sa.set(st.a); sb.set(st.b); update(); });
    sa.on((v) => { st.a = v; st.aT = null; unpress(pre); update(); });
    sb.on((v) => { st.b = v; st.bT = null; unpress(pre); update(); });
    pv.addHandle({ get x() { return st.a; }, get y() { return st.b; }, get color() { return pv.c ? pv.c.violet : '#84d'; }, r: 8,
      drag(x, y) {
        st.a = clamp(Math.round(x * 2) / 2, -3, 3); st.b = clamp(Math.round(y * 2) / 2, -3, 3);
        if (!st.a && !st.b) st.a = 0.5;
        st.aT = st.bT = null; unpress(pre); sa.set(st.a); sb.set(st.b); update();
      } });
    cvs[0].addEventListener('pointerup', () => setTimeout(() => { if (zoom() !== zv) fitV(); }, 0));
    const coefTeX = (v, t) => (t != null ? t : nTeX(v));
    function sumTeX() {
      const aT = coefTeX(st.a, st.aT), bT = coefTeX(st.b, st.bT);
      const term = (t, f, first) => {
        if (t === '0') return '';
        let s = t === '1' ? '' : t === '-1' ? '-' : t;
        if (!first && s[0] !== '-') s = '+' + s;
        if (!first && s === '+') s = '+';
        return s + f;
      };
      let s = term(aT, C('red', '\\sin x'), true);
      s += term(bT, C('teal', '\\cos x'), s === '');
      return s || '0';
    }
    function rInfo() {
      const r = Math.hypot(st.a, st.b), n4 = 4 * (st.a * st.a + st.b * st.b), N = Math.round(n4);
      const exact = Math.abs(n4 - N) < 1e-9;
      return { r, rT: exact ? sqrtTeX(N) : num(r, 3), exact, isInt: exact && Math.abs(r - Math.round(r)) < 1e-9 };
    }
    function alInfo() {
      const al = mod2pi(Math.atan2(st.b, st.a));
      const k = al / (PI / 12), ex = Math.abs(k - Math.round(k)) < 1e-6;
      return { al, alT: ex ? T.radTeX(Math.round(k) * PI / 12) : '\\approx' + num(al * 180 / PI, 1) + '^\\circ', ex };
    }
    function update() {
      const ri = rInfo(), ai = alInfo();
      const sq = '\\sqrt{' + C('red', st.aT && st.aT.indexOf('sqrt') >= 0 ? '(' + st.aT + ')' : (st.a < 0 ? '(' + nTeX(st.a) + ')' : nTeX(st.a))) + '^2+' +
        C('teal', st.bT && st.bT.indexOf('sqrt') >= 0 ? '(' + st.bT + ')' : (st.b < 0 ? '(' + nTeX(st.b) + ')' : nTeX(st.b))) + '^2}';
      tex(root, 'r', C('violet', 'r') + '=' + sq + '=' + C('violet', ri.rT) + (ri.exact && !ri.isInt ? '\\approx' + num(ri.r, 2) : ''));
      tex(root, 'al', C('blue', '\\alpha') + (ai.ex ? '=' : '') + ai.alT + '\\quad(\\cos\\alpha=\\tfrac{a}{r},\\ \\sin\\alpha=\\tfrac{b}{r})');
      const alS = ai.ex ? ai.alT : num(ai.al, 2);
      tex(root, 'eq', sumTeX() + (ai.ex ? '=' : '\\approx') + C('violet', ri.rT === '1' ? '' : ri.rT) + '\\sin\\left(x' + (ai.al < 1e-9 ? '' : '+' + C('blue', alS)) + '\\right)');
      if (!pv.active && zoom() !== zv) fitV();
      pv.invalidate(); pg.invalidate();
    }
    pv.draw = function (g) {
      const c = g.c, a = st.a, b = st.b, r = Math.hypot(a, b), al = Math.atan2(b, a);
      g.grid({ step: zv < 2 ? 0.5 : 1, labels: false, xlabel: '', ylabel: '' });
      const ctx = g.ctx; ctx.save(); ctx.strokeStyle = c.violet; ctx.globalAlpha = 0.45; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), r * g.pxPerX, 0, TAU); ctx.stroke(); ctx.restore();
      if (Math.abs(a) > 1e-9) g.line(0, 0, a, 0, { color: c.accent, width: 4 });
      if (Math.abs(b) > 1e-9) g.line(a, 0, a, b, { color: c.teal, width: 4 });
      // 角 α
      const am = mod2pi(al), n = 40, rr = Math.min(0.3 * zv, r * 0.45), pts = [];
      for (let i = 0; i <= n; i++) { const t = am * i / n; pts.push([rr * Math.cos(t), rr * Math.sin(t)]); }
      if (am > 1e-6) g.poly(pts, { color: c.primary, width: 3 });
      g.arrow(0, 0, a, b, { color: c.violet, width: 3.5, head: 14 });
      if (am > 1e-6) g.tex('\\alpha', (rr + 0.16 * zv) * Math.cos(am / 2), (rr + 0.16 * zv) * Math.sin(am / 2), { color: c.primary, size: 16, align: 'center' });
      if (Math.abs(a) > 1e-9) g.tex('a', a / 2, 0, { color: c.accent, size: 16, align: 'center', dy: b >= 0 ? 13 : -13 });
      if (Math.abs(b) > 1e-9) g.tex('b', a, b / 2, { color: c.teal, size: 16, align: a >= 0 ? 'left' : 'right', dx: a >= 0 ? 8 : -8 });
      const ux = a / (r || 1), uy = b / (r || 1);
      g.tex('r', a / 2 - uy * 0.15 * zv, b / 2 + ux * 0.15 * zv, { color: c.violet, size: 16, align: 'center' });
      g.texPx('\\mathrm{O}', g.X(0) - 4, g.Y(0) + 3, { align: 'right', valign: 'top', size: 13, color: c.muted });
    };
    pg.draw = function (g) {
      const c = g.c, a = st.a, b = st.b, r = Math.hypot(a, b), al = Math.atan2(b, a);
      waveAxes(g, {});
      g.line(g.xmin, r, g.xmax, r, { color: c.violet, width: 1.2, dash: [3, 5], alpha: 0.7 });
      g.line(g.xmin, -r, g.xmax, -r, { color: c.violet, width: 1.2, dash: [3, 5], alpha: 0.7 });
      g.fn((x) => a * Math.sin(x), { color: c.accent, width: 2.2, dash: [7, 5] });
      g.fn((x) => b * Math.cos(x), { color: c.teal, width: 2.2, dash: [7, 5] });
      g.fn((x) => a * Math.sin(x) + b * Math.cos(x), { color: c.violet, width: 4 });
      // 山の位置 x = π/2 − α（画面に入るように 2π ずらす）
      let xm = H - al;
      while (xm > g.xmax - 0.1) xm -= TAU;
      while (xm < g.xmin + 0.1) xm += TAU;
      g.dot(xm, r, { r: 5.5, color: c.violet });
      g.tex('\\text{山 }' + C('violet', 'r'), xm, r, { size: 14, align: 'left', valign: 'bottom', dx: 6, dy: -5, avoid: true });
    };
    update();
  }

  /* ==========================================================
     3.6(4) tan のグラフ
     ========================================================== */
  function initTan() {
    const root = $id('w-tan');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.3, xmax: 8, equal: true, yc: 0, ratio: [0.62, 0.4] });
    const LO = { halfY: 2.7, left: -1.3, circR: 1.15, gap: 0.55, kmax: 1.1 };
    let lay = { gx0: 1.7, k: 0.8 };
    plot.onResize = () => { lay = sideLayout(plot, LO); };
    lay = sideLayout(plot, LO);
    const st = { th: PI / 4, play: false };
    const ctl = root.querySelector('.controls');
    const sl = slider(ctl, { tex: '\\blue{x}', min: 0, max: 360, step: 5, value: 45, color: 'primary', aria: '回った角 x（度）', fmt: (v) => v + '°' });
    sl.on((v) => { st.th = v * PI / 180; st.play = false; showPlay(); update(); });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.th += dt * 0.6;
      if (st.th > TAU) st.th -= TAU;
      update();
      return true;
    });
    const showPlay = playButton(R(root, 'play'), st, anim);
    T.angleHandle(plot, () => st.th, (a) => { st.th = mod2pi(a); st.play = false; showPlay(); update(); }, { snap: PI / 36 });
    const atAsym = (th) => Math.abs(Math.cos(th)) < 1e-9;
    function update() {
      const th = st.th, near = Math.abs(th / (PI / 12) - Math.round(th / (PI / 12))) < 1e-6;
      sl.set(Math.round(th * 180 / PI));
      tex(root, 'ang', '\\blue{x}=' + (near ? T.angleTeX(th) : num(th, 2) + '\\,(\\approx' + Math.round(th * 180 / PI) + '^\\circ)'));
      const t = Math.tan(th);
      tex(root, 'val', atAsym(th) ? '\\amber{\\tan x}\\ \\text{は なし（漸近線）}' : '\\amber{\\tan x}' + (near ? '=' + T.exactTeX(clean(t)) : '\\approx' + num(t, 3)));
      const how = R(root, 'how');
      const msg = atAsym(th) ? '点が真上・真下にあると、半径の直線は $x=1$ と平行で交わらない。'
        : Math.abs(t) > 2.5 ? '点が真上（真下）に近いので、交点はとても高い（低い）所にある。'
          : Math.cos(th) < 0 ? '点が左半分にあるときは、半径を<b>反対側に延ばした</b>直線と $x=1$ の交点を見る。'
            : '半径を延ばした直線と、接線 $x=1$ の交点の高さが $\\tan x$。';
      if (how._m !== msg) { how._m = msg; how.innerHTML = msg; typeset(how); }
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, th = st.th, x = Math.cos(th), y = Math.sin(th);
      const U = sideAxes(g, lay, { yt: [-2, -1, 1, 2], circExtra: 0.1 });
      const top = g.ymax, bot = g.ymin;
      // 漸近線
      [H, 3 * H].forEach((a) => {
        g.line(U(a), bot, U(a), top, { color: c.amber, width: 1.5, dash: [6, 5], alpha: 0.8 });
      });
      g.tex('x=\\frac{\\pi}{2}', U(H), top, { color: c.amber, size: 13, align: 'left', valign: 'top', dx: 4, dy: 2 });
      g.tex('x=\\frac{3\\pi}{2}', U(3 * H), top, { color: c.amber, size: 13, align: 'left', valign: 'top', dx: 4, dy: 2 });
      // 全体（うすく）と、ここまで（太く）
      const piece = (a0, a1, o) => {
        const pts = [], n = 120;
        for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n, v = Math.tan(t); if (Math.abs(v) < 6) pts.push([U(t), v]); }
        if (pts.length > 1) g.poly(pts, o);
      };
      const eps = 0.005;
      [[0, H - eps], [H + eps, 3 * H - eps], [3 * H + eps, TAU]].forEach((s) => {
        piece(s[0], s[1], { color: c.amber, width: 2, dash: [5, 5], alpha: 0.5 });
        if (th > s[0]) piece(s[0], Math.min(th, s[1]), { color: c.amber, width: 4 });
      });
      // 接線 x = 1
      g.line(1, bot, 1, top, { color: c.amber, width: 1.5, alpha: 0.9 });
      g.tex('x=1', 1, bot, { color: c.amber, size: 13, align: 'left', valign: 'bottom', dx: 4, dy: -2 });
      circleArc(g, th, { color: c.primary, width: 4, r: 1 });
      if (!atAsym(th)) {
        const t = y / x, tc = clamp(t, bot - 1, top + 1);
        // 半径の直線を x=1 まで延ばす（左半分なら反対側へ）
        g.line(x < 0 ? x : 0, x < 0 ? y : 0, 1, tc, { color: c.amber, width: 1.6, dash: [5, 4] });
        if (Math.abs(t) < top) {
          g.dot(1, t, { r: 5.5, color: c.amber });
          g.line(1, t, U(th), t, { color: c.muted, width: 1.4, dash: [4, 4] });
          g.line(U(th), 0, U(th), t, { color: c.amber, width: 3.5 });
          g.dot(U(th), t, { r: 5, color: c.amber });
        } else {
          g.tex(t > 0 ? '\\uparrow' : '\\downarrow', 1, t > 0 ? top : bot, { color: c.amber, size: 16, align: 'left', valign: t > 0 ? 'top' : 'bottom', dx: 5, dy: t > 0 ? 18 : -18 });
        }
      } else {
        g.line(0, 0, 0, y * (top - 0.1), { color: c.amber, width: 1.6, dash: [5, 4] });
      }
      g.line(0, 0, x, y, { color: c.text, width: 2.5 });
      g.dot(x, y, { r: 5, color: c.primary });
      g.tex('y=\\tan x', U(TAU), 1.5, { color: c.amber, size: 15, align: 'right' });
    };
    update();
  }

  /* ==========================================================
     3.6(5) ゆらゆらアニメ
     ========================================================== */
  function initYura() {
    const root = $id('w-yura');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.95, 0.48] });
    const st = { A: 1, w: 3, ph: H, t: 0, play: !L.reduceMotion, ghost: true };
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: '\\violet{A}', min: 0, max: 1.5, step: 0.1, value: 1, color: 'violet', aria: 'ゆれの大きさ A' });
    const sW = slider(ctl, { tex: '\\amber{\\omega}', min: 0.5, max: 8, step: 0.5, value: 3, color: 'amber', aria: '速さ ω' });
    const sF = slider(ctl, { tex: '\\teal{\\varphi}', min: -12, max: 12, step: 1, value: 6, color: 'teal', aria: 'タイミングのずれ φ（π/12 ごと）', fmt: (k) => piPlain(k * PI / 12) });
    sA.on((v) => { st.A = v; update(); });
    sW.on((v) => { st.w = v; update(); });
    sF.on((k) => { st.ph = k * PI / 12; update(); });
    R(root, 'ghost').addEventListener('change', (e) => { st.ghost = e.target.checked; plot.invalidate(); });
    const bP = R(root, 'pause');
    const showP = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    bP.addEventListener('click', () => { st.play = !st.play; showP(); if (st.play) anim.kick(); });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt; plot.invalidate(); return true;
    });
    function update() {
      tex(root, 'eq', 'y=' + C('violet', num(st.A, 1)) + '\\sin(' + C('amber', num(st.w, 1)) + 't' + (Math.abs(st.ph) < 1e-9 ? '' : (st.ph > 0 ? '+' : '-') + C('teal', T.radTeX(Math.abs(st.ph)))) + ')');
      tex(root, 'per', '\\dfrac{2\\pi}{' + C('amber', '\\omega') + '}=\\dfrac{2\\pi}{' + num(st.w, 1) + '}\\approx' + num(TAU / st.w, 2) + '\\text{ 秒}');
      const fl = R(root, 'flag');
      if (!fl._s) { fl._s = 1; fl.innerHTML = '高さ $' + C('violet', 'A') + 's\\sin(' + C('amber', '\\omega') + ' t-6s+' + C('teal', '\\varphi') + ')$（$s$：根元からの距離 0〜1）。根元ほど位相が進み、波が先へ伝わる。'; typeset(fl); }
      plot.invalidate();
    }
    showP();
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, W = g.w, Hh = g.h, t = st.t;
      const narrow = W < 520;
      const topH = Hh * 0.62, unit = topH * 0.16;          // A=1 のときのゆれ幅（px）
      const yv = (ph) => st.A * Math.sin(st.w * t + ph);
      // 地面
      const ground = topH * 0.86;
      ctx.save(); ctx.strokeStyle = c.grid; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke(); ctx.restore();
      // キャラクター（お手本 φ=0 と、いまの φ）
      const bodyR = Math.min(W * 0.06, topH * 0.17), baseY = ground - bodyR - unit * 1.6 - 6;
      const chars = [];
      if (st.ghost) chars.push({ x: W * (narrow ? 0.14 : 0.12), ph: 0, a: 0.32, lab: '\\varphi=0' });
      chars.push({ x: W * (narrow ? 0.36 : 0.3), ph: st.ph, a: 1, lab: '\\varphi=' + T.radTeX(st.ph) });
      chars.forEach(function (ch) {
        const dy = yv(ch.ph) * unit, cy = baseY - dy;
        const br = 1 + 0.05 * Math.sin(st.w * t + ch.ph);       // 呼吸
        ctx.save(); ctx.globalAlpha = ch.a;
        // 影（高いほど小さく）
        const sh = 1 - 0.25 * (dy / (unit * 1.6 || 1));
        ctx.fillStyle = c.muted; ctx.globalAlpha = ch.a * 0.25;
        ctx.beginPath(); ctx.ellipse(ch.x, ground, bodyR * 0.9 * sh, bodyR * 0.22 * sh, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = ch.a;
        ctx.fillStyle = c.primary;
        ctx.beginPath(); ctx.ellipse(ch.x, cy, bodyR * br, bodyR * (2 - br), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ch.x - bodyR * 0.35, cy - bodyR * 0.15, bodyR * 0.2, 0, TAU); ctx.arc(ch.x + bodyR * 0.35, cy - bodyR * 0.15, bodyR * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1b2440';
        ctx.beginPath(); ctx.arc(ch.x - bodyR * 0.32, cy - bodyR * 0.12, bodyR * 0.09, 0, TAU); ctx.arc(ch.x + bodyR * 0.38, cy - bodyR * 0.12, bodyR * 0.09, 0, TAU); ctx.fill();
        ctx.restore();
        g.texPx(ch.lab, ch.x, ground + 4, { align: 'center', valign: 'top', size: 13, color: ch.ph === 0 && ch.a < 1 ? c.muted : c.teal });
      });
      // 旗
      const px = W * (narrow ? 0.58 : 0.55), fw = W * (narrow ? 0.34 : 0.32), fh = topH * 0.34, fTop = topH * 0.14;
      ctx.save(); ctx.strokeStyle = c.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, fTop - 6); ctx.lineTo(px, ground); ctx.stroke(); ctx.restore();
      const N = 30, kk = 6, amp = fh * 0.32;
      const off = (s) => st.A * s * amp * Math.sin(st.w * t - kk * s + st.ph);
      ctx.save(); ctx.fillStyle = c.accent; ctx.globalAlpha = 0.85; ctx.beginPath();
      for (let i = 0; i <= N; i++) { const s = i / N; ctx.lineTo(px + s * fw, fTop + off(s)); }
      for (let i = N; i >= 0; i--) { const s = i / N; ctx.lineTo(px + s * fw, fTop + fh + off(s)); }
      ctx.closePath(); ctx.fill();
      // 縦のしま（位相のずれが見えるように）
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      for (let i = 1; i < 6; i++) { const s = i / 6; ctx.beginPath(); ctx.moveTo(px + s * fw, fTop + off(s)); ctx.lineTo(px + s * fw, fTop + fh + off(s)); ctx.stroke(); }
      ctx.restore();
      // 下：時間のグラフ（最近の 4 秒）
      const gy0 = topH + 8, gh = Hh - gy0 - 8, gx0 = 34, gw = W - gx0 - 12, mid = gy0 + gh / 2, sc = gh / 2 / 1.7;
      ctx.save(); ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx0, mid); ctx.lineTo(gx0 + gw, mid); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy0 + gh); ctx.stroke(); ctx.restore();
      const span = 4, path = (ph, col, wdt, alpha) => {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.globalAlpha = alpha; ctx.beginPath();
        for (let i = 0; i <= 160; i++) { const tt = t - span + span * i / 160; const yy = st.A * Math.sin(st.w * tt + ph); const X = gx0 + gw * i / 160, Y = mid - yy * sc; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
        ctx.stroke(); ctx.restore();
      };
      if (st.ghost) path(0, c.muted, 2, 0.6);
      path(st.ph, c.primary, 3, 1);
      g.dot(g.ix(gx0 + gw), g.iy(mid - yv(st.ph) * sc), { r: 5, color: c.primary });
      g.texPx('y', gx0 - 8, gy0 + 2, { align: 'right', valign: 'top', size: 14, color: c.muted });
      g.texPx('\\text{いま}', gx0 + gw, gy0 + gh, { align: 'right', valign: 'bottom', size: 12, color: c.muted });
      g.texPx('\\text{4 秒前}', gx0 + 2, gy0 + gh, { align: 'left', valign: 'bottom', size: 12, color: c.muted });
    };
    update();
    if (st.play) anim.kick();
  }

  /* ==========================================================
     3.6(5) イージングを sin で作る
     ========================================================== */
  function initEaseSin() {
    const root = $id('w-ease-sin');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.95, 0.42] });
    const st = { t: 1, play: false, loop: false, dir: 1, u: 1 };
    const FS = [
      { f: (t) => t, tex: '\\text{等速 } t', col: 'muted' },
      { f: (t) => 3 * t * t - 2 * t * t * t, tex: '3t^2-2t^3', col: 'primary' },
      { f: (t) => (1 - Math.cos(PI * t)) / 2, tex: '\\frac{1-\\cos\\pi t}{2}', col: 'accent' },
    ];
    const bP = R(root, 'play');
    R(root, 'loop').addEventListener('change', (e) => { st.loop = e.target.checked; if (st.loop) { st.play = true; anim.kick(); } });
    bP.addEventListener('click', () => { st.u = 0; st.play = true; anim.kick(); });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.u += dt / 1.6;
      if (st.u >= 1) { if (st.loop) st.u -= 1; else { st.u = 1; st.play = false; } }
      plot.invalidate();
      return st.play;
    });
    // 往復のときは 0→1→0（行きと帰り）
    const tNow = () => (st.loop ? (st.u < 0.5 ? st.u * 2 : 2 - st.u * 2) : st.u);
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, W = g.w, Hh = g.h, narrow = W < 520, t = tNow();
      // 左：レーン、右：グラフ（スマホでは上下）
      const lw = narrow ? W : W * 0.56, lh = narrow ? Hh * 0.5 : Hh;
      const lx0 = narrow ? 120 : 130, lx1 = lw - 22;
      FS.forEach(function (F, i) {
        const y = (narrow ? 18 : 30) + i * (lh - (narrow ? 26 : 50)) / 2.4 + 6;
        ctx.save(); ctx.strokeStyle = c.grid; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx0, y); ctx.lineTo(lx1, y); ctx.stroke(); ctx.restore();
        g.texPx(F.tex, lx0 - 12, y, { align: 'right', size: 14, color: c[F.col] });
        const x = lx0 + (lx1 - lx0) * F.f(t);
        g.dot(g.ix(x), g.iy(y), { r: 9, color: c[F.col] });
      });
      // グラフ
      const gx0 = narrow ? 50 : lw + 46, gx1 = W - 16, gy1 = narrow ? lh + 10 : 14, gy0 = Hh - 24;
      const PX = (u) => gx0 + (gx1 - gx0) * u, PY = (v) => gy0 + (gy1 - gy0) * v;
      ctx.save(); ctx.strokeStyle = c.axis; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(gx0, gy1); ctx.lineTo(gx0, gy0); ctx.lineTo(gx1, gy0); ctx.stroke();
      ctx.strokeStyle = c.grid; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(gx0, PY(1)); ctx.lineTo(gx1, PY(1)); ctx.moveTo(PX(1), gy0); ctx.lineTo(PX(1), gy1); ctx.stroke(); ctx.restore();
      FS.forEach(function (F) {
        ctx.save(); ctx.strokeStyle = c[F.col]; ctx.lineWidth = F.col === 'muted' ? 1.5 : 2.5; ctx.beginPath();
        for (let i = 0; i <= 80; i++) { const u = i / 80; if (i) ctx.lineTo(PX(u), PY(F.f(u))); else ctx.moveTo(PX(u), PY(F.f(u))); }
        ctx.stroke(); ctx.restore();
        g.dot(g.ix(PX(t)), g.iy(PY(F.f(t))), { r: 4.5, color: c[F.col] });
      });
      g.texPx('t', gx1 + 4, gy0 - 4, { align: 'right', valign: 'bottom', size: 14, color: c.muted });
      g.texPx('1', PX(1), gy0 + 3, { align: 'center', valign: 'top', size: 12, color: c.muted });
      g.texPx('0', gx0, gy0 + 3, { align: 'center', valign: 'top', size: 12, color: c.muted });
      g.texPx('1', gx0 - 6, PY(1), { align: 'right', size: 12, color: c.muted });
      g.texPx('f(t)', gx0 + 6, gy1, { align: 'left', valign: 'top', size: 14, color: c.muted });
      g.texPx('\\text{赤と青の差は 最大でも約 } 0.01', gx1, PY(0.12), { align: 'right', size: 12, color: c.muted });
    };
    plot.invalidate();
  }

  /* ==========================================================
     3.6(6) チャレンジ：波を合わせろ
     ========================================================== */
  const WAVE_STAGES = [
    { v: [2, 1, 0, 0], text: 'お手本は $y=\\sin x$ と同じ長さで、縦に大きい波。ぴったり重ねよう。',
      hint: '山の高さ（中心の線 $y=0$ から山まで）を読もう。それが振幅 $A$。山と山の間隔は $2\\pi$ のまま。',
      answer: '<b>A = 2, B = 1, p = 0, q = 0</b>　つまり $y=2\\sin x$<br>山の高さが $2$、谷が $-2$ なので振幅 $A=2$。山と山の間隔は $2\\pi$ なので周期 $2\\pi$、$B=\\dfrac{2\\pi}{2\\pi}=1$。原点から上り始めるので $p=0$、中心の線は $y=0$ なので $q=0$。' },
    { v: [1, 2, 0, 0], text: 'お手本は、高さは $y=\\sin x$ と同じで、波が細かい。',
      hint: '山と山の間隔（周期）を読もう。周期 $=\\dfrac{2\\pi}{B}$ なので、$B=\\dfrac{2\\pi}{\\text{周期}}$。',
      answer: '<b>A = 1, B = 2, p = 0, q = 0</b>　つまり $y=\\sin2x$<br>山と山の間隔が $\\pi$ なので周期 $\\pi$。$\\dfrac{2\\pi}{B}=\\pi$ より $B=2$（横に $\\frac12$ 倍）。振幅は $1$、原点から上り始めるので $p=0,\\ q=0$。' },
    { v: [1, 1, PI / 3, 1], text: 'お手本は $y=\\sin x$ と同じ形で、位置だけがずれている。',
      hint: 'まず中心の線（山と谷のちょうど真ん中の高さ）が $q$。次に、中心の線を<b>下から上へ横切る点</b>を探そう。その $x$ 座標が $p$。',
      answer: '<b>A = 1, B = 1, p = π/3, q = 1</b>　つまり $y=\\sin\\left(x-\\dfrac{\\pi}{3}\\right)+1$<br>山が $2$、谷が $0$ なので中心の線は $y=\\dfrac{2+0}{2}=1$（$q=1$）、振幅は $\\dfrac{2-0}{2}=1$。中心の線を下から上へ横切るのが $x=\\dfrac{\\pi}{3}$ なので、$y=\\sin x$ を右に $\\dfrac{\\pi}{3}$ ずらした波（$p=\\dfrac{\\pi}{3}$）。' },
    { v: [3, 0.5, 0, 0], text: 'お手本は、縦に大きく、横にゆったりした波（確認問題 (2) と同じ形）。',
      hint: '山の高さが $A$。山から次の山まで（または 0 から次に上り始めるまで）の長さが周期。周期が $2\\pi$ より長いときは $B\\lt1$。',
      answer: '<b>A = 3, B = 1/2, p = 0, q = 0</b>　つまり $y=3\\sin\\dfrac{x}{2}$<br>山の高さ $3$ なので $A=3$。$x=0$ から上り始めて、次に上り始めるのは $x=4\\pi$ なので周期 $4\\pi$。$\\dfrac{2\\pi}{B}=4\\pi$ より $B=\\dfrac12$（横に2倍）。' },
    { v: [2, 1, -H, -1], text: '最後はお手本が $\\cos$ の波。$\\sin$ の式で表そう。',
      hint: '$\\cos x=\\sin\\left(x+\\dfrac{\\pi}{2}\\right)$ でした。$x=0$ で山になっていることに注目。中心の線と振幅も読もう。',
      answer: '<b>A = 2, B = 1, p = −π/2, q = −1</b>　つまり $y=2\\sin\\left(x+\\dfrac{\\pi}{2}\\right)-1=2\\cos x-1$<br>山が $1$、谷が $-3$ なので中心の線は $y=\\dfrac{1+(-3)}{2}=-1$、振幅は $\\dfrac{1-(-3)}{2}=2$。周期は $2\\pi$ で $B=1$。$x=0$ で山なので $\\cos$ の形 → 左に $\\dfrac{\\pi}{2}$ ずらした $\\sin$（$p=-\\dfrac{\\pi}{2}$）。<br>（$A=-2,\\ p=\\dfrac{\\pi}{2}$ でも同じ波になるので正解です。）' },
  ];
  function initGameWave() {
    const root = $id('w-game-wave');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.35, xmax: 4 * PI + 0.35, ymin: -4.2, ymax: 4.2, ratio: [0.78, 0.45] });
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: '\\violet{A}', min: -3, max: 3, step: 0.5, value: 1, color: 'violet', aria: '縦の倍率 A' });
    const sB = slider(ctl, { tex: '\\amber{B}', min: 0.5, max: 3, step: 0.5, value: 1, color: 'amber', aria: '横の縮み B', fmt: bPlain });
    const sP = slider(ctl, { tex: '\\teal{p}', min: -12, max: 12, step: 1, value: 0, color: 'teal', aria: '右へのずれ p（π/12 ごと）', fmt: (k) => piPlain(k * PI / 12) });
    const sQ = slider(ctl, { tex: '\\red{q}', min: -2, max: 2, step: 0.5, value: 0, color: 'accent', aria: '上へのずれ q' });
    const cur = () => ({ A: sA.get() || 0.5, B: sB.get(), p: sP.get() * PI / 12, q: sQ.get() });
    sA.on((v) => { if (v === 0) sA.set(0.5); });
    [sA, sB, sP, sQ].forEach((s) => s.on(() => { if (game) { game.formula(); plot.invalidate(); } }));
    const B = L.game.gameButtons(ctl, '✅ 判定');
    const lab = el('label', 'check'); lab.style.marginTop = '6px';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = true;
    lab.append(chk, document.createTextNode('いまの波を表示　※オフでぴったりなら 👑'));
    ctl.append(lab);
    const st = { shots: [], show: true };
    chk.addEventListener('change', () => { st.show = chk.checked; plot.invalidate(); });
    const conf = L.game.Confetti(root, plot);
    const fw = (s) => (x) => s.A * Math.sin(s.B * (x - s.p)) + s.q;
    const tgt = () => { const v = WAVE_STAGES[game.k].v; return { A: v[0], B: v[1], p: v[2], q: v[3] }; };
    let game = null;
    game = L.game.GameShell(root, { key: '3-6:game', stages: WAVE_STAGES,
      formula: function () {
        const s = cur();
        return '\\begin{aligned}&' + waveTeX(s.A, s.B, s.p, s.q, true) + '\\\\&\\text{振幅 }' + nTeX(Math.abs(s.A)) + ',\\ \\text{周期 }' + T.radTeX(TAU / s.B) + ',\\ \\text{中心の線 } y=' + nTeX(s.q) + '\\end{aligned}';
      },
      onStage() {
        st.shots = []; B.bMain.disabled = false; B.bNext.hidden = true;
        sA.set(1); sB.set(1); sP.set(0); sQ.set(0);
        typeset(R(root, 'mission')); plot.invalidate();
      } });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const s = cur(), t = tgt(), f1 = fw(s), f2 = fw(t);
      let e = 0;
      for (let i = 0; i <= 400; i++) { const x = plot.xmin + (plot.xmax - plot.xmin) * i / 400; e = Math.max(e, Math.abs(f1(x) - f2(x))); }
      game.used++; game.renderThrows();
      s.aim = st.show; st.shots.push(s);
      if (e < 0.05) {
        const n = 4 - game.used; game.award(n); game.done = true;
        game.result('🌊 ぴったり重なった！ ' + L.game.starStr(n) + '（' + game.used + ' 回目）' + (s.aim ? '' : '　👑 表示なしで成功！'), 'hit');
        B.bMain.disabled = true; B.bNext.hidden = game.k >= WAVE_STAGES.length - 1;
        conf.fire(plot.X(PI), plot.Y(t.q + Math.abs(t.A)));
      } else {
        const ok = (b) => (b ? '○' : '×');
        const ampOk = Math.abs(Math.abs(s.A) - Math.abs(t.A)) < 1e-9, perOk = Math.abs(s.B - t.B) < 1e-9, midOk = Math.abs(s.q - t.q) < 1e-9;
        let m = ampOk && perOk && midOk ? '振幅・周期・中心の線は ○。あとは左右のずれ $p$（と $A$ の符号）を直そう。'
          : '振幅 ' + ok(ampOk) + '・周期 ' + ok(perOk) + '・中心の線 ' + ok(midOk) + '。× のところを直そう。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, WAVE_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, t = tgt();
      waveAxes(g, { minPx: 50 });
      // お手本（太い点線）
      g.fn(fw(t), { color: c.amber, width: 5, dash: [10, 7], alpha: 0.9 });
      st.shots.forEach((s, i) => { if (i < st.shots.length - 1 || !game.done) g.fn(fw(s), { color: c.muted, width: 2, alpha: 0.55 }); });
      const last = st.shots[st.shots.length - 1];
      if (game.done && last) g.fn(fw(last), { color: c.teal, width: 3.5 });
      else if (st.show) g.fn(fw(cur()), { color: c.primary, width: 3 });
      g.texPx('\\text{点線：お手本}', g.w - 10, 8, { align: 'right', valign: 'top', size: 13, color: c.amber });
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     確認問題の答えのグラフ
     ========================================================== */
  function initQuizFigs() {
    const Q = {
      1: { x: [-0.3, TAU + 0.3], y: [-1.6, 1.6], fs: [[(x) => Math.sin(2 * x), 'accent', 'y=\\sin2x', H / 2 + PI, 1]], ref: true },
      2: { x: [-0.3, 4 * PI + 0.3], y: [-4, 4], fs: [[(x) => 3 * Math.sin(x / 2), 'accent', 'y=3\\sin\\frac{x}{2}', PI, 3]], ref: true },
      3: { x: [-PI - 0.3, TAU + 0.3], y: [-3, 3], fs: [[Math.cos, 'teal', 'y=\\cos x', -PI + 0.15, -1], [Math.tan, 'amber', 'y=\\tan x', PI + 1.1, 2.3]], asym: [-H, H, 3 * H] },
    };
    document.querySelectorAll('#check canvas[data-q]').forEach(function (cv) {
      const q = Q[cv.dataset.q];
      const plot = new Plot(cv, { xmin: q.x[0], xmax: q.x[1], ymin: q.y[0], ymax: q.y[1], height: (w) => clamp(w * 0.42, 150, 260) });
      plot.draw = function (g) {
        const c = g.c;
        waveAxes(g, {});
        if (q.ref) g.fn(Math.sin, { color: c.muted, width: 1.5, dash: [5, 5], alpha: 0.7 });
        (q.asym || []).forEach((a) => g.line(a, g.ymin, a, g.ymax, { color: c.amber, width: 1.2, dash: [5, 5], alpha: 0.8 }));
        q.fs.forEach((F) => {
          if (F[2].indexOf('tan') >= 0) {
            [[-PI, -H], [-H, H], [H, 3 * H], [3 * H, TAU + 0.4]].forEach((s) => g.fn(F[0], { x0: s[0] + 0.01, x1: s[1] - 0.01, color: c[F[1]], width: 3 }));
          } else g.fn(F[0], { color: c[F[1]], width: 3 });
          g.tex(F[2], F[3], F[4], { color: c[F[1]], size: 14, align: 'left', valign: F[4] > 0 ? 'bottom' : 'top', dx: 4, dy: F[4] > 0 ? -4 : 4, avoid: true });
        });
      };
      plot.invalidate();
    });
  }

  T.boot([
    [initUnwrap, 'w-unwrap'],
    [initABPQ, 'w-abpq'],
    [initSynth, 'w-synth'],
    [initTan, 'w-tan'],
    [initYura, 'w-yura'],
    [initEaseSin, 'w-ease-sin'],
    [initGameWave, 'w-game-wave'],
    [initQuizFigs, 'check'],
  ]);
})();
