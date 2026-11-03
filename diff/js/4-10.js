/* 第4章 4.10節 誤差逆伝播法 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   neuron(M)                … ニューロン1個 u=wx+b, y=σ(u), E=(y−t)² の前向き・後ろ向きの値
 *   drawGraph(g, M, o)       … 計算グラフ（箱と線）。青＝値、赤＝E への傾き、金＝装置の傾き
 *   lossAxes(g, hist, o)     … 学習の回数と誤差 E のグラフ
 *   netFwd / netGrad         … 1入力・2ニューロン・1出力の小さなネットワーク
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const sg = (u) => 1 / (1 + Math.exp(-u));
  const n3 = (v) => D.fmt(v, 3);
  const par = (v, d) => { const s = D.fmt(v, d == null ? 3 : d); return v < 0 ? '(' + s + ')' : s; };
  const FONT = '-apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif';

  /* ---------- ニューロン1個 ---------- */
  function neuron(M) {
    const wx = M.w * M.x, u = wx + M.b, y = sg(u), E = (y - M.t) * (y - M.t);
    const gy = 2 * (y - M.t), sp = y * (1 - y), gu = gy * sp;
    return { wx, u, y, E, gy, sp, gu, gw: gu * M.x, gb: gu };
  }
  const E_of = (M) => neuron(M).E;

  /* ---------- 計算グラフ ---------- */
  const graphH = (w) => (w < 560 ? 390 : clamp(w * 0.34, 220, 270));
  const NR = 16; // 丸の半径
  function layout(W, H) {
    const nar = W < 560, N = {};
    const C = (k, x, y) => (N[k] = { k, x, y, t: 'c' });
    const Bx = (k, x, y, hw) => (N[k] = { k, x, y, t: 'b', hw: hw || 23, hh: 17 });
    let ym = 0;
    if (!nar) {
      const yb = H * 0.64, yt = H * 0.24;
      C('X', W * 0.05, yb); C('W', W * 0.13, yt); Bx('MUL', W * 0.22, yb); C('B', W * 0.33, yt); Bx('ADD', W * 0.41, yb);
      Bx('SIG', W * 0.585, yb); C('T', W * 0.69, yt); Bx('SQ', W * 0.78, yb, 32); C('E', W * 0.95, yb);
    } else {
      const y1 = 118, yt1 = 42, y2 = 330, yt2 = 262;
      ym = 196;
      C('X', W * 0.09, y1); C('W', W * 0.28, yt1); Bx('MUL', W * 0.45, y1); C('B', W * 0.63, yt1); Bx('ADD', W * 0.8, y1);
      Bx('SIG', W * 0.2, y2); C('T', W * 0.43, yt2); Bx('SQ', W * 0.56, y2, 32); C('E', W * 0.92, y2);
    }
    const Rt = (n) => (n.t === 'c' ? n.x + NR : n.x + n.hw), Lt = (n) => (n.t === 'c' ? n.x - NR : n.x - n.hw);
    const diag = (a, b, fx) => {
      const tx = b.x + fx * b.hw, ty = b.y - b.hh, dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      return [[a.x + (dx / d) * NR, a.y + (dy / d) * NR], [tx, ty]];
    };
    const Wr = {
      x: [[Rt(N.X), N.X.y], [Lt(N.MUL), N.MUL.y]],
      w: diag(N.W, N.MUL, -0.35),
      wx: [[Rt(N.MUL), N.MUL.y], [Lt(N.ADD), N.ADD.y]],
      b: diag(N.B, N.ADD, -0.35),
      u: nar ? [[Rt(N.ADD), N.ADD.y], [W - 12, N.ADD.y], [W - 12, ym], [12, ym], [12, N.SIG.y], [Lt(N.SIG), N.SIG.y]]
        : [[Rt(N.ADD), N.ADD.y], [Lt(N.SIG), N.SIG.y]],
      y: [[Rt(N.SIG), N.SIG.y], [Lt(N.SQ), N.SQ.y]],
      t: diag(N.T, N.SQ, -0.35),
      E: [[Rt(N.SQ), N.SQ.y], [Lt(N.E), N.E.y]],
    };
    return { N, Wr, nar, seg: { u: nar ? 2 : 0 } };
  }
  function polyPx(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }
  function headPx(ctx, a, b, s) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.beginPath(); ctx.moveTo(b[0], b[1]);
    ctx.lineTo(b[0] - s * Math.cos(ang - 0.45), b[1] - s * Math.sin(ang - 0.45));
    ctx.lineTo(b[0] - s * Math.cos(ang + 0.45), b[1] - s * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
  }
  // 折れ線の「終点から」長さの割合 f の位置
  function backPoint(pts, f) {
    const segs = [];
    let tot = 0;
    for (let i = pts.length - 1; i > 0; i--) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i], pts[i - 1], l]); tot += l; }
    let d = f * tot;
    for (const s of segs) {
      if (d <= s[2]) { const k = s[2] ? d / s[2] : 0; return [s[0][0] + (s[1][0] - s[0][0]) * k, s[0][1] + (s[1][1] - s[0][1]) * k]; }
      d -= s[2];
    }
    return pts[0];
  }
  const BSEQ = [['E'], ['y'], ['u'], ['wx', 'b'], ['w']]; // 後ろ向きに傾きが届く順
  const BFULL = BSEQ.length;
  /* o: { bwd: 0〜5（null で後ろ向きなし）, local: 装置の傾き, red: {key: 文字} で赤の数を置きかえ, only: 表示する赤のキー } */
  function drawGraph(g, M, o) {
    o = o || {};
    const c = g.c, ctx = g.ctx, V = neuron(M), Lay = layout(g.w, g.h), N = Lay.N, Wr = Lay.Wr;
    const p = o.bwd == null ? -1 : o.bwd;
    const shown = (key) => { for (let i = 0; i < BSEQ.length; i++) if (BSEQ[i].indexOf(key) >= 0) return p >= i + 1 - 1e-9; return false; };
    // 線
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    Object.keys(Wr).forEach((k) => {
      const pts = Wr[k];
      ctx.strokeStyle = ctx.fillStyle = c.muted; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
      polyPx(ctx, pts); headPx(ctx, pts[pts.length - 2], pts[pts.length - 1], 9);
      if (p >= 0 && shown(k) && (!o.only || o.only.indexOf(k) >= 0)) {
        ctx.globalAlpha = 0.5; ctx.strokeStyle = c.accent; ctx.lineWidth = 4.5; polyPx(ctx, pts);
      }
    });
    ctx.restore();
    // 装置と丸
    const inner = { X: 'x', W: 'w', B: 'b', T: 't', E: 'E', MUL: '\\times w', ADD: '+\\,b', SIG: '\\sigma', SQ: '(\\,\\cdot\\,-t)^2' };
    Object.keys(N).forEach((k) => {
      const n = N[k];
      ctx.save();
      if (n.t === 'c') {
        const col = k === 'W' || k === 'B' ? c.violet : k === 'X' ? c.primary : k === 'T' ? c.pink : c.text;
        ctx.beginPath(); ctx.arc(n.x, n.y, NR, 0, Math.PI * 2);
        ctx.fillStyle = c.surface; ctx.fill();
        ctx.globalAlpha = 0.14; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
        ctx.lineWidth = k === 'W' || k === 'B' ? 3 : 2; ctx.strokeStyle = col; ctx.stroke();
      } else {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(n.x - n.hw, n.y - n.hh, 2 * n.hw, 2 * n.hh, 8); else ctx.rect(n.x - n.hw, n.y - n.hh, 2 * n.hw, 2 * n.hh);
        ctx.fillStyle = c.surface; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = c.text; ctx.globalAlpha = 0.75; ctx.stroke();
      }
      ctx.restore();
      g.texPx(inner[k], n.x, n.y, { align: 'center', size: k === 'SQ' ? 13 : 15, color: c.text });
    });
    // 値（青）と傾き（赤）
    const mid = (k) => { const s = Lay.seg[k] || 0, a = Wr[k][s], b = Wr[k][s + 1]; return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    const blue = (k, s) => { const m = mid(k); g.texPx(s, m[0], m[1] - 5, { align: 'center', valign: 'bottom', size: 13, color: c.primary }); };
    const redOf = (k, v) => (o.red && o.red[k] != null ? o.red[k] : n3(v));
    const red = (k, v) => {
      if (!(p >= 0 && shown(k)) && !(o.red && o.red[k] != null)) return;
      if (o.only && o.only.indexOf(k) < 0) return;
      const m = mid(k); g.texPx(redOf(k, v), m[0], m[1] + 6, { align: 'center', valign: 'top', size: 13, color: c.accent });
    };
    const side = (k, s, col, dy) => { const n = N[k]; g.texPx(s, n.x - NR - 6, n.y + (dy || 0), { align: 'right', size: 13, color: col }); };
    blue('x', 'x=' + n3(M.x));
    blue('wx', 'wx=' + n3(V.wx));
    blue('u', 'u=' + n3(V.u));
    blue('y', 'y=' + n3(V.y));
    blue('E', 'E=' + n3(V.E));
    side('W', 'w=' + n3(M.w), c.violet); side('B', 'b=' + n3(M.b), c.violet); side('T', 't=' + n3(M.t), c.pink);
    red('E', 1); red('y', V.gy); red('u', V.gu); red('wx', V.gu);
    ['w', 'b'].forEach((k) => {
      const on = (p >= 0 && shown(k) && (!o.only || o.only.indexOf(k) >= 0)) || (o.red && o.red[k] != null);
      if (on) side(k === 'w' ? 'W' : 'B', redOf(k, k === 'w' ? V.gw : V.gb), c.accent, 19);
    });
    // 装置の傾き（金）
    if (o.local) {
      const lab = (k, s) => { const n = N[k]; g.texPx(s, n.x, n.y + n.hh + 8, { align: 'center', valign: 'top', size: 12, color: c.amber }); };
      lab('SQ', '\\times' + par(V.gy)); lab('SIG', '\\times' + par(V.sp)); lab('ADD', '\\times1'); lab('MUL', '\\times' + par(M.x));
    }
    // 流れる赤い点
    if (p >= 0 && p < BFULL) {
      const i = Math.floor(p), f = p - i;
      BSEQ[i].forEach((k) => {
        const q = backPoint(Wr[k], f);
        ctx.save(); ctx.beginPath(); ctx.arc(q[0], q[1], 6.5, 0, Math.PI * 2); ctx.fillStyle = c.accent; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = c.bg; ctx.stroke(); ctx.restore();
      });
    }
    // 凡例
    ctx.save(); ctx.font = '700 12px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    let lx = g.w - 10;
    const items = [['値', c.primary]];
    if (p >= 0 || o.red) items.push(['E への傾き', c.accent]);
    if (o.local) items.push(['装置の傾き', c.amber]);
    items.reverse().forEach((it) => { ctx.fillStyle = it[1]; ctx.fillText('■ ' + it[0], lx, 8); lx -= ctx.measureText('■ ' + it[0]).width + 12; });
    ctx.restore();
    return V;
  }

  /* ---------- 誤差のグラフ ---------- */
  function nice(range) {
    const r = range / 5, p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  function view(g, v) { Object.assign(g.o, v); g._layout(); }
  function lossAxes(g, hist, o) {
    o = o || {};
    const c = g.c, n = Math.max(o.minN || 10, hist.length - 1);
    let ym = o.ymax || 0;
    if (!o.ymax) hist.forEach((v) => { if (isFinite(v) && v < 1e3) ym = Math.max(ym, v); });
    ym = Math.max(ym, o.floor || 0.01) * 1.15;
    view(g, { xmin: -n * (g.w < 520 ? 0.14 : 0.08), xmax: n * (g.w < 520 ? 1.08 : 1.04), ymin: -ym * 0.12, ymax: ym });
    g.grid({ stepX: nice(n), stepY: nice(ym), xlabel: '回数', ylabel: '' });
    if (o.goal != null) {
      g.line(g.xmin, o.goal, g.xmax, o.goal, { color: c.teal, width: 2, dash: [6, 5] });
      g.tex('\\text{目標 }E=' + o.goal, g.xmax, o.goal, { color: c.teal, size: 13, align: 'right', valign: 'bottom', dx: -8, dy: -27 });
    }
    const pts = [];
    hist.forEach((v, i) => { if (isFinite(v)) pts.push([i, Math.min(v, g.ymax * 2)]); });
    if (pts.length > 1) g.poly(pts, { color: c.primary, width: 2.5 });
    if (pts.length && pts.length < 60) pts.forEach((q) => g.dot(q[0], q[1], { r: 3.5, color: c.primary }));
    else if (pts.length) { const q = pts[pts.length - 1]; g.dot(q[0], q[1], { r: 5, color: c.primary }); }
  }

  /* ==========================================================
     4.10(3) 前向きの計算
     ========================================================== */
  function neuronSliders(ctl, M, onCh) {
    const S = {};
    S.x = slider(ctl, { tex: '\\blue{x}', min: -3, max: 3, step: 0.1, value: M.x, color: 'primary', aria: '入力 x' });
    S.w = slider(ctl, { tex: '\\violet{w}', min: -3, max: 3, step: 0.1, value: M.w, color: 'violet', aria: '重み w' });
    S.b = slider(ctl, { tex: '\\violet{b}', min: -3, max: 3, step: 0.1, value: M.b, color: 'violet', aria: 'バイアス b' });
    S.t = slider(ctl, { tex: 't', min: 0, max: 1, step: 0.05, value: M.t, color: 'pink', aria: '正解 t' });
    ['x', 'w', 'b', 't'].forEach((k) => S[k].on((v) => { M[k] = v; onCh(k); }));
    return S;
  }
  function initFwd() {
    const root = $id('w-fwd');
    const M = { x: 1.5, w: 0.8, b: -0.5, t: 0.2 };
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, height: graphH });
    neuronSliders(root.querySelector('.controls'), M, update);
    function update() {
      const V = neuron(M);
      tex(root, 'u', '\\begin{aligned}u&=wx+b\\\\&=' + n3(M.w) + '\\times' + par(M.x) + (M.b < 0 ? '' : '+') + n3(M.b) + '=\\blue{' + n3(V.u) + '}\\end{aligned}');
      tex(root, 'y', 'y=\\sigma(u)=\\dfrac{1}{1+e^{' + (V.u >= 0 ? '-' + n3(V.u) : n3(-V.u)) + '}}\\approx\\blue{' + n3(V.y) + '}');
      tex(root, 'E', '\\begin{aligned}E&=(y-t)^2\\\\&=(' + n3(V.y) + '-' + n3(M.t) + ')^2\\approx\\blue{' + D.fmt(V.E, 4) + '}\\end{aligned}');
      R(root, 'how').textContent = V.E < 0.001 ? 'ほぼ正解です！ y が t とほとんど同じになりました。'
        : V.y > M.t ? 'AI の答え y が正解 t より大きすぎます。y を小さくするには、u を小さく（w や b を調整）すればよさそうです。'
          : 'AI の答え y が正解 t より小さすぎます。u を大きくすると y も大きくなります。';
      plot.invalidate();
    }
    plot.draw = (g) => drawGraph(g, M, {});
    update();
  }

  /* ==========================================================
     4.10(4) 後ろ向きの計算
     ========================================================== */
  function initBwd() {
    const root = $id('w-bwd');
    const M = { x: 1.5, w: 0.8, b: -0.5, t: 0.2 };
    const st = { p: BFULL, playing: false, chk: false };
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, height: graphH });
    neuronSliders(root.querySelector('.controls'), M, update);
    const loc = R(root, 'local');
    loc.addEventListener('change', () => plot.invalidate());
    const anim = L.animate(root, function (dt) {
      if (!st.playing) return false;
      st.p = Math.min(BFULL, st.p + dt * 0.9);
      if (st.p >= BFULL) st.playing = false;
      plot.invalidate();
      return st.playing;
    });
    R(root, 'play').addEventListener('click', () => {
      if (L.reduceMotion) { st.p = BFULL; plot.invalidate(); return; }
      st.p = 0; st.playing = true; anim.kick();
    });
    R(root, 'nudge').addEventListener('click', () => { st.chk = true; update(); });
    function update() {
      const V = neuron(M);
      tex(root, 'gw', '\\begin{aligned}\\red{\\tfrac{\\partial E}{\\partial w}}&=2(y-t)\\cdot y(1-y)\\cdot x\\\\&=' + par(V.gy) + '\\times' + n3(V.sp) + '\\times' + par(M.x) + '=\\red{' + D.fmt(V.gw, 4) + '}\\end{aligned}');
      tex(root, 'gb', '\\begin{aligned}\\red{\\tfrac{\\partial E}{\\partial b}}&=2(y-t)\\cdot y(1-y)\\cdot 1\\\\&=' + par(V.gy) + '\\times' + n3(V.sp) + '\\times1=\\red{' + D.fmt(V.gb, 4) + '}\\end{aligned}');
      if (st.chk) {
        const E0 = V.E, E1 = E_of({ x: M.x, w: M.w + 0.001, b: M.b, t: M.t }), dE = E1 - E0;
        tex(root, 'check', '\\begin{aligned}&\\dfrac{E(w+0.001)-E(w)}{0.001}\\\\&=\\dfrac{' + D.fmt(dE, 7) + '}{0.001}=' + D.fmt(dE / 0.001, 4) + '\\\\&\\fallingdotseq\\red{' + D.fmt(V.gw, 4) + '}\\ \\text{（一致！）}\\end{aligned}');
      } else R(root, 'check').innerHTML = '<span class="note-txt">上の「$w$ を $0.001$ 動かしてみる」を押そう</span>', typeset(R(root, 'check'));
      const s = V.gw;
      R(root, 'how').textContent = Math.abs(s) < 0.002 ? '傾きはほぼ 0。ここが谷底の近くで、w を動かしても E はほとんど変わりません。'
        : s < 0 ? '∂E/∂w がマイナス：w を少し増やすと E が減ります（坂を下る向きは w を増やす向き）。'
          : '∂E/∂w がプラス：w を少し減らすと E が減ります（坂を下る向きは w を減らす向き）。';
      plot.invalidate();
    }
    plot.draw = (g) => drawGraph(g, M, { bwd: st.p, local: loc.checked });
    update();
  }

  /* ==========================================================
     4.10(5) 1個のニューロンを学習させる
     ========================================================== */
  function initTrain() {
    const root = $id('w-train');
    const M0 = { x: 1.5, w: 0.8, b: -0.5, t: 0.2 };
    const st = { M: Object.assign({}, M0), eta: 1, hist: [], n: 0, last: null, playing: false, acc: 0 };
    const cvs = root.querySelectorAll('canvas');
    const top = new Plot(cvs[0], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, height: graphH });
    const bot = new Plot(cvs[1], { xmin: 0, xmax: 10, ymin: 0, ymax: 0.25, height: (w) => clamp(w * 0.32, 170, 230) });
    const ctl = root.querySelector('.controls');
    const se = slider(ctl, { tex: '\\eta', min: 0.1, max: 10, step: 0.1, value: 1, color: 'teal', aria: '学習率 η' });
    const stt = slider(ctl, { tex: 't', min: 0, max: 1, step: 0.05, value: M0.t, color: 'pink', aria: '正解 t' });
    se.on((v) => { st.eta = v; update(); });
    stt.on((v) => { M0.t = v; reset(); });
    function reset() { st.M = Object.assign({}, M0); st.hist = [E_of(st.M)]; st.n = 0; st.last = null; stop(); update(); }
    function step() {
      if (st.n >= 300) return;
      const V = neuron(st.M), w0 = st.M.w, b0 = st.M.b;
      st.M.w = w0 - st.eta * V.gw; st.M.b = b0 - st.eta * V.gb;
      st.n++; st.hist.push(E_of(st.M));
      st.last = { w0, b0, gw: V.gw, gb: V.gb, eta: st.eta };
    }
    const bPlay = R(root, 'play');
    function stop() { st.playing = false; bPlay.textContent = '▶ 自動'; }
    const anim = L.animate(root, function (dt) {
      if (!st.playing) return false;
      const now = performance.now();
      if (now - st.acc > 220) { st.acc = now; step(); update(); if (st.n >= 300 || st.hist[st.hist.length - 1] < 1e-7) stop(); }
      return st.playing;
    });
    R(root, 'step').addEventListener('click', () => { stop(); step(); update(); });
    bPlay.addEventListener('click', () => {
      if (st.playing) { stop(); return; }
      st.playing = true; st.acc = 0; bPlay.textContent = '■ 止める'; anim.kick();
    });
    R(root, 'reset').addEventListener('click', reset);
    function update() {
      const V = neuron(st.M), l = st.last;
      R(root, 'n').textContent = st.n + ' 回';
      if (l) {
        tex(root, 'uw', 'w\\leftarrow ' + n3(l.w0) + '-' + num(l.eta, 1) + '\\times' + par(l.gw) + '=' + n3(st.M.w));
        tex(root, 'ub', 'b\\leftarrow ' + n3(l.b0) + '-' + num(l.eta, 1) + '\\times' + par(l.gb) + '=' + n3(st.M.b));
      } else {
        tex(root, 'uw', 'w\\leftarrow w-\\eta\\,\\red{\\tfrac{\\partial E}{\\partial w}}=' + n3(st.M.w) + '-' + num(st.eta, 1) + '\\times' + par(V.gw));
        tex(root, 'ub', 'b\\leftarrow b-\\eta\\,\\red{\\tfrac{\\partial E}{\\partial b}}=' + n3(st.M.b) + '-' + num(st.eta, 1) + '\\times' + par(V.gb));
      }
      tex(root, 'E', '\\begin{aligned}&E=' + D.fmt(V.E, 5) + '\\\\&(y=' + n3(V.y) + ',\\ t=' + n3(st.M.t) + ')\\end{aligned}');
      const E0 = st.hist[0];
      R(root, 'how').textContent = st.n === 0 ? '「1回学習」で、前向き→後ろ向き→更新 を1回行います。'
        : V.E < 1e-5 ? '誤差がほぼ 0 になりました。学習完了です！'
          : V.E > E0 * 0.98 && st.n > 5 ? 'なかなか減りません。η が小さすぎるか、大きすぎてシグモイドがはりついている（傾きがほぼ 0）かもしれません。'
            : '誤差は最初の ' + num(V.E / E0 * 100, 1) + '% になりました。';
      top.invalidate(); bot.invalidate();
    }
    top.draw = (g) => drawGraph(g, st.M, { bwd: BFULL });
    bot.draw = (g) => lossAxes(g, st.hist, { minN: 20 });
    reset();
  }

  /* ==========================================================
     4.10(6) 小さなニューラルネットワーク
     ========================================================== */
  function netFwd(P, x) { const h1 = sg(P[0] * x + P[1]), h2 = sg(P[2] * x + P[3]); return { h1, h2, y: P[4] * h1 + P[5] * h2 + P[6] }; }
  function netGrad(P, data) {
    const G = [0, 0, 0, 0, 0, 0, 0], N = data.length;
    let E = 0;
    data.forEach((d) => {
      const x = d[0], t = d[1], f = netFwd(P, x), gy = (2 * (f.y - t)) / N;
      E += ((f.y - t) * (f.y - t)) / N;
      G[4] += gy * f.h1; G[5] += gy * f.h2; G[6] += gy;
      const g1 = gy * P[4] * f.h1 * (1 - f.h1), g2 = gy * P[5] * f.h2 * (1 - f.h2);
      G[0] += g1 * x; G[1] += g1; G[2] += g2 * x; G[3] += g2;
    });
    return { E, G };
  }
  function netLoss(P, data) { return netGrad(P, data).E; }
  const NET_INIT = [2, 1, -2, 1, 0.5, 0.5, 0];
  const pts = (xs, f) => xs.map((x) => [x, Math.round(f(x) * 100) / 100]);
  const NET_DATA = [
    { label: '山（こぶ）', d: pts([-3, -2, -1.2, -0.6, 0, 0.6, 1.2, 2, 3], (x) => Math.exp(-x * x)) },
    { label: '段', d: pts([-3, -2, -1, -0.4, 0.4, 1, 2, 3], (x) => (x < 0 ? 0 : 1)) },
    { label: '谷', d: pts([-3, -2, -1.2, -0.6, 0, 0.6, 1.2, 2, 3], (x) => 1 - Math.exp(-x * x)) },
  ];
  const PNAME = ['w_1', 'b_1', 'w_2', 'b_2', 'v_1', 'v_2', 'c'];
  const PCHAIN = ['2(y-t)\\cdot v_1\\cdot h_1(1-h_1)\\cdot x', '2(y-t)\\cdot v_1\\cdot h_1(1-h_1)', '2(y-t)\\cdot v_2\\cdot h_2(1-h_2)\\cdot x', '2(y-t)\\cdot v_2\\cdot h_2(1-h_2)',
    '2(y-t)\\cdot h_1', '2(y-t)\\cdot h_2', '2(y-t)\\cdot 1'];
  function drawNetData(g, P, data, o) {
    o = o || {};
    const c = g.c;
    g.grid({ step: 1, stepY: 0.5, xlabel: 'x', ylabel: '' });
    if (o.parts) {
      D.curve(g, (x) => P[4] * netFwd(P, x).h1, { color: c.violet, width: 2, dash: [6, 5] });
      D.curve(g, (x) => P[5] * netFwd(P, x).h2, { color: c.pink, width: 2, dash: [6, 5] });
    }
    D.curve(g, (x) => netFwd(P, x).y, { color: c.primary, width: 3.5 });
    data.forEach((d) => g.dot(d[0], d[1], { r: 5.5, color: c.text }));
    if (o.parts) {
      g.tex('v_1h_1', g.xmin, g.ymax, { color: c.violet, size: 14, align: 'left', valign: 'top', dx: 34, dy: 6 });
      g.tex('v_2h_2', g.xmin, g.ymax, { color: c.pink, size: 14, align: 'left', valign: 'top', dx: 90, dy: 6 });
    }
    g.tex('\\text{曲線 }y', g.xmax, g.ymax, { color: c.primary, size: 14, align: 'right', valign: 'top', dx: -10, dy: 6 });
  }
  function initNet() {
    const root = $id('w-net');
    const st = { di: 0, P: NET_INIT.slice(), eta: 0.3, hist: [], n: 0, playing: false, div: false };
    const cvs = root.querySelectorAll('canvas');
    const pData = new Plot(cvs[0], { xmin: -3.5, xmax: 3.5, ymin: -0.35, ymax: 1.4, height: (w) => clamp(w * 0.62, 200, 300) });
    const pNet = new Plot(cvs[1], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, height: (w) => clamp(w * 0.62, 200, 300) });
    const pLoss = new Plot(cvs[2], { xmin: 0, xmax: 10, ymin: 0, ymax: 0.1, height: (w) => clamp(w * 0.26, 150, 210) });
    const ctl = root.querySelector('.controls');
    const se = slider(ctl, { tex: '\\eta', min: 0.05, max: 1, step: 0.05, value: st.eta, color: 'teal', aria: '学習率 η' });
    se.on((v) => { st.eta = v; update(); });
    const parts = R(root, 'parts');
    parts.addEventListener('change', () => pData.invalidate());
    const data = () => NET_DATA[st.di].d;
    // 表
    const tb = R(root, 'tbody'), cells = [];
    PNAME.forEach((nm, i) => {
      const tr = el('tr');
      tr.innerHTML = '<th class="tex"></th><td class="d410-v"></td><td class="d410-g"></td><td class="tex d410-ch"></td>';
      setTex(tr.children[0], nm); setTex(tr.children[3], '\\red{\\tfrac{\\partial E}{\\partial ' + nm + '}}\\ \\text{は}\\ ' + PCHAIN[i]);
      tb.append(tr); cells.push([tr.children[1], tr.children[2]]);
    });
    const chips = R(root, 'data');
    NET_DATA.forEach((it, i) => {
      const b = el('button', 'chip', it.label); b.type = 'button'; b.setAttribute('aria-pressed', String(i === 0));
      b.addEventListener('click', () => { st.di = i; chips.querySelectorAll('.chip').forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); reset(); });
      chips.append(b);
    });
    const bPlay = R(root, 'play');
    function stop() { st.playing = false; bPlay.textContent = '▶ 学習'; }
    function reset() { st.P = NET_INIT.slice(); st.hist = [netLoss(st.P, data())]; st.n = 0; st.div = false; stop(); update(); }
    function step() {
      if (st.div) return;
      const r = netGrad(st.P, data());
      for (let i = 0; i < 7; i++) st.P[i] -= st.eta * r.G[i];
      st.n++;
      const E = netLoss(st.P, data());
      st.hist.push(E);
      if (!isFinite(E) || E > 50 || st.P.some((v) => !isFinite(v) || Math.abs(v) > 1e4)) { st.div = true; stop(); }
    }
    const anim = L.animate(root, function () {
      if (!st.playing) return false;
      for (let k = 0; k < 3; k++) step();
      if (st.n >= 3000) stop();
      update();
      return st.playing;
    });
    bPlay.addEventListener('click', () => {
      if (st.playing) { stop(); return; }
      if (st.div || st.n >= 3000) reset();
      st.playing = true; bPlay.textContent = '■ 止める'; anim.kick();
    });
    R(root, 'step').addEventListener('click', () => { stop(); step(); update(); });
    R(root, 'reset').addEventListener('click', reset);
    function update() {
      const r = netGrad(st.P, data());
      R(root, 'n').textContent = st.n + ' 回';
      tex(root, 'E', st.div ? '\\text{発散しました}' : 'E=\\dfrac1N\\sum(y_k-t_k)^2=' + D.fmt(r.E, 5));
      R(root, 'how').textContent = st.div ? 'η が大きすぎて、つまみが行き過ぎをくり返し、誤差がどんどん大きくなりました。η を小さくして「最初に戻す」。'
        : st.n === 0 ? '▶ で学習を始めます（1回ごとに、前向き→後ろ向き→更新）。'
          : r.E < 0.002 ? 'ほぼぴったり合いました！ 2つのニューロンの階段の組み合わせで、点の形を作っています。'
            : '学習中…誤差は最初の ' + num((r.E / st.hist[0]) * 100, 1) + '% です。';
      cells.forEach((cl, i) => {
        cl[0].textContent = st.div ? '—' : L.minus(D.fmt(st.P[i], 3));
        cl[1].textContent = st.div ? '—' : L.minus(D.fmt(r.G[i], 4));
      });
      pData.invalidate(); pNet.invalidate(); pLoss.invalidate();
    }
    pData.draw = (g) => drawNetData(g, st.P, data(), { parts: parts.checked });
    pNet.draw = function (g) {
      const c = g.c, ctx = g.ctx, W = g.w, H = g.h, P = st.P;
      const nd = { x: [W * 0.12, H * 0.55], h1: [W * 0.5, H * 0.3], h2: [W * 0.5, H * 0.8], y: [W * 0.86, H * 0.55] };
      const edge = (a, b, v, nm, above) => {
        const A = nd[a], B = nd[b];
        ctx.save(); ctx.lineCap = 'round';
        ctx.strokeStyle = v >= 0 ? c.primary : c.accent; ctx.globalAlpha = 0.6; ctx.lineWidth = clamp(1 + Math.abs(v) * 1.2, 1, 7);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore();
        g.texPx(nm + '=' + (isFinite(v) ? D.fmt(v, 2) : '?'), (A[0] + B[0]) / 2, (A[1] + B[1]) / 2 + (above ? -6 : 6), { align: 'center', valign: above ? 'bottom' : 'top', size: 13, color: c.violet });
      };
      edge('x', 'h1', P[0], 'w_1', true); edge('x', 'h2', P[2], 'w_2', false);
      edge('h1', 'y', P[4], 'v_1', true); edge('h2', 'y', P[5], 'v_2', false);
      const node = (k, lab, col) => {
        const A = nd[k];
        ctx.save(); ctx.beginPath(); ctx.arc(A[0], A[1], 19, 0, Math.PI * 2); ctx.fillStyle = c.surface; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
        g.texPx(lab, A[0], A[1], { align: 'center', size: 15, color: c.text });
      };
      node('x', 'x', c.primary); node('h1', 'h_1', c.violet); node('h2', 'h_2', c.pink); node('y', 'y', c.primary);
      const fb = (v) => (isFinite(v) ? D.fmt(v, 2) : '?');
      g.texPx('b_1=' + fb(P[1]), nd.h1[0], nd.h1[1] - 24, { align: 'center', valign: 'bottom', size: 13, color: c.violet });
      g.texPx('b_2=' + fb(P[3]), nd.h2[0], nd.h2[1] + 24, { align: 'center', valign: 'top', size: 13, color: c.violet });
      g.texPx('c=' + fb(P[6]), nd.y[0], nd.y[1] + 24, { align: 'center', valign: 'top', size: 13, color: c.violet });
    };
    pLoss.draw = (g) => lossAxes(g, st.hist, { minN: 50 });
    reset();
  }

  /* ==========================================================
     4.10(7) なぜ「逆」伝播なのか
     ========================================================== */
  const JNUM = { 1: '10', 2: '100', 3: '1000', 4: '1万', 5: '10万', 6: '100万', 7: '1000万', 8: '1億', 9: '10億', 10: '100億', 11: '1000億', 12: '1兆' };
  function jaBig(v) {
    const sig = (x) => num(x, x >= 100 ? 0 : x >= 10 ? 1 : 2);
    if (v < 1e4) return Math.round(v).toLocaleString('ja-JP');
    if (v < 1e8) return sig(v / 1e4) + '万';
    if (v < 1e12) return sig(v / 1e8) + '億';
    return sig(v / 1e12) + '兆';
  }
  function human(sec) {
    const f = (v) => (v >= 100 ? Math.round(v).toLocaleString('ja-JP').replace(/,/g, '{,}') : num(v, v >= 10 ? 1 : 2));
    if (sec < 60) return f(sec) + '\\text{ 秒}';
    if (sec < 3600) return f(sec / 60) + '\\text{ 分}';
    if (sec < 86400) return f(sec / 3600) + '\\text{ 時間}';
    if (sec < 86400 * 365) return f(sec / 86400) + '\\text{ 日}';
    return f(sec / 86400 / 365) + '\\text{ 年}';
  }
  function initWhy() {
    const root = $id('w-why');
    const st = { k: 6, depth: 10 };
    const cvs = root.querySelectorAll('canvas');
    const pT = new Plot(cvs[0], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, height: (w) => clamp(w * 0.26, 150, 190) });
    const pV = new Plot(cvs[1], { xmin: 0, xmax: 21, ymin: -13, ymax: 0.8, height: (w) => clamp(w * 0.42, 200, 280) });
    const ctl = root.querySelector('.controls');
    const sn = slider(ctl, { tex: 'n', min: 1, max: 12, step: 1, value: st.k, color: 'violet', aria: 'つまみの数（10 の何乗か）', fmt: (v) => JNUM[v] });
    const sd = slider(ctl, { tex: '\\text{層}', min: 1, max: 20, step: 1, value: st.depth, color: 'amber', aria: '層の数' });
    sn.on((v) => { st.k = v; update(); });
    sd.on((v) => { st.depth = v; update(); });
    const tNum = () => (Math.pow(10, st.k) + 1) * 0.01, tBp = 0.03;
    function update() {
      tex(root, 'num', '(n+1)\\text{ 回}\\times0.01\\text{ 秒}\\approx' + human(tNum()));
      tex(root, 'bp', '(1+2)\\text{ 回分}\\times0.01\\text{ 秒}=' + human(tBp));
      tex(root, 'van', '\\left(\\tfrac14\\right)^{' + st.depth + '}\\approx' + (Math.pow(0.25, st.depth) >= 0.001 ? D.fmt(Math.pow(0.25, st.depth), 4) : Math.pow(0.25, st.depth).toExponential(1).replace(/e-(\d+)/, '\\times10^{-$1}')));
      R(root, 'how').textContent = 'つまみ ' + JNUM[st.k] + ' 個なら、数値微分は誤差逆伝播法の約 ' + jaBig(tNum() / tBp) + ' 倍の時間がかかります。学習ではこれを何万回もくり返すので、数値微分ではとても間に合いません。';
      pT.invalidate(); pV.invalidate();
    }
    pT.draw = function (g) {
      const c = g.c, ctx = g.ctx, W = g.w, H = g.h;
      // 対数の目もり：0.01 秒 〜 1000 年
      const lo = -2, hi = Math.log10(1000 * 365 * 86400), x0 = 74, x1 = W - 14;
      const X = (s) => x0 + ((Math.log10(s) - lo) / (hi - lo)) * (x1 - x0);
      const ticks = [[0.01, '0.01秒'], [1, '1秒'], [60, '1分'], [3600, '1時間'], [86400, '1日'], [86400 * 365, '1年'], [86400 * 365 * 100, '100年']];
      ctx.save(); ctx.font = '11px ' + FONT; ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ticks.forEach((t, i) => {
        const px = X(t[0]); ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(px, 12); ctx.lineTo(px, H - 24); ctx.stroke();
        if (W > 480 || i % 2 === 0 || i === ticks.length - 1) ctx.fillText(t[1], px, H - 20);
      });
      const bar = (y, s, col, lab) => {
        ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(x0, y - 11, Math.max(3, X(s) - x0), 22); ctx.globalAlpha = 1;
        ctx.fillStyle = c.text; ctx.font = '700 12px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(lab, x0 - 6, y);
      };
      const yA = H * 0.3, yB = H * 0.62;
      bar(yA, tNum(), c.violet, '数値微分'); bar(yB, tBp, c.accent, '逆伝播');
      ctx.restore();
      const ta = X(tNum());
      g.texPx(human(tNum()), ta > W - 110 ? ta - 6 : ta + 6, yA, { align: ta > W - 110 ? 'right' : 'left', size: 13, color: ta > W - 110 ? '#fff' : c.text });
      g.texPx(human(tBp), X(tBp) + 8, yB, { align: 'left', size: 13, color: c.text });
    };
    pV.draw = function (g) {
      const c = g.c, k = st.depth;
      view(g, { xmin: 0.2 - (k + 0.6) * 0.12, xmax: k + 0.8, ymin: -14.6, ymax: 2.6 });
      g.grid({ stepX: k > 10 ? 2 : 1, stepY: 2, labels: false, axes: false });
      for (let j = 0; j >= -12; j -= 2) g.texPx('10^{' + j + '}', 4, g.Y(j), { align: 'left', size: 11, color: c.muted });
      g.line(g.xmin, 0, g.xmax, 0, { color: c.teal, width: 2.5 });
      g.texPx('\\text{ReLU（傾き 1 のまま）}', 36, g.Y(0) - 4, { color: c.teal, size: 13, align: 'left', valign: 'bottom' });
      // 出口（右）から入口（左）へ：入口に近い層ほど (1/4) を多くかける
      const bw = 0.6;
      for (let i = 1; i <= k; i++) {
        const v = (k - i + 1) * Math.log10(0.25), px0 = g.X(i - bw / 2), px1 = g.X(i + bw / 2);
        const ctx = g.ctx; ctx.save(); ctx.fillStyle = c.amber; ctx.globalAlpha = 0.85;
        const yt = g.Y(Math.max(v, -14.6)), yb = g.Y(-14.6);
        ctx.fillRect(px0, yt, px1 - px0, yb - yt);
        ctx.restore();
        if (k <= 12 || i % 2 === 1) g.texPx(String(i), g.X(i), g.h - 4, { align: 'center', valign: 'bottom', size: 11, color: c.muted });
      }
    };
    update();
  }

  /* ==========================================================
     4.10(8) チャレンジ：AI を育てろ
     ========================================================== */
  const KANA = ['ア', 'イ', 'ウ', 'エ'];
  const ETA_M = { x: 1.5, w: 0.8, b: -0.5, t: 0.2 };
  const GS = [
    { name: '手で計算', type: 'num', M: { x: 2, w: 0.5, b: -1, t: 1 }, ans: -0.5,
      text: '$x=2,\\ w=0.5,\\ b=-1,\\ t=1$ のとき、$\\red{\\dfrac{\\partial E}{\\partial w}}$ はいくつ？',
      hint: '前向き：$u=wx+b$、$y=\\sigma(u)$（$\\sigma(0)=\\frac12$）。後ろ向き：$2(y-t)$、$y(1-y)$、$x$ の3つをかけます。',
      answer: '<b>$-0.5$</b>　前向き：$u=0.5\\times2+(-1)=0$、$y=\\sigma(0)=0.5$、$E=(0.5-1)^2=0.25$。<br>後ろ向き：$\\frac{dE}{dy}=2(0.5-1)=-1$、$\\frac{dy}{du}=0.5\\times0.5=0.25$、$\\frac{\\partial u}{\\partial w}=x=2$。<br>$\\frac{\\partial E}{\\partial w}=(-1)\\times0.25\\times2$<br>$\\quad=-0.5$。マイナスなので、$w$ を増やすと誤差が減る。' },
    { name: 'かけ算を選ぶ', type: 'choice', M: { x: 1.5, w: 0.8, b: -0.5, t: 0.2 }, ok: 1,
      opts: ['2(y-t)\\cdot y(1-y)\\cdot x', '2(y-t)\\cdot y(1-y)\\cdot 1', '2(y-t)+y(1-y)+1', '(y-t)^2\\cdot y(1-y)'],
      text: 'バイアス $b$ の傾き $\\red{\\dfrac{\\partial E}{\\partial b}}$ を表すかけ算はどれ？',
      hint: '$b$ から $E$ までの道は $b\\to u\\to y\\to E$。通る装置の傾きを全部かけます。$u=wx+b$ を $b$ だけ動かしたときの傾きは？',
      answer: '<b>（イ）</b>　道 $b\\to u\\to y\\to E$ の傾きをかける：<br>$\\frac{\\partial E}{\\partial b}=\\frac{dE}{dy}\\cdot\\frac{dy}{du}\\cdot\\frac{\\partial u}{\\partial b}$<br>$\\quad=2(y-t)\\cdot y(1-y)\\cdot1$。<br>$u=wx+b$ を $b$ だけ動かすと、$u$ も同じだけ動くので傾きは $1$。（ア）は $w$ の傾き、（ウ）は連鎖律なのに足している、（エ）は $E$ を微分していない。' },
    { name: '学習率', type: 'eta', M: ETA_M, steps: 5, goal: 0.001,
      text: '5回の学習で、誤差を $E\\lt0.001$ にしよう。学習率 $\\eta$ はいくつにする？',
      hint: '最初の誤差は約 $0.22$。$\\eta$ が小さいと5回では足りません。大きすぎると行き過ぎて、シグモイドが $0$ にはりつき、傾きが $0$ に近くなって動けなくなります。',
      answer: '<b>だいたい $1.5\\leqq\\eta\\leqq5$</b>　（例えば $\\eta=3$ で5回後 $E\\approx0.00000$）。<br>$\\eta=1$ では5回後 $E\\approx0.004$ と、まだ足りない。$\\eta=8$ では1回目で $w,\\ b$ が下がりすぎて $y\\approx0$ になり、$y(1-y)\\approx0$ のため傾きがほとんど $0$ になって進まない（$E\\approx0.035$）。<br>勾配降下法の歩はばは「小さすぎず、大きすぎず」が大切。' },
    { name: '符号を読む', type: 'sign', M: { x: -1.5, w: 0.4, b: 0.2, t: 0.1 }, ok: 1, opts: ['プラス', 'マイナス', '0'],
      text: 'この計算グラフで、$\\red{\\dfrac{\\partial E}{\\partial w}}$ の符号は？（計算しなくても、符号だけなら読めます）',
      hint: '$\\dfrac{\\partial E}{\\partial w}=2(y-t)\\cdot y(1-y)\\cdot x$。3つの数の符号を1つずつ見ましょう。$y(1-y)$ はいつもプラス（$0\\lt y\\lt1$）です。',
      answer: '<b>マイナス</b>　$y\\approx0.401\\gt t=0.1$ なので $2(y-t)\\gt0$。$y(1-y)\\gt0$。$x=-1.5\\lt0$。<br>（プラス）×（プラス）×（マイナス）＝ マイナス。実際 $\\frac{\\partial E}{\\partial w}$ は<br>$0.602\\times0.240\\times(-1.5)$<br>$\\approx-0.217$。<br>つまり $w$ を増やすと誤差が減る：$x$ がマイナスなので、$w$ を増やすと $u=wx+b$ が小さくなり、$y$ が正解 $0.1$ に近づく。' },
    { name: 'AI を育てろ', type: 'net', steps: 200, goal: 0.003,
      text: '小さなネットワークを 200 回学習させて、山の形の点に合わせよう（$E\\lt0.003$）。学習率 $\\eta$ は？',
      hint: '(6) の図で、$\\eta$ を変えて試せます。小さすぎると 200 回では足りず、大きすぎると誤差がはね上がります。',
      answer: '<b>だいたい $0.35\\leqq\\eta\\leqq0.55$</b>（$0.65,\\ 0.7$ でも成功）。<br>$\\eta=0.1$ では 200 回後 $E\\approx0.017$ でまだ遠い。$\\eta=0.6$ や $0.8$ 以上では、つまみが行き過ぎて誤差がはね上がり、なかなか戻らない。<br>本物の AI でも、学習率えらびはとても大切な仕事です。' },
  ];
  function initGame() {
    const root = $id('w-game');
    const isGraph = (S) => S.type === 'num' || S.type === 'choice' || S.type === 'sign';
    let game = null;
    const S = () => GS[game ? game.k : 0];
    const st = { sel: -1, eta: 1, hist: [], M: null, P: null, run: false, acc: 0, n: 0, reveal: -1 };
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1,
      height: (w) => (isGraph(S()) ? graphH(w) : clamp(w * 0.5, 210, 320)) });
    const conf = L.game.Confetti(root, plot);
    const gctl = R(root, 'gctl');
    const B = L.game.gameButtons(root.querySelector('.controls'), '✅ 判定');
    let inp = null, chipsBtns = [], se = null;
    const bwdAnim = L.animate(root, function (dt) {
      if (st.reveal < 0 || st.reveal >= BFULL) return false;
      st.reveal = Math.min(BFULL, st.reveal + dt * 1.2); plot.invalidate(); return st.reveal < BFULL;
    });
    function reveal() { st.reveal = L.reduceMotion ? BFULL : 0; bwdAnim.kick(); plot.invalidate(); }
    function build(s) {
      gctl.innerHTML = ''; inp = null; chipsBtns = []; se = null;
      if (s.type === 'num') {
        const lab = el('label', 'd410-ans');
        lab.innerHTML = '<span class="tex"></span>';
        setTex(lab.firstChild, '\\dfrac{\\partial E}{\\partial w}=');
        inp = document.createElement('input');
        inp.type = 'number'; inp.step = '0.01'; inp.inputMode = 'decimal'; inp.placeholder = '数を入力';
        inp.setAttribute('aria-label', '∂E/∂w の値');
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') B.bMain.click(); });
        lab.append(inp); gctl.append(lab);
      } else if (s.type === 'choice' || s.type === 'sign') {
        const box = el('div', 'chips');
        s.opts.forEach((t, i) => {
          const b = el('button', 'chip d410-opt'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
          if (s.type === 'choice') { b.append(document.createTextNode('（' + KANA[i] + '）')); const sp = el('span'); b.append(sp); setTex(sp, t); }
          else b.textContent = t;
          b.addEventListener('click', () => {
            if (game.done || b.disabled) return;
            st.sel = i; chipsBtns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
          });
          box.append(b); chipsBtns.push(b);
        });
        gctl.append(box);
      } else {
        const wrap = el('div', 'controls');
        se = s.type === 'eta' ? slider(wrap, { tex: '\\eta', min: 0.1, max: 10, step: 0.1, value: 0.5, color: 'teal', aria: '学習率 η' })
          : slider(wrap, { tex: '\\eta', min: 0.05, max: 1, step: 0.05, value: 0.1, color: 'teal', aria: '学習率 η' });
        st.eta = se.get();
        se.on((v) => { if (st.run) return; st.eta = v; game.formula(); });
        gctl.append(wrap);
      }
    }
    function resetRun(s) {
      st.run = false; st.n = 0; st.acc = 0;
      if (s.type === 'eta') { st.M = Object.assign({}, s.M); st.hist = [E_of(st.M)]; }
      if (s.type === 'net') { st.P = NET_INIT.slice(); st.hist = [netLoss(st.P, NET_DATA[0].d)]; }
    }
    const runAnim = L.animate(root, function (dt) {
      if (!st.run) return false;
      const s = S();
      if (s.type === 'eta') {
        const now = performance.now();
        if (now - st.acc < 350 && !L.reduceMotion) return true;
        st.acc = now;
        const V = neuron(st.M); st.M.w -= st.eta * V.gw; st.M.b -= st.eta * V.gb; st.n++; st.hist.push(E_of(st.M));
      } else {
        const d = NET_DATA[0].d;
        for (let k = 0; k < (L.reduceMotion ? s.steps : 4) && st.n < s.steps; k++) {
          const r = netGrad(st.P, d);
          for (let i = 0; i < 7; i++) st.P[i] -= st.eta * r.G[i];
          st.n++; st.hist.push(netLoss(st.P, d));
        }
      }
      game.formula(); plot.invalidate();
      if (st.n >= s.steps) { st.run = false; judgeRun(); return false; }
      return true;
    });
    function win() {
      const n = 4 - game.used; game.award(n); game.done = true;
      game.result('🎉 成功！ ' + L.game.starStr(n) + '（' + game.used + ' 回目）', 'hit');
      B.bMain.disabled = true; B.bNext.hidden = game.k >= GS.length - 1;
      conf.fire(plot.w / 2, plot.h / 3);
    }
    function miss(m) {
      if (game.used >= game.max) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; game.done = true; }
      game.result(m, 'miss');
    }
    function judgeRun() {
      const s = S(), E = st.hist[st.hist.length - 1];
      if (isFinite(E) && E < s.goal) { win(); return; }
      B.bMain.disabled = false;
      const E0 = st.hist[0];
      const big = s.type === 'eta' ? st.eta > 5 : st.eta > 0.55;
      const why = !isFinite(E) || E > E0 ? 'η が大きすぎて、誤差が増えてしまいました。'
        : big ? (s.type === 'eta' ? 'η が大きすぎて行き過ぎ、シグモイドがはりついて（傾きがほぼ 0）止まってしまいました。' : 'η が大きすぎて、誤差がはね上がってしまいました。')
          : 'η が小さすぎて、' + s.steps + ' 回では谷底まで届きません。';
      miss('✗ $E\\approx' + (isFinite(E) ? D.fmt(E, 4) : '\\infty') + '$ で目標に届きませんでした。' + why);
    }
    B.bMain.addEventListener('click', function () {
      const s = S();
      if (game.done || st.run || game.used >= game.max) return;
      if (s.type === 'eta' || s.type === 'net') {
        resetRun(s); st.eta = se.get();
        game.used++; game.renderThrows();
        game.result('学習中…', ''); B.bMain.disabled = true;
        st.run = true; runAnim.kick(); return;
      }
      if (s.type === 'num') {
        const v = parseFloat(String(inp.value).replace('−', '-'));
        if (!isFinite(v)) { game.result('先に数を入力しよう（例：-0.25）', 'miss'); return; }
        game.used++; game.renderThrows();
        if (Math.abs(v - s.ans) < 0.006) { st.reveal = -1; reveal(); win(); inp.disabled = true; }
        else {
          const V = neuron(s.M);
          let m = '✗ ' + L.minus(String(v)) + ' ではありません。';
          if (Math.abs(v + s.ans) < 0.006) m += '符号が逆です。$2(y-t)$ の符号を確かめよう。';
          else if (Math.abs(v - V.gu) < 0.006) m += 'それは $\\frac{\\partial E}{\\partial u}$ です。最後に $x$ をかけよう。';
          miss(m);
        }
        game.formula(); plot.invalidate(); return;
      }
      if (st.sel < 0) { game.result('先に答えを1つ選ぼう', 'miss'); return; }
      game.used++; game.renderThrows();
      const i = st.sel;
      if (i === s.ok) { chipsBtns[i].classList.add('ok'); reveal(); win(); }
      else {
        chipsBtns[i].classList.add('ng'); chipsBtns[i].disabled = true; chipsBtns[i].setAttribute('aria-pressed', 'false'); st.sel = -1;
        miss(s.type === 'sign' ? '✗ ちがいます。3つのかけ算 $2(y-t)$、$y(1-y)$、$x$ の符号を順に見よう。'
          : i === 0 ? '✗ それは $w$ の傾きです（$\\frac{\\partial u}{\\partial w}=x$）。$b$ の場合は？' : i === 2 ? '✗ 連鎖律は「かけ算」です。' : '✗ $E=(y-t)^2$ を微分した $2(y-t)$ を使います。');
      }
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, GS.length - 1)));
    game = L.game.GameShell(root, { key: '4-10:game', stages: GS, idle: 'まだ挑戦していません',
      formula() {
        const s = S();
        if (s.type === 'num' || s.type === 'choice') return '\\begin{aligned}&u=wx+b,\\ \\ y=\\sigma(u)\\\\&E=(y-t)^2\\end{aligned}';
        if (s.type === 'sign') return '\\frac{\\partial E}{\\partial w}=2(y-t)\\cdot y(1-y)\\cdot x';
        const E = st.hist.length ? st.hist[st.hist.length - 1] : NaN;
        return '\\begin{aligned}&' + (s.type === 'eta' ? 'w\\leftarrow w-\\eta\\tfrac{\\partial E}{\\partial w},\\ ' : '') + '\\eta=' + num(st.eta, 2) + '\\\\&\\text{回数 }' + st.n + ',\\ E=' + (isFinite(E) ? D.fmt(E, 4) : '\\infty') + '\\end{aligned}';
      },
      onStage(k, s) {
        st.sel = -1; st.reveal = -1; st.run = false;
        build(s); resetRun(s);
        B.bMain.disabled = false; B.bNext.hidden = true;
        B.bMain.textContent = s.type === 'eta' ? '▶ 5回学習' : s.type === 'net' ? '▶ 200回学習' : '✅ 判定';
        typeset(R(root, 'mission'));
        plot.resize(); plot.invalidate();
      } });
    plot.draw = function (g) {
      const s = S(), c = g.c;
      if (isGraph(s)) {
        const o = {};
        if (st.reveal >= 0) { o.bwd = st.reveal; o.local = true; }
        else if (s.type === 'num') o.red = { w: '?' };
        else if (s.type === 'choice') o.red = { b: '?' };
        else o.red = { w: '?' };
        drawGraph(g, s.M, o);
      } else if (s.type === 'eta') {
        lossAxes(g, st.hist, { minN: s.steps, ymax: 0.25, goal: s.goal });
      } else {
        view(g, { xmin: -3.5, xmax: 3.5, ymin: -0.35, ymax: 1.4 });
        drawNetData(g, st.P, NET_DATA[0].d, { parts: false });
        const E = st.hist[st.hist.length - 1];
        g.texPx('E=' + (isFinite(E) ? D.fmt(E, 4) : '\\infty') + '\\ (\\text{目標 }' + s.goal + ')', 10, 10, { align: 'left', valign: 'top', size: 14, color: isFinite(E) && E < s.goal ? c.teal : c.text });
      }
      conf.draw(g);
    };
    game.setStage(0);
  }

  D.boot([
    [initFwd, 'w-fwd'],
    [initBwd, 'w-bwd'],
    [initTrain, 'w-train'],
    [initNet, 'w-net'],
    [initWhy, 'w-why'],
    [initGame, 'w-game'],
  ]);
})();
