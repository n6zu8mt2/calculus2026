/* 第3章 3.1節 三角比 — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 * 色の約束: 角 θ = 青, 底辺(cos) = 緑, 高さ(sin) = 赤, tan = 金
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const { starStr, GameShell, gameButtons, Confetti } = L.game;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const DEG = Math.PI / 180;
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
  // 表示範囲を、縦横同じ縮尺のまま [x0,x1]×[y0,y1] が収まるように決める（描くたびに呼ぶ）
  function fit(g, x0, x1, y0, y1) {
    const asp = g.h / g.w;
    let xs = x1 - x0, ys = xs * asp;
    if (ys < y1 - y0) { ys = y1 - y0; xs = ys / asp; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    g.xmin = cx - xs / 2; g.xmax = cx + xs / 2; g.ymin = cy - ys / 2; g.ymax = cy + ys / 2;
  }
  // 角の弧（a0→a1、ラジアン）。r は画面の px
  function arcPx(g, x, y, a0, a1, rpx, o) {
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 0.06)), r = rpx / g.pxPerX, pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
    g.poly(pts, Object.assign({ color: g.c.primary, width: 2.5 }, o));
  }
  // 直角の印（角 (x,y)、向き u と v（単位ベクトル）、大きさ px）
  function rightMark(g, x, y, ux, uy, vx, vy, spx) {
    const s = (spx || 11) / g.pxPerX;
    g.poly([[x + ux * s, y + uy * s], [x + ux * s + vx * s, y + uy * s + vy * s], [x + vx * s, y + vy * s]], { color: g.c.muted, width: 1.5 });
  }
  function fillRect(g, x0, y0, x1, y1, fill, stroke) {
    const ctx = g.ctx, X0 = g.X(x0), X1 = g.X(x1), Y0 = g.Y(y0), Y1 = g.Y(y1);
    ctx.save(); ctx.fillStyle = fill; ctx.fillRect(Math.min(X0, X1), Math.min(Y0, Y1), Math.abs(X1 - X0), Math.abs(Y1 - Y0));
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.strokeRect(Math.min(X0, X1), Math.min(Y0, Y1), Math.abs(X1 - X0), Math.abs(Y1 - Y0)); }
    ctx.restore();
  }
  function soft(col, a) { return /^#[0-9a-f]{6}$/i.test(col) ? col + ('0' + Math.round(a * 255).toString(16)).slice(-2) : col; }
  // 地面
  function ground(g) {
    const ctx = g.ctx, y = g.Y(0);
    ctx.save(); ctx.fillStyle = soft(g.c.muted, 0.12); ctx.fillRect(0, y, g.w, g.h - y); ctx.restore();
    g.line(g.xmin, 0, g.xmax, 0, { color: g.c.axis, width: 2 });
  }
  // 人（目の高さ eye の位置に頭）
  function person(g, x, eye) {
    const ctx = g.ctx, px = g.X(x), top = g.Y(eye), bot = g.Y(0), hpx = bot - top;
    const s = Math.max(0.6, hpx / 40);
    ctx.save(); ctx.strokeStyle = g.c.text; ctx.lineWidth = Math.max(2, 2.2 * s); ctx.lineCap = 'round';
    const head = Math.max(3, 4 * s), neck = top + head, hip = bot - hpx * 0.45;
    ctx.beginPath();
    ctx.moveTo(px, neck); ctx.lineTo(px, hip);
    ctx.moveTo(px, hip); ctx.lineTo(px - hpx * 0.16, bot); ctx.moveTo(px, hip); ctx.lineTo(px + hpx * 0.16, bot);
    ctx.moveTo(px, neck + hpx * 0.15); ctx.lineTo(px + hpx * 0.2, neck + hpx * 0.32);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(px, top, head, 0, Math.PI * 2); ctx.fillStyle = g.c.text; ctx.fill();
    ctx.restore();
  }
  // 建物（窓つき）
  function building(g, x0, x1, h) {
    const c = g.c;
    fillRect(g, x0, 0, x1, h, soft(c.primary, 0.1), c.muted);
    const ctx = g.ctx, W = Math.abs(g.X(x1) - g.X(x0)), H = g.Y(0) - g.Y(h);
    const cols = Math.max(1, Math.floor(W / 14)), rows = Math.max(1, Math.floor(H / 16));
    ctx.save(); ctx.fillStyle = soft(c.muted, 0.28);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows - 1; j++) {
      const px = g.X(x0) + (i + 0.3) * W / cols, py = g.Y(h) + (j + 0.45) * H / rows;
      ctx.fillRect(px, py, Math.max(2, 0.4 * W / cols), Math.max(2, 0.4 * H / rows));
    }
    ctx.restore();
  }
  function sun(g, x, y) {
    const ctx = g.ctx, px = g.X(x), py = g.Y(y);
    ctx.save(); ctx.fillStyle = g.c.amber; ctx.strokeStyle = g.c.amber; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(px + 15 * Math.cos(a), py + 15 * Math.sin(a)); ctx.lineTo(px + 21 * Math.cos(a), py + 21 * Math.sin(a)); ctx.stroke(); }
    ctx.restore();
  }
  const m = (v, d) => num(v, d == null ? 1 : d) + '\\,\\text{m}';

  /* ==========================================================
     3.1(3) tan の応用：坂道の「10%」
     ========================================================== */
  function initSlope() {
    const root = $id('w-slope'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1.2, xmax: 11.8, equal: true, yc: 1.75, ratio: [0.55, 0.34] });
    const sp = slider(ctl, { tex: '\\%', min: 0, max: 35, step: 1, value: 10, color: 'accent', fmt: (v) => v + '%', aria: '坂の勾配（%）' });
    function update() {
      const p = sp.get(), deg = Math.atan(p / 100) / DEG;
      tex(root, 'grad', '\\dfrac{\\red{\\text{上がる高さ}}}{\\teal{\\text{進む水平距離}}}=\\dfrac{\\red{' + p + '}}{\\teal{100}}=' + num(p / 100, 2));
      tex(root, 'ang', '\\blue{\\theta}\\approx' + num(deg, 1) + '^\\circ');
      plot.invalidate();
    }
    sp.on(update);
    plot.draw = function (g) {
      const c = g.c, p = sp.get(), r = p / 10;
      ground(g);
      const ctx = g.ctx;
      ctx.save(); ctx.fillStyle = soft(c.amber, 0.14); ctx.beginPath();
      ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(10), g.Y(0)); ctx.lineTo(g.X(10), g.Y(r)); ctx.closePath(); ctx.fill(); ctx.restore();
      g.line(0, 0, 10, 0, { color: c.teal, width: 3 });
      if (r > 0) g.line(10, 0, 10, r, { color: c.accent, width: 3 });
      g.line(0, 0, 10, r, { color: c.text, width: 5 });
      if (r > 0.05) rightMark(g, 10, 0, -1, 0, 0, 1, 10);
      if (p > 0) arcPx(g, 0, 0, 0, Math.atan(p / 100), 70);
      g.tex('\\text{水平に }100\\,\\text{m}', 5, 0, { dy: 16, align: 'center', size: 14, color: c.teal });
      g.tex('\\text{上がる高さ }' + p + '\\,\\text{m}', 10, r / 2, { dx: 8, align: 'left', size: 14, color: c.accent, valign: r < 0.3 ? 'bottom' : 'middle' });
      if (p > 0) g.texPx('\\theta', g.X(0) + 82, g.Y(0) - Math.max(10, 82 * Math.tan(Math.atan(p / 100) / 2)), { size: 16, color: c.primary });
    };
    update();
  }

  /* ==========================================================
     3.1(1) 相似な直角三角形：比は大きさによらない
     ========================================================== */
  function initRatio() {
    const root = $id('w-ratio'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.9, xmax: 9.1, equal: true, yc: 2.2, ratio: [0.85, 0.5] });
    const sth = slider(ctl, { tex: '\\blue{\\theta}', min: 10, max: 80, step: 1, value: 35, color: 'primary', fmt: (v) => v + '°', aria: '角 θ' });
    const sc = slider(ctl, { tex: 'c', min: 1.5, max: 4.5, step: 0.1, value: 4, color: 'violet', aria: '三角形の大きさ（斜辺の長さ）' });
    function update() {
      const th = sth.get() * DEG, cc = sc.get(), a = cc * Math.sin(th), b = cc * Math.cos(th);
      tex(root, 'sides', '\\text{斜辺 }' + num(cc, 2) + ',\\ \\red{\\text{高さ }' + num(a, 2) + '},\\ \\teal{\\text{底辺 }' + num(b, 2) + '}');
      tex(root, 'sin', '\\red{\\sin\\theta}=\\dfrac{\\red{\\text{高さ}}}{\\text{斜辺}}=\\dfrac{' + num(a, 2) + '}{' + num(cc, 2) + '}\\approx\\red{' + num(Math.sin(th), 3) + '}');
      tex(root, 'cos', '\\teal{\\cos\\theta}=\\dfrac{\\teal{\\text{底辺}}}{\\text{斜辺}}=\\dfrac{' + num(b, 2) + '}{' + num(cc, 2) + '}\\approx\\teal{' + num(Math.cos(th), 3) + '}');
      tex(root, 'tan', '\\amber{\\tan\\theta}=\\dfrac{\\red{\\text{高さ}}}{\\teal{\\text{底辺}}}=\\dfrac{' + num(a, 2) + '}{' + num(b, 2) + '}\\approx\\amber{' + num(Math.tan(th), 3) + '}');
      plot.invalidate();
    }
    sth.on(update); sc.on(update);
    plot.draw = function (g) {
      const c = g.c, th = sth.get() * DEG, cc = sc.get(), a = cc * Math.sin(th), b = cc * Math.cos(th);
      // 大きさだけ違う三角形（相似）をうすく
      [1, 2, 3, 4].forEach(function (k) {
        if (Math.abs(k - cc) < 0.05) return;
        g.poly([[0, 0], [k * Math.cos(th), 0], [k * Math.cos(th), k * Math.sin(th)], [0, 0]], { color: c.muted, width: 1, alpha: 0.45, dash: [4, 4] });
      });
      const ctx = g.ctx;
      ctx.save(); ctx.fillStyle = soft(c.violet, 0.08); ctx.beginPath();
      ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(b), g.Y(0)); ctx.lineTo(g.X(b), g.Y(a)); ctx.closePath(); ctx.fill(); ctx.restore();
      g.line(0, 0, b, 0, { color: c.teal, width: 4 });
      g.line(b, 0, b, a, { color: c.accent, width: 4 });
      g.line(0, 0, b, a, { color: c.text, width: 3 });
      rightMark(g, b, 0, -1, 0, 0, 1, 11);
      arcPx(g, 0, 0, 0, th, 34);
      const la = Math.max(th / 2, 0.16);
      g.texPx('\\theta', g.X(0) + 50 * Math.cos(la), g.Y(0) - 50 * Math.sin(la), { size: 16, color: c.primary, align: 'center' });
      g.tex('\\text{底辺 }' + num(b, 2), b / 2, 0, { dy: 15, align: 'center', size: 14, color: c.teal });
      g.tex('\\text{高さ }' + num(a, 2), b, a / 2, { dx: 9, align: 'left', size: 14, color: c.accent });
      g.tex('\\text{斜辺 }' + num(cc, 2), b / 2, a / 2, { dx: -8, dy: -12, align: 'right', size: 14, color: c.text });
      g.texPx('\\text{点線：同じ形で大きさだけ違う三角形}', g.w - 8, 14, { align: 'right', size: 12, color: c.muted });
    };
    update();
  }

  /* ==========================================================
     3.1(2) 三角定規の三角比
     ========================================================== */
  const S3 = Math.sqrt(3);
  const SET = [
    { label: '45°（直角二等辺三角形）', d: 45, b: 1, a: 1, bT: '1', aT: '1', cT: '\\sqrt2', view: { xmin: -1.3, xmax: 2.5, yc: 0.5 },
      sin: '\\frac{\\sqrt2}{2}', cos: '\\frac{\\sqrt2}{2}', tan: '1', note: '正方形を対角線で半分にした形。三平方の定理で斜辺は $\\sqrt{1^2+1^2}=\\sqrt2$。' },
    { label: '30°', d: 30, b: S3, a: 1, bT: '\\sqrt3', aT: '1', cT: '2', view: { xmin: -1.2, xmax: 3.3, yc: 0 },
      sin: '', cos: '', tan: '\\frac{\\sqrt3}{3}', note: '正三角形（1辺 2）を半分にした形。高さ 1、底辺は $\\sqrt{2^2-1^2}=\\sqrt3$。' },
    { label: '60°', d: 60, b: 1, a: S3, bT: '1', aT: '\\sqrt3', cT: '2', view: { xmin: -1.1, xmax: 3.1, yc: 0.85 },
      sin: '', cos: '', tan: '\\sqrt3', note: '同じ三角定規を、向きを変えて見たもの。高さと底辺が 30° のときと入れかわる。' },
  ];
  function initSankaku() {
    const root = $id('w-sankaku');
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ equal: true, ratio: [0.85, 0.52] }, SET[0].view));
    let S = SET[0];
    chipRow(R(root, 'chips'), SET, 0, (it) => { S = it; plot.setView(it.view); update(); });
    function update() {
      const d = S.d;
      tex(root, 'sin', '\\red{\\sin' + d + '^\\circ}=\\dfrac{\\red{' + S.aT + '}}{' + S.cT + '}' + (S.sin ? '=' + S.sin.replace(/\\frac/g, '\\dfrac') : ''));
      tex(root, 'cos', '\\teal{\\cos' + d + '^\\circ}=\\dfrac{\\teal{' + S.bT + '}}{' + S.cT + '}' + (S.cos ? '=' + S.cos.replace(/\\frac/g, '\\dfrac') : ''));
      tex(root, 'tan', '\\amber{\\tan' + d + '^\\circ}=\\dfrac{\\red{' + S.aT + '}}{\\teal{' + S.bT + '}}' + (S.tan ? '=' + S.tan.replace(/\\frac/g, '\\dfrac') : ''));
      const n = R(root, 'note'); n.innerHTML = S.note; typeset(n);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, a = S.a, b = S.b, th = S.d * DEG;
      // 半分にする前の形（点線）
      if (S.d === 45) g.poly([[0, 0], [0, 1], [1, 1]], { color: c.muted, width: 1.5, dash: [5, 5] });
      if (S.d === 30) g.poly([[0, 0], [b, -1], [b, 0]], { color: c.muted, width: 1.5, dash: [5, 5] });
      if (S.d === 60) g.poly([[b, 0], [2, 0], [b, a]], { color: c.muted, width: 1.5, dash: [5, 5] });
      g.line(0, 0, b, 0, { color: c.teal, width: 4 });
      g.line(b, 0, b, a, { color: c.accent, width: 4 });
      g.line(0, 0, b, a, { color: c.text, width: 3 });
      rightMark(g, b, 0, -1, 0, 0, 1, 12);
      arcPx(g, 0, 0, 0, th, 30);
      g.texPx(S.d + '^\\circ', g.X(0) + 40 * Math.cos(th / 2) + 4, g.Y(0) - 40 * Math.sin(th / 2), { size: 15, color: c.primary });
      arcPx(g, b, a, -Math.PI / 2, -Math.PI / 2 - (90 - S.d) * DEG, 24, { color: c.muted, width: 1.5 });
      g.texPx((90 - S.d) + '^\\circ', g.X(b) - 10, g.Y(a) + 40, { size: 13, color: c.muted, align: 'right' });
      g.tex(S.bT, b / 2, 0, { dy: 16, align: 'center', size: 17, color: c.teal });
      g.tex(S.aT, b, a / 2, { dx: 10, align: 'left', size: 17, color: c.accent });
      g.tex(S.cT, b / 2, a / 2, { dx: -10, dy: -12, align: 'right', size: 17, color: c.text });
    };
    update();
  }

  /* ==========================================================
     3.1(4) 影で高さを測る
     ========================================================== */
  function initShadow() {
    const root = $id('w-shadow'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 10, ymin: 0, ymax: 6, ratio: [0.75, 0.48] });
    const sa = slider(ctl, { tex: '\\blue{\\theta}', min: 10, max: 75, step: 1, value: 40, color: 'primary', fmt: (v) => v + '°', aria: '太陽の高さの角度' });
    const sl = slider(ctl, { tex: '\\teal{\\ell}', min: 2, max: 40, step: 0.5, value: 15, color: 'teal', fmt: (v) => num(v, 1) + ' m', aria: '影の長さ' });
    function update() {
      const th = sa.get() * DEG, l = sl.get(), h = l * Math.tan(th);
      tex(root, 'h', '\\red{h}=\\teal{\\ell}\\times\\amber{\\tan' + sa.get() + '^\\circ}=' + num(l, 1) + '\\times' + num(Math.tan(th), 3) + '\\approx\\red{' + m(h) + '}');
      plot.invalidate();
    }
    sa.on(update); sl.on(update);
    plot.draw = function (g) {
      const c = g.c, th = sa.get() * DEG, l = sl.get(), h = l * Math.tan(th);
      const S = Math.max(l, h), bw = 0.12 * S + 0.5, k = 0.3 * S;
      const sx = -k * Math.cos(th), sy = h + k * Math.sin(th);
      fit(g, Math.min(-bw, sx) - 0.08 * S, l + 0.1 * S, -0.12 * S, Math.max(sy, h) + 0.1 * S);
      ground(g);
      building(g, -bw, 0, h);
      g.line(0, 0, l, 0, { color: c.teal, width: 6, alpha: 0.85 });
      g.line(sx, sy, l, 0, { color: c.amber, width: 2, dash: [6, 5] });
      sun(g, sx, sy);
      g.line(0, 0, 0, h, { color: c.accent, width: 3 });
      arcPx(g, l, 0, Math.PI - th, Math.PI, 40);
      g.texPx('\\theta', g.X(l) - 52 * Math.cos(th / 2), g.Y(0) - 52 * Math.sin(th / 2), { size: 16, color: c.primary, align: 'center' });
      g.tex('\\text{影 }\\ell=' + m(l), l / 2, 0, { dy: 16, align: 'center', size: 14, color: c.teal });
      g.tex('h\\approx' + m(h), 0, h / 2, { dx: 8, align: 'left', size: 14, color: c.accent });
    };
    update();
  }

  /* ==========================================================
     3.1(4) スマホ分度器（傾きセンサー／手入力）
     ========================================================== */
  function initTilt() {
    const root = $id('w-tilt'), ctl = root.querySelector('.controls');
    T.permBox(root.querySelector('.panel.sensor'), 'スマホの傾きセンサーを使います。ボタンを押したときだけ許可を求めます。傾きの値はこのページの中で使うだけで、どこにも送らず保存もしません。センサーがない PC では、下のスライダーで角度を入れてください。');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 10, ymin: 0, ymax: 6, ratio: [0.75, 0.48] });
    const sth = slider(ctl, { tex: '\\blue{\\theta}', min: 0, max: 80, step: 0.5, value: 35, color: 'primary', fmt: (v) => num(v, 1) + '°', aria: '見上げる角度' });
    const sd = slider(ctl, { tex: '\\teal{d}', min: 2, max: 100, step: 0.5, value: 20, color: 'teal', fmt: (v) => num(v, 1) + ' m', aria: '建物までの距離' });
    const se = slider(ctl, { tex: 'e', min: 0.8, max: 2, step: 0.05, value: 1.5, color: 'violet', fmt: (v) => num(v, 2) + ' m', aria: '目の高さ' });
    const bStart = root.querySelector('[data-a="tilt"]'), bHold = root.querySelector('[data-a="hold"]'), stat = R(root, 'tstat');
    const st = { hold: false, got: false };
    const say = (t, ok) => { stat.textContent = t; stat.className = 'msg ' + (ok ? 'ok' : 'ng'); };
    say('いまは手入力モードです（スライダーで角度を入れる）。');
    bHold.disabled = true;
    bStart.addEventListener('click', function () {
      st.got = false;
      T.Tilt.start(function (e) {
        if (!st.got) { st.got = true; bHold.disabled = false; say('センサーの角度を表示中。ねらいが決まったら「角度を固定」。', true); }
        if (st.hold) return;
        sth.set(clamp(Math.round(e.beta * 2) / 2, 0, 80)); update();
      }).then(function () {
        say('センサーの値を待っています…');
        setTimeout(function () { if (!st.got) say('傾きの値が届きません（PC など、センサーのない端末です）。スライダーで角度を入れてください。'); }, 2000);
      }).catch(function (err) { say((err && err.message ? err.message : 'センサーを使えません') + '。スライダーで角度を入れてください。'); });
    });
    bHold.addEventListener('click', function () {
      st.hold = !st.hold;
      bHold.textContent = st.hold ? '固定を外す' : '角度を固定';
      if (st.hold) say('角度を ' + num(sth.get(), 1) + '° で固定しました。', true);
      else say('センサーの角度を表示中。', true);
    });
    function update() {
      const th = sth.get() * DEG, d = sd.get(), e = se.get(), up = d * Math.tan(th);
      tex(root, 'big', '\\blue{\\theta}=' + num(sth.get(), 1) + '^\\circ');
      tex(root, 'h', 'h=\\teal{d}\\,\\amber{\\tan\\theta}+e=' + num(d, 1) + '\\times' + num(Math.tan(th), 3) + '+' + num(e, 2) + '\\approx\\red{' + m(up + e) + '}');
      plot.invalidate();
    }
    [sth, sd, se].forEach((s) => s.on(update));
    plot.draw = function (g) {
      const c = g.c, th = sth.get() * DEG, d = sd.get(), e = se.get(), up = d * Math.tan(th), H = up + e;
      const S = Math.max(d, H), bw = 0.1 * S + 0.6;
      fit(g, -0.08 * S, d + bw + 0.12 * S, -0.12 * S, H + 0.1 * S);
      ground(g);
      building(g, d, d + bw, H);
      person(g, 0, e);
      g.line(0, e, d, e, { color: c.muted, width: 1.5, dash: [5, 5] });
      g.line(0, e, d, H, { color: c.amber, width: 2.5 });
      g.line(d, e, d, H, { color: c.accent, width: 3.5 });
      g.line(0, 0, d, 0, { color: c.teal, width: 3.5 });
      if (th > 0.01) arcPx(g, 0, e, 0, th, 42);
      g.texPx('\\theta', g.X(0) + 54 * Math.cos(Math.max(th / 2, 0.12)), g.Y(e) - 54 * Math.sin(Math.max(th / 2, 0.12)), { size: 16, color: c.primary, align: 'center' });
      g.tex('d=' + m(d), d / 2, 0, { dy: 16, align: 'center', size: 14, color: c.teal });
      g.tex('d\\tan\\theta\\approx' + m(up), d, (e + H) / 2, { dx: -8, align: 'right', size: 14, color: c.accent, avoid: true });
      g.tex('e', d, e / 2, { dx: -8, align: 'right', size: 14, color: c.violet, avoid: true });
    };
    update();
  }

  /* ==========================================================
     3.1(5) チャレンジ：高さを当てろ
     ========================================================== */
  const H_STAGES = [
    { name: '45°', kind: 'look', d: 12, th: 45, e: 0, h: 12,
      text: '木から $12$ m 離れた地面から見上げると、てっぺんが $45^\\circ$ に見えた。木の高さ $h$ は？',
      hint: '$h=d\\tan\\theta$。$\\tan45^\\circ=1$（直角二等辺三角形）。',
      answer: '<b>h = 12 m</b><br>$h=12\\tan45^\\circ=12\\times1=12$' },
    { name: '60°', kind: 'look', d: 10, th: 60, e: 0, h: 10 * S3,
      text: '塔から $10$ m 離れた地面から見上げると $60^\\circ$。塔の高さ $h$ は？（小数第1位まで）',
      hint: '$\\tan60^\\circ=\\sqrt3\\approx1.732$。',
      answer: '<b>h ≈ 17.3 m</b><br>$h=10\\tan60^\\circ=10\\sqrt3\\approx17.32$' },
    { name: '目の高さ', kind: 'look', d: 30, th: 30, e: 1.5, h: 30 / S3 + 1.5,
      text: 'ビルから $30$ m 離れて立ち、目の高さ $1.5$ m から見上げると $30^\\circ$。ビルの高さ $h$ は？',
      hint: '目の高さより上の部分が $30\\tan30^\\circ$。最後に $1.5$ m を足す。$\\tan30^\\circ=\\frac{1}{\\sqrt3}\\approx0.577$。',
      answer: '<b>h ≈ 18.8 m</b><br>$30\\tan30^\\circ=\\dfrac{30}{\\sqrt3}=10\\sqrt3\\approx17.32$<br>$h\\approx17.32+1.5=18.82$' },
    { name: '影', kind: 'shadow', d: 50, th: 20, e: 0, h: 50 * Math.tan(20 * DEG),
      text: '太陽の高さが $20^\\circ$ のとき、電波塔の影の長さは $50$ m だった。塔の高さ $h$ は？（$\\tan20^\\circ\\approx0.364$）',
      hint: '影の先から塔のてっぺんを見上げた角が、太陽の高さ $20^\\circ$。$h=\\ell\\tan20^\\circ$。',
      answer: '<b>h ≈ 18.2 m</b><br>$h=50\\tan20^\\circ\\approx50\\times0.364=18.2$' },
    { name: '2か所から', kind: 'two', d: 30, th: 30, th2: 60, e: 0, h: 15 * S3,
      text: '塔までの距離がわからない。地点 A で見上げると $30^\\circ$、塔に向かって $30$ m 進んだ地点 B では $60^\\circ$。塔の高さ $h$ は？',
      hint: 'B から塔までを $x$ とすると $h=x\\tan60^\\circ=\\sqrt3\\,x$、また $h=(x+30)\\tan30^\\circ=\\frac{x+30}{\\sqrt3}$。',
      answer: '<b>h ≈ 26.0 m</b><br>$\\sqrt3\\,x=\\dfrac{x+30}{\\sqrt3}$ より $3x=x+30$、$x=15$<br>$h=15\\sqrt3\\approx25.98$' },
  ];
  function initGameHeight() {
    const root = $id('w-game-height'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 10, ymin: 0, ymax: 6, ratio: [0.75, 0.48] });
    const sh = slider(ctl, { tex: '\\red{h}', min: 0, max: 40, step: 0.1, value: 10, color: 'accent', fmt: (v) => num(v, 1) + ' m', aria: '高さ h の答え' });
    const fine = el('div', 'btn-row');
    [['−1', -1], ['−0.1', -0.1], ['＋0.1', 0.1], ['＋1', 1]].forEach(function (p) {
      const b = el('button', 'btn small', p[0]); b.type = 'button';
      b.addEventListener('click', () => { sh.set(clamp(Math.round((sh.get() + p[1]) * 10) / 10, 0, 40)); onH(); });
      fine.append(b);
    });
    ctl.append(fine);
    const B = gameButtons(ctl, '✅ 決定');
    const conf = Confetti(root, plot);
    const st = { shots: [] };
    const S = () => H_STAGES[game.k];
    const game = GameShell(root, { key: '3-1:game', stages: H_STAGES,
      formula: () => '\\red{h}=' + m(sh.get()),
      onStage() { st.shots = []; B.bMain.disabled = false; B.bNext.hidden = true; typeset(R(root, 'mission')); plot.invalidate(); } });
    function onH() { game.formula(); plot.invalidate(); }
    sh.on(onH);
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const v = sh.get(), ans = S().h;
      st.shots.push(v); game.used++; game.renderThrows();
      if (Math.abs(v - ans) <= 0.15) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= H_STAGES.length - 1;
        game.result('🎯 正解！ ' + starStr(n) + '（' + game.used + ' 回目）', 'hit');
        conf.fire(plot.X(geo().bx), plot.Y(ans));
      } else {
        let t = (v > ans ? '高すぎる' : '低すぎる') + '。計算を見直そう。';
        if (game.used >= 3) { t += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(t, 'miss');
      }
      plot.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, H_STAGES.length - 1)));
    // 建物の位置など
    function geo() {
      const s = S();
      if (s.kind === 'two') { const x = s.h / Math.tan(s.th2 * DEG); return { bx: s.d + x, ax: 0, b2: s.d }; }
      return { bx: s.kind === 'shadow' ? 0 : s.d, ax: s.kind === 'shadow' ? s.d : 0 };
    }
    plot.draw = function (g) {
      const c = g.c, s = S(), G = geo(), H = s.h, hv = sh.get();
      const top = Math.max(H, hv), span = Math.max(G.bx, s.d, top), bw = 0.08 * span + 0.6;
      const bx0 = s.kind === 'shadow' ? -bw : G.bx, bx1 = s.kind === 'shadow' ? 0 : G.bx + bw;
      const sk = 0.25 * span, sunX = -sk * Math.cos(s.th * DEG), sunY = H + sk * Math.sin(s.th * DEG);
      const shadow = s.kind === 'shadow';
      fit(g, Math.min(bx0, shadow ? sunX : 0) - 0.08 * span, Math.max(bx1, s.d) + 0.08 * span, -0.14 * span, Math.max(top, shadow ? sunY : 0) + 0.12 * span);
      ground(g);
      building(g, bx0, bx1, H);
      const tx = s.kind === 'shadow' ? 0 : G.bx;
      if (s.kind === 'shadow') {
        const sx = sunX, sy = sunY;
        g.line(0, 0, s.d, 0, { color: c.teal, width: 6, alpha: 0.85 });
        g.line(sx, sy, s.d, 0, { color: c.amber, width: 2, dash: [6, 5] });
        sun(g, sx, sy);
        arcPx(g, s.d, 0, Math.PI - s.th * DEG, Math.PI, 40);
        g.texPx(s.th + '^\\circ', g.X(s.d) - 52, g.Y(0) - 22, { size: 14, color: c.primary, align: 'right' });
        g.tex('\\text{影 }' + s.d + '\\,\\text{m}', s.d / 2, 0, { dy: 16, align: 'center', size: 14, color: c.teal });
      } else {
        const obs = s.kind === 'two' ? [[0, s.th, 'A'], [s.d, s.th2, 'B']] : [[0, s.th, '']];
        obs.forEach(function (o) {
          const e = s.e;
          if (e > 0) person(g, o[0], e);
          else g.dot(o[0], 0, { r: 5, color: c.text });
          g.line(o[0], e, tx, H, { color: c.amber, width: 2, dash: [6, 5] });
          arcPx(g, o[0], e, 0, o[1] * DEG, 34);
          g.texPx(o[1] + '^\\circ', g.X(o[0]) + 40, g.Y(e) - 13, { size: 14, color: c.primary });
          if (o[2]) g.tex('\\mathrm{' + o[2] + '}', o[0], 0, { dy: 16, align: 'center', size: 14 });
        });
        if (s.e > 0) { g.line(0, s.e, tx, s.e, { color: c.muted, width: 1.5, dash: [5, 5] }); g.tex(num(s.e, 1) + '\\,\\text{m}', tx, s.e / 2, { dx: 8, size: 13, color: c.violet }); }
        g.line(0, 0, s.d, 0, { color: c.teal, width: 3.5 });
        g.tex(s.d + '\\,\\text{m}', s.d / 2, 0, { dy: s.kind === 'two' ? 34 : 16, align: 'center', size: 14, color: c.teal });
        if (s.kind === 'two') g.tex('?', (s.d + tx) / 2, 0, { dy: 16, align: 'center', size: 14, color: c.muted });
      }
      g.tex('?', (bx0 + bx1) / 2, H / 2, { align: 'center', size: 26, color: c.muted });
      // これまでの答えと、いまの答え
      st.shots.forEach(function (v) { g.line(bx0 - 0.03 * span, v, bx1 + 0.03 * span, v, { color: c.muted, width: 1.5, dash: [3, 4] }); });
      if (!game.done) {
        g.line(bx0 - 0.06 * span, hv, bx1 + 0.06 * span, hv, { color: c.accent, width: 2.5, dash: [7, 5] });
        g.tex('h=' + num(hv, 1), bx1 + 0.06 * span, hv, { dx: 6, dy: shadow ? -10 : 0, align: 'left', size: 14, color: c.accent });
      } else g.tex('h\\approx' + num(H, 1) + '\\,\\text{m}', bx1, H, { dx: 6, dy: -12, align: 'left', size: 15, color: c.teal });
      conf.draw(g);
    };
    game.setStage(0);
  }

  T.boot([
    [initSlope, 'w-slope'],
    [initRatio, 'w-ratio'],
    [initSankaku, 'w-sankaku'],
    [initShadow, 'w-shadow'],
    [initTilt, 'w-tilt'],
    [initGameHeight, 'w-game-height'],
  ]);
})();
