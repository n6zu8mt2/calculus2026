/* 第3章 3.3節 単位円と三角関数 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 *
 * この節だけの部品
 *   fitCircle(plot, half)  … 縦横どちらにも ±half が入るように表示範囲を決める（equal の図用）
 *   drawAngle(g, θ, o)     … 何周でも見分けられる「うず巻き」の角の弧（矢印つき）
 *   ucBase(g) / ucCircle(g) / ucDraw(g, θ, o) … 目盛りの数字を ±1 だけにした単位円（ucDraw は Trig.unitCircle を包む）
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI;
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
  function fitCircle(plot, half) {
    const w = plot.w || 300, h = plot.h || 300;
    const hx = half * Math.max(1, w / h);
    plot.setView({ xmin: -hx, xmax: hx, yc: 0 });
  }
  const EX = [0, 0.5, Math.SQRT2 / 2, Math.sqrt(3) / 2, 1, Math.sqrt(3), 1 / Math.sqrt(3)];
  const isExact = (v) => EX.some((e) => Math.abs(Math.abs(v) - e) < 1e-9);
  const vt = (v) => (isExact(v) ? '=' + T.exactTeX(v) : '\\approx ' + num(v, 3));
  const sqTeX = (v) => ({ 0: '0', 0.25: '\\frac14', 0.5: '\\frac12', 0.75: '\\frac34', 1: '1' })[Math.round(v * 4) / 4];
  const clean = (v) => (Math.abs(v) < 1e-12 ? 0 : v);
  const mod2pi = (a) => { a = a % TAU; if (a < 0) a += TAU; return Math.abs(a - TAU) < 1e-9 ? 0 : a; };
  // 角 θ の弧。周回ごとに少しずつ外へずらす
  function drawAngle(g, th, o) {
    o = o || {};
    const c = g.c, r0 = o.r || 0.2, grow = o.grow == null ? 0.06 : o.grow, col = o.color || c.primary;
    const n = Math.max(10, Math.ceil(Math.abs(th) / 0.04)), pts = [];
    for (let i = 0; i <= n; i++) { const a = th * i / n, r = r0 + grow * Math.abs(a) / TAU; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
    if (Math.abs(th) < 1e-6) return;
    g.poly(pts, { color: col, width: o.width || 3 });
    // 矢印の先
    const a1 = pts[n], a0 = pts[Math.max(0, n - 3)];
    g.arrow(a0[0], a0[1], a1[0], a1[1], { color: col, width: 2, head: 10 });
    if (o.label) {
      const m = th / 2, rr = r0 + grow * Math.abs(m) / TAU + (o.ldist || 0.14);
      g.tex(o.label, rr * Math.cos(Math.abs(th) > TAU ? 0.35 : m), rr * Math.sin(Math.abs(th) > TAU ? 0.35 : m), { color: col, size: 16, align: 'center' });
    }
  }

  // 単位円の下地：目盛りの数字は ±1 だけにして、cos・sin のラベルとぶつけない
  function ucBase(g, one) {
    const c = g.c;
    g.grid({ stepX: 0.5, stepY: 0.5, labels: false, xlabel: 'x', ylabel: 'y' });
    g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
    const o = { size: 13, color: c.muted };
    if (one !== false) g.tex('1', 1, 0, Object.assign({ dx: 5, dy: 10, valign: 'top' }, o));
    g.tex('-1', -1, 0, Object.assign({ dx: -5, dy: 10, align: 'right', valign: 'top' }, o));
    g.tex('1', 0, 1, Object.assign({ dx: -6, dy: -9, align: 'right' }, o));
    g.tex('-1', 0, -1, Object.assign({ dx: -6, dy: 9, align: 'right' }, o));
  }
  function ucCircle(g) {
    const ctx = g.ctx; ctx.save(); ctx.strokeStyle = g.c.muted; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), g.pxPerX, 0, TAU); ctx.stroke(); ctx.restore();
  }
  // Trig.unitCircle を、上の下地で使う（Trig.unitCircle の中の grid は呼ばない）
  function ucDraw(g, th, o, one) {
    ucBase(g, one);
    g.grid = function () {};
    try { return T.unitCircle(g, th, o); } finally { delete g.grid; }
  }

  /* ==========================================================
     3.3(2) 単位円上の点 P(cosθ, sinθ)
     ========================================================== */
  function initUcDef() {
    const root = $id('w-uc-def');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 1.6, equal: true, yc: 0, ratio: [0.95, 0.56] });
    plot.onResize = () => fitCircle(plot, 1.45);
    fitCircle(plot, 1.45);
    const st = { th: PI / 6, snap: PI / 12, tan: false };
    const ctl = root.querySelector('.controls');
    const sl = slider(ctl, { tex: '\\blue{\\theta}', min: -720, max: 720, step: 15, value: 30, color: 'primary', aria: '角 θ（度）', fmt: (v) => v + '°' });
    sl.on((v) => { st.th = v * PI / 180; update(); });
    const PRE = [{ label: '30°', d: 30 }, { label: '120°', d: 120 }, { label: '−30°', d: -30 }, { label: '225°', d: 225 }, { label: '390°（1周＋30°）', d: 390 }];
    const pre = chipRow(R(root, 'presets'), PRE, 0, (it) => { st.th = it.d * PI / 180; update(); });
    chipRow(R(root, 'snap'), [{ label: '15° ごと', s: PI / 12, step: 15 }, { label: '1° ごと', s: PI / 180, step: 1 }], 0, (it) => {
      st.snap = it.s; sl.input.step = it.step; st.th = Math.round(st.th / it.s) * it.s; update();
    });
    R(root, 'showtan').addEventListener('change', (e) => { st.tan = e.target.checked; update(); });
    T.angleHandle(plot, () => st.th, (a) => { st.th = clamp(a, -4 * PI, 4 * PI); update(); }, { continuous: true, snap: PI / 12 });
    // ハンドルの刻みは st.snap に合わせる
    plot.handles[0].drag = function (x, y) {
      let a = Math.atan2(y, x); const prev = st.th; a = prev + T.wrapPi(a - prev);
      a = Math.round(a / st.snap) * st.snap; st.th = clamp(a, -4 * PI, 4 * PI); update();
    };
    function update() {
      const th = st.th, cs = clean(Math.cos(th)), sn = clean(Math.sin(th)), deg = Math.round(th * 180 / PI);
      sl.set(clamp(deg, -720, 720));
      pre.forEach((b, j) => b.setAttribute('aria-pressed', String(Math.abs(PRE[j].d - th * 180 / PI) < 1e-6)));
      let a = '\\blue{\\theta}=' + T.angleTeX(th);
      if (th < 0 || th >= TAU - 1e-9) a += '\\quad\\text{（}' + T.radTeX(mod2pi(th)) + '\\text{ と同じ位置）}';
      tex(root, 'ang', a);
      tex(root, 'pt', '\\mathrm{P}(\\teal{\\cos\\theta},\\ \\red{\\sin\\theta})=\\left(\\teal{' + T.exactTeX(cs) + '},\\ \\red{' + T.exactTeX(sn) + '}\\right)' + (isExact(cs) && isExact(sn) ? '' : '\\ \\text{（約）}'));
      tex(root, 'tan', Math.abs(cs) < 1e-9 ? '\\amber{\\tan\\theta}\\ \\text{は なし}\\ (\\teal{\\cos\\theta}=0\\ \\text{で割れない})'
        : '\\amber{\\tan\\theta}=\\dfrac{\\red{\\sin\\theta}}{\\teal{\\cos\\theta}}' + vt(sn / cs));
      tex(root, 'pyth', '\\teal{\\cos^2\\theta}+\\red{\\sin^2\\theta}' + (isExact(cs) && isExact(sn) ? '=' + sqTeX(cs * cs) + '+' + sqTeX(sn * sn) : '\\approx' + num(cs * cs, 3) + '+' + num(sn * sn, 3)) + '=1');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, th = st.th, x = Math.cos(th), y = Math.sin(th), ctx = g.ctx;
      // 今いる象限をうすく塗る
      const q0 = Math.floor(mod2pi(th) / (PI / 2));
      const onAxis = Math.abs(mod2pi(th) % (PI / 2)) < 1e-9;
      ucDraw(g, th, { arc: false, tan: st.tan }, false);
      if (!onAxis) {
        ctx.save(); ctx.fillStyle = c.primary; ctx.globalAlpha = 0.06;
        ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.arc(g.X(0), g.Y(0), g.pxPerX, -q0 * PI / 2, -(q0 + 1) * PI / 2, true); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      // 直角三角形（O, 足, P）
      if (Math.abs(x) > 0.02 && Math.abs(y) > 0.02) {
        ctx.save(); ctx.fillStyle = c.amber; ctx.globalAlpha = 0.12;
        ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(x), g.Y(0)); ctx.lineTo(g.X(x), g.Y(y)); ctx.closePath(); ctx.fill(); ctx.restore();
        const k = 0.07, sx = x > 0 ? -1 : 1, sy = y > 0 ? 1 : -1;
        g.poly([[x + sx * k, 0], [x + sx * k, sy * k], [x, sy * k]], { color: c.muted, width: 1.2 });
      }
      drawAngle(g, th, { label: '\\theta' });
      if (st.tan && Math.abs(x) > 1e-9) {
        const t = y / x, top = g.ymax - 0.12;
        if (Math.abs(t) > top) g.tex('\\amber{\\tan\\theta=' + T.exactTeX(t) + (t > 0 ? '\\ \\uparrow' : '\\ \\downarrow') + '}\\ \\text{（図の外）}', 1, t > 0 ? top : -top, { dx: 8, size: 14 });
      }
      g.dot(1, 0, { r: 4, color: c.muted });
      g.tex('(1,\\,0)', 1, 0, { dx: 6, dy: 12, size: 13, color: c.muted });
      // 点 P のラベル（半径の外側）
      g.tex('\\mathrm{P}', 1.13 * x, 1.13 * y, { color: c.primary, size: 16, align: 'center' });
    };
    update();
  }

  /* ==========================================================
     3.3(3) 対称な角：2つの点を同時に
     ========================================================== */
  const PARTNERS = [
    { label: '−θ', tex: '-\\theta', f: (t) => -t, mirror: 'x', how: '$x$ 軸について折り返す → $\\red{y}$ 座標（$\\red{\\sin}$）だけ符号が変わる',
      eq: (s, c) => ['\\sin(-\\theta)=-\\sin\\theta', '\\cos(-\\theta)=\\cos\\theta', '\\tan(-\\theta)=-\\tan\\theta'] },
    { label: 'π−θ', tex: '\\pi-\\theta', f: (t) => PI - t, mirror: 'y', how: '$y$ 軸について折り返す → $\\teal{x}$ 座標（$\\teal{\\cos}$）だけ符号が変わる',
      eq: () => ['\\sin(\\pi-\\theta)=\\sin\\theta', '\\cos(\\pi-\\theta)=-\\cos\\theta', '\\tan(\\pi-\\theta)=-\\tan\\theta'] },
    { label: 'π+θ', tex: '\\pi+\\theta', f: (t) => PI + t, mirror: 'o', how: '原点について反対側（半周まわす）→ $\\teal{x}$ も $\\red{y}$ も符号が変わる',
      eq: () => ['\\sin(\\pi+\\theta)=-\\sin\\theta', '\\cos(\\pi+\\theta)=-\\cos\\theta', '\\tan(\\pi+\\theta)=\\tan\\theta'] },
    { label: 'π/2−θ', tex: '\\frac{\\pi}{2}-\\theta', f: (t) => PI / 2 - t, mirror: 'd', how: '直線 $y=x$ について折り返す → $\\teal{x}$ と $\\red{y}$ が入れかわる',
      eq: () => ['\\sin\\left(\\tfrac{\\pi}{2}-\\theta\\right)=\\cos\\theta', '\\cos\\left(\\tfrac{\\pi}{2}-\\theta\\right)=\\sin\\theta', '\\tan\\left(\\tfrac{\\pi}{2}-\\theta\\right)=\\dfrac{1}{\\tan\\theta}'] },
  ];
  function initUcSym() {
    const root = $id('w-uc-sym');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 1.6, equal: true, yc: 0, ratio: [0.95, 0.56] });
    plot.onResize = () => fitCircle(plot, 1.3);
    fitCircle(plot, 1.3);
    const st = { th: PI / 6, k: 0 };
    chipRow(R(root, 'partner'), PARTNERS.map((p) => ({ tex: p.tex })), 0, (it, i) => { st.k = i; update(); });
    T.angleHandle(plot, () => st.th, (a) => { st.th = mod2pi(a); update(); }, { snap: PI / 12 });
    function update() {
      const P = PARTNERS[st.k], th = st.th, ph = P.f(th);
      tex(root, 'p', '\\mathrm{P}:\\ \\blue{\\theta}=' + T.angleTeX(th) + ',\\ (\\teal{' + T.exactTeX(clean(Math.cos(th))) + '},\\ \\red{' + T.exactTeX(clean(Math.sin(th))) + '})');
      tex(root, 'q', '\\mathrm{Q}:\\ \\violet{' + P.tex + '}=' + T.radTeX(ph) + ',\\ (\\teal{' + T.exactTeX(clean(Math.cos(ph))) + '},\\ \\red{' + T.exactTeX(clean(Math.sin(ph))) + '})');
      const how = R(root, 'how'); how.innerHTML = P.how; typeset(how);
      tex(root, 'eq', '\\begin{gathered}' + P.eq().join('\\\\') + '\\end{gathered}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, P = PARTNERS[st.k], th = st.th, ph = P.f(th);
      const x = Math.cos(th), y = Math.sin(th), u = Math.cos(ph), v = Math.sin(ph);
      ucBase(g);
      // 折り返しの線
      const M = 3;
      if (P.mirror === 'x') g.line(-M, 0, M, 0, { color: c.amber, width: 3, alpha: 0.6 });
      if (P.mirror === 'y') g.line(0, -M, 0, M, { color: c.amber, width: 3, alpha: 0.6 });
      if (P.mirror === 'd') g.line(-M, -M, M, M, { color: c.amber, width: 3, alpha: 0.6, dash: [8, 6] });
      if (P.mirror === 'o') { g.line(x, y, u, v, { color: c.amber, width: 2, dash: [6, 5] }); g.dot(0, 0, { r: 5, color: c.amber }); }
      ucCircle(g);
      // Q（相手の角）：点線の影
      g.line(u, 0, u, v, { color: c.accent, width: 2.5, dash: [5, 4] });
      g.line(0, 0, u, 0, { color: c.teal, width: 2.5, dash: [5, 4] });
      g.line(0, 0, u, v, { color: c.violet, width: 2.5 });
      drawAngle(g, ph, { r: 0.34, grow: 0.03, color: c.violet, width: 2 });
      // P（もとの角）：実線の影
      g.line(x, 0, x, y, { color: c.accent, width: 3.5 });
      g.line(0, 0, x, 0, { color: c.teal, width: 3.5 });
      g.line(0, 0, x, y, { color: c.text, width: 2.5 });
      drawAngle(g, th, { r: 0.18, grow: 0, label: '\\theta', ldist: 0.1 });
      g.dot(u, v, { r: 6, color: c.violet });
      g.tex('\\mathrm{Q}', 1.14 * u, 1.14 * v, { color: c.violet, size: 16, align: 'center', avoid: true });
      g.tex('\\mathrm{P}', 1.14 * x, 1.14 * y, { color: c.primary, size: 16, align: 'center', avoid: true });
    };
    update();
  }

  /* ==========================================================
     3.3 小話：HSL（向き＝色相 H、中心からの距離＝彩度 S、明度 L はスライダー）
     ========================================================== */
  // HSL → RGB（h: 度, s・l: 0〜1）。CSS と同じ計算
  function hslToRgb(h, s, l) {
    const f = (n) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
  }
  const rgbHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  function initHue() {
    const root = $id('w-hue');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.4, xmax: 1.4, equal: true, yc: 0, ratio: [0.86, 0.46] });
    plot.onResize = () => fitCircle(plot, 1.22);
    fitCircle(plot, 1.22);
    const RD = 0.9;                                   // S = 100% の半径
    const st = { h: 120, s: 85, l: 52 };
    const ctl = root.querySelector('.controls');
    const sH = slider(ctl, { tex: '\\blue{H}', min: 0, max: 359, step: 1, value: st.h, color: 'primary', aria: '色相 H（度）', fmt: (v) => v + '°' });
    const sS = slider(ctl, { tex: '\\teal{S}', min: 0, max: 100, step: 1, value: st.s, color: 'teal', aria: '彩度 S（%）', fmt: (v) => v + '%' });
    const sL = slider(ctl, { tex: 'L', min: 0, max: 100, step: 1, value: st.l, color: 'violet', aria: '明度 L（%）', fmt: (v) => v + '%' });
    sH.on((v) => { st.h = v; update(); });
    sS.on((v) => { st.s = v; update(); });
    sL.on((v) => { st.l = v; update(); });
    const css = (h, s, l) => 'hsl(' + Math.round(h) + ', ' + Math.round(s) + '%, ' + Math.round(l) + '%)';
    const hex = (h, s, l) => rgbHex(hslToRgb(h, s / 100, l / 100));
    // 点をドラッグ：向き → H、中心からの距離 → S
    plot.addHandle({
      get x() { return RD * st.s / 100 * Math.cos(st.h * PI / 180); },
      get y() { return RD * st.s / 100 * Math.sin(st.h * PI / 180); },
      get color() { return hex(st.h, st.s, st.l); }, r: 10,
      drag(x, y) {
        const d = Math.hypot(x, y);
        if (d > 0.03) st.h = Math.round(mod2pi(Math.atan2(y, x)) * 180 / PI) % 360;
        st.s = Math.round(clamp(d / RD, 0, 1) * 100);
        sH.set(st.h); sS.set(st.s); update();
      },
    });
    function update() {
      const h2 = (st.h + 180) % 360, rgb = hslToRgb(st.h, st.s / 100, st.l / 100);
      R(root, 'sw1').style.background = css(st.h, st.s, st.l);
      R(root, 'sw2').style.background = css(h2, st.s, st.l);
      R(root, 'c1').textContent = css(st.h, st.s, st.l);
      R(root, 'c2').textContent = css(h2, st.s, st.l);
      R(root, 'rgb').textContent = 'rgb(' + rgb.join(', ') + ')';
      const s = st.s / 100, a = st.h * PI / 180;
      tex(root, 'pt', '\\begin{aligned}&(' + num(s, 2) + '\\cos' + st.h + '^\\circ,\\ ' + num(s, 2) + '\\sin' + st.h + '^\\circ)\\\\ &\\approx(' + num(clean(s * Math.cos(a)), 2) + ',\\ ' + num(clean(s * Math.sin(a)), 2) + ')\\end{aligned}');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, X0 = g.X(0), Y0 = g.Y(0), r = RD * g.pxPerX;
      // 円板：角 → 色相、中心からの距離 → 彩度（いまの L で塗る）
      for (let k = 0; k < 360; k += 3) {
        const gr = ctx.createRadialGradient(X0, Y0, 0, X0, Y0, r);
        gr.addColorStop(0, css(k + 1.5, 0, st.l)); gr.addColorStop(1, css(k + 1.5, 100, st.l));
        ctx.beginPath(); ctx.moveTo(X0, Y0);
        ctx.arc(X0, Y0, r, -(k + 3.6) * PI / 180, -k * PI / 180);
        ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(X0, Y0, r, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = c.axis; ctx.stroke();
      // 外側の細い輪：いちばんあざやかな色（S=100%, L=50%）の並び
      ctx.lineWidth = 0.06 * g.pxPerX;
      for (let k = 0; k < 360; k += 2) {
        ctx.beginPath(); ctx.strokeStyle = css(k + 1, 100, 50);
        ctx.arc(X0, Y0, 0.98 * g.pxPerX, -(k + 2.4) * PI / 180, -k * PI / 180); ctx.stroke();
      }
      const s = st.s / 100, a = st.h * PI / 180, x = RD * s * Math.cos(a), y = RD * s * Math.sin(a);
      // 距離 S の円（点線）と、中心から点への線
      if (s > 0.02) {
        ctx.beginPath(); ctx.arc(X0, Y0, RD * s * g.pxPerX, 0, TAU); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = c.text; ctx.stroke(); ctx.setLineDash([]);
      }
      g.line(-x, -y, x, y, { color: c.text, width: 1.5, dash: [6, 5] });
      g.line(0, 0, x, y, { color: c.text, width: 2.5 });
      drawAngle(g, a, { r: 0.16, grow: 0, color: c.primary, label: 'H', ldist: 0.12 });
      if (s > 0.02) { g.dot(-x, -y, { r: 8, color: hex((st.h + 180) % 360, st.s, st.l) }); ctx.beginPath(); ctx.arc(g.X(-x), g.Y(-y), 9, 0, TAU); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.beginPath(); ctx.arc(g.X(-x), g.Y(-y), 11, 0, TAU); ctx.lineWidth = 1.2; ctx.strokeStyle = c.text; ctx.stroke(); }
      // つまみ（いまの色）のまわりに細い線：同じ色の円板の上でも見えるように
      ctx.beginPath(); ctx.arc(g.X(x), g.Y(y), 13.5, 0, TAU); ctx.lineWidth = 1.2; ctx.strokeStyle = c.text; ctx.stroke();
      [[0, '0^\\circ'], [120, '120^\\circ'], [240, '240^\\circ']].forEach((p) => {
        const t = p[0] * PI / 180;
        g.tex(p[1], 1.12 * Math.cos(t), 1.12 * Math.sin(t), { size: 13, color: c.muted, align: 'center' });
      });
      const d = RD * s, ds = d - 0.2;   // S のラベルは、つまみの少し内側（H のラベルとぶつけない）
      if (d > 0.45) g.tex('\\teal{S}', ds * Math.cos(a) - 0.1 * Math.sin(a), ds * Math.sin(a) + 0.1 * Math.cos(a), { size: 15, align: 'center', avoid: true });
      if (s > 0.02) g.text('補色', -x, -y, { dy: 18, size: 12, bold: true, color: c.text, align: 'center' });
    };
    sH.set(st.h); sS.set(st.s); sL.set(st.l);
    update();
  }

  /* ==========================================================
     3.3(4) 単位円タイムアタック
     ========================================================== */
  const SC_VALS = [-1, -Math.sqrt(3) / 2, -Math.SQRT2 / 2, -0.5, 0, 0.5, Math.SQRT2 / 2, Math.sqrt(3) / 2, 1];
  const TA_POOL = (function () {
    const a = [];
    for (let k = -12; k <= 12; k++) a.push(k * PI / 6);
    for (let k = -8; k <= 8; k++) if (k % 2) a.push(k * PI / 4);
    return a;
  })();
  function initTimeAttack() {
    const root = $id('w-uc-time');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.4, xmax: 1.4, equal: true, yc: 0, ratio: [0.62, 0.36] });
    plot.onResize = () => fitCircle(plot, 1.3);
    fitCircle(plot, 1.3);
    const DUR = 60;
    const st = { mode: 0, run: false, left: DUR, score: 0, miss: 0, q: null, wait: 0, reveal: false };
    const KEY = (m) => 'calc2026-trig-ta-' + m;
    const getBest = (m) => { try { return +(localStorage.getItem(KEY(m)) || 0); } catch (e) { return 0; } };
    const setBest = (m, v) => { try { localStorage.setItem(KEY(m), String(v)); } catch (e) { /* noop */ } };
    chipRow(R(root, 'mode'), [{ label: '図あり' }, { label: '図なし（頭の中の単位円）' }], 0, (it, i) => { st.mode = i; stop(); showBest(); plot.invalidate(); });
    const box = R(root, 'ans');
    const btns = SC_VALS.map(function (v) {
      const b = el('button', 'chip ta-chip'); b.type = 'button';
      const s = el('span'); b.append(s); setTex(s, T.exactTeX(v));
      b.addEventListener('click', () => answer(v, b));
      box.append(b); return b;
    });
    const msg = R(root, 'msg');
    const qBox = R(root, 'q');
    function showBest() { R(root, 'best').textContent = getBest(st.mode) + ' 問（' + (st.mode ? '図なし' : '図あり') + '）'; }
    function showScore() { R(root, 'score').textContent = st.score + ' 問（まちがい ' + st.miss + '）'; }
    function showTime() { R(root, 'time').textContent = st.left.toFixed(1) + ' 秒'; R(root, 'bar').style.width = (100 * st.left / DUR) + '%'; }
    function next() {
      let th;
      do { th = TA_POOL[Math.floor(Math.random() * TA_POOL.length)]; } while (st.q && Math.abs(th - st.q.th) < 1e-9);
      const f = Math.random() < 0.5 ? 'sin' : 'cos';
      st.q = { th, f, v: clean(f === 'sin' ? Math.sin(th) : Math.cos(th)) };
      st.reveal = false;
      setTex(qBox, '\\' + f + '\\left(' + T.radTeX(th) + '\\right)\\ =\\ ?');
      btns.forEach((b) => { b.disabled = false; b.classList.remove('ok', 'ng'); });
      plot.invalidate();
    }
    function answer(v, b) {
      if (!st.run || st.wait > 0) return;
      const ok = Math.abs(v - st.q.v) < 1e-9;
      st.reveal = true;
      btns.forEach((x, i) => { x.disabled = true; if (Math.abs(SC_VALS[i] - st.q.v) < 1e-9) x.classList.add('ok'); });
      if (ok) { st.score++; msg.className = 'msg ok'; msg.textContent = '○ 正解！'; st.wait = 0.45; }
      else { st.miss++; b.classList.add('ng'); msg.className = 'msg ng'; msg.textContent = '× 緑のボタンが正解。図の影で確かめよう'; st.wait = 1.4; }
      showScore(); plot.invalidate();
    }
    function start() {
      st.run = true; st.left = DUR; st.score = 0; st.miss = 0; st.wait = 0; st.q = null;
      msg.className = 'msg'; msg.textContent = ''; showScore(); next(); anim.kick();
      R(root, 'start').textContent = 'やり直す';
    }
    function stop() {
      st.run = false; st.q = null; st.reveal = false; st.left = DUR; showTime();
      btns.forEach((b) => { b.disabled = true; b.classList.remove('ok', 'ng'); });
      qBox.textContent = 'スタートを押すと問題が出ます'; msg.textContent = ''; R(root, 'start').textContent = 'スタート';
    }
    function finish() {
      st.run = false;
      btns.forEach((b) => { b.disabled = true; });
      const best = getBest(st.mode), nb = st.score > best;
      if (nb) setBest(st.mode, st.score);
      qBox.textContent = 'タイムアップ！ ' + st.score + ' 問正解' + (nb ? '（最高記録！）' : '');
      msg.className = 'msg ok'; msg.textContent = nb ? '🎉 最高記録を更新しました' : 'もう一度挑戦しよう';
      showBest(); R(root, 'start').textContent = 'もう一度';
    }
    const anim = L.animate(root, function (dt) {
      if (!st.run) return false;
      st.left = Math.max(0, st.left - dt); showTime();
      if (st.wait > 0) { st.wait -= dt; if (st.wait <= 0) { st.wait = 0; if (st.left > 0) next(); } }
      if (st.left <= 0) { finish(); plot.invalidate(); return false; }
      return true;
    });
    R(root, 'start').addEventListener('click', start);
    plot.draw = function (g) {
      const c = g.c, q = st.q;
      if (q && (st.mode === 0 || st.reveal)) {
        ucDraw(g, q.th, { arc: false, proj: st.reveal, labels: st.reveal });
        drawAngle(g, q.th, { r: 0.2, grow: 0.06, label: '\\theta' });
      } else {
        ucBase(g); ucCircle(g);
      }
      if (q && st.reveal) {
        const x = Math.cos(q.th), y = Math.sin(q.th);
        g.tex((q.f === 'sin' ? '\\red{' : '\\teal{') + T.exactTeX(q.v) + '}', q.f === 'sin' ? x : x / 2, q.f === 'sin' ? y / 2 : 0,
          q.f === 'sin' ? { align: x >= 0 ? 'left' : 'right', dx: x >= 0 ? 8 : -8, dy: 22, size: 16 } : { align: 'center', dy: y >= 0 ? 36 : -36, size: 16 });
      }
    };
    stop(); showBest(); showScore();
  }

  /* ==========================================================
     3.3(5) チャレンジ：単位円で値を当てろ
     ========================================================== */
  const r3 = Math.sqrt(3);
  const TAN_VALS = [[-r3, '-\\sqrt3'], [-1, '-1'], [-1 / r3, '-\\frac{1}{\\sqrt3}'], [0, '0'], [1 / r3, '\\frac{1}{\\sqrt3}'], [1, '1'], [r3, '\\sqrt3'], [Infinity, '\\text{なし}']];
  const UC_STAGES = [
    { f: 'sin', th: 5 * PI / 6, tt: '\\frac{5\\pi}{6}', hint: '$\\frac{5\\pi}{6}=150^\\circ$。第2象限で、$y$ 座標は正。$\\frac{\\pi}{6}$ と左右対称な点です。',
      answer: '$\\sin\\dfrac{5\\pi}{6}=\\dfrac12$<br>$\\dfrac{5\\pi}{6}=\\pi-\\dfrac{\\pi}{6}$ なので、点は $\\left(-\\dfrac{\\sqrt3}{2},\\ \\dfrac12\\right)$。$y$ 座標を読んで $\\dfrac12$。' },
    { f: 'cos', th: 4 * PI / 3, tt: '\\frac{4\\pi}{3}', hint: '$\\frac{4\\pi}{3}=240^\\circ$。第3象限なので $x$ 座標は負。',
      answer: '$\\cos\\dfrac{4\\pi}{3}=-\\dfrac12$<br>$\\dfrac{4\\pi}{3}=\\pi+\\dfrac{\\pi}{3}$ なので、点は $\\left(-\\dfrac12,\\ -\\dfrac{\\sqrt3}{2}\\right)$。$x$ 座標を読んで $-\\dfrac12$。' },
    { f: 'sin', th: -PI / 4, tt: '-\\frac{\\pi}{4}', hint: 'マイナスの角は時計回り。$45^\\circ$ だけ下に回ります。',
      answer: '$\\sin\\left(-\\dfrac{\\pi}{4}\\right)=-\\dfrac{\\sqrt2}{2}$<br>時計回りに $45^\\circ$ 回った点は $\\left(\\dfrac{\\sqrt2}{2},\\ -\\dfrac{\\sqrt2}{2}\\right)$。$y$ 座標を読んで $-\\dfrac{\\sqrt2}{2}=-\\dfrac{1}{\\sqrt2}$。' },
    { f: 'tan', th: 5 * PI / 6, tt: '\\frac{5\\pi}{6}', hint: '$\\tan\\theta=\\dfrac{\\sin\\theta}{\\cos\\theta}$。点の座標を先に求めよう。',
      answer: '$\\tan\\dfrac{5\\pi}{6}=-\\dfrac{1}{\\sqrt3}\\left(=-\\dfrac{\\sqrt3}{3}\\right)$<br>点は $\\left(-\\dfrac{\\sqrt3}{2},\\ \\dfrac12\\right)$ なので $\\tan\\dfrac{5\\pi}{6}=\\dfrac{1/2}{-\\sqrt3/2}=-\\dfrac{1}{\\sqrt3}$（半径の傾き）。' },
    { f: 'sin', th: 11 * PI / 3, tt: '\\frac{11\\pi}{3}', hint: '$\\frac{11\\pi}{3}=2\\pi+\\frac{5\\pi}{3}$。1周（$2\\pi$）回ると元の位置にもどります。',
      answer: '$\\sin\\dfrac{11\\pi}{3}=-\\dfrac{\\sqrt3}{2}$<br>$\\dfrac{11\\pi}{3}=2\\pi+\\dfrac{5\\pi}{3}$ なので $\\dfrac{5\\pi}{3}\\,(=300^\\circ)$ と同じ点 $\\left(\\dfrac12,\\ -\\dfrac{\\sqrt3}{2}\\right)$。$y$ 座標を読んで $-\\dfrac{\\sqrt3}{2}$。' },
  ];
  UC_STAGES.forEach((S) => {
    S.text = '$\\' + S.f + (S.tt[0] === '-' ? '\\left(' + S.tt + '\\right)' : S.tt) + '$ の値は？';
    S.v = S.f === 'sin' ? clean(Math.sin(S.th)) : S.f === 'cos' ? clean(Math.cos(S.th)) : Math.tan(S.th);
  });
  function initGameUc() {
    const root = $id('w-game-uc');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.6, xmax: 1.6, equal: true, yc: 0, ratio: [0.9, 0.5] });
    plot.onResize = () => fitCircle(plot, 1.35);
    fitCircle(plot, 1.35);
    const ctl = root.querySelector('.controls');
    const lead = el('p', 'uc-game-lead', '① 青い点を回して角をとる　② 影を読んで値のボタンを押す');
    const box = el('div', 'chips ta-ans');
    ctl.append(lead, box);
    const row = el('div', 'btn-row'); row.style.marginTop = '8px';
    const bRetry = el('button', 'btn', 'やり直す'), bNext = el('button', 'btn', '次のステージへ →');
    [bRetry, bNext].forEach((b) => { b.type = 'button'; row.append(b); });
    ctl.append(row);
    const conf = L.game.Confetti(root, plot);
    const st = { th: 0 };
    const S = () => UC_STAGES[game.k];
    let btns = [];
    function buildButtons() {
      box.innerHTML = '';
      const vals = S().f === 'tan' ? TAN_VALS : SC_VALS.map((v) => [v, T.exactTeX(v)]);
      btns = vals.map(function (p) {
        const b = el('button', 'chip ta-chip'); b.type = 'button';
        const s = el('span'); b.append(s); setTex(s, p[1]);
        b.addEventListener('click', () => pick(p[0], b));
        box.append(b); return b;
      });
    }
    const same = (a, b) => (a === Infinity || b === Infinity || Math.abs(b) > 1e6 ? (a === Infinity) === (Math.abs(b) > 1e6 || b === Infinity) : Math.abs(a - b) < 1e-9);
    function pick(v, b) {
      if (game.done || game.used >= 3) return;
      game.used++; game.renderThrows();
      if (same(v, S().v)) {
        const n = 4 - game.used; game.award(n); game.done = true; b.classList.add('ok');
        btns.forEach((x) => { x.disabled = true; });
        bNext.hidden = game.k >= UC_STAGES.length - 1;
        game.result('🎯 正解！ ' + L.game.starStr(n) + '（' + game.used + ' 回目）', 'hit');
        st.th = S().th; plot.render();
        conf.fire(plot.X(Math.cos(st.th)), plot.Y(Math.sin(st.th)));
      } else {
        b.classList.add('ng'); b.disabled = true;
        let m = 'ちがいます。' + (S().f === 'tan' ? '点の座標から 縦÷横 を計算しよう。' : '角をとった点の ' + (S().f === 'sin' ? '縦（y 座標）' : '横（x 座標）') + ' の長さと符号を見よう。');
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; btns.forEach((x) => { x.disabled = true; }); }
        game.result(m, 'miss');
      }
      plot.invalidate();
    }
    const game = L.game.GameShell(root, { key: '3-3:game', stages: UC_STAGES,
      formula: () => '\\text{いまの角 }\\blue{\\theta}=' + T.angleTeX(st.th) + (Math.abs(mod2pi(st.th) - mod2pi(S().th)) < 1e-9 ? '\\ \\ \\text{← 問題の角と同じ位置}' : ''),
      onStage() { st.th = 0; bNext.hidden = true; buildButtons(); typeset(R(root, 'mission')); plot.invalidate(); } });
    const h = T.angleHandle(plot, () => st.th, (a) => { st.th = a; game.formula(); }, { continuous: true, snap: PI / 12 });
    h.drag = function (x, y) {
      let a = Math.atan2(y, x); a = st.th + T.wrapPi(a - st.th); a = Math.round(a / (PI / 12)) * (PI / 12);
      st.th = clamp(a, -4 * PI, 4 * PI); game.formula();
    };
    bRetry.addEventListener('click', () => game.setStage(game.k));
    bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, UC_STAGES.length - 1)));
    plot.draw = function (g) {
      ucDraw(g, st.th, { arc: false, tan: S().f === 'tan' });
      drawAngle(g, st.th, { r: 0.2, grow: 0.06, label: '\\theta' });
      conf.draw(g);
    };
    game.setStage(0);
  }

  T.boot([
    [initUcDef, 'w-uc-def'],
    [initUcSym, 'w-uc-sym'],
    [initHue, 'w-hue'],
    [initTimeAttack, 'w-uc-time'],
    [initGameUc, 'w-game-uc'],
  ]);
})();
