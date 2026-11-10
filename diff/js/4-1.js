/* 第4章 4.1節 速さと傾き — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   dec(v, n)                    … 小数 n 桁までで表示（末尾の 0 は消す。8.0080020 → 8.008002）
 *   car(g, x, y, o)              … 道路の図の車（x は車の先頭の位置）
 *   playButton(btn, labels, st)  … 再生ボタンの文字の切り替え
 *   magView(f, a, H, Hy, z)      … 虫めがねの範囲（中心 (a, f(a))、半幅 H/z, Hy/z）
 *   insetDraw(g, box, view, fn)  … キャンバスの一部（box）に別の座標の小さな図を描く（チャレンジの「拡大して見る」）
 *
 * 色：関数 f = 青、接線 = 緑、割線・Δ = 赤、プレイヤーの直線 = 紫
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const dec = (v, n) => { const s = String(parseFloat(v.toFixed(n == null ? 6 : n))); return s === '-0' ? '0' : s; };
  const par = (s) => (s.charAt(0) === '-' ? '(' + s + ')' : s);

  // 位置の式 x = 2t²（(2)(3) の車）
  const X = (t) => 2 * t * t, V = (t) => 4 * t;

  function car(g, x, y, o) {
    const ctx = g.ctx, px = g.X(x), py = g.Y(y), col = o.color, a = o.alpha == null ? 1 : o.alpha;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - 30, py - 15, 30, 10, 3) : ctx.rect(px - 30, py - 15, 30, 10); ctx.fill();
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - 23, py - 22, 15, 8, 3) : ctx.rect(px - 23, py - 22, 15, 8); ctx.fill();
    ctx.fillStyle = g.c.text;
    [-24, -7].forEach((d) => { ctx.beginPath(); ctx.arc(px + d, py - 4, 4, 0, 2 * Math.PI); ctx.fill(); });
    ctx.restore();
  }
  function playButton(btn, labels) {
    return (on) => { btn.textContent = on ? labels[1] : labels[0]; btn.classList.toggle('primary', !on); };
  }

  /* ==========================================================
     4.1(2) 平均の速さと割線（上：道路、下：位置のグラフ）
     ========================================================== */
  function initAvg() {
    const root = $id('w-avg'), cvs = root.querySelectorAll('canvas');
    const road = new Plot(cvs[0], { xmin: -5, xmax: 56, ymin: -1.25, ymax: 1.1, ratio: [0.3, 0.15] });
    const plot = new Plot(cvs[1], { xmin: -0.7, xmax: 5.6, ymin: -6, ymax: 56, ratio: [0.85, 0.5] });
    const st = { a: 1, b: 3 };
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: 't_1', min: 0, max: 5, step: 0.1, value: st.a, color: 'accent', aria: '時刻 t1（秒）', fmt: (v) => v.toFixed(1) + ' 秒' });
    const sB = slider(ctl, { tex: 't_2', min: 0, max: 5, step: 0.1, value: st.b, color: 'accent', aria: '時刻 t2（秒）', fmt: (v) => v.toFixed(1) + ' 秒' });
    const setA = (v) => { st.a = v; if (Math.abs(st.a - st.b) < 0.05) st.b = st.a < 4.95 ? +(st.a + 0.1).toFixed(1) : +(st.a - 0.1).toFixed(1); update(); };
    const setB = (v) => { st.b = v; if (Math.abs(st.a - st.b) < 0.05) st.a = st.b > 0.05 ? +(st.b - 0.1).toFixed(1) : +(st.b + 0.1).toFixed(1); update(); };
    sA.on(setA); sB.on(setB);
    const snap = (t) => clamp(Math.round(t * 10) / 10, 0, 5);
    [['a', '\\mathrm{A}', setA], ['b', '\\mathrm{B}', setB]].forEach(function (p) {
      plot.addHandle({
        get x() { return st[p[0]]; }, get y() { return X(st[p[0]]); },
        get color() { return plot.c ? plot.c.accent : '#d33'; }, r: 8, tex: p[1],
        get ldx() { return -14; }, get ldy() { return -12; }, lalign: 'right',
        drag(x) { p[2](snap(x)); },
      });
    });
    function update() {
      sA.set(st.a); sB.set(st.b);
      const t1 = Math.min(st.a, st.b), t2 = Math.max(st.a, st.b), dt = t2 - t1, dx = X(t2) - X(t1), v = dx / dt;
      tex(root, 'dt', '\\red{\\Delta t}=' + dec(t2, 1) + '-' + dec(t1, 1) + '=' + dec(dt, 1) + '\\ \\text{秒}');
      tex(root, 'dx', '\\red{\\Delta x}=' + dec(X(t2), 2) + '-' + dec(X(t1), 2) + '=' + dec(dx, 2) + '\\ \\text{m}');
      tex(root, 'v', '\\dfrac{\\red{\\Delta x}}{\\red{\\Delta t}}=\\dfrac{' + dec(dx, 2) + '}{' + dec(dt, 1) + '}=' + dec(v, 2) + '\\ \\text{m/秒}');
      tex(root, 'kmh', dec(v, 2) + '\\times3.6=' + dec(v * 3.6, 1) + '\\ \\text{km/時}');
      road.invalidate(); plot.invalidate();
    }
    road.draw = function (g) {
      const c = g.c, t1 = Math.min(st.a, st.b), t2 = Math.max(st.a, st.b), x1 = X(t1), x2 = X(t2);
      g.line(-2, 0, 54, 0, { color: c.axis, width: 2 });
      for (let k = 0; k <= 50; k += 10) {
        g.line(k, 0, k, -0.18, { color: c.muted, width: 1.2 });
        g.tex(String(k), k, -0.2, { valign: 'top', align: 'center', size: 11, color: c.muted });
      }
      g.tex('x\\ (\\text{m})', 54, 0, { dy: -4, valign: 'bottom', align: 'right', size: 12, color: c.muted });
      // 1 秒ごとの位置（うすい点）
      for (let t = 0; t <= 5; t++) g.dot(X(t), 0, { r: 3.5, color: c.muted });
      car(g, x1, 0, { color: c.accent, alpha: 0.45 });
      car(g, x2, 0, { color: c.accent });
      // Δx の矢印
      if (x2 - x1 > 0.3) {
        const yy = 0.72;
        g.line(x1, 0.05, x1, yy + 0.1, { color: c.accent, width: 1, dash: [3, 3] });
        g.line(x2, 0.05, x2, yy + 0.1, { color: c.accent, width: 1, dash: [3, 3] });
        if (g.X(x2) - g.X(x1) > 20) { g.arrow(x1, yy, x2, yy, { color: c.accent, width: 2, head: 8 }); g.arrow(x2, yy, x1, yy, { color: c.accent, width: 2, head: 8 }); }
        g.tex('\\Delta x', (x1 + x2) / 2, yy, { dy: -2, valign: 'bottom', align: 'center', size: 14, color: c.accent });
      }
      g.tex('t_1', x1, 0, { dx: -15, dy: -26, valign: 'bottom', align: 'center', size: 13, color: c.accent, avoid: true });
      g.tex('t_2', x2, 0, { dx: -15, dy: -26, valign: 'bottom', align: 'center', size: 13, color: c.accent, avoid: true });
    };
    plot.draw = function (g) {
      const c = g.c, t1 = Math.min(st.a, st.b), t2 = Math.max(st.a, st.b);
      g.grid({ stepX: 1, stepY: 10, xlabel: 't\\ (秒)', ylabel: 'x\\ (\\mathrm{m})' });
      D.curve(g, X, { x0: 0, x1: 5.3 });
      g.tex('x=2t^2', 4.75, X(4.75), { dx: -10, align: 'right', size: 15, color: c.primary });
      D.secant(g, X, t1, t2 - t1, { points: false });
      const dtPx = g.X(t2) - g.X(t1), dxPx = g.Y(X(t1)) - g.Y(X(t2));
      if (dtPx > 26) g.tex('\\Delta t', (t1 + 3 * t2) / 4, X(t1), { dy: -3, valign: 'bottom', align: 'center', size: 14, color: c.accent });
      if (dxPx > 18) g.tex('\\Delta x', t2, (X(t1) + X(t2)) / 2, { dx: 6, align: 'left', size: 14, color: c.accent });
    };
    update();
  }

  /* ==========================================================
     4.1(3) Δt を小さくする：割線 → 接線（表つき）
     ========================================================== */
  function initShrink() {
    const root = $id('w-shrink');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.7, xmax: 5.6, ymin: -6, ymax: 56, ratio: [0.85, 0.5] });
    const DTS = [1, 0.5, 0.1, 0.01, 0.001];
    const st = { t0: 2, k: 0, play: false };          // Δt = 10^(−k)
    const ctl = root.querySelector('.controls');
    const sK = slider(ctl, { tex: '\\red{\\Delta t}', min: 0, max: 3, step: 0.05, value: 0, color: 'accent', aria: '時間の幅 Δt（目盛りは 10 の何乗分の 1）',
      fmt: (v) => dec(Math.pow(10, -v), 4) + ' 秒' });
    const sT = slider(ctl, { tex: 't_0', min: 0.5, max: 4, step: 0.5, value: st.t0, color: 'teal', aria: '時刻 t0（秒）', fmt: (v) => v.toFixed(1) + ' 秒' });
    const btn = R(root, 'play'), show = playButton(btn, ['▶ 小さくしていく', '一時停止']);
    const chips = R(root, 'chips'), chipEls = [];
    DTS.forEach(function (d) {
      const b = el('button', 'chip'); b.type = 'button';
      setTex(b, '\\Delta t=' + d);
      b.addEventListener('click', () => { stop(); st.k = -Math.log10(d); update(); });
      chips.append(b); chipEls.push(b);
    });
    const stop = () => { if (st.play) { st.play = false; show(false); } };
    sK.on((v) => { stop(); st.k = v; update(); });
    sT.on((v) => { st.t0 = v; buildTable(); update(); });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.k = Math.min(3, st.k + dt * 0.75);
      if (st.k >= 3) { st.play = false; show(false); }
      update();
      return st.play;
    });
    btn.addEventListener('click', () => { st.play = !st.play; if (st.play && st.k >= 2.999) st.k = 0; show(st.play); if (st.play) anim.kick(); });
    show(false);
    const box = R(root, 'table');
    function buildTable() {
      const t0 = st.t0, x0 = X(t0);
      let h = '<table class="ratio-table shrink-table"><thead><tr><th>$\\red{\\Delta t}$</th><th>$x(' + dec(t0, 1) + '+\\red{\\Delta t})$</th><th>$\\red{\\Delta x}$</th><th>$\\dfrac{\\red{\\Delta x}}{\\red{\\Delta t}}$</th></tr></thead><tbody>';
      DTS.forEach(function (d) {
        const x1 = X(t0 + d), dx = x1 - x0;
        h += '<tr><td>$' + d + '$</td><td>$' + dec(x1, 6) + '$</td><td>$' + dec(dx, 6) + '$</td><td><b>$' + dec(dx / d, 4) + '$</b></td></tr>';
      });
      h += '<tr class="lim"><td>$\\to0$</td><td></td><td>$\\to0$</td><td><b>$\\to\\teal{' + dec(V(t0), 2) + '}$</b></td></tr></tbody></table>';
      box.innerHTML = h; typeset(box);
    }
    function update() {
      const d = Math.pow(10, -st.k), t0 = st.t0, v = (X(t0 + d) - X(t0)) / d;
      sK.set(st.k.toFixed(2));
      const near = DTS.findIndex((q) => Math.abs(-Math.log10(q) - st.k) < 0.026);
      chipEls.forEach((b, i) => b.setAttribute('aria-pressed', String(i === near)));
      box.querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('on', i === near));
      tex(root, 'avg', '\\dfrac{\\red{\\Delta x}}{\\red{\\Delta t}}\\approx' + dec(v, 4) + '\\ \\text{m/秒}');
      tex(root, 'inst', '\\teal{' + dec(V(t0), 2) + '}\\ \\text{m/秒}\\ (' + dec(V(t0) * 3.6, 1) + '\\ \\text{km/時})');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, t0 = st.t0, d = Math.pow(10, -st.k);
      g.grid({ stepX: 1, stepY: 10, xlabel: 't\\ (秒)', ylabel: 'x\\ (\\mathrm{m})' });
      D.curve(g, X, { x0: 0, x1: 5.3 });
      g.tex('x=2t^2', 4.75, X(4.75), { dx: -10, align: 'right', size: 15, color: c.primary });
      D.tangent(g, X, t0, { df: V, width: 2, point: false, dash: [7, 5] });
      D.secant(g, X, t0, d, { rise: d > 0.05 });
      g.dot(t0, X(t0), { r: 6, color: c.teal });
      g.tex('\\mathrm{A}', t0, X(t0), { dx: -10, dy: -12, align: 'right', size: 15, color: c.teal });
      if (g.X(t0 + d) - g.X(t0) > 14) g.tex('\\mathrm{B}', t0 + d, X(t0 + d), { dx: 10, dy: 12, align: 'left', size: 15, color: c.accent });
      g.tex('\\text{接線}', 5.25, X(t0) + V(t0) * (5.25 - t0), { dy: 14, align: 'right', valign: 'top', size: 13, color: c.teal, avoid: true });
    };
    buildTable(); update();
  }

  /* ==========================================================
     4.1(4) ボールを落とす：x = 5t²（x は下向き）
       1枚の図の左にボール、右にグラフ。縦の座標 v = −x（下ほど x が大きい）で、
       ボールとグラフの点が同じ高さに並ぶ。
     ========================================================== */
  function initDrop() {
    const root = $id('w-drop'), cvs = root.querySelectorAll('canvas');
    const XF = (t) => 5 * t * t, A = 3;
    const HS = [1, 0.5, 0.1, 0.01, 0.001];
    const S_MIN = -3, S_MAX = Math.log10(2);
    const st = { s: 0, t: 0, drop: false, shrink: false, strobe: false, tan: false, seen: {} };
    const main = new Plot(cvs[0], { xmin: -2.75, xmax: 5.55, ymin: -141, ymax: 13, ratio: [1.2, 0.62] });
    const zoom = new Plot(cvs[1], { xmin: 2, xmax: 4, ymin: -100, ymax: -20, ratio: [0.75, 0.42] });
    // h = 10^s。きりのよい値の近くではその値にそろえ、いちばん小さいところでは 0.001 ちょうど
    const hOf = (s) => {
      if (s <= S_MIN + 0.03) return 0.001;
      for (const q of HS) if (Math.abs(s - Math.log10(q)) < 0.03) return q;
      return +Math.pow(10, s).toPrecision(2);
    };
    const H = () => hOf(st.s);
    const ctl = root.querySelector('.controls');
    const sh = slider(ctl, { tex: '\\red{h}', min: S_MIN, max: S_MAX, step: 0.01, value: 0, color: 'accent', aria: '時間の幅 h（10 の何乗か）',
      fmt: () => dec(H(), 4) + ' 秒' });
    const sT = slider(ctl, { tex: 't', min: 0, max: 5, step: 0.05, value: 0, color: 'primary', aria: 'ボールの時刻 t（秒）', fmt: (v) => v.toFixed(2) + ' 秒' });
    const chipEls = HS.map(function (q) {
      const b = el('button', 'chip'); b.type = 'button'; setTex(b, 'h=' + q);
      b.addEventListener('click', () => { stopShrink(); setS(Math.log10(q)); });
      R(root, 'hs').append(b);
      return b;
    });
    function setS(s) { st.s = clamp(s, S_MIN, S_MAX); const i = HS.indexOf(H()); if (i >= 0) st.seen[i] = true; update(); }
    sh.on((v) => { stopShrink(); setS(v); });
    sT.on((v) => { stopDrop(); st.t = v; update(); });
    R(root, 'strobe').addEventListener('change', (e) => { st.strobe = e.target.checked; update(); });
    R(root, 'tan').addEventListener('change', (e) => { st.tan = e.target.checked; update(); });
    const bDrop = R(root, 'drop'), bShr = R(root, 'shrink');
    const showDrop = () => { bDrop.textContent = st.drop ? '⏸ 止める' : '▶ 落とす'; };
    const showShr = () => { bShr.innerHTML = st.shrink ? '⏸ 止める' : '▶ <i>h</i> を 0 に近づける'; };
    const stopDrop = () => { if (st.drop) { st.drop = false; showDrop(); } };
    const stopShrink = () => { if (st.shrink) { st.shrink = false; showShr(); } };
    const anim = L.animate(root, function (dt) {
      let on = false;
      if (st.drop) {
        st.t = Math.min(5, st.t + dt);
        if (st.t >= 5) { st.drop = false; showDrop(); } else on = true;
      }
      if (st.shrink) {
        const prev = st.s;
        st.s = Math.max(S_MIN, st.s - dt * 0.8);
        HS.forEach((q, i) => { const k = Math.log10(q); if (prev >= k - 0.031 && st.s <= k + 0.031) st.seen[i] = true; });
        if (st.s <= S_MIN) { st.s = S_MIN; st.seen[4] = true; st.shrink = false; showShr(); } else on = true;
      }
      update();
      return on;
    });
    bDrop.addEventListener('click', () => { st.drop = !st.drop; if (st.drop && st.t >= 4.99) st.t = 0; showDrop(); if (st.drop) anim.kick(); });
    bShr.addEventListener('click', () => { st.shrink = !st.shrink; if (st.shrink && st.s <= S_MIN + 0.001) st.s = 0; showShr(); if (st.shrink) anim.kick(); });
    showDrop(); showShr();
    st.seen[0] = true;

    // 拡大図の範囲：A と B が入り、縦横の見た目の比がほぼ一定
    function zoomBox(h) {
      const t0 = A - 0.6 * h, t1 = A + 1.6 * h;
      const x0 = XF(t0), x1 = XF(t1), pad = 0.06 * (x1 - x0);
      return { t0, t1, v0: -(x1 + pad), v1: -(x0 - pad) };
    }
    function update() {
      const h = H(), xa = XF(A), xb = XF(A + h), dx = xb - xa, v = dx / h;
      const z = zoomBox(h);
      zoom.setView({ xmin: z.t0, xmax: z.t1, ymin: z.v0, ymax: z.v1 });   // 拡大図の範囲は h で変わる
      sh.set(st.s); sT.set(st.t.toFixed(2));
      chipEls.forEach((b, i) => b.setAttribute('aria-pressed', String(HS[i] === h)));
      HS.forEach((q, i) => {
        const td = R(root, 'c' + i), val = st.seen[i] ? '$' + dec((XF(A + q) - xa) / q, 4) + '$' : '?';
        if (td._v !== val) { td._v = val; td.innerHTML = val; typeset(td); }
        td.classList.toggle('on', q === h);
      });
      const lim = R(root, 'c5'), lv = st.seen[4] ? '$\\teal{30}$' : '?';
      if (lim._v !== lv) { lim._v = lv; lim.innerHTML = lv; typeset(lim); }
      tex(root, 'dx', '\\red{\\Delta x}=x(' + dec(A + h, 4) + ')-x(3)=' + dec(xb, 6) + '-45=' + dec(dx, 6) + '\\ \\text{m}');
      tex(root, 'avg', '\\dfrac{\\red{\\Delta x}}{\\red{h}}=\\dfrac{' + dec(dx, 6) + '}{' + dec(h, 4) + '}=\\red{' + dec(v, 4) + '}\\ \\text{m/秒}');
      let s;
      if (h >= 0.5) s = '$\\mathrm{A}$ と $\\mathrm{B}$ が離れているので、割線（赤）は接線（緑の点線）からずれています。平均の速さは $30$ より大きい（後半ほど速く落ちるから）。';
      else if (h > 0.005) s = '$\\mathrm{B}$ が $\\mathrm{A}$ に近づき、割線が接線に重なってきました。平均の速さは $30+5h$ で、$30$ に近づいています。';
      else s = '$h=0.001$ 秒では、$\\mathrm{A}$ と $\\mathrm{B}$ はほとんど同じ点。拡大図でも曲線はまっすぐに見え、平均の速さは $30.005$。$h$ を $0$ に近づけた行き先 <b>$30$ m/秒</b> が、3 秒後の瞬間の速さです。';
      if (!st.tan) s += '（「A での接線」をオンにすると、緑の点線で接線が出ます）';
      const how = R(root, 'how');
      if (how._v !== s) { how._v = s; how.innerHTML = s; typeset(how); }
      main.invalidate(); zoom.invalidate();
    }

    main.draw = function (g) {
      const c = g.c, ctx = g.ctx, h = H(), V = (t) => -XF(t);
      const AX = -2.15, BX = -1.15;                       // 左：x 軸とボールの列
      // 横の目盛り線（左右共通の高さ）
      for (let x = 20; x <= 120; x += 20) {
        g.line(AX, -x, 5.4, -x, { color: c.grid, width: 1 });
        g.texPx(String(x), g.X(AX) - 6, g.Y(-x), { align: 'right', size: 12, color: c.muted });
      }
      for (let t = 1; t <= 5; t++) g.line(t, 0, t, -135, { color: c.grid, width: 1 });
      // 地面（x = 130）
      ctx.save(); ctx.fillStyle = c.brown; ctx.globalAlpha = 0.25;
      ctx.fillRect(g.X(-2.75), g.Y(-130), g.X(-0.35) - g.X(-2.75), g.Y(-141) - g.Y(-130));
      ctx.restore();
      g.line(-2.75, -130, -0.35, -130, { color: c.brown, width: 2.5 });
      g.texPx(g.w < 520 ? '\\text{地面}' : '\\text{地面 }(x=130)', g.X(-0.4), g.Y(-130) + 3, { align: 'right', valign: 'top', size: 12, color: c.brown });
      // 離した位置の台
      g.line(-1.65, 0, -0.65, 0, { color: c.text, width: 3 });
      g.texPx('\\mathrm{O}', g.X(AX) - 6, g.Y(0), { align: 'right', size: 12, color: c.muted });
      // x 軸（下向き）
      g.arrow(AX, 6, AX, -136, { color: c.axis, width: 1.8, head: 10 });
      g.texPx('x', g.X(AX) + 6, g.Y(-136), { align: 'left', valign: 'bottom', size: 14, color: c.text });
      g.texPx('\\text{下向きが正}', g.X(AX) + 4, g.Y(-118), { align: 'left', size: 11, color: c.muted });
      // グラフの軸：t は右向き（上の辺）、x は下向き
      g.arrow(0, 0, 5.45, 0, { color: c.axis, width: 1.5, head: 9 });
      g.arrow(0, 6, 0, -136, { color: c.axis, width: 1.5, head: 9 });
      g.texPx('t\\ (\\text{秒})', g.X(5.45), g.Y(0) - 4, { align: 'right', valign: 'bottom', size: 13, color: c.text });
      g.texPx('x\\ (\\mathrm{m})', g.X(0) + 6, g.Y(-136), { align: 'left', valign: 'bottom', size: 13, color: c.text });
      for (let t = 1; t <= 5; t++) g.texPx(String(t), g.X(t) + 3, g.Y(0) + 3, { align: 'left', valign: 'top', size: 12, color: c.muted });
      // 1 秒ごとの位置
      if (st.strobe) {
        for (let t = 0; t <= 5; t++) {
          g.dot(BX, V(t), { r: 6, color: c.violet, ring: true, lw: 2 });
          g.line(BX, V(t), t, V(t), { color: c.violet, width: 1, dash: [2, 4], alpha: 0.7 });
          g.dot(t, V(t), { r: 3.5, color: c.violet, stroke: false });
          if (t) {
            g.line(BX - 0.42, V(t - 1), BX - 0.42, V(t), { color: c.violet, width: 4, alpha: t % 2 ? 1 : 0.45 });
            g.line(BX - 0.56, V(t), BX - 0.28, V(t), { color: c.violet, width: 1.5 });
            g.texPx(String(XF(t) - XF(t - 1)), g.X(BX - 0.5), g.Y((V(t) + V(t - 1)) / 2), { align: 'right', size: 12, color: c.violet });
          }
        }
      }
      // グラフ
      D.curve(g, V, { x0: 0, x1: 5.1, color: c.primary, width: 3.2 });
      g.tex('x=5t^2', 1.7, V(1.7), { color: c.primary, size: 15, align: 'right', dx: -8, dy: 14 });
      if (st.tan) D.tangent(g, V, A, { df: (t) => -10 * t, width: 2, dash: [7, 5], point: false });
      D.secant(g, V, A, h, { width: 2.4, points: false, rise: false });
      // A, B とボールをつなぐ点線
      const ya = V(A), yb = V(A + h);
      g.line(BX, ya, A, ya, { color: c.accent, width: 1.2, dash: [4, 4] });
      g.line(BX, yb, A + h, yb, { color: c.accent, width: 1.2, dash: [4, 4] });
      // Δx の矢印（左）
      const ax = BX + 0.45;
      if (g.Y(yb) - g.Y(ya) > 14) { g.arrow(ax, ya, ax, yb, { color: c.accent, width: 2.2, head: 8 }); }
      else g.line(ax, ya, ax, yb, { color: c.accent, width: 3 });
      if (g.Y(yb) - g.Y(ya) > 14) g.texPx('\\red{\\Delta x}', g.X(ax) + 5, (g.Y(ya) + g.Y(yb)) / 2, { align: 'left', size: 13 });
      // A, B（グラフとボール）
      [[A, ya, 'A', '3'], [A + h, yb, 'B', '3+h']].forEach(function (p, i) {
        if (i && g.Y(yb) - g.Y(ya) < 12) return;
        g.dot(BX, p[1], { r: 7, color: c.accent, ring: true });
        g.dot(p[0], p[1], { r: 5.5, color: c.accent });
        g.tex('\\mathrm{' + p[2] + '}', p[0], p[1], { size: 14, align: 'left', dx: 8, dy: i ? 10 : -10, color: c.accent });
      });
      // 拡大の四角
      const z = zoomBox(h);
      if (g.X(z.t1) - g.X(z.t0) > 6) g.poly([[z.t0, z.v0], [z.t1, z.v0], [z.t1, z.v1], [z.t0, z.v1], [z.t0, z.v0]], { color: c.text, width: 1.2 });
      // いまのボール
      const yt = V(st.t);
      g.line(BX, yt, st.t, yt, { color: c.primary, width: 1.2, dash: [3, 4], alpha: 0.8 });
      g.dot(st.t, yt, { r: 5, color: c.primary });
      g.dot(BX, yt, { r: 9, color: c.primary });
      g.texPx('t=' + st.t.toFixed(1), g.X(BX) + 12, g.Y(yt) - 6, { align: 'left', valign: 'bottom', size: 12, color: c.primary });
    };

    zoom.draw = function (g) {
      const c = g.c, h = H(), V = (t) => -XF(t), z = zoomBox(h);
      g.grid({ labels: false, axes: false, stepX: Math.pow(10, Math.floor(Math.log10(z.t1 - z.t0))), stepY: Math.pow(10, Math.floor(Math.log10(z.v1 - z.v0))) });
      D.curve(g, V, { x0: g.xmin, x1: g.xmax, color: c.primary, width: 3 });
      if (st.tan) D.tangent(g, V, A, { df: (t) => -10 * t, width: 2, dash: [7, 5], point: false });
      D.secant(g, V, A, h, { width: 2.4, points: false, rise: false });
      g.dot(A, V(A), { r: 6, color: c.accent });
      g.dot(A + h, V(A + h), { r: 6, color: c.accent });
      g.tex('\\mathrm{A}', A, V(A), { size: 14, align: 'right', dx: -8, dy: -8, color: c.accent });
      g.tex('\\mathrm{B}', A + h, V(A + h), { size: 14, align: 'left', dx: 8, dy: 8, color: c.accent });
      g.texPx('\\text{横幅 }' + dec(z.t1 - z.t0, 4) + '\\text{ 秒}', g.w - 8, g.h - 6, { align: 'right', valign: 'bottom', size: 12, color: c.muted });
    };
    update();
  }

  /* ==========================================================
     4.1(5) 虫めがね：拡大するとまっすぐに見える
     ========================================================== */
  const MAG_F = [
    { name: 'x^2', f: (x) => x * x, df: (x) => 2 * x, a: 1, view: [-2.2, 2.2, -0.9, 4.4], amin: -1.6, amax: 1.6, lab: [1.5, 4.0, 'right'] },
    { name: '\\sin x', f: Math.sin, df: Math.cos, a: 0, view: [-3.6, 3.6, -1.7, 1.7], amin: -3, amax: 3, lab: [2.0, 1.35, 'center'] },
    { name: '|x|', f: Math.abs, df: null, a: 0, view: [-2.2, 2.2, -0.9, 2.4], amin: -1.6, amax: 1.6, lab: [-1.05, 2.0, 'left'] },
  ];
  function magView(F, a, z) {
    const v = F.view, H = (v[1] - v[0]) / 2, Hy = (v[3] - v[2]) / 2, ya = F.f(a);
    return { xmin: a - H / z, xmax: a + H / z, ymin: ya - Hy / z, ymax: ya + Hy / z };
  }
  function initMag() {
    const root = $id('w-mag'), cvs = root.querySelectorAll('canvas');
    const left = new Plot(cvs[0], { xmin: -2.2, xmax: 2.2, ymin: -0.9, ymax: 4.4, ratio: [0.8, 0.8] });
    const right = new Plot(cvs[1], { xmin: -2.2, xmax: 2.2, ymin: -0.9, ymax: 4.4, ratio: [0.8, 0.8] });
    const st = { fi: 0, a: 1, k: 0, play: false };    // 倍率 = 2^k
    const F = () => MAG_F[st.fi];
    const ctl = root.querySelector('.controls');
    const sK = slider(ctl, { tex: '\\times', min: 0, max: 10, step: 0.1, value: 0, color: 'violet', aria: '倍率（2 の何乗倍）', fmt: (v) => dec(Math.pow(2, v), 0) + ' 倍' });
    const btn = R(root, 'play'), show = playButton(btn, ['▶ 拡大していく', '一時停止']);
    const stop = () => { if (st.play) { st.play = false; show(false); } };
    sK.on((v) => { stop(); st.k = v; update(); });
    const chips = R(root, 'chips'), chipEls = [];
    MAG_F.forEach(function (q, i) {
      const b = el('button', 'chip'); b.type = 'button';
      setTex(b, 'y=' + q.name);
      b.addEventListener('click', () => { stop(); st.fi = i; st.a = q.a; st.k = 0; setView(); update(); });
      chips.append(b); chipEls.push(b);
    });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.k = Math.min(10, st.k + dt * 1.6);
      if (st.k >= 10) { st.play = false; show(false); }
      update();
      return st.play;
    });
    btn.addEventListener('click', () => { st.play = !st.play; if (st.play && st.k >= 9.99) st.k = 0; show(st.play); if (st.play) anim.kick(); });
    show(false);
    left.addHandle({
      get x() { return st.a; }, get y() { return F().f(st.a); },
      get color() { return left.c ? left.c.teal : '#088'; }, r: 7, tex: '\\mathrm{P}', ldx: -12, ldy: -14, lalign: 'right',
      drag(x) { const q = F(); st.a = clamp(Math.round(x * 20) / 20, q.amin, q.amax); update(); },
    });
    function setView() { const v = F().view; left.setView({ xmin: v[0], xmax: v[1], ymin: v[2], ymax: v[3] }); }
    function slopeTeX(q) {
      if (!q.df) return Math.abs(st.a) < 1e-9 ? '\\text{角なので決まらない（左は }-1\\text{、右は }1\\text{）}' : (st.a > 0 ? '1' : '-1');
      return dec(q.df(st.a), 3);
    }
    // 拡大図の中で、曲線が接線からいちばん離れる長さ（画面の点の数）
    function deviationPx(q, v) {
      const a = st.a, fa = q.f(a);
      let m = q.df ? q.df(a) : (a > 0 ? 1 : a < 0 ? -1 : 1), worst = 0;
      if (!q.df && Math.abs(a) < 1e-9) m = 0;
      const pxy = (right.h || 300) / (v.ymax - v.ymin);
      for (let i = 0; i <= 200; i++) { const x = v.xmin + (v.xmax - v.xmin) * i / 200; worst = Math.max(worst, Math.abs(q.f(x) - fa - m * (x - a))); }
      return worst * pxy;
    }
    function update() {
      const q = F(), z = Math.pow(2, st.k), v = magView(q, st.a, z), w = v.xmax - st.a;
      sK.set(st.k.toFixed(1));
      chipEls.forEach((b, i) => b.setAttribute('aria-pressed', String(i === st.fi)));
      right.setView(v);
      const ms = (q.f(st.a + w) - q.f(st.a)) / w;
      tex(root, 'zoom', '\\times' + dec(z, 0) + '\\quad(\\text{横の幅 }' + (2 * w >= 0.01 ? dec(2 * w, 3) : dec(2 * w, 6)) + ')');
      tex(root, 'slope', '\\dfrac{f(a+w)-f(a)}{w}\\approx\\red{' + dec(ms, 4) + '}');
      tex(root, 'tan', '\\teal{' + slopeTeX(q) + '}');
      const dv = deviationPx(q, v);
      tex(root, 'dev', '\\approx' + (dv >= 10 ? dec(dv, 0) : dv >= 0.1 ? dec(dv, 1) : '0') + '\\ \\text{点}' + (dv < 1 ? '\\ \\text{（まっすぐに見える）}' : ''));
      left.invalidate(); right.invalidate();
    }
    left.draw = function (g) {
      const c = g.c, q = F(), z = Math.pow(2, st.k), v = magView(q, st.a, z);
      g.grid({ step: 1, xlabel: 'x', ylabel: 'y' });
      D.curve(g, q.f, { n: 400 });
      g.tex('y=' + q.name, q.lab[0], q.lab[1], { align: q.lab[2], size: 15, color: c.primary });
      // 虫めがねの範囲（小さくなりすぎたら輪で示す）
      const x0 = g.X(v.xmin), x1 = g.X(v.xmax), y0 = g.Y(v.ymax), y1 = g.Y(v.ymin), ctx = g.ctx;
      ctx.save(); ctx.strokeStyle = c.violet; ctx.lineWidth = 2;
      if (x1 - x0 > 8) ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.beginPath(); ctx.arc(g.X(st.a), g.Y(q.f(st.a)), 22, 0, 2 * Math.PI); ctx.globalAlpha = st.k > 2 ? 1 : 0.35; ctx.stroke();
      ctx.restore();
    };
    right.draw = function (g) {
      const c = g.c, q = F(), a = st.a, fa = q.f(a), z = Math.pow(2, st.k);
      const span = g.xmax - g.xmin, p10 = Math.pow(10, Math.floor(Math.log10(span / 4)));
      const step = [1, 2, 5, 10].map((k) => k * p10).find((s) => span / s <= 6) || 10 * p10;
      g.grid({ step, labels: false, axes: true });
      // 接線（緑の点線）
      if (q.df) { const m = q.df(a); g.line(g.xmin, fa + m * (g.xmin - a), g.xmax, fa + m * (g.xmax - a), { color: c.teal, width: 2, dash: [7, 6] }); }
      const n = 400, pts = [];
      for (let i = 0; i <= n; i++) { const x = g.xmin + span * i / n; pts.push([x, q.f(x)]); }
      g.poly(pts, { color: c.primary, width: 3.5 });
      g.dot(a, fa, { r: 6, color: c.teal });
      g.tex('\\mathrm{P}', a, fa, { dx: -10, dy: -14, align: 'right', size: 15, color: c.teal });
      g.texPx('\\times' + dec(z, 0), 10, 10, { align: 'left', valign: 'top', size: 15, color: c.violet });
      // 虫めがねらしく、ふちを紫に
      const ctx = g.ctx; ctx.save(); ctx.strokeStyle = c.violet; ctx.lineWidth = 4; ctx.strokeRect(2, 2, g.w - 4, g.h - 4); ctx.restore();
    };
    setView(); update();
  }

  /* ==========================================================
     4.1(6) 自分の指の動きを微分する
     ========================================================== */
  const F_DTS = [1 / 60, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5];
  function initFinger() {
    const root = $id('w-finger');
    const pad = root.querySelector('canvas.finger-pad'), pctx = pad.getContext('2d');
    const cvs = root.querySelectorAll('.stage canvas');
    const TMAX = 4, YMAX = 10;
    const pos = new Plot(cvs[0], { xmin: -0.25, xmax: 4.15, ymin: -0.7, ymax: 11.6, ratio: [0.85, 0.38] });
    const vel = new Plot(cvs[1], { xmin: -0.25, xmax: 4.15, ymin: -10, ymax: 10, ratio: [0.55, 0.3] });
    const st = { data: [], rec: false, t0: 0, cur: null, ki: 0, touched: false };
    const ctl = root.querySelector('.controls');
    const sD = slider(ctl, { tex: '\\red{\\Delta t}', min: 0, max: F_DTS.length - 1, step: 1, value: 0, color: 'accent', aria: '速さを計算する時間の幅 Δt',
      fmt: (i) => (i === 0 ? '1/60' : dec(F_DTS[i], 2)) });
    sD.on((i) => { st.ki = i; compute(); });
    const msg = R(root, 'msg');
    const say = (t) => { msg.textContent = t; };
    // 板の大きさを位置のグラフにそろえる（同じ高さ → 同じ目盛り）
    function sizePad() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3), w = pad.clientWidth || 64, h = pos.h || 240;
      pad.style.height = h + 'px'; pad.width = Math.round(w * dpr); pad.height = Math.round(h * dpr);
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0); drawPad();
    }
    pos.onResize = sizePad;
    const valAt = (e) => clamp(pos.iy(e.clientY - pad.getBoundingClientRect().top), 0, YMAX);
    function drawPad() {
      const w = pad.clientWidth || 64, h = pos.h || 240, c = pos.c || L.palette();
      pctx.clearRect(0, 0, w, h);
      pctx.fillStyle = c.surface; pctx.fillRect(0, 0, w, h);
      const y0 = pos.Y(YMAX), y1 = pos.Y(0);
      pctx.fillStyle = c.bg; pctx.strokeStyle = c.grid; pctx.lineWidth = 1.5;
      pctx.beginPath(); if (pctx.roundRect) pctx.roundRect(8, y0 - 6, w - 16, y1 - y0 + 12, 10); else pctx.rect(8, y0 - 6, w - 16, y1 - y0 + 12);
      pctx.fill(); pctx.stroke();
      pctx.strokeStyle = c.grid; pctx.lineWidth = 1;
      for (let k = 0; k <= YMAX; k++) { const y = Math.round(pos.Y(k)) + 0.5; pctx.beginPath(); pctx.moveTo(14, y); pctx.lineTo(w - 14, y); pctx.stroke(); }
      // 上下の矢印
      pctx.fillStyle = c.muted;
      [[y0 + 4, 1], [y1 - 4, -1]].forEach(function (p) {
        pctx.beginPath(); pctx.moveTo(w / 2, p[0]); pctx.lineTo(w / 2 - 7, p[0] + 9 * p[1]); pctx.lineTo(w / 2 + 7, p[0] + 9 * p[1]); pctx.closePath(); pctx.fill();
      });
      if (st.cur != null) {
        pctx.fillStyle = c.primary; pctx.beginPath(); pctx.arc(w / 2, pos.Y(st.cur), st.rec ? 13 : 10, 0, 2 * Math.PI); pctx.fill();
        pctx.strokeStyle = '#fff'; pctx.lineWidth = 3; pctx.stroke();
      }
    }
    function start(e) {
      e.preventDefault();
      try { pad.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      st.touched = true; st.rec = true; st.data = []; st.t0 = performance.now();
      st.cur = valAt(e); st.data.push([0, st.cur]);
      say('記録中… 上下に動かそう'); anim.kick();
    }
    pad.addEventListener('pointerdown', start);
    pad.addEventListener('pointermove', (e) => { if (st.rec) { st.cur = valAt(e); e.preventDefault(); } });
    const end = () => { if (st.rec) finish(); };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    function finish() {
      st.rec = false;
      const T = st.data.length ? st.data[st.data.length - 1][0] : 0;
      say(T < 1 ? 'もう少し長く（4 秒）動かしてみよう' : '記録しました。Δt を変えてみよう');
      compute(); drawPad();
    }
    const anim = L.animate(root, function () {
      if (!st.rec) return false;
      const t = (performance.now() - st.t0) / 1000;
      if (t >= TMAX) { st.data.push([TMAX, st.cur]); finish(); return false; }
      const last = st.data[st.data.length - 1];
      if (t - last[0] > 0.004) st.data.push([t, st.cur]);
      compute(); drawPad();
      return true;
    });
    R(root, 'demo').addEventListener('click', function () {
      // 画面の点の単位に丸めた位置 ＋ 指のふるえ（小さなノイズ）
      const q = (pos.ymax - pos.ymin) / (pos.h || 240), d = [];
      for (let i = 0; i <= TMAX * 60; i++) {
        const t = i / 60, s = t < 2 ? t / 2 : 1;
        let y = 5 + 3.6 * Math.sin(Math.PI * t * (0.6 + 0.45 * s));
        y += (Math.random() - 0.5) * 1.6 * q;
        d.push([t, clamp(Math.round(y / q) * q, 0, YMAX)]);
      }
      st.data = d; st.rec = false; st.cur = d[d.length - 1][1]; st.touched = true;
      say('お手本の動き（4 秒）'); compute(); drawPad();
    });
    R(root, 'clear').addEventListener('click', () => { st.data = []; st.rec = false; st.cur = null; say(''); compute(); drawPad(); });
    // 速さ：[t_i, t_i + Δt] の平均の速さを、区間のまん中の時刻に描く
    function speeds(W) {
      const d = st.data, out = [];
      let j = 0;
      for (let i = 0; i < d.length; i++) {
        if (j <= i) j = i + 1;
        while (j < d.length && d[j][0] - d[i][0] < W - 1e-6) j++;
        if (j >= d.length) break;
        const dt = d[j][0] - d[i][0];
        if (dt > 1e-6) out.push([(d[i][0] + d[j][0]) / 2, (d[j][1] - d[i][1]) / dt]);
      }
      return out;
    }
    let vNow = [], vRaw = [];
    function compute() {
      vRaw = speeds(1 / 60 - 1e-3); vNow = st.ki === 0 ? vRaw : speeds(F_DTS[st.ki]);
      const ref = speeds(0.2), mx = ref.reduce((m, p) => Math.max(m, Math.abs(p[1])), 0);
      const R0 = Math.max(4, Math.ceil(mx * 1.6 / 2) * 2);
      vel.setView({ ymin: -R0, ymax: R0 });
      const n = st.data.length, T = n ? st.data[n - 1][0] : 0;
      tex(root, 'n', n ? n + '\\ \\text{個の点（}' + dec(T, 1) + '\\ \\text{秒）}' : '\\text{まだありません}');
      tex(root, 'dt', '\\dfrac{\\red{\\Delta x}}{\\red{\\Delta t}},\\quad \\red{\\Delta t}=' + (st.ki === 0 ? '\\frac{1}{60}' : dec(F_DTS[st.ki], 2)) + '\\ \\text{秒}');
      const vm = vNow.reduce((m, p) => (Math.abs(p[1]) > Math.abs(m[1]) ? p : m), [0, 0]);
      tex(root, 'vmax', vNow.length ? '\\approx' + dec(Math.abs(vm[1]), 1) + '\\ \\text{目盛り/秒（}' + dec(vm[0], 1) + '\\ \\text{秒）}' : '\\text{—}');
      pos.invalidate(); vel.invalidate();
    }
    pos.draw = function (g) {
      const c = g.c;
      g.grid({ stepX: 1, stepY: 2, xlabel: 't\\ (秒)', ylabel: 'x' });
      if (st.data.length > 1) g.poly(st.data, { color: c.primary, width: 2.6 });
      else if (!st.touched) g.tex('\\leftarrow\\ \\text{左の板を指でなぞる}', 0.1, 5, { align: 'left', size: 15, color: c.muted });
      if (st.rec && st.data.length) { const p = st.data[st.data.length - 1]; g.dot(p[0], p[1], { r: 5, color: c.primary }); }
      g.tex('\\text{位置}', g.xmax, g.ymax, { dx: -8, dy: 6, align: 'right', valign: 'top', size: 13, color: c.primary });
    };
    vel.draw = function (g) {
      const c = g.c;
      g.grid({ stepX: 1, stepY: Math.max(2, Math.round((g.ymax - g.ymin) / 8 / 2) * 2), xlabel: 't\\ (秒)', ylabel: 'v' });
      if (st.ki > 0 && vRaw.length > 1) g.poly(vRaw, { color: c.muted, width: 1.2, alpha: 0.45 });
      if (vNow.length > 1) g.poly(vNow, { color: c.amber, width: st.ki === 0 ? 1.8 : 2.8 });
      g.tex('\\text{速さ}\\ \\dfrac{\\Delta x}{\\Delta t}', g.xmax, g.ymax, { dx: -8, dy: 6, align: 'right', valign: 'top', size: 13, color: c.amber });
    };
    document.addEventListener('themechange', drawPad);
    sizePad(); compute();
  }

  /* ==========================================================
     4.1 小話 マリオの重力（計算機）
     ========================================================== */
  function initMario() {
    const root = $id('w-mario'), ctl = root.querySelector('.controls');
    const st = { H: 4, T: 0.8 };
    const sH = slider(ctl, { tex: 'H', min: 0.5, max: 6, step: 0.1, value: st.H, color: 'primary', aria: 'ジャンプの高さ H（m）', fmt: (v) => v.toFixed(1) + ' m' });
    const sT = slider(ctl, { tex: 'T', min: 0.3, max: 2, step: 0.05, value: st.T, color: 'teal', aria: '滞空時間 T（秒）', fmt: (v) => v.toFixed(2) });
    sH.on((v) => { st.H = v; update(); });
    sT.on((v) => { st.T = v; update(); });
    function update() {
      const g = 8 * st.H / (st.T * st.T);
      tex(root, 'g', 'g=\\dfrac{8\\times' + dec(st.H, 1) + '}{' + dec(st.T, 2) + '^2}\\approx' + dec(g, 1) + '\\ \\text{m/秒}^2');
      tex(root, 'ratio', '\\dfrac{' + dec(g, 1) + '}{9.8}\\approx' + dec(g / 9.8, 1) + '\\ \\text{倍}');
      tex(root, 'v', 'g\\times\\dfrac{T}{2}\\approx' + dec(g * st.T / 2, 1) + '\\ \\text{m/秒}');
    }
    update();
  }

  /* ==========================================================
     4.1(7) チャレンジ：接線を当てろ
     ========================================================== */
  const P3 = Math.PI / 3;
  const TG_STAGES = [
    { name: 'れんしゅう', f: (x) => x * x, a: 1, m: 2, fn: 'y=x^2', view: [-1.3, 3, -1.6, 5.4], lab: [2.1, 4.9, 'right'], tutorial: true,
      text: '$y=x^2$ の点 $\\mathrm{P}(1,\\ 1)$ で接線になるように、傾き $\\violet{m}$ を決めよう',
      hint: 'スライダーを動かして、点 P のまわりで直線が曲線を横切らない（左右どちらでも曲線が直線の上にある）ところを探そう。「拡大して見る」をオンにすると見やすい。',
      answer: '$m=2$<br>$x=1$ から $1+\\red{\\Delta x}$ までの平均の傾き $\\dfrac{(1+\\Delta x)^2-1}{\\Delta x}$ は<br>$\\red{\\Delta x}=0.1$ で $\\dfrac{1.21-1}{0.1}=2.1$、$0.01$ で $2.01$、$0.001$ で $2.001$ → $2$' },
    { name: '下り坂', f: (x) => x * x, a: -1.5, m: -3, fn: 'y=x^2', view: [-3.3, 1.2, -1.6, 6.4], lab: [-2.3, 5.9, 'left'],
      text: '$y=x^2$ の点 $\\mathrm{P}(-1.5,\\ 2.25)$ で接線になる傾き $\\violet{m}$ は？',
      hint: '点 P では曲線が右下がりなので、傾きはマイナス。ステージ1の $x=1$ より急です。',
      answer: '$m=-3$<br>$\\red{\\Delta x}=0.1$ で $\\dfrac{(-1.4)^2-2.25}{0.1}=\\dfrac{1.96-2.25}{0.1}=-2.9$、$0.01$ で $\\dfrac{2.2201-2.25}{0.01}=-2.99$ → $-3$' },
    { name: '3次関数', f: (x) => 0.5 * x * x * x, a: 1, m: 1.5, fn: 'y=\\frac12x^3', view: [-0.9, 2.3, -1.3, 4.4], lab: [1.9, 3.9, 'right'],
      text: '$y=\\dfrac12x^3$ の点 $\\mathrm{P}\\left(1,\\ \\dfrac12\\right)$ で接線になる傾き $\\violet{m}$ は？',
      hint: '$x$ が $1$ から $1.1$ に増えると、$y$ は $0.5$ から $0.6655$ に増えます。もっと小さい幅で考えると？',
      answer: '$m=1.5$<br>$\\red{\\Delta x}=0.1$ で $\\dfrac{0.6655-0.5}{0.1}=1.655$、$0.01$ で $1.515$、$0.001$ で $1.5015$ → $1.5$' },
    { name: 'サイン', f: Math.sin, a: P3, m: 0.5, fn: 'y=\\sin x', view: [-0.6, 3.6, -1.5, 1.7], lab: [2.6, 1.2, 'center'],
      text: '$y=\\sin x$ の点 $\\mathrm{P}\\left(\\dfrac{\\pi}{3},\\ \\dfrac{\\sqrt3}{2}\\right)$ で接線になる傾き $\\violet{m}$ は？（$x$ はラジアン）',
      hint: '$y=\\sin x$ は $x=\\dfrac{\\pi}{2}\\approx1.57$ で山の頂上（傾き $0$）、$x=0$ では傾き $1$（(4) の虫めがね）。$\\dfrac{\\pi}{3}\\approx1.05$ はその間です。',
      answer: '$m=0.5$<br>$\\red{\\Delta x}=0.01$ で $\\dfrac{\\sin(1.0572)-\\sin(1.0472)}{0.01}\\approx0.4957$、$0.001$ で $0.4996$ → $0.5$<br>じつは $\\cos\\dfrac{\\pi}{3}=\\dfrac12$ と同じ（4.3節）。' },
    { name: '最終', f: (x) => Math.pow(2, x), a: 1, m: 2 * Math.log(2), fn: 'y=2^x', view: [-1.6, 2.6, -0.8, 6.2], lab: [2.0, 5.4, 'right'],
      text: '最終ステージ：$y=2^x$ の点 $\\mathrm{P}(1,\\ 2)$ で接線になる傾き $\\violet{m}$ は？',
      hint: '$x$ が $1$ から $1.1$ に増えると、$y$ は $2$ から $2^{1.1}\\approx2.1435$ に増えます。幅を小さくするともう少し小さくなります。',
      answer: '$m\\approx1.39$<br>$\\red{\\Delta x}=0.1$ で $\\dfrac{2.1435-2}{0.1}\\approx1.435$、$0.01$ で $1.391$、$0.001$ で $1.387$ → 約 $1.386$<br>（2.6節の $(a^x)\'=a^x\\log a$ から $2\\log2\\approx1.386$。4.3節で）' },
  ];
  function insetDraw(g, box, v, fn) {
    // box: 画面のピクセル [x, y, w, h]、v: 小さな図の座標 {xmin,xmax,ymin,ymax}
    const ctx = g.ctx, c = g.c;
    const X = (x) => box[0] + (x - v.xmin) / (v.xmax - v.xmin) * box[2];
    const Y = (y) => box[1] + box[3] - (y - v.ymin) / (v.ymax - v.ymin) * box[3];
    ctx.save();
    ctx.fillStyle = c.bg; ctx.fillRect(box[0], box[1], box[2], box[3]);
    ctx.beginPath(); ctx.rect(box[0], box[1], box[2], box[3]); ctx.clip();
    fn(ctx, X, Y);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = c.violet; ctx.lineWidth = 3; ctx.strokeRect(box[0], box[1], box[2], box[3]); ctx.restore();
  }
  function initGameTangent() {
    const root = $id('w-game-tangent'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.3, xmax: 3, ymin: -1.6, ymax: 5.4, ratio: [0.85, 0.52] });
    const TOL = 0.1, ZOOM = 8;
    const sm = slider(ctl, { tex: '\\violet{m}', min: -5, max: 5, step: 0.05, value: 0.5, color: 'violet', aria: '直線の傾き m', fmt: (v) => v.toFixed(2) });
    const fine = el('div', 'btn-row');
    [['−0.5', -0.5], ['−0.05', -0.05], ['＋0.05', 0.05], ['＋0.5', 0.5]].forEach(function (p) {
      const b = el('button', 'btn small', p[0]); b.type = 'button';
      b.addEventListener('click', () => { if (game.done) return; sm.set(clamp(Math.round((sm.get() + p[1]) * 100) / 100, -5, 5)); onM(); });
      fine.append(b);
    });
    ctl.append(fine);
    const lab = el('label', 'check'); lab.style.marginTop = '6px';
    const zChk = document.createElement('input'); zChk.type = 'checkbox';
    lab.append(zChk, document.createTextNode('拡大して見る（点 P のまわりを ' + ZOOM + ' 倍）'));
    ctl.append(lab);
    zChk.addEventListener('change', () => plot.invalidate());
    const B = L.game.gameButtons(ctl, '✅ 決定');
    const conf = L.game.Confetti(root, plot);
    const st = { shots: [] };
    const S = () => TG_STAGES[game.k];
    const game = L.game.GameShell(root, { key: '4-1:game', stages: TG_STAGES,
      formula: () => '\\violet{m}=' + sm.get().toFixed(2),
      onStage() {
        const s = S();
        st.shots = []; sm.set(s.m > 0 && s.m < 1 ? 1.5 : 0); B.bMain.disabled = false; B.bNext.hidden = true;
        plot.setView({ xmin: s.view[0], xmax: s.view[1], ymin: s.view[2], ymax: s.view[3] });
        typeset(R(root, 'mission')); plot.invalidate();
      } });
    function onM() { game.formula(); plot.invalidate(); }
    sm.on(() => { if (!game.done) onM(); else sm.set(S().m.toFixed(2)); });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= game.max) return;
      const s = S(), v = sm.get();
      st.shots.push(v); game.used++; game.renderThrows();
      if (Math.abs(v - s.m) <= TOL + 1e-9) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= TG_STAGES.length - 1;
        game.result('🎯 接線！ ' + L.game.starStr(n) + '（' + game.used + ' 回目）　接線の傾きは約 ' + dec(s.m, 2), 'hit');
        conf.fire(plot.X(s.a), plot.Y(s.f(s.a)));
      } else {
        const big = v > s.m;
        let t = '傾きが' + (big ? '大きすぎます' : '小さすぎます') + '。点 P のすぐ' + (big ? '右' : '左') + 'で、直線が曲線より上に出ていないか見てみよう（接線なら点のまわりで曲線を横切らない）。';
        if (s.f === Math.sin) t = '傾きが' + (big ? '大きすぎます' : '小さすぎます') + '。点 P の近くで直線が曲線を横切っています。「拡大して見る」で確かめよう。';
        if (game.used >= game.max) { t += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(t, 'miss');
      }
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, TG_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, s = S(), a = s.a, fa = s.f(a), m = sm.get();
      const line = (mm, o) => g.line(g.xmin, fa + mm * (g.xmin - a), g.xmax, fa + mm * (g.xmax - a), o);
      g.grid({ step: 1, xlabel: 'x', ylabel: 'y' });
      D.curve(g, s.f, { n: 400 });
      g.tex(s.fn, s.lab[0], s.lab[1], { dx: s.lab[2] === 'right' ? -8 : s.lab[2] === 'left' ? 8 : 0, align: s.lab[2], size: 15, color: c.primary, avoid: true });
      st.shots.forEach((v) => line(v, { color: c.muted, width: 1.4, dash: [4, 5], alpha: 0.8 }));
      if (game.done) line(s.m, { color: c.teal, width: 3 });
      else line(m, { color: c.violet, width: 2.6 });
      g.dot(a, fa, { r: 7, color: game.done ? c.teal : c.text });
      g.tex('\\mathrm{P}', a, fa, { dx: -12, dy: -14, align: 'right', size: 15, avoid: true });
      if (zChk.checked) {
        const W = Math.min(g.w * 0.4, 190), H = W * 0.75;
        const box = [g.X(a) > g.w / 2 ? 10 : g.w - W - 10, g.Y(fa) > g.h / 2 ? 10 : g.h - H - 10, W, H];
        const hx = W * (g.xmax - g.xmin) / (2 * ZOOM * g.w), hy = H * (g.ymax - g.ymin) / (2 * ZOOM * g.h);
        const v = { xmin: a - hx, xmax: a + hx, ymin: fa - hy, ymax: fa + hy }, mm = game.done ? s.m : m;
        insetDraw(g, box, v, function (ctx, Xf, Yf) {
          ctx.lineCap = 'round';
          ctx.strokeStyle = game.done ? c.teal : c.violet; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(Xf(v.xmin), Yf(fa + mm * (v.xmin - a))); ctx.lineTo(Xf(v.xmax), Yf(fa + mm * (v.xmax - a))); ctx.stroke();
          ctx.strokeStyle = c.primary; ctx.lineWidth = 3; ctx.beginPath();
          for (let i = 0; i <= 120; i++) { const x = v.xmin + (v.xmax - v.xmin) * i / 120, px = Xf(x), py = Yf(s.f(x)); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
          ctx.stroke();
          ctx.fillStyle = game.done ? c.teal : c.text; ctx.beginPath(); ctx.arc(Xf(a), Yf(fa), 5, 0, 2 * Math.PI); ctx.fill();
        });
        g.texPx('\\times' + ZOOM, box[0] + 6, box[1] + 4, { align: 'left', valign: 'top', size: 13, color: c.violet });
      }
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     確認問題 3 のグラフ（折れ線）
     ========================================================== */
  function initQGraph() {
    const root = $id('w-qgraph');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.8, xmax: 6.9, ymin: -1.4, ymax: 11.6, ratio: [0.7, 0.5] });
    const P = [[0, 0], [2, 4], [4, 4], [6, 10]];
    plot.draw = function (g) {
      const c = g.c;
      g.grid({ stepX: 1, stepY: 2, xlabel: 't\\ (秒)', ylabel: 'x\\ (\\mathrm{m})' });
      g.poly(P, { color: c.primary, width: 3 });
      P.forEach((p) => g.dot(p[0], p[1], { r: 4.5, color: c.primary }));
      [[1, 2, 'A'], [3, 4, 'B'], [5, 7, 'C']].forEach((q) => g.tex('\\mathrm{' + q[2] + '}', q[0], q[1], { dx: -10, dy: -12, align: 'right', size: 15 }));
    };
    plot.invalidate();
  }

  D.boot([
    [initAvg, 'w-avg'],
    [initShrink, 'w-shrink'],
    [initDrop, 'w-drop'],
    [initMag, 'w-mag'],
    [initFinger, 'w-finger'],
    [initMario, 'w-mario'],
    [initGameTangent, 'w-game-tangent'],
    [initQGraph, 'w-qgraph'],
  ]);
})();
