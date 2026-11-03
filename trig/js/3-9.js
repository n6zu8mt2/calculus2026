/* 第3章 3.9節 形と動き — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 * 色の約束: 角 θ = 青, cos（横・x）= 緑, sin（縦・y）= 赤, tan = 金
 *
 * この節だけの部品
 *   chipRow / fit / arcAt      … 3.7節と同じ小さな部品（チップ・縦横同じ縮尺・角の弧）
 *   surdTeX(v)                 … q√m（m = 1, 2, 3、q は 1/4 の倍数）の形なら正確な TeX に
 *   armIK(x, y, l1, l2, elbow) … 2本の腕の逆運動学（余弦定理 + atan2）
 *   drawArm(g, …)              … ロボットアームの絵
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, slider, Plot, clamp } = L;
  const { starStr, GameShell, gameButtons, Confetti } = L.game;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI, DEG = PI / 180;
  const dg = (a, d) => num(a / DEG, d == null ? 1 : d) + '^\\circ';
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };

  /* ---------- 小さな部品 ---------- */
  function chipRow(box, items, cur, onPick) {
    box.innerHTML = '';
    const btns = items.map(function (it, i) {
      const b = el('button', 'chip', it.tex ? '' : it.label);
      b.type = 'button';
      if (it.tex) { const s = el('span'); b.append(s); L.setTex(s, it.tex); }
      if (it.aria) b.setAttribute('aria-label', it.aria);
      b.addEventListener('click', () => { press(btns, i); onPick(it, i); });
      box.append(b);
      return b;
    });
    press(btns, cur);
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
  function circle(g, x, y, r, o) {
    const ctx = g.ctx;
    ctx.save(); ctx.beginPath(); ctx.arc(g.X(x), g.Y(y), Math.max(0, r * g.pxPerX), 0, TAU);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.globalAlpha = o.fa == null ? 1 : o.fa; ctx.fill(); ctx.globalAlpha = 1; }
    if (o.color) { ctx.strokeStyle = o.color; ctx.lineWidth = o.width || 1.5; ctx.globalAlpha = o.alpha == null ? 1 : o.alpha; ctx.setLineDash(o.dash || []); ctx.stroke(); }
    ctx.restore();
  }
  // 点の列を1本の線で（Float32Array [x0,y0,x1,y1,…] でもよい）
  function path(g, pts, n, o) {
    const ctx = g.ctx;
    ctx.save(); ctx.strokeStyle = o.color; ctx.lineWidth = o.width || 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.setLineDash(o.dash || []);
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const px = g.X(pts[2 * i]), py = g.Y(pts[2 * i + 1]); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke(); ctx.restore();
  }
  // q√m（m = 1, 2, 3、q は 1/4 の倍数）なら正確な形の TeX
  function surdTeX(v) {
    if (Math.abs(v) < 1e-9) return '0';
    for (const m of [1, 2, 3]) {
      const q4 = v / Math.sqrt(m) * 4, k = Math.round(q4);
      if (Math.abs(q4 - k) > 1e-7) continue;
      const s = k < 0 ? '-' : '';
      let n = Math.abs(k), d = 4; const g0 = gcd(n, d); n /= g0; d /= g0;
      const rt = m === 1 ? '' : '\\sqrt' + m, co = n === 1 && m > 1 ? '' : String(n);
      return d === 1 ? s + co + rt : s + '\\frac{' + co + rt + '}{' + d + '}';
    }
    return num(v, 2);
  }
  const paren = (s) => (s[0] === '-' ? '\\left(' + s + '\\right)' : s);

  /* ==========================================================
     3.9(1) リサジュー図形（ステレオで聞く）
     ========================================================== */
  const RATIOS = [[1, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5]];
  const F0 = 220, DETUNE = 0.25;
  function lissPts(a, b, d, n) {
    const out = new Float32Array(2 * (n + 1));
    for (let i = 0; i <= n; i++) { const t = TAU * i / n; out[2 * i] = Math.sin(a * t + d); out[2 * i + 1] = Math.sin(b * t); }
    return out;
  }
  // 右の辺（x = 1）と上の辺（y = 1）にふれる点（重なりは1つと数える）
  function touches(a, b, d) {
    const uniq = (arr) => arr.filter((p, i) => arr.findIndex((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6) === i);
    const right = [], top = [];
    for (let k = 0; k < a; k++) { const t = (PI / 2 + TAU * k - d) / a; right.push([1, Math.sin(b * t)]); }
    for (let k = 0; k < b; k++) { const t = (PI / 2 + TAU * k) / b; top.push([Math.sin(a * t + d), 1]); }
    return { right: uniq(right), top: uniq(top) };
  }
  function drawLissBox(g, x0, y0, x1, y1) {
    const ctx = g.ctx;
    ctx.save(); ctx.strokeStyle = g.c.muted; ctx.globalAlpha = 0.6; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.strokeRect(g.X(x0), g.Y(y1), g.X(x1) - g.X(x0), g.Y(y0) - g.Y(y1)); ctx.restore();
  }
  function initLiss() {
    const root = $id('w-liss');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2, xmax: 2, ymin: -2, ymax: 2, ratio: [0.95, 0.6] });
    const st = { a: 3, b: 4, d: PI / 4, t: 0, run: true, touch: true, spin: false, snd: null };
    const sd = slider(root.querySelector('.controls'), { tex: '\\delta', min: 0, max: 360, step: 5, value: 45, color: 'teal', aria: '横の波のずれ δ（度）', fmt: (v) => v + '°' });
    sd.on((v) => { st.d = v * DEG; update(); });
    chipRow(R(root, 'ratio'), RATIOS.map((r) => ({ label: r[0] + ' : ' + r[1] })), 3, (it, i) => {
      st.a = RATIOS[i][0]; st.b = RATIOS[i][1]; st.t = 0; update(); setTones();
    });
    const bPlay = R(root, 'play');
    bPlay.addEventListener('click', () => { st.run = !st.run; bPlay.textContent = st.run ? '⏸ 止める' : '▶ 動かす'; anim.kick(); });
    R(root, 'touch').addEventListener('change', (e) => { st.touch = e.target.checked; plot.invalidate(); });
    R(root, 'spin').addEventListener('change', (e) => { st.spin = e.target.checked; setTones(); anim.kick(); update(); });
    const msg = R(root, 'msg');
    function update() {
      const dd = Math.round(st.d / DEG) % 360;
      const dT = dd % 15 === 0 ? T.radTeX(dd * DEG) : num(st.d, 2);
      tex(root, 'eq', 'x=\\teal{\\sin(' + (st.a === 1 ? '' : st.a) + 't' + (dd === 0 ? '' : '+' + dT) + ')},\\ \\ y=\\red{\\sin ' + (st.b === 1 ? '' : st.b) + 't}');
      const tc = touches(st.a, st.b, st.d);
      tex(root, 'cnt', '\\text{右 }\\teal{' + tc.right.length + '}\\text{ 回・上 }\\red{' + tc.top.length + '}\\text{ 回}\\ \\Rightarrow\\ a:b=' + st.a + ':' + st.b);
      if (tc.right.length < st.a || tc.top.length < st.b) { msg.className = 'msg ng'; msg.textContent = '行きと帰りの線が重なって、ふれる点が減っている（δ を変えると元にもどる）。'; }
      else { msg.className = 'msg ok'; msg.textContent = '横の波が ' + st.a + ' 回、縦の波が ' + st.b + ' 回ゆれる間に、点は元にもどる。'; }
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.run && !st.spin) return false;
      if (st.run) st.t = (st.t + dt * TAU / (3 + 0.8 * Math.max(st.a, st.b))) % TAU;
      if (st.spin) {
        st.d = (st.d + TAU * DETUNE * dt) % TAU;
        sd.set(Math.round(st.d / DEG / 5) * 5 % 360);
        update();
      } else plot.invalidate();
      return true;
    });
    plot.draw = function (g) {
      const c = g.c, a = st.a, b = st.b, d = st.d;
      fit(g, -1.62, 1.45, -1.5, 1.3);
      drawLissBox(g, -1, -1, 1, 1);
      g.line(-1.15, 0, 1.15, 0, { color: c.axis, width: 1 });
      g.line(0, -1.15, 0, 1.15, { color: c.axis, width: 1 });
      // 横・縦の位置を写すレール
      const ry = -1.27, rx = -1.37;
      g.line(-1, ry, 1, ry, { color: c.teal, width: 2, alpha: 0.35 });
      g.line(rx, -1, rx, 1, { color: c.accent, width: 2, alpha: 0.35 });
      g.tex('x', 1, ry, { dx: 10, align: 'left', size: 14, color: c.teal });
      g.tex('y', rx, 1, { dy: -10, align: 'center', valign: 'bottom', size: 14, color: c.accent });
      const all = lissPts(a, b, d, 900);
      path(g, all, 901, { color: c.violet, width: 1.6, alpha: 0.28 });
      // 点のあと（直前の 0.55 周ぶん）
      const n = 160, tr = new Float32Array(2 * (n + 1)), span = TAU * 0.55;
      for (let i = 0; i <= n; i++) { const t = st.t - span + span * i / n; tr[2 * i] = Math.sin(a * t + d); tr[2 * i + 1] = Math.sin(b * t); }
      path(g, tr, n + 1, { color: c.violet, width: 3.2 });
      if (st.touch) {
        const tc = touches(a, b, d);
        tc.right.forEach((p) => g.dot(p[0], p[1], { r: 6, ring: true, color: c.teal }));
        tc.top.forEach((p) => g.dot(p[0], p[1], { r: 6, ring: true, color: c.accent }));
      }
      const px = Math.sin(a * st.t + d), py = Math.sin(b * st.t);
      g.line(px, py, px, ry, { color: c.teal, width: 1.2, dash: [3, 4], alpha: 0.8 });
      g.line(px, py, rx, py, { color: c.accent, width: 1.2, dash: [3, 4], alpha: 0.8 });
      g.dot(px, ry, { r: 6, color: c.teal });
      g.dot(rx, py, { r: 6, color: c.accent });
      g.dot(px, py, { r: 7, color: c.violet });
    };
    // ---- 音（押すまで鳴らない・画面外やタブを隠すと止める）----
    const sp = root.querySelector('.panel.sound');
    T.permBox(sp, '🔊 音が出ます（イヤホン推奨・音量に注意）。ボタンを押すまで鳴りません。左の耳に a×220 Hz、右の耳に b×220 Hz の音を流します。');
    const bSnd = R(root, 'snd'), bStop = R(root, 'stop'), sstat = R(root, 'sstat');
    function freqs() { return [st.a * F0 + (st.spin ? DETUNE : 0), st.b * F0]; }
    function setTones() {
      if (!st.snd) return;
      const f = freqs(); st.snd[0].set({ freq: f[0] }); st.snd[1].set({ freq: f[1] });
      say();
    }
    function say() {
      if (!st.snd) { sstat.className = 'msg ng'; sstat.textContent = '音は止まっています。'; return; }
      const f = freqs();
      sstat.className = 'msg ok';
      sstat.textContent = '左 ' + num(f[0], 2) + ' Hz ／ 右 ' + f[1] + ' Hz を再生中（比 ' + st.a + ' : ' + st.b + '）';
    }
    function start() {
      if (st.snd) return;
      if (!T.Audio.ctx()) { sstat.className = 'msg ng'; sstat.textContent = 'この端末では音を出せません。'; return; }
      const f = freqs();
      st.snd = [T.Audio.tone({ freq: f[0], amp: 0.35, pan: -1 }), T.Audio.tone({ freq: f[1], amp: 0.35, pan: 1 })];
      bStop.disabled = false; bSnd.disabled = true; say();
    }
    function stop() {
      if (st.snd) { st.snd.forEach((s) => s.stop()); st.snd = null; }
      bStop.disabled = true; bSnd.disabled = false; say();
    }
    bSnd.addEventListener('click', start);
    bStop.addEventListener('click', stop);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (!es[0].isIntersecting) stop(); }).observe(root);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
    say();
    update();
    anim.kick();
  }

  /* ==========================================================
     3.9(2) 転がる車輪：サイクロイドとトロコイド
     ========================================================== */
  function initCyc() {
    const root = $id('w-cyc');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 14, ymin: -1, ymax: 3, ratio: [0.5, 0.3] });
    const turns = () => (plot.w && plot.w < 520 ? 1 : 2);
    const maxT = () => TAU * turns();
    const st = { k: 1, th: 0, run: true };
    const PRE = [{ label: 'タイヤの縁（d = r）', k: 1 }, { label: '反射板（d = 0.6r）', k: 0.6 }, { label: '中心（d = 0）', k: 0 }, { label: '電車の車輪のつば（d = 1.3r）', k: 1.3 }];
    const sk = slider(root.querySelector('.controls'), { tex: 'd', min: 0, max: 1.5, step: 0.05, value: 1, color: 'amber', aria: '中心から点までの距離 d（r = 1）', fmt: (v) => v.toFixed(2) + 'r' });
    const chips = chipRow(R(root, 'pre'), PRE, 0, (it) => { st.k = it.k; sk.set(it.k); update(); });
    sk.on((v) => { st.k = v; update(); });
    const bPlay = R(root, 'play');
    const setRun = (r) => { st.run = r; bPlay.textContent = r ? '⏸ 止める' : '▶ 動かす'; anim.kick(); };
    bPlay.addEventListener('click', () => setRun(!st.run));
    R(root, 'reset').addEventListener('click', () => { st.th = 0; update(); });
    plot.addHandle({ get x() { return st.th; }, get y() { return 1; }, get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 8,
      drag(x) { if (st.run) setRun(false); st.th = clamp(x, 0, maxT()); update(); } });
    const P = (th, k) => [th - k * Math.sin(th), 1 - k * Math.cos(th)];
    const msg = R(root, 'name');
    function update() {
      chips.forEach((b, j) => b.setAttribute('aria-pressed', String(Math.abs(PRE[j].k - st.k) < 1e-9)));
      const p = P(st.th, st.k);
      tex(root, 'pos', '(x,\\ y)\\approx(' + num(p[0], 2) + ',\\ ' + num(p[1], 2) + ')');
      tex(root, 'dist', '\\blue{\\theta}=' + dg(st.th, 0) + '\\approx' + num(st.th, 2) + ',\\ \\ r\\blue{\\theta}\\approx' + num(st.th, 2) + '\\ (r=1)');
      if (Math.abs(st.k - 1) < 1e-9) { msg.className = 'msg ok'; msg.textContent = 'サイクロイド：地面にふれるたびに一瞬止まり、とがった形になる。'; }
      else if (st.k < 1e-9) { msg.className = 'msg ng'; msg.textContent = '中心はまっすぐ横に進むだけ（直線）。'; }
      else if (st.k < 1) { msg.className = 'msg ok'; msg.textContent = 'トロコイド（縁より内側）：なめらかな波の形。自転車の反射板の動き。'; }
      else { msg.className = 'msg ok'; msg.textContent = 'トロコイド（縁より外側）：輪をえがき、一瞬うしろへ進む。電車の車輪のつばの動き。'; }
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.run) return false;
      st.th += 1.3 * dt;
      if (st.th > maxT() + 0.6) st.th = 0;
      update();
      return true;
    });
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, k = st.k, MAX = maxT(), th = Math.min(st.th, MAX);
      fit(g, -1.25, MAX + 1.25, -0.75, 2.75);
      // 地面
      ctx.save(); ctx.fillStyle = c.muted; ctx.globalAlpha = 0.12; ctx.fillRect(0, g.Y(0), g.w, g.h - g.Y(0)); ctx.restore();
      g.line(g.xmin, 0, g.xmax, 0, { color: c.text, width: 1.5 });
      // 進んだ道（弧の長さ rθ）
      if (th > 0.02) g.line(0, 0, th, 0, { color: c.primary, width: 4 });
      // 曲線の全体（うすく）と、ここまでのあと
      const n = 400, all = new Float32Array(2 * (n + 1));
      for (let i = 0; i <= n; i++) { const p = P(MAX * i / n, k); all[2 * i] = p[0]; all[2 * i + 1] = p[1]; }
      path(g, all, n + 1, { color: c.amber, width: 1.5, alpha: 0.3, dash: [5, 4] });
      const m = Math.max(1, Math.ceil(th / 0.03)), tr = new Float32Array(2 * (m + 1));
      for (let i = 0; i <= m; i++) { const p = P(th * i / m, k); tr[2 * i] = p[0]; tr[2 * i + 1] = p[1]; }
      path(g, tr, m + 1, { color: c.amber, width: 3 });
      // 車輪
      circle(g, th, 1, 1, { fill: c.surface, fa: 0.55, color: c.text, width: 2.5 });
      for (let i = 0; i < 6; i++) { const a = -PI / 2 - th + i * PI / 3; g.line(th, 1, th + Math.cos(a), 1 + Math.sin(a), { color: c.muted, width: 1.2, alpha: 0.7 }); }
      // 中心から点へ（角 θ は真下から測る）
      const p = P(th, k);
      if (k > 1e-9) {
        g.line(th, 1, th, 0, { color: c.muted, width: 1.2, dash: [3, 4] });
        g.line(th, 1, p[0], p[1], { color: c.amber, width: 2.5 });
        if (th > 0.15) arcAt(g, th, 1, 0.38, -PI / 2, -PI / 2 - Math.min(th, TAU - 0.05), { color: c.primary, width: 2.5 });
      }
      g.dot(p[0], p[1], { r: 7, color: c.amber });
      // 目盛り：π, 2π, 3π, 4π
      for (let i = 1; i <= 2 * turns(); i++) g.tex(i === 1 ? '\\pi' : i + '\\pi', i * PI, 0, { dy: 6, align: 'center', valign: 'top', size: 12, color: c.muted });
      if (th > 1.5) g.tex('r\\blue{\\theta}', th / 2, 0, { dy: -10, align: 'center', valign: 'bottom', size: 13, color: c.primary, avoid: true });
    };
    update();
    anim.kick();
  }

  /* ==========================================================
     3.9(2) スピログラフ（画像として保存）
     ========================================================== */
  const SPIRO_COLS = ['primary', 'accent', 'teal', 'amber', 'violet', 'brown'];
  function spiroPts(Rr, r, k) {
    const g0 = gcd(Rr, r), turns = r / g0, n = Math.min(40000, Math.ceil(turns * 420)), Tt = TAU * turns;
    const out = new Float32Array(2 * (n + 1)), d = k * r;
    for (let i = 0; i <= n; i++) {
      const t = Tt * i / n, u = (Rr - r) * t / r;
      out[2 * i] = ((Rr - r) * Math.cos(t) + d * Math.cos(u)) / Rr;
      out[2 * i + 1] = ((Rr - r) * Math.sin(t) - d * Math.sin(u)) / Rr;
    }
    return { pts: out, n: n + 1, Tt };
  }
  function initSpiro() {
    const root = $id('w-spiro'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1, xmax: 1, ymin: -1, ymax: 1, ratio: [0.95, 0.62] });
    const st = { R: 96, r: 36, k: 0.75, col: 0, strokes: [], cur: null, prev: null };
    const RINGS = [96, 105, 120];
    chipRow(R(root, 'ring'), RINGS.map((v) => ({ label: String(v) })), 0, (it, i) => { st.R = RINGS[i]; update(); });
    const sr = slider(ctl, { tex: 'r', min: 20, max: 84, step: 1, value: 36, color: 'primary', aria: '歯車の歯の数 r' });
    const sk = slider(ctl, { tex: 'd', min: 0.2, max: 1, step: 0.05, value: 0.75, color: 'amber', aria: 'ペンの穴の位置 d（歯車の半径に対する割合）', fmt: (v) => v.toFixed(2) + 'r' });
    sr.on((v) => { st.r = v; update(); });
    sk.on((v) => { st.k = v; update(); });
    const colBox = R(root, 'col');
    chipRow(colBox, SPIRO_COLS.map((k) => ({ label: '<i style="background:var(--' + k + ')"></i>', aria: '色 ' + k })), 0, (it, i) => { st.col = i; plot.invalidate(); });
    const bDraw = R(root, 'draw'), bFast = R(root, 'fast');
    function begin(fast) {
      if (st.cur) finish();
      const s = spiroPts(st.R, st.r, st.k);
      st.cur = { R: st.R, r: st.r, k: st.k, col: SPIRO_COLS[st.col], pts: s.pts, n: s.n, Tt: s.Tt, p: fast ? 1 : 0, dur: Math.min(9, 1.6 + 0.7 * (st.r / gcd(st.R, st.r))) };
      st.strokes.push(st.cur);
      if (fast) finish(); else anim.kick();
      plot.invalidate();
    }
    function finish() { if (st.cur) { st.cur.p = 1; st.cur = null; } plot.invalidate(); }
    bDraw.addEventListener('click', () => begin(false));
    bFast.addEventListener('click', () => begin(true));
    R(root, 'undo').addEventListener('click', () => { if (st.strokes.length) { if (st.strokes[st.strokes.length - 1] === st.cur) st.cur = null; st.strokes.pop(); } plot.invalidate(); });
    R(root, 'clear').addEventListener('click', () => { st.strokes = []; st.cur = null; plot.invalidate(); });
    R(root, 'save').addEventListener('click', save);
    function update() {
      const g0 = gcd(st.R, st.r);
      tex(root, 'gcd', 'R=' + st.R + ',\\ r=' + st.r + '\\ \\Rightarrow\\ \\text{最大公約数 }' + g0);
      tex(root, 'petal', '\\text{模様 }' + st.R + '\\div' + g0 + '=' + (st.R / g0) + '\\text{ 回、歯車は }' + st.r + '\\div' + g0 + '=' + (st.r / g0) + '\\text{ 周でもどる}');
      st.prev = spiroPts(st.R, st.r, st.k);
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.cur) return false;
      st.cur.p = Math.min(1, st.cur.p + dt / st.cur.dur);
      if (st.cur.p >= 1) { finish(); return false; }
      plot.invalidate();
      return true;
    });
    function strokeCount(s) { return Math.max(1, Math.round(s.n * s.p)); }
    plot.draw = function (g) {
      const c = g.c;
      fit(g, -1.08, 1.08, -1.08, 1.08);
      circle(g, 0, 0, 1, { color: c.muted, width: 2, alpha: 0.6 });
      if (!st.cur && st.prev) path(g, st.prev.pts, st.prev.n, { color: c[SPIRO_COLS[st.col]], width: 1, alpha: 0.22 });
      st.strokes.forEach((s) => path(g, s.pts, strokeCount(s), { color: c[s.col], width: 1.6 }));
      // 描いている途中は歯車とペンを見せる
      const s = st.cur;
      if (s) {
        const t = s.Tt * s.p, cr = (s.R - s.r) / s.R, gx = cr * Math.cos(t), gy = cr * Math.sin(t), rr = s.r / s.R;
        circle(g, gx, gy, rr, { fill: c.surface, fa: 0.35, color: c.text, width: 2 });
        const i = strokeCount(s) - 1, px = s.pts[2 * i], py = s.pts[2 * i + 1];
        g.line(gx, gy, px, py, { color: c.muted, width: 1.5 });
        g.dot(gx, gy, { r: 3, color: c.text, stroke: false });
        g.dot(px, py, { r: 6, color: c[s.col] });
      }
    };
    // 模様だけを PNG にしてダウンロード（どこにも送らない）
    function save() {
      const N = 1200, cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      const ctx = cv.getContext('2d'), c = L.palette(), S = N * 0.46;
      ctx.fillStyle = c.bg; ctx.fillRect(0, 0, N, N);
      const list = st.strokes.length ? st.strokes : [{ pts: st.prev.pts, n: st.prev.n, p: 1, col: SPIRO_COLS[st.col] }];
      list.forEach(function (s) {
        const n = strokeCount(s);
        ctx.strokeStyle = c[s.col]; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.beginPath();
        for (let i = 0; i < n; i++) { const x = N / 2 + S * s.pts[2 * i], y = N / 2 - S * s.pts[2 * i + 1]; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
      });
      const name = 'spirograph-' + st.R + '-' + st.r + '.png';
      const done = (url, revoke) => {
        const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
        if (revoke) setTimeout(() => URL.revokeObjectURL(url), 2000);
        const n = R(root, 'sav'); n.textContent = '「' + name + '」を保存しました（この端末の中だけ）。';
      };
      if (cv.toBlob) cv.toBlob((b) => { if (b) done(URL.createObjectURL(b), true); else done(cv.toDataURL('image/png'), false); }, 'image/png');
      else done(cv.toDataURL('image/png'), false);
    }
    update();
  }

  /* ==========================================================
     3.9(3) 極座標 (r, θ) ⇔ (x, y)
     ========================================================== */
  function polarGrid(g, rmax) {
    const c = g.c, ctx = g.ctx;
    ctx.save(); ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (let r = 1; r <= rmax; r++) { ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), r * g.pxPerX, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const a = i * PI / 6; ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(rmax * Math.cos(a)), g.Y(rmax * Math.sin(a))); ctx.stroke(); }
    ctx.restore();
    g.line(g.xmin, 0, g.xmax, 0, { color: c.axis, width: 1.5 });
    g.line(0, g.ymin, 0, g.ymax, { color: c.axis, width: 1.5 });
    for (let r = 1; r <= rmax; r++) g.tex(String(r), 0, -r, { dx: -5, dy: 3, align: 'right', valign: 'top', size: 11, color: c.muted });
  }
  function initPolar() {
    const root = $id('w-polar');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.5, xmax: 3.5, ymin: -3.5, ymax: 3.5, ratio: [0.9, 0.56] });
    const st = { r: 2, th: PI / 3 };
    const PRE = [{ tex: '(2,\\ \\frac{\\pi}{3})', r: 2, th: PI / 3 }, { tex: '(3,\\ \\frac{3\\pi}{4})', r: 3, th: 3 * PI / 4 }, { tex: '(2,\\ -\\frac{\\pi}{6})', r: 2, th: -PI / 6 }, { tex: '(1,\\ \\pi)', r: 1, th: PI }];
    const pre = chipRow(R(root, 'pre'), PRE, 0, (it) => { st.r = it.r; st.th = it.th; update(); });
    plot.addHandle({ get x() { return st.r * Math.cos(st.th); }, get y() { return st.r * Math.sin(st.th); }, get color() { return plot.c ? plot.c.violet : '#7c4dff'; }, r: 8, tex: '\\mathrm{P}',
      drag(x, y) {
        let r = clamp(Math.hypot(x, y), 0.3, 3.2), th = Math.atan2(y, x);
        const r2 = Math.round(r * 2) / 2; if (Math.abs(r - r2) < 0.1) r = r2; else r = Math.round(r * 100) / 100;
        const s = Math.round(th / (PI / 12)) * (PI / 12); if (Math.abs(th - s) < 3 * DEG) th = s;
        if (th <= -PI + 1e-9) th = PI;
        st.r = r; st.th = th; update();
      } });
    function update() {
      const r = st.r, th = st.th, nice = Math.abs(th * 12 / PI - Math.round(th * 12 / PI)) < 1e-7, x = r * Math.cos(th), y = r * Math.sin(th);
      pre.forEach((b, j) => b.setAttribute('aria-pressed', String(Math.abs(PRE[j].r - r) < 1e-9 && Math.abs(PRE[j].th - th) < 1e-9)));
      const thT = nice ? T.radTeX(th) : num(th, 2), rT = num(r, 2), rC = rT === '1' ? '' : rT;
      const xT = nice ? surdTeX(x) : num(x, 2), yT = nice ? surdTeX(y) : num(y, 2), eq = nice && xT.indexOf('.') < 0 && yT.indexOf('.') < 0 ? '=' : '\\approx';
      tex(root, 'rt', '(r,\\ \\blue{\\theta})=(' + rT + ',\\ \\blue{' + thT + '})' + (nice ? '\\ (=' + T.degTeX(th) + ')' : ''));
      tex(root, 'xy', '(' + rC + '\\teal{\\cos' + paren(thT) + '},\\ ' + rC + '\\red{\\sin' + paren(thT) + '})' + eq + '(\\teal{' + xT + '},\\ \\red{' + yT + '})');
      tex(root, 'r', 'r=\\sqrt{x^2+y^2}' + (eq === '=' ? '=' : '\\approx') + rT);
      tex(root, 'th', '\\blue{\\theta}=\\mathrm{atan2}(y,\\ x)' + (nice ? '=' + T.radTeX(th) : '\\approx' + num(th, 2)));
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, r = st.r, th = st.th, x = r * Math.cos(th), y = r * Math.sin(th);
      fit(g, -3.4, 3.4, -3.4, 3.4);
      polarGrid(g, 3);
      g.tex('x', g.xmax, 0, { dx: -8, dy: -6, align: 'right', valign: 'bottom', size: 15, color: c.muted });
      g.tex('y', 0, g.ymax, { dx: 8, dy: 4, align: 'left', valign: 'top', size: 15, color: c.muted });
      g.line(0, 0, x, 0, { color: c.teal, width: 3.5 });
      g.line(x, 0, x, y, { color: c.accent, width: 3.5 });
      g.line(0, 0, x, y, { color: c.violet, width: 3 });
      arcAt(g, 0, 0, 0.55, 0, th, { color: c.primary, width: 3, arrow: true });
      const m = th / 2;
      g.tex('\\theta', 0.85 * Math.cos(m), 0.85 * Math.sin(m), { align: 'center', size: 15, color: c.primary, avoid: true });
      g.tex('r', x / 2, y / 2, { dx: -10 * Math.sin(th), dy: -10 * Math.cos(th), align: 'center', size: 15, color: c.violet, avoid: true });
      if (Math.abs(x) > 0.35) g.tex('r\\cos\\theta', x / 2, 0, { dy: y >= 0 ? 8 : -8, align: 'center', valign: y >= 0 ? 'top' : 'bottom', size: 13, color: c.teal, avoid: true });
      if (Math.abs(y) > 0.35) g.tex('r\\sin\\theta', x, y / 2, { dx: x >= 0 ? 8 : -8, align: x >= 0 ? 'left' : 'right', size: 13, color: c.accent, avoid: true });
    };
    update();
  }

  /* ==========================================================
     3.9(3) LiDAR：回るレーザーで部屋の点を集める
     ========================================================== */
  const ROOM = [[-5, -3], [5, -3], [5, 3], [-3, 3], [-3, 1.5], [-5, 1.5]];
  const BOX = [[1.6, 0.7], [3.2, 0.7], [3.2, 1.9], [1.6, 1.9]];
  const PILLAR = { x: -2.4, y: -1.3, r: 0.55 };
  const SEGS = [];
  [ROOM, BOX].forEach((poly) => poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; SEGS.push([p[0], p[1], q[0], q[1]]); }));
  function cast(ox, oy, a) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = Infinity;
    SEGS.forEach(function (s) {
      const ex = s[2] - s[0], ey = s[3] - s[1], den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) return;
      const wx = s[0] - ox, wy = s[1] - oy, t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
      if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
    });
    const fx = ox - PILLAR.x, fy = oy - PILLAR.y, b = fx * dx + fy * dy, cc = fx * fx + fy * fy - PILLAR.r * PILLAR.r, disc = b * b - cc;
    if (disc >= 0) { const t = -b - Math.sqrt(disc); if (t > 1e-6 && t < best) best = t; }
    return best;
  }
  function inside(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function freeSpot(x, y) {
    const m = 0.3;
    const okRoom = [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]].every((d) => inside(ROOM, x + d[0], y + d[1]));
    const inBox = x > BOX[0][0] - m && x < BOX[1][0] + m && y > BOX[0][1] - m && y < BOX[2][1] + m;
    return okRoom && !inBox && Math.hypot(x - PILLAR.x, y - PILLAR.y) > PILLAR.r + m;
  }
  function initLidar() {
    const root = $id('w-lidar');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5.3, xmax: 5.3, ymin: -3.3, ymax: 3.3, ratio: [0.72, 0.56] });
    const st = { x: -0.5, y: -0.6, step: 10 * DEG, a: 0, pts: new Map(), run: true, hide: false, last: null };
    const STEPS = [30, 10, 3];
    chipRow(R(root, 'step'), STEPS.map((d) => ({ tex: d + '^\\circ' })), 1, (it, i) => { st.step = STEPS[i] * DEG; st.pts.clear(); st.a = 0; anim.kick(); });
    const bPlay = R(root, 'play');
    bPlay.addEventListener('click', () => { st.run = !st.run; bPlay.textContent = st.run ? '⏸ 止める' : '▶ 動かす'; anim.kick(); });
    R(root, 'hide').addEventListener('change', (e) => { st.hide = e.target.checked; plot.invalidate(); });
    plot.addHandle({ get x() { return st.x; }, get y() { return st.y; }, get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 10,
      drag(x, y) { if (freeSpot(x, y)) { st.x = x; st.y = y; st.pts.clear(); anim.kick(); plot.invalidate(); } } });
    const msg = R(root, 'msg');
    function shoot(k) {
      const a = k * st.step, r = cast(st.x, st.y, a);
      if (!isFinite(r)) return;
      const p = { a, r, dx: r * Math.cos(a), dy: r * Math.sin(a), x: st.x + r * Math.cos(a), y: st.y + r * Math.sin(a) };
      st.pts.set(k, p); st.last = p;
    }
    function show() {
      const p = st.last;
      if (p) {
        const ad = T.wrapPi(p.a);
        tex(root, 'ray', '\\blue{\\theta}=' + dg(ad, 0) + ',\\ \\ r\\approx' + num(p.r, 2) + '\\ \\text{m}');
        tex(root, 'pt', '(' + num(p.r, 2) + '\\teal{\\cos' + paren(dg(ad, 0)) + '},\\ ' + num(p.r, 2) + '\\red{\\sin' + paren(dg(ad, 0)) + '})\\approx(\\teal{' + num(p.dx, 2) + '},\\ \\red{' + num(p.dy, 2) + '})');
      }
      const total = Math.round(TAU / st.step);
      R(root, 'n').textContent = st.pts.size + ' / ' + total + ' 点';
      if (st.pts.size < total) { msg.className = 'msg ng'; msg.textContent = '回りながら測っている…（点はロボットから見た位置）'; }
      else { msg.className = 'msg ok'; msg.textContent = st.step > 20 * DEG ? '1周した。点が少なくて、部屋の形がよくわからない。' : st.step > 5 * DEG ? '1周した。だいたいの部屋の形がわかる。' : '1周した。柱や机の形まで見えてきた！'; }
    }
    const anim = L.animate(root, function (dt) {
      if (!st.run) return false;
      const a0 = st.a, a1 = a0 + dt * TAU / 4;
      for (let k = Math.floor(a0 / st.step) + 1; k * st.step <= a1; k++) shoot(((k % Math.round(TAU / st.step)) + Math.round(TAU / st.step)) % Math.round(TAU / st.step));
      st.a = a1 % TAU;
      show(); plot.invalidate();
      return true;
    });
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx;
      fit(g, -5.25, 5.25, -3.25, 3.25);
      if (!st.hide) {
        ctx.save(); ctx.fillStyle = c.surface; ctx.strokeStyle = c.text; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ROOM.forEach((p, i) => (i ? ctx.lineTo(g.X(p[0]), g.Y(p[1])) : ctx.moveTo(g.X(p[0]), g.Y(p[1])))); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.muted; ctx.globalAlpha = 0.25;
        ctx.beginPath(); BOX.forEach((p, i) => (i ? ctx.lineTo(g.X(p[0]), g.Y(p[1])) : ctx.moveTo(g.X(p[0]), g.Y(p[1])))); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.8; ctx.stroke(); ctx.restore();
        circle(g, PILLAR.x, PILLAR.y, PILLAR.r, { fill: c.muted, fa: 0.25, color: c.text, width: 2, alpha: 0.8 });
        g.tex('\\text{机}', (BOX[0][0] + BOX[1][0]) / 2, (BOX[0][1] + BOX[2][1]) / 2, { align: 'center', size: 12, color: c.muted });
        g.tex('\\text{柱}', PILLAR.x, PILLAR.y, { align: 'center', size: 12, color: c.muted });
      }
      // 測った点
      st.pts.forEach((p) => {
        g.line(st.x, st.y, p.x, p.y, { color: c.primary, width: 1, alpha: st.step > 5 * DEG ? 0.18 : 0.07 });
        g.dot(p.x, p.y, { r: st.step > 5 * DEG ? 4.5 : 3, color: c.violet, stroke: false });
      });
      // 今の光
      const r = cast(st.x, st.y, st.a);
      if (isFinite(r)) g.line(st.x, st.y, st.x + r * Math.cos(st.a), st.y + r * Math.sin(st.a), { color: c.accent, width: 2, alpha: 0.85 });
      if (st.last) {
        const p = st.last;
        arcAt(g, st.x, st.y, 0.45, 0, T.wrapPi(p.a), { color: c.primary, width: 2 });
        g.dot(p.x, p.y, { r: 6, color: c.violet });
      }
      g.line(st.x, st.y, st.x + 0.9, st.y, { color: c.muted, width: 1.2, dash: [3, 3] });
    };
    show();
    plot.invalidate();
    anim.kick();
  }

  /* ==========================================================
     3.9(3) 発展：ひまわりの黄金角
     ========================================================== */
  const GOLD = 180 * (3 - Math.sqrt(5));       // 360°(1 − 1/φ) ≈ 137.508°
  function initSun() {
    const root = $id('w-sun'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1, xmax: 1, ymin: -1, ymax: 1, ratio: [0.9, 0.56] });
    const NMAX = 500;
    const st = { al: GOLD, n: 300, growing: false };
    const PRE = [{ label: '黄金角 137.5°', v: GOLD }, { label: '137°', v: 137 }, { label: '138°', v: 138 }, { label: '135°', v: 135 }, { label: '120°', v: 120 }];
    const sa = slider(ctl, { tex: '\\alpha', min: 115, max: 145, step: 0.1, value: 137.5, color: 'primary', aria: '1つごとに回る角 α（度）', fmt: (v) => v.toFixed(1) + '°' });
    const sn = slider(ctl, { tex: 'n', min: 1, max: NMAX, step: 1, value: 300, color: 'amber', aria: '種の数 n' });
    const pre = chipRow(R(root, 'pre'), PRE, 0, (it) => { st.al = it.v; sa.set(Math.round(it.v * 10) / 10); update(); });
    sa.on((v) => { st.al = Math.abs(v - 137.5) < 0.05 ? GOLD : v; update(); });
    sn.on((v) => { st.n = v; update(); });
    const bGrow = R(root, 'grow');
    bGrow.addEventListener('click', () => { st.growing = true; st.n = 1; anim.kick(); });
    const msg = R(root, 'msg');
    function update() {
      pre.forEach((b, j) => b.setAttribute('aria-pressed', String(Math.abs(PRE[j].v - st.al) < 1e-6)));
      const isG = Math.abs(st.al - GOLD) < 1e-6;
      tex(root, 'eq', '\\blue{\\theta_n}=n\\times' + (isG ? '137.5' : num(st.al, 1)) + '^\\circ,\\ \\ r_n=c\\sqrt{n}\\quad(n=1,\\ldots,' + st.n + ')');
      if (isG) { msg.className = 'msg ok'; msg.textContent = '黄金角：すじができず、すき間なくつまっている。'; }
      else if (Math.abs(st.al - GOLD) < 1.5) { msg.className = 'msg ng'; msg.textContent = '少しずれただけで、うずまきのすじの間にすき間が空く。'; }
      else { msg.className = 'msg ng'; msg.textContent = '種がまっすぐなすじ（腕）に並び、すき間だらけ。'; }
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.growing) return false;
      st.n = Math.min(NMAX, st.n + Math.ceil(dt * 160));
      sn.set(st.n);
      if (st.n >= NMAX) st.growing = false;
      update();
      return st.growing;
    });
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx;
      fit(g, -1.06, 1.06, -1.06, 1.06);
      const px = g.pxPerX, rs = Math.max(2, 0.034 * px);
      ctx.save();
      for (let n = 1; n <= st.n; n++) {
        const a = n * st.al * DEG, r = Math.sqrt(n / NMAX);
        ctx.beginPath(); ctx.arc(g.X(r * Math.cos(a)), g.Y(r * Math.sin(a)), rs * (0.6 + 0.4 * r), 0, TAU);
        ctx.fillStyle = n > st.n - 8 ? c.accent : n % 2 ? c.amber : c.brown;
        ctx.fill();
      }
      ctx.restore();
      // 最後の種と、そのひとつ前の種の向き
      if (st.n >= 2) {
        const a1 = st.n * st.al * DEG, a0 = (st.n - 1) * st.al * DEG, r1 = Math.sqrt(st.n / NMAX);
        g.line(0, 0, r1 * Math.cos(a1), r1 * Math.sin(a1), { color: c.primary, width: 1.5, alpha: 0.7 });
        g.line(0, 0, r1 * Math.cos(a0), r1 * Math.sin(a0), { color: c.primary, width: 1.5, alpha: 0.4, dash: [3, 3] });
        let d = T.wrapPi(a1 - a0);
        arcAt(g, 0, 0, 0.18, a0, a0 + d, { color: c.primary, width: 2.5, arrow: true, head: 8 });
      }
    };
    update();
  }

  /* ==========================================================
     3.9(4) ロボットアーム：順運動学と逆運動学
     ========================================================== */
  // elbow = +1 で肘下（θ2 > 0）、−1 で肘上（θ2 < 0）
  function armIK(x, y, l1, l2, elbow) {
    const D = Math.hypot(x, y), beta = Math.atan2(y, x);
    const cphi = (l1 * l1 + l2 * l2 - D * D) / (2 * l1 * l2);
    if (D > l1 + l2 + 1e-9) return { ok: false, far: true, D, cphi, th1: beta, th2: 0 };
    if (D < Math.abs(l1 - l2) - 1e-9 || D < 1e-9) return { ok: false, far: false, D, cphi, th1: beta, th2: PI };
    const phi = Math.acos(clamp(cphi, -1, 1));
    const calpha = (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), alpha = Math.acos(clamp(calpha, -1, 1));
    return { ok: true, D, cphi, phi, alpha, beta, th1: beta - elbow * alpha, th2: elbow * (PI - phi) };
  }
  const fk = (l1, l2, t1, t2) => ({ ex: l1 * Math.cos(t1), ey: l1 * Math.sin(t1), x: l1 * Math.cos(t1) + l2 * Math.cos(t1 + t2), y: l1 * Math.sin(t1) + l2 * Math.sin(t1 + t2) });
  function drawArm(g, l1, l2, t1, t2, o) {
    o = o || {};
    const c = g.c, ctx = g.ctx, p = fk(l1, l2, t1, t2), col = o.color || c.text, a = o.alpha == null ? 1 : o.alpha;
    // 台
    if (!o.ghost) {
      ctx.save(); ctx.fillStyle = c.muted; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.moveTo(g.X(0) - 18, g.Y(0) + 12); ctx.lineTo(g.X(0) + 18, g.Y(0) + 12); ctx.lineTo(g.X(0) + 9, g.Y(0)); ctx.lineTo(g.X(0) - 9, g.Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'; ctx.strokeStyle = col;
    if (o.ghost) ctx.setLineDash([6, 5]);
    ctx.lineWidth = o.ghost ? 3 : 9; ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(p.ex), g.Y(p.ey)); ctx.stroke();
    ctx.lineWidth = o.ghost ? 3 : 7; ctx.beginPath(); ctx.moveTo(g.X(p.ex), g.Y(p.ey)); ctx.lineTo(g.X(p.x), g.Y(p.y)); ctx.stroke();
    ctx.restore();
    if (!o.ghost) {
      g.dot(0, 0, { r: 7, color: c.primary });
      g.dot(p.ex, p.ey, { r: 6.5, color: c.violet });
      g.dot(p.x, p.y, { r: 6, color: c.amber });
    }
    return p;
  }
  function target(g, x, y, col) {
    const ctx = g.ctx, px = g.X(x), py = g.Y(y);
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    [13, 7].forEach((r) => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke(); });
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function ringArea(g, r0, r1, col) {
    const ctx = g.ctx;
    ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.08;
    ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), r1 * g.pxPerX, 0, TAU); ctx.arc(g.X(0), g.Y(0), r0 * g.pxPerX, 0, TAU, true); ctx.fill('evenodd'); ctx.restore();
    circle(g, 0, 0, r1, { color: col, width: 1.2, dash: [5, 4], alpha: 0.7 });
    if (r0 > 0.01) circle(g, 0, 0, r0, { color: col, width: 1.2, dash: [5, 4], alpha: 0.7 });
  }
  function angleLabels(g, l1, t1, t2) {
    const c = g.c, ex = l1 * Math.cos(t1), ey = l1 * Math.sin(t1);
    if (Math.abs(t1) > 0.05) {
      arcAt(g, 0, 0, 0.55, 0, t1, { color: c.primary, width: 2.5 });
      g.tex('\\theta_1', 0.85 * Math.cos(t1 / 2), 0.85 * Math.sin(t1 / 2), { align: 'center', size: 14, color: c.primary, avoid: true });
    }
    g.line(ex, ey, ex + 0.75 * Math.cos(t1), ey + 0.75 * Math.sin(t1), { color: c.muted, width: 1.2, dash: [3, 4] });
    if (Math.abs(t2) > 0.05) {
      arcAt(g, ex, ey, 0.45, t1, t1 + t2, { color: c.violet, width: 2.5 });
      const m = t1 + t2 / 2;
      g.tex('\\theta_2', ex + 0.75 * Math.cos(m), ey + 0.75 * Math.sin(m), { align: 'center', size: 14, color: c.violet, avoid: true });
    }
  }
  function initArm() {
    const root = $id('w-arm'), ctl = root.querySelector('.controls');
    const L1 = 2, L2 = 1.5;
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4, xmax: 4, ymin: -4, ymax: 4, ratio: [0.95, 0.6] });
    const st = { t1: 30 * DEG, t2: 45 * DEG, ik: false, tx: 0, ty: 0, elbow: 1, sol: null };
    const fmt = (v) => v + '°';
    const s1 = slider(ctl, { tex: '\\theta_1', min: -180, max: 180, step: 1, value: 30, color: 'primary', aria: '肩の角 θ1（度）', fmt });
    const s2 = slider(ctl, { tex: '\\theta_2', min: -180, max: 180, step: 1, value: 45, color: 'violet', aria: '肘の角 θ2（度）', fmt });
    s1.on((v) => { st.ik = false; st.t1 = v * DEG; update(); });
    s2.on((v) => { st.ik = false; st.t2 = v * DEG; update(); });
    chipRow(R(root, 'elbow'), [{ tex: '\\text{肘下}\\ (\\theta_2\\gt0)' }, { tex: '\\text{肘上}\\ (\\theta_2\\lt0)' }], 0, (it, i) => {
      st.elbow = i ? -1 : 1;
      if (!st.ik) { const p = fk(L1, L2, st.t1, st.t2); st.tx = p.x; st.ty = p.y; st.ik = true; }
      solve(); anim.kick();
    });
    plot.addHandle({ get x() { return st.ik ? st.tx : fk(L1, L2, st.t1, st.t2).x; }, get y() { return st.ik ? st.ty : fk(L1, L2, st.t1, st.t2).y; },
      get color() { return plot.c ? plot.c.accent : '#d33'; }, r: 9, halo: 8,
      drag(x, y) { st.ik = true; st.tx = clamp(x, -3.9, 3.9); st.ty = clamp(y, -3.9, 3.9); solve(); anim.kick(); } });
    function solve() { st.sol = armIK(st.tx, st.ty, L1, L2, st.elbow); update(); }
    function update() {
      const p = fk(L1, L2, st.t1, st.t2), a = st.t1 / DEG, b = st.t2 / DEG, ab = a + b;
      const A = num(a, 0), B = num(ab, 0);
      tex(root, 'tip', '(x,\\ y)\\approx(\\teal{' + num(p.x, 2) + '},\\ \\red{' + num(p.y, 2) + '})');
      tex(root, 'fx', 'x=2\\teal{\\cos' + paren(A + '^\\circ') + '}+1.5\\teal{\\cos' + paren(B + '^\\circ') + '}\\approx' + num(2 * Math.cos(st.t1), 2) + (1.5 * Math.cos(st.t1 + st.t2) < 0 ? '' : '+') + num(1.5 * Math.cos(st.t1 + st.t2), 2));
      tex(root, 'fy', 'y=2\\red{\\sin' + paren(A + '^\\circ') + '}+1.5\\red{\\sin' + paren(B + '^\\circ') + '}\\approx' + num(2 * Math.sin(st.t1), 2) + (1.5 * Math.sin(st.t1 + st.t2) < 0 ? '' : '+') + num(1.5 * Math.sin(st.t1 + st.t2), 2));
      const s = st.sol;
      if (!st.ik || !s) tex(root, 'ik', '\\text{赤い的をドラッグすると計算します}');
      else if (!s.ok && s.far) tex(root, 'ik', 'D\\approx' + num(s.D, 2) + '\\gt l_1+l_2=3.5:\\ \\cos\\varphi\\approx' + num(s.cphi, 2) + '\\lt-1\\ \\text{→ 届かない}');
      else if (!s.ok) tex(root, 'ik', 'D\\approx' + num(s.D, 2) + '\\lt l_1-l_2=0.5:\\ \\cos\\varphi\\approx' + num(s.cphi, 2) + '\\gt1\\ \\text{→ 近すぎて届かない}');
      else tex(root, 'ik', 'D\\approx' + num(s.D, 2) + ',\\ \\cos\\varphi\\approx' + num(s.cphi, 3) + ',\\ \\varphi\\approx' + dg(s.phi) + '\\ \\Rightarrow\\ \\violet{\\theta_2}\\approx' + dg(s.th2) + ',\\ \\ \\blue{\\theta_1}=' + dg(s.beta) + (st.elbow > 0 ? '-' : '+') + dg(s.alpha) + '\\approx' + dg(s.th1) + (Math.abs(T.wrapPi(s.th1) - s.th1) > 1e-6 ? '\\to' + dg(T.wrapPi(s.th1)) : ''));
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.ik || !st.sol) return false;
      const sp = 3.2 * dt;
      const d1 = T.wrapPi(st.sol.th1 - st.t1), d2 = st.sol.th2 - st.t2;
      if (Math.abs(d1) < 1e-4 && Math.abs(d2) < 1e-4) { st.t1 = T.wrapPi(st.sol.th1); st.t2 = st.sol.th2; sync(); update(); return false; }
      st.t1 = T.wrapPi(st.t1 + Math.sign(d1) * Math.min(Math.abs(d1), sp));
      st.t2 += Math.sign(d2) * Math.min(Math.abs(d2), sp);
      sync(); update();
      return true;
    });
    function sync() { s1.set(Math.round(st.t1 / DEG)); s2.set(Math.round(T.wrapPi(st.t2) / DEG)); }
    plot.draw = function (g) {
      const c = g.c;
      fit(g, -3.8, 3.8, -3.8, 3.8);
      g.grid({ step: 1, xlabel: 'x', ylabel: 'y' });
      ringArea(g, L1 - L2, L1 + L2, c.teal);
      if (st.ik) target(g, st.tx, st.ty, c.accent);
      const p = drawArm(g, L1, L2, st.t1, st.t2);
      angleLabels(g, L1, st.t1, st.t2);
      if (!st.ik) {
        g.line(p.x, p.y, p.x, 0, { color: c.teal, width: 1.2, dash: [3, 4], alpha: 0.7 });
        g.line(p.x, p.y, 0, p.y, { color: c.accent, width: 1.2, dash: [3, 4], alpha: 0.7 });
      }
      g.texPx('\\text{緑の輪：先がとどく範囲}', g.w - 6, g.h - 6, { align: 'right', valign: 'bottom', size: 11, color: c.teal });
    };
    update();
  }

  /* ==========================================================
     3.9(5) ゲームの視界判定
     ========================================================== */
  function initView() {
    const root = $id('w-view'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 5, ymin: -3, ymax: 3, ratio: [0.75, 0.52] });
    const E = { x: -1, y: -0.2 }, BACK = 1.7;
    const st = { f: 20 * DEG, fov: 90 * DEG, R: 3.2, px: 1.4, py: 1.3, patrol: false, base: 20 * DEG, time: 0 };
    const sf = slider(ctl, { tex: '\\text{視野角}', min: 20, max: 180, step: 5, value: 90, color: 'amber', aria: '視野角（度）', fmt: (v) => v + '°' });
    const sr = slider(ctl, { tex: '\\text{距離}', min: 1, max: 4.5, step: 0.1, value: 3.2, color: 'teal', aria: '視界の距離' });
    sf.on((v) => { st.fov = v * DEG; update(); });
    sr.on((v) => { st.R = v; update(); });
    plot.addHandle({ get x() { return st.px; }, get y() { return st.py; }, get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 10,
      drag(x, y) { x = clamp(x, plot.xmin + 0.2, plot.xmax - 0.2); y = clamp(y, plot.ymin + 0.2, plot.ymax - 0.2); if (Math.hypot(x - E.x, y - E.y) < 0.4) return; st.px = x; st.py = y; update(); } });
    plot.addHandle({ get x() { return E.x + 1.15 * Math.cos(st.f); }, get y() { return E.y + 1.15 * Math.sin(st.f); }, get color() { return plot.c ? plot.c.accent : '#d33'; }, r: 7,
      drag(x, y) { st.f = Math.atan2(y - E.y, x - E.x); st.base = st.f; st.time = 0; update(); } });
    const bPat = R(root, 'patrol');
    bPat.addEventListener('click', () => { st.patrol = !st.patrol; st.base = st.f; st.time = 0; bPat.textContent = st.patrol ? '⏸ 見回りを止める' : '▶ 見回りさせる'; anim.kick(); });
    const res = R(root, 'res');
    function judge() {
      const vx = st.px - E.x, vy = st.py - E.y, d = Math.hypot(vx, vy), phi = Math.atan2(vy, vx), raw = phi - st.f, del = T.wrapPi(raw);
      const seen = d <= st.R && Math.abs(del) <= st.fov / 2 + 1e-9;
      const back = !seen && d <= BACK && Math.abs(del) >= 135 * DEG;
      const cosD = (vx * Math.cos(st.f) + vy * Math.sin(st.f)) / d;
      return { vx, vy, d, phi, raw, del, seen, back, cosD };
    }
    function update() {
      const j = judge();
      tex(root, 'phi', '\\varphi=\\mathrm{atan2}(' + num(j.vy, 1) + ',\\ ' + num(j.vx, 1) + ')\\approx' + dg(j.phi, 0) + ',\\quad d\\approx' + num(j.d, 2));
      const fdeg = T.wrapPi(st.f);
      tex(root, 'd', '\\Delta=' + dg(j.phi, 0) + '-' + paren(dg(fdeg, 0)) + '=' + dg(j.phi - fdeg, 0) + (Math.abs(j.phi - fdeg - j.del) > 1e-6 ? '\\ \\to\\ ' + dg(j.del, 0) : ''));
      if (j.seen) { res.textContent = '👀 見つかった！'; res.style.color = 'var(--accent)'; }
      else if (j.back) { res.textContent = '⚔️ 背後をとった！ バックアタック ×2'; res.style.color = 'var(--violet)'; }
      else { res.textContent = '見つかっていない（' + (j.d > st.R ? '遠すぎる' : '視界の外') + '）'; res.style.color = 'var(--teal)'; }
      const half = st.fov / 2;
      tex(root, 'cos', '\\cos\\Delta=\\dfrac{v_x\\cos\\theta+v_y\\sin\\theta}{|\\vec v|}\\approx' + num(j.cosD, 2) + (j.cosD >= Math.cos(half) - 1e-9 ? '\\geqq' : '\\lt') + '\\cos' + dg(half, 0) + '\\approx' + num(Math.cos(half), 2) + ',\\ \\ d\\approx' + num(j.d, 2) + (j.d <= st.R ? '\\leqq' : '\\gt') + num(st.R, 1));
      plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.patrol) return false;
      st.time += dt;
      st.f = st.base + 60 * DEG * Math.sin(1.1 * st.time);
      update();
      return true;
    });
    function sector(g, r, a0, a1, fill, fa, stroke) {
      const ctx = g.ctx, cx = g.X(E.x), cy = g.Y(E.y), pr = r * g.pxPerX;
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, pr, -a0, -a1, true); ctx.closePath();
      ctx.fillStyle = fill; ctx.globalAlpha = fa; ctx.fill();
      if (stroke) { ctx.globalAlpha = 0.8; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.restore();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, j = judge();
      fit(g, -4.6, 4.6, -2.9, 2.9);
      g.grid({ step: 1, labels: false, axes: false });
      const col = j.seen ? c.accent : c.amber;
      sector(g, BACK, st.f + 135 * DEG, st.f + 225 * DEG, c.violet, j.back ? 0.28 : 0.12, c.violet);
      sector(g, st.R, st.f - st.fov / 2, st.f + st.fov / 2, col, j.seen ? 0.26 : 0.14, col);
      // 敵 → プレイヤー
      g.line(E.x, E.y, st.px, st.py, { color: c.primary, width: 1.5, dash: [5, 4], alpha: 0.8 });
      const r0 = 0.75;
      arcAt(g, E.x, E.y, r0, st.f, st.f + j.del, { color: c.primary, width: 2.5, arrow: Math.abs(j.del) > 0.25 });
      if (Math.abs(j.del) > 0.3) { const m = st.f + j.del / 2; g.tex('\\Delta', E.x + (r0 + 0.3) * Math.cos(m), E.y + (r0 + 0.3) * Math.sin(m), { align: 'center', size: 14, color: c.primary, avoid: true }); }
      // 敵
      g.arrow(E.x, E.y, E.x + 1.15 * Math.cos(st.f), E.y + 1.15 * Math.sin(st.f), { color: c.accent, width: 3, head: 12 });
      ctx.save();
      const ex = g.X(E.x), ey = g.Y(E.y);
      ctx.beginPath(); ctx.arc(ex, ey, 14, 0, TAU); ctx.fillStyle = c.accent; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c.bg; ctx.stroke();
      const fx = Math.cos(st.f), fy = -Math.sin(st.f), nx = -fy, ny = fx;
      ctx.fillStyle = '#fff';
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(ex + 6 * fx + 5 * s * nx, ey + 6 * fy + 5 * s * ny, 3, 0, TAU); ctx.fill(); });
      ctx.restore();
      g.tex('\\text{敵}', E.x, E.y, { dy: 26, align: 'center', size: 12, color: c.accent, avoid: true });
      g.tex('\\text{プレイヤー}', st.px, st.py, { dy: st.py > 2 ? 24 : -24, align: 'center', size: 12, color: c.primary, avoid: true });
    };
    update();
  }

  /* ==========================================================
     3.9(7) チャレンジ：アームを届かせろ
     ========================================================== */
  const GL = 2;       // l1 = l2 = 2
  const ARM_STAGES = [
    { name: 'まっすぐ', tg: [2 * Math.sqrt(3), 2], ans: [[30, 0]],
      text: '的は $(2\\sqrt3,\\ 2)\\approx(3.46,\\ 2)$。$\\theta_1$、$\\theta_2$ を何度にする？',
      hint: 'まず原点から的までの距離 $D=\\sqrt{x^2+y^2}$ を計算。$D=l_1+l_2=4$ なら、腕はまっすぐ（$\\theta_2=0^\\circ$）。',
      answer: '<b>$\\theta_1=30^\\circ,\\ \\theta_2=0^\\circ$</b><br>$D=\\sqrt{(2\\sqrt3)^2+2^2}=\\sqrt{16}=4=l_1+l_2$。腕をまっすぐ伸ばしてちょうど届くので $\\theta_2=0^\\circ$。<br>向きは $\\theta_1=\\mathrm{atan2}(2,\\ 2\\sqrt3)=30^\\circ$（$\\tan\\theta_1=\\dfrac{2}{2\\sqrt3}=\\dfrac{1}{\\sqrt3}$）。' },
    { name: '直角', tg: [2, 2], ans: [[0, 90], [90, -90]],
      text: '的は $(2,\\ 2)$。$\\theta_1$、$\\theta_2$ を何度にする？（答えは2通り。どちらでもよい）',
      hint: '肩 O・肘 E・的 P の三角形の3辺は $2,\\ 2,\\ D$。余弦定理 $D^2=2^2+2^2-2\\cdot2\\cdot2\\cos\\varphi$ で肘の角 $\\varphi$ がわかる。',
      answer: '<b>$\\theta_1=0^\\circ,\\ \\theta_2=90^\\circ$</b>（肘下）または <b>$\\theta_1=90^\\circ,\\ \\theta_2=-90^\\circ$</b>（肘上）<br>$D^2=2^2+2^2=8$。余弦定理 $8=2^2+2^2-2\\cdot2\\cdot2\\cos\\varphi$ より $\\cos\\varphi=0$、$\\varphi=90^\\circ$。曲げる角は $\\theta_2=\\pm(180^\\circ-90^\\circ)=\\pm90^\\circ$。<br>三角形 OEP は直角二等辺三角形なので肩の角 $\\alpha=45^\\circ$。的の向き $\\mathrm{atan2}(2,\\ 2)=45^\\circ$ から $\\theta_1=45^\\circ\\mp45^\\circ$。' },
    { name: '床にさわらずに', tg: [2, 0], floor: true, ans: [[60, -120]],
      text: '的は床の上の $(2,\\ 0)$。腕が床（$y\\lt0$）にもぐらないように届かせよ。',
      hint: '$D=2$ なので、三角形 OEP は3辺とも $2$ の正三角形。肘を床の上に出すには、$\\theta_2$ は正？負？',
      answer: '<b>$\\theta_1=60^\\circ,\\ \\theta_2=-120^\\circ$</b>（肘上）<br>$D=2$。余弦定理 $2^2=2^2+2^2-2\\cdot2\\cdot2\\cos\\varphi$ より $\\cos\\varphi=\\dfrac12$、$\\varphi=60^\\circ$（正三角形）。$\\theta_2=\\pm(180^\\circ-60^\\circ)=\\pm120^\\circ$。<br>肘下 $\\theta_1=0^\\circ-60^\\circ=-60^\\circ$ だと肘が床の下にもぐるので、肘上 $\\theta_1=0^\\circ+60^\\circ=60^\\circ$、$\\theta_2=-120^\\circ$。' },
    { name: '左に壁', tg: [1, 3], wall: -0.4, ans: [[33.81, 75.52]],
      text: '的は $(1,\\ 3)$。左に壁（$x=-0.4$）があるので、肘を壁にぶつけずに届かせよ。（電卓を使って、小数第1位まで計算しよう）',
      hint: '$D^2=1^2+3^2=10$。$\\cos\\varphi=\\dfrac{l_1^2+l_2^2-D^2}{2l_1l_2}$、$\\cos\\alpha=\\dfrac{l_1^2+D^2-l_2^2}{2l_1D}$、$\\theta_1=\\mathrm{atan2}(3,\\ 1)\\mp\\alpha$。肘は右側に出したい。',
      answer: '<b>$\\theta_1\\approx33.8^\\circ,\\ \\theta_2\\approx75.5^\\circ$</b>（肘下）<br>$D^2=10$。余弦定理 $10=4+4-8\\cos\\varphi$ より $\\cos\\varphi=-\\dfrac14$、$\\varphi=\\cos^{-1}\\left(-\\dfrac14\\right)\\approx104.5^\\circ$、$\\theta_2=\\pm(180^\\circ-\\varphi)\\approx\\pm75.5^\\circ$。<br>肩の角：$2^2=2^2+10-2\\cdot2\\sqrt{10}\\cos\\alpha$ より $\\cos\\alpha=\\dfrac{10}{4\\sqrt{10}}=\\dfrac{\\sqrt{10}}{4}$、$\\alpha\\approx37.8^\\circ$。的の向き $\\mathrm{atan2}(3,\\ 1)\\approx71.6^\\circ$。<br>肘上 $\\theta_1\\approx71.6^\\circ+37.8^\\circ=109.3^\\circ$ だと肘 $(-0.66,\\ 1.89)$ が壁にぶつかるので、肘下 $\\theta_1\\approx71.6^\\circ-37.8^\\circ=33.8^\\circ$、$\\theta_2\\approx75.5^\\circ$。' },
    { name: '届かない？', tg: [4, 3], far: true, near: [3.2, 2.4], ans: [[36.87, 0]],
      text: '的は $(4,\\ 3)$。届くなら届かせよ。届かないなら、腕の先をできるだけ的に近づけよ。',
      hint: '$D=\\sqrt{4^2+3^2}$ と $l_1+l_2=4$ をくらべよう。届かないとき、いちばん近づくのはどんな形？',
      answer: '<b>届かない。いちばん近いのは $\\theta_1\\approx36.9^\\circ,\\ \\theta_2=0^\\circ$</b><br>$D=\\sqrt{4^2+3^2}=5$ で、腕を全部伸ばした長さ $l_1+l_2=4$ より長い。余弦定理で計算すると $\\cos\\varphi=\\dfrac{4+4-25}{8}=-\\dfrac{17}{8}$ となり、$-1$ より小さいので $\\varphi$ はない（$\\cos^{-1}$ が計算できない）。<br>このときは腕をまっすぐ（$\\theta_2=0^\\circ$）にして、的の向き $\\theta_1=\\mathrm{atan2}(3,\\ 4)\\approx36.9^\\circ$ に向けると、先は $(3.2,\\ 2.4)$ で、的までの距離 $5-4=1$ がいちばん近い。' },
  ];
  function initGameArm() {
    const root = $id('w-game-arm'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -4.5, xmax: 4.5, ymin: -2, ymax: 4.5, ratio: [0.85, 0.56] });
    const fmt = (v) => v + '°';
    const st = { t1: 90 * DEG, t2: 0, tries: [], flash: 0 };
    const s1 = slider(ctl, { tex: '\\theta_1', min: -180, max: 180, step: 1, value: 90, color: 'primary', aria: '肩の角 θ1（度）', fmt });
    const s2 = slider(ctl, { tex: '\\theta_2', min: -180, max: 180, step: 1, value: 0, color: 'violet', aria: '肘の角 θ2（度）', fmt });
    s1.on((v) => { st.t1 = v * DEG; game.formula(); plot.invalidate(); });
    s2.on((v) => { st.t2 = v * DEG; game.formula(); plot.invalidate(); });
    const B = gameButtons(ctl, '🤖 判定');
    const conf = Confetti(root, plot);
    const S = () => ARM_STAGES[game.k];
    const game = GameShell(root, { key: '3-9:game', stages: ARM_STAGES,
      formula: function () {
        const p = fk(GL, GL, st.t1, st.t2);
        return '\\blue{\\theta_1}=' + num(st.t1 / DEG, 0) + '^\\circ,\\ \\violet{\\theta_2}=' + num(st.t2 / DEG, 0) + '^\\circ\\ \\Rightarrow\\ \\text{先}\\ (\\teal{' + num(p.x, 2) + '},\\ \\red{' + num(p.y, 2) + '})';
      },
      onStage() {
        st.tries = []; st.t1 = 90 * DEG; st.t2 = 0; s1.set(90); s2.set(0);
        s1.input.disabled = s2.input.disabled = false;
        B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission')); plot.invalidate();
      } });
    function hits(p) {
      const s = S();
      if (s.floor && (p.ey < -0.05 || p.y < -0.05)) return '肘（または先）が床にもぐった！ もう1つの解（肘の向きが反対）を考えよう。';
      if (s.wall != null && (p.ex < s.wall || p.x < s.wall)) return '肘（または先）が壁にぶつかった！ もう1つの解（肘の向きが反対）を考えよう。';
      return '';
    }
    function judge() {
      if (game.done || game.used >= game.max) return;
      const s = S(), p = fk(GL, GL, st.t1, st.t2);
      game.used++; game.renderThrows();
      st.tries.push([st.t1, st.t2]);
      const bump = hits(p), goal = s.far ? s.near : s.tg, dist = Math.hypot(p.x - goal[0], p.y - goal[1]);
      if (!bump && dist <= 0.12) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= ARM_STAGES.length - 1;
        s1.input.disabled = s2.input.disabled = true;
        game.result((s.far ? '🎯 正解！ 届かない的には、まっすぐ的の方へ伸ばすのがいちばん近い。 ' : '🎯 届いた！ ') + starStr(n) + '（' + game.used + ' 回目）', 'hit');
        conf.fire(plot.X(s.tg[0]), plot.Y(s.tg[1]));
      } else {
        let m = bump || ('はずれ。腕の先と' + (s.far ? 'いちばん近い点' : '的') + 'の距離は約 ' + num(Math.hypot(p.x - goal[0], p.y - goal[1]), 2) + '。');
        if (!bump && s.far) m = 'はずれ。腕の先と的の距離は約 ' + num(Math.hypot(p.x - s.tg[0], p.y - s.tg[1]), 2) + '。もっと近づけられないかな？';
        if (game.used >= game.max) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      plot.invalidate();
    }
    B.bMain.addEventListener('click', judge);
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, ARM_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, s = S();
      fit(g, -4.3, 4.6, -1.6, 4.4);
      g.grid({ step: 1, xlabel: 'x', ylabel: 'y' });
      ringArea(g, 0, 2 * GL, c.teal);
      if (s.floor) {
        ctx.save(); ctx.fillStyle = c.brown; ctx.globalAlpha = 0.22; ctx.fillRect(0, g.Y(0), g.w, g.h - g.Y(0)); ctx.restore();
        g.line(g.xmin, 0, g.xmax, 0, { color: c.brown, width: 3 });
        g.texPx('\\text{床}', g.w - 8, g.Y(0) + 6, { align: 'right', valign: 'top', size: 13, color: c.brown });
      }
      if (s.wall != null) {
        ctx.save(); ctx.fillStyle = c.brown; ctx.globalAlpha = 0.22; ctx.fillRect(0, 0, g.X(s.wall), g.h); ctx.restore();
        g.line(s.wall, g.ymin, s.wall, g.ymax, { color: c.brown, width: 3 });
        g.texPx('\\text{壁}', g.X(s.wall) - 8, 8, { align: 'right', valign: 'top', size: 13, color: c.brown });
      }
      // これまでの判定
      st.tries.forEach((t) => drawArm(g, GL, GL, t[0], t[1], { ghost: true, color: c.muted, alpha: 0.5 }));
      if (game.done) s.ans.forEach((a) => drawArm(g, GL, GL, a[0] * DEG, a[1] * DEG, { ghost: true, color: c.teal, alpha: 0.9 }));
      if (s.far) { g.line(s.near[0], s.near[1], s.tg[0], s.tg[1], { color: c.accent, width: 1.2, dash: [3, 4], alpha: 0.6 }); }
      target(g, s.tg[0], s.tg[1], c.accent);
      g.tex('(' + (game.k === 0 ? '2\\sqrt3' : num(s.tg[0], 0)) + ',\\,' + num(s.tg[1], 0) + ')', s.tg[0], s.tg[1], { dx: s.tg[0] > 3 ? -14 : 14, dy: -18, align: s.tg[0] > 3 ? 'right' : 'left', size: 13, color: c.accent, avoid: true });
      drawArm(g, GL, GL, st.t1, st.t2);
      angleLabels(g, GL, st.t1, st.t2);
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     確認問題の図（リサジュー 3:4）
     ========================================================== */
  function initQuiz() {
    const cv = document.querySelector('canvas[data-q="1"]');
    if (!cv) return;
    const plot = new Plot(cv, { xmin: -1.3, xmax: 1.3, ymin: -1.3, ymax: 1.3, ratio: [0.8, 0.4] });
    plot.draw = function (g) {
      const c = g.c;
      fit(g, -1.25, 1.25, -1.2, 1.32);
      drawLissBox(g, -1, -1, 1, 1);
      g.line(-1.15, 0, 1.15, 0, { color: c.axis, width: 1 });
      g.line(0, -1.15, 0, 1.15, { color: c.axis, width: 1 });
      path(g, lissPts(3, 4, PI / 4, 900), 901, { color: c.violet, width: 2.5 });
      g.tex('x', 1.15, 0, { dx: 4, align: 'left', size: 13, color: c.muted });
      g.tex('y', 0, 1.15, { dy: -2, align: 'center', valign: 'bottom', size: 13, color: c.muted });
    };
    plot.invalidate();
  }

  T.boot([
    [initLiss, 'w-liss'],
    [initCyc, 'w-cyc'],
    [initSpiro, 'w-spiro'],
    [initPolar, 'w-polar'],
    [initLidar, 'w-lidar'],
    [initSun, 'w-sun'],
    [initArm, 'w-arm'],
    [initView, 'w-view'],
    [initGameArm, 'w-game-arm'],
    [initQuiz, 'check'],
  ]);
})();
