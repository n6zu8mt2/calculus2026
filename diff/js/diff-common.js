/* 第4章 微分 — 複数の節で使う部品（window.Diff）
 * 依存: assets/common.js (Lab), assets/plot.js
 *
 * 色の約束: 関数 f = 青(primary)、接線 = 緑(teal)、割線・増分 h = 赤(accent)、導関数 f' = 金(amber)、f'' = 灰(muted)
 *
 *   Diff.R(root,'name') / Diff.tex(root,'name',tex) … data-r の要素を取る／TeX を入れる
 *   Diff.boot([[init, 'w-id'], …])                  … ページにある図だけ初期化
 *   Diff.d1(f, x, h) / Diff.d2(f, x, h)              … 数値微分（中心差分）
 *   Diff.secant(g, f, a, h, opts)                    … 割線（a と a+h を結ぶ直線）を赤で描き、傾きを返す
 *   Diff.tangent(g, f, a, opts)                      … 接線を緑で描き、傾きを返す（opts.df があれば正確な導関数を使う）
 *   Diff.curve(g, f, opts)                           … 関数のグラフ（不連続点で線を切る）
 *   Diff.fracTeX(v, den)                             … 分母 den までの分数で表せれば分数の TeX
 *   Diff.fmt(v, d)                                   … 小数の表示（−0 を 0 に）
 */
(function () {
  'use strict';
  const L = window.Lab;
  const D = {};
  D.R = (root, k) => root.querySelector('[data-r="' + k + '"]');
  D.tex = (root, k, s) => L.setTex(D.R(root, k), s);

  D.boot = function (list) {
    function run() {
      list.forEach(function (e) {
        if (!document.getElementById(e[1])) return;
        try { e[0](); } catch (err) { console.error(e[0].name, err); }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  };

  /* ---------- 数値微分 ---------- */
  D.d1 = (f, x, h) => { h = h || 1e-5; return (f(x + h) - f(x - h)) / (2 * h); };
  D.d2 = (f, x, h) => { h = h || 1e-4; return (f(x + h) - 2 * f(x) + f(x - h)) / (h * h); };

  /* ---------- 表示 ---------- */
  D.fmt = function (v, d) { if (!isFinite(v)) return '—'; const s = L.num(v, d == null ? 3 : d); return s === '-0' ? '0' : s; };
  D.fracTeX = function (v, den) {
    den = den || 12;
    for (let q = 1; q <= den; q++) {
      const p = Math.round(v * q);
      if (Math.abs(v * q - p) < 1e-9) return q === 1 ? String(p) : (p < 0 ? '-' : '') + '\\frac{' + Math.abs(p) + '}{' + q + '}';
    }
    return D.fmt(v);
  };

  /* ---------- グラフ ---------- */
  // 値が大きく飛ぶところ（漸近線など）では線を切る
  D.curve = function (g, f, o) {
    o = o || {};
    const c = g.c, x0 = o.x0 != null ? o.x0 : g.xmin, x1 = o.x1 != null ? o.x1 : g.xmax;
    const n = o.n || Math.max(200, Math.round(g.w)), jump = (g.ymax - g.ymin) * 1.5;
    let seg = [], prev = null;
    const flush = () => { if (seg.length > 1) g.poly(seg, { color: o.color || c.primary, width: o.width || 3, dash: o.dash, alpha: o.alpha }); seg = []; };
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = f(x);
      if (!isFinite(y) || (prev != null && Math.abs(y - prev) > jump)) { flush(); prev = isFinite(y) ? y : null; if (isFinite(y)) seg.push([x, y]); continue; }
      seg.push([x, y]); prev = y;
    }
    flush();
  };
  // 直線 y = f(a) + m (x − a) を画面いっぱいに
  function lineThrough(g, a, fa, m, o) {
    g.line(g.xmin, fa + m * (g.xmin - a), g.xmax, fa + m * (g.xmax - a), o);
  }
  D.secant = function (g, f, a, h, o) {
    o = o || {};
    const c = g.c, fa = f(a), fb = f(a + h), m = (fb - fa) / h;
    lineThrough(g, a, fa, m, { color: o.color || c.accent, width: o.width || 2.5, dash: o.dash });
    if (o.points !== false) { g.dot(a, fa, { r: 5.5, color: o.color || c.accent }); g.dot(a + h, fb, { r: 5.5, color: o.color || c.accent }); }
    if (o.rise !== false) { // 横に h、縦に Δy の階段
      g.line(a, fa, a + h, fa, { color: o.color || c.accent, width: 1.5, dash: [4, 4] });
      g.line(a + h, fa, a + h, fb, { color: o.color || c.accent, width: 1.5, dash: [4, 4] });
    }
    return m;
  };
  D.tangent = function (g, f, a, o) {
    o = o || {};
    const c = g.c, fa = f(a), m = o.df ? o.df(a) : D.d1(f, a);
    lineThrough(g, a, fa, m, { color: o.color || c.teal, width: o.width || 2.5, dash: o.dash });
    if (o.point !== false) g.dot(a, fa, { r: 6, color: o.color || c.teal });
    return m;
  };

  window.Diff = D;
})();
