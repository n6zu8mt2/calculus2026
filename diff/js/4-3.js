/* 第4章 4.3節 いろいろな関数の微分 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   axes(g, o)      … 方眼と目盛り（目盛りの数字もすべて TeX）。o.xfmt で横軸の目盛りの書き方を変える
 *   piTeX(v)        … π/2 の倍数を「\frac{\pi}{2}」のような TeX に
 *   chipRow(...)    … 選択ボタンの列
 *   slopeStep(...)  … 接点から「横に 1、縦に 傾き」の階段を描く
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI, H = PI / 2, E = Math.E;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const fm = (v, d) => D.fmt(v, d == null ? 2 : d);
  const sinh = (x) => (Math.exp(x) - Math.exp(-x)) / 2, cosh = (x) => (Math.exp(x) + Math.exp(-x)) / 2;
  const tanh = (x) => sinh(x) / cosh(x);

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
  function piTeX(v) {
    const k = Math.round(v / H);
    if (!k) return '0';
    const s = k < 0 ? '-' : '', a = Math.abs(k);
    if (a % 2 === 0) { const n = a / 2; return s + (n === 1 ? '' : n) + '\\pi'; }
    return s + '\\frac{' + (a === 1 ? '' : a) + '\\pi}{2}';
  }
  function angTeX(th) {
    const k = th / (PI / 12);
    if (Math.abs(k - Math.round(k)) < 1e-6) {
      const n = Math.round(k);
      if (!n) return '0';
      let p = n, q = 12;
      const gcd = (a, b) => (b ? gcd(b, a % b) : a), g0 = gcd(Math.abs(p), q);
      p /= g0; q /= g0;
      const t = (Math.abs(p) === 1 ? '' : Math.abs(p)) + '\\pi';
      return (p < 0 ? '-' : '') + (q === 1 ? t : '\\frac{' + t + '}{' + q + '}');
    }
    return num(th, 2);
  }

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
      g.texPx(o.xfmt ? o.xfmt(i * lx) : num(i * lx, 2), px, y0 + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
    }
    const pxy = (g.h / (g.ymax - g.ymin)) * ly;
    let my = 1;
    while (pxy * my < 24) my++;
    const hasY0 = g.xmin <= 0 && g.xmax >= 0, x0 = hasY0 ? g.X(0) : 30;
    for (let j = Math.ceil(g.ymin / ly - 1e-9); j * ly <= g.ymax + 1e-9; j++) {
      if (!j || j % my) continue;
      const py = g.Y(j * ly);
      if (py < 24 || py > g.h - 10) continue;
      const inR = x0 < 28;
      g.texPx(num(j * ly, 2), inR ? x0 + 5 : x0 - 6, py, { align: inR ? 'left' : 'right', size: 13, color: c.muted });
    }
    if (hasX0 && hasY0) g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
  }

  // 接点 (a, f(a)) から「横に 1 進むと縦に m」の階段（m の値も書く。急なときは横に 0.5 か 0.25）
  function slopeStep(g, a, fa, m, o) {
    o = o || {};
    let run = o.run || 1;
    while (Math.abs(m * run) > (g.ymax - g.ymin) * 0.35 && run > 0.26) run /= 2;   // 急なときは横を短く（縦が図からはみ出さないように）
    let dir = o.left ? -1 : 1;
    if (dir > 0 && a < 0 && a + run > -0.6 && a - run > g.xmin + 0.3) dir = -1;   // 縦軸の目盛りとぶつけない
    const c = g.c, b = a + dir * run, fb = fa + dir * run * m;
    g.line(a, fa, b, fa, { color: c.muted, width: 1.6, dash: [4, 4] });
    g.line(b, fa, b, fb, { color: c.amber, width: 3 });
    if (g.pxPerX * run >= 34) g.tex(String(run), (a + b) / 2, fa, { align: 'center', valign: m >= 0 ? 'top' : 'bottom', dy: m >= 0 ? 3 : -3, size: 13, color: c.muted, avoid: true });
    g.tex(o.label || fm(m * run), b, (fa + fb) / 2, { align: dir > 0 ? 'left' : 'right', dx: dir > 0 ? 6 : -6, size: 14, color: c.amber, avoid: true });
  }

  // 曲線の上をドラッグする点（緑）
  function curveHandle(plot, get, set, f, o) {
    o = o || {};
    return plot.addHandle({
      get x() { return get(); }, get y() { return f(get()); },
      get color() { return plot.c ? plot.c.teal : '#0d9c86'; }, r: 8,
      hidden: o.hidden,
      drag(x) { set(x); },
    });
  }

  /* ==========================================================
     4.3(1) y = a^x の接線の傾きと高さ
     ========================================================== */
  function initExp() {
    const root = $id('w-exp');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.2, xmax: 2.8, ymin: -1, ymax: 6.4, ratio: [0.85, 0.5] });
    const st = { a: 2, x: 1, deriv: false };
    const ctl = root.querySelector('.controls');
    const sA = slider(ctl, { tex: 'a', min: 0.3, max: 4, step: 0.01, value: 2, color: 'primary', aria: '底 a', fmt: (v) => (Math.abs(v - E) < 0.006 ? 'e' : v.toFixed(2)) });
    const sX = slider(ctl, { tex: '\\teal{x}', min: -2.5, max: 2.2, step: 0.01, value: 1, color: 'teal', aria: '接点の x 座標' });
    const PRE = [{ tex: 'a=2', a: 2 }, { tex: 'a=e', a: E }, { tex: 'a=3', a: 3 }, { tex: 'a=\\frac12', a: 0.5 }];
    const pre = chipRow(R(root, 'presets'), PRE, 0, (it) => { st.a = it.a; sA.set(it.a); fixX(); update(); });
    // 点が図の外に出ないように（高さ 6 まで）
    const xr = () => { const la = Math.log(st.a); return [la < -0.05 ? Math.max(-2.5, Math.log(6) / la) : -2.5, la > 0.05 ? Math.min(2.2, Math.log(6) / la) : 2.2]; };
    const fixX = () => {
      const r = xr(); st.x = clamp(st.x, r[0], r[1]); sX.set(st.x);
      const ymin = st.a < 0.95 ? -2.4 : -1;
      if (plot.o.ymin !== ymin) plot.setView({ ymin });
    };
    sA.on((v) => { st.a = Math.abs(v - E) < 0.006 ? E : v; unpress(pre); fixX(); update(); });
    sX.on((v) => { st.x = v; fixX(); update(); });
    R(root, 'deriv').addEventListener('change', (e) => { st.deriv = e.target.checked; plot.invalidate(); });
    const f = (x) => Math.pow(st.a, x), df = (x) => Math.pow(st.a, x) * Math.log(st.a);
    curveHandle(plot, () => st.x, (x) => { st.x = Math.round(x * 100) / 100; fixX(); update(); }, f);
    const aT = () => (st.a === E ? 'e' : fm(st.a));
    let lastHow = -1;
    function update() {
      const y = f(st.x), m = df(st.x), la = Math.log(st.a);
      tex(root, 'h', '\\blue{' + aT() + '^{' + fm(st.x) + '}}\\approx' + fm(y, 3));
      tex(root, 'm', '\\teal{' + fm(m, 3) + '}');
      tex(root, 'ratio', '\\dfrac{\\teal{' + fm(m, 3) + '}}{\\blue{' + fm(y, 3) + '}}\\approx' + fm(la, 3) + (st.a === E ? '=\\log e=1' : '=\\log ' + aT()));
      const k = st.a === E ? 0 : la < 0 ? 2 : 1;
      if (k !== lastHow) {
        lastHow = k;
        setHTML(R(root, 'how'), [
          '<b>傾き ＝ 高さ</b>。どこでも金色の縦の線（傾き）と、青い点線（高さ）が同じ長さ。',
          '点を動かしても、傾き ÷ 高さ はいつも $\\log a$。$a=e$ のボタンで比が $1$ になる。',
          '$a\\lt1$ なので $\\log a\\lt0$。傾きはマイナス（右下がり）で、やはり高さの $\\log a$ 倍。',
        ][k]);
      }
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, x0 = st.x, y0 = f(x0), m = df(x0);
      axes(g, {});
      if (st.deriv) D.curve(g, df, { color: c.amber, width: 2.5, alpha: 0.9 });
      D.curve(g, f, { color: c.primary, width: 3 });
      D.tangent(g, f, x0, { df, point: false });
      // 高さ（青い点線）
      g.line(x0, 0, x0, y0, { color: c.primary, width: 2, dash: [5, 4] });
      slopeStep(g, x0, y0, m, { left: x0 > 0.6 });
      g.dot(0, 1, { r: 4.5, color: c.text });
      g.tex('(0,\\,1)', 0, 1, { align: 'left', valign: 'top', dx: 6, dy: 4, size: 13, color: c.muted, avoid: true });
      { const la = Math.log(st.a), xl = la > 0.05 ? Math.min(2.5, Math.log(5.2) / la) : la < -0.05 ? Math.max(-3, Math.log(5.2) / la) : 2.2;
        g.tex('y=' + aT() + '^x', xl, f(xl), { align: la > 0.05 ? 'right' : 'left', dx: la > 0.05 ? -10 : 10, dy: la > 0.05 || la < -0.05 ? 0 : -14, size: 15, color: c.primary, avoid: true }); }
      if (st.deriv && Math.abs(Math.log(st.a)) > 0.05) {
        const la = Math.log(st.a), xd = clamp(Math.log((la > 0 ? 1.6 : 1) / Math.abs(la)) / la, -2.9, 2.2);
        g.tex("y=(" + aT() + "^x)'", xd, df(xd), la > 0 ? { align: 'left', dx: 10, size: 14, color: c.amber, avoid: true } : { align: 'right', valign: 'top', dx: -6, dy: 6, size: 14, color: c.amber, avoid: true });
      }
    };
    update();
  }

  /* ==========================================================
     4.3(2) y = log x の接線の傾き
     ========================================================== */
  function initLog() {
    const root = $id('w-log');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.4, xmax: 6.4, equal: true, yc: 0.4, ratio: [0.85, 0.48] });
    const st = { mode: 0, x: 2, mirror: false };
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: '\\teal{x}', min: 0.2, max: 6, step: 0.05, value: 2, color: 'teal', aria: '接点の x 座標' });
    const fix = (x) => {
      const lo = 0.2, hi = st.mode ? 6 : 6;
      if (st.mode === 0) return clamp(x, lo, hi);
      if (Math.abs(x) < lo) return x < 0 ? -lo : lo;
      return clamp(x, -hi, hi);
    };
    sX.on((v) => { st.x = fix(v); update(); });
    const f = (x) => (st.mode ? Math.log(Math.abs(x)) : x > 0 ? Math.log(x) : NaN), df = (x) => 1 / x;
    chipRow(R(root, 'mode'), [{ tex: 'y=\\log x' }, { tex: 'y=\\log|x|' }], 0, (it, i) => {
      st.mode = i;
      sX.input.min = i ? -6 : 0.2;
      if (!i && st.x < 0.2) st.x = 2;
      if (i && st.x > 0) st.x = -2;
      sX.set(st.x);
      plot.setView(i ? { xmin: -6.6, xmax: 6.6, yc: 0.2 } : { xmin: -1.4, xmax: 6.4, yc: 0.4 });
      mirLab.hidden = !!i;
      update();
    });
    const mirLab = R(root, 'mirror').closest('label');
    R(root, 'mirror').addEventListener('change', (e) => { st.mirror = e.target.checked; update(); });
    curveHandle(plot, () => st.x, (x) => { st.x = fix(Math.round(x * 20) / 20); sX.set(st.x); update(); }, f);
    function update() {
      const x = st.x, m = 1 / x, xs = fm(x);
      tex(root, 'pt', 'x=' + xs + ',\\ y=' + (st.mode ? '\\log|' + xs + '|' : '\\log ' + xs) + '\\approx' + fm(f(x), 3));
      tex(root, 'm', '\\teal{' + fm(m, 3) + '}\\ \\left(=\\dfrac{1}{' + xs + '}\\right)');
      tex(root, 'prod', '\\teal{' + fm(m, 3) + '}\\times' + xs + '=1');
      let h;
      if (st.mode && x < 0) h = '左半分は $\\log x$ を左右に折り返した形。傾きはマイナスで、やはり $\\frac{1}{x}$（$x$ がマイナスだから）。';
      else if (st.mirror) h = '点線は $y=e^x$。折り返した点での傾きは $' + xs + '$、こちらの傾きはその<b>逆数</b> $\\frac{1}{' + xs + '}$。';
      else h = '横に $1$ 進むと、接線は縦に $\\frac{1}{x}$ 上がる。$x$ が大きいほど傾きはゆるやか。$x=1$ で傾き $1$。';
      setHTML(R(root, 'how'), h);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, x0 = st.x, y0 = f(x0), m = 1 / x0;
      axes(g, {});
      if (st.mirror && !st.mode) {
        g.line(g.xmin, g.xmin, g.xmax, g.xmax, { color: c.muted, width: 1.4, dash: [6, 5] });
        D.curve(g, Math.exp, { color: c.primary, width: 2, dash: [6, 5], alpha: 0.7 });
        // 折り返した点と、そこでの接線（傾き x0）
        const px = y0, py = x0;
        g.line(px - 3, py - 3 * x0, px + 3, py + 3 * x0, { color: c.teal, width: 2, dash: [6, 5], alpha: 0.8 });
        g.line(x0, y0, px, py, { color: c.muted, width: 1.2, dash: [2, 4] });
        g.dot(px, py, { r: 5, color: c.teal });
        g.tex('y=e^x', -0.85, Math.exp(-0.85), { align: 'center', valign: 'bottom', dy: -8, size: 14, color: c.primary, avoid: true });
        const ty = Math.min(g.ymax, g.xmax) - 0.25;
        g.tex('y=x', ty, ty, { align: 'left', valign: 'top', dx: 8, size: 13, color: c.muted, avoid: true });
      }
      D.curve(g, f, { color: c.primary, width: 3, x0: st.mode ? g.xmin : 0.01 });
      D.tangent(g, f, x0, { df, point: false });
      slopeStep(g, x0, y0, m, { left: x0 > 4.6 || (x0 < 0 && x0 > -1.6) });
      const lx = st.mode ? 5.2 : 5.4;
      g.tex(st.mode ? 'y=\\log|x|' : 'y=\\log x', lx, Math.log(lx), { align: 'center', valign: 'bottom', dy: -10, size: 15, color: c.primary, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.3(3) 単位円の点の速度と sin・cos の傾き
     ========================================================== */
  function initSin() {
    const root = $id('w-sin');
    const cvs = root.querySelectorAll('canvas');
    const pc = new Plot(cvs[0], { xmin: -1.9, xmax: 1.9, equal: true, yc: 0, height: (w) => clamp(w * 0.88, 220, 330) });
    const pg = new Plot(cvs[1], { xmin: -0.55, xmax: TAU + 0.45, ymin: -1.75, ymax: 1.75, height: (w) => (w < 520 ? w * 0.62 : clamp(w * 0.47, 200, 330)) });
    const st = { th: PI / 3, mode: 0, play: false, deriv: false };
    const ctl = root.querySelector('.controls');
    const sT = slider(ctl, { tex: '\\blue{t}', min: 0, max: 72, step: 1, value: 12, color: 'primary', aria: '時刻 t（π/36 ごと）', fmt: (k) => (k * PI / 36).toFixed(2) });
    sT.on((k) => { st.th = k * PI / 36; st.play = false; showPlay(); update(); });
    const f = (x) => (st.mode ? Math.cos(x) : Math.sin(x)), df = (x) => (st.mode ? -Math.sin(x) : Math.cos(x));
    chipRow(R(root, 'mode'), [{ tex: 'y(t)=\\sin t' }, { tex: 'x(t)=\\cos t' }], 0, (it, i) => { st.mode = i; update(); });
    R(root, 'deriv').addEventListener('change', (e) => { st.deriv = e.target.checked; pg.invalidate(); });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.th += dt * 0.7;
      if (st.th > TAU) st.th -= TAU;
      update();
      return true;
    });
    const bP = R(root, 'play');
    const showPlay = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 回す'; };
    bP.addEventListener('click', () => { st.play = !st.play; showPlay(); if (st.play) anim.kick(); });
    const snap = (a) => Math.round(a / (PI / 36)) * (PI / 36);
    pc.addHandle({ get x() { return Math.cos(st.th); }, get y() { return Math.sin(st.th); },
      get color() { return pc.c ? pc.c.primary : '#3355d6'; }, r: 8,
      drag(x, y) { let a = Math.atan2(y, x); if (a < 0) a += TAU; st.th = snap(a); st.play = false; showPlay(); update(); } });
    pg.addHandle({ get x() { return st.th; }, get y() { return f(st.th); },
      get color() { return pg.c ? pg.c.teal : '#0d9c86'; }, r: 8,
      drag(x) { st.th = clamp(snap(x), 0, TAU); st.play = false; showPlay(); update(); } });
    let lastMode = -1;
    function update() {
      const th = st.th, s = Math.sin(th), co = Math.cos(th);
      sT.set(Math.round(th / (PI / 36)));
      const exact = Math.abs(th / (PI / 12) - Math.round(th / (PI / 12))) < 1e-6;
      tex(root, 'ang', '\\blue{t}=' + angTeX(th) + (exact && Math.round(th / (PI / 12)) ? '\\approx' + num(th, 2) : '') + '\\ (' + Math.round(th * 180 / PI) + '^\\circ)');
      tex(root, 'vel', "\\begin{aligned}&\\bigl(x'(t),\\ y'(t)\\bigr)=\\teal{(-\\sin t,\\ \\cos t)}\\\\&=(" + fm(-s) + ',\\ ' + fm(co) + ')\\end{aligned}');
      tex(root, 'm', st.mode ? "(\\cos t)'=\\amber{-\\sin t}=" + fm(-s, 3) : "(\\sin t)'=\\amber{\\cos t}=" + fm(co, 3));
      if (lastMode !== st.mode) {
        lastMode = st.mode;
        setHTML(R(root, 'how'), st.mode
          ? '横の位置 $x(t)=\\cos t$ の増える速さは、速度の<b>横の成分</b>（金）$x\'(t)=-\\sin t$。上半分では点は左へ動くので、$\\cos t$ は減る（傾きマイナス）。'
          : '高さ $y(t)=\\sin t$ の増える速さは、速度の<b>縦の成分</b>（金）$y\'(t)=\\cos t$。右のグラフの接線の傾きと同じ数になる。');
      }
      pc.invalidate(); pg.invalidate();
    }
    pc.draw = function (g) {
      const c = g.c, ctx = g.ctx, th = st.th, x = Math.cos(th), y = Math.sin(th), vx = -y, vy = x;
      g.line(-1.65, 0, 1.65, 0, { color: c.axis, width: 1.2 });
      g.line(0, g.ymin + 0.05, 0, g.ymax - 0.05, { color: c.axis, width: 1.2 });
      ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), g.pxPerX, 0, TAU); ctx.stroke(); ctx.restore();
      // 弧（角 t）
      const pts = [];
      for (let i = 0; i <= 60; i++) { const a = th * i / 60; pts.push([0.28 * Math.cos(a), 0.28 * Math.sin(a)]); }
      if (th > 0.01) g.poly(pts, { color: c.primary, width: 2 });
      g.line(0, 0, x, y, { color: c.text, width: 2 });
      // 影：sin のときは高さ、cos のときは横の位置
      if (st.mode) g.line(0, y, x, y, { color: c.primary, width: 3.5, alpha: 0.85 });
      else g.line(x, 0, x, y, { color: c.primary, width: 3.5, alpha: 0.85 });
      // 速度の成分（横 → 縦）
      const hiH = st.mode === 1, colH = hiH ? c.amber : c.muted, colV = hiH ? c.muted : c.amber;
      g.line(x, y, x + vx, y, { color: colH, width: hiH ? 3 : 1.6, dash: hiH ? [] : [4, 4] });
      g.line(x + vx, y, x + vx, y + vy, { color: colV, width: hiH ? 1.6 : 3, dash: hiH ? [4, 4] : [] });
      g.arrow(x, y, x + vx, y + vy, { color: c.teal, width: 3, head: 13 });
      g.dot(x, y, { r: 4, color: c.primary });
      g.tex('\\mathrm{P}', x * 1.16 - 0.22 * vx, y * 1.16 - 0.22 * vy, { align: 'center', size: 14, color: c.primary, avoid: true });
      // 成分のラベル
      if (Math.abs(vy) > 0.18) g.tex(hiH ? '' + fm(vy) : '\\cos t', x + vx, y + vy / 2, { align: vx >= 0 ? 'left' : 'right', dx: vx >= 0 ? 6 : -6, size: 13, color: colV, avoid: true });
      if (Math.abs(vx) > 0.18) g.tex(hiH ? '-\\sin t' : '' + fm(vx), x + vx / 2, y, { align: 'center', valign: y + vy / 2 >= y ? 'top' : 'bottom', dy: y + vy / 2 >= y ? 4 : -4, size: 13, color: colH, avoid: true });
      g.texPx('\\teal{\\text{速さ } 1}', g.w - 8, g.h - 8, { align: 'right', valign: 'bottom', size: 13 });
    };
    pg.draw = function (g) {
      const c = g.c, th = st.th, y0 = f(th), m = df(th);
      g.grid({ stepX: H, stepY: 1, labels: false, xlabel: 't', ylabel: st.mode ? 'x' : 'y' });
      let k = 1;
      while (g.pxPerX * H * k < 36) k *= 2;
      for (let i = 1; i * H <= TAU + 1e-9; i++) {
        if (i % k) continue;
        g.texPx(piTeX(i * H), g.X(i * H), g.Y(0) + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
      }
      [-1, 1].forEach((v) => g.texPx(num(v), g.X(0) - 6, g.Y(v), { align: 'right', size: 13, color: c.muted }));
      g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
      if (st.deriv) {
        D.curve(g, df, { color: c.amber, width: 2.5, x0: 0, x1: TAU, alpha: 0.85 });
        g.dot(th, m, { r: 5, color: c.amber });
        g.line(th, y0, th, m, { color: c.amber, width: 1.2, dash: [3, 4], alpha: 0.7 });
      }
      D.curve(g, f, { color: c.primary, width: 3, x0: 0, x1: TAU });
      D.tangent(g, f, th, { df, point: false });
      slopeStep(g, th, y0, m, { left: th > TAU - 1.1 });
      g.tex(st.mode ? 'x=\\cos t' : 'y=\\sin t', st.mode ? PI : 3 * H, -1, { align: 'center', valign: 'top', dy: 6, size: 15, color: c.primary, avoid: true });
      if (st.deriv) g.tex(st.mode ? "x'=-\\sin t" : "y'=\\cos t", st.mode ? 3 * H : TAU, 1, { align: st.mode ? 'center' : 'right', valign: 'bottom', dy: -6, size: 14, color: c.amber, avoid: true });
    };
    showPlay(); update();
  }

  /* ==========================================================
     4.3(4) 双曲線関数のグラフと接線
     ========================================================== */
  function initHyp() {
    const root = $id('w-hyp');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.3, xmax: 3.3, ymin: -3.6, ymax: 4.6, ratio: [0.9, 0.52] });
    const st = { mode: 0, x: 1, parts: true, deriv: false };
    const FS = [
      { f: cosh, df: sinh, n: '\\cosh', dn: '\\sinh', ex: '\\frac{e^x+e^{-x}}{2}' },
      { f: sinh, df: cosh, n: '\\sinh', dn: '\\cosh', ex: '\\frac{e^x-e^{-x}}{2}' },
      { f: tanh, df: (x) => 1 / (cosh(x) * cosh(x)), n: '\\tanh', dn: '\\frac{1}{\\cosh^2}', ex: '\\frac{\\sinh x}{\\cosh x}' },
    ];
    const ctl = root.querySelector('.controls');
    const sX = slider(ctl, { tex: '\\teal{x}', min: -1.9, max: 1.9, step: 0.05, value: 1, color: 'teal', aria: '接点の x 座標' });
    sX.on((v) => { st.x = v; update(); });
    chipRow(R(root, 'mode'), FS.map((F) => ({ tex: 'y=' + F.n + ' x' })), 0, (it, i) => { st.mode = i; update(); });
    R(root, 'parts').addEventListener('change', (e) => { st.parts = e.target.checked; plot.invalidate(); });
    R(root, 'deriv').addEventListener('change', (e) => { st.deriv = e.target.checked; plot.invalidate(); });
    const F = () => FS[st.mode];
    curveHandle(plot, () => st.x, (x) => { st.x = clamp(Math.round(x * 20) / 20, -1.9, 1.9); sX.set(st.x); update(); }, (x) => F().f(x));
    function update() {
      const Fm = F(), x = st.x, xs = fm(x);
      const nx = x < 0 ? fm(-x) : '-' + xs, ep = 'e^{' + xs + '}', en = 'e^{' + nx + '}';
      const ex = st.mode === 0 ? '\\frac{' + ep + '+' + en + '}{2}' : st.mode === 1 ? '\\frac{' + ep + '-' + en + '}{2}' : '\\frac{\\sinh ' + xs + '}{\\cosh ' + xs + '}';
      tex(root, 'val', Fm.n + ' ' + xs + '=' + ex + '\\approx' + fm(Fm.f(x), 3));
      tex(root, 'm', st.mode === 2 ? "(\\tanh x)'=\\amber{\\dfrac{1}{\\cosh^2x}}=" + fm(Fm.df(x), 3) + '\\ \\ (\\text{4.4節})'
        : '(' + Fm.n + " x)'=\\amber{" + Fm.dn + ' x}=' + fm(Fm.df(x), 3));
      const ch = cosh(x), sh = sinh(x);
      tex(root, 'id', '\\cosh^2' + xs + '-\\sinh^2' + xs + '=' + fm(ch * ch, 3) + '-' + fm(sh * sh, 3) + '=1');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, Fm = F(), x0 = st.x, y0 = Fm.f(x0), m = Fm.df(x0);
      axes(g, {});
      if (st.parts && st.mode < 2) {
        D.curve(g, (x) => Math.exp(x) / 2, { color: c.violet, width: 1.8, dash: [6, 5], alpha: 0.8 });
        D.curve(g, (x) => (st.mode ? -1 : 1) * Math.exp(-x) / 2, { color: c.accent, width: 1.8, dash: [6, 5], alpha: 0.8 });
        g.tex('\\frac{e^x}{2}', -2.7, Math.exp(-2.7) / 2, { align: 'center', valign: 'bottom', dy: -4, size: 14, color: c.violet, avoid: true });
        g.tex((st.mode ? '-' : '') + '\\frac{e^{-x}}{2}', 2.7, (st.mode ? -1 : 1) * Math.exp(-2.7) / 2, { align: 'center', valign: st.mode ? 'top' : 'bottom', dy: st.mode ? 4 : -4, size: 14, color: c.accent, avoid: true });
      }
      if (st.mode === 2) { g.line(g.xmin, 1, g.xmax, 1, { color: c.muted, width: 1.2, dash: [5, 5] }); g.line(g.xmin, -1, g.xmax, -1, { color: c.muted, width: 1.2, dash: [5, 5] }); }
      if (st.deriv) {
        D.curve(g, Fm.df, { color: c.amber, width: 2.5, alpha: 0.85 });
        g.dot(x0, m, { r: 5, color: c.amber });
        g.line(x0, y0, x0, m, { color: c.amber, width: 1.2, dash: [3, 4], alpha: 0.7 });
      }
      D.curve(g, Fm.f, { color: c.primary, width: 3 });
      D.tangent(g, Fm.f, x0, { df: Fm.df, point: false });
      slopeStep(g, x0, y0, m, { left: x0 > 1.6 });
      const lx = st.mode === 0 ? (x0 < -1.2 ? 2.05 : -2.05) : st.mode === 1 ? -1.6 : 2.6;
      g.tex('y=' + Fm.n + ' x', lx, Fm.f(lx), st.mode === 0 ? { align: lx > 0 ? 'right' : 'left', valign: 'bottom', dx: lx > 0 ? -12 : 12, dy: -2, size: 15, color: c.primary, avoid: true } : st.mode === 1 ? { align: 'right', dx: -10, size: 15, color: c.primary, avoid: true } : { align: 'right', valign: 'top', dy: 8, size: 15, color: c.primary, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.3(4) 点 (cosh t, sinh t) は双曲線の上を動く
     ========================================================== */
  function initHypCurve() {
    const root = $id('w-hypc');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.4, xmax: 4.2, equal: true, yc: 0, height: (w) => clamp(w * 0.95, 260, 520) });
    const st = { t: 1, play: false, dir: 1, circ: true };
    const ctl = root.querySelector('.controls');
    const sT = slider(ctl, { tex: '\\blue{t}', min: -1.6, max: 1.6, step: 0.05, value: 1, color: 'primary', aria: 't の値' });
    sT.on((v) => { st.t = v; st.play = false; showPlay(); update(); });
    R(root, 'circ').addEventListener('change', (e) => { st.circ = e.target.checked; update(); });
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += st.dir * dt * 0.8;
      if (st.t > 1.6) { st.t = 1.6; st.dir = -1; } else if (st.t < -1.6) { st.t = -1.6; st.dir = 1; }
      sT.set(Math.round(st.t * 20) / 20);
      update();
      return true;
    });
    const bP = R(root, 'play');
    const showPlay = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    bP.addEventListener('click', () => { st.play = !st.play; showPlay(); if (st.play) anim.kick(); });
    function update() {
      const t = st.t, ch = cosh(t), sh = sinh(t), ts = fm(t);
      tex(root, 'pt', '(\\cosh ' + ts + ',\\ \\sinh ' + ts + ')\\approx(\\blue{' + fm(ch, 3) + '},\\ \\blue{' + fm(sh, 3) + '})');
      tex(root, 'id', 'x^2-y^2=' + fm(ch * ch, 3) + '-' + fm(sh * sh, 3) + '=1');
      tex(root, 'cpt', '(\\cos ' + ts + ',\\ \\sin ' + ts + ')\\approx(' + fm(Math.cos(t), 3) + ',\\ ' + fm(Math.sin(t), 3) + '),\\ x^2+y^2=1');
      R(root, 'cpt').closest('.row').hidden = !st.circ;
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, t = st.t, ch = cosh(t), sh = sinh(t);
      axes(g, {});
      // 漸近線 y = ±x
      g.line(g.xmin, g.xmin, g.xmax, g.xmax, { color: c.muted, width: 1.2, dash: [5, 5] });
      g.line(g.xmin, -g.xmin, g.xmax, -g.xmax, { color: c.muted, width: 1.2, dash: [5, 5] });
      g.tex('y=x', 3.2, 3.2, { dx: -6, align: 'right', valign: 'bottom', size: 13, color: c.muted, avoid: true });
      g.tex('y=-x', 3.2, -3.2, { dx: -6, align: 'right', valign: 'top', size: 13, color: c.muted, avoid: true });
      // 双曲線 x^2 - y^2 = 1（右の枝は実線、左の枝はうすく）
      const right = [], left = [];
      for (let i = 0; i <= 120; i++) { const s = -2.6 + 5.2 * i / 120; right.push([cosh(s), sinh(s)]); left.push([-cosh(s), sinh(s)]); }
      g.poly(left, { color: c.primary, width: 2, alpha: 0.35 });
      g.poly(right, { color: c.primary, width: 3 });
      g.tex('x^2-y^2=1', cosh(-1.25), sinh(-1.25), { dx: 10, align: 'left', size: 14, color: c.primary, avoid: true });
      if (st.circ) {
        const cp = [];
        for (let i = 0; i <= 90; i++) { const a = TAU * i / 90; cp.push([Math.cos(a), Math.sin(a)]); }
        g.poly(cp, { color: c.muted, width: 1.8 });
        g.line(0, 0, Math.cos(t), Math.sin(t), { color: c.muted, width: 1.2 });
        g.dot(Math.cos(t), Math.sin(t), { r: 5.5, color: c.muted });
      }
      // 座標の目安
      g.line(ch, 0, ch, sh, { color: c.primary, width: 1.2, dash: [3, 4] });
      g.line(0, sh, ch, sh, { color: c.primary, width: 1.2, dash: [3, 4] });
      g.tex('\\cosh t', ch, 0, { dy: sh >= 0 ? 6 : -6, valign: sh >= 0 ? 'top' : 'bottom', align: 'center', size: 13, color: c.primary, avoid: true });
      g.tex('\\sinh t', 0, sh, { dx: -6, align: 'right', size: 13, color: c.primary, avoid: true });
      g.dot(ch, sh, { r: 7, color: c.primary });
      g.tex('(\\cosh t,\\ \\sinh t)', ch, sh, { dx: 10, dy: sh >= 0 ? -12 : 12, align: 'left', size: 13, color: c.primary, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.3(4) 垂れ下がる鎖：カテナリー
     ========================================================== */
  function initCat() {
    const root = $id('w-cat');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.9, xmax: 3.9, equal: true, yc: 0.8, ratio: [0.8, 0.62] });
    const W = 3, TOP = 2.6, GROUND = -1.35;
    const st = { s: 1.4, para: true, flip: false };
    const ctl = root.querySelector('.controls');
    const sS = slider(ctl, { tex: '\\blue{s}', min: 0.2, max: 3.8, step: 0.05, value: 1.4, color: 'primary', aria: 'たるみの深さ s' });
    sS.on((v) => { st.s = v; update(); });
    R(root, 'para').addEventListener('change', (e) => { st.para = e.target.checked; update(); });
    R(root, 'flip').addEventListener('change', (e) => { st.flip = e.target.checked; plot.invalidate(); });
    // たるみ s から a を求める：a (cosh(W/a) − 1) = s（a が大きいほど小さい）
    function solveA(s) {
      let lo = 0.05, hi = 200;
      for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (mid * (cosh(W / mid) - 1) > s) lo = mid; else hi = mid; }
      return (lo + hi) / 2;
    }
    let a = solveA(st.s);
    const cat = (x) => TOP - st.s + a * (cosh(x / a) - 1);
    const par = (x) => TOP - st.s + st.s * x * x / (W * W);
    // 逆さ（アーチ）のときは、地面と電柱の上の真ん中を軸に上下を入れかえる
    const flipY = (y) => (st.flip ? GROUND + TOP - y : y);
    plot.addHandle({ get x() { return 0; }, get y() { return flipY(TOP - st.s); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: 8,
      drag(x, y) { const yy = st.flip ? GROUND + TOP - y : y; st.s = clamp(Math.round((TOP - yy) * 20) / 20, 0.2, 3.8); sS.set(st.s); update(); } });
    let gap = 0;
    function update() {
      a = solveA(st.s);
      gap = 0;
      for (let i = 0; i <= 200; i++) { const x = -W + 2 * W * i / 200; gap = Math.max(gap, Math.abs(cat(x) - par(x))); }
      const c0 = TOP - st.s - a;
      tex(root, 'eq', 'y=\\blue{' + fm(a) + '\\cosh\\dfrac{x}{' + fm(a) + '}}' + (c0 >= 0 ? '+' : '-') + fm(Math.abs(c0)));
      tex(root, 'par', 'y=' + fm(st.s / (W * W), 3) + 'x^2' + ((TOP - st.s) >= 0 ? '+' : '-') + fm(Math.abs(TOP - st.s)) + '\\ \\ (\\text{ずれ}\\leqq' + fm(gap, 2) + ')');
      setHTML(R(root, 'how'), gap < 0.04 ? '浅く垂れるときは、放物線（点線）とほとんど重なる。$a$ が大きいほどピンと張る。'
        : '深く垂れると違いがわかる。鎖（青）は放物線より<b>底が平らで両端が急</b>。$a$ が小さいほど深く垂れる。');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx;
      // 地面と電柱
      const gy = GROUND;
      ctx.save(); ctx.fillStyle = c.grid; ctx.fillRect(0, g.Y(gy), g.w, g.h - g.Y(gy)); ctx.restore();
      g.line(g.xmin, gy, g.xmax, gy, { color: c.axis, width: 1.5 });
      if (!st.flip) {
        [-W, W].forEach((x) => { g.line(x, GROUND, x, TOP + 0.2, { color: c.muted, width: 6 }); g.line(x - 0.25, TOP + 0.05, x + 0.25, TOP + 0.05, { color: c.muted, width: 3 }); });
      }
      if (st.para) g.fn((x) => flipY(par(x)), { x0: -W, x1: W, color: c.violet, width: 2.2, dash: [7, 6] });
      // 鎖：曲線に沿って同じ間隔の玉
      const N = 400, pts = [], len = [0];
      for (let i = 0; i <= N; i++) { const x = -W + 2 * W * i / N; pts.push([x, flipY(cat(x))]); if (i) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
      g.poly(pts, { color: c.primary, width: 2.5 });
      const step = 0.16, total = len[N];
      let j = 0;
      for (let d = 0; d <= total + 1e-9; d += total / Math.round(total / step)) {
        while (j < N && len[j + 1] < d) j++;
        const t = j < N ? (d - len[j]) / ((len[j + 1] - len[j]) || 1) : 0, p = pts[j], q = pts[Math.min(N, j + 1)];
        const px = p[0] + (q[0] - p[0]) * t, py = p[1] + (q[1] - p[1]) * t;
        ctx.save(); ctx.beginPath(); ctx.arc(g.X(px), g.Y(py), 3.6, 0, TAU); ctx.fillStyle = c.primary; ctx.fill(); ctx.restore();
      }
      [-W, W].forEach((x) => g.dot(x, flipY(TOP), { r: 5, color: c.text }));
      g.tex(st.flip ? '\\text{アーチ}' : '\\text{電柱}', W, flipY(TOP), { align: st.flip ? 'right' : 'center', valign: 'bottom', dx: st.flip ? -12 : 0, dy: st.flip ? -4 : -22, size: 13, color: c.muted, avoid: true });
      if (st.para) g.tex('\\text{点線：放物線}', g.xmin + 0.15, st.flip ? GROUND + 0.3 : TOP + 0.45, { align: 'left', size: 13, color: c.violet, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.3(5) 関数と導関数：接線の傾きをなぞる
     ========================================================== */
  const TBL = [
    { t: 'x^2', d: '2x', f: (x) => x * x, df: (x) => 2 * x },
    { t: 'x^3', d: '3x^2', f: (x) => x * x * x, df: (x) => 3 * x * x },
    { t: 'e^x', d: 'e^x', f: Math.exp, df: Math.exp },
    { t: '2^x', d: '2^x\\log2', f: (x) => Math.pow(2, x), df: (x) => Math.pow(2, x) * Math.LN2 },
    { t: '\\log x', d: '\\frac{1}{x}', f: (x) => (x > 0 ? Math.log(x) : NaN), df: (x) => (x > 0 ? 1 / x : NaN), lo: 0.15 },
    { t: '\\sin x', d: '\\cos x', f: Math.sin, df: Math.cos, wide: true },
    { t: '\\cos x', d: '-\\sin x', f: Math.cos, df: (x) => -Math.sin(x), wide: true },
    { t: '\\sinh x', d: '\\cosh x', f: sinh, df: cosh },
    { t: '\\cosh x', d: '\\sinh x', f: cosh, df: sinh },
  ];
  function initTable() {
    const root = $id('w-table');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.3, xmax: 3.3, ymin: -3.3, ymax: 3.6, ratio: [0.9, 0.52] });
    const st = { k: 0, x: -1.5, full: false, play: false, lo: -1.5, hi: -1.5 };
    const ctl = root.querySelector('.controls');
    const range = () => { const T = TBL[st.k]; return T.wide ? [-PI, PI] : [T.lo != null ? T.lo : -3, 3]; };
    const sX = slider(ctl, { tex: '\\teal{x}', min: -3, max: 3, step: 0.05, value: -1.5, color: 'teal', aria: '接点の x 座標' });
    const setX = (x) => { const r = range(); st.x = clamp(x, r[0], r[1]); st.lo = Math.min(st.lo, st.x); st.hi = Math.max(st.hi, st.x); sX.set(st.x); update(); };
    sX.on((v) => { st.play = false; showPlay(); setX(v); });
    chipRow(R(root, 'fs'), TBL.map((T) => ({ tex: T.t })), 0, (it, i) => {
      st.k = i; st.play = false; showPlay();
      const r = range();
      sX.input.min = r[0]; sX.input.max = r[1];
      st.x = st.lo = st.hi = r[0];
      plot.setView(TBL[i].wide ? { xmin: -PI - 0.3, xmax: PI + 0.3 } : { xmin: -3.3, xmax: 3.3 });
      sX.set(st.x); update();
    });
    R(root, 'full').addEventListener('change', (e) => { st.full = e.target.checked; plot.invalidate(); });
    const bP = R(root, 'play');
    const showPlay = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ なぞる'; };
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      const r = range();
      setX(st.x + dt * 1.1);
      if (st.x >= r[1] - 1e-9) { st.play = false; showPlay(); return false; }
      return true;
    });
    bP.addEventListener('click', () => {
      st.play = !st.play;
      if (st.play) { const r = range(); if (st.x >= r[1] - 1e-9) st.x = r[0]; st.lo = st.hi = st.x; anim.kick(); }
      showPlay();
    });
    curveHandle(plot, () => st.x, (x) => { st.play = false; showPlay(); setX(Math.round(x * 20) / 20); }, (x) => TBL[st.k].f(x));
    function update() {
      const T = TBL[st.k];
      tex(root, 'f', 'f(x)=\\blue{' + T.t + '}');
      tex(root, 'df', "f'(x)=\\amber{" + T.d + '}');
      tex(root, 'pt', 'x=' + fm(st.x) + '\\ \\text{で 傾き }\\teal{' + fm(T.df(st.x), 3) + '}\\ \\to\\ \\text{金の点の高さ}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, T = TBL[st.k], x0 = st.x, y0 = T.f(x0), m = T.df(x0);
      if (T.wide) {
        g.grid({ stepX: H, stepY: 1, labels: false, xlabel: 'x', ylabel: 'y' });
        for (let i = -2; i <= 2; i++) if (i) g.texPx(piTeX(i * H), g.X(i * H), g.Y(0) + 4, { align: 'center', valign: 'top', size: 13, color: c.muted });
        for (let j = -3; j <= 3; j++) if (j && g.Y(j) > 24 && g.Y(j) < g.h - 10) g.texPx(String(j), g.X(0) - 6, g.Y(j), { align: 'right', size: 13, color: c.muted });
        g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
      } else axes(g, {});
      const r = range();
      if (st.full) D.curve(g, T.df, { color: c.amber, width: 2, alpha: 0.45, x0: r[0], x1: r[1] });
      if (st.hi > st.lo) D.curve(g, T.df, { color: c.amber, width: 3.5, x0: st.lo, x1: st.hi });
      D.curve(g, T.f, { color: c.primary, width: 3, x0: r[0], x1: r[1] });
      D.tangent(g, T.f, x0, { df: T.df, point: false });
      if (isFinite(m)) {
        g.line(x0, y0, x0, m, { color: c.amber, width: 1.3, dash: [3, 4], alpha: 0.8 });
        g.dot(x0, m, { r: 6, color: c.amber });
      }
      g.texPx('\\blue{y=f(x)}\\quad\\teal{\\text{接線}}\\quad\\amber{y=f\'(x)}', g.w - 10, g.h - 8, { align: 'right', valign: 'bottom', size: 14 });
    };
    update();
  }

  /* ==========================================================
     4.3(6) チャレンジ：公式タイムアタック
     ========================================================== */
  // s: ステージ(0〜3)、q: 関数、a: 正しい導関数、w: まちがいの選択肢、f/df: グラフ用
  const deg = PI / 180;
  const POOL = [
    { s: 0, q: 'e^x', a: 'e^x', w: ['xe^{x-1}', '\\dfrac{e^x}{x}', 'e^x\\log x'], f: Math.exp, df: Math.exp },
    { s: 0, q: '2^x', a: '2^x\\log2', w: ['x\\cdot2^{x-1}', '2^x', '\\dfrac{2^x}{\\log2}'], f: (x) => Math.pow(2, x), df: (x) => Math.pow(2, x) * Math.LN2 },
    { s: 0, q: '3^x', a: '3^x\\log3', w: ['x\\cdot3^{x-1}', '3^x', '\\dfrac{3^x}{\\log3}'], f: (x) => Math.pow(3, x), df: (x) => Math.pow(3, x) * Math.log(3) },
    { s: 0, q: '\\log x', a: '\\dfrac1x', w: ['\\log x', '\\dfrac{1}{x^2}', '-\\dfrac1x'], f: (x) => Math.log(x), df: (x) => 1 / x },
    { s: 0, q: '\\log_2x', a: '\\dfrac{1}{x\\log2}', w: ['\\dfrac{\\log2}{x}', '\\dfrac1x', '\\dfrac{1}{2x}'], f: (x) => Math.log2(x), df: (x) => 1 / (x * Math.LN2) },
    { s: 0, q: '\\log|x|', a: '\\dfrac1x', w: ['\\dfrac{1}{|x|}', '-\\dfrac1x', '|x|\\log|x|'], f: (x) => Math.log(Math.abs(x)), df: (x) => 1 / x },
    { s: 1, q: '\\sin x', a: '\\cos x', w: ['-\\cos x', '\\sin x', '-\\sin x'], f: Math.sin, df: Math.cos },
    { s: 1, q: '\\cos x', a: '-\\sin x', w: ['\\sin x', '\\cos x', '-\\cos x'], f: Math.cos, df: (x) => -Math.sin(x) },
    { s: 1, q: '3\\sin x', a: '3\\cos x', w: ['-3\\cos x', '\\cos 3x', '3\\sin x'], f: (x) => 3 * Math.sin(x), df: (x) => 3 * Math.cos(x) },
    { s: 1, q: '\\sin x+\\cos x', a: '\\cos x-\\sin x', w: ['\\cos x+\\sin x', '-\\cos x+\\sin x', '-\\cos x-\\sin x'], f: (x) => Math.sin(x) + Math.cos(x), df: (x) => Math.cos(x) - Math.sin(x) },
    { s: 1, q: '-\\cos x', a: '\\sin x', w: ['-\\sin x', '\\cos x', '-\\cos x'], f: (x) => -Math.cos(x), df: Math.sin },
    { s: 1, q: '\\sin x^\\circ', a: '\\dfrac{\\pi}{180}\\cos x^\\circ', w: ['\\cos x^\\circ', '\\dfrac{180}{\\pi}\\cos x^\\circ', '-\\dfrac{\\pi}{180}\\cos x^\\circ'], f: (x) => Math.sin(x * deg), df: (x) => deg * Math.cos(x * deg) },
    { s: 2, q: 'x^5', a: '5x^4', w: ['x^4', '5x^5', '4x^5'], f: (x) => Math.pow(x, 5), df: (x) => 5 * Math.pow(x, 4) },
    { s: 2, q: '2x^3-x', a: '6x^2-1', w: ['6x^2-x', '2x^2-1', '6x^3-1'], f: (x) => 2 * x * x * x - x, df: (x) => 6 * x * x - 1 },
    { s: 2, q: '\\sqrt{x}', a: '\\dfrac{1}{2\\sqrt{x}}', w: ['\\dfrac{\\sqrt{x}}{2}', '\\dfrac{2}{\\sqrt{x}}', '2\\sqrt{x}'], f: Math.sqrt, df: (x) => 1 / (2 * Math.sqrt(x)) },
    { s: 2, q: '\\dfrac1x', a: '-\\dfrac{1}{x^2}', w: ['\\log x', '\\dfrac{1}{x^2}', '-\\dfrac1x'], f: (x) => 1 / x, df: (x) => -1 / (x * x) },
    { s: 2, q: 'x^2+e^x', a: '2x+e^x', w: ['2x+xe^{x-1}', 'x+e^x', '2x'], f: (x) => x * x + Math.exp(x), df: (x) => 2 * x + Math.exp(x) },
    { s: 2, q: 'x+\\log x', a: '1+\\dfrac1x', w: ['\\dfrac1x', '1+\\log x', 'x+\\dfrac1x'], f: (x) => x + Math.log(x), df: (x) => 1 + 1 / x },
    { s: 3, q: '\\sinh x', a: '\\cosh x', w: ['-\\cosh x', '\\sinh x', '-\\sinh x'], f: sinh, df: cosh },
    { s: 3, q: '\\cosh x', a: '\\sinh x', w: ['-\\sinh x', '\\cosh x', '-\\cosh x'], f: cosh, df: sinh },
    { s: 3, q: 'e^{-x}', a: '-e^{-x}', w: ['e^{-x}', 'e^{x}', '-xe^{-x-1}'], f: (x) => Math.exp(-x), df: (x) => -Math.exp(-x) },
    { s: 3, q: '2\\sinh x', a: '2\\cosh x', w: ['-2\\cosh x', '2\\sinh x', '\\cosh 2x'], f: (x) => 2 * sinh(x), df: (x) => 2 * cosh(x) },
    { s: 3, q: '\\cosh x+\\sinh x', a: '\\sinh x+\\cosh x', w: ['\\sinh x-\\cosh x', '\\cosh x-\\sinh x', '-\\sinh x-\\cosh x'], f: (x) => cosh(x) + sinh(x), df: (x) => cosh(x) + sinh(x) },
    { s: 3, q: '\\cosh x-\\sinh x', a: '\\sinh x-\\cosh x', w: ['\\sinh x+\\cosh x', '\\cosh x-\\sinh x', '-\\sinh x-\\cosh x'], f: (x) => cosh(x) - sinh(x), df: (x) => sinh(x) - cosh(x) },
  ];
  const ansList = (s) => POOL.filter((P) => P.s === s).map((P) => "$\\left(" + P.q + "\\right)'=" + P.a + '$').join('<br>');
  const TA_STAGES = [
    { name: '指数・対数', text: '指数関数・対数関数の 6 問。正しい導関数を選ぼう。',
      hint: '$(e^x)\'=e^x$、$(a^x)\'=a^x\\log a$、$(\\log x)\'=\\dfrac1x$、$(\\log_a x)\'=\\dfrac{1}{x\\log a}$。$a^x$ は $x^n$ の公式とは別物（$x$ が肩にある）。',
      answer: () => ansList(0) },
    { name: '三角', text: '三角関数の 6 問。マイナスのつけ忘れに注意！',
      hint: '$(\\sin x)\'=\\cos x$、$(\\cos x)\'=-\\sin x$。度で測った $x^\\circ$ には $\\dfrac{\\pi}{180}$ がつく。',
      answer: () => ansList(1) },
    { name: '多項式と和', text: '多項式・ルート・分数と、和の 6 問。',
      hint: '$(x^n)\'=nx^{n-1}$ は $n$ が分数やマイナスでも使える：$\\sqrt{x}=x^{\\frac12}$、$\\dfrac1x=x^{-1}$。和はそれぞれ微分して足す。',
      answer: () => ansList(2) },
    { name: '双曲線', text: '双曲線関数と $e^{-x}$ の 6 問。',
      hint: '$(\\sinh x)\'=\\cosh x$、$(\\cosh x)\'=\\sinh x$（マイナスはつかない）。$(e^{-x})\'=-e^{-x}$。',
      answer: () => ansList(3) },
    { name: '60秒アタック', text: '全部の公式をまぜた 60 秒タイムアタック！ 正解 7 問で★1、13 問で★2、20 問で★3。',
      hint: 'まちがえると正解が表示されて 1 秒ほど止まる。あせらず、確実に。公式は (5) のまとめの表で復習しよう。',
      answer: '公式の一覧は、この節の「覚える｜この節のまとめ」の表を見よう。<br>$(e^x)\'=e^x,\\ (a^x)\'=a^x\\log a,\\ (\\log x)\'=\\dfrac1x,\\ (\\sin x)\'=\\cos x,\\ (\\cos x)\'=-\\sin x,\\ (\\sinh x)\'=\\cosh x,\\ (\\cosh x)\'=\\sinh x$' },
  ];
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function initGameTA() {
    const root = $id('w-game-ta');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.3, xmax: 3.3, ymin: -3.2, ymax: 3.6, ratio: [0.62, 0.36] });
    const DUR = 60, BEST_KEY = 'calc2026-diff-4-3-ta';
    const getBest = () => { try { return +(localStorage.getItem(BEST_KEY) || 0); } catch (e) { return 0; } };
    const setBest = (v) => { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* noop */ } };
    const ctl = root.querySelector('.controls');
    const row = el('div', 'btn-row');
    const bStart = el('button', 'btn primary', 'スタート'), bNext = el('button', 'btn', '次のステージへ →');
    [bStart, bNext].forEach((b) => { b.type = 'button'; row.append(b); });
    ctl.append(row);
    const note = el('p', 'note-txt', 'グラフの青は問題の関数、答えると金色で導関数のグラフが出ます。傾きと高さを見比べて、答えを確かめよう。');
    note.style.margin = '10px 0 0';
    ctl.append(note);
    const box = R(root, 'ans'), qBox = R(root, 'q');
    const btns = [0, 1, 2, 3].map(function () {
      const b = el('button', 'chip ta-chip'); b.type = 'button';
      const s = el('span'); b.append(s); b._s = s;
      b.addEventListener('click', () => answer(b));
      box.append(b); return b;
    });
    const st = { run: false, list: [], i: 0, cur: null, miss: 0, score: 0, t: 0, wait: 0, reveal: false, done: false };
    const conf = L.game.Confetti(root, plot);
    let game = null;
    game = L.game.GameShell(root, { key: '4-3:game', stages: TA_STAGES, idle: 'スタートを押すと始まります',
      onStage(k) { reset(k); typeset(R(root, 'mission')); } });
    // 「式」の行は使わない
    const fr = R(root, 'formula'); if (fr) fr.closest('.row').remove();
    const timed = () => game.k === 4;
    function showBest() { R(root, 'best').textContent = timed() ? getBest() + ' 問（60 秒）' : '—'; }
    function showProg() {
      R(root, 'prog').textContent = timed() ? '正解 ' + st.score + ' 問（まちがい ' + st.miss + '）'
        : '答えた数 ' + st.i + ' / ' + (st.list.length || 6) + ' 問（まちがい ' + st.miss + '）';
    }
    function showTime() {
      const t = timed() ? Math.max(0, DUR - st.t) : st.t;
      R(root, 'time').textContent = (timed() ? '残り ' : '') + t.toFixed(1) + ' 秒';
      R(root, 'bar').style.width = (timed() ? 100 * Math.max(0, DUR - st.t) / DUR : 100) + '%';
    }
    function reset() {
      st.run = false; st.done = false; st.list = []; st.i = 0; st.cur = null; st.miss = 0; st.score = 0; st.t = 0; st.wait = 0; st.reveal = false;
      btns.forEach((b) => { b.disabled = true; b.classList.remove('ok', 'ng'); b._s.textContent = ''; b._ok = false; });
      qBox.textContent = 'スタートを押すと問題が出ます';
      bStart.textContent = 'スタート'; bStart.disabled = false; bNext.hidden = true;
      showBest(); showProg(); showTime(); plot.invalidate();
    }
    function ask(P) {
      st.cur = P; st.reveal = false;
      setTex(qBox, '\\left(' + P.q + "\\right)'=\\ ?");
      const opts = shuffle([{ t: P.a, ok: true }].concat(P.w.map((t) => ({ t, ok: false }))));
      btns.forEach((b, i) => { b.disabled = false; b.classList.remove('ok', 'ng'); b._ok = opts[i].ok; setTex(b._s, opts[i].t); });
      showProg(); plot.invalidate();
    }
    function next() {
      if (timed()) {
        let P;
        do { P = POOL[Math.floor(Math.random() * POOL.length)]; } while (st.cur && P === st.cur);
        ask(P);
      } else if (st.i < st.list.length) ask(st.list[st.i]);
      else finish();
    }
    function start() {
      reset();
      st.run = true;
      st.list = timed() ? [] : shuffle(POOL.filter((P) => P.s === game.k));
      bStart.textContent = 'やり直す';
      game.result('挑戦中…');
      next(); anim.kick();
    }
    function answer(b) {
      if (!st.run || st.wait > 0 || !st.cur) return;
      st.reveal = true;
      btns.forEach((x) => { x.disabled = true; if (x._ok) x.classList.add('ok'); });
      if (b._ok) { st.score++; st.wait = 0.5; game.result('○ 正解！', 'hit'); }
      else { st.miss++; b.classList.add('ng'); st.wait = 1.4; game.result('× 緑のボタンが正解。金色の導関数のグラフで確かめよう', 'miss'); }
      if (!timed()) st.i++;
      showProg(); plot.invalidate();
    }
    function finish() {
      st.run = false; st.done = true; st.cur = st.cur || null;
      btns.forEach((b) => { b.disabled = true; });
      bStart.textContent = 'もう一度';
      let n;
      if (timed()) {
        const best = getBest(), nb = st.score > best;
        if (nb) setBest(st.score);
        n = st.score >= 20 ? 3 : st.score >= 13 ? 2 : st.score >= 7 ? 1 : 0;
        qBox.textContent = 'タイムアップ！ ' + st.score + ' 問正解' + (nb ? '（最高記録！）' : '');
        game.result(n ? '⏱ ' + st.score + ' 問正解 ' + L.game.starStr(n) + (nb ? '　🎉 最高記録を更新' : '') : st.score + ' 問正解。7 問で★1。公式を復習してもう一度！', n ? 'hit' : 'miss');
        showBest();
      } else {
        n = st.miss === 0 ? 3 : st.miss <= 2 ? 2 : 1;
        qBox.textContent = 'ステージクリア！ ' + st.t.toFixed(1) + ' 秒';
        game.result('🏁 クリア ' + L.game.starStr(n) + '（まちがい ' + st.miss + ' 問、' + st.t.toFixed(1) + ' 秒）' + (n < 3 ? '　まちがい 0 で★3！' : ''), 'hit');
        bNext.hidden = game.k >= TA_STAGES.length - 1;
      }
      if (n) game.award(n);
      if (n === 3) conf.fire(plot.w / 2, plot.h / 3);
      showProg(); plot.invalidate();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.run) return false;
      st.t += dt; showTime();
      if (st.wait > 0) { st.wait -= dt; if (st.wait <= 0) { st.wait = 0; if (!(timed() && st.t >= DUR)) next(); } }
      if (timed() && st.t >= DUR) { finish(); return false; }
      return st.run;
    });
    bStart.addEventListener('click', start);
    bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, TA_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, P = st.cur;
      axes(g, {});
      if (P) {
        if (st.reveal) D.curve(g, P.df, { color: c.amber, width: 3 });
        D.curve(g, P.f, { color: c.primary, width: 3 });
        g.texPx('\\blue{y=' + P.q + '}', g.w - 10, g.h - (st.reveal ? 34 : 8), { align: 'right', valign: 'bottom', size: 15 });
        if (st.reveal) g.texPx('\\amber{y=' + P.a + '}', g.w - 10, g.h - 8, { align: 'right', valign: 'bottom', size: 15 });
      }
      conf.draw(g);
    };
    game.setStage(0);
  }

  D.boot([
    [initExp, 'w-exp'],
    [initLog, 'w-log'],
    [initSin, 'w-sin'],
    [initHyp, 'w-hyp'],
    [initHypCurve, 'w-hypc'],
    [initCat, 'w-cat'],
    [initTable, 'w-table'],
    [initGameTA, 'w-game-ta'],
  ]);
})();
