/* 第4章 4.5節 増減と極値 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   chipRow(box, items, cur, onPick) … 関数を選ぶボタンの列
 *   poly / dpoly / polyTeX            … 係数の配列（次数の高い順）で多項式を扱う
 *   signBands(df, a, b)               … f' の符号が同じ区間に分ける
 *   drawBands(g, bands, lab)          … 上り坂（青）・下り坂（赤）の区間に色をつける
 *   drawCan(g, …) / drawBox(g, …)     … 缶・箱の見取り図（ピクセル座標で描く）
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const fm = (v, d) => D.fmt(v, d == null ? 2 : d);
  const snap = (v, s) => Math.round(v / s) * s;
  const setHTML = (node, h) => { if (node._h === h) return; node._h = h; node.innerHTML = h; typeset(node); };
  // ぴったりの値なら「=」、丸めたなら「≈」
  const eqv = (v, d) => (Math.abs(v - Math.round(v * Math.pow(10, d)) / Math.pow(10, d)) < 1e-9 ? '=' : '\\approx') + fm(v, d);

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

  /* ---------- 多項式（係数は次数の高い順） ---------- */
  const poly = (cs) => (x) => cs.reduce((s, c) => s * x + c, 0);
  const dpoly = (cs) => { const n = cs.length - 1; return n ? cs.slice(0, n).map((c, i) => c * (n - i)) : [0]; };
  function polyTeX(cs, v) {
    v = v || 'x';
    const n = cs.length - 1;
    let s = '';
    cs.forEach(function (c, i) {
      const p = n - i;
      if (!c) return;
      const a = Math.abs(c);
      s += (c < 0 ? '-' : s ? '+' : '') + (a === 1 && p > 0 ? '' : num(a, 3)) + (p === 0 ? '' : p === 1 ? v : v + '^' + p);
    });
    return s || '0';
  }
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; };

  /* ---------- 符号の区間 ---------- */
  function signBands(df, a, b) {
    const N = 480, out = [];
    let cur = null;
    for (let i = 0; i <= N; i++) {
      const x = a + (b - a) * i / N, v = df(x), s = v > 1e-12 ? 1 : v < -1e-12 ? -1 : 0;
      if (!s) continue;
      if (!cur || cur.s !== s) { if (cur) { cur.b = x - (b - a) / N / 2; out.push(cur); } cur = { a: cur ? x - (b - a) / N / 2 : a, s }; }
    }
    if (cur) { cur.b = b; out.push(cur); }
    return out;
  }
  function drawBands(g, bands, lab) {
    const c = g.c, ctx = g.ctx;
    bands.forEach(function (bd) {
      const x0 = g.X(Math.max(bd.a, g.xmin)), x1 = g.X(Math.min(bd.b, g.xmax));
      if (x1 - x0 < 1) return;
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = bd.s > 0 ? c.primary : c.accent;
      ctx.fillRect(x0, 0, x1 - x0, g.h);
      ctx.restore();
      if (lab && x1 - x0 > (lab === 'arrow' ? 26 : 74)) {
        const t = lab === 'arrow' ? (bd.s > 0 ? '\\nearrow' : '\\searrow') : (bd.s > 0 ? '\\text{上り坂 }\\nearrow' : '\\text{下り坂 }\\searrow');
        g.texPx(t, (x0 + x1) / 2, lab === 'arrow' ? 26 : 34, { align: 'center', valign: 'top', size: lab === 'arrow' ? 18 : 13, color: bd.s > 0 ? c.primary : c.accent });
      }
    });
  }

  /* ==========================================================
     4.5(1) 傾きの符号と増減
     ========================================================== */
  const SIGN_FNS = [
    { tex: 'x^3-3x+1', cs: [1, 0, -3, 1], x: [-2.4, 2.4], y: [-2.6, 4.6], dy: [-4.5, 11], sy: 1, dsy: 3 },
    { tex: 'x^4-2x^2', cs: [1, 0, -2, 0, 0], x: [-1.9, 1.9], y: [-1.6, 3.4], dy: [-6, 6], sy: 1, dsy: 2 },
    { tex: '-x^2+4x+5', cs: [-1, 4, 5], x: [-1.5, 5.5], y: [-3, 11], dy: [-8, 8], sy: 2, dsy: 2 },
    { tex: 'x^3', cs: [1, 0, 0, 0], x: [-2, 2], y: [-4.5, 4.5], dy: [-2, 10], sy: 2, dsy: 2 },
  ];
  function initSign() {
    const root = $id('w-sign');
    const cvs = root.querySelectorAll('canvas');
    const pf = new Plot(cvs[0], { xmin: -2.4, xmax: 2.4, ymin: -2.6, ymax: 4.6, ratio: [0.62, 0.34] });
    const pd = new Plot(cvs[1], { xmin: -2.4, xmax: 2.4, ymin: -4.5, ymax: 11, ratio: [0.56, 0.3] });
    const st = { k: 0, x: -2, play: false };
    const P = () => SIGN_FNS[st.k];
    let F = poly(P().cs), DF = poly(dpoly(P().cs)), bands = [];
    const sx = slider(root.querySelector('.controls'), { tex: '\\teal{x}', min: -2.3, max: 2.3, step: 0.05, value: -2, color: 'teal', aria: '点の x 座標', fmt: (v) => num(v, 2) });
    const lim = () => [P().x[0] + 0.1, P().x[1] - 0.1];
    function setX(x) { const l = lim(); st.x = clamp(snap(x, 0.05), l[0], l[1]); update(); }
    sx.on((v) => { stop(); setX(v); });
    function setK(k) {
      st.k = k; const p = P();
      F = poly(p.cs); DF = poly(dpoly(p.cs));
      bands = signBands(DF, p.x[0], p.x[1]);
      const l = lim(); sx.input.min = l[0]; sx.input.max = l[1];
      pf.setView({ xmin: p.x[0], xmax: p.x[1], ymin: p.y[0], ymax: p.y[1] });
      pd.setView({ xmin: p.x[0], xmax: p.x[1], ymin: p.dy[0], ymax: p.dy[1] });
      stop(); setX(l[0]);
    }
    chipRow(R(root, 'fns'), SIGN_FNS, 0, (it, i) => setK(i));
    const bPlay = R(root, 'play');
    const showPlay = () => { bPlay.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    const stop = () => { if (st.play) { st.play = false; showPlay(); } };
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      const l = lim(), nx = st.x + dt * (l[1] - l[0]) / 6;
      if (nx >= l[1]) { st.x = l[1]; st.play = false; showPlay(); } else st.x = nx;
      update();
      return st.play;
    });
    bPlay.addEventListener('click', () => {
      const l = lim();
      st.play = !st.play;
      if (st.play && st.x >= l[1] - 1e-6) st.x = l[0];
      showPlay(); if (st.play) anim.kick();
    });
    pf.addHandle({ get x() { return st.x; }, get y() { return F(st.x); }, get color() { return pf.c ? pf.c.teal : '#198'; }, r: 8, drag(x) { stop(); setX(x); } });
    pd.addHandle({ get x() { return st.x; }, get y() { return DF(st.x); }, get color() { return pd.c ? pd.c.amber : '#c80'; }, r: 7, drag(x) { stop(); setX(x); } });
    function update() {
      const p = P(), x = st.x, m = DF(x);
      sx.set(x);
      tex(root, 'eq', '\\blue{f(x)=' + p.tex + '},\\quad \\amber{f\'(x)=' + polyTeX(dpoly(p.cs)) + '}');
      tex(root, 'm', '\\amber{f\'(' + num(x, 2) + ')' + eqv(m, 2) + '}');
      setHTML(R(root, 'how'), Math.abs(m) < 0.03
        ? '<b>接線が水平</b>：$f\'(x)=0$。山の頂上・谷の底（または一瞬だけ水平になるところ）'
        : m > 0 ? '<b>上り坂</b>：$f\'(x)\\gt0$ なので $f(x)$ は<b>増加</b>している'
          : '<b>下り坂</b>：$f\'(x)\\lt0$ なので $f(x)$ は<b>減少</b>している');
      pf.invalidate(); pd.invalidate();
    }
    pf.draw = function (g) {
      const c = g.c, x = st.x;
      drawBands(g, bands, 'word');
      g.grid({ step: 1, stepY: P().sy, xlabel: 'x', ylabel: 'y' });
      g.line(x, g.ymin, x, g.ymax, { color: c.muted, width: 1.2, dash: [4, 4] });
      D.curve(g, F, { color: c.primary, width: 3.5 });
      D.tangent(g, F, x, { df: DF, width: 2.5, point: false });
    };
    pd.draw = function (g) {
      const c = g.c, x = st.x;
      drawBands(g, bands, null);
      g.grid({ step: 1, stepY: P().dsy, xlabel: 'x', ylabel: 'y' });
      g.line(x, g.ymin, x, g.ymax, { color: c.muted, width: 1.2, dash: [4, 4] });
      D.curve(g, DF, { color: c.amber, width: 3 });
      g.line(x, 0, x, DF(x), { color: c.amber, width: 3 });
    };
    setK(0);
  }

  /* ==========================================================
     4.5(2) 増減表を作る
     ========================================================== */
  // roots: f'(x)=0 の解（TeX つき）。fact: f'(x) を因数分解した形
  const TABLE_FNS = [
    { tex: 'x^3-3x+1', cs: [1, 0, -3, 1], fact: '3(x+1)(x-1)', roots: [[-1, '-1'], [1, '1']], x: [-2.5, 2.5], y: [-2.6, 4.6], sy: 1 },
    { tex: '2x^3-3x^2+1', cs: [2, -3, 0, 1], fact: '6x(x-1)', roots: [[0, '0'], [1, '1']], x: [-0.9, 1.9], y: [-1.3, 2.5], sx: 0.5, sy: 0.5 },
    { tex: '-x^3+3x^2', cs: [-1, 3, 0, 0], fact: '-3x(x-2)', roots: [[0, '0'], [2, '2']], x: [-1.3, 3.3], y: [-2.6, 6.6], sy: 1 },
    { tex: 'x^4-2x^2', cs: [1, 0, -2, 0, 0], fact: '4x(x+1)(x-1)', roots: [[-1, '-1'], [0, '0'], [1, '1']], x: [-1.8, 1.8], y: [-1.6, 3.4], sy: 1 },
    { tex: 'x^4-4x^3', cs: [1, -4, 0, 0, 0], fact: '4x^2(x-3)', roots: [[0, '0'], [3, '3']], x: [-1.4, 4.4], y: [-32, 14], sy: 10 },
    { tex: 'x^3', cs: [1, 0, 0, 0], fact: '', roots: [[0, '0']], x: [-2, 2], y: [-5, 5], sy: 1 },
    { label: '自分で作る（3次）', custom: true },
  ];
  // 整数係数の 2 次以下の方程式 A x^2 + B x + C = 0 の実数解（TeX つき）
  function solveInt(A, B, C) {
    if (!A) {
      if (!B) return [];
      const r = -C / B;
      return [{ x: r, tex: D.fracTeX(r, Math.abs(B)), rat: true }];
    }
    const disc = B * B - 4 * A * C;
    if (disc < 0) return [];
    if (disc === 0) { const r = -B / (2 * A); return [{ x: r, tex: D.fracTeX(r, 12), rat: true }]; }
    const sq = Math.round(Math.sqrt(disc));
    if (sq * sq === disc) {
      return [(-B - sq) / (2 * A), (-B + sq) / (2 * A)].sort((a, b) => a - b).map((r) => ({ x: r, tex: D.fracTeX(r, 12), rat: true }));
    }
    // disc = k^2 m（m は平方因子なし）
    let k = 1;
    for (let t = 2; t * t <= disc; t++) while ((disc / (k * k)) % (t * t) === 0 && disc % (k * k * t * t) === 0) k *= t;
    const m = disc / (k * k);
    let p = -B, q = k, d = 2 * A;
    if (d < 0) { p = -p; d = -d; }
    const gg = gcd(gcd(p, q), d); p /= gg; q /= gg; d /= gg;
    const sq2 = (q === 1 ? '' : q) + '\\sqrt{' + m + '}';
    const T = (s) => {
      if (d === 1) return (p ? p : '') + (s < 0 ? '-' : p ? '+' : '') + sq2;
      if (!p) return (s < 0 ? '-' : '') + '\\frac{' + sq2 + '}{' + d + '}';
      return '\\frac{' + p + (s < 0 ? '-' : '+') + sq2 + '}{' + d + '}';
    };
    return [-1, 1].map((s) => ({ x: (p + s * q * Math.sqrt(m)) / d, tex: T(s), rat: false }));
  }
  function factorTeX(A, rs, dbl) {
    // 整数の解だけのときに A(x-r1)(x-r2) の形にする（dbl：重解）
    if (!rs.length || rs.some((r) => !r.rat || !Number.isInteger(r.x))) return '';
    const lead = A === 1 ? '' : A === -1 ? '-' : String(A);
    const part = (r) => (r === 0 ? 'x' : '(x' + (r > 0 ? '-' + r : '+' + -r) + ')');
    let parts;
    if (dbl) parts = [part(rs[0].x) + '^2'];
    else parts = rs.map((r) => part(r.x));
    parts.sort((a, b) => (a === 'x' || a === 'x^2' ? -1 : b === 'x' || b === 'x^2' ? 1 : 0));
    return lead + parts.join('');
  }
  function niceStep(span) {
    const raw = span / 7, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  // 区間の中から、代入しやすい数を1つ選ぶ
  function testPoint(lo, hi) {
    if (!isFinite(lo) && !isFinite(hi)) return 0;
    if (!isFinite(lo)) return Number.isInteger(hi) ? hi - 1 : Math.floor(hi);
    if (!isFinite(hi)) return Number.isInteger(lo) ? lo + 1 : Math.ceil(lo);
    const mid = (lo + hi) / 2;
    for (const s of [1, 0.5, 0.25, 0.1]) {
      const a = Math.floor(lo / s + 1e-9) + 1, b = Math.ceil(hi / s - 1e-9) - 1;
      if (a <= b) { let best = a; for (let k = a; k <= b; k++) if (Math.abs(k * s - mid) < Math.abs(best * s - mid)) best = k; return +(best * s).toFixed(2); }
    }
    return +mid.toFixed(2);
  }
  function initTable() {
    const root = $id('w-table');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2.5, xmax: 2.5, ymin: -2.6, ymax: 4.6, ratio: [0.7, 0.42] });
    const st = { k: 0, step: 0, x: -2, cus: [1, -3, 0, 2] };
    let M = null; // いまの関数の情報
    const sx = slider(root.querySelector('.controls'), { tex: '\\teal{x}', min: -2.4, max: 2.4, step: 0.05, value: -2, color: 'teal', aria: '点の x 座標', fmt: (v) => num(v, 2) });
    sx.on((v) => setX(v));
    // 自分で作る（3次）：係数のスライダー
    const cbox = R(root, 'coef');
    const names = ['a', 'b', 'c', 'd'], cols = ['primary', 'violet', 'accent', 'amber'];
    const lims = [[-2, 2], [-6, 6], [-9, 9], [-5, 5]];
    const cs = names.map((n, i) => {
      const s = slider(cbox, { tex: n, min: lims[i][0], max: lims[i][1], step: 1, value: st.cus[i], color: cols[i], aria: '係数 ' + n });
      s.on((v) => { st.cus[i] = v; build(); });
      return s;
    });
    const ttl = el('div', 'lbl-sm d45-coef-ttl');
    cbox.prepend(ttl);
    setTex(ttl, 'f(x)=ax^3+bx^2+cx+d');

    function build() {
      const p = TABLE_FNS[st.k];
      let f, cof, rs, fact, view;
      if (p.custom) {
        cof = st.cus.slice();
        const A = 3 * cof[0], B = 2 * cof[1], C = cof[2];
        rs = (A || B || C) ? solveInt(A, B, C) : [];
        fact = factorTeX(A || B, rs, !!A && rs.length === 1);
        f = poly(cof);
        // 表示範囲は解のまわり
        const xs = rs.map((r) => r.x), cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
        const half = Math.max(2.4, xs.length ? (Math.max(...xs) - Math.min(...xs)) / 2 + 1.6 : 2.4);
        const x0 = cx - half, x1 = cx + half;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i <= 200; i++) { const x = x0 + (x1 - x0) * (0.12 + 0.76 * i / 200), y = f(x); lo = Math.min(lo, y); hi = Math.max(hi, y); }
        xs.forEach((x) => { lo = Math.min(lo, f(x)); hi = Math.max(hi, f(x)); });
        if (hi - lo < 2) { const m = (hi + lo) / 2; lo = m - 1; hi = m + 1; }
        const pad = (hi - lo) * 0.22;
        view = { x: [x0, x1], y: [lo - pad, hi + pad * 1.6], sy: niceStep(hi - lo + 2 * pad), sx: half > 4 ? 2 : 1 };
      } else {
        cof = p.cs; f = poly(cof);
        rs = p.roots.map((r) => ({ x: r[0], tex: r[1], rat: true }));
        fact = p.fact; view = p;
      }
      const dcs = dpoly(cof), df = poly(dcs);
      const dexp = polyTeX(dcs);
      // 列：区間・解・区間・…
      const colsA = [];
      for (let i = 0; i <= rs.length; i++) {
        const lo = i ? rs[i - 1].x : -Infinity, hi = i < rs.length ? rs[i].x : Infinity;
        const t = testPoint(lo, hi), v = df(t);
        colsA.push({ kind: 'I', t, dv: v, s: v > 1e-12 ? 1 : v < -1e-12 ? -1 : 0, lo, hi });
        if (i < rs.length) colsA.push({ kind: 'P', r: rs[i] });
      }
      colsA.forEach((cl, i) => {
        if (cl.kind !== 'P') return;
        const sl = colsA[i - 1].s, sr = colsA[i + 1].s;
        cl.ext = sl > 0 && sr < 0 ? 'max' : sl < 0 && sr > 0 ? 'min' : null;
        cl.val = f(cl.r.x);
        cl.vtex = cl.r.rat ? D.fracTeX(cl.val, 1728) : '\\approx' + fm(cl.val, 2);
        if (cl.r.rat && !/^-?\d+$/.test(cl.vtex) && !/frac/.test(cl.vtex)) cl.vtex = '\\approx' + fm(cl.val, 2);
      });
      M = { f, df, cof, dcs, rs, fact, dexp, cols: colsA, view, ftex: p.custom ? polyTeX(cof) : p.tex };
      plot.setView({ xmin: view.x[0], xmax: view.x[1], ymin: view.y[0], ymax: view.y[1] });
      sx.input.min = view.x[0] + 0.1; sx.input.max = view.x[1] - 0.1;
      sx.input.step = (view.x[1] - view.x[0]) > 6 ? 0.1 : 0.05;
      M.bands = signBands(df, view.x[0], view.x[1]);
      setX(st.x);
    }
    function setX(x) {
      const v = M.view, s = (v.x[1] - v.x[0]) > 6 ? 0.1 : 0.05;
      st.x = clamp(snap(x, s), v.x[0] + 0.1, v.x[1] - 0.1);
      // 解の近くなら解にくっつける
      M.rs.forEach((r) => { if (Math.abs(st.x - r.x) < s * 0.75) st.x = r.x; });
      update();
    }
    // いま点がいる列
    function colOf(x) {
      let k = 0;
      for (let i = 0; i < M.cols.length; i++) {
        const cl = M.cols[i];
        if (cl.kind === 'P' && Math.abs(cl.r.x - x) < 1e-9) return i;
        if (cl.kind === 'I' && x > cl.lo && x < cl.hi) k = i;
      }
      return k;
    }
    const sgnTeX = (s) => (s > 0 ? '+' : s < 0 ? '-' : '0');
    const tTeX = (t) => (Number.isInteger(t) ? String(t) : D.fracTeX(t, 4));
    function stepsHTML() {
      const s = st.step, items = [];
      items.push('<b>微分する</b>：$f\'(x)=' + M.dexp + '$' + (M.fact && M.fact !== M.dexp ? ' $=' + M.fact + '$' : ''));
      const rts = M.rs.map((r) => r.tex);
      items.push('<b>$f\'(x)=0$ を解く</b>：' + (rts.length ? '$x=' + rts.join(',\\ ') + '$。この $x$ で区切る' : '$f\'(x)=0$ となる $x$ はない（区切らない）'));
      const tests = M.cols.filter((c) => c.kind === 'I').map((c) => '$f\'(' + tTeX(c.t) + ')' + (Math.abs(c.dv - Math.round(c.dv)) < 1e-9 ? '=' + D.fracTeX(c.dv, 16) : '\\approx' + fm(c.dv, 2)) + (c.s > 0 ? '\\gt0' : c.s < 0 ? '\\lt0' : '') + '$');
      items.push('<b>区間ごとの符号</b>：区間から1つ選んで入れる。' + tests.join('、'));
      items.push('<b>矢印を書く</b>：$+$ の区間は $\\nearrow$（増加）、$-$ の区間は $\\searrow$（減少）');
      const vals = M.cols.filter((c) => c.kind === 'P').map((c) => '$f(' + c.r.tex + ')' + (c.vtex.indexOf('approx') >= 0 ? '' : '=') + c.vtex + '$' + (c.ext === 'max' ? '（極大）' : c.ext === 'min' ? '（極小）' : '（前後で符号が変わらないので極値ではない）'));
      items.push('<b>山と谷の高さ</b>：' + (vals.length ? vals.join('、') : '極値はない'));
      let h = '<ol>';
      items.forEach((t, i) => { if (i < s) h += '<li' + (i === s - 1 ? ' class="cur"' : '') + '>' + t + '</li>'; });
      h += '</ol>';
      if (!s) h = '<p class="d45-steps-0">「次へ」を押して、手順 1 から始めよう。</p>';
      return h;
    }
    const tbl = R(root, 'table');
    function tableHTML() {
      const s = st.step, on = s >= 2 ? colOf(st.x) : -1;
      const row = (th, f) => '<tr><th>' + th + '</th>' + (s < 2 ? '<td class="ph">' + (th === '$x$' ? '手順 2 で区切る' : '') + '</td>' : M.cols.map((c, i) => f(c, i)).join('')) + '</tr>';
      const td = (i, cls, inner) => '<td data-col="' + i + '" class="' + cls + (i === on ? ' on' : '') + '">' + inner + '</td>';
      let h = '<tbody>';
      h += row('$x$', (c, i) => td(i, '', c.kind === 'I' ? '$\\cdots$' : '$' + c.r.tex + '$'));
      h += row('$f\'(x)$', (c, i) => c.kind === 'P' ? td(i, '', '$0$') : td(i, s >= 3 ? (c.s > 0 ? 'up' : c.s < 0 ? 'dn' : '') : '', s >= 3 ? '$' + sgnTeX(c.s) + '$' : ''));
      h += row('$f(x)$', (c, i) => {
        if (c.kind === 'I') return td(i, s >= 4 ? (c.s > 0 ? 'up' : c.s < 0 ? 'dn' : '') : '', s >= 4 ? '$' + (c.s > 0 ? '\\nearrow' : c.s < 0 ? '\\searrow' : '\\rightarrow') + '$' : '');
        if (s < 5) return td(i, '', '');
        return td(i, '', (c.ext ? '<span class="zt-tag">' + (c.ext === 'max' ? '極大' : '極小') + '</span>' : '') + '$' + c.vtex.replace('\\approx', '\\approx ') + '$');
      });
      return h + '</tbody>';
    }
    let lastTbl = '';
    function renderTable() {
      const h = tableHTML();
      if (h === lastTbl) return;
      // 光る列だけ変わったときは、組み直さずに class だけ変える
      const strip = (t) => t.replace(/ on"/g, '"');
      if (strip(h) === strip(lastTbl)) {
        const on = st.step >= 2 ? colOf(st.x) : -1;
        tbl.querySelectorAll('td[data-col]').forEach((t) => t.classList.toggle('on', +t.dataset.col === on));
      } else { tbl.innerHTML = h; typeset(tbl); }
      lastTbl = h;
    }
    tbl.addEventListener('click', (e) => {
      const t = e.target.closest('td[data-col]');
      if (!t) return;
      const c = M.cols[+t.dataset.col];
      setX(c.kind === 'P' ? c.r.x : c.t);
    });
    const bPrev = R(root, 'prev'), bNext = R(root, 'next');
    function setStep(s) { st.step = clamp(s, 0, 5); update(); }
    bPrev.addEventListener('click', () => setStep(st.step - 1));
    bNext.addEventListener('click', () => setStep(st.step + 1));
    R(root, 'all').addEventListener('click', () => setStep(5));
    chipRow(R(root, 'fns'), TABLE_FNS, 0, (it, i) => {
      st.k = i; cbox.hidden = !it.custom; st.step = 0;
      if (it.custom) cs.forEach((s, j) => s.set(st.cus[j]));
      build();
    });
    plot.addHandle({ get x() { return st.x; }, get y() { return M.f(st.x); }, get color() { return plot.c ? plot.c.teal : '#198'; }, r: 8, drag(x) { setX(x); } });
    function update() {
      const x = st.x, m = M.df(x);
      sx.set(x);
      bPrev.disabled = st.step <= 0; bNext.disabled = st.step >= 5;
      R(root, 'stepno').textContent = '手順 ' + st.step + ' / 5';
      setHTML(R(root, 'steps'), stepsHTML());
      renderTable();
      tex(root, 'f', '\\blue{f(x)=' + M.ftex + '}');
      const xt = M.rs.find((r) => r.x === x);
      tex(root, 'pt', 'x=' + (xt ? xt.tex : num(x, 2)) + ',\\quad \\amber{f\'(x)' + (xt ? '=0' : eqv(m, 2)) + '}');
      const col = M.cols[colOf(x)];
      let how;
      if (col.kind === 'P') how = col.ext === 'max' ? '<b>極大</b>：ここで上り坂から下り坂に変わる（山の頂上）' : col.ext === 'min' ? '<b>極小</b>：ここで下り坂から上り坂に変わる（谷の底）' : '$f\'=0$ だが、前後で符号が<b>変わらない</b>ので極値ではない';
      else how = col.s > 0 ? '$f\'\\gt0$ の区間：<b>増加</b>（$\\nearrow$）' : col.s < 0 ? '$f\'\\lt0$ の区間：<b>減少</b>（$\\searrow$）' : '傾きはいつも $0$';
      setHTML(R(root, 'how'), how);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, s = st.step, x = st.x;
      if (s >= 3) drawBands(g, M.bands, s >= 4 ? 'arrow' : null);
      g.grid({ stepX: M.view.sx || 1, stepY: M.view.sy || 1, xlabel: 'x', ylabel: 'y' });
      if (s >= 2) M.rs.forEach((r) => {
        g.line(r.x, g.ymin, r.x, g.ymax, { color: c.muted, width: 1.2, dash: [5, 4] });
        g.dot(r.x, 0, { r: 4.5, color: c.text });
      });
      D.curve(g, M.f, { color: c.primary, width: 3.5 });
      if (s >= 5) M.cols.forEach((cl) => {
        if (cl.kind !== 'P') return;
        const y = cl.val;
        g.dot(cl.r.x, y, { r: 6, color: c.primary });
        const lab = (cl.ext === 'max' ? '\\text{極大 }' : cl.ext === 'min' ? '\\text{極小 }' : '') + (cl.vtex.indexOf('approx') >= 0 ? cl.vtex : cl.vtex);
        g.tex(lab, cl.r.x, y, { color: c.text, size: 14, align: 'center', valign: cl.ext === 'min' ? 'top' : 'bottom', dy: cl.ext === 'min' ? 10 : -10, avoid: true });
      });
      D.tangent(g, M.f, x, { df: M.df, width: 2, point: false });
    };
    build();
  }

  /* ==========================================================
     4.5(3) 範囲の中の最大・最小
     ========================================================== */
  const RANGE_FNS = [
    { tex: '-x^2+4x+5', cs: [-1, 4, 5], crit: [[2, 'max']], x: [-1.6, 7], y: [-10.5, 11.5], sy: 2, a: 0, b: 6 },
    { tex: 'x^3-3x+1', cs: [1, 0, -3, 1], crit: [[-1, 'max'], [1, 'min']], x: [-2.6, 2.6], y: [-4.2, 5.2], sy: 1, a: -2.2, b: 1.8 },
    { tex: 'x^3-6x^2+9x', cs: [1, -6, 9, 0], crit: [[1, 'max'], [3, 'min']], x: [-0.8, 4.8], y: [-3, 7.5], sy: 1, a: 0.5, b: 4.2 },
  ];
  function initRange() {
    const root = $id('w-range');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 7, ymin: -9, ymax: 11.5, ratio: [0.75, 0.45] });
    const st = { k: 0, a: 0, b: 6 };
    const P = () => RANGE_FNS[st.k];
    let F = poly(P().cs);
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\red{a}', min: -1.5, max: 6.9, step: 0.1, value: 0, color: 'accent', aria: '範囲の左端 a' });
    const sb = slider(ctl, { tex: '\\red{b}', min: -1.5, max: 6.9, step: 0.1, value: 6, color: 'accent', aria: '範囲の右端 b' });
    const lim = () => [P().x[0] + 0.1, P().x[1] - 0.1];
    function setA(v) { const l = lim(); st.a = clamp(Math.round(v * 10) / 10, l[0], st.b - 0.3); update(); }
    function setB(v) { const l = lim(); st.b = clamp(Math.round(v * 10) / 10, st.a + 0.3, l[1]); update(); }
    sa.on(setA); sb.on(setB);
    chipRow(R(root, 'fns'), RANGE_FNS, 0, (it, i) => {
      st.k = i; const p = P(); F = poly(p.cs);
      const l = lim();
      [sa, sb].forEach((s) => { s.input.min = l[0]; s.input.max = l[1]; });
      plot.setView({ xmin: p.x[0], xmax: p.x[1], ymin: p.y[0], ymax: p.y[1] });
      st.a = p.a; st.b = p.b; update();
    });
    const y0 = () => (plot.ymin <= 0 && plot.ymax >= 0 ? 0 : plot.ymin);
    plot.addHandle({ get x() { return st.a; }, get y() { return y0(); }, get color() { return plot.c ? plot.c.accent : '#d33'; }, r: 8, tex: 'a', ldx: -10, ldy: -16, lalign: 'right', drag(x) { setA(x); } });
    plot.addHandle({ get x() { return st.b; }, get y() { return y0(); }, get color() { return plot.c ? plot.c.accent : '#d33'; }, r: 8, tex: 'b', ldx: 10, ldy: -16, drag(x) { setB(x); } });
    let res = null;
    function compute() {
      const p = P(), cand = [{ x: st.a, kind: 'end' }];
      p.crit.forEach((c) => { if (c[0] > st.a + 1e-9 && c[0] < st.b - 1e-9) cand.push({ x: c[0], kind: c[1] }); });
      cand.push({ x: st.b, kind: 'end' });
      cand.forEach((c) => { c.y = F(c.x); });
      const ys = cand.map((c) => +c.y.toFixed(6)), mx = Math.max(...ys), mn = Math.min(...ys);
      return { cand, mx, mn, maxs: cand.filter((c, i) => ys[i] === mx), mins: cand.filter((c, i) => ys[i] === mn) };
    }
    function update() {
      sa.set(st.a); sb.set(st.b);
      res = compute();
      tex(root, 'rg', '\\red{' + num(st.a, 1) + '}\\leqq x\\leqq\\red{' + num(st.b, 1) + '}');
      tex(root, 'cand', '\\begin{aligned}' + res.cand.map((c) => '&f(' + num(c.x, 1) + ')' + eqv(c.y, 2) + (c.kind === 'end' ? '\\ \\text{（端）}' : c.kind === 'max' ? '\\ \\text{（極大）}' : '\\ \\text{（極小）}')).join('\\\\') + '\\end{aligned}');
      const xs = (l) => l.map((c) => 'x=' + num(c.x, 1)).join(',\\ ');
      tex(root, 'res', '\\begin{aligned}&\\text{最大値 }' + fm(res.mx, 2) + '\\ (' + xs(res.maxs) + ')\\\\&\\text{最小値 }' + fm(res.mn, 2) + '\\ (' + xs(res.mins) + ')\\end{aligned}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx;
      ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = c.accent;
      ctx.fillRect(g.X(st.a), 0, g.X(st.b) - g.X(st.a), g.h); ctx.restore();
      g.grid({ step: 1, stepY: P().sy, xlabel: 'x', ylabel: 'y' });
      [st.a, st.b].forEach((x) => g.line(x, y0(), x, F(x), { color: c.accent, width: 1.5, dash: [4, 4] }));
      D.curve(g, F, { color: c.primary, width: 2.5, alpha: 0.35 });
      D.curve(g, F, { x0: st.a, x1: st.b, color: c.primary, width: 4 });
      res.cand.forEach((cd) => g.dot(cd.x, cd.y, { r: 5, color: cd.kind === 'end' ? c.accent : c.primary }));
      const mark = (cd, top) => {
        g.dot(cd.x, cd.y, { r: 11, ring: true, color: c.text, lw: 2.5 });
        g.dot(cd.x, cd.y, { r: 5, color: cd.kind === 'end' ? c.accent : c.primary });
        const py = g.Y(cd.y), side = top ? py < 40 : py > g.h - 40, left = g.X(cd.x) > g.w / 2;
        g.tex((top ? '\\text{最大 }' : '\\text{最小 }') + fm(cd.y, 2), cd.x, cd.y, side
          ? { color: c.text, size: 14, align: left ? 'right' : 'left', dx: left ? -16 : 16, avoid: true }
          : { color: c.text, size: 14, align: 'center', valign: top ? 'bottom' : 'top', dy: top ? -14 : 14, avoid: true });
      };
      res.maxs.forEach((cd) => mark(cd, true));
      res.mins.forEach((cd) => mark(cd, false));
      g.tex('y=' + P().tex, g.xmax, g.ymin, { color: c.primary, size: 14, align: 'right', valign: 'bottom', dx: -8, dy: -6, avoid: true });
    };
    update();
  }

  /* ==========================================================
     缶・箱・柵・浜辺の見取り図（ピクセル座標）
     ========================================================== */
  // 缶：底のまん中 (cx, by)、半径 R・高さ Hh（ピクセル）
  function drawCan(g, cx, by, Rp, Hh, o) {
    o = o || {};
    const c = g.c, ctx = g.ctx, e = Rp * 0.32, ty = by - Hh;
    ctx.save();
    // 側面
    const gr = ctx.createLinearGradient(cx - Rp, 0, cx + Rp, 0);
    gr.addColorStop(0, c.surface); gr.addColorStop(0.3, c.bg); gr.addColorStop(1, c.surface);
    ctx.beginPath();
    ctx.moveTo(cx - Rp, ty); ctx.lineTo(cx - Rp, by);
    ctx.ellipse(cx, by, Rp, e, 0, PI, 0, true);
    ctx.lineTo(cx + Rp, ty);
    ctx.ellipse(cx, ty, Rp, e, 0, 0, PI, false);
    ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();
    ctx.globalAlpha = 0.22; ctx.fillStyle = c.primary; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 2; ctx.strokeStyle = c.primary; ctx.stroke();
    // ラベルの帯
    ctx.beginPath();
    ctx.moveTo(cx - Rp, ty + Hh * 0.3); ctx.ellipse(cx, ty + Hh * 0.3, Rp, e, 0, PI, 0, true);
    ctx.lineTo(cx + Rp, ty + Hh * 0.7); ctx.ellipse(cx, ty + Hh * 0.7, Rp, e, 0, 0, PI, false);
    ctx.closePath(); ctx.globalAlpha = 0.18; ctx.fillStyle = o.band || c.teal; ctx.fill(); ctx.globalAlpha = 1;
    // ふた
    ctx.beginPath(); ctx.ellipse(cx, ty, Rp, e, 0, 0, 2 * PI);
    ctx.fillStyle = c.bg; ctx.fill();
    ctx.globalAlpha = o.lid ? 0.55 : 0.32; ctx.fillStyle = o.lid || c.primary; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = o.lid ? 3 : 2; ctx.strokeStyle = o.lid || c.primary; ctx.stroke();
    // 開け口
    ctx.beginPath(); ctx.ellipse(cx + Rp * 0.35, ty, Rp * 0.2, e * 0.32, 0, 0, 2 * PI);
    ctx.lineWidth = 1.5; ctx.strokeStyle = c.muted; ctx.stroke();
    ctx.restore();
    if (o.dims !== false) {
      // 半径
      g.ctx.save(); g.ctx.strokeStyle = c.text; g.ctx.lineWidth = 1.5; g.ctx.setLineDash([4, 3]);
      g.ctx.beginPath(); g.ctx.moveTo(cx, ty); g.ctx.lineTo(cx - Rp, ty); g.ctx.stroke(); g.ctx.restore();
      g.texPx('r', cx - Rp / 2, ty - e - 4, { align: 'center', valign: 'bottom', size: 15, color: c.text });
      // 高さ
      const hx = cx + Rp + 12;
      g.ctx.save(); g.ctx.strokeStyle = c.text; g.ctx.lineWidth = 1.5;
      g.ctx.beginPath(); g.ctx.moveTo(hx, ty); g.ctx.lineTo(hx, by);
      g.ctx.moveTo(hx - 5, ty); g.ctx.lineTo(hx + 5, ty); g.ctx.moveTo(hx - 5, by); g.ctx.lineTo(hx + 5, by); g.ctx.stroke(); g.ctx.restore();
      g.texPx('h', hx + 7, (ty + by) / 2, { align: 'left', size: 15, color: c.text });
    }
  }
  // 缶をキャンバスに収めて描く（scale は cm → px）
  function canScene(g, V, r, rmin, o) {
    o = o || {};
    const h = V / (PI * r * r), hmax = V / (PI * rmin * rmin), rmax = o.rmax || 7;
    const sc = Math.min((g.w - 70) / (2 * rmax), (g.h - 64) / (hmax + 0.64 * rmax));
    const by = g.h - 18 - 0.32 * r * sc;
    drawCan(g, g.w / 2 - 8, by, r * sc, h * sc, o);
    if (Math.abs(h - 2 * r) < 0.12 * r && o.square !== false) g.texPx('\\text{高さ＝直径！}', 12, 12, { align: 'left', valign: 'top', size: 14, color: g.c.teal });
    return h;
  }
  // ふたのない箱：左に展開図、右に見取り図
  function drawBox(g, a, x, o) {
    o = o || {};
    const cc = g.c, ctx = g.ctx, wide = g.w > 420;
    // 展開図
    const netS = Math.min(wide ? g.w * 0.42 : g.w * 0.44, g.h - 50), k = netS / a;
    const nx = 14, ny = (g.h - netS) / 2 + 6, cut = x * k;
    ctx.save();
    ctx.fillStyle = cc.surface; ctx.strokeStyle = cc.text; ctx.lineWidth = 1.5;
    ctx.fillRect(nx, ny, netS, netS); ctx.strokeRect(nx, ny, netS, netS);
    ctx.globalAlpha = 0.28; ctx.fillStyle = cc.accent;
    [[0, 0], [netS - cut, 0], [0, netS - cut], [netS - cut, netS - cut]].forEach((p) => ctx.fillRect(nx + p[0], ny + p[1], cut, cut));
    ctx.globalAlpha = 1; ctx.strokeStyle = cc.accent; ctx.setLineDash([4, 3]);
    [[0, 0], [netS - cut, 0], [0, netS - cut], [netS - cut, netS - cut]].forEach((p) => ctx.strokeRect(nx + p[0], ny + p[1], cut, cut));
    ctx.strokeStyle = cc.muted; ctx.beginPath();
    ctx.moveTo(nx + cut, ny + cut); ctx.lineTo(nx + netS - cut, ny + cut); ctx.lineTo(nx + netS - cut, ny + netS - cut); ctx.lineTo(nx + cut, ny + netS - cut); ctx.closePath(); ctx.stroke();
    ctx.restore();
    if (cut > 14) g.texPx('x', nx + cut / 2, ny + cut / 2, { align: 'center', size: 14, color: cc.accent });
    g.texPx(o.aTeX || String(a), nx + netS / 2, ny - 4, { align: 'center', valign: 'bottom', size: 13, color: cc.muted });
    // 見取り図
    const s = a - 2 * x, bx0 = wide ? nx + netS + 30 : nx + netS + 18, availW = g.w - bx0 - 12;
    const dep = 0.5, cs30 = Math.cos(PI / 6) * dep, sn30 = Math.sin(PI / 6) * dep;
    const kb = Math.min(availW / (a * (1 + cs30)), (g.h - 44) / (a * 0.5));
    const S = s * kb, Hh = x * kb, dx = S * cs30, dy = S * sn30;
    const ox = bx0, oy = g.h - 20; // 手前の左下
    const P0 = [ox, oy], P1 = [ox + S, oy], P2 = [ox + S + dx, oy - dy], P3 = [ox + dx, oy - dy];
    const up = (p) => [p[0], p[1] - Hh];
    const face = (pts, alpha) => {
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.globalAlpha = alpha; ctx.fillStyle = cc.primary; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = cc.primary; ctx.lineWidth = 1.6; ctx.stroke();
    };
    ctx.save();
    face([P3, P2, up(P2), up(P3)], 0.22); // 奥
    face([P0, P3, up(P3), up(P0)], 0.16); // 左
    face([P0, P1, P2, P3], 0.3);          // 底
    face([P1, P2, up(P2), up(P1)], 0.12); // 右
    face([P0, P1, up(P1), up(P0)], 0.1);  // 手前
    ctx.restore();
    if (Hh > 12) g.texPx('x', ox - 4, oy - Hh / 2, { align: 'right', size: 14, color: cc.text });
    g.texPx(o.sTeX || (num(s, 2)), ox + S / 2, oy + 2, { align: 'center', valign: 'top', size: 13, color: cc.text });
  }

  /* ==========================================================
     4.5(4) 缶の形と表面積
     ========================================================== */
  function initCan() {
    const root = $id('w-can');
    const cvs = root.querySelectorAll('canvas');
    const pc = new Plot(cvs[0], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.62, 0.78] });
    const ps = new Plot(cvs[1], { xmin: 0, xmax: 7.5, ymin: 0, ymax: 700, ratio: [0.8, 0.78] });
    const st = { V: 350, r: 5.5, parts: true };
    const RMIN = 2.5, RMAX = 7, REAL = 3.3;
    const S = (r) => 2 * PI * r * r + 2 * st.V / r, dS = (r) => 4 * PI * r - 2 * st.V / (r * r);
    const ropt = () => Math.cbrt(st.V / (2 * PI));
    const sr = slider(root.querySelector('.controls'), { tex: '\\teal{r}', min: RMIN, max: RMAX, step: 0.01, value: st.r, color: 'teal', aria: '缶の半径 r（cm）', fmt: (v) => num(v, 2) });
    const setR = (v) => { st.r = clamp(Math.round(v * 100) / 100, RMIN, RMAX); if (Math.abs(st.r - ropt()) < 0.03) st.r = ropt(); update(); };
    sr.on(setR);
    chipRow(R(root, 'vol'), [{ tex: '350\\,\\text{mL}', V: 350 }, { tex: '500\\,\\text{mL}', V: 500 }], 0, (it) => { st.V = it.V; update(); });
    R(root, 'parts').addEventListener('change', (e) => { st.parts = e.target.checked; ps.invalidate(); });
    ps.addHandle({ get x() { return st.r; }, get y() { return S(st.r); }, get color() { return ps.c ? ps.c.teal : '#198'; }, r: 8, drag(x) { setR(x); } });
    function update() {
      const r = st.r, h = st.V / (PI * r * r), s = S(r), m = dS(r), ro = ropt();
      sr.set(r);
      tex(root, 'dim', '\\begin{aligned}&r=' + fm(r, 2) + ',\\ h=\\dfrac{' + st.V + '}{\\pi r^2}=' + fm(h, 2) + '\\\\&h\\div r=' + fm(h / r, 2) + '\\end{aligned}');
      tex(root, 's', '\\blue{S=2\\pi r^2+\\frac{' + 2 * st.V + '}{r}' + eqv(s, 1) + '}\\ \\text{cm}^2');
      tex(root, 'm', '\\teal{S\'(r)=4\\pi r-\\frac{' + 2 * st.V + '}{r^2}' + (Math.abs(r - ro) < 1e-9 ? '=0' : eqv(m, 2)) + '}');
      setHTML(R(root, 'how'), Math.abs(r - ro) < 1e-9
        ? '<b>谷の底</b>：$S\'(r)=0$。高さ $h$ がちょうど直径 $2r$ になっている（最小 $' + fm(s, 1) + '$）'
        : m < 0 ? '$S\'(r)\\lt0$（下り坂）：もっと<b>太く</b>すると材料が減る。細すぎて側面が大きい'
          : '$S\'(r)\\gt0$（上り坂）：もっと<b>細く</b>すると材料が減る。太すぎてふたと底が大きい');
      pc.invalidate(); ps.invalidate();
    }
    pc.draw = function (g) {
      canScene(g, st.V, st.r, RMIN, { rmax: RMAX });
      g.texPx('V=' + st.V + '\\,\\text{cm}^3', g.w - 10, 12, { align: 'right', valign: 'top', size: 14, color: g.c.muted });
    };
    ps.draw = function (g) {
      const cc = g.c, r = st.r, ro = ropt();
      g.grid({ stepX: 1, stepY: 100, xlabel: 'r', ylabel: 'S' });
      if (st.parts) {
        D.curve(g, (x) => 2 * PI * x * x, { x0: 0.05, color: cc.violet, width: 2, dash: [6, 5] });
        D.curve(g, (x) => 2 * st.V / x, { x0: 0.3, color: cc.brown, width: 2, dash: [6, 5] });
        g.tex('2\\pi r^2', 5.6, 2 * PI * 5.6 * 5.6, { color: cc.violet, size: 14, align: 'right', dx: -8, avoid: true });
        g.tex('\\dfrac{' + 2 * st.V + '}{r}', 1.7, 2 * st.V / 1.7, { color: cc.brown, size: 14, align: 'left', dx: 10, avoid: true });
      }
      g.line(r, 0, r, S(r), { color: cc.muted, width: 1.2, dash: [4, 4] });
      D.curve(g, S, { x0: 0.6, color: cc.primary, width: 3.5 });
      // 実物の太さ
      g.dot(REAL, S(REAL), { r: 4.5, color: cc.muted });
      g.tex('\\text{実物の太さ}', REAL, S(REAL), { color: cc.muted, size: 12, align: 'right', valign: 'top', dx: -2, dy: 6, avoid: true });
      g.dot(ro, S(ro), { r: 9, ring: true, color: cc.primary, lw: 2 });
      D.tangent(g, S, r, { df: dS, width: 2.2, point: false });
      g.tex('S(r)', 6.9, S(6.9), { color: cc.primary, size: 15, align: 'right', valign: 'bottom', dy: -8, avoid: true });
    };
    update();
  }

  /* ==========================================================
     4.5(5) 箱の容積
     ========================================================== */
  function initBox() {
    const root = $id('w-box');
    const cvs = root.querySelectorAll('canvas');
    const pb = new Plot(cvs[0], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.62, 0.66] });
    const pv = new Plot(cvs[1], { xmin: -0.3, xmax: 6.3, ymin: -12, ymax: 150, ratio: [0.7, 0.66] });
    const A = 12, st = { x: 4.5 };
    const V = (x) => x * (A - 2 * x) * (A - 2 * x), dV = (x) => 12 * (x - 2) * (x - 6);
    const sx = slider(root.querySelector('.controls'), { tex: '\\teal{x}', min: 0.2, max: 5.8, step: 0.05, value: st.x, color: 'teal', aria: '切り取る正方形の1辺 x（cm）', fmt: (v) => num(v, 2) });
    const setX = (v) => { st.x = clamp(snap(v, 0.05), 0.2, 5.8); update(); };
    sx.on(setX);
    pv.addHandle({ get x() { return st.x; }, get y() { return V(st.x); }, get color() { return pv.c ? pv.c.teal : '#198'; }, r: 8, drag(x) { setX(x); } });
    function update() {
      const x = st.x, s = A - 2 * x, m = dV(x);
      sx.set(x);
      tex(root, 'dim', '\\text{底面 }' + fm(s, 2) + '\\times' + fm(s, 2) + ',\\ \\text{高さ }' + fm(x, 2));
      tex(root, 'v', '\\blue{V=x(12-2x)^2' + eqv(V(x), 2) + '}\\ \\text{cm}^3');
      tex(root, 'm', '\\begin{aligned}&\\teal{V\'(x)=12(x-2)(x-6)' + eqv(m, 2) + '}\\\\&' + (Math.abs(m) < 1e-9 ? '\\text{（山の頂上）}' : m > 0 ? '\\text{（上り坂）}' : '\\text{（下り坂）}') + '\\end{aligned}');
      pb.invalidate(); pv.invalidate();
    }
    pb.draw = function (g) { drawBox(g, A, st.x, { sTeX: fm(A - 2 * st.x, 2) }); };
    pv.draw = function (g) {
      const cc = g.c, x = st.x;
      g.grid({ stepX: 1, stepY: 20, xlabel: 'x', ylabel: 'V' });
      g.line(x, 0, x, V(x), { color: cc.muted, width: 1.2, dash: [4, 4] });
      D.curve(g, V, { x0: 0, x1: 6, color: cc.primary, width: 3.5 });
      g.dot(2, 128, { r: 9, ring: true, color: cc.primary, lw: 2 });
      g.tex('(2,\\ 128)', 2, 128, { color: cc.primary, size: 14, align: 'center', valign: 'top', dy: 14, avoid: true });
      D.tangent(g, V, x, { df: dV, width: 2.2, point: false });
    };
    update();
  }

  /* ==========================================================
     4.5(6) チャレンジ：最強の缶を作れ
     ========================================================== */
  function goldenMin(F, a, b) {
    const gr = (Math.sqrt(5) - 1) / 2;
    let c1 = b - gr * (b - a), c2 = a + gr * (b - a);
    for (let i = 0; i < 100; i++) { if (F(c1) < F(c2)) { b = c2; } else { a = c1; } c1 = b - gr * (b - a); c2 = a + gr * (b - a); }
    return (a + b) / 2;
  }
  const beachT = (x) => Math.hypot(20, x) / 6 + Math.hypot(20, 50 - x) / 2;
  const BEACH_X = goldenMin(beachT, 0, 50);
  function drawFence(g, x) {
    const cc = g.c, ctx = g.ctx, W = 60 - 2 * x;
    const k = Math.min((g.w - 60) / 60, (g.h - 84) / 30), top = 34;
    ctx.save();
    ctx.globalAlpha = 0.25; ctx.fillStyle = cc.primary; ctx.fillRect(0, 0, g.w, top); ctx.globalAlpha = 1;
    ctx.strokeStyle = cc.primary; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let px = 0; px <= g.w; px += 4) { const py = 12 + 3 * Math.sin(px / 9); px ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    const cx = g.w / 2, L0 = cx - W * k / 2, R0 = cx + W * k / 2, B0 = top + x * k;
    ctx.globalAlpha = 0.14; ctx.fillStyle = cc.teal; ctx.fillRect(L0, top, R0 - L0, B0 - top); ctx.globalAlpha = 1;
    ctx.strokeStyle = cc.brown; ctx.lineWidth = 3.5; ctx.beginPath();
    ctx.moveTo(L0, top); ctx.lineTo(L0, B0); ctx.lineTo(R0, B0); ctx.lineTo(R0, top); ctx.stroke();
    ctx.restore();
    g.texPx('\\text{川（柵はいらない）}', g.w - 8, top - 4, { align: 'right', valign: 'bottom', size: 12, color: cc.primary });
    g.texPx('x', L0 - 6, (top + B0) / 2, { align: 'right', size: 14, color: cc.text });
    g.texPx('60-2x', cx, B0 + 6, { align: 'center', valign: 'top', size: 14, color: cc.text });
    if (B0 - top > 26) g.texPx('\\text{牧場}', cx, (top + B0) / 2, { align: 'center', size: 13, color: cc.teal });
  }
  function drawBeach(g, x) {
    const cc = g.c, ctx = g.ctx;
    const k = Math.min((g.w - 70) / 50, (g.h - 56) / 40), ox = 34, sy = g.h / 2;
    const P = (mx, my) => [ox + mx * k, sy + my * k];
    ctx.save();
    ctx.globalAlpha = 0.2; ctx.fillStyle = cc.amber; ctx.fillRect(0, 0, g.w, sy);
    ctx.fillStyle = cc.primary; ctx.fillRect(0, sy, g.w, g.h - sy); ctx.globalAlpha = 1;
    ctx.strokeStyle = cc.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(g.w, sy); ctx.stroke();
    const A = P(0, -20), Q = P(x, 0), B = P(50, 20);
    ctx.lineWidth = 3; ctx.strokeStyle = cc.brown; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke();
    ctx.setLineDash([6, 4]); ctx.strokeStyle = cc.primary; ctx.beginPath(); ctx.moveTo(Q[0], Q[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = cc.muted; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(A[0], sy); ctx.stroke();
    ctx.restore();
    g.ctx.save(); g.ctx.fillStyle = cc.text; g.ctx.beginPath(); g.ctx.arc(A[0], A[1], 6, 0, 2 * PI); g.ctx.fill();
    g.ctx.fillStyle = cc.accent; g.ctx.beginPath(); g.ctx.arc(B[0], B[1], 6, 0, 2 * PI); g.ctx.fill();
    g.ctx.fillStyle = cc.teal; g.ctx.beginPath(); g.ctx.arc(Q[0], Q[1], 5, 0, 2 * PI); g.ctx.fill(); g.ctx.restore();
    g.texPx('\\text{あなた}', A[0] + 8, A[1] - 4, { align: 'left', valign: 'bottom', size: 13, color: cc.text });
    g.texPx('\\text{助けを呼ぶ人}', B[0] - 6, B[1] + 8, { align: 'right', valign: 'top', size: 13, color: cc.accent });
    g.texPx('\\text{砂浜 }6\\,\\text{m/s}', g.w - 8, 8, { align: 'right', valign: 'top', size: 12, color: cc.brown });
    g.texPx('\\text{海 }2\\,\\text{m/s}', 8, g.h - 8, { align: 'left', valign: 'bottom', size: 12, color: cc.primary });
    g.texPx('x', (A[0] + Q[0]) / 2, sy + 4, { align: 'center', valign: 'top', size: 14, color: cc.teal });
    g.texPx('20', A[0] - 4, (A[1] + sy) / 2, { align: 'right', size: 12, color: cc.muted });
  }
  const CAN_GAME = [
    { name: '缶', v: 'r', unit: 'cm', ylab: 'S', kind: 'min', min: 2.5, max: 7, step: 0.01, x0: 5.5,
      F: (r) => 2 * PI * r * r + 700 / r, xs: Math.cbrt(175 / PI), tol: 0.08,
      view: { xmin: 2.3, xmax: 7.2, ymin: 250, ymax: 450, sx: 1, sy: 50 },
      dims: (r) => 'h=\\frac{350}{\\pi r^2}=' + fm(350 / (PI * r * r), 2),
      pic: (g, r) => canScene(g, 350, r, 2.5, { rmax: 7, square: false }),
      text: '体積 $350\\ \\text{cm}^3$ の円柱の缶。表面積 $S$ が<b>最小</b>になる半径 $r$ を決めよう。',
      hint: '$h=\\dfrac{350}{\\pi r^2}$ を使うと $S(r)=2\\pi r^2+\\dfrac{700}{r}$。$S\'(r)=0$ を $r^3=\\cdots$ の形にして、電卓で3乗根を求めよう。',
      answer: '$S(r)=2\\pi r^2+\\dfrac{700}{r}$ より $S\'(r)=4\\pi r-\\dfrac{700}{r^2}$。<br>$S\'(r)=0$ より $4\\pi r^3=700$、$r^3=\\dfrac{175}{\\pi}\\approx55.7$、$r\\approx3.82$ cm。<br>このとき $h=\\dfrac{350}{\\pi r^2}=2r\\approx7.64$ cm、$S\\approx274.9\\ \\text{cm}^2$（高さ＝直径）。' },
    { name: '箱', v: 'x', unit: 'cm', ylab: 'V', kind: 'max', min: 0.5, max: 14.5, step: 0.1, x0: 10,
      F: (x) => x * (30 - 2 * x) * (30 - 2 * x), xs: 5, tol: 0.15,
      view: { xmin: 0, xmax: 15.2, ymin: 0, ymax: 2400, sx: 1, sy: 500 },
      dims: (x) => '\\text{底面 }' + fm(30 - 2 * x, 1) + '\\times' + fm(30 - 2 * x, 1) + ',\\ \\text{高さ }' + fm(x, 1),
      pic: (g, x) => drawBox(g, 30, x, { aTeX: '30', sTeX: fm(30 - 2 * x, 1) }),
      text: '1辺 $30$ cm の正方形の紙の四すみから1辺 $x$ cm の正方形を切って、ふたのない箱を作る。容積が<b>最大</b>になる $x$ は？',
      hint: '$V(x)=x(30-2x)^2=4x^3-120x^2+900x$。$V\'(x)$ を因数分解すると $12(x-\\square)(x-15)$ の形になります。',
      answer: '$V(x)=4x^3-120x^2+900x$ より $V\'(x)=12x^2-240x+900=12(x-5)(x-15)$。<br>$0\\lt x\\lt15$ で $V\'=0$ となるのは $x=5$。前は $V\'\\gt0$、後は $V\'\\lt0$ なので最大。<br>$V(5)=5\\times20^2=2000\\ \\text{cm}^3$（1辺 $a$ の紙なら $x=\\frac{a}{6}$）。' },
    { name: '柵', v: 'x', unit: 'm', ylab: 'A', kind: 'max', min: 1, max: 29, step: 0.1, x0: 6,
      F: (x) => x * (60 - 2 * x), xs: 15, tol: 0.3,
      view: { xmin: 0, xmax: 30.5, ymin: 0, ymax: 520, sx: 5, sy: 100 },
      dims: (x) => '\\text{たて }' + fm(x, 1) + ',\\ \\text{横 }' + fm(60 - 2 * x, 1),
      pic: (g, x) => drawFence(g, x),
      text: '長さ $60$ m の柵で、川ぞいに長方形の牧場を作る（川の側には柵はいらない）。面積 $A$ が<b>最大</b>になるたての長さ $x$ は？',
      hint: '横の長さは $60-2x$ なので、$A(x)=x(60-2x)=60x-2x^2$。$A\'(x)=0$ を解こう。',
      answer: '$A(x)=60x-2x^2$ より $A\'(x)=60-4x$。$A\'(x)=0$ より $x=15$ m（横は $30$ m）。<br>$x\\lt15$ で $A\'\\gt0$、$x\\gt15$ で $A\'\\lt0$ なので最大。$A(15)=15\\times30=450\\ \\text{m}^2$。<br>横がたての2倍。川がなければ正方形が最大（$15$ m 四方 $=225$）なので、川を使うと2倍の広さになる。' },
    { name: 'ライフセーバー', v: 'x', unit: 'm', ylab: 'T', kind: 'min', min: 0, max: 50, step: 0.1, x0: 25,
      F: beachT, xs: BEACH_X, tol: 0.6,
      view: { xmin: -1, xmax: 51, ymin: 17, ymax: 32, sx: 10, sy: 2 },
      dims: (x) => '\\text{走る }' + fm(Math.hypot(20, x), 1) + '\\,\\text{m},\\ \\text{泳ぐ }' + fm(Math.hypot(20, 50 - x), 1) + '\\,\\text{m}',
      pic: (g, x) => drawBeach(g, x),
      text: '砂浜を秒速 $6$ m で走り、海を秒速 $2$ m で泳いで助けに行く。かかる時間 $T$ が<b>最小</b>になる、海に入る位置 $x$ は？（まっすぐ行くのが最短とは限らない！）',
      hint: '$T(x)=\\dfrac{\\sqrt{20^2+x^2}}{6}+\\dfrac{\\sqrt{20^2+(50-x)^2}}{2}$。泳ぐのが遅いので、海の中の道のりを短くしたい。$T\'(x)$ の符号を手がかりに。',
      answer: () => '$T\'(x)=\\dfrac{x}{6\\sqrt{400+x^2}}-\\dfrac{50-x}{2\\sqrt{400+(50-x)^2}}$（4.4節の合成関数の微分）。<br>$T\'(x)=0$ は「$\\dfrac{\\sin(\\text{走る角})}{6}=\\dfrac{\\sin(\\text{泳ぐ角})}{2}$」という、光の<b>屈折の法則</b>と同じ式。<br>式で解くのは大変なので数値で解くと $x\\approx' + fm(BEACH_X, 1) + '$ m、$T\\approx' + fm(beachT(BEACH_X), 2) + '$ 秒。<br>まっすぐ（$x=25$）だと $' + fm(beachT(25), 2) + '$ 秒。光も「いちばん早く着く道」を通るので、水に入ると曲がる。' },
    { name: '最強の缶', v: 'r', unit: 'cm', ylab: 'C', kind: 'min', min: 2.4, max: 6, step: 0.01, x0: 4.5,
      F: (r) => 4 * PI * r * r + 700 / r, xs: Math.cbrt(87.5 / PI), tol: 0.07,
      view: { xmin: 2.2, xmax: 6.2, ymin: 320, ymax: 600, sx: 1, sy: 50 },
      dims: (r) => 'h=' + fm(350 / (PI * r * r), 2) + '\\ (h\\div r=' + fm(350 / (PI * r * r * r), 2) + ')',
      pic: (g, r) => canScene(g, 350, r, 2.4, { rmax: 6, square: false, lid: g.c.amber }),
      text: '本物に近い缶：ふたと底の材料は<b>2倍の値段</b>（厚いから）。体積 $350\\ \\text{cm}^3$ で、材料費 $C=2\\times2\\pi r^2+2\\pi rh$ が<b>最小</b>になる $r$ は？',
      hint: '$C(r)=4\\pi r^2+\\dfrac{700}{r}$。ステージ1とくらべて、ふたの項が2倍になっただけです。答えの $h$ と $r$ の比にも注目。',
      answer: '$C(r)=4\\pi r^2+\\dfrac{700}{r}$ より $C\'(r)=8\\pi r-\\dfrac{700}{r^2}$。<br>$C\'(r)=0$ より $r^3=\\dfrac{87.5}{\\pi}\\approx27.9$、$r\\approx3.03$ cm。<br>このとき $h=\\dfrac{350}{\\pi r^2}=4r\\approx12.1$ cm。ふたが $k$ 倍の値段なら $h=2kr$。本物の缶（高さ約 $12$ cm）に近い縦長の形になる！' },
  ];
  function initGameCan() {
    const root = $id('w-game-can');
    const cvs = root.querySelectorAll('canvas');
    const pp = new Plot(cvs[0], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.62, 0.72] });
    const pg = new Plot(cvs[1], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.72, 0.72] });
    const st = { x: 5, tries: [] };
    let game = null;
    const S = () => CAN_GAME[game ? game.k : 0];
    const ctl = root.querySelector('.controls');
    const sv = slider(ctl, { tex: '\\teal{r}', min: 2.5, max: 7, step: 0.01, value: 5.5, color: 'teal', aria: '変数', fmt: (v) => num(v, 2) });
    sv.on((v) => { if (game.done) return; st.x = v; game.formula(); pp.invalidate(); pg.invalidate(); });
    const B = L.game.gameButtons(ctl, '✅ 判定');
    const conf = L.game.Confetti(root, pg);
    game = L.game.GameShell(root, { key: '4-5:game', stages: CAN_GAME, idle: 'スライダーで決めて「判定」を押そう',
      formula: function () {
        const s = S(), last = st.tries[st.tries.length - 1];
        return '\\begin{aligned}&' + s.v + '=' + fm(st.x, s.step < 0.1 ? 2 : 1) + '\\ \\text{' + s.unit + '}\\\\&' + s.dims(st.x) +
          '\\\\&' + s.ylab + '=' + (game && game.done ? fm(s.F(st.x), 2) : last ? '?\\quad(\\text{前回 }' + fm(last.y, 2) + ')' : '?') + '\\end{aligned}';
      },
      onStage(k, s) {
        st.tries = []; st.x = s.x0;
        sv.input.min = s.min; sv.input.max = s.max; sv.input.step = s.step; sv.input.disabled = false; sv.set(s.x0);
        setTex(sv.row.querySelector('.ctrl-label'), '\\teal{' + s.v + '}');
        pg.setView(s.view);
        B.bMain.disabled = false; B.bNext.hidden = true;
        typeset(R(root, 'mission'));
        pp.invalidate(); pg.invalidate();
      } });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const s = S(), x = st.x, y = s.F(x), m = D.d1(s.F, x);
      game.used++; game.renderThrows();
      const hit = Math.abs(x - s.xs) <= s.tol + 1e-9;
      st.tries.push({ x, y, hit });
      if (hit) {
        const n = 4 - game.used; game.award(n); game.done = true; sv.input.disabled = true;
        game.result('🎉 ほぼ最適！ ' + L.game.starStr(n) + '（' + game.used + ' 回目）　最適は $' + s.v + '\\approx' + fm(s.xs, 2) + '$', 'hit');
        B.bMain.disabled = true; B.bNext.hidden = game.k >= CAN_GAME.length - 1;
        conf.fire(pg.w / 2, pg.h / 3);
      } else {
        const right = s.kind === 'min' ? m < 0 : m > 0;
        const dl = s.ylab + '\'(' + s.v + ')';
        let msg = '✗ まだ最適ではありません。$' + dl + '\\approx' + fm(m, 2) + (m < 0 ? '\\lt0' : '\\gt0') + '$（' + (m < 0 ? '下り坂' : '上り坂') + '）なので、$' + s.v + '$ を<b>' + (right ? 'もっと大きく' : 'もっと小さく') + '</b>すると' + (s.kind === 'min' ? '小さく' : '大きく') + 'なる。';
        if (game.used >= 3) { msg += '　― 3回使い切りました。「答えと解説」を見てから「やり直す」！'; B.bMain.disabled = true; game.done = true; sv.input.disabled = true; }
        game.result(msg, 'miss');
      }
      game.formula();
      pp.invalidate(); pg.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, CAN_GAME.length - 1)));
    pp.draw = function (g) { S().pic(g, st.x); };
    pg.draw = function (g) {
      const cc = g.c, s = S(), v = s.view;
      g.grid({ stepX: v.sx, stepY: v.sy, xlabel: s.v, ylabel: s.ylab });
      g.line(st.x, g.ymin, st.x, g.ymax, { color: cc.muted, width: 1.2, dash: [4, 4] });
      if (game.done) {
        D.curve(g, s.F, { x0: s.min, x1: s.max, color: cc.primary, width: 3.5 });
        g.dot(s.xs, s.F(s.xs), { r: 9, ring: true, color: cc.primary, lw: 2 });
        const lft = g.X(s.xs) > g.w * 0.55;
        g.tex('\\text{最適 }' + s.v + '\\approx' + fm(s.xs, 2), s.xs, s.F(s.xs), s.kind === 'min'
          ? { color: cc.primary, size: 13, align: lft ? 'right' : 'left', valign: 'bottom', dx: lft ? -10 : 10, dy: -12, avoid: true }
          : { color: cc.primary, size: 13, align: 'center', valign: 'top', dy: 14, avoid: true });
      } else {
        g.texPx('\\text{グラフは判定すると見える}', g.w / 2, g.h / 2, { align: 'center', size: 13, color: cc.muted });
      }
      const span = (v.xmax - v.xmin) * 0.12;
      st.tries.forEach((t, i) => {
        const m = D.d1(s.F, t.x);
        if (!t.hit) g.line(t.x - span, t.y - m * span, t.x + span, t.y + m * span, { color: cc.teal, width: 2.5 });
        g.dot(t.x, t.y, { r: 6, color: t.hit ? cc.teal : cc.accent });
        g.tex(String(i + 1), t.x, t.y, { color: t.hit ? cc.teal : cc.accent, size: 13, align: 'center', valign: 'bottom', dy: -10, avoid: true });
      });
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     確認問題の答えのグラフ
     ========================================================== */
  function initQuizFigs() {
    document.querySelectorAll('#check canvas[data-q]').forEach(function (cv) {
      const q = cv.dataset.q;
      const V = q === '1' ? { xmin: -2.5, xmax: 2.5, ymin: -2.5, ymax: 4.6 } : q === '2' ? { xmin: -0.8, xmax: 1.8, ymin: -1.1, ymax: 2.3 } : { xmin: -1.8, xmax: 6.8, ymin: -9, ymax: 11.5 };
      const plot = new Plot(cv, Object.assign({ height: (w) => clamp(w * 0.6, 180, 280) }, V));
      plot.draw = function (g) {
        const c = g.c;
        if (q === '1') {
          g.grid({ step: 1, xlabel: 'x', ylabel: 'y' });
          D.curve(g, (x) => x * x * x - 3 * x + 1, { color: c.primary, width: 3 });
          [[-1, 3, '(-1,\\ 3)', 'bottom'], [1, -1, '(1,\\ -1)', 'top'], [0, 1, '(0,\\ 1)', 'bottom']].forEach((p) => {
            g.dot(p[0], p[1], { r: 5, color: c.primary });
            g.tex(p[2], p[0], p[1], { color: c.text, size: 13, align: p[0] ? 'center' : 'left', dx: p[0] ? 0 : 8, valign: p[3], dy: p[3] === 'top' ? 8 : -8, avoid: true });
          });
        } else if (q === '2') {
          g.grid({ step: 0.5, xlabel: 'x', ylabel: 'y' });
          D.curve(g, (x) => 2 * x * x * x - 3 * x * x + 1, { color: c.primary, width: 3 });
          g.dot(0, 1, { r: 5, color: c.primary }); g.dot(1, 0, { r: 5, color: c.primary });
          g.tex('\\text{極大 }(0,\\ 1)', 0, 1, { color: c.text, size: 13, align: 'left', valign: 'bottom', dx: 6, dy: -8, avoid: true });
          g.tex('\\text{極小 }(1,\\ 0)', 1, 0, { color: c.text, size: 13, align: 'center', valign: 'top', dy: 10, avoid: true });
        } else {
          const ctx = g.ctx;
          ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = c.accent; ctx.fillRect(g.X(0), 0, g.X(6) - g.X(0), g.h); ctx.restore();
          g.grid({ step: 1, stepY: 2, xlabel: 'x', ylabel: 'y' });
          const f = (x) => -x * x + 4 * x + 5;
          D.curve(g, f, { color: c.primary, width: 2.5, alpha: 0.35 });
          D.curve(g, f, { x0: 0, x1: 6, color: c.primary, width: 3.5 });
          g.line(6, 0, 6, -7, { color: c.accent, width: 1.5, dash: [4, 4] });
          g.dot(2, 9, { r: 5.5, color: c.primary }); g.dot(6, -7, { r: 5.5, color: c.accent }); g.dot(0, 5, { r: 5, color: c.accent });
          g.tex('\\text{最大 }(2,\\ 9)', 2, 9, { color: c.text, size: 13, align: 'left', valign: 'bottom', dx: 8, dy: -4, avoid: true });
          g.tex('\\text{最小 }(6,\\ -7)', 6, -7, { color: c.text, size: 13, align: 'right', valign: 'middle', dx: -10, avoid: true });
          g.tex('(0,\\ 5)', 0, 5, { color: c.text, size: 13, align: 'right', dx: -8, avoid: true });
        }
      };
      plot.invalidate();
    });
  }

  D.boot([
    [initSign, 'w-sign'],
    [initTable, 'w-table'],
    [initRange, 'w-range'],
    [initCan, 'w-can'],
    [initBox, 'w-box'],
    [initGameCan, 'w-game-can'],
    [initQuizFigs, 'check'],
  ]);
})();
