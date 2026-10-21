/* 第3章 3.4節 三角形を解く — 図
 * 依存: assets/common.js (Lab), assets/plot.js, trig/js/trig-common.js (Trig)
 *
 * この節だけの部品
 *   fitBox(plot, x0, x1, y0, y1, pad) … equal の図で、長方形の範囲がちょうど入るように表示範囲を決める
 *   angArc(g, P, Q, S, r, o)          … 頂点 P の角 ∠QPS の弧
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, D = PI / 180;

  /* ---------- 小さな部品 ---------- */
  function fitBox(plot, x0, x1, y0, y1, pad) {
    const w = plot.w || 300, h = plot.h || 300, p = pad == null ? 0.12 : pad;
    const bw = (x1 - x0) * (1 + 2 * p), bh = (y1 - y0) * (1 + 2 * p);
    const span = Math.max(bw, bh * w / h), cx = (x0 + x1) / 2;
    plot.setView({ xmin: cx - span / 2, xmax: cx + span / 2, yc: (y0 + y1) / 2 });
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = (v) => Math.hypot(v[0], v[1]);
  const ang = (P, Q, S) => { const u = sub(Q, P), v = sub(S, P); return Math.acos(clamp((u[0] * v[0] + u[1] * v[1]) / (len(u) * len(v)), -1, 1)); };
  function angArc(g, P, Q, S, r, o) {
    const a0 = Math.atan2(Q[1] - P[1], Q[0] - P[0]);
    let d = Math.atan2(S[1] - P[1], S[0] - P[0]) - a0;
    while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI;
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = a0 + d * i / 24; pts.push([P[0] + r * Math.cos(a), P[1] + r * Math.sin(a)]); }
    g.poly(pts, { color: o.color, width: o.width || 2.5 });
    if (o.label) {
      const m = a0 + d / 2, rr = r + (o.ldist != null ? o.ldist : r * 0.6);
      g.tex(o.label, P[0] + rr * Math.cos(m), P[1] + rr * Math.sin(m), { color: o.color, size: o.size || 15, align: 'center', avoid: o.avoid });
    }
  }
  function right(g, F, u, v, k) { // 直角の印（F から u 方向と v 方向）
    g.poly([[F[0] + u[0] * k, F[1] + u[1] * k], [F[0] + (u[0] + v[0]) * k, F[1] + (u[1] + v[1]) * k], [F[0] + v[0] * k, F[1] + v[1] * k]], { color: g.c.muted, width: 1.2 });
  }

  /* ==========================================================
     3.4(1) 三角測量：川の向こうの木までの距離
     ========================================================== */
  function initSurvey() {
    const root = $id('w-survey'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -10, xmax: 60, equal: true, yc: 20, ratio: [0.9, 0.5] });
    // わかっていること（青）：基線 c と角 A, B
    const sA = slider(ctl, { tex: '\\blue{A}', min: 25, max: 75, step: 1, value: 60, color: 'primary', aria: '角 A（度）', fmt: (v) => v + '°' });
    const sB = slider(ctl, { tex: '\\blue{B}', min: 25, max: 75, step: 1, value: 45, color: 'primary', aria: '角 B（度）', fmt: (v) => v + '°' });
    const sc = slider(ctl, { tex: '\\blue{c}', min: 20, max: 100, step: 5, value: 50, color: 'primary', aria: '基線の長さ c（m）', fmt: (v) => v + ' m' });
    const chk = R(root, 'circ');
    const geo = () => {
      const A = sA.get() * D, B = sB.get() * D, c = sc.get(), C = PI - A - B;
      const b = c * Math.sin(B) / Math.sin(C), a = c * Math.sin(A) / Math.sin(C);
      const P = [b * Math.cos(A), b * Math.sin(A)], Rr = c / (2 * Math.sin(C));
      return { A, B, C, a, b, c, P, h: P[1], Rr, O: [c / 2, Math.sqrt(Math.max(0, Rr * Rr - c * c / 4)) * (C < PI / 2 ? 1 : -1)] };
    };
    function view() {
      const q = geo();
      let x0 = Math.min(0, q.P[0]), x1 = Math.max(q.c, q.P[0]), y0 = -0.14 * q.c, y1 = q.h * 1.16;
      if (chk.checked) { x0 = Math.min(x0, q.O[0] - q.Rr); x1 = Math.max(x1, q.O[0] + q.Rr); y0 = Math.min(y0, q.O[1] - q.Rr); y1 = Math.max(y1, q.O[1] + q.Rr); }
      fitBox(plot, x0, x1, y0, y1, 0.1);
    }
    plot.onResize = view;
    function update() {
      const q = geo(), Ad = sA.get(), Bd = sB.get(), Cd = 180 - Ad - Bd, cv = sc.get();
      tex(root, 'kc', '\\mathrm{AB}=c=\\blue{' + cv + '\\,\\text{m}}');
      tex(root, 'kA', '\\angle\\mathrm{A}=\\blue{' + Ad + '^\\circ}');
      tex(root, 'kB', '\\angle\\mathrm{B}=\\blue{' + Bd + '^\\circ}');
      tex(root, 'C', 'C=180^\\circ-\\blue{' + Ad + '^\\circ}-\\blue{' + Bd + '^\\circ}=' + Cd + '^\\circ');
      tex(root, 'law', '\\dfrac{b}{\\sin B}=\\dfrac{c}{\\sin C}\\ \\text{より}\\ b=\\dfrac{c\\sin B}{\\sin C}');
      tex(root, 'b', '\\red{b}=\\dfrac{' + cv + '\\sin' + Bd + '^\\circ}{\\sin' + Cd + '^\\circ}\\approx\\red{' + num(q.b, 1) + '\\,\\text{m}}');
      tex(root, 'h', '\\red{h}=b\\sin A\\approx\\red{' + num(q.h, 1) + '\\,\\text{m}}');
      tex(root, 'a', '\\red{a}=\\dfrac{c\\sin A}{\\sin C}\\approx\\red{' + num(q.a, 1) + '\\,\\text{m}}');
      tex(root, 'R', '2R=\\dfrac{c}{\\sin C}\\approx' + num(2 * q.Rr, 1) + '\\,\\text{m}');
      view(); plot.invalidate();
    }
    [sA, sB, sc].forEach((s) => s.on(update));
    chk.addEventListener('change', update);
    plot.draw = function (g) {
      const c = g.c, q = geo(), A = [0, 0], B = [q.c, 0], P = q.P, ctx = g.ctx;
      const known = c.primary, unk = c.accent;
      // 川：A, B のいる岸（y = 0）から、木のある向こう岸（y = h）まで
      ctx.save(); ctx.fillStyle = c.primary; ctx.globalAlpha = 0.08;
      ctx.fillRect(0, g.Y(q.h), g.w, g.Y(0) - g.Y(q.h)); ctx.restore();
      g.line(g.xmin, 0, g.xmax, 0, { color: c.muted, width: 1, alpha: 0.6 });
      g.line(g.xmin, q.h, g.xmax, q.h, { color: c.muted, width: 1, alpha: 0.6 });
      g.text('川', g.xmin, q.h * 0.5, { dx: 10, size: 13, bold: true, color: c.muted });
      if (chk.checked) {
        ctx.save(); ctx.strokeStyle = c.muted; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(g.X(q.O[0]), g.Y(q.O[1]), q.Rr * g.pxPerX, 0, 2 * PI); ctx.stroke(); ctx.restore();
        g.dot(q.O[0], q.O[1], { r: 3.5, color: c.muted });
        g.line(q.O[0], q.O[1], P[0], P[1], { color: c.muted, width: 1.5, dash: [3, 4] });
        g.tex('R', (q.O[0] + P[0]) / 2, (q.O[1] + P[1]) / 2, { dx: 8, size: 14, color: c.muted, avoid: true });
      }
      // 知りたいもの（赤）：b, a, h
      g.line(P[0], 0, P[0], P[1], { color: unk, width: 2, dash: [6, 5] });
      const ks = q.h * 0.06;
      right(g, [P[0], 0], [1, 0], [0, 1], Math.min(ks, q.c * 0.05));
      g.tex('h=\\,?', P[0], P[1] * 0.3, { dx: 7, size: 15, color: unk, align: 'left', avoid: true });
      g.line(A[0], A[1], P[0], P[1], { color: unk, width: 3 });
      g.line(B[0], B[1], P[0], P[1], { color: unk, width: 2, dash: [6, 5] });
      // わかっているもの（青）：基線 c と角 A, B
      g.line(A[0], A[1], B[0], B[1], { color: known, width: 4 });
      const k = Math.min(q.c, q.b) * 0.2;
      angArc(g, A, B, P, k, { color: known, label: sA.get() + '^\\circ', ldist: k * 0.75, avoid: true });
      angArc(g, B, P, A, k, { color: known, label: sB.get() + '^\\circ', ldist: k * 0.75, avoid: true });
      angArc(g, P, A, B, k * 0.6, { color: c.muted, width: 1.8 });
      g.tex('c=' + sc.get() + '\\,\\text{m}', q.c / 2, 0, { dy: 16, align: 'center', size: 15, color: known, avoid: true });
      g.tex('b=\\,?', P[0] * 0.45, P[1] * 0.62, { dx: -8, align: 'right', size: 16, color: unk, avoid: true });
      g.tex('a=\\,?', P[0] + (q.c - P[0]) * 0.55, P[1] * 0.62, { dx: 8, align: 'left', size: 16, color: unk, avoid: true });
      g.dot(A[0], A[1], { r: 6, color: c.text }); g.dot(B[0], B[1], { r: 6, color: c.text });
      g.tex('\\mathrm{A}', 0, 0, { dx: -8, dy: 12, align: 'right', size: 15 });
      g.tex('\\mathrm{B}', q.c, 0, { dx: 8, dy: 12, align: 'left', size: 15 });
      g.text('🌳', P[0], P[1], { size: 26, align: 'center', base: 'bottom', dy: 6, halo: false });
      g.tex('\\mathrm{C}\\ \\text{（木）}', P[0], P[1], { dx: 18, dy: -14, size: 14 });
    };
    view(); update();
  }

  /* ==========================================================
     3.4(2) 余弦定理：頂点をドラッグ
     ========================================================== */
  function initCosLaw() {
    const root = $id('w-coslaw');
    const cvs = root.querySelectorAll('canvas');
    const plot = new Plot(cvs[0], { xmin: -3.2, xmax: 3.2, equal: true, yc: 0.3, ratio: [0.85, 0.5] });
    const bars = new Plot(cvs[1], { xmin: 0, xmax: 1, ymin: 0, ymax: 1, height: (w) => (w < 520 ? 120 : 110) });
    const st = { A: [-1.8, -1], B: [2, -1], C: [-0.6, 1.6] };
    const area2 = (A, B, C) => (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    function fit() { const hy = 2.1, w = plot.w || 300, h = plot.h || 300, hx = Math.max(3.1, hy * w / h); plot.setView({ xmin: -hx, xmax: hx, yc: 0.3 }); }
    plot.onResize = fit; fit();
    ['A', 'B', 'C'].forEach(function (k) {
      plot.addHandle({
        get x() { return st[k][0]; }, get y() { return st[k][1]; }, r: 8,
        get color() { return k === 'A' ? plot.c.primary : plot.c.text; },
        drag(x, y) {
          const p = [clamp(Math.round(x * 10) / 10, plot.xmin + 0.2, plot.xmax - 0.2), clamp(Math.round(y * 10) / 10, plot.ymin + 0.2, plot.ymax - 0.2)];
          const nx = Object.assign({}, st, { [k]: p });
          if (Math.abs(area2(nx.A, nx.B, nx.C)) < 0.4) return;
          st[k] = p; update();
        },
      });
    });
    function geo() {
      const a = len(sub(st.B, st.C)), b = len(sub(st.C, st.A)), c = len(sub(st.A, st.B)), A = ang(st.A, st.B, st.C);
      return { a, b, c, A };
    }
    R(root, 'right').addEventListener('click', function () {
      const u = sub(st.B, st.A), s = Math.sign(area2(st.A, st.B, st.C)) || 1, b = len(sub(st.C, st.A)), n = [-u[1] * s / len(u), u[0] * s / len(u)];
      let C = [st.A[0] + n[0] * b, st.A[1] + n[1] * b];
      C = [clamp(C[0], plot.xmin + 0.2, plot.xmax - 0.2), clamp(C[1], plot.ymin + 0.2, plot.ymax - 0.2)];
      st.C = C; update(true);
    });
    let exact = false;
    function update(ex) {
      exact = ex === true;
      const q = geo(), Ad = q.A / D, cosA = Math.cos(q.A), right90 = exact || Math.abs(Ad - 90) < 0.5;
      const t = -2 * q.b * q.c * cosA;
      tex(root, 'A', '\\blue{A}\\approx' + num(Ad, 1) + '^\\circ,\\quad \\teal{\\cos A}\\approx' + num(cosA, 3));
      tex(root, 'eq', '\\violet{a^2}=b^2+c^2\\teal{-2bc\\cos A}');
      tex(root, 'num', '\\violet{' + num(q.a * q.a, 2) + '}\\approx' + num(q.b * q.b, 2) + '+' + num(q.c * q.c, 2) + '\\teal{' + (t < 0 ? '-' : '+') + num(Math.abs(t), 2) + '}');
      const m = R(root, 'msg');
      m.textContent = right90 ? 'A = 90° なので cos A = 0。−2bc cos A が消えて、三平方の定理 a² = b² + c² になる！'
        : (Ad < 90 ? 'A が鋭角 → cos A > 0。a² は b² + c² より 2bc cos A だけ小さい' : 'A が鈍角 → cos A < 0。a² は b² + c² より大きい');
      m.className = 'msg ' + (right90 ? 'ok' : 'ng');
      plot.invalidate(); bars.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, A = st.A, B = st.B, C = st.C, q = geo();
      g.grid({ step: 1, labels: false, axes: false });
      // C から直線 AB への垂線の足 F（b cos A の長さ）
      const u = sub(B, A), ul = len(u), e = [u[0] / ul, u[1] / ul], bc = (C[0] - A[0]) * e[0] + (C[1] - A[1]) * e[1];
      const F = [A[0] + e[0] * bc, A[1] + e[1] * bc];
      if (bc < 0 || bc > ul) g.line(A[0], A[1], F[0], F[1], { color: c.muted, width: 1.5, dash: [3, 4] });
      g.line(C[0], C[1], F[0], F[1], { color: c.accent, width: 2.2, dash: [5, 4] });
      const nv = [C[0] - F[0], C[1] - F[1]], nl = len(nv);
      if (nl > 0.15 && Math.abs(bc) > 0.15) right(g, F, bc > 0 ? [-e[0], -e[1]] : e, [nv[0] / nl, nv[1] / nl], 0.14);
      // 辺
      g.line(B[0], B[1], C[0], C[1], { color: c.violet, width: 4 });
      g.line(A[0], A[1], C[0], C[1], { color: c.text, width: 2.5 });
      g.line(A[0], A[1], B[0], B[1], { color: c.text, width: 2.5 });
      if (Math.abs(bc) > 0.05) {
        // b cos A（b の、c の方向への横の影）
        const off = 0.13, s = Math.sign(area2(A, B, C)) || 1, o = [e[1] * off * s, -e[0] * off * s];
        g.line(A[0] + o[0], A[1] + o[1], F[0] + o[0], F[1] + o[1], { color: c.teal, width: 4 });
        g.tex('b\\cos A', (A[0] + F[0]) / 2 + o[0] * 2.6, (A[1] + F[1]) / 2 + o[1] * 2.6, { color: c.teal, size: 14, align: 'center', avoid: true });
      }
      // b sin A（縦の影 CF）と 垂線の足 F
      if (nl > 0.3) {
        const M = [(C[0] + F[0]) / 2, (C[1] + F[1]) / 2], sd = (bc > ul / 2 ? -1 : 1) * (e[0] >= 0 ? 1 : -1);
        g.tex('b\\sin A', M[0], M[1], { color: c.accent, size: 14, dx: 7 * sd, align: sd > 0 ? 'left' : 'right', avoid: true });
      }
      { const s = Math.sign(area2(A, B, C)) || 1; g.tex('\\mathrm{F}', F[0] + e[1] * 0.3 * s, F[1] - e[0] * 0.3 * s, { color: c.muted, size: 14, align: 'center', avoid: true }); }
      angArc(g, A, B, C, 0.42, { color: c.primary, label: 'A', ldist: 0.24 });
      // 辺の名前（三角形の外側に）
      const G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      const side = (P, Q, t, col) => {
        const M = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], d = sub(M, G), dl = len(d) || 1;
        g.tex(t, M[0] + d[0] / dl * 0.3, M[1] + d[1] / dl * 0.3, { color: col, size: 16, align: 'center', avoid: true });
      };
      side(B, C, 'a', c.violet); side(A, C, 'b', c.text); side(A, B, 'c', c.text);
      [['A', A], ['B', B], ['C', C]].forEach(function (p) {
        const d = sub(p[1], G), dl = len(d) || 1;
        g.tex('\\mathrm{' + p[0] + '}', p[1][0] + d[0] / dl * 0.42, p[1][1] + d[1] / dl * 0.42, { size: 15, align: 'center', color: p[0] === 'A' ? c.primary : c.text });
      });
    };
    // 下の棒：b²＋c² と a² をくらべる
    bars.draw = function (g) {
      const c = g.c, q = geo(), ctx = g.ctx, b2 = q.b * q.b, c2 = q.c * q.c, a2 = q.a * q.a, t = -2 * q.b * q.c * Math.cos(q.A);
      const mx = Math.max(b2 + c2, a2) * 1.08, L0 = g.w < 520 ? 56 : 70, W = g.w - L0 - 14, X = (v) => L0 + W * v / mx;
      const y1 = 18, y2 = 64, hh = 26;
      const box = (x0, x1, y, col, al) => { ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = al; ctx.fillRect(X(x0), y, X(x1) - X(x0), hh); ctx.restore(); };
      box(0, b2, y1, c.muted, 0.35); box(b2, b2 + c2, y1, c.muted, 0.6);
      box(0, a2, y2, c.violet, 0.75);
      // −2bc cosA の部分
      if (Math.abs(t) > 1e-3) {
        const lo = Math.min(a2, b2 + c2), hi = Math.max(a2, b2 + c2);
        ctx.save(); ctx.strokeStyle = c.teal; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
        ctx.strokeRect(X(lo), t < 0 ? y1 : y2, X(hi) - X(lo), hh); ctx.restore();
        g.texPx('\\teal{' + (t < 0 ? '-' : '+') + '2bc\\cos A' + '}', (X(lo) + X(hi)) / 2, (y1 + y2 + hh) / 2, { align: 'center', size: 13 });
      }
      g.texPx('b^2+c^2', L0 - 6, y1 + hh / 2, { align: 'right', size: 13, color: c.text });
      g.texPx('\\violet{a^2}', L0 - 6, y2 + hh / 2, { align: 'right', size: 14 });
      g.texPx('b^2', X(b2 / 2), y1 + hh / 2, { align: 'center', size: 12, color: c.text });
      g.texPx('c^2', X(b2 + c2 / 2), y1 + hh / 2, { align: 'center', size: 12, color: c.text });
    };
    update();
  }

  /* ==========================================================
     3.4(3) 雑談：モーリーの定理
     ========================================================== */
  function initMorley() {
    const root = $id('w-morley');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -3.2, xmax: 3.2, equal: true, yc: 0.2, ratio: [0.85, 0.5] });
    function fit() { const hy = 2.1, w = plot.w || 300, h = plot.h || 300, hx = Math.max(3.1, hy * w / h); plot.setView({ xmin: -hx, xmax: hx, yc: 0.2 }); }
    plot.onResize = fit; fit();
    const st = { A: [-0.9, 1.7], B: [-2.4, -1.4], C: [2.5, -1.2], tri: true };
    const area2 = (A, B, C) => (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    ['A', 'B', 'C'].forEach(function (k) {
      plot.addHandle({
        get x() { return st[k][0]; }, get y() { return st[k][1]; }, r: 8, get color() { return plot.c.text; },
        drag(x, y) {
          const p = [clamp(x, plot.xmin + 0.2, plot.xmax - 0.2), clamp(y, plot.ymin + 0.2, plot.ymax - 0.2)];
          const nx = Object.assign({}, st, { [k]: p });
          if (Math.abs(area2(nx.A, nx.B, nx.C)) < 0.5) return;
          st[k] = p; update();
        },
      });
    });
    R(root, 'lines').addEventListener('change', (e) => { st.tri = e.target.checked; plot.invalidate(); });
    // 頂点 P から、辺 PQ の側の 3等分線の向き
    function tri(P, Q, S) {
      const u = sub(Q, P), ul = len(u), a = ang(P, Q, S) / 3, s = Math.sign(area2(P, Q, S)) || 1;
      const ca = Math.cos(s * a), sa = Math.sin(s * a);
      return [(u[0] * ca - u[1] * sa) / ul, (u[0] * sa + u[1] * ca) / ul];
    }
    function meet(P, d, Q, e) { // P + t d = Q + s e
      const det = d[0] * (-e[1]) - d[1] * (-e[0]); if (Math.abs(det) < 1e-12) return P;
      const r = [Q[0] - P[0], Q[1] - P[1]], t = (r[0] * (-e[1]) - r[1] * (-e[0])) / det;
      return [P[0] + t * d[0], P[1] + t * d[1]];
    }
    function morley() {
      const { A, B, C } = st;
      const Pa = meet(B, tri(B, C, A), C, tri(C, B, A));  // 辺 BC の近く
      const Pb = meet(C, tri(C, A, B), A, tri(A, C, B));  // 辺 CA の近く
      const Pc = meet(A, tri(A, B, C), B, tri(B, A, C));  // 辺 AB の近く
      return { Pa, Pb, Pc };
    }
    function update() {
      const { Pa, Pb, Pc } = morley(), d1 = len(sub(Pa, Pb)), d2 = len(sub(Pb, Pc)), d3 = len(sub(Pc, Pa));
      const { A, B, C } = st, a1 = ang(A, B, C) / D, b1 = ang(B, C, A) / D, c1 = 180 - a1 - b1;
      tex(root, 'ang', 'A\\approx' + num(a1, 1) + '^\\circ,\\ B\\approx' + num(b1, 1) + '^\\circ,\\ C\\approx' + num(c1, 1) + '^\\circ');
      tex(root, 'sides', '\\amber{' + num(d1, 3) + '},\\ \\amber{' + num(d2, 3) + '},\\ \\amber{' + num(d3, 3) + '}');
      tex(root, 'diff', '\\text{最大}-\\text{最小}=' + num(Math.max(d1, d2, d3) - Math.min(d1, d2, d3), 6));
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, { A, B, C } = st, { Pa, Pb, Pc } = morley(), ctx = g.ctx;
      g.grid({ step: 1, labels: false, axes: false });
      g.poly([A, B, C, A], { color: c.text, width: 2.5 });
      if (st.tri) {
        const seg = (P, Q) => g.line(P[0], P[1], Q[0], Q[1], { color: c.primary, width: 1.6, alpha: 0.85 });
        seg(B, Pa); seg(C, Pa); seg(C, Pb); seg(A, Pb); seg(A, Pc); seg(B, Pc);
        // 3等分線を三角形の辺まで薄く延ばす
        [[A, B, C], [B, C, A], [C, A, B]].forEach(function (t) {
          [tri(t[0], t[1], t[2]), tri(t[0], t[2], t[1])].forEach(function (d) {
            const E = meet(t[0], d, t[1], sub(t[2], t[1]));
            g.line(t[0][0], t[0][1], E[0], E[1], { color: c.primary, width: 1, alpha: 0.3, dash: [4, 4] });
          });
        });
      }
      ctx.save(); ctx.fillStyle = c.amber; ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.moveTo(g.X(Pa[0]), g.Y(Pa[1])); ctx.lineTo(g.X(Pb[0]), g.Y(Pb[1])); ctx.lineTo(g.X(Pc[0]), g.Y(Pc[1])); ctx.closePath(); ctx.fill(); ctx.restore();
      g.poly([Pa, Pb, Pc, Pa], { color: c.amber, width: 3 });
      const G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      [['A', A], ['B', B], ['C', C]].forEach(function (p) {
        const d = sub(p[1], G), dl = len(d) || 1;
        g.tex('\\mathrm{' + p[0] + '}', p[1][0] + d[0] / dl * 0.38, p[1][1] + d[1] / dl * 0.38, { size: 15, align: 'center' });
      });
    };
    update();
  }

  T.boot([
    [initSurvey, 'w-survey'],
    [initCosLaw, 'w-coslaw'],
    [initMorley, 'w-morley'],
  ]);
})();
