/* 第3章 3.7節 逆三角関数と atan2 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 * 色の約束: 角 θ = 青, cos = 緑, sin = 赤, tan = 金
 *
 * この節だけの部品
 *   fit(g, x0, x1, y0, y1)        … 縦横同じ縮尺のまま範囲が収まるように表示範囲を決める（描くたびに呼ぶ）
 *   arcAt(g, cx, cy, r, a0, a1, o) … 角の弧（o.arrow で矢印つき）
 *   drawTurret / drawEnemy        … 砲台と敵の絵（画面の px で大きさを決める）
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const { starStr, GameShell, gameButtons, Confetti } = L.game;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI, DEG = PI / 180;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };

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
  const press = (btns, i) => btns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
  function fit(g, x0, x1, y0, y1) {
    const asp = g.h / g.w;
    let xs = x1 - x0, ys = xs * asp;
    if (ys < y1 - y0) { ys = y1 - y0; xs = ys / asp; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    g.xmin = cx - xs / 2; g.xmax = cx + xs / 2; g.ymin = cy - ys / 2; g.ymax = cy + ys / 2;
  }
  function arcAt(g, cx, cy, r, a0, a1, o) {
    o = o || {};
    if (Math.abs(a1 - a0) < 1e-6) return;
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 0.04)), pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    g.poly(pts, { color: o.color || g.c.primary, width: o.width || 2.5, dash: o.dash });
    if (o.arrow) { const p = pts[n], q = pts[Math.max(0, n - 3)]; g.arrow(q[0], q[1], p[0], p[1], { color: o.color || g.c.primary, width: 2, head: o.head || 10 }); }
  }
  const SPECIAL = [0, 0.5, Math.SQRT2 / 2, Math.sqrt(3) / 2, 1, Math.sqrt(3), 1 / Math.sqrt(3)];
  const isSpecial = (v) => SPECIAL.some((e) => Math.abs(Math.abs(v) - e) < 1e-9);
  const snapSpecial = (v, tol) => { for (const e of SPECIAL) for (const s of [1, -1]) if (Math.abs(v - s * e) < tol) return s * e; return v; };
  const isNiceAngle = (a) => Math.abs(a * 12 / PI - Math.round(a * 12 / PI)) < 1e-7;
  // 角度を TeX で（π の分数になれば正確に、ならなければ約…）
  const angTeX = (a) => (isNiceAngle(a) ? T.radTeX(a) + '\\,(=' + T.degTeX(a) + ')' : '\\approx' + num(a, 2) + '\\,(\\approx' + num(a / DEG, 1) + '^\\circ)');
  const paren = (s) => (s[0] === '-' ? '\\left(' + s + '\\right)' : s);
  const mod2pi = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };

  // 砲台（中心 (x,y)、向き ang）
  function drawTurret(g, x, y, ang, col) { drawTurretPx(g, g.X(x), g.Y(y), ang, col, 1); }
  // 画面の px で中心を指定（s は大きさの倍率）
  function drawTurretPx(g, px, py, ang, col, s) {
    const ctx = g.ctx, c = g.c;
    col = col || c.text; s = s || 1;
    ctx.save();
    ctx.beginPath(); ctx.arc(px, py, 15 * s, 0, TAU); ctx.fillStyle = c.surface; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
    ctx.translate(px, py); ctx.rotate(-ang); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, -5, 34, 10, 3) : ctx.rect(0, -5, 34, 10); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawEnemy(g, x, y, flash) {
    const ctx = g.ctx, px = g.X(x), py = g.Y(y), c = g.c;
    ctx.save();
    if (flash > 0) { ctx.beginPath(); ctx.arc(px, py, 14 + 16 * flash, 0, TAU); ctx.fillStyle = c.amber; ctx.globalAlpha = 0.5 * flash; ctx.fill(); ctx.globalAlpha = 1; }
    ctx.beginPath(); ctx.arc(px, py, 11, 0, TAU); ctx.fillStyle = c.accent; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = c.bg; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - 4, py - 2, 2.6, 0, TAU); ctx.arc(px + 4, py - 2, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function target(g, x, y, col) {
    const ctx = g.ctx, px = g.X(x), py = g.Y(y);
    ctx.save(); ctx.strokeStyle = col || g.c.accent; ctx.lineWidth = 2.5;
    [13, 7].forEach((r) => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke(); });
    ctx.fillStyle = col || g.c.accent; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ==========================================================
     3.7(1) sin x = k となる x は無数にある
     ========================================================== */
  function initSolve() {
    const root = $id('w-solve');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -7.2, xmax: 7.2, ymin: -1.7, ymax: 1.7, ratio: [0.62, 0.36] });
    const st = { k: 0.5, band: false };
    const KS = [{ tex: '\\frac12', v: 0.5 }, { tex: '\\frac{\\sqrt3}{2}', v: Math.sqrt(3) / 2 }, { tex: '-\\frac12', v: -0.5 }, { tex: '1', v: 1 }, { tex: '0', v: 0 }];
    const sk = slider(root.querySelector('.controls'), { tex: '\\violet{k}', min: -1, max: 1, step: 0.01, value: 0.5, color: 'violet', aria: '横線の高さ k' });
    const chips = chipRow(R(root, 'ks'), KS, 0, (it) => { st.k = it.v; sk.set(it.v); update(); });
    sk.on((v) => { st.k = snapSpecial(v, 0.006); update(); });
    R(root, 'band').addEventListener('change', (e) => { st.band = e.target.checked; update(); });
    function sols() {
      const a = Math.asin(st.k), out = [];
      for (let n = -2; n <= 2; n++) [a + n * TAU, PI - a + n * TAU].forEach((x) => { if (x > -7.1 && x < 7.1 && !out.some((y) => Math.abs(y - x) < 1e-9)) out.push(x); });
      return out.sort((p, q) => p - q);
    }
    const xT = (x) => (isSpecial(st.k) ? T.radTeX(x) : num(x, 2));
    function update() {
      chips.forEach((b, j) => b.setAttribute('aria-pressed', String(Math.abs(KS[j].v - st.k) < 1e-9)));
      const s = sols();
      tex(root, 'sols', '\\blue{x}=\\ldots,\\ ' + s.map((x) => '\\blue{' + xT(x) + '}').join(',\\ ') + ',\\ \\ldots\\quad(\\text{' + s.length + ' 個以上})');
      tex(root, 'one', '-\\tfrac{\\pi}{2}\\leqq x\\leqq\\tfrac{\\pi}{2}\\ \\text{では}\\ \\blue{x=' + xT(Math.asin(st.k)) + '}\\ \\text{の1つだけ}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, k = st.k;
      g.grid({ stepX: PI / 2, stepY: 0.5, labels: false, xlabel: 'x', ylabel: 'y' });
      if (st.band) {
        ctx.save(); ctx.fillStyle = c.primary; ctx.globalAlpha = 0.09;
        ctx.fillRect(g.X(-PI / 2), 0, g.X(PI / 2) - g.X(-PI / 2), g.h); ctx.restore();
      }
      // x 軸の目盛り（π/2 ごと、せまいときは π ごと）
      const every = g.pxPerX * PI / 2 > 46 ? 1 : 2;
      for (let i = -4; i <= 4; i++) {
        if (i === 0 || i % every) continue;
        g.tex(T.radTeX(i * PI / 2), i * PI / 2, 0, { dy: 6, align: 'center', valign: 'top', size: 12, color: c.muted });
      }
      g.tex('1', 0, 1, { dx: -6, align: 'right', size: 12, color: c.muted });
      g.tex('-1', 0, -1, { dx: -6, align: 'right', size: 12, color: c.muted });
      g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 12, color: c.muted });
      if (st.band) {
        g.fn(Math.sin, { color: c.accent, width: 2.5, alpha: 0.3 });
        g.fn(Math.sin, { x0: -PI / 2, x1: PI / 2, color: c.accent, width: 4 });
      } else g.fn(Math.sin, { color: c.accent, width: 3.5 });
      g.line(g.xmin, k, g.xmax, k, { color: c.violet, width: 2, dash: [7, 5] });
      g.tex('y=k', k >= 0 ? -PI / 2 : PI / 2, k, { dy: k >= 0 ? -13 : 13, align: 'center', size: 14, color: c.violet });
      g.tex('y=\\sin x', -3 * PI / 2, 1, { dy: -14, align: 'center', size: 14, color: c.accent });
      const a0 = Math.asin(k);
      sols().forEach(function (x) {
        const main = Math.abs(x - a0) < 1e-9, dim = st.band && !main;
        g.line(x, 0, x, k, { color: c.primary, width: 1.2, dash: [3, 4], alpha: dim ? 0.3 : 0.8 });
        if (dim) g.dot(x, k, { r: 5, ring: true, color: c.muted });
        else g.dot(x, k, { r: main && st.band ? 7 : 6, color: c.primary });
        if (!dim || isSpecial(k)) g.tex(xT(x), x, k, { dy: k > 0.75 ? 20 : -18, align: 'center', size: 13, color: dim ? c.muted : c.primary, avoid: true });
      });
    };
    update();
  }

  /* ==========================================================
     3.7(2) 範囲をしぼった三角関数と逆三角関数（y = x について対称）
     ========================================================== */
  const r2 = Math.SQRT2 / 2, r3 = Math.sqrt(3);
  const FNS = [
    { name: 'sin', inv: Math.asin, f: Math.sin, lo: -PI / 2, hi: PI / 2, dom: [-1, 1], col: 'accent', mac: 'red',
      pre: [0.5, r3 / 2, -0.5, 1, -r2], view: [-2.1, 2.1, -1.8, 1.8],
      rng: '-\\frac{\\pi}{2}\\leqq\\arcsin x\\leqq\\frac{\\pi}{2}\\quad(-1\\leqq x\\leqq1)',
      note: '$\\sin^{-1}x$ とも書くが、$\\dfrac{1}{\\sin x}$ ではない。' },
    { name: 'cos', inv: Math.acos, f: Math.cos, lo: 0, hi: PI, dom: [-1, 1], col: 'teal', mac: 'teal',
      pre: [0.5, -0.5, 0, -r3 / 2, 1], view: [-1.75, 3.55, -1.25, 3.4],
      rng: '0\\leqq\\arccos x\\leqq\\pi\\quad(-1\\leqq x\\leqq1)',
      note: '$\\cos$ は上半分（$0$〜$\\pi$）にしぼる。右半分だと $\\cos(-\\theta)=\\cos\\theta$ で区別できない。' },
    { name: 'tan', inv: Math.atan, f: Math.tan, lo: -PI / 2, hi: PI / 2, open: true, dom: [-4.5, 4.5], col: 'amber', mac: 'amber',
      pre: [1, r3, -1, 1 / r3, 0], view: [-4.3, 4.3, -2.05, 2.05],
      rng: '-\\frac{\\pi}{2}\\lt\\arctan x\\lt\\frac{\\pi}{2}\\quad(x\\ \\text{は何でもよい})',
      note: '$x$ が大きくなると $\\arctan x$ は $\\frac{\\pi}{2}$ に近づくが、届かない（真上には $\\tan$ がない）。' },
  ];
  function initInv() {
    const root = $id('w-inv');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2, xmax: 2, ymin: -2, ymax: 2, ratio: [0.9, 0.56] });
    const st = { k: 0, x: 0.5 };
    const F = () => FNS[st.k];
    let pre = [];
    function buildPre() {
      pre = chipRow(R(root, 'pre'), F().pre.map((v) => ({ tex: T.exactTeX(v), v })), 0, (it) => { st.x = it.v; update(); });
    }
    chipRow(R(root, 'fns'), FNS.map((f) => ({ tex: '\\' + f.name + '\\ \\leftrightarrow\\ \\arc' + f.name })), 0, (it, i) => {
      st.k = i; st.x = F().pre[0]; buildPre(); update();
    });
    buildPre();
    plot.addHandle({ get x() { return st.x; }, get y() { return F().inv(st.x); }, get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 8,
      drag(x) { const d = F().dom; st.x = snapSpecial(clamp(Math.round(x * 100) / 100, d[0], d[1]), 0.03); update(); } });
    function update() {
      const f = F(), x = st.x, y = f.inv(x), ex = isSpecial(x) && isNiceAngle(y);
      pre.forEach((b, j) => b.setAttribute('aria-pressed', String(Math.abs(f.pre[j] - x) < 1e-9)));
      const xs = ex ? T.exactTeX(x) : num(x, 2), ys = ex ? T.radTeX(y) : num(y, 3);
      tex(root, 'val', '\\blue{\\arc' + f.name + '}\\,' + paren(xs) + (ex ? '=' : '\\approx') + '\\blue{' + ys + '}' + (ex ? '\\,(=' + T.degTeX(y) + ')' : '\\,(\\approx' + num(y / DEG, 1) + '^\\circ)'));
      const lo = f.name === 'cos' ? '0' : '-\\frac{\\pi}{2}', hi = f.name === 'cos' ? '\\pi' : '\\frac{\\pi}{2}', le = f.open ? '\\lt' : '\\leqq';
      tex(root, 'say', '\\' + f.mac + '{\\' + f.name + '}\\,' + paren(ys) + (ex ? '=' : '\\approx') + xs + '\\ \\text{かつ}\\ ' + lo + le + ys + le + hi);
      tex(root, 'rng', f.rng);
      const n = R(root, 'note'); n.innerHTML = f.note; typeset(n);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const f = F(), c = g.c, ctx = g.ctx, col = c[f.col], v = f.view;
      fit(g, v[0], v[1], v[2], v[3]);
      g.grid({ step: 0.5, labels: false, xlabel: 'x', ylabel: 'y' });
      // 逆関数の値の範囲（横の帯）
      ctx.save(); ctx.fillStyle = c.primary; ctx.globalAlpha = 0.08;
      ctx.fillRect(0, g.Y(f.hi), g.w, g.Y(f.lo) - g.Y(f.hi)); ctx.restore();
      g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 12, color: c.muted });
      // 目盛り（±1 と π/2 など）
      const ticks = f.name === 'cos' ? [PI / 2, PI] : [-PI / 2, PI / 2];
      ticks.forEach(function (t) {
        const s = T.radTeX(t);
        g.tex(s, 0, t, { dx: -6, align: 'right', size: 12, color: c.primary });
        g.tex(s, t, 0, { dy: 6, align: 'center', valign: 'top', size: 12, color: c.muted });
      });
      [-1, 1].forEach(function (t) {
        g.tex(String(t), t, 0, { dy: 6, align: 'center', valign: 'top', size: 12, color: c.muted });
        if (f.name !== 'tan') g.tex(String(t), 0, t, { dx: -6, align: 'right', size: 12, color: c.muted });
      });
      g.fn((t) => t, { color: c.muted, width: 1.5, dash: [6, 6] });
      g.tex('y=x', v[1] - 0.6, v[1] - 0.6, { dx: -6, align: 'right', size: 13, color: c.muted, avoid: true });
      if (f.open) { [-PI / 2, PI / 2].forEach((t) => { g.line(g.xmin, t, g.xmax, t, { color: c.primary, width: 1, dash: [3, 5], alpha: 0.6 }); g.line(t, g.ymin, t, g.ymax, { color: col, width: 1, dash: [3, 5], alpha: 0.6 }); }); }
      // もとの関数（全体はうすく、しぼった部分は太く）
      g.fn(f.f, { color: col, width: 2, alpha: 0.28, samples: 600 });
      const e = f.open ? 1e-3 : 0;
      g.fn(f.f, { x0: f.lo + e, x1: f.hi - e, color: col, width: 4, samples: 600 });
      // 逆関数
      g.fn(f.inv, { x0: Math.max(f.dom[0], g.xmin), x1: Math.min(f.dom[1], g.xmax), color: c.primary, width: 4, samples: 400 });
      // 点 P と、折り返した点 Q
      const x = st.x, y = f.inv(x);
      g.line(x, y, y, x, { color: c.text, width: 1.5, dash: [3, 4], alpha: 0.7 });
      g.line(x, 0, x, y, { color: c.primary, width: 1.2, dash: [4, 4], alpha: 0.7 });
      g.line(0, y, x, y, { color: c.primary, width: 1.2, dash: [4, 4], alpha: 0.7 });
      g.dot(y, x, { r: 6, color: col });
      // 曲線の名前（ハンドルから遠い方の候補に置く）
      const far = (list, u, v) => list.reduce((p, q) => (Math.hypot(q[0] - u, q[1] - v) > Math.hypot(p[0] - u, p[1] - v) ? q : p));
      const L1 = {
        sin: [[[1, PI / 2, { dx: 10, align: 'left' }], [-1, -PI / 2, { dx: -10, align: 'right' }]], [[-PI / 2, -1, { dx: -10, align: 'right' }], [PI / 2, 1, { dx: 10, align: 'left' }]]],
        cos: [[[-0.95, Math.acos(-0.95), { dx: -12, align: 'right' }], [-0.3, Math.acos(-0.3), { dx: -12, align: 'right' }]], [[2.3, Math.cos(2.3), { dx: 4, dy: 12, align: 'left', valign: 'top' }]]],
        tan: [[[-3, Math.atan(-3), { dy: 12, align: 'center', valign: 'top' }], [3, Math.atan(3), { dy: -12, align: 'center', valign: 'bottom' }]], [[1.05, Math.tan(1.05), { dx: 10, align: 'left' }], [-1.05, Math.tan(-1.05), { dx: -10, align: 'right' }]]],
      }[f.name];
      const p1 = far(L1[0], x, y), p2 = far(L1[1], y, x);
      g.tex('y=\\arc' + f.name + ' x', p1[0], p1[1], Object.assign({ size: 15, color: c.primary, avoid: true }, p1[2]));
      g.tex('y=\\' + f.name + ' x', p2[0], p2[1], Object.assign({ size: 15, color: col, avoid: true }, p2[2]));
    };
    update();
  }

  /* ==========================================================
     3.7(3) P(x, y) と Q(−x, −y)：y/x は同じでも方向は反対
     ========================================================== */
  // 角度（ラジアン）を度の TeX に（小数第1位まで）
  const degT = (a) => num(a / DEG, 1) + '^\\circ';
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
  // y/x を分数の TeX に（約分して符号を前に）
  function ratioTeX(y, x) {
    const raw = '\\dfrac{' + y + '}{' + x + '}';
    if (x === 0) return raw;
    const s = (y < 0) !== (x < 0) && y !== 0 ? '-' : '', d = gcd(y, x), p = Math.abs(y) / d, q = Math.abs(x) / d;
    const red = q === 1 ? s + p : s + '\\dfrac{' + p + '}{' + q + '}';
    return raw === red ? raw : raw + '=' + red;
  }
  function initAtan2() {
    const root = $id('w-atan2');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4, xmax: 4, ymin: -3, ymax: 3, ratio: [0.8, 0.5] });
    const st = { x: 3, y: 2, q: true };
    const PRE = [{ label: '(3, 2)', x: 3, y: 2 }, { label: '(−3, 2)', x: -3, y: 2 }, { label: '(2, −3)', x: 2, y: -3 }, { label: '(1, 1)', x: 1, y: 1 }, { label: '(0, 2)', x: 0, y: 2 }];
    const pre = chipRow(R(root, 'pre'), PRE, 0, (it) => { st.x = it.x; st.y = it.y; update(); });
    R(root, 'showq').addEventListener('change', (e) => { st.q = e.target.checked; update(); });
    plot.addHandle({ get x() { return st.x; }, get y() { return st.y; }, get color() { return plot.c ? plot.c.violet : '#7c4dff'; }, r: 8,
      drag(x, y) {
        x = clamp(Math.round(x), -4, 4); y = clamp(Math.round(y), -3, 3);
        if (x === 0 && y === 0) return;
        st.x = x + 0; st.y = y + 0; update();
      } });
    const msg = R(root, 'msg'), rows = R(root, 'rows');
    const ptT = (nm, x, y) => '\\mathrm{' + nm + '}(\\teal{' + x + '},\\,\\red{' + y + '})';
    function row(nm, x, y) {
      const ok = x > 0, at = x === 0 ? '\\text{求まらない}' : degT(Math.atan(y / x));
      return '<tr><td>$' + ptT(nm, x, y) + '$</td><td>$' + ratioTeX(y, x) + (x === 0 ? '\\ \\text{✗}' : '') + '$</td>' +
        '<td>$\\amber{' + at + '}$' + (ok ? '' : ' <span class="x37">✗</span>') + '</td><td>$\\blue{' + degT(Math.atan2(y, x)) + '}$</td></tr>';
    }
    let lastKey = '';
    function update() {
      const x = st.x, y = st.y;
      pre.forEach((b, j) => b.setAttribute('aria-pressed', String(PRE[j].x === x && PRE[j].y === y)));
      const key = x + ',' + y + ',' + st.q;
      if (key !== lastKey) {
        lastKey = key;
        rows.innerHTML = row('P', x, y) + (st.q ? row('Q', -x + 0, -y + 0) : '');
        typeset(rows);
        let m, ok = false;
        if (x === 0) m = '真上・真下では y/x が割り算できず、arctan は使えない。atan2 は割り算しないので ' + (st.q ? '90° と −90°' : (y > 0 ? '90°' : '−90°')) + ' と答えられる。';
        else if (st.q) m = 'P と Q は y/x が同じなので、arctan の答えも同じ（金の点線は1本だけ）。でも P と Q は反対の方向。atan2 は x と y の符号を別々に見るので、どちらも正しい。';
        else if (x < 0) m = 'P は左半分（x < 0）。arctan は 180° ずれて反対向きを指す！ atan2 は正しい方向。';
        else { m = 'P は右半分（x > 0）。このときは arctan と atan2 は同じ答え。'; ok = true; }
        msg.className = 'msg ' + (ok ? 'ok' : 'ng'); msg.textContent = m;
      }
      plot.invalidate();
    }
    // 点 (x, y) の直角三角形・ラベル・本当の方向の矢印と角
    function drawPt(g, nm, x, y, rArc, main) {
      const c = g.c, al = main ? 1 : 0.85, fs = g.w > 520 ? 17 : 14;
      if (x !== 0) g.line(0, 0, x, 0, { color: c.teal, width: 3.5, alpha: al });
      if (y !== 0) g.line(x, 0, x, y, { color: c.accent, width: 3.5, alpha: al });
      // 横の長さ x（三角形の反対側＝ y ≥ 0 なら下、y < 0 なら上）
      const up = y < 0;
      if (x !== 0) g.tex('\\teal{x=' + x + '}', x / 2, 0, { dy: up ? -5 : 5, align: 'center', valign: up ? 'bottom' : 'top', size: fs, color: c.teal, avoid: true });
      // 縦の長さ y（外側）
      const rt = x > 0 || (x === 0 && main);
      if (y !== 0) g.tex('\\red{y=' + y + '}', x, y / 2, { dx: rt ? 8 : -8, align: rt ? 'left' : 'right', size: fs, color: c.accent, avoid: true });
      else g.tex('\\red{y=0}', x, 0, { dx: x >= 0 ? 8 : -8, dy: up ? 14 : -14, align: x >= 0 ? 'left' : 'right', size: fs, color: c.accent, avoid: true });
      // 本当の方向（atan2）
      const th = Math.atan2(y, x);
      g.arrow(0, 0, x, y, { color: c.primary, width: main ? 3.5 : 3, head: 14 });
      arcAt(g, 0, 0, rArc, 0, th, { color: c.primary, width: 2.5, arrow: true, head: 9 });
      const m = th / 2, rl = rArc + 0.42;
      g.tex('\\blue{' + degT(th) + '}', rl * Math.cos(m), rl * Math.sin(m), { align: 'center', size: fs - 1, color: c.primary, avoid: true });
      // 点とその名前
      g.dot(x, y, main ? { r: 6, color: c.violet } : { r: 6, color: c.violet });
      // 名前は点の上（下）に。左右の端からはみ出さないように中心をずらす
      g.texPx(ptT(nm, x, y), clamp(g.X(x), 46, g.w - 46), g.Y(y) + (y >= 0 ? -12 : 12), { align: 'center', valign: y >= 0 ? 'bottom' : 'top', size: fs + 1, color: c.violet, avoid: true });
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, x = st.x, y = st.y;
      fit(g, -4.7, 4.7, -3.75, 3.75);
      // arctan の答えが来ない左半分
      ctx.save(); ctx.fillStyle = c.amber; ctx.globalAlpha = 0.07; ctx.fillRect(0, 0, g.X(0), g.h); ctx.restore();
      g.grid({ step: 1, labels: false, xlabel: 'x', ylabel: 'y' });
      // 左半分にある点と重ならない方の角に書く
      const lowLeft = (x < 0 && y < 0) || (st.q && x > 0 && y > 0);
      g.texPx('\\text{arctan の答えは来ない}', 6, lowLeft ? 6 : g.h - 6, { align: 'left', valign: lowLeft ? 'top' : 'bottom', size: 11, color: c.amber });
      if (x !== 0) {
        const ph = Math.atan(y / x);
        // 名前は矢印の、x 軸（三角形）から遠い側に
        const sd = ph < 0 ? -1 : 1, nx = -sd * Math.sin(ph), ny = sd * Math.cos(ph);
        g.tex('\\amber{\\arctan\\frac yx}', 1.45 * Math.cos(ph), 1.45 * Math.sin(ph), { dx: 18 * nx, dy: -18 * ny, align: nx < -0.3 ? 'right' : nx > 0.3 ? 'left' : 'center', valign: ny > 0 ? 'bottom' : 'top', size: g.w > 520 ? 17 : 14, color: c.amber, avoid: true });
      }
      drawPt(g, 'P', x, y, 0.6, true);
      if (st.q) drawPt(g, 'Q', -x + 0, -y + 0, 0.95, false);
      // arctan の矢印は一番上に（本当の方向の矢印と重なっても見えるように）
      if (x !== 0) { const ph = Math.atan(y / x), L2 = 2.3; g.arrow(0, 0, L2 * Math.cos(ph), L2 * Math.sin(ph), { color: c.amber, width: 3, dash: [7, 5], head: 13 }); }
    };
    update();
  }

  /* ==========================================================
     3.7(3) バグの体験：arctan(y/x) で作った砲台
     ========================================================== */
  function initBug() {
    const root = $id('w-bug');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4, xmax: 4, ymin: -3, ymax: 3, ratio: [0.8, 0.48] });
    const st = { mode: 0, run: true, e: 0.4, r: 2.6, aim: 0, bullets: [], cool: 0, shots: 0, hits: 0, flash: 0 };
    const CODE = ['<code>angle = Math.atan(dy / dx);</code>', '<code>angle = Math.atan2(dy, dx);</code>'];
    chipRow(R(root, 'mode'), [{ tex: '\\arctan\\frac{y}{x}\\ \\text{で作る}' }, { tex: '\\mathrm{atan2}(y,x)\\ \\text{で作る}' }], 0, (it, i) => {
      st.mode = i; st.shots = 0; st.hits = 0; st.bullets = []; update(); anim.kick();
    });
    const bPlay = R(root, 'play');
    bPlay.addEventListener('click', () => { st.run = !st.run; bPlay.textContent = st.run ? '⏸ 止める' : '▶ 動かす'; anim.kick(); });
    const ex = () => st.r * Math.cos(st.e), ey = () => st.r * Math.sin(st.e);
    plot.addHandle({ get x() { return ex(); }, get y() { return ey(); }, get color() { return plot.c ? plot.c.accent : '#d33'; }, r: 12, halo: 4,
      drag(x, y) { st.r = clamp(Math.hypot(x, y), 1, 2.9); st.e = Math.atan2(y, x); update(); } });
    function aim() {
      const x = ex(), y = ey();
      if (st.mode === 1) return Math.atan2(y, x);
      return Math.abs(x) < 1e-6 ? st.aim : Math.atan(y / x);
    }
    const msg = R(root, 'msg');
    let lastKey = '';
    function update() {
      st.aim = aim();
      const back = Math.abs(T.wrapPi(st.aim - Math.atan2(ey(), ex()))) > 1;
      R(root, 'score').textContent = st.hits + ' / ' + st.shots + ' 発';
      const key = st.mode + '|' + back;
      if (key !== lastKey) {
        lastKey = key;
        R(root, 'code').innerHTML = CODE[st.mode];
        if (back) { msg.className = 'msg ng'; msg.textContent = '敵が左側にいると、砲台は敵に背を向けて反対へ撃っている！'; }
        else { msg.className = 'msg ok'; msg.textContent = st.mode === 1 ? 'どこにいても敵の方を向いている。' : '敵が右側にいるうちは、正しくねらえている。'; }
      }
      tex(root, 'dir', '\\text{敵 }' + num(Math.atan2(ey(), ex()) / DEG, 0) + '^\\circ,\\ \\ \\text{砲台 }' + num(st.aim / DEG, 0) + '^\\circ');
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (st.run && !plot.active) st.e = T.wrapPi(st.e + 0.55 * dt);
      st.aim = aim();
      if (st.run) {
        st.cool -= dt;
        if (st.cool <= 0) { st.cool = 0.45; st.shots++; st.bullets.push({ x: 0.55 * Math.cos(st.aim), y: 0.55 * Math.sin(st.aim), vx: 14 * Math.cos(st.aim), vy: 14 * Math.sin(st.aim) }); }
      }
      for (let i = st.bullets.length - 1; i >= 0; i--) {
        const b = st.bullets[i];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.hypot(b.x - ex(), b.y - ey()) < 0.42) { st.hits++; st.flash = 1; st.bullets.splice(i, 1); continue; }
        if (Math.abs(b.x) > 6 || Math.abs(b.y) > 5) st.bullets.splice(i, 1);
      }
      st.flash = Math.max(0, st.flash - 2.5 * dt);
      update();
      return st.run || st.bullets.length > 0 || st.flash > 0;
    });
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx;
      fit(g, -3.6, 3.6, -3.1, 3.1);
      ctx.save(); ctx.fillStyle = c.amber; ctx.globalAlpha = st.mode === 0 ? 0.07 : 0; ctx.fillRect(0, 0, g.X(0), g.h); ctx.restore();
      g.grid({ step: 1, labels: false, xlabel: 'x', ylabel: 'y' });
      ctx.save(); ctx.strokeStyle = c.muted; ctx.globalAlpha = 0.4; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), st.r * g.pxPerX, 0, TAU); ctx.stroke(); ctx.restore();
      const col = st.mode === 0 ? c.amber : c.primary;
      st.bullets.forEach((b) => { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(g.X(b.x), g.Y(b.y), 4, 0, TAU); ctx.fill(); ctx.restore(); });
      g.line(0, 0, ex(), ey(), { color: c.accent, width: 1.2, dash: [3, 5], alpha: 0.6 });
      drawTurret(g, 0, 0, st.aim, col);
      drawEnemy(g, ex(), ey(), st.flash);
    };
    update();
    anim.kick();
  }

  /* ==========================================================
     3.7(4) 角度の差を折り返す：「そのまま引き算」と「折り返し」の競争
     ========================================================== */
  function initTurn() {
    const root = $id('w-turn');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.66, 0.42] });
    const SPEED = 60;   // 度／秒
    const EX = [{ a: 350, b: 10 }, { a: 10, b: 350 }, { a: 30, b: 300 }, { a: 100, b: 160 }];
    const wrapDeg = (d) => { while (d > 180) d -= 360; while (d <= -180) d += 360; return d; };
    const norm = (d) => ((d % 360) + 360) % 360;
    const st = { a: 350, b: 10, t: 0, run: false };
    const D = () => [st.b - st.a, wrapDeg(st.b - st.a)];          // [そのまま, 折り返し]
    const cur = (k) => { const d = D()[k]; return st.a + Math.sign(d) * Math.min(Math.abs(d), SPEED * st.t); };
    const exBtns = chipRow(R(root, 'ex'), EX.map((e) => ({ tex: e.a + '^\\circ\\to' + e.b + '^\\circ' })), 0, (it, i) => { st.a = EX[i].a; st.b = EX[i].b; start(); });
    const mi = (v) => L.minus(String(v));
    const sg = (v) => (v > 0 ? '+' : '') + mi(v);
    function cards() {
      exBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(EX[j].a === st.a && EX[j].b === st.b)));
      const d = D(), w = d[1] - d[0];
      tex(root, 'f0', '\\Delta=' + st.b + '^\\circ-' + st.a + '^\\circ');
      tex(root, 'f1', w ? '\\Delta=' + d[0] + '^\\circ' + (w > 0 ? '+' : '-') + '360^\\circ' : '\\Delta=' + d[0] + '^\\circ\\ \\text{（そのまま）}');
      for (let k = 0; k < 2; k++) {
        R(root, 'd' + k).textContent = sg(d[k]) + '°';
        const far = Math.abs(d[k]) > 180;
        R(root, 's' + k).textContent = d[k] === 0 ? '回らない' : (d[k] > 0 ? '反時計回り' : '時計回り') + 'に ' + Math.abs(d[k]) + '°' + (far ? '（遠回り）' : '');
      }
    }
    function timers() {
      const d = D();
      for (let k = 0; k < 2; k++) {
        const T1 = Math.abs(d[k]) / SPEED, done = st.t >= T1;
        const el1 = R(root, 't' + k);
        el1.textContent = done ? '⏱ ' + T1.toFixed(2) + ' 秒で到着！' : '⏱ ' + st.t.toFixed(1) + ' 秒…（' + Math.round(SPEED * st.t) + '° 回った）';
        el1.className = 'tc-t' + (done ? ' done' : '');
      }
    }
    function start() { st.t = 0; st.run = true; cards(); timers(); plot.invalidate(); anim.kick(); }
    const anim = L.animate(root, function (dt) {
      if (!st.run) return false;
      const Tmax = Math.max.apply(null, D().map((d) => Math.abs(d) / SPEED));
      st.t = Math.min(Tmax, st.t + dt);
      if (st.t >= Tmax) st.run = false;
      timers(); plot.invalidate();
      return st.run;
    });
    R(root, 'go').addEventListener('click', start);
    // 2つの文字盤の位置（画面の px）
    function lay(g) {
      const R0 = Math.max(40, Math.min(g.w * 0.19, g.h * 0.34));
      return { cy: g.h * 0.54, R0, cx: [g.w * 0.25, g.w * 0.75] };
    }
    const cv = root.querySelector('canvas');
    cv.addEventListener('pointerdown', function (e) {
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, P = lay(plot);
      const k = px < plot.w / 2 ? 0 : 1, dx = px - P.cx[k], dy = P.cy - py;
      if (Math.hypot(dx, dy) < 12) return;
      const nb = Math.round(norm(Math.atan2(dy, dx) / DEG) / 5) * 5 % 360;
      st.a = Math.round(norm(cur(1))); st.b = nb; start();
    });
    function arcPx(ctx, cx, cy, r, a0, a1, col, w, alpha, head) {
      if (Math.abs(a1 - a0) < 0.3) return;
      ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.globalAlpha = alpha; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r, -a0 * DEG, -a1 * DEG, a1 > a0); ctx.stroke();
      if (head) {
        const e = a1 * DEG, s = a1 > a0 ? 1 : -1, ex = cx + r * Math.cos(e), ey = cy - r * Math.sin(e);
        const tx = -Math.sin(e) * s, ty = -Math.cos(e) * s;      // 進む向き（画面座標）
        const nx = Math.cos(e), ny = -Math.sin(e), hl = 13;
        ctx.globalAlpha = 1; ctx.beginPath();
        ctx.moveTo(ex + tx * 4, ey + ty * 4);
        ctx.lineTo(ex - tx * hl + nx * 6, ey - ty * hl + ny * 6);
        ctx.lineTo(ex - tx * hl - nx * 6, ey - ty * hl - ny * 6);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, P = lay(g), d = D(), R0 = P.R0, big = g.w > 520;
      const TTL = ['\\text{そのまま引き算}', '\\text{折り返し}'];
      for (let k = 0; k < 2; k++) {
        const cx = P.cx[k], cy = P.cy, col = k === 0 ? c.amber : c.teal;
        // 文字盤
        ctx.save(); ctx.strokeStyle = c.muted; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(cx, cy, R0, 0, TAU); ctx.stroke();
        for (let q = 0; q < 360; q += 30) {
          const e = q * DEG, r1 = q % 90 ? R0 - 4 : R0 - 8;
          ctx.beginPath(); ctx.moveTo(cx + r1 * Math.cos(e), cy - r1 * Math.sin(e)); ctx.lineTo(cx + R0 * Math.cos(e), cy - R0 * Math.sin(e)); ctx.stroke();
        }
        ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R0, cy); ctx.stroke();
        ctx.restore();
        g.texPx('0^\\circ', cx + R0 + 4, cy, { align: 'left', size: big ? 13 : 11, color: c.muted });
        g.texPx(TTL[k], cx, 4, { align: 'center', valign: 'top', size: big ? 18 : 14, color: col });
        // スタートの向き（うすい線）
        const sa = st.a * DEG;
        ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 2; ctx.setLineDash([2, 4]); ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R0 * Math.cos(sa), cy - R0 * Math.sin(sa)); ctx.stroke(); ctx.restore();
        // 目標（プレイヤー）
        const tb = st.b * DEG, tx = cx + R0 * Math.cos(tb), ty = cy - R0 * Math.sin(tb);
        ctx.save(); ctx.fillStyle = c.primary; ctx.beginPath(); ctx.arc(tx, ty, big ? 9 : 7, 0, TAU); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = c.bg; ctx.stroke(); ctx.restore();
        // 回る道すじ（全体はうすく、回った分は濃く）
        const rr = R0 * 0.8, now = cur(k);
        arcPx(ctx, cx, cy, rr, st.a, st.a + d[k], col, 4, 0.28, true);
        arcPx(ctx, cx, cy, rr, st.a, now, col, 5, 1, false);
        drawTurretPx(g, cx, cy, now * DEG, c.text, Math.min(1.7, R0 / 60));
      }
      // 目標と今の向き（下）
      g.texPx('\\text{今 }' + st.a + '^\\circ\\ \\to\\ \\blue{\\text{目標 }' + st.b + '^\\circ}', g.w / 2, g.h - 4, { align: 'center', valign: 'bottom', size: big ? 16 : 13, color: c.text });
    };
    cards(); timers();
    // 図がよく見えるところまで来たら、1回だけ自動でスタート
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { threshold: 0.6 });
      io.observe(root.querySelector('.stage'));
    } else start();
  }

  /* ==========================================================
     3.7(5) スマホの傾きを atan2 で測る（傾きセンサー／手入力）
     ========================================================== */
  function initPhone() {
    const root = $id('w-phone');
    T.permBox(root.querySelector('.panel.sensor'), 'スマホの傾きセンサーを使います。ボタンを押したときだけ許可を求めます。傾きの値はこのページの中で使うだけで、どこにも送らず保存もしません。センサーがない PC では、重力の矢印の先をドラッグしてください。');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2, xmax: 2, ymin: -1.6, ymax: 1.6, ratio: [0.85, 0.5] });
    const st = { gx: 0.45, gy: -0.8, gz: 0, hold: false, got: false, sensor: false };
    st.gz = -Math.sqrt(Math.max(0, 1 - st.gx * st.gx - st.gy * st.gy));
    const bStart = root.querySelector('[data-a="tilt"]'), bHold = root.querySelector('[data-a="hold"]'), stat = R(root, 'tstat');
    const say = (t, ok) => { stat.textContent = t; stat.className = 'msg ' + (ok ? 'ok' : 'ng'); };
    say('いまは手入力モードです（重力の矢印の先をドラッグ）。');
    bHold.disabled = true;
    plot.addHandle({ get x() { return st.gx; }, get y() { return st.gy; }, get color() { return plot.c ? plot.c.violet : '#7c4dff'; }, r: 8,
      hidden: () => st.sensor && !st.hold,
      drag(x, y) {
        let r = Math.hypot(x, y); if (r > 1) { x /= r; y /= r; r = 1; }
        st.gx = Math.round(x * 100) / 100; st.gy = Math.round(y * 100) / 100;
        st.gz = -Math.sqrt(Math.max(0, 1 - st.gx * st.gx - st.gy * st.gy)); update();
      } });
    bStart.addEventListener('click', function () {
      st.got = false;
      T.Tilt.start(function (e) {
        if (!st.got) { st.got = true; st.sensor = true; bHold.disabled = false; say('センサーの値を表示中。スマホを立てて、ハンドルのように回してみよう。', true); }
        if (st.hold) return;
        const b = (e.beta || 0) * DEG, gm = (e.gamma || 0) * DEG;
        // 重力（下向き）をスマホの座標で：画面の右が x、上が y、手前が z
        st.gx = Math.cos(b) * Math.sin(gm); st.gy = -Math.sin(b); st.gz = -Math.cos(b) * Math.cos(gm);
        update();
      }).then(function () {
        say('センサーの値を待っています…');
        setTimeout(function () { if (!st.got) say('傾きの値が届きません（PC など、センサーのない端末です）。矢印の先をドラッグしてください。'); }, 2000);
      }).catch(function (err) { say((err && err.message ? err.message : 'センサーを使えません') + '。矢印の先をドラッグしてください。'); });
    });
    bHold.addEventListener('click', function () {
      st.hold = !st.hold;
      bHold.textContent = st.hold ? '固定を外す' : '角度を固定';
      say(st.hold ? '角度を固定しました。' : 'センサーの値を表示中。', true);
      update();
    });
    function update() {
      const gx = st.gx, gy = st.gy, gz = st.gz, flat = Math.hypot(gx, gy) < 0.08, th = Math.atan2(gy, gx);
      tex(root, 'g', '(\\teal{g_x},\\ \\red{g_y},\\ g_z)=(\\teal{' + num(gx, 2) + '},\\ \\red{' + num(gy, 2) + '},\\ ' + num(gz, 2) + ')');
      tex(root, 'th', flat ? '\\text{画面がほぼ水平：向きが決まらない}' : '\\blue{\\theta}=\\mathrm{atan2}(\\red{' + num(gy, 2) + '},\\ \\teal{' + num(gx, 2) + '})\\approx\\blue{' + num(th / DEG, 1) + '^\\circ}');
      tex(root, 'roll', flat ? '-' : '\\theta+90^\\circ\\approx' + num(T.wrapPi(th + PI / 2) / DEG, 1) + '^\\circ');
      tex(root, 'phi', '\\varphi=\\arccos(' + num(-gz, 2) + ')\\approx' + num(Math.acos(clamp(-gz, -1, 1)) / DEG, 1) + '^\\circ');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, gx = st.gx, gy = st.gy;
      fit(g, -1.7, 1.7, -1.5, 1.5);
      // スマホの外形（画面の座標で固定）
      const x0 = g.X(-1.22), x1 = g.X(1.22), y0 = g.Y(1.42), y1 = g.Y(-1.42);
      ctx.save(); ctx.fillStyle = c.surface; ctx.strokeStyle = c.text; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 18) : ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.globalAlpha = 0.5; ctx.fillRect((x0 + x1) / 2 - 18, y0 + 7, 36, 5); ctx.restore();
      g.arrow(-1.1, 0, 1.1, 0, { color: c.muted, width: 1.2, head: 8 });
      g.arrow(0, -1.3, 0, 1.3, { color: c.muted, width: 1.2, head: 8 });
      g.tex('x', 1.1, 0, { dx: -2, dy: -10, align: 'right', size: 13, color: c.muted });
      g.tex('y', 0, 1.3, { dx: 8, dy: 6, align: 'left', size: 13, color: c.muted });
      ctx.save(); ctx.strokeStyle = c.muted; ctx.globalAlpha = 0.6; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), g.pxPerX, 0, TAU); ctx.stroke(); ctx.restore();
      const len = Math.hypot(gx, gy);
      if (len > 0.02) {
        g.line(0, 0, gx, 0, { color: c.teal, width: 3 });
        g.line(gx, 0, gx, gy, { color: c.accent, width: 3 });
        if (len > 0.08) arcAt(g, 0, 0, 0.26, 0, Math.atan2(gy, gx), { color: c.primary, width: 2.5, arrow: true });
        g.arrow(0, 0, gx, gy, { color: c.violet, width: 3.5, head: 14 });
        g.tex('\\vec g', gx, gy, { dx: gx >= 0 ? 12 : -12, dy: gy >= 0 ? -10 : 12, align: gx >= 0 ? 'left' : 'right', size: 15, color: c.violet, avoid: true });
        if (len > 0.08) { const m = Math.atan2(gy, gx) / 2; g.tex('\\theta', 0.42 * Math.cos(m), 0.42 * Math.sin(m), { align: 'center', size: 14, color: c.primary, avoid: true }); }
      }
      g.texPx('\\text{点線の円：重力の大きさ 1}', g.w - 6, g.h - 6, { align: 'right', valign: 'bottom', size: 11, color: c.muted });
    };
    update();
  }

  /* ==========================================================
     3.7(6) チャレンジ：砲台で狙い撃て
     ========================================================== */
  const A = (y, x) => Math.atan2(y, x);
  const TURRET_STAGES = [
    { name: '右上', tur: [0, 0], tg: () => [3, 3], ans: A(3, 3),
      text: '的は $(3,\\ 3)$。原点の砲台を何度に向ける？',
      hint: '右上（第1象限）。$\\tan\\theta=\\dfrac33=1$ の角。',
      answer: '<b>$45^\\circ\\ \\left(=\\dfrac{\\pi}{4}\\right)$</b><br>$\\theta=\\mathrm{atan2}(3,\\,3)=\\dfrac{\\pi}{4}$。第1象限なので $\\arctan\\dfrac33=\\arctan1=\\dfrac{\\pi}{4}$ でも同じ。' },
    { name: '左上', tur: [0, 0], tg: () => [-4, 4], ans: A(4, -4),
      text: '的は $(-4,\\ 4)$。原点の砲台を何度に向ける？',
      hint: '左上（第2象限）。$\\arctan\\dfrac{4}{-4}=-45^\\circ$ は右下を向いてしまう。',
      answer: '<b>$135^\\circ\\ \\left(=\\dfrac{3\\pi}{4}\\right)$</b><br>$\\mathrm{atan2}(4,\\,-4)=\\dfrac{3\\pi}{4}$。<br>$\\arctan\\dfrac{4}{-4}=\\arctan(-1)=-\\dfrac{\\pi}{4}$ は反対向き。左半分なので $\\pi$ 足して $-\\dfrac{\\pi}{4}+\\pi=\\dfrac{3\\pi}{4}$。' },
    { name: '真下', tur: [0, 0], tg: () => [0, -3], ans: A(-3, 0),
      text: '的は $(0,\\ -3)$。原点の砲台を何度に向ける？',
      hint: '$x=0$ なので $\\dfrac{y}{x}$ は計算できない。図で向きを見よう。',
      answer: '<b>$-90^\\circ\\ \\left(=-\\dfrac{\\pi}{2}\\right)$</b>（$270^\\circ$ でも同じ向き）<br>$\\mathrm{atan2}(-3,\\,0)=-\\dfrac{\\pi}{2}$。$\\arctan\\dfrac{-3}{0}$ は割り算できないので、$\\arctan$ だけでは求まらない。' },
    { name: '砲台が原点にない', tur: [1, 2], tg: () => [-3, -1], ans: A(-3, -4),
      text: '砲台は $(1,\\ 2)$、的は $(-3,\\ -1)$。砲台を何度に向ける？（小数第1位まで）',
      hint: '砲台から的への向きは $(-3-1,\\ -1-2)=(-4,\\ -3)$。左下（第3象限）。$\\arctan\\dfrac34\\approx36.9^\\circ$。',
      answer: '<b>約 $-143.1^\\circ$</b>（$216.9^\\circ$ でも同じ向き）<br>向き $(-4,\\,-3)$。$\\arctan\\dfrac{3}{4}\\approx36.87^\\circ$ なので、左下は $-(180^\\circ-36.87^\\circ)=-143.13^\\circ$。<br><code>Math.atan2(-3, -4)</code> $\\approx-2.498$ ラジアン。' },
    { name: '動く的', tur: [0, 0], moving: true, fireT: 4, tg: (t) => [5 - 2 * t, 2], ans: A(2, -3),
      text: '的は $t$ 秒後に $(5-2t,\\ 2)$ にいる。砲台（原点）は $t=4$ 秒に撃つ。何度に向ける？（小数第1位まで）',
      hint: 'まず $t=4$ のときの的の位置を求める：$(5-8,\\ 2)=(-3,\\ 2)$。左上（第2象限）。',
      answer: '<b>約 $146.3^\\circ$</b><br>$t=4$ で的は $(-3,\\ 2)$。$\\arctan\\dfrac23\\approx33.69^\\circ$ なので、左上は $180^\\circ-33.69^\\circ=146.31^\\circ$。<br><code>Math.atan2(2, -3)</code> $\\approx2.554$ ラジアン。' },
  ];
  // 角度の入力を読む（度、またはラジアン。π / pi を含めばラジアン）
  function parseAngle(str, unit) {
    let s = String(str || '').trim().replace(/[０-９．]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[−ー－]/g, '-').replace(/[／]/g, '/').replace(/[°度]/g, '').replace(/\s+/g, '');
    if (!s) return NaN;
    let hasPi = false;
    s = s.replace(/π|pi/gi, function () { hasPi = true; return 'P'; });
    s = s.replace(/(\d|\))P/g, '$1*P').replace(/P(\d|\()/g, 'P*$1').replace(/P/g, '(' + PI + ')');
    if (!/^[0-9.+\-*/()e]*$/.test(s)) return NaN;
    let v;
    try { v = Function('"use strict";return (' + s + ');')(); } catch (e) { return NaN; }
    if (typeof v !== 'number' || !isFinite(v)) return NaN;
    return hasPi || unit === 1 ? v : v * DEG;
  }
  function initGameTurret() {
    const root = $id('w-game-turret'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -6, xmax: 6, ymin: -4.5, ymax: 4.5, ratio: [0.85, 0.56] });
    const row = el('div', 'ang-row');
    const lab = el('label', 'ang-lab', '角度');
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'ang-in'; inp.setAttribute('inputmode', 'decimal'); inp.setAttribute('autocomplete', 'off');
    inp.id = 'turret-angle'; lab.htmlFor = inp.id; inp.placeholder = '例：135';
    const unitBox = el('div', 'chips');
    row.append(lab, inp, unitBox);
    ctl.append(row);
    const st = { unit: 0, shots: [], t: 0, bullet: null, phase: 'idle' };
    chipRow(unitBox, [{ label: '度（°）' }, { label: 'ラジアン' }], 0, (it, i) => { st.unit = i; inp.placeholder = i ? '例：3pi/4' : '例：135'; onInput(); });
    const B = gameButtons(ctl, '🔥 発射');
    const conf = Confetti(root, plot);
    const S = () => TURRET_STAGES[game.k];
    const cur = () => parseAngle(inp.value, st.unit);
    const game = GameShell(root, { key: '3-7:game', stages: TURRET_STAGES,
      formula: function () {
        const a = cur();
        if (!isFinite(a)) return '\\blue{\\theta}=\\ ?\\quad\\text{（角度を入れる）}';
        return '\\blue{\\theta}=' + num(a / DEG, 1) + '^\\circ\\ (=' + num(a, 3) + '\\ \\text{rad})';
      },
      onStage() {
        st.shots = []; st.t = 0; st.bullet = null; st.phase = 'idle'; inp.value = ''; inp.disabled = false;
        B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission')); plot.invalidate();
      } });
    function onInput() { game.formula(); plot.invalidate(); }
    inp.addEventListener('input', onInput);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); fire(); } });
    const TOL = 2 * DEG;
    function fire() {
      if (game.done || game.used >= 3 || st.phase !== 'idle') return;
      const a = cur();
      if (!isFinite(a)) { game.result('角度を数で入れてください（例：135、−90、3pi/4）。', 'miss'); return; }
      game.used++; game.renderThrows();
      st.phase = S().moving ? 'move' : 'shoot'; st.t = 0;
      st.bullet = { a, p: 0 };
      B.bMain.disabled = true; inp.disabled = true;
      anim.kick();
    }
    function judge() {
      const s = S(), a = st.bullet.a, d = T.wrapPi(a - s.ans);
      st.shots.push(a); st.bullet = null; st.phase = 'idle'; inp.disabled = false;
      if (Math.abs(d) <= TOL) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= TURRET_STAGES.length - 1;
        game.result('🎯 命中！ ' + starStr(n) + '（' + game.used + ' 回目）', 'hit');
        const p = s.tg(s.fireT || 0);
        conf.fire(plot.X(p[0]), plot.Y(p[1]));
      } else {
        let m;
        if (Math.abs(T.wrapPi(d - PI)) <= 4 * DEG) m = '反対向き！ arctan(y/x) の答えをそのまま使っていない？ 的のある象限を確かめよう。';
        else m = 'はずれ。' + (d > 0 ? '時計回り' : '反時計回り') + 'にあと約 ' + num(Math.abs(d) / DEG, 0) + '° 回すと当たる。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        else B.bMain.disabled = false;
        game.result(m, 'miss');
      }
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (st.phase === 'move') {
        st.t = Math.min(S().fireT, st.t + 2.5 * dt);
        if (st.t >= S().fireT) st.phase = 'shoot';
        plot.invalidate(); return true;
      }
      if (st.phase === 'shoot' && st.bullet) {
        st.bullet.p += dt / 0.6;
        if (st.bullet.p >= 1) { st.bullet.p = 1; judge(); return false; }
        plot.invalidate(); return true;
      }
      return false;
    });
    B.bMain.addEventListener('click', fire);
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, TURRET_STAGES.length - 1)));
    // 砲台から、向き a の線が画面の端に届くまでの長さ
    function reach(g, x, y, a) {
      const cx = Math.cos(a), cy = Math.sin(a); let t = 1e9;
      if (cx > 1e-9) t = Math.min(t, (g.xmax - x) / cx); if (cx < -1e-9) t = Math.min(t, (g.xmin - x) / cx);
      if (cy > 1e-9) t = Math.min(t, (g.ymax - y) / cy); if (cy < -1e-9) t = Math.min(t, (g.ymin - y) / cy);
      return t;
    }
    plot.draw = function (g) {
      const c = g.c, s = S(), tx = s.tur[0], ty = s.tur[1];
      fit(g, -5.6, 5.6, -4.2, 4.2);
      g.grid({ step: 1, xlabel: 'x', ylabel: 'y' });
      const t = s.moving ? (game.done ? s.fireT : st.t) : 0, p = s.tg(t);
      if (s.moving) {
        const p0 = s.tg(0);
        g.line(p0[0], p0[1], g.xmin, p0[1], { color: c.accent, width: 1.5, dash: [4, 5], alpha: 0.5 });
        g.arrow(p0[0], p0[1] + 0.55, p0[0] - 1.2, p0[1] + 0.55, { color: c.accent, width: 2, head: 9 });
        g.tex('t=0', p0[0], p0[1], { dy: -26, dx: 6, align: 'left', size: 12, color: c.accent, avoid: true });
        if (st.phase === 'move' || st.phase === 'shoot' || game.done) g.tex('t=' + num(t, 1), p[0], p[1], { dy: 24, align: 'center', size: 12, color: c.accent, avoid: true });
      }
      // これまでの弾道
      st.shots.forEach((a) => { const L1 = reach(g, tx, ty, a); g.line(tx, ty, tx + L1 * Math.cos(a), ty + L1 * Math.sin(a), { color: c.muted, width: 1.5, dash: [3, 4], alpha: 0.7 }); });
      target(g, p[0], p[1], c.accent);
      if (!s.moving || !(st.phase === 'move' || st.phase === 'shoot' || game.done)) {
        g.tex('(' + num(p[0], 0) + ',\\,' + num(p[1], 0) + ')', p[0], p[1], { dx: 14, dy: p[1] > 3 ? 16 : -16, align: 'left', size: 13, color: c.accent, avoid: true });
      }
      if (tx || ty) g.tex('(' + tx + ',\\,' + ty + ')', tx, ty, { dx: 16, dy: 18, align: 'left', size: 13, color: c.text, avoid: true });
      // 弾
      if (st.bullet && st.phase === 'shoot') {
        const a = st.bullet.a, L1 = reach(g, tx, ty, a) * st.bullet.p;
        g.line(tx, ty, tx + L1 * Math.cos(a), ty + L1 * Math.sin(a), { color: c.amber, width: 3 });
        g.dot(tx + L1 * Math.cos(a), ty + L1 * Math.sin(a), { r: 5, color: c.amber });
      }
      const ang = st.bullet ? st.bullet.a : isFinite(cur()) ? cur() : (st.shots.length ? st.shots[st.shots.length - 1] : 0);
      if (game.done) { const L1 = Math.hypot(p[0] - tx, p[1] - ty); g.line(tx, ty, tx + L1 * Math.cos(s.ans), ty + L1 * Math.sin(s.ans), { color: c.teal, width: 2.5 }); }
      drawTurret(g, tx, ty, ang, c.primary);
      conf.draw(g);
    };
    game.setStage(0);
  }

  T.boot([
    [initSolve, 'w-solve'],
    [initInv, 'w-inv'],
    [initAtan2, 'w-atan2'],
    [initBug, 'w-bug'],
    [initTurn, 'w-turn'],
    [initPhone, 'w-phone'],
    [initGameTurret, 'w-game-turret'],
  ]);
})();
