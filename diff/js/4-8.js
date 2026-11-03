/* 第4章 4.8節 極限のくらべ方 — 図
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   niceStep(span, n) … 目盛りの間かく（1, 2, 5 × 10^k）
 *   axes(g, o)        … 方眼と目盛り（目盛りの数字もすべて TeX。o.yfmt で縦軸の書き方を変える）
 *   chipRow(...)      … 選択ボタンの列
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
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
  function niceStep(span, n) {
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  const decOf = (step) => Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
  // 方眼と目盛り（目盛りの文字は TeX）
  function axes(g, o) {
    o = o || {};
    const c = g.c;
    const sx = o.sx || niceStep(g.xmax - g.xmin, Math.max(3, g.w / 70));
    const sy = o.sy || niceStep(g.ymax - g.ymin, Math.max(3, g.h / 50));
    g.grid({ stepX: sx, stepY: sy, labels: false, xlabel: o.xlabel || 'x', ylabel: o.ylabel || 'y' });
    const dx = decOf(sx), dy = decOf(sy);
    const hasX0 = g.ymin <= 0 && g.ymax >= 0, y0 = hasX0 ? Math.min(g.Y(0), g.h - 18) : g.h - 18;
    for (let i = Math.ceil(g.xmin / sx - 1e-9); i * sx <= g.xmax + 1e-9; i++) {
      if (i === 0) continue;
      const px = g.X(i * sx);
      if (px > g.w - 24 || px < 14) continue;
      g.texPx(o.xfmt ? o.xfmt(i * sx) : num(i * sx, dx), px, y0 + 4, { align: 'center', valign: 'top', size: 12, color: c.muted });
    }
    const hasY0 = g.xmin <= 0 && g.xmax >= 0, x0 = hasY0 ? g.X(0) : 6;
    const inR = x0 < 40;
    for (let j = Math.ceil(g.ymin / sy - 1e-9); j * sy <= g.ymax + 1e-9; j++) {
      if (!j) continue;
      const py = g.Y(j * sy);
      if (py < 24 || py > g.h - 12) continue;
      g.texPx(o.yfmt ? o.yfmt(j * sy) : num(j * sy, dy), inR ? x0 + 5 : x0 - 6, py, { align: inR ? 'left' : 'right', size: 12, color: c.muted });
    }
    if (hasX0 && hasY0) g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 12, color: c.muted });
  }
  // 小さい数・大きい数を TeX で（例 3.7\times10^{-40}）
  function sciTeX(l10) { // l10 = log10(値)
    if (!isFinite(l10)) return l10 > 0 ? '\\infty' : '0';
    if (l10 > -3 && l10 < 5) { const v = Math.pow(10, l10); return num(v, v < 0.01 ? 5 : v < 10 ? 3 : 1); }
    let e = Math.floor(l10), m = Math.pow(10, l10 - e);
    if (m >= 9.995) { m = 1; e++; }
    return m.toFixed(2) + '\\times10^{' + e + '}';
  }

  /* ==========================================================
     4.8(1) 0/0 の形の極限 ＝ 原点での接線の傾き
     ========================================================== */
  function initZero() {
    const root = $id('w-zero');
    const MODES = [
      { tex: '\\frac{\\sin x}{x}', f: Math.sin, ftex: 'y=\\sin x', rT: '\\dfrac{\\sin h}{h}', lim: 1, limT: '1' },
      { tex: '\\frac{e^x-1}{x}', f: (x) => Math.exp(x) - 1, ftex: 'y=e^x-1', rT: '\\dfrac{e^h-1}{h}', lim: 1, limT: '1' },
      { tex: '\\frac{\\log(1+x)}{x}', f: (x) => (x > -1 ? Math.log(1 + x) : NaN), ftex: 'y=\\log(1+x)', rT: '\\dfrac{\\log(1+h)}{h}', lim: 1, limT: '1' },
      { tex: '\\frac{1-\\cos x}{x^2}', f: (x) => 1 - Math.cos(x), ftex: 'y=1-\\cos x', rT: '\\dfrac{1-\\cos h}{h^2}', lim: 0.5, limT: '\\frac12', sq: true },
    ];
    const st = { k: 0, s: 0, neg: false, zoom: false };
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.2, xmax: 3, equal: true, yc: 0.4, ratio: [0.85, 0.5] });
    const ctl = root.querySelector('.controls');
    const hOf = () => (st.neg ? -1 : 1) * 1.5 * Math.pow(10, -3 * st.s / 100);
    const sH = slider(ctl, { tex: '\\red{|h|}', min: 0, max: 100, step: 1, value: 0, color: 'accent', aria: 'h の大きさ（右へ動かすほど小さく）', fmt: (v) => fm(1.5 * Math.pow(10, -3 * v / 100), 4) });
    sH.on((v) => { st.s = v; update(); });
    R(root, 'neg').addEventListener('change', (e) => { st.neg = e.target.checked; sH.set(st.s); update(); });
    R(root, 'zoom').addEventListener('change', (e) => { st.zoom = e.target.checked; update(); });
    chipRow(R(root, 'fs'), MODES.map((M) => ({ tex: M.tex.replace('\\frac', '\\dfrac') })), 0, (it, i) => { st.k = i; update(); });
    function view() {
      const M = MODES[st.k], W = st.zoom ? Math.max(Math.abs(hOf()) * 1.6, 0.003) : 2.5;
      if (M.sq) return { equal: false, xmin: -W * 0.9, xmax: W * 1.25, ymin: -0.12 * W * W * 0.6, ymax: 0.62 * W * W * 0.6 + (st.zoom ? 0 : 0.2) };
      return { equal: true, xmin: -W * 0.9, xmax: W * 1.2, yc: 0.15 * W };
    }
    function update() {
      const M = MODES[st.k], h = hOf(), r = M.f(h) / (M.sq ? h * h : h);
      plot.setView(view());
      tex(root, 'h', '\\red{h}=' + fm(h, 4));
      tex(root, 'r', M.rT.replace(/h/g, '\\red{h}') + '=' + r.toFixed(6));
      tex(root, 'lim', '\\displaystyle\\lim_{x\\to0}' + M.tex.replace('\\frac', '\\dfrac') + '=' + M.limT);
      setHTML(R(root, 'how'), M.sq
        ? '青は $1-\\cos x$、緑の点線は $\\frac{x^2}{2}$。$h$ を小さくすると2つの比が $\\frac12$ に近づく。「拡大」すると、どこまで拡大しても2つは重なって見える。'
        : '赤い割線（原点と $(h,\\ f(h))$ を結ぶ直線）の傾きが、この比。$h\\to0$ で割線は緑の<b>接線 $y=x$</b> に近づくので、比は接線の傾き $1$ に近づく。');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, M = MODES[st.k], h = hOf();
      axes(g);
      if (M.sq) {
        D.curve(g, (x) => x * x / 2, { color: c.teal, width: 2.5, dash: [7, 5] });
        D.curve(g, M.f, { color: c.primary, width: 3 });
        g.line(h, 0, h, M.f(h), { color: c.accent, width: 2, dash: [4, 4] });
        g.dot(h, h * h / 2, { r: 4, color: c.teal });
        g.dot(h, M.f(h), { r: 5.5, color: c.accent });
        const xl = g.xmax * 0.55;
        g.tex(M.ftex, xl, M.f(xl), { align: 'left', valign: 'top', dx: 12, dy: 14, size: 14, color: c.primary, avoid: true });
        g.tex('y=\\frac{x^2}{2}', -g.xmax * 0.55, g.ymax * 0.82, { align: 'center', size: 14, color: c.teal, avoid: true });
        return;
      }
      g.line(g.xmin, g.xmin, g.xmax, g.xmax, { color: c.teal, width: 2.5 });
      D.curve(g, M.f, { color: c.primary, width: 3, x0: st.k === 2 ? Math.max(g.xmin, -0.999) : g.xmin });
      D.secant(g, M.f, 0, h, {});
      g.dot(0, 0, { r: 5, color: c.text });
      const W = g.xmax;
      { const v = Math.min(g.xmax, g.ymax) * 0.8; g.tex('y=x', v, v, { align: 'right', dx: -12, size: 14, color: c.teal, avoid: true }); }
      const xl = st.k === 1 ? -W * 0.7 : W * 0.85;
      g.tex(M.ftex, xl, M.f(xl), st.k === 1 ? { align: 'left', valign: 'bottom', dy: -6, size: 14, color: c.primary, avoid: true } : { align: 'right', valign: 'top', dy: 8, size: 14, color: c.primary, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.8(2) 増え方のレース：log x ≪ x^a ≪ e^x
     ========================================================== */
  function initRace() {
    const root = $id('w-race');
    const LE = Math.LOG10E;
    const st = { k: 1, a: 2, log: false };
    const FS = [
      { tex: '\\log x', col: 'violet', v: (x) => Math.log(x), l: (x) => (x > 1 ? Math.log10(Math.log(x)) : NaN) },
      { tex: '\\sqrt{x}', col: 'brown', v: (x) => Math.sqrt(x), l: (x) => 0.5 * Math.log10(x) },
      { tex: 'x', col: 'muted', v: (x) => x, l: (x) => Math.log10(x) },
      { tex: null, col: 'primary', v: (x) => Math.pow(x, st.a), l: (x) => st.a * Math.log10(x) },
      { tex: 'e^x', col: 'accent', v: (x) => Math.exp(x), l: (x) => x * LE },
    ];
    const tx = (F) => F.tex || 'x^{' + st.a + '}';
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 10, ymin: -1, ymax: 10, ratio: [0.9, 0.52] });
    const ctl = root.querySelector('.controls');
    const X = () => Math.round(Math.pow(10, st.k) * 10) / 10;
    const sK = slider(ctl, { tex: 'X', min: 0.5, max: 3, step: 0.01, value: 1, aria: '横軸の右端 X（ズームアウト）', fmt: (v) => String(Math.round(Math.pow(10, v) * 10) / 10) });
    sK.on((v) => { st.k = v; update(); });
    chipRow(R(root, 'pw'), [2, 5, 10].map((a) => ({ tex: 'x^{' + a + '}', a })), 0, (it) => { st.a = it.a; update(); });
    R(root, 'log').addEventListener('change', (e) => { st.log = e.target.checked; update(); });
    function view() {
      const Xm = X();
      if (st.log) return { xmin: -Xm * 0.04, xmax: Xm, ymin: -1, ymax: Math.max(3, 1.25 * st.a * Math.log10(Xm) + 1) };
      return { xmin: -Xm * 0.04, xmax: Xm, ymin: -Xm * 0.06, ymax: Xm };
    }
    function update() {
      plot.setView(view());
      const Xm = X();
      const order = FS.map((F) => ({ F, l: F.l(Xm) })).map((o) => (isNaN(o.l) ? { F: o.F, l: Math.log10(Math.max(1e-9, o.F.v(Xm))), neg: o.F.v(Xm) <= 0 } : o));
      order.sort((p, q) => (p.neg ? -1e9 : p.l) - (q.neg ? -1e9 : q.l));
      tex(root, 'rank', order.map((o) => '\\' + (o.F.col === 'muted' ? 'slate' : o.F.col === 'primary' ? 'blue' : o.F.col === 'accent' ? 'red' : o.F.col) + '{' + tx(o.F) + '}').join('\\lt '));
      tex(root, 'r1', '\\dfrac{x^{' + st.a + '}}{e^x}\\approx' + sciTeX(st.a * Math.log10(Xm) - Xm * LE));
      tex(root, 'r2', '\\dfrac{\\log x}{x}\\approx' + sciTeX(Math.log10(Math.log(Xm) / Xm)));
      const cross = st.a === 10 ? '$x^{10}$ は $x\\approx35.8$ まで $e^x$ より大きいが、そこで抜かれる。' : '';
      setHTML(R(root, 'how'), st.log
        ? '縦軸は $1,\\ 10,\\ 100,\\ \\ldots$ と10倍ずつの目盛り。$e^x$ だけが<b>まっすぐ</b>上がり、ほかはだんだん寝ていく。' + cross
        : '$X$ を大きくする（ズームアウト）と、$e^x$ と $x^{' + st.a + '}$ はすぐ上に消え、$\\log x$ と $\\sqrt{x}$ は床にはりつく。' + cross);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, Xm = X();
      axes(g, st.log ? { sy: Math.max(1, niceStep(g.ymax + 1, 5)), yfmt: (v) => '10^{' + num(v, 0) + '}' } : {});
      const lab = [];
      FS.forEach((F) => {
        const fy = st.log ? F.l : F.v, col = c[F.col];
        D.curve(g, fy, { color: col, width: F.col === 'muted' ? 2.5 : 3, x0: Xm * 1e-3, n: 500 });
        const yr = fy(Xm);
        if (isFinite(yr) && yr <= g.ymax - (g.ymax - g.ymin) * 0.1) lab.push([tx(F), Xm, yr, col, 'r']);
        else { // 上に出るところを探す
          let lo = Xm * 1e-3, hi = Xm;
          for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (fy(m) > g.ymax || !isFinite(fy(m))) hi = m; else lo = m; }
          lab.push([tx(F), lo, g.ymax, col, lo > Xm * 0.85 ? 'tr' : 't']);
        }
      });
      lab.forEach((q) => g.tex(q[0], q[1], q[2], q[4] === 'r'
        ? { align: 'right', valign: 'bottom', dx: -4, dy: -3, size: 14, color: q[3], avoid: true }
        : { align: q[4] === 'tr' ? 'right' : 'left', valign: 'top', dx: q[4] === 'tr' ? -14 : 6, dy: 4, size: 14, color: q[3], avoid: true }));
    };
    update();
  }

  /* ==========================================================
     4.8(4) lerp のカメラ：残りの距離が毎回 (1−k) 倍
     ========================================================== */
  function initLerp() {
    const root = $id('w-lerp');
    const st = { k: 0.2 };
    const N = 30;
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: N + 1, ymin: -14, ymax: 126, ratio: [0.7, 0.4] });
    const sK = slider(root.querySelector('.controls'), { tex: '\\red{k}', min: 0.05, max: 0.6, step: 0.01, value: 0.2, color: 'accent', aria: '1 フレームで近づく割合 k' });
    sK.on((v) => { st.k = v; update(); });
    function update() {
      const k = st.k, n1 = Math.ceil(Math.log(0.01) / Math.log(1 - k));
      tex(root, 'rule', 'd_{n+1}=(1-\\red{' + fm(k) + '})\\,d_n=' + fm(1 - k) + '\\,d_n');
      tex(root, 'd10', 'd_{10}=100\\times' + fm(1 - k) + '^{10}\\approx' + fm(100 * Math.pow(1 - k, 10), 3));
      tex(root, 'n1', 'n=' + n1 + '\\ \\text{フレーム（それでも }d_n\\gt0\\text{）}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, k = st.k;
      axes(g, { sx: 5, sy: 20, xlabel: 'n', ylabel: 'd_n' });
      g.line(g.xmin, 0, g.xmax, 0, { color: c.teal, width: 2 });
      for (let n = 0; n <= N; n++) {
        const d = 100 * Math.pow(1 - k, n);
        g.line(n, 0, n, d, { color: c.accent, width: 2, alpha: 0.35 });
        g.dot(n, d, { r: 4, color: c.accent });
      }
      g.tex('\\text{目標}', N * 0.8, 0, { align: 'center', valign: 'bottom', dy: -6, size: 13, color: c.teal });
    };
    update();
  }

  D.boot([
    [initZero, 'w-zero'],
    [initRace, 'w-race'],
    [initLerp, 'w-lerp'],
  ]);
})();
