/* 第3章 3.2節 弧度法 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 * 色の約束: 角 θ（弧）= 青, sin = 赤, cos = 緑, tan = 金
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const { starStr, GameShell, gameButtons, Confetti } = L.game;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, DEG = PI / 180;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };

  /* ---------- この節で使う小さな部品 ---------- */
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
  function soft(col, a) { return /^#[0-9a-f]{6}$/i.test(col) ? col + ('0' + Math.round(a * 255).toString(16)).slice(-2) : col; }
  // 円弧（データ座標の半径 r、角 a0→a1）
  function arc(g, x, y, r, a0, a1, o) {
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 0.04)), pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
    g.poly(pts, o);
  }
  // 扇形をぬる（中心 (0,0)、半径 r、角 a0→a1）
  function sector(g, r, a0, a1, fill) {
    const ctx = g.ctx, cx = g.X(0), cy = g.Y(0), rp = r * g.pxPerX;
    ctx.save(); ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rp, -a0, -a1, a1 > a0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function circle(g, r, o) { arc(g, 0, 0, r, 0, 2 * PI, Object.assign({ color: g.c.muted, width: 1.5 }, o)); }
  // 狭い画面では横の範囲を狭くして、円を大きく見せる
  function responsive(plot, wide, narrow) {
    plot.onResize = function (p) { p.setView(p.w < 520 ? narrow : wide); };
    plot.resize();
    plot.setView(plot.w < 520 ? narrow : wide);
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  // (p/q)π を TeX に
  function piTeX(p, q) {
    if (p === 0) return '0';
    const d = gcd(p, q); p /= d; q /= d;
    const top = (p === 1 ? '' : p) + '\\pi';
    return q === 1 ? top : '\\frac{' + top + '}{' + q + '}';
  }
  const D = (t) => t.replace(/\\frac/g, '\\dfrac');
  function piTxt(p, q) {
    if (p === 0) return '0';
    const d = gcd(p, q); p /= d; q /= d;
    return (p === 1 ? '' : p) + 'π' + (q === 1 ? '' : '/' + q);
  }

  /* ==========================================================
     3.2(1) 単位円の弧の長さ ＝ 角（ラジアン）
     ========================================================== */
  function initUnit() {
    const root = $id('w-unit'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.2, xmax: 2.6, equal: true, yc: 0, ratio: [0.95, 0.56] });
    responsive(plot, { xmin: -2.2, xmax: 2.6, yc: 0 }, { xmin: -1.5, xmax: 1.7, yc: 0 });
    const st = { th: 1 };                       // ラジアン（0〜2π）
    const sd = slider(ctl, { tex: '\\blue{\\theta}', min: 0, max: 360, step: 1, value: Math.round(st.th / DEG), color: 'primary', fmt: (v) => v + '°', aria: '中心角（度）' });
    sd.on((v) => { st.th = v * DEG; update(); });
    plot.addHandle({
      get x() { return Math.cos(st.th); }, get y() { return Math.sin(st.th); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 9,
      drag(x, y) {
        // 前の位置からの差を足していく（0 をまたいで一周まで続けて回せる）
        let th = st.th + T.wrapPi(Math.atan2(y, x) - st.th);
        th = clamp(th, 0, 2 * PI);
        // 1 rad 付近は 1 にすいつく
        if (Math.abs(th - 1) < 0.03) th = 1;
        st.th = th; sd.set(Math.round(th / DEG)); update();
      },
    });
    function update() {
      const th = st.th, d = th / DEG;
      tex(root, 'deg', '\\blue{\\theta}=' + num(d, 1) + '^\\circ');
      tex(root, 'len', '\\blue{\\text{弧の長さ}}=' + num(th, 3) + '\\ \\Rightarrow\\ \\blue{\\theta}=' + num(th, 3) + '\\,\\text{rad}');
      const msg = R(root, 'msg');
      msg.textContent = Math.abs(th - 1) < 0.005 ? '弧の長さがちょうど 1（半径と同じ）。この角が 1 ラジアン ≈ 57.3°。'
        : Math.abs(th - PI) < 0.01 ? '半周。弧の長さは π ≈ 3.14 なので、180° = π ラジアン。'
          : Math.abs(th - 2 * PI) < 0.01 ? '一周。弧の長さは円周 2π ≈ 6.28 なので、360° = 2π ラジアン。'
            : '弧の長さ（青）の数が、そのまま角の大きさ（ラジアン）です。';
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, th = st.th, small = g.w < 520;
      g.line(-1.3, 0, 1.3, 0, { color: c.axis, width: 1.2 });
      g.line(0, -1.3, 0, 1.3, { color: c.axis, width: 1.2 });
      circle(g, 1, { width: 2 });
      // 目印：π/2, π, 3π/2, 2π
      [[PI / 2, '\\dfrac{\\pi}{2}'], [PI, '\\pi'], [3 * PI / 2, '\\dfrac{3\\pi}{2}']].forEach(function (q) {
        g.dot(Math.cos(q[0]), Math.sin(q[0]), { r: 3, color: c.muted });
        if (q[0] === PI) g.tex(q[1], -1, 0, { dx: -8, dy: -12, align: 'right', size: 15, color: c.muted });
        else g.tex(q[1], 0, Math.sin(q[0]), { dx: 8, dy: q[0] < PI ? -16 : 16, align: 'left', size: 15, color: c.muted });
      });
      if (th > 0) {
        sector(g, 1, 0, th, soft(c.primary, 0.08));
        arc(g, 0, 0, 1, 0, th, { color: c.primary, width: 6 });
        arc(g, 0, 0, 0.2, 0, th, { color: c.primary, width: 2 });
      }
      g.line(0, 0, 1, 0, { color: c.text, width: 2.5 });
      g.line(0, 0, Math.cos(th), Math.sin(th), { color: c.text, width: 2.5 });
      g.tex('1', 0.5, 0, { dy: 13, align: 'center', size: 14, color: c.text });
      g.dot(0, 0, { r: 4, color: c.text });
      g.dot(1, 0, { r: 4, color: c.text });
      g.tex('(1,\\,0)', 1, 0, { dx: 8, dy: 14, align: 'left', size: 13, color: c.text });
      if (th > 0.12) {
        const m = th / 2;
        g.tex('\\blue{\\theta}', 0.36 * Math.cos(m), 0.36 * Math.sin(m), { align: 'center', size: 15 });
        if (!small || th < 5.6) g.tex('\\text{弧の長さ }' + num(th, 2), 1.5 * Math.cos(m), 1.42 * Math.sin(m), { align: 'center', size: small ? 13 : 15, color: c.primary });
      }
    };
    update();
  }

  /* ==========================================================
     3.2(2)(3) 度 ⇔ ラジアンのピザ（負の角＝時計回りにも対応）
     ========================================================== */
  function drawPizza(g, th, N, o) {
    const c = g.c; o = o || {};
    sector(g, 1.06, 0, 2 * PI, soft(c.brown || c.amber, 0.55));     // 耳
    sector(g, 1, 0, 2 * PI, soft(c.amber, 0.28));                   // チーズ
    for (let i = 0; i < N; i++) { const a = 2 * PI * i / N; g.line(0, 0, 1.06 * Math.cos(a), 1.06 * Math.sin(a), { color: c.surface, width: 2 }); }
    if (o.pepperoni !== false) {
      [[0.55, 0.4], [1.9, 0.62], [2.9, 0.45], [3.9, 0.7], [4.8, 0.38], [5.6, 0.66], [1.2, 0.78], [3.4, 0.82]].forEach(function (q) {
        const ctx = g.ctx; ctx.save(); ctx.fillStyle = soft(c.accent, 0.45); ctx.beginPath();
        ctx.arc(g.X(q[1] * Math.cos(q[0])), g.Y(q[1] * Math.sin(q[0])), 0.07 * g.pxPerX, 0, 2 * PI); ctx.fill(); ctx.restore();
      });
    }
    // 選んでいない部分はうすく（th < 0 なら時計回りに切る）
    const lo = Math.min(0, th), hi = Math.max(0, th), span = hi - lo;
    if (span > 0 && span < 2 * PI - 1e-6) sector(g, 1.07, hi, lo + 2 * PI, soft(c.surface, 0.68));
    if (span > 0) {
      g.line(0, 0, 1.06, 0, { color: c.text, width: 2.5 });
      g.line(0, 0, 1.06 * Math.cos(th), 1.06 * Math.sin(th), { color: c.text, width: 2.5 });
      arc(g, 0, 0, 1.06, lo, hi, { color: c.primary, width: 5 });
      arc(g, 0, 0, 0.22, 0, th, { color: c.primary, width: 2.5 });
      // 回る向きの矢印（半径 0.22 の弧の先）
      const ctx = g.ctx, r = 0.22, sg = th > 0 ? 1 : -1;
      const tx = g.X(r * Math.cos(th)), ty = g.Y(r * Math.sin(th));
      const ux = -Math.sin(th) * sg, uy = -Math.cos(th) * sg;   // 画面座標での進む向き
      const nx = -uy, ny = ux;
      ctx.save(); ctx.fillStyle = c.primary; ctx.beginPath();
      ctx.moveTo(tx + 7 * ux, ty + 7 * uy); ctx.lineTo(tx - 4 * ux + 5 * nx, ty - 4 * uy + 5 * ny); ctx.lineTo(tx - 4 * ux - 5 * nx, ty - 4 * uy - 5 * ny);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  function initPizza() {
    const root = $id('w-pizza'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.4, xmax: 2.4, equal: true, yc: 0, ratio: [1.0, 0.5] });
    responsive(plot, { xmin: -2.8, xmax: 2.8, yc: 0 }, { xmin: -1.6, xmax: 1.6, yc: 0 });
    const NS = [2, 3, 4, 6, 8, 12].map((N) => ({ label: N + ' 等分', N }));
    const DIRS = [{ label: '反時計回り（＋）', s: 1 }, { label: '時計回り（−）', s: -1 }];
    const st = { N: 6, k: 1, s: 1 };
    chipRow(R(root, 'ns'), NS, 3, (it) => { const f = st.k / st.N; st.N = it.N; sk.input.max = it.N; st.k = Math.round(f * it.N); sk.set(st.k); update(); });
    chipRow(R(root, 'dir'), DIRS, 0, (it) => { st.s = it.s; update(); });
    const sk = slider(ctl, { tex: 'k', min: 0, max: 6, step: 1, value: 1, color: 'primary', fmt: (v) => v + ' 切れ', aria: '切れの数' });
    sk.on((v) => { st.k = v; update(); });
    const ang = () => st.s * 2 * PI * st.k / st.N;
    plot.addHandle({
      get x() { return 1.06 * Math.cos(ang()); }, get y() { return 1.06 * Math.sin(ang()); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 9,
      drag(x, y) {
        let a = st.s * Math.atan2(y, x); if (a < 0) a += 2 * PI;   // 選んだ向きに測った角（0〜2π）
        let k = Math.round(a / (2 * PI / st.N)) % st.N;
        if (k === 0 && st.k > st.N / 2) k = st.N;
        st.k = k; sk.set(k); update();
      },
    });
    function update() {
      const N = st.N, k = st.k, sg = st.s < 0 && k > 0 ? '-' : '';
      tex(root, 'one', '\\dfrac{360^\\circ}{' + N + '}=' + num(360 / N, 1) + '^\\circ=' + D(piTeX(2, N)) + '\\,\\text{rad}');
      tex(root, 'deg', '\\blue{\\theta}=' + sg + num(360 * k / N, 1) + '^\\circ' + (sg ? '\\ (\\text{時計回り})' : ''));
      tex(root, 'rad', '\\blue{\\theta}=' + sg + D(piTeX(2 * k, N)) + '\\,\\text{rad}' + (k ? '\\approx' + sg + num(2 * PI * k / N, 3) : ''));
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, th = ang();
      drawPizza(g, th, st.N);
      if (st.k > 0) g.tex((st.s < 0 ? '-' : '') + D(piTeX(2 * st.k, st.N)), 1.32 * Math.cos(th / 2), 1.32 * Math.sin(th / 2), { align: 'center', size: 18, color: c.primary });
    };
    update();
  }

  /* ==========================================================
     3.2(4) 弧の長さと扇形の面積
     ========================================================== */
  function initSector() {
    const root = $id('w-sector'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4.6, xmax: 4.6, equal: true, yc: 0, ratio: [0.95, 0.56] });
    responsive(plot, { xmin: -5.6, xmax: 5.6, yc: 0 }, { xmin: -3.4, xmax: 3.4, yc: 0 });
    const sr = slider(ctl, { tex: 'r', min: 0.5, max: 3, step: 0.5, value: 2, color: 'violet', aria: '半径 r' });
    const sk = slider(ctl, { tex: '\\blue{\\theta}', min: 0, max: 24, step: 1, value: 4, color: 'primary', fmt: (v) => piTxt(v, 12), aria: '中心角 θ（π/12 ずつ）' });
    function update() {
      const r = sr.get(), k = sk.get(), a = Math.round(r * 2), th = k * PI / 12;
      const rT = num(r, 1);
      tex(root, 'th', D('\\blue{\\theta}=' + piTeX(k, 12) + '\\,(=' + (k * 15) + '^\\circ)'));
      tex(root, 's', D('\\blue{s}=r\\blue{\\theta}=' + rT + '\\times' + piTeX(k, 12) + '=' + piTeX(a * k, 24) + (k ? '\\approx' + num(r * th, 2) : '')));
      tex(root, 'S', D('S=\\frac12r^2\\blue{\\theta}=\\frac12\\times' + rT + '^2\\times' + piTeX(k, 12) + '=' + piTeX(a * a * k, 96) + (k ? '\\approx' + num(0.5 * r * r * th, 2) : '')));
      plot.invalidate();
    }
    sr.on(update); sk.on(update);
    plot.draw = function (g) {
      const c = g.c, r = sr.get(), th = sk.get() * PI / 12;
      circle(g, r, { dash: [4, 4] });
      if (th > 0) sector(g, r, 0, th, soft(c.violet, 0.18));
      g.line(0, 0, r, 0, { color: c.violet, width: 3 });
      g.line(0, 0, r * Math.cos(th), r * Math.sin(th), { color: c.violet, width: 3 });
      if (th > 0) arc(g, 0, 0, r, 0, th, { color: c.primary, width: 5 });
      if (th > 0) arc(g, 0, 0, Math.min(0.4, r * 0.4), 0, th, { color: c.primary, width: 2 });
      g.dot(0, 0, { r: 4, color: c.text });
      g.tex('r', r / 2, 0, { dy: 13, align: 'center', size: 16, color: c.violet });
      if (th > 0.05) {
        const m = th / 2;
        g.tex('s', (r + 0.25) * Math.cos(m), (r + 0.25) * Math.sin(m), { align: 'center', size: 17, color: c.primary });
        if (r >= 1 && th > 0.3) g.tex('S', 0.6 * r * Math.cos(m), 0.6 * r * Math.sin(m), { align: 'center', size: 16, color: c.violet });
      }
    };
    update();
  }

  /* ==========================================================
     3.2(5) 正多角形で π をはさむ（アルキメデス）
     ========================================================== */
  function initArchi() {
    const root = $id('w-archi');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.6, xmax: 2.6, equal: true, yc: 0, ratio: [0.85, 0.5] });
    responsive(plot, { xmin: -2.6, xmax: 2.6, yc: 0 }, { xmin: -1.45, xmax: 1.45, yc: 0 });
    const NS = [6, 12, 24, 48, 96].map((n) => ({ label: '正' + n + '角形', n }));
    let n = 6;
    chipRow(R(root, 'ns'), NS, 0, (it) => { n = it.n; update(); });
    function update() {
      tex(root, 'in', '\\teal{' + n + '\\sin\\frac{\\pi}{' + n + '}}' + (n === 6 ? '=' : '\\approx') + '\\teal{' + num(n * Math.sin(PI / n), 5) + '}');
      tex(root, 'out', '\\red{' + n + '\\tan\\frac{\\pi}{' + n + '}}\\approx\\red{' + num(n * Math.tan(PI / n), 5) + '}');
      tex(root, 'pi', '\\teal{' + num(n * Math.sin(PI / n), 4) + '}\\lt\\pi\\lt\\red{' + num(n * Math.tan(PI / n), 4) + '}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, Rr = 1 / Math.cos(PI / n), a0 = PI / 2, inn = [], out = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + 2 * PI * i / n;
        inn.push([Math.cos(a), Math.sin(a)]);
        out.push([Rr * Math.cos(a + PI / n), Rr * Math.sin(a + PI / n)]);
      }
      g.poly(out, { color: c.accent, width: 2 });
      circle(g, 1, { color: c.primary, width: 2.5 });
      g.poly(inn, { color: c.teal, width: 2 });
      g.dot(0, 0, { r: 3, color: c.text });
      if (n === 6) {
        g.line(0, 0, inn[0][0], inn[0][1], { color: c.muted, width: 1.2, dash: [3, 3] });
        g.tex('1', 0, 0.5, { dx: 6, size: 13, color: c.muted });
      }
    };
    update();
  }

  /* ==========================================================
     3.2(6) チャレンジ：ラジアン・ピザ
     ========================================================== */
  const P_STAGES = [
    { name: 'π/2', p: 1, q: 2, text: '$\\dfrac{\\pi}{2}$ ラジアン分のピザを切り分けよう。', hint: '$\\pi=180^\\circ$。その半分。',
      answer: '<b>90°</b><br>$\\dfrac{\\pi}{2}=\\dfrac{180^\\circ}{2}=90^\\circ$（4分の1枚）' },
    { name: 'π/3', p: 1, q: 3, text: '$\\dfrac{\\pi}{3}$ ラジアン分のピザを切り分けよう。', hint: '$\\pi=180^\\circ$ を 3 等分。',
      answer: '<b>60°</b><br>$\\dfrac{\\pi}{3}=\\dfrac{180^\\circ}{3}=60^\\circ$（6分の1枚）' },
    { name: '3π/4', p: 3, q: 4, text: '$\\dfrac{3\\pi}{4}$ ラジアン分のピザを切り分けよう。', hint: 'まず $\\dfrac{\\pi}{4}$ が何度かを考えて、それを 3 倍。',
      answer: '<b>135°</b><br>$\\dfrac{\\pi}{4}=45^\\circ$ なので $\\dfrac{3\\pi}{4}=3\\times45^\\circ=135^\\circ$' },
    { name: '4π/3', p: 4, q: 3, text: '$\\dfrac{4\\pi}{3}$ ラジアン分のピザを切り分けよう（半分より多い！）。', hint: '$\\dfrac{\\pi}{3}=60^\\circ$ の 4 倍。',
      answer: '<b>240°</b><br>$\\dfrac{4\\pi}{3}=4\\times60^\\circ=240^\\circ$（3分の2枚）' },
    { name: '面積', p: 5, q: 6, r: 2, text: '半径 $2$ のピザから、面積がちょうど $\\dfrac{5\\pi}{3}$ になるように切り分けよう。', hint: '扇形の面積は $S=\\frac12r^2\\theta$。$r=2$ を入れて $\\theta$ を求め、度に直す。',
      answer: '<b>150°</b><br>$\\frac12\\times2^2\\times\\theta=\\dfrac{5\\pi}{3}$ より $2\\theta=\\dfrac{5\\pi}{3}$、$\\theta=\\dfrac{5\\pi}{6}$<br>$\\dfrac{5\\pi}{6}=5\\times30^\\circ=150^\\circ$' },
  ];
  function initGamePizza() {
    const root = $id('w-game-pizza'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.4, xmax: 2.4, equal: true, yc: 0, ratio: [1.0, 0.5] });
    responsive(plot, { xmin: -2.8, xmax: 2.8, yc: 0 }, { xmin: -1.6, xmax: 1.6, yc: 0 });
    const st = { k: 0, shots: [] };                  // k：15° 単位の角
    const sd = slider(ctl, { tex: '\\blue{\\theta}', min: 0, max: 24, step: 1, value: 0, color: 'primary', fmt: (v) => (v * 15) + '°', aria: '切り分ける角（15° ずつ）' });
    sd.on((v) => { if (game.done) { sd.set(st.k); return; } st.k = v; game.formula(); plot.invalidate(); });
    const B = gameButtons(ctl, '🍕 切る');
    const conf = Confetti(root, plot);
    const S = () => P_STAGES[game.k];
    const target = () => 12 * S().p / S().q;        // 15° 単位
    plot.addHandle({
      get x() { return 1.06 * Math.cos(st.k * PI / 12); }, get y() { return 1.06 * Math.sin(st.k * PI / 12); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 9,
      hidden: () => game.done,
      drag(x, y) {
        let a = Math.atan2(y, x); if (a < 0) a += 2 * PI;
        let k = Math.round(a / (PI / 12)) % 24;
        if (k === 0 && st.k > 12) k = 24;
        st.k = k; sd.set(k); game.formula();
      },
    });
    const game = GameShell(root, { key: '3-2:game', stages: P_STAGES,
      formula: () => '\\text{いまの角 }\\blue{\\theta}=' + (st.k * 15) + '^\\circ',
      onStage() { st.shots = []; st.k = 0; sd.set(0); sd.input.disabled = false; B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission')); plot.invalidate(); } });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const k = st.k, tk = target();
      st.shots.push(k); game.used++; game.renderThrows();
      if (k === tk) {
        const n = 4 - game.used; game.award(n); game.done = true; sd.input.disabled = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= P_STAGES.length - 1;
        game.result('🎯 ぴったり！ ' + starStr(n) + '（' + game.used + ' 回目）　$' + (k * 15) + '^\\circ=' + piTeX(k, 12) + '$', 'hit');
        conf.fire(plot.X(0), plot.Y(0));
      } else {
        let t = (k > tk ? '大きすぎる' : '小さすぎる') + '（' + (k * 15) + '°）。';
        if (game.used >= 3) { t += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(t, 'miss');
      }
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, P_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, th = st.k * PI / 12;
      drawPizza(g, th, 8);
      st.shots.forEach(function (k) { if (k !== st.k) g.line(0, 0, 1.1 * Math.cos(k * PI / 12), 1.1 * Math.sin(k * PI / 12), { color: c.muted, width: 1.5, dash: [3, 4] }); });
      if (st.k > 0) g.tex(game.done ? D(piTeX(st.k, 12)) : st.k * 15 + '^\\circ', 1.3 * Math.cos(th / 2), 1.3 * Math.sin(th / 2), { align: 'center', size: 17, color: c.primary });
      if (S().r) g.texPx('\\text{半径 }' + S().r, 10, 16, { size: 14, color: c.muted });
      conf.draw(g);
    };
    game.setStage(0);
  }

  T.boot([
    [initUnit, 'w-unit'],
    [initPizza, 'w-pizza'],
    [initSector, 'w-sector'],
    [initArchi, 'w-archi'],
    [initGamePizza, 'w-game-pizza'],
  ]);
})();
