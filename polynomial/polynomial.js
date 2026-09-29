/* 多項式ページ — 各ウィジェット
 * 色の約束（文章・数式・図・スライダーで共通）
 *   1章  a=黄(amber) 傾き / b=赤 y切片
 *   2.1  p=黄 x方向の移動 / q=赤 y方向の移動
 *   2.2  a=青 / p=黄 / q=赤 / b=紫 / c=青緑
 *   3.2  v0=黄 出だしの速さ / v1=青緑 終わりの速さ
 *   4章  赤=t の長さ / 青緑=1-t の長さ
 */
(function () {
  'use strict';
  const L = window.Lab;
  const { el, num, signed, setTex, slider, Plot, clamp, snap } = L;
  const R = (root, k) => root.querySelector('[data-r="' + k + '"]');
  const tex = (root, k, s) => setTex(R(root, k), s);
  const $id = (id) => document.getElementById(id);
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  const SERIES_VARS = ['--primary', '--accent', '--teal', '--amber', '--violet', '--pink'];
  const EXTRA = ['#2f9e44', '#0b7285', '#7048e8'];

  // TeX の色マクロ: \amber{..} \red{..} \blue{..} \violet{..} \teal{..}
  const C = (c, s) => '\\' + c + '{' + s + '}';
  const sg = (v) => (v < 0 ? ' - ' : ' + ');
  const coef = (a) => (a === 1 ? '' : a === -1 ? '-' : num(a));
  function polyTeX(terms) {
    let s = '';
    terms.forEach(function (t) {
      const c = Math.round(t[0] * 1000) / 1000, v = t[1];
      if (c === 0) return;
      const abs = Math.abs(c);
      const body = (abs === 1 && v ? '' : num(abs, 3)) + v;
      if (!s) s = (c < 0 ? '-' : '') + body;
      else s += (c < 0 ? ' - ' : ' + ') + body;
    });
    return s || '0';
  }
  const linTeX = (a, b) => 'y = ' + (a === 0 ? num(b) : coef(a) + 'x' + signed(b));
  const rand5 = () => (Math.floor(Math.random() * 13) - 6) / 2; // -3 .. 3 (0.5刻み)
  const colorOf = (c, i) => (i < 6 ? c.series[i] : EXTRA[i - 6]);

  /* ==========================================================
     Player — 再生/一時停止 + t スライダー(+所要時間)
     ========================================================== */
  function Player(host, ctl, o) {
    o = Object.assign({ dur: 1.8, hold: 0.7, durSlider: false, autoplay: !L.reduceMotion, onT: function () {}, onStart: null }, o);
    const st = { t: 0, playing: o.autoplay, clock: 0, phase: 0, dur: o.dur };
    const row = el('div', 'btn-row');
    const bp = el('button', 'btn primary', st.playing ? '⏸ 一時停止' : '▶ 再生');
    bp.type = 'button';
    row.append(bp); ctl.append(row);
    const stT = slider(ctl, { tex: 't', min: 0, max: 1, step: 0.005, value: 0, color: 'accent', fmt: (v) => v.toFixed(2) });
    const stD = o.durSlider ? slider(ctl, { tex: 'T', min: 0.5, max: 4, step: 0.1, value: st.dur, color: 'primary', fmt: (v) => v.toFixed(1) + '秒', aria: '所要時間' }) : null;
    const anim = L.animate(host, function (dt) {
      if (!st.playing) return false;
      st.clock += dt;
      const cyc = st.dur + o.hold, ph = st.clock % cyc;
      if (ph < st.phase && o.onStart) o.onStart(st.dur);
      st.phase = ph;
      st.t = Math.min(1, ph / st.dur);
      stT.set(st.t); o.onT(st.t, true);
      return true;
    });
    const api = {
      st,
      restart() { st.clock = 0; st.phase = 0; if (o.onStart) o.onStart(st.dur); },
      setPlaying(v) {
        st.playing = v;
        bp.textContent = v ? '⏸ 一時停止' : '▶ 再生';
        if (v) { if (st.t >= 1) st.t = 0; api.restart(); st.clock = st.t * st.dur; st.phase = st.clock; anim.kick(); }
        else o.onT(st.t, false);
      },
      setT(v) { st.t = v; stT.set(v); o.onT(v, st.playing); },
      start() { if (st.playing) { api.restart(); anim.kick(); } o.onT(st.t, st.playing); },
    };
    bp.addEventListener('click', () => api.setPlaying(!st.playing));
    stT.on(function (v) { st.playing = false; bp.textContent = '▶ 再生'; st.t = v; o.onT(v, false); });
    if (stD) stD.on(function (v) { st.dur = v; if (st.playing) api.restart(); });
    return api;
  }

  /* ==========================================================
     1.1 一次関数
     ========================================================== */
  function initLinear() {
    const root = $id('w-linear');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -6, xmax: 6, equal: true, yc: 0, ratio: [0.95, 0.6] });
    const st = { a: 1.5, b: 1, quiz: null };
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\teal{a}', min: -4, max: 4, step: 0.1, value: st.a, color: 'teal', aria: '傾き a' });
    const sb = slider(ctl, { tex: '\\red{b}', min: -5, max: 5, step: 0.1, value: st.b, color: 'accent', aria: 'y切片 b' });

    function update() {
      const { a, b } = st;
      const A = C('teal', num(a)), B = C('red', num(Math.abs(b)));
      tex(root, 'eq', a === 0 ? 'y = ' + C('red', num(b)) :
        'y = ' + (Math.abs(a) === 1 ? (a < 0 ? '-' : '') + C('teal', '1') + '\\cdot ' : A) + 'x' + (b === 0 ? '' : sg(b) + B));
      tex(root, 'slope', a === 0 ? C('teal', 'a=0') + '\\ (\\text{水平})' :
        C('teal', 'a=' + num(a)) + '\\ :\\ x\\text{が}1\\text{増えると}y\\text{は}' + C('teal', num(a)) + '\\text{変化}');
      tex(root, 'yint', C('red', 'b=' + num(b)) + '\\ :\\ x=0\\text{のときの}y');
      tex(root, 'xint', a === 0 ? '\\text{なし}' : '-\\dfrac{' + C('red', 'b') + '}{' + C('teal', 'a') + '} = ' + num(-b / a));
      const m = R(root, 'msg');
      if (st.quiz) {
        const ok = Math.abs(a - st.quiz.a) < 0.05 && Math.abs(b - st.quiz.b) < 0.05;
        m.className = 'msg ' + (ok ? 'ok' : 'ng');
        m.textContent = ok ? '✔ 正解！ ' + L.minus(linTeX(st.quiz.a, st.quiz.b).replace(/\s/g, '')) : '金色の点線に重なるように a, b を調整しよう。';
      } else { m.className = 'msg ng'; m.textContent = ''; }
      plot.invalidate();
    }
    sa.on((v) => { st.a = v; update(); });
    sb.on((v) => { st.b = v; update(); });

    plot.addHandle({ get x() { return 0; }, get y() { return st.b; }, get color() { return plot.c.accent; }, r: 5, halo: 3,
      drag(x, y) { st.b = clamp(snap(y, 0.1), -5, 5); sb.set(st.b); update(); } });
    plot.addHandle({ get x() { return 1; }, get y() { return st.a + st.b; }, get color() { return plot.c.teal; }, r: 5, halo: 3,
      drag(x, y) { st.a = clamp(snap(y - st.b, 0.1), -4, 4); sa.set(st.a); update(); } });

    plot.draw = function (g) {
      const c = g.c, { a, b } = st;
      g.grid({ xlabel: 'x', ylabel: 'y' });
      if (st.quiz) g.fn((x) => st.quiz.a * x + st.quiz.b, { color: c.amber, dash: [7, 6], width: 3.5 });
      g.fn((x) => a * x + b, { color: c.primary, width: 4 });
      // y切片 b：原点から (0,b) までの赤い矢印
      if (Math.abs(b) > 0.15) g.arrow(0, 0, 0, b, { color: c.accent, width: 4 });
      g.text('y切片 b = ' + L.minus(num(b)), 0, b, { dx: -16, dy: b >= 0 ? -14 : 14, color: c.accent, bold: true, align: 'right', size: 13 });
      // x方向に1進む矢印
      g.arrow(0, b, 1, b, { color: c.text, width: 3 });
      g.text('x方向に 1', 0.5, b, { dy: a >= 0 ? 20 : -18, color: c.text, bold: true, align: 'center', size: 13 });
      // y方向に a だけ変化する矢印
      if (Math.abs(a) > 0.1) g.arrow(1, b, 1, a + b, { color: c.teal, width: 4 });
      g.text('y方向に a = ' + L.minus(num(a)), 1, b + a / 2, { dx: 14, color: c.teal, bold: true, align: 'left', size: 13 });
      g.text('（これが傾き）', 1, b + a / 2, { dx: 14, dy: 16, color: c.teal, align: 'left', size: 12 });
      if (a !== 0) {
        const xi = -b / a;
        if (xi > g.xmin && xi < g.xmax) { g.dot(xi, 0, { r: 6, color: c.pink }); g.text('x切片', xi, 0, { dy: 18, color: c.pink, bold: true, align: 'center', size: 12 }); }
      }
    };
    root.querySelector('[data-a="quiz"]').addEventListener('click', function () {
      let qa; do { qa = rand5(); } while (qa === 0);
      st.quiz = { a: qa, b: rand5() };
      update();
    });
    root.querySelector('[data-a="reset"]').addEventListener('click', function () {
      st.a = 1.5; st.b = 1; st.quiz = null; sa.set(st.a); sb.set(st.b); update();
    });
    update();
  }

  /* ==========================================================
     1.2 2点間の補間 (lerp) ― t : (1-t)
     ========================================================== */
  function initLerp() {
    const root = $id('w-lerp');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -6, xmax: 6, equal: true, yc: 0, ratio: [0.85, 0.5] });
    const st = { A: [-3.5, -1.5], B: [3.5, 2.2], t: 0.35 };
    const ba = root.querySelector('.rb-a'), bb = root.querySelector('.rb-b');
    const player = Player(root, root.querySelector('.controls'), {
      dur: 2.6, hold: 0.8, autoplay: false,
      onT(t) { st.t = t; update(); },
    });
    player.setT(st.t);

    function P() { const t = st.t; return [(1 - t) * st.A[0] + t * st.B[0], (1 - t) * st.A[1] + t * st.B[1]]; }
    function update() {
      const t = st.t, p = P(), dx = st.B[0] - st.A[0], dy = st.B[1] - st.A[1], len = Math.hypot(dx, dy);
      tex(root, 'p', '\\boldsymbol{P}(' + num(t) + ') = (' + num(p[0]) + ',\\ ' + num(p[1]) + ')');
      tex(root, 'ratio', '\\mathrm{AP}:\\mathrm{PB}=' + C('red', 't') + ':' + C('teal', '(1-t)') + '=' + C('red', num(t)) + ':' + C('teal', num(1 - t)));
      tex(root, 'len', C('red', '\\mathrm{AP}=' + num(t * len)) + ',\\ ' + C('teal', '\\mathrm{PB}=' + num((1 - t) * len)) + '\\ (\\mathrm{AB}=' + num(len) + ')');
      if (Math.abs(dx) < 1e-6) tex(root, 'eq', 'x = ' + num(st.A[0]) + '\\ (\\text{関数のグラフではない})');
      else {
        const a = Math.round((dy / dx) * 100) / 100, b = Math.round((st.A[1] - (dy / dx) * st.A[0]) * 100) / 100;
        tex(root, 'eq', linTeX(a, b));
      }
      ba.style.width = t * 100 + '%'; bb.style.width = (1 - t) * 100 + '%';
      ba.textContent = t > 0.2 ? 'AP：t = ' + t.toFixed(2) : t > 0.07 ? 'AP' : '';
      bb.textContent = 1 - t > 0.2 ? 'PB：1−t = ' + (1 - t).toFixed(2) : 1 - t > 0.07 ? 'PB' : '';
      plot.invalidate();
    }
    const dragTo = (pt) => (x, y) => { pt[0] = clamp(snap(x, 0.25), -5.5, 5.5); pt[1] = clamp(snap(y, 0.25), plot.ymin + 0.5, plot.ymax - 0.5); update(); };
    plot.addHandle({ get x() { return st.A[0]; }, get y() { return st.A[1]; }, get color() { return plot.c.primary; }, label: 'A = P(0)', ldx: 0, ldy: -20, lalign: 'center', drag: dragTo(st.A) });
    plot.addHandle({ get x() { return st.B[0]; }, get y() { return st.B[1]; }, get color() { return plot.c.text; }, label: 'B = P(1)', ldx: 0, ldy: -20, lalign: 'center', drag: dragTo(st.B) });

    plot.draw = function (g) {
      const c = g.c, dx = st.B[0] - st.A[0], dy = st.B[1] - st.A[1], t = st.t, q = P();
      g.grid();
      if (Math.abs(dx) < 1e-6) g.line(st.A[0], g.ymin, st.A[0], g.ymax, { color: c.muted, dash: [6, 6], width: 1.5 });
      else g.fn((x) => st.A[1] + (dy / dx) * (x - st.A[0]), { color: c.muted, dash: [6, 6], width: 1.5 });
      g.line(st.A[0], st.A[1], q[0], q[1], { color: c.accent, width: 6 });
      g.line(q[0], q[1], st.B[0], st.B[1], { color: c.teal, width: 6 });
      g.dot(q[0], q[1], { r: 8, color: c.text });
      // 線分に沿った法線方向にラベルをずらす
      const ax = g.X(st.A[0]), ay = g.Y(st.A[1]), bx = g.X(st.B[0]), by = g.Y(st.B[1]);
      const d = Math.hypot(bx - ax, by - ay) || 1, nx = (by - ay) / d, ny = -(bx - ax) / d;
      if (t * d > 60) g.text('AP = t×AB', (st.A[0] + q[0]) / 2, (st.A[1] + q[1]) / 2, { dx: nx * 22, dy: ny * 22, color: c.accent, bold: true, align: 'center', size: 12 });
      if ((1 - t) * d > 80) g.text('PB = (1−t)×AB', (q[0] + st.B[0]) / 2, (q[1] + st.B[1]) / 2, { dx: nx * 22, dy: ny * 22, color: c.teal, bold: true, align: 'center', size: 12 });
      g.text('t = 0', st.A[0], st.A[1], { dy: 22, color: c.muted, bold: true, align: 'center', size: 12 });
      g.text('t = 1', st.B[0], st.B[1], { dy: 22, color: c.muted, bold: true, align: 'center', size: 12 });
      g.text('P(t)', q[0], q[1], { dx: -nx * 22, dy: -ny * 22, color: c.text, bold: true, align: 'center' });
      g.textPx('AP : PB = t : (1−t) = ' + t.toFixed(2) + ' : ' + (1 - t).toFixed(2), 10, g.h - 14, { bold: true, size: 13, color: c.text });
    };
    update();
  }

  /* ==========================================================
     2.1 平行移動  y - q = (x - p)^2
     ========================================================== */
  function initShift() {
    const root = $id('w-shift');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 5, equal: true, yc: 1.2, ratio: [0.95, 0.72] });
    const st = { p: 2, q: 1, s: 1, quiz: null };
    const ctl = root.querySelector('.controls');
    const sp = slider(ctl, { tex: '\\teal{p}', min: -3, max: 3, step: 0.5, value: st.p, color: 'teal', aria: 'x方向の移動 p' });
    const sq = slider(ctl, { tex: '\\red{q}', min: -2, max: 2, step: 0.5, value: st.q, color: 'accent', aria: 'y方向の移動 q' });
    const ss = slider(ctl, { tex: 's', min: -2.4, max: 2.4, step: 0.1, value: st.s, color: 'primary', aria: '点Qの位置 s' });

    function update() {
      const { p, q, s } = st;
      const xp = p === 0 ? 'x' : '(x' + sg(-p) + C('teal', num(Math.abs(p))) + ')';
      tex(root, 'eq', 'y' + (q === 0 ? '' : sg(-q) + C('red', num(Math.abs(q)))) + ' = ' + xp + '^2');
      tex(root, 'vec', '(' + C('teal', 'p') + ',\\ ' + C('red', 'q') + ') = (' + C('teal', num(p)) + ',\\ ' + C('red', num(q)) + ')');
      tex(root, 'vertex', '(0,\\ 0)\\ \\to\\ (' + C('teal', 'p') + ',\\ ' + C('red', 'q') + ') = (' + num(p) + ',\\ ' + num(q) + ')');
      tex(root, 'pt', '\\mathrm{Q}(' + num(s) + ',\\ ' + num(s * s) + ')\\ \\to\\ \\mathrm{Q}\'(s' + sg(p) + C('teal', 'p') + ',\\ s^2' + sg(q) + C('red', 'q') + ') = (' + num(s + p) + ',\\ ' + num(s * s + q) + ')');
      const m = R(root, 'msg');
      if (st.quiz) {
        const ok = st.quiz.p === p && st.quiz.q === q;
        m.className = 'msg ' + (ok ? 'ok' : 'ng');
        m.textContent = ok ? '✔ 正解！ p = ' + L.minus(num(p)) + ', q = ' + L.minus(num(q)) : '金色の点線と同じ位置になるよう、頂点（赤）を動かそう。x方向に p、y方向に q。';
      } else { m.className = 'msg ng'; m.textContent = ''; }
      plot.invalidate();
    }
    sp.on((v) => { st.p = v; update(); });
    sq.on((v) => { st.q = v; update(); });
    ss.on((v) => { st.s = v; update(); });

    plot.addHandle({ get x() { return st.p; }, get y() { return st.q; }, get color() { return plot.c.text; }, r: 10,
      label: () => '頂点 (' + L.minus(num(st.p)) + ', ' + L.minus(num(st.q)) + ')', ldx: 16, ldy: 22,
      drag(x, y) { st.p = clamp(snap(x, 0.5), -3, 3); st.q = clamp(snap(y, 0.5), -2, 2); sp.set(st.p); sq.set(st.q); update(); } });
    plot.addHandle({ get x() { return st.s; }, get y() { return st.s * st.s; }, get color() { return plot.c.primary; }, r: 8, label: 'Q', ldx: -16, ldy: -8,
      drag(x) { st.s = clamp(snap(x, 0.1), -2.4, 2.4); ss.set(st.s); update(); } });

    plot.draw = function (g) {
      const c = g.c, { p, q, s } = st;
      g.grid({ xlabel: 'x', ylabel: 'y' });
      if (st.quiz) g.fn((x) => (x - st.quiz.p) * (x - st.quiz.p) + st.quiz.q, { color: c.amber, dash: [7, 6], width: 3.5 });
      g.fn((x) => x * x, { color: c.muted, dash: [5, 5], width: 2.5 });
      g.text('もとの y = x²', -2.15, 4.3, { color: c.muted, bold: true, align: 'right', dx: -6, size: 12 });
      if (p !== 0 && q !== 0) g.fn((x) => (x - p) * (x - p), { color: c.teal, dash: [2, 5], width: 2.5, alpha: 0.8 });
      g.fn((x) => (x - p) * (x - p) + q, { color: c.primary, width: 4 });
      // 移動の矢印: x方向に p → y方向に q
      if (p !== 0) g.arrow(0, 0, p, 0, { color: c.teal, width: 4.5 });
      if (q !== 0) g.arrow(p, 0, p, q, { color: c.accent, width: 4.5 });
      if (p !== 0) g.text('x方向に p = ' + L.minus(num(p)), p / 2, 0, { dy: 20, color: c.teal, bold: true, align: 'center', size: 13 });
      if (q !== 0) {
        const right = p < 1.6;
        g.text('y方向に q = ' + L.minus(num(q)), p, q / 2, { dx: right ? 14 : -14, color: c.accent, bold: true, align: right ? 'left' : 'right', size: 13 });
      }
      g.arrow(s, s * s, s + p, s * s + q, { color: c.text, width: 2, dash: [5, 4] });
      g.dot(s + p, s * s + q, { r: 6, color: c.primary });
      g.text("Q'", s + p, s * s + q, { dx: 12, dy: 12, bold: true, color: c.primary });
    };
    root.querySelector('[data-a="quiz"]').addEventListener('click', function () {
      st.quiz = { p: rand5(), q: (Math.floor(Math.random() * 9) - 4) / 2 };
      if (st.quiz.p === 0 && st.quiz.q === 0) st.quiz.p = 2;
      update();
    });
    root.querySelector('[data-a="reset"]').addEventListener('click', function () {
      st.p = 2; st.q = 1; st.s = 1; st.quiz = null; sp.set(2); sq.set(1); ss.set(1); update();
    });
    update();
  }

  /* ==========================================================
     2.2 頂点形 ⇄ 一般形
     ========================================================== */
  function initQuad() {
    const root = $id('w-quad');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -6, xmax: 6, equal: true, yc: 0, ratio: [0.95, 0.68] });
    const st = { a: 1, p: 1, q: -2, b: 0, c: 0 };
    const ctl = root.querySelector('.controls');
    ctl.append(el('div', 'ctrl-group-title', '頂点形  a(x − p)² + q'));
    const sa = slider(ctl, { tex: '\\blue{a}', min: -3, max: 3, step: 0.1, value: st.a, color: 'primary' });
    const sp = slider(ctl, { tex: '\\teal{p}', min: -5, max: 5, step: 0.1, value: st.p, color: 'teal' });
    const sq = slider(ctl, { tex: '\\red{q}', min: -4, max: 4, step: 0.1, value: st.q, color: 'accent' });
    ctl.append(el('div', 'ctrl-group-title', '一般形  ax² + bx + c'));
    const sbb = slider(ctl, { tex: '\\amber{b}', min: -12, max: 12, step: 0.1, value: 0, color: 'amber' });
    const sc = slider(ctl, { tex: '\\slate{c}', min: -12, max: 12, step: 0.1, value: 0, color: 'pink' });

    function fromVertex() { st.b = -2 * st.a * st.p; st.c = st.a * st.p * st.p + st.q; sbb.set(st.b); sc.set(st.c); }
    function fromGeneral() { st.p = -st.b / (2 * st.a); st.q = st.c - (st.b * st.b) / (4 * st.a); sp.set(st.p); sq.set(st.q); }
    function fixA(v) { if (Math.abs(v) < 0.05) v = 0.1; st.a = v; sa.set(v); }

    function update() {
      const { a, p, q, b, c } = st;
      const ca = a === 1 ? '' : a === -1 ? '-' : C('blue', num(a));
      const xp = p === 0 ? 'x' : '(x' + sg(-p) + C('teal', num(Math.abs(p))) + ')';
      tex(root, 'vform', 'y = ' + ca + xp + '^2' + (num(q) === '0' ? '' : sg(q) + C('red', num(Math.abs(q)))));
      const bt = num(b) === '0' ? '' : sg(b) + C('amber', Math.abs(b) === 1 ? '' : num(Math.abs(b))) + 'x';
      const ct = num(c) === '0' ? '' : sg(c) + C('slate', num(Math.abs(c)));
      tex(root, 'gform', 'y = ' + ca + 'x^2' + bt + ct);
      tex(root, 'vertex', '(' + C('teal', 'p') + ',\\ ' + C('red', 'q') + ') = (' + C('teal', num(p)) + ',\\ ' + C('red', num(q)) + ')');
      const D = b * b - 4 * a * c;
      tex(root, 'disc', 'D = ' + C('amber', 'b') + '^2-4' + C('blue', 'a') + C('slate', 'c') + ' = ' + num(D) + (D > 1e-9 ? '\\ (>0)' : D < -1e-9 ? '\\ (<0)' : '\\ (=0)'));
      if (D > 1e-6) {
        const r = Math.sqrt(D) / (2 * Math.abs(a));
        tex(root, 'roots', 'x = ' + num(p - r) + ',\\ ' + num(p + r));
      } else if (D > -1e-6) tex(root, 'roots', 'x = ' + num(p) + '\\ (\\text{接する})');
      else tex(root, 'roots', '\\text{なし}');
      plot.invalidate();
    }
    sa.on((v) => { fixA(v); fromVertex(); update(); });
    sp.on((v) => { st.p = v; fromVertex(); update(); });
    sq.on((v) => { st.q = v; fromVertex(); update(); });
    sbb.on((v) => { st.b = v; fromGeneral(); update(); });
    sc.on((v) => { st.c = v; fromGeneral(); update(); });

    plot.addHandle({ get x() { return st.p; }, get y() { return st.q; }, get color() { return plot.c.text; }, r: 10,
      label: () => '頂点 (' + L.minus(num(st.p)) + ', ' + L.minus(num(st.q)) + ')', ldx: 16, ldy: 22,
      drag(x, y) { st.p = clamp(snap(x, 0.1), -5, 5); st.q = clamp(snap(y, 0.1), -4, 4); sp.set(st.p); sq.set(st.q); fromVertex(); update(); } });

    plot.draw = function (g) {
      const c = g.c, { a, p, q, b, c: cc } = st;
      g.grid({ xlabel: 'x', ylabel: 'y' });
      g.fn((x) => a * x * x, { color: c.muted, dash: [5, 5], width: 2.2 });
      g.text('もとの y = ax²', -2.2, a * 4.84, { dx: -8, color: c.muted, bold: true, align: 'right', size: 12 });
      g.line(p, g.ymin, p, g.ymax, { color: c.muted, dash: [6, 6], width: 1.6 });
      g.text('軸 x = p', p, g.ymax, { dx: 6, dy: 14, color: c.muted, bold: true, size: 12 });
      g.fn((x) => a * (x - p) * (x - p) + q, { color: c.primary, width: 4 });
      if (Math.abs(p) > 0.15) { g.arrow(0, 0, p, 0, { color: c.teal, width: 4 }); g.text('x方向に p', p / 2, 0, { dy: 20, color: c.teal, bold: true, align: 'center', size: 12 }); }
      if (Math.abs(q) > 0.15) { g.arrow(p, 0, p, q, { color: c.accent, width: 4 }); g.text('y方向に q', p, q / 2, { dx: 14, color: c.accent, bold: true, align: 'left', size: 12 }); }
      const D = b * b - 4 * a * cc;
      if (D > 1e-6) {
        const r = Math.sqrt(D) / (2 * Math.abs(a));
        [p - r, p + r].forEach((x) => g.dot(x, 0, { r: 6, color: c.text }));
      } else if (D > -1e-6) g.dot(p, 0, { r: 6, color: c.text });
      if (Math.abs(cc) < g.ymax) { g.dot(0, cc, { r: 5, color: c.pink }); g.text('(0, c)', 0, cc, { dx: -10, dy: 0, color: c.pink, bold: true, align: 'right', size: 12 }); }
    };
    fromVertex();
    update();
  }

  /* ==========================================================
     イージング: 共通の定義
     ========================================================== */
  const EASE = [
    { id: 'linear', name: 'linear', f: (t) => t, tex: 'f(t) = t', deg: '1次', note: '等速。' },
    { id: 'inQuad', name: 'easeInQuad', f: (t) => t * t, tex: 'f(t) = t^2', deg: '2次', note: 'ゆっくり出発して、だんだん加速する（ease-in）。' },
    { id: 'outQuad', name: 'easeOutQuad', f: (t) => 2 * t - t * t, tex: 'f(t) = 1-(1-t)^2 = 2t - t^2', deg: '2次', note: '勢いよく出発して、ゆっくり止まる（ease-out）。' },
    { id: 'inOutQuad', name: 'easeInOutQuad', f: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
      tex: 'f(t)=\\begin{cases}2t^2 & (t<\\tfrac12)\\\\ 1-2(1-t)^2 & (t\\geqq\\tfrac12)\\end{cases}', deg: '2次（区分）', note: '前半は ease-in、後半は ease-out。' },
    { id: 'inCubic', name: 'easeInCubic', f: (t) => t * t * t, tex: 'f(t) = t^3', deg: '3次', note: '2次より強く「溜めて」から加速。' },
    { id: 'outCubic', name: 'easeOutCubic', f: (t) => 1 - Math.pow(1 - t, 3), tex: 'f(t) = 1-(1-t)^3 = 3t - 3t^2 + t^3', deg: '3次', note: '2次より強く減速して止まる。UIの表示でよく使われる。' },
    { id: 'inOutCubic', name: 'easeInOutCubic', f: (t) => (t < 0.5 ? 4 * t * t * t : 1 - 4 * Math.pow(1 - t, 3)),
      tex: 'f(t)=\\begin{cases}4t^3 & (t<\\tfrac12)\\\\ 1-4(1-t)^3 & (t\\geqq\\tfrac12)\\end{cases}', deg: '3次（区分）', note: '両端でゆっくり、中央で速い。' },
    { id: 'smooth', name: 'smoothstep', f: (t) => t * t * (3 - 2 * t), tex: 'f(t) = 3t^2 - 2t^3', deg: '3次', note: '1本の多項式で、始点・終点の速さが0のS字。f′(0)=f′(1)=0。' },
    { id: 'smoother', name: 'smootherstep', f: (t) => t * t * t * (t * (6 * t - 15) + 10), tex: 'f(t) = 6t^5 - 15t^4 + 10t^3', deg: '5次', note: '両端で加速度も0になる、さらに滑らかなS字。' },
  ];

  /* ==========================================================
     3.1 並べて比べる(レース)
     ========================================================== */
  function initRace() {
    const root = $id('w-race');
    const cvs = root.querySelectorAll('canvas');
    const sel = ['linear', 'inQuad', 'outQuad', 'smooth'];
    const list = () => EASE.filter((e) => sel.indexOf(e.id) >= 0);
    const laneH = 48;
    const lanes = new Plot(cvs[0], { xmin: -0.5, xmax: 1.1, ymin: -0.6, ymax: 3.5, height: () => (list().length + 0.5) * laneH });
    const gp = new Plot(cvs[1], { xmin: -0.1, xmax: 1.1, ymin: -0.15, ymax: 1.15, ratio: [0.6, 0.36] });
    let player;
    lanes.onResize = function (p) {
      const m = p.w < 520 ? 118 : 132, r = 24, u = p.w - m - r;
      p.o.xmin = -m / u; p.o.xmax = 1 + r / u; p._layout();
    };
    function setLaneView() {
      const n = list().length;
      lanes.o.ymin = -0.55; lanes.o.ymax = n - 1 + 0.95;
      lanes.resize();
      lanes.onResize(lanes);
      lanes.invalidate();
    }
    lanes.draw = function (g) {
      const c = g.c, ls = list(), n = ls.length, t = player ? player.st.t : 0;
      g.line(0, -0.5, 0, n - 1 + 0.55, { color: c.axis, dash: [5, 5], width: 1.5 });
      g.line(1, -0.5, 1, n - 1 + 0.55, { color: c.axis, dash: [5, 5], width: 1.5 });
      g.textPx('スタート', g.X(0), 10, { align: 'center', size: 12, bold: true, color: c.muted });
      g.textPx('ゴール', g.X(1), 10, { align: 'center', size: 12, bold: true, color: c.muted });
      ls.forEach(function (e, i) {
        const y = n - 1 - i, col = colorOf(c, EASE.indexOf(e));
        g.line(0, y, 1, y, { color: c.grid, width: 14 });
        g.line(0, y, 1, y, { color: c.axis, width: 1.5, alpha: 0.6 });
        for (let k = 0; k <= 10; k++) g.dot(e.f(k / 10), y, { r: 3.5, color: c.muted, stroke: false });
        g.textPx(e.name, 8, g.Y(y), { bold: true, size: g.w < 520 ? 11.5 : 13, color: col });
        g.dot(e.f(t), y, { r: 13, color: col });
      });
    };
    gp.draw = function (g) {
      const c = g.c, t = player ? player.st.t : 0;
      g.grid({ stepX: 0.25, stepY: 0.25, xlabel: 't' });
      g.line(0, 0, 1, 1, { color: c.muted, dash: [5, 5], width: 1.2 });
      list().forEach(function (e) {
        g.fn(e.f, { x0: 0, x1: 1, color: colorOf(c, EASE.indexOf(e)), width: 3.2, samples: 120 });
      });
      g.line(t, -0.15, t, 1.15, { color: c.text, dash: [4, 4], width: 1.3, alpha: 0.7 });
      list().forEach((e) => g.dot(t, e.f(t), { r: 5.5, color: colorOf(c, EASE.indexOf(e)) }));
    };
    player = Player(root, root.querySelector('.controls'), {
      dur: 2.2, hold: 0.8, durSlider: true,
      onT() { lanes.invalidate(); gp.invalidate(); },
    });

    const chips = R(root, 'chips'), legend = R(root, 'legend');
    const btns = EASE.map(function (e) {
      const b = el('button', 'chip');
      b.type = 'button';
      b.innerHTML = '<i class="sw"></i>' + e.name;
      b.addEventListener('click', function () {
        const k = sel.indexOf(e.id);
        if (k >= 0) { if (sel.length > 1) sel.splice(k, 1); } else if (sel.length < 6) sel.push(e.id);
        else return;
        refresh();
      });
      chips.append(b);
      return b;
    });
    function refresh() {
      const c = L.palette();
      btns.forEach(function (b, i) {
        const on = sel.indexOf(EASE[i].id) >= 0;
        b.setAttribute('aria-pressed', String(on));
        b.querySelector('.sw').style.background = on ? colorOf(c, i) : 'var(--track)';
      });
      legend.innerHTML = '';
      list().forEach(function (e) {
        const row = el('div', 'li');
        row.innerHTML = '<span class="nm"><i class="swatch" style="background:' + colorOf(c, EASE.indexOf(e)) + '"></i>' + e.name + '</span><span class="tex"></span>';
        legend.append(row);
        setTex(row.querySelector('.tex'), e.tex);
      });
      setLaneView(); gp.invalidate();
    }
    document.addEventListener('themechange', refresh);
    refresh();
    player.start();
  }

  /* ==========================================================
     EasingDemo — 動き(上)を主役に、位置グラフと速さグラフは小さく並べる
     ========================================================== */
  function EasingDemo(host, o) {
    o = Object.assign({ ymin: -0.3, ymax: 1.3, dur: 1.8 }, o);
    host.innerHTML =
      '<div class="stage"><span class="cap">実際の動き：球が 0 から 1 へ進む</span><canvas aria-label="動きの再現"></canvas></div>' +
      '<div class="duo">' +
      '<div class="stage"><span class="cap">位置 f(t)</span><canvas aria-label="位置のグラフ"></canvas></div>' +
      '<div class="stage"><span class="cap">速さ f′(t)（グラフの傾き）</span><canvas aria-label="速さのグラフ"></canvas></div>' +
      '</div><div class="panel"><div class="controls"></div></div>';
    const cv = host.querySelectorAll('canvas');
    const XR = { xmin: -0.1, xmax: 1.1 };
    const tr = new Plot(cv[0], { xmin: -0.12, xmax: 1.16, ymin: -1.4, ymax: 1.4, ratio: [0.42, 0.2] });
    const g = new Plot(cv[1], Object.assign({ ymin: o.ymin, ymax: o.ymax, ratio: [0.8, 0.8] }, XR));
    const sp = new Plot(cv[2], Object.assign({ ymin: -0.3, ymax: 2, ratio: [0.8, 0.8] }, XR));
    const demo = { g, sp, tr, f: (t) => t, hooks: {}, onTick: null, onStart: null };
    const H = 1e-4;
    const df = (t) => { const a = clamp(t, H, 1 - H); return (demo.f(a + H) - demo.f(a - H)) / (2 * H); };
    demo.df = df;
    const player = Player(host, host.querySelector('.controls'), {
      dur: o.dur, durSlider: true, hold: 0.7,
      onT(t, playing) { demo.render(); if (demo.onTick) demo.onTick(t, playing); },
      onStart(d) { if (demo.onStart) demo.onStart(d); },
    });
    demo.st = player.st; demo.player = player;

    function speedView() {
      let mn = 0, mx = 1;
      for (let i = 0; i <= 120; i++) { const v = df(i / 120); if (isFinite(v)) { mn = Math.min(mn, v); mx = Math.max(mx, v); } }
      mx = Math.min(mx, 9); mn = Math.max(mn, -6);
      const pad = (mx - mn) * 0.12 + 0.05;
      sp.setView({ ymin: mn - pad, ymax: mx + pad });
    }
    g.draw = function (p) {
      const c = p.c, t = player.st.t, y = demo.f(t);
      p.grid({ stepX: 0.25, stepY: 0.25, xlabel: 't' });
      p.line(0, 0, 1, 1, { color: c.muted, dash: [5, 5], width: 1.5 });
      if (demo.hooks.under) demo.hooks.under(p);
      if (demo.hooks.curve) demo.hooks.curve(p); else p.fn(demo.f, { x0: 0, x1: 1, color: c.primary, width: 4, samples: 160 });
      p.line(t, 0, t, y, { color: c.accent, dash: [4, 4], width: 1.8 });
      p.line(0, y, t, y, { color: c.accent, dash: [4, 4], width: 1.8 });
      p.dot(0, y, { r: 4.5, color: c.accent });
      p.dot(t, y, { r: 7, color: c.accent });
      if (demo.hooks.over) demo.hooks.over(p);
    };
    sp.draw = function (p) {
      const c = p.c, t = player.st.t, v = df(t);
      p.grid({ stepX: 0.25, stepY: p.ymax - p.ymin > 4 ? 1 : 0.5, xlabel: 't' });
      p.fn(df, { x0: 0, x1: 1, color: c.amber, width: 3.5, samples: 160 });
      p.line(t, p.ymin, t, v, { color: c.accent, dash: [4, 4], width: 1.8 });
      p.dot(t, v, { r: 6, color: c.accent });
    };
    tr.draw = function (p) {
      const c = p.c, t = player.st.t, f = demo.f(t);
      p.line(0, 0, 1, 0, { color: c.grid, width: 16 });
      p.line(0, 0, 1, 0, { color: c.axis, width: 2 });
      for (let k = 0; k <= 10; k++) p.dot(demo.f(k / 10), 0, { r: 4, color: c.muted, stroke: false });
      p.dot(0, 0, { r: 10, ring: true, color: c.muted, lw: 2.5 });
      p.dot(1, 0, { r: 10, ring: true, color: c.muted, lw: 2.5 });
      p.text('スタート 0', 0, 0, { dy: 30, align: 'center', size: 12, color: c.muted, bold: true });
      p.text('ゴール 1', 1, 0, { dy: 30, align: 'center', size: 12, color: c.muted, bold: true });
      if (demo.hooks.track) demo.hooks.track(p);
      p.dot(f, 0, { r: 15, color: c.primary });
      p.textPx('t = ' + t.toFixed(2) + '　位置 f(t) = ' + L.minus(f.toFixed(2)), 10, 16, { bold: true, size: 13, color: c.text });
    };
    demo.render = function () { g.invalidate(); sp.invalidate(); tr.invalidate(); };
    demo.refresh = function () { speedView(); demo.render(); };
    demo.restart = () => player.restart();
    demo.start = function () { speedView(); player.start(); };
    return demo;
  }

  /* ==========================================================
     3.2 3次でイージングを設計
     ========================================================== */
  function initDesign() {
    const root = $id('w-design');
    const demo = EasingDemo(R(root, 'demo'), { ymin: -0.6, ymax: 1.7, dur: 1.8 });
    const st = { v0: 0, v1: 0 };
    const ctl = root.querySelector('.controls');
    const s0 = slider(ctl, { tex: '\\amber{v_0}', min: -2, max: 4, step: 0.1, value: 0, color: 'amber', aria: '出だしの速さ v0' });
    const s1 = slider(ctl, { tex: '\\teal{v_1}', min: -2, max: 4, step: 0.1, value: 0, color: 'teal', aria: '終わりの速さ v1' });
    demo.f = (t) => (st.v0 + st.v1 - 2) * t * t * t + (3 - 2 * st.v0 - st.v1) * t * t + st.v0 * t;

    function update() {
      const A = st.v0 + st.v1 - 2, B = 3 - 2 * st.v0 - st.v1;
      tex(root, 'tex', 'f(t) = ' + polyTeX([[A, 't^3'], [B, 't^2'], [st.v0, 't']]));
      tex(root, 'check', "f(0)=0,\\ f(1)=1,\\ f'(0)=" + C('amber', num(st.v0)) + ",\\ f'(1)=" + C('teal', num(st.v1)));
      tex(root, 'ctrl', '(\\tfrac13,\\ ' + num(st.v0 / 3) + '),\\ (\\tfrac23,\\ ' + num(1 - st.v1 / 3) + ')');
      demo.refresh();
    }
    s0.on((v) => { st.v0 = v; update(); });
    s1.on((v) => { st.v1 = v; update(); });
    demo.g.addHandle({ get x() { return 1 / 3; }, get y() { return st.v0 / 3; }, get color() { return demo.g.c.amber; }, r: 9,
      drag(x, y) { st.v0 = clamp(snap(3 * y, 0.1), -2, 4); s0.set(st.v0); update(); } });
    demo.g.addHandle({ get x() { return 2 / 3; }, get y() { return 1 - st.v1 / 3; }, get color() { return demo.g.c.teal; }, r: 9,
      drag(x, y) { st.v1 = clamp(snap(3 * (1 - y), 0.1), -2, 4); s1.set(st.v1); update(); } });
    demo.hooks.under = function (g) {
      const c = g.c;
      g.poly([[0, 0], [1 / 3, st.v0 / 3], [2 / 3, 1 - st.v1 / 3], [1, 1]], { color: c.muted, dash: [4, 5], width: 1.3 });
      g.arrow(0, 0, 1 / 3, st.v0 / 3, { color: c.amber, width: 3.5 });
      g.arrow(2 / 3, 1 - st.v1 / 3, 1, 1, { color: c.teal, width: 3.5 });
      g.text('v₀：傾き＝出だしの速さ', 1 / 6, st.v0 / 6, { dx: 6, dy: st.v0 >= 0 ? 24 : -24, color: c.amber, bold: true, size: 12 });
      g.text('v₁：傾き＝終わりの速さ', 5 / 6, 1 - st.v1 / 6, { dx: 0, dy: st.v1 >= 0 ? -24 : 24, color: c.teal, bold: true, size: 12, align: 'center' });
    };
    // 動きの図にも v0, v1 を矢印で描く(長さ＝速さ)
    demo.hooks.track = function (g) {
      const c = g.c, k = 0.09;
      if (Math.abs(st.v0) > 0.05) g.arrow(0, 0.5, st.v0 * k, 0.5, { color: c.amber, width: 4 });
      g.text('v₀ = ' + L.minus(num(st.v0)) + '（出だしの速さ）', 0, 0.5, { dy: -14, color: c.amber, bold: true, size: 12 });
      if (Math.abs(st.v1) > 0.05) g.arrow(1 - st.v1 * k, 0.5, 1, 0.5, { color: c.teal, width: 4 });
      g.text('v₁ = ' + L.minus(num(st.v1)) + '（終わりの速さ）', 1, 0.5, { dy: -14, color: c.teal, bold: true, size: 12, align: 'right' });
    };
    update();
    demo.start();
  }

  /* ==========================================================
     4.1 ド・カステリョ ― t:(1-t) の内分
     ========================================================== */
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };
  const bern = (n, i, t) => binom(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
  function casteljau(pts, t) {
    const levels = [pts];
    let cur = pts;
    while (cur.length > 1) {
      const nx = [];
      for (let i = 0; i < cur.length - 1; i++) nx.push([(1 - t) * cur[i][0] + t * cur[i + 1][0], (1 - t) * cur[i][1] + t * cur[i + 1][1]]);
      levels.push(nx); cur = nx;
    }
    return levels;
  }
  const curvePts = (pts, k) => { const a = []; for (let i = 0; i <= k; i++) { const lv = casteljau(pts, i / k); a.push(lv[lv.length - 1][0]); } return a; };

  const DC_PTS = {
    1: [[1.2, -1.5], [8.8, 1.8]],
    2: [[1.2, -2], [5, 2.6], [8.8, -1.8]],
    3: [[1, -2], [3, 2.6], [7, -2.6], [9, 2]],
  };
  function drawDC(g, pts, t, n) {
    const c = g.c, lv = casteljau(pts, t);
    g.grid({ step: 1, axes: false, labels: false });
    if (n >= 2) {
      const cur = curvePts(pts, 100);
      g.poly(cur, { color: c.primary, width: 4, alpha: 0.22 });
      g.poly(cur.slice(0, Math.round(t * 100) + 1), { color: c.primary, width: 5 });
    }
    // 内分を重ねるほど(段が進むほど)線を細く・薄くする
    for (let k = 0; k < n; k++) {
      const wd = Math.max(2.4, 5.6 - 1.5 * k), al = Math.max(0.35, 1 - 0.3 * k);
      for (let i = 0; i < lv[k].length - 1; i++) {
        const a = lv[k][i], b = lv[k][i + 1], q = lv[k + 1][i];
        g.line(a[0], a[1], q[0], q[1], { color: c.accent, width: wd, alpha: al });
        g.line(q[0], q[1], b[0], b[1], { color: c.teal, width: wd, alpha: al });
        if (k === 0 || k === n - 1) {
          const ax = g.X(a[0]), ay = g.Y(a[1]), bx = g.X(b[0]), by = g.Y(b[1]);
          const d = Math.hypot(bx - ax, by - ay) || 1, nx = (by - ay) / d, ny = -(bx - ax) / d;
          if (t * d > 34) g.text('t', (a[0] + q[0]) / 2, (a[1] + q[1]) / 2, { dx: nx * 15, dy: ny * 15, color: c.accent, bold: true, align: 'center', size: 15, italic: true });
          if ((1 - t) * d > 34) g.text('1−t', (q[0] + b[0]) / 2, (q[1] + b[1]) / 2, { dx: nx * 15, dy: ny * 15, color: c.teal, bold: true, align: 'center', size: 14 });
        }
      }
    }
    for (let k = 1; k < n; k++) {
      lv[k].forEach(function (q, i) {
        g.dot(q[0], q[1], { r: 4.5, color: c.muted });
        let nm = 'P';
        for (let j = 0; j <= k; j++) nm += SUB[i + j];
        g.text(nm, q[0], q[1], { dx: 10, dy: -12, size: 12, color: c.muted, bold: true });
      });
    }
    const P = lv[n][0];
    g.dot(P[0], P[1], { r: 9, color: c.primary });
    g.text('P(t)', P[0], P[1], { dx: 12, dy: -16, color: c.primary, bold: true, size: 14 });
    g.textPx('t = ' + t.toFixed(2), 10, 16, { bold: true, size: 13, color: c.text });
  }
  function initDC() {
    const root = $id('w-dc');
    root.querySelectorAll('.dc-block').forEach(function (blk) {
      const n = +blk.dataset.n, st = { t: 0 };
      const plot = new Plot(blk.querySelector('canvas'), { xmin: 0, xmax: 10, equal: true, yc: 0, ratio: [0.85, 0.66] });
      const pts = DC_PTS[n].map((p) => p.slice());
      pts.forEach(function (pt, i) {
        plot.addHandle({
          get x() { return pt[0]; }, get y() { return pt[1]; }, get color() { return plot.c.series[i % 6]; }, r: 9,
          label: 'P' + SUB[i], ldx: 14, ldy: 16,
          drag(x, y) { pt[0] = clamp(x, 0.3, 9.7); pt[1] = clamp(y, plot.ymin + 0.3, plot.ymax - 0.3); plot.invalidate(); },
        });
      });
      plot.draw = (g) => drawDC(g, pts, st.t, n);
      // 図ごとに再生・停止と t スライダーを持つ
      const player = Player(blk, blk.querySelector('.controls'), {
        dur: 3.6, hold: 0.9, autoplay: !L.reduceMotion,
        onT(t) { st.t = t; plot.invalidate(); },
      });
      player.start();
    });
  }

  /* ==========================================================
     4.2 ベジェ曲線(任意次数)
     ========================================================== */
  function defPts(n) {
    const fixed = {
      1: [[1.2, -1.6], [8.8, 1.6]],
      2: [[1.2, -1.8], [5, 2.4], [8.8, -1.8]],
      3: [[1, -1.8], [3, 2.4], [7, -2.4], [9, 1.8]],
      4: [[1, -1.8], [3, 2.4], [5, -1.2], [7, 2.4], [9, -1.8]],
      5: [[1, -1.8], [2.4, 2.4], [4.4, -2.2], [5.6, 2.2], [7.6, -2.4], [9, 1.8]],
    };
    if (fixed[n]) return fixed[n].map((p) => p.slice());
    const a = [];
    for (let i = 0; i <= n; i++) a.push([1 + (8 * i) / n, i === 0 ? -1.8 : i === n ? 1.8 : (i % 2 ? 2.4 : -2.3) * (0.75 + 0.25 * ((i * 7) % 3) / 2)]);
    return a;
  }
  function bernTeX(n) {
    const parts = [];
    for (let i = 0; i <= n; i++) {
      const cf = binom(n, i);
      let s = cf === 1 ? '' : String(cf);
      if (n - i > 0) s += n - i === 1 ? '(1-t)' : '(1-t)^{' + (n - i) + '}';
      if (i > 0) s += i === 1 ? 't' : 't^{' + i + '}';
      parts.push(s + '\\boldsymbol{P}_{' + i + '}');
    }
    return '\\boldsymbol{P}(t) = ' + parts.join(' + ');
  }

  function initBezier() {
    const root = $id('w-bezier');
    const cvs = root.querySelectorAll('canvas');
    const plot = new Plot(cvs[0], { xmin: 0, xmax: 10, equal: true, yc: 0, ratio: [0.95, 0.6] });
    const bas = new Plot(cvs[1], { xmin: -0.05, xmax: 1.05, ymin: -0.1, ymax: 1.1, ratio: [0.6, 0.3] });
    const st = { n: 3, pts: [], t: 0.4, show: true };
    const ctl = root.querySelector('.controls');
    const player = Player(root, ctl, {
      dur: 3.4, hold: 0.8, autoplay: !L.reduceMotion,
      onT(t) { st.t = t; update(); },
    });
    const row = el('div', 'btn-row');
    row.style.marginTop = '8px';
    const lab = el('label', 'check');
    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.checked = true;
    lab.append(chk, document.createTextNode('補助線'));
    const br = el('button', 'btn small', '形をリセット');
    br.type = 'button';
    row.append(lab, br); ctl.append(row);
    const wbox = R(root, 'weights'), degs = R(root, 'degs');
    let degChips = [];

    function setDegree(n) {
      st.n = n;
      st.pts = defPts(n);
      plot.handles.length = 0;
      st.pts.forEach(function (pt, i) {
        plot.addHandle({
          get x() { return pt[0]; }, get y() { return pt[1]; }, get color() { return colorOf(plot.c, i); },
          label: 'P' + SUB[i], r: 9,
          drag(x, y) { pt[0] = clamp(x, 0.3, 9.7); pt[1] = clamp(y, plot.ymin + 0.3, plot.ymax - 0.3); update(); },
        });
      });
      wbox.innerHTML = '';
      for (let i = 0; i <= n; i++) {
        const w = el('div', 'w');
        const cv = i < 6 ? 'var(' + SERIES_VARS[i] + ')' : EXTRA[i - 6];
        w.innerHTML = '<span class="lab" style="color:' + cv + '">B' + SUB[n] + ',' + SUB[i] + '</span><span class="bar"><i style="background:' + cv + '"></i></span><span class="v"></span>';
        wbox.append(w);
      }
      degChips.forEach((b, k) => b.setAttribute('aria-pressed', String(k + 1 === n)));
      tex(root, 'tex', bernTeX(n));
      update();
    }
    degChips = [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) {
      const b = el('button', 'chip', n + '次');
      b.type = 'button';
      b.addEventListener('click', () => setDegree(n));
      degs.append(b);
      return b;
    });

    function update() {
      const t = st.t;
      const lv = casteljau(st.pts, t), P = lv[lv.length - 1][0];
      tex(root, 'pt', '\\boldsymbol{P}(' + num(t) + ') = (' + num(P[0]) + ',\\ ' + num(P[1]) + ')');
      const ws = wbox.children;
      for (let i = 0; i <= st.n; i++) {
        const b = bern(st.n, i, t);
        ws[i].querySelector('i').style.width = (b * 100).toFixed(1) + '%';
        ws[i].querySelector('.v').textContent = b.toFixed(3);
      }
      plot.invalidate(); bas.invalidate();
    }

    plot.draw = function (g) {
      const c = g.c, t = st.t, n = st.n;
      g.grid({ step: 1, axes: false, labels: false });
      g.poly(st.pts, { color: c.muted, dash: [6, 6], width: 1.8 });
      const curve = curvePts(st.pts, 140);
      g.poly(curve, { color: c.primary, width: 4, alpha: 0.28 });
      g.poly(curve.slice(0, Math.round(t * 140) + 1), { color: c.primary, width: 5 });
      const lv = casteljau(st.pts, t);
      if (st.show) {
        for (let k = 1; k < lv.length - 1; k++) {
          const col = colorOf(c, (k + 1) % 9);
          g.poly(lv[k], { color: col, width: 2.5 });
          lv[k].forEach((q) => g.dot(q[0], q[1], { r: 5, color: col }));
        }
      }
      const P = lv[lv.length - 1][0];
      g.dot(P[0], P[1], { r: 9, color: c.accent });
      if (n === 1) g.text('P(t)', P[0], P[1], { dx: 12, dy: -16, bold: true, color: c.accent });
    };
    bas.draw = function (g) {
      const c = g.c, t = st.t, n = st.n;
      g.grid({ stepX: 0.25, stepY: 0.25, xlabel: 't' });
      for (let i = 0; i <= n; i++) g.fn((x) => bern(n, i, x), { x0: 0, x1: 1, color: colorOf(c, i), width: 3 });
      g.line(t, 0, t, 1.05, { color: c.accent, dash: [4, 4], width: 1.8 });
      for (let i = 0; i <= n; i++) g.dot(t, bern(n, i, t), { r: 5, color: colorOf(c, i) });
    };
    chk.addEventListener('change', () => { st.show = chk.checked; plot.invalidate(); });
    br.addEventListener('click', () => setDegree(st.n));
    setDegree(3);
    player.start();
  }

  /* ==========================================================
     4.3 cubic-bezier エディタ
     ========================================================== */
  const bz = (a, b, t) => { const u = 1 - t; return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t; };
  const dbz = (a, b, t) => { const u = 1 - t; return 3 * u * u * a + 6 * u * t * (b - a) + 3 * t * t * (1 - b); };
  function solveT(X, x1, x2) {
    let t = X;
    for (let i = 0; i < 8; i++) {
      const e = bz(x1, x2, t) - X, d = dbz(x1, x2, t);
      if (Math.abs(e) < 1e-7) return clamp(t, 0, 1);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = X;
    for (let i = 0; i < 40; i++) { if (bz(x1, x2, t) > X) hi = t; else lo = t; t = (lo + hi) / 2; }
    return t;
  }
  const CSS_PRESETS = [
    ['ease', 0.25, 0.1, 0.25, 1], ['ease-in', 0.42, 0, 1, 1], ['ease-out', 0, 0, 0.58, 1], ['ease-in-out', 0.42, 0, 0.58, 1],
    ['linear', 0, 0, 1, 1], ['ゆっくり→急停止', 0.9, 0, 1, 0.5], ['オーバーシュート', 0.34, 1.56, 0.64, 1], ['溜めてから', 0.68, -0.55, 0.27, 1.55],
  ];
  function initCssBezier() {
    const root = $id('w-cssbezier');
    const demo = EasingDemo(R(root, 'demo'), { ymin: -0.7, ymax: 1.7, dur: 1.6 });
    const st = { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };
    demo.f = (X) => bz(st.y1, st.y2, solveT(X, st.x1, st.x2));
    const cssStr = () => 'cubic-bezier(' + [st.x1, st.y1, st.x2, st.y2].map((v) => num(v, 2)).join(', ') + ')';

    const track = root.querySelector('.css-track'), ball = root.querySelector('.css-ball');
    const travel = () => track.clientWidth - 40;
    demo.onStart = function (dur) {
      ball.style.transition = 'none';
      ball.style.transform = 'translateX(0)';
      void ball.offsetWidth;
      ball.style.transition = 'transform ' + dur + 's ' + cssStr();
      ball.style.transform = 'translateX(' + travel() + 'px)';
    };
    demo.onTick = function (t, playing) {
      if (playing) return;
      ball.style.transition = 'none';
      ball.style.transform = 'translateX(' + demo.f(t) * travel() + 'px)';
    };
    const chips = R(root, 'chips');
    const pb = CSS_PRESETS.map(function (p) {
      const b = el('button', 'chip', p[0]);
      b.type = 'button';
      b.addEventListener('click', function () { st.x1 = p[1]; st.y1 = p[2]; st.x2 = p[3]; st.y2 = p[4]; update(); });
      chips.append(b);
      return b;
    });
    function update() {
      R(root, 'code').textContent = cssStr();
      pb.forEach((b, i) => { const p = CSS_PRESETS[i]; b.setAttribute('aria-pressed', String(p[1] === st.x1 && p[2] === st.y1 && p[3] === st.x2 && p[4] === st.y2)); });
      demo.refresh();
      if (demo.st.playing) demo.restart(); else demo.onTick(demo.st.t, false);
    }
    const mk = (kx, ky, color, label) => ({
      get x() { return st[kx]; }, get y() { return st[ky]; }, get color() { return demo.g.c[color]; }, label, r: 9,
      drag(x, y) { st[kx] = clamp(snap(x, 0.01), 0, 1); st[ky] = clamp(snap(y, 0.01), -0.6, 1.6); update(); },
    });
    demo.g.addHandle(mk('x1', 'y1', 'amber', 'P₁'));
    demo.g.addHandle(mk('x2', 'y2', 'teal', 'P₂'));
    demo.hooks.curve = function (g) {
      const c = g.c, pts = [];
      for (let i = 0; i <= 100; i++) { const t = i / 100; pts.push([bz(st.x1, st.x2, t), bz(st.y1, st.y2, t)]); }
      g.poly([[0, 0], [st.x1, st.y1]], { color: c.amber, width: 2, dash: [5, 4] });
      g.poly([[1, 1], [st.x2, st.y2]], { color: c.teal, width: 2, dash: [5, 4] });
      g.poly(pts, { color: c.primary, width: 4 });
      g.dot(0, 0, { r: 5, color: c.text }); g.dot(1, 1, { r: 5, color: c.text });
      g.text('P₀', 0, 0, { dx: 14, dy: 16, bold: true }); g.text('P₃', 1, 1, { dx: -14, dy: -14, bold: true });
    };
    root.querySelector('[data-a="copy"]').addEventListener('click', function (e) {
      const b = e.currentTarget;
      const done = () => { b.textContent = 'コピーしました'; setTimeout(() => (b.textContent = 'コピー'), 1400); };
      try { navigator.clipboard.writeText('transition-timing-function: ' + cssStr() + ';').then(done); } catch (err) { /* noop */ }
    });
    update();
    demo.start();
  }

  /* ==========================================================
     5.1 ラグランジュ補間(点の数 2〜4 を切り替え)
     ========================================================== */
  function lagTerm(pts, i, x) {
    let l = pts[i][1];
    for (let j = 0; j < pts.length; j++) if (j !== i) l *= (x - pts[j][0]) / (pts[i][0] - pts[j][0]);
    return l;
  }
  function lagrange(pts, x) { let s = 0; for (let i = 0; i < pts.length; i++) s += lagTerm(pts, i, x); return s; }
  // 基底の項 y_iL_i(x) の色（P(x) の青・変数 x の赤とは別の色）
  const LAG_COL = ['teal', 'amber', 'slate', 'brown'];
  const lagCss = (c, i) => [c.teal, c.amber, c.pink, c.brown][i];
  const LAG_DEFAULT = {
    2: [[-3, 1.5], [3, -1.5]],
    3: [[-3.5, 1], [0.5, -2], [3.5, 1.5]],
    4: [[-3.5, 1], [-1, -1.8], [1.2, 2], [3.5, 0]],
  };
  const DEGNAME = { 2: '1次関数', 3: '2次関数', 4: '3次関数' };
  // n 点の L_i(x) を具体的に書き下す(総積・総和の記号は使わない)。変数 x だけ赤字にする
  function lagLi(n, i) {
    const X = C('red', 'x'), num = [], den = [];
    for (let j = 1; j <= n; j++) if (j !== i) { num.push('(' + X + '-x_' + j + ')'); den.push('(x_' + i + '-x_' + j + ')'); }
    return 'L_' + i + '(' + X + ')=\\dfrac{' + num.join('') + '}{' + den.join('') + '}';
  }

  function initLagrange() {
    const root = $id('w-lag');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 5, ymin: -4.5, ymax: 4.5, ratio: [0.95, 0.58] });
    const st = { n: 3, pts: [], basis: false };
    const chk = R(root, 'basis'), formulas = R(root, 'formulas'), nsBox = R(root, 'ns');
    const nsChips = [2, 3, 4].map(function (n) {
      const b = el('button', 'chip', n + '点');
      b.type = 'button';
      b.addEventListener('click', () => setN(n));
      nsBox.append(b);
      return b;
    });
    const addRow = function (k, texs) {
      const row = el('div', 'row');
      row.innerHTML = '<span class="k">' + k + '</span><span class="tex"></span>';
      formulas.append(row);
      setTex(row.querySelector('.tex'), texs);
    };

    function setN(n) {
      st.n = n;
      st.pts = LAG_DEFAULT[n].map((p) => p.slice());
      nsChips.forEach((b, k) => b.setAttribute('aria-pressed', String(k + 2 === n)));
      formulas.innerHTML = '';
      // 1) 問題文  2) 補間多項式  3) 具体的な L_i(x)
      const pts = [];
      for (let i = 1; i <= n; i++) pts.push('(x_' + i + ',y_' + i + ')');
      addRow('問題', '\\text{点 }' + pts.join('\\text{、点 }') + '\\text{ を通る' + DEGNAME[n] + ' }y=P(' + C('red', 'x') + ')\\text{ を求める}');
      let ptex = 'P(' + C('red', 'x') + ')=';
      for (let i = 1; i <= n; i++) ptex += (i > 1 ? ' + ' : '') + C(LAG_COL[i - 1], 'y_' + i + 'L_' + i + '(') + C('red', 'x') + C(LAG_COL[i - 1], ')');
      addRow('補間多項式', ptex);
      for (let i = 1; i <= n; i++) {
        const col = LAG_COL[i - 1];
        addRow(i === 1 ? 'ただし' : '', C(col, 'L_' + i + '(') + C('red', 'x') + C(col, ')') + '=' + lagLi(n, i).split('=').slice(1).join('='));
      }
      plot.handles.length = 0;
      st.pts.forEach(function (pt, i) {
        plot.addHandle({
          get x() { return pt[0]; }, get y() { return pt[1]; }, get color() { return lagCss(plot.c, i); }, r: 9,
          label: () => 'P' + SUB[i + 1], ldx: 14, ldy: -14,
          drag(x, y) {
            const nx = clamp(snap(x, 0.05), -4.7, 4.7);
            if (st.pts.every((o) => o === pt || Math.abs(o[0] - nx) >= 0.4)) pt[0] = nx;
            pt[1] = clamp(snap(y, 0.05), -4.2, 4.2);
            update();
          },
        });
      });
      update();
    }
    function update() {
      const n = st.n;
      R(root, 'note').textContent = (n === 2 ? '2点 → 直線（1次）。1.2節の補間と同じ式になる。' :
        n === 3 ? '3点 → 放物線（2次）。二次関数がただ1つ決まる。' : '4点 → 3次関数。4点をぴったり通る。') +
        '　点 P₁, P₂, … の座標が (x₁,y₁), (x₂,y₂), … 。';
      plot.invalidate();
    }
    chk.addEventListener('change', () => { st.basis = chk.checked; plot.invalidate(); });
    root.querySelector('[data-a="reset"]').addEventListener('click', () => setN(st.n));

    plot.draw = function (g) {
      const c = g.c;
      g.grid({ xlabel: 'x', ylabel: 'y' });
      // 各点から x 軸へ点線、x_i を大きく表示
      st.pts.forEach(function (pt, i) {
        const col = lagCss(c, i);
        g.line(pt[0], pt[1], pt[0], 0, { color: col, dash: [5, 5], width: 2 });
        g.dot(pt[0], 0, { r: 4.5, color: col });
        g.text('x' + SUB[i + 1], pt[0], 0, { dy: pt[1] >= 0 ? 22 : -22, color: col, bold: true, align: 'center', size: 17 });
      });
      // 薄い色の曲線 y = y_i L_i(x)（P(x) とは別の色）
      if (st.basis) {
        st.pts.forEach((pt, i) => g.fn((x) => lagTerm(st.pts, i, x), { color: lagCss(c, i), width: 2.2, alpha: 0.5 }));
        st.pts.forEach((pt, i) => g.textPx('薄い曲線：y = y' + SUB[i + 1] + 'L' + SUB[i + 1] + '(x)', 10, 16 + 17 * i, { size: 12.5, bold: true, color: lagCss(c, i) }));
      }
      g.fn((x) => lagrange(st.pts, x), { color: c.primary, width: 4.5 });
      g.textPx('太い青線：y = P(x)', 10, g.h - 12, { size: 12.5, bold: true, color: c.primary });
    };
    setN(3);
  }

  /* ==========================================================
     5.2 データへのあてはめ(最小二乗・過学習)
     ========================================================== */
  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const TRUTH = (x) => 1.8 * Math.sin(0.7 * x) + 0.2 * x;
  function polyfit(xs, ys, m) {
    const S = 4.5, n = m + 1;
    const A = [], b = [];
    for (let j = 0; j < n; j++) { A.push(new Array(n).fill(0)); b.push(0); }
    xs.forEach(function (x, i) {
      const u = x / S, pw = [1];
      for (let k = 1; k < 2 * n; k++) pw.push(pw[k - 1] * u);
      for (let j = 0; j < n; j++) { b[j] += ys[i] * pw[j]; for (let k = 0; k < n; k++) A[j][k] += pw[j + k]; }
    });
    for (let i = 0; i < n; i++) {
      let mx = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[mx][i])) mx = r;
      [A[i], A[mx]] = [A[mx], A[i]]; [b[i], b[mx]] = [b[mx], b[i]];
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / A[i][i];
        for (let k = i; k < n; k++) A[r][k] -= f * A[i][k];
        b[r] -= f * b[i];
      }
    }
    const cf = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let k = i + 1; k < n; k++) s -= A[i][k] * cf[k];
      cf[i] = s / A[i][i];
    }
    return (x) => { const u = x / S; let s = 0; for (let k = n - 1; k >= 0; k--) s = s * u + cf[k]; return s; };
  }

  function initFit() {
    const root = $id('w-fit');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5.5, xmax: 5.5, ymin: -4, ymax: 4, ratio: [0.85, 0.5] });
    const N = 10;
    const xs = []; for (let i = 0; i < N; i++) xs.push(-4.5 + i);
    const st = { m: 3, seed: 7, ys: [], fits: [], etrain: [], etrue: [], best: 0 };
    const ctl = root.querySelector('.controls');
    const sm = slider(ctl, { tex: 'm', min: 0, max: 9, step: 1, value: st.m, color: 'primary', fmt: (v) => v + '次', aria: '多項式の次数 m' });
    const row = el('div', 'btn-row');
    row.style.marginTop = '8px';
    const bNew = el('button', 'btn primary', '🎲 データを取り直す');
    const bBest = el('button', 'btn', '本当の傾向に最も近い次数にする');
    bNew.type = 'button'; bBest.type = 'button';
    row.append(bNew, bBest); ctl.append(row);

    function regen() {
      const rnd = mulberry32(st.seed);
      st.ys = xs.map((x) => TRUTH(x) + (rnd() - 0.5) * 1.6);
      st.fits = []; st.etrain = []; st.etrue = [];
      for (let m = 0; m < N; m++) {
        const f = polyfit(xs, st.ys, m);
        st.fits.push(f);
        st.etrain.push(xs.reduce((s, x, i) => s + Math.pow(st.ys[i] - f(x), 2), 0));
        let e = 0; for (let k = 0; k <= 90; k++) { const x = -4.5 + k * 0.1; e += Math.pow(f(x) - TRUTH(x), 2) * 0.1; }
        st.etrue.push(e);
      }
      st.best = 0; st.etrue.forEach((v, i) => { if (v < st.etrue[st.best]) st.best = i; });
      update();
    }
    function update() {
      const m = st.m, et = st.etrain[m], eu = st.etrue[m];
      R(root, 'etrain').textContent = (et < 1e-6 ? '0' : et.toFixed(2)) + '　（赤い縦線の長さを2乗して足した値）';
      R(root, 'etrue').textContent = eu.toFixed(2) + '　（青線と点線の差を2乗して足した値）';
      R(root, 'note').textContent = m === 9 ? '10点すべてを通るラグランジュ補間。赤い縦線は消えたが、測定誤差までまるごと覚えて大きく暴れている（過学習）。' :
        m === st.best ? '青緑の帯が最も細い。本当の傾向に最も近い次数。' : m < st.best ? '次数が低すぎて、傾向を表しきれていない。' : '次数が高すぎ。測定誤差まで追いかけて、帯が広がっている（過学習）。';
      plot.invalidate();
    }
    sm.on((v) => { st.m = v; update(); });
    bNew.addEventListener('click', function () { st.seed = (st.seed * 48271 + 12345) % 2147483647; regen(); });
    bBest.addEventListener('click', function () { st.m = st.best; sm.set(st.best); update(); });

    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, f = st.fits[st.m];
      g.grid({ xlabel: 'x', ylabel: 'y' });
      // 青緑の帯：青い線と本当の傾向(点線)の間
      const K = 120, lim = 8;
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k <= K; k++) { const x = -4.5 + (9 * k) / K; ctx.lineTo(g.X(x), g.Y(clamp(f(x), -lim, lim))); }
      for (let k = K; k >= 0; k--) { const x = -4.5 + (9 * k) / K; ctx.lineTo(g.X(x), g.Y(TRUTH(x))); }
      ctx.closePath(); ctx.fillStyle = c.teal + '3a'; ctx.fill();
      ctx.restore();
      g.fn(TRUTH, { x0: -4.5, x1: 4.5, color: c.muted, dash: [6, 5], width: 3 });
      g.fn(f, { x0: -5.5, x1: 5.5, color: c.primary, width: 4.5 });
      // 赤い縦線：訓練誤差
      xs.forEach((x, i) => g.line(x, st.ys[i], x, f(x), { color: c.accent, width: 3.5 }));
      xs.forEach((x, i) => g.dot(x, st.ys[i], { r: 6, color: c.text }));
      g.textPx('次数 m = ' + st.m + ' の多項式（青い線）', 10, g.h - 12, { size: 12, bold: true, color: c.primary });
    };
    regen();
  }

  function boot() {
    [initLinear, initLerp, initShift, initQuad, initRace, initDesign, initDC, initBezier, initCssBezier, initLagrange, initFit].forEach(function (f) {
      try { f(); } catch (e) { console.error(f.name, e); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
