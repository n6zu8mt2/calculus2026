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
    const stT = slider(ctl, { tex: 't', min: 0, max: 1, step: 0.005, value: 0, color: 'accent', fmt: o.tFmt || ((v) => v.toFixed(2)) });
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

    const hB = plot.addHandle({ get x() { return 0; }, get y() { return st.b; }, get color() { return plot.c.accent; }, r: 5, halo: 3,
      drag(x, y) { st.b = clamp(snap(y, 0.1), -5, 5); sb.set(st.b); update(); } });
    const hA = plot.addHandle({ get x() { return 1; }, get y() { return st.a + st.b; }, get color() { return plot.c.teal; }, r: 5, halo: 3,
      drag(x, y) { st.a = clamp(snap(y - st.b, 0.1), -4, 4); sa.set(st.a); update(); } });

    // 式・凡例・図の連動ハイライト: 式の緑(a)や赤(b)、凡例に触れる／つまみを掴むと、対応する部分を強調
    const hlOf = (el) => !el ? null : el.closest('[data-hl="a"], .tx-teal') ? 'a' : el.closest('[data-hl="b"], .tx-red') ? 'b' : null;
    root.addEventListener('pointerover', function (e) { const h = hlOf(e.target); if (h !== st.hl) { st.hl = h; plot.invalidate(); } });
    root.addEventListener('pointerleave', function () { st.hl = null; plot.invalidate(); });
    function syncHl(h) {
      root.querySelectorAll('[data-hl]').forEach((e) => e.classList.toggle('on', e.dataset.hl === h));
      root.querySelectorAll('.tx-teal').forEach((e) => e.classList.toggle('glow', h === 'a'));
      root.querySelectorAll('.tx-red').forEach((e) => e.classList.toggle('glow', h === 'b'));
    }

    plot.draw = function (g) {
      const c = g.c, { a, b } = st;
      const hl = plot.active === hA ? 'a' : plot.active === hB ? 'b' : st.hl;
      const wA = hl === 'a' ? 7 : 4, wB = hl === 'b' ? 7 : 4;
      syncHl(hl);
      g.grid({ xlabel: 'x', ylabel: 'y' });
      if (st.quiz) g.fn((x) => st.quiz.a * x + st.quiz.b, { color: c.amber, dash: [7, 6], width: 3.5 });
      g.fn((x) => a * x + b, { color: c.primary, width: 4 });
      // y切片 b：原点から (0,b) までの赤い矢印
      if (Math.abs(b) > 0.15) g.arrow(0, 0, 0, b, { color: c.accent, width: wB });
      g.text('y切片 b = ' + L.minus(num(b)), 0, b, { dx: -16, dy: b >= 0 ? -14 : 14, color: c.accent, bold: true, align: 'right', size: 13 });
      // x方向に1進む矢印
      g.arrow(0, b, 1, b, { color: c.text, width: 3 });
      g.text('x方向に 1', 0.5, b, { dy: a >= 0 ? 20 : -18, color: c.text, bold: true, align: 'center', size: 13 });
      // y方向に a だけ変化する矢印
      if (Math.abs(a) > 0.1) g.arrow(1, b, 1, a + b, { color: c.teal, width: wA });
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
    // 帯の幅に応じて表示を短くする（「AP：t」だと比のように読めるので「割合 ＝ 値（t）」と書く）
    function barLabels() {
      const t = st.t, W = ba.parentElement.clientWidth || 600;
      const lab = (nm, v, sym, w) => w > 190 ? nm + ' の割合 ＝ ' + v.toFixed(2) + '（' + sym + '）' : w > 110 ? nm + ' ＝ ' + v.toFixed(2) : w > 40 ? v.toFixed(2) : '';
      ba.textContent = lab('AP', t, 't', t * W);
      bb.textContent = lab('PB', 1 - t, '1−t', (1 - t) * W);
    }
    new ResizeObserver(barLabels).observe(ba.parentElement);
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
      const put = (k, v) => { const e = R(root, k); if (e) e.textContent = v; };
      put('ra-p', 't = ' + t.toFixed(2)); put('ra-l', (t * len).toFixed(2));
      put('rb-p', '1 − t = ' + (1 - t).toFixed(2)); put('rb-l', ((1 - t) * len).toFixed(2));
      put('rs-l', len.toFixed(2));
      if (Math.abs(dx) < 1e-6) tex(root, 'eq', 'x = ' + num(st.A[0]) + '\\ (\\text{関数のグラフではない})');
      else {
        const a = Math.round((dy / dx) * 100) / 100, b = Math.round((st.A[1] - (dy / dx) * st.A[0]) * 100) / 100;
        tex(root, 'eq', linTeX(a, b));
      }
      ba.style.width = t * 100 + '%'; bb.style.width = (1 - t) * 100 + '%';
      barLabels();
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
     3 放物線：ボールを投げる
     ========================================================== */
  function initBall() {
    const root = $id('w-ball');
    let G = 9.8;
    const plot = new Plot(root.querySelector('canvas'), { xmin: -2, xmax: 30, equal: true, yc: 5, ratio: [0.6, 0.56] });
    const D = { h0: 1.5, v: 12, th: 45, g: 9.8 };
    const st = { h0: D.h0, v: D.v, th: D.th, g: D.g, arrows: true, ghost: false, step: 2 };
    let K0 = 0.5; // 初速の矢印: 1 m/s あたりの長さ(m)
    let T = 0, player;
    // アニメの全体時間（地球の軌跡を重ねるときは、地球側が着地するまで）
    const Ttot = () => (st.ghost && Math.abs(st.g - 9.8) > 0.005 ? Math.max(T, calc(9.8).T) : T);
    const niceStep = (x) => { const e = Math.pow(10, Math.floor(Math.log10(x))), m = x / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; };
    // 重力や初速が変わっても軌道が画面に収まるよう、表示範囲を合わせる
    function fit() {
      const q0 = phys(), p = plot;
      if (!p.w) return;
      const q = { R: q0.R, ymax: q0.ymax };
      if (st.ghost) { const e = calc(G_EARTH); q.R = Math.max(q.R, e.R); q.ymax = Math.max(q.ymax, e.ymax); }
      const hw = p.h / p.w, gm = 0.09;
      let span = Math.max((q.R * 1.12 + 1) * 17 / 16, ((q.ymax * 1.15 + 2)) / Math.max(0.2, hw - gm), 34 * 0.3);
      st.step = niceStep(span / 15);
      span = Math.ceil(span / st.step) * st.step;
      p.o.xmin = -span / 17; p.o.xmax = span * 16 / 17;
      p.o.yc = -gm * span + (span * hw) / 2;
      p._layout();
      K0 = 0.5 * span / 32;
    }
    plot.onResize = fit;
    const ctl = root.querySelector('.controls');

    function phys() {
      G = st.g;
      const r = (st.th * Math.PI) / 180;
      const vx = st.v * Math.cos(r), vy = st.v * Math.sin(r);
      T = (vy + Math.sqrt(vy * vy + 2 * G * st.h0)) / G;
      return { vx, vy, T, R: vx * T, tp: Math.max(0, vy / G), ymax: st.h0 + (vy > 0 ? (vy * vy) / (2 * G) : 0) };
    }
    phys();
    player = Player(root, ctl, {
      dur: Math.min(6, Math.max(T, 0.8)), hold: 0.9, tFmt: (v) => (v * Ttot()).toFixed(2) + '秒',
      onT() { plot.invalidate(); },
    });
    const sh = slider(ctl, { tex: 'h_0', min: 0, max: 4, step: 0.1, value: st.h0, color: 'primary', fmt: (v) => v.toFixed(1) + 'm', aria: '投げる高さ h0' });
    const sv = slider(ctl, { tex: 'v_0', min: 2, max: 14, step: 0.1, value: st.v, color: 'primary', fmt: (v) => v.toFixed(1), aria: '初速 v0 (m/s)' });
    const sth = slider(ctl, { tex: '\\theta', min: 0, max: 90, step: 1, value: st.th, color: 'primary', fmt: (v) => v + '°', aria: '投げる角度' });
    const sg = slider(ctl, { tex: 'g', min: 1, max: 30, step: 0.1, value: st.g, color: 'primary', fmt: (v) => v.toFixed(1), aria: '重力加速度 g (m/s²)' });
    const G_EARTH = 9.8;
    const fa = (v) => String(+v.toPrecision(4));
    // 極端に小さい・大きい値でも表が崩れない表示
    const fv = (v, d) => (v !== 0 && (Math.abs(v) < 0.01 || Math.abs(v) >= 1e6) ? v.toExponential(2) : v.toFixed(d));
    const BODIES = [['月', 1.62], ['水星', 3.7], ['火星', 3.71], ['金星', 8.87], ['地球', 9.8], ['土星', 10.4], ['木星', 24.8]];
    const PLANETS = [['地球', 9.8], ['月', 1.62], ['火星', 3.71], ['木星', 24.8]];
    const grow = el('div', 'btn-row');
    grow.style.marginTop = '8px';
    grow.append(el('span', '', '<span style="font-size:13px;font-weight:700;color:var(--muted)">重力 g（m/s²）</span>'));
    const pchips = el('div', 'chips');
    const pbtn = PLANETS.map(function (pl) {
      const b = el('button', 'chip', pl[0] + ' ' + pl[1]);
      b.type = 'button';
      b.addEventListener('click', function () { st.g = pl[1]; sg.set(st.g); update(); });
      pchips.append(b); return b;
    });
    grow.append(pchips); ctl.append(grow);
    // 地球の a 倍（小数可）で指定
    const arow = el('div', 'btn-row');
    arow.style.marginTop = '8px';
    arow.innerHTML = '<label class="check" style="gap:6px">重力を地球の <input type="number" class="numin" min="0.1" step="0.1" inputmode="decimal" aria-label="地球の何倍か a"> 倍</label><span class="a-note"></span>';
    ctl.append(arow);
    const ain = arow.querySelector('input'), anote = arow.querySelector('.a-note');
    ain.addEventListener('input', function () {
      const v = parseFloat(ain.value);
      if (isFinite(v) && v > 0) { anote.textContent = ''; st.g = v * G_EARTH; sg.set(clamp(st.g, 1, 30)); update(); }
      else anote.textContent = '0 より大きい数を入力してください（小数も可）';
    });
    ain.addEventListener('blur', function () { ain.value = fa(st.g / G_EARTH); anote.textContent = ''; });
    // 天体別の比較表
    const cmp = R(root, 'cmp');
    const calc = function (gg) {
      const r = (st.th * Math.PI) / 180, vx = st.v * Math.cos(r), vy = st.v * Math.sin(r);
      const Tt = (vy + Math.sqrt(vy * vy + 2 * gg * st.h0)) / gg;
      return { R: vx * Tt, ymax: st.h0 + (vy > 0 ? (vy * vy) / (2 * gg) : 0), T: Tt };
    };
    function renderCmp() {
      const rows = BODIES.map((b) => [b[0], b[1], false]);
      let cur = rows.findIndex((r) => Math.abs(r[1] - st.g) < 0.005);
      if (cur < 0) { rows.push(['いまの設定', st.g, true]); cur = rows.length - 1; }
      cmp.innerHTML = '';
      rows.forEach(function (r, i) {
        const c = calc(r[1]), tr = document.createElement('tr');
        if (i === cur) tr.className = 'on';
        tr.innerHTML = '<td>' + r[0] + '</td><td>' + fv(r[1], 2) + ' m/s²</td><td>× ' + fv(r[1] / G_EARTH, 2) + '</td><td>' + fv(c.R, 1) + ' m</td><td>' + fv(c.ymax, 1) + ' m</td><td>' + fv(c.T, 2) + ' 秒</td>';
        tr.addEventListener('click', function () { st.g = r[1]; sg.set(clamp(st.g, 1, 30)); update(); });
        cmp.append(tr);
      });
    }

    function update() {
      const q = phys();
      player.st.dur = Math.min(6, Math.max(Ttot(), 0.8));
      pbtn.forEach((b, i) => b.setAttribute('aria-pressed', String(Math.abs(PLANETS[i][1] - st.g) < 0.005)));
      if (document.activeElement !== ain) ain.value = fa(st.g / G_EARTH);
      renderCmp();
      fit();
      const vx = q.vx, vy = q.vy, th = st.th;
      tex(root, 'xy', 'x=' + C('teal', num(vx, 2)) + '\\,t,\\quad y=' + num(st.h0, 1) + ' + ' + C('red', num(vy, 2)) + '\\,t-' + num(G / 2, 2) + 't^2');
      if (th >= 90) tex(root, 'eq', '\\text{真上に投げる（}x\\text{ は動かない）}');
      else {
        const a = -G / (2 * vx * vx), b = vy / vx;
        tex(root, 'eq', 'y=' + num(a, 3) + 'x^2' + signed(b, 2) + 'x' + signed(st.h0, 1));
      }
      const p = vx * vy / G, qq = st.h0 + (vy > 0 ? (vy * vy) / (2 * G) : 0);
      tex(root, 'apex', '(' + C('teal', 'p') + ',\\ ' + C('red', 'q') + ')=(' + C('teal', num(vy > 0 ? p : 0, 2)) + ',\\ ' + C('red', num(qq, 2)) + ')');
      tex(root, 'range', num(q.R, 2) + '\\ \\mathrm{m}');
      tex(root, 'time', num(q.T, 2) + '\\ \\text{秒}');
      plot.invalidate();
      if (player.st.playing) player.restart();
    }
    sh.on((v) => { st.h0 = v; update(); });
    sv.on((v) => { st.v = v; update(); });
    sth.on((v) => { st.th = v; update(); });
    sg.on((v) => { st.g = v; update(); });

    // 投げる高さ(黒) と 初速の矢印の先(金)
    plot.addHandle({ get x() { return 0; }, get y() { return st.h0; }, get color() { return plot.c.text; }, r: 8,
      label: '投げる位置', ldx: 14, ldy: 22,
      drag(x, y) { st.h0 = clamp(snap(y, 0.1), 0, 4); sh.set(st.h0); update(); } });
    plot.addHandle({ get x() { const q = phys(); return q.vx * K0; }, get y() { const q = phys(); return st.h0 + q.vy * K0; }, get color() { return plot.c.amber; }, r: 9,
      label: () => 'v₀ = ' + st.v.toFixed(1) + ' m/s, θ = ' + st.th + '°', ldx: 14, ldy: -14,
      drag(x, y) {
        const dx = Math.max(0, x) / K0, dy = (y - st.h0) / K0;
        st.v = clamp(snap(Math.hypot(dx, dy), 0.1), 2, 14);
        st.th = clamp(Math.round((Math.atan2(Math.max(dy, 0), dx) * 180) / Math.PI), 0, 90);
        sv.set(st.v); sth.set(st.th); update();
      } });

    R(root, 'arrows').addEventListener('change', (e) => { st.arrows = e.target.checked; plot.invalidate(); });
    R(root, 'ghost').addEventListener('change', (e) => { st.ghost = e.target.checked; player.st.dur = Math.min(6, Math.max(Ttot(), 0.8)); fit(); plot.invalidate(); if (player.st.playing) player.restart(); });
    root.querySelector('[data-a="reset"]').addEventListener('click', function () {
      st.h0 = D.h0; st.v = D.v; st.th = D.th; st.g = D.g; sh.set(st.h0); sv.set(st.v); sth.set(st.th); sg.set(st.g); update();
    });

    plot.draw = function (g) {
      const c = g.c, q = phys(), ctx = g.ctx;
      const ttAll = player.st.t * Ttot(), tt = Math.min(q.T, ttAll), sc = (g.xmax - g.xmin) / 32;
      const pos = (t) => [q.vx * t, st.h0 + q.vy * t - 0.5 * G * t * t];
      g.grid({ step: st.step, xlabel: 'x (m)', ylabel: 'y (m)' });
      // 地面
      ctx.save(); ctx.fillStyle = c.muted; ctx.globalAlpha = 0.22;
      ctx.fillRect(0, g.Y(0), g.w, g.h - g.Y(0)); ctx.restore();
      g.line(g.xmin, 0, g.xmax, 0, { color: c.muted, width: 2.5 });
      // 地球(g = 9.8)での同じ投げ方の軌跡を薄く重ねる
      if (st.ghost && Math.abs(st.g - G_EARTH) > 0.005) {
        const e = calc(G_EARTH), posE = (t) => [q.vx * t, st.h0 + q.vy * t - 0.5 * G_EARTH * t * t];
        const pe = []; for (let i = 0; i <= 80; i++) pe.push(posE((e.T * i) / 80));
        g.poly(pe, { color: c.amber, width: 3.5, dash: [7, 6], alpha: 0.55 });
        const be = posE(Math.min(ttAll, e.T));
        g.dot(be[0], be[1], { r: 9, ring: true, color: c.amber, lw: 3 });
        if (q.vy > 0) { const xe = q.vx * (q.vy / G_EARTH); g.text('地球 (g = 9.8) の軌跡', xe, e.ymax, { dy: -14, align: 'center', color: c.amber, bold: true, size: 12 }); }
        else g.text('地球 (g = 9.8) の軌跡', e.R, 0, { dy: -14, align: 'right', color: c.amber, bold: true, size: 12 });
      }
      // 軌道(全体は薄く、通過済みは濃く)
      const all = [], done = [];
      for (let i = 0; i <= 80; i++) { const t = (q.T * i) / 80; all.push(pos(t)); if (t <= tt) done.push(pos(t)); }
      done.push(pos(tt));
      g.poly(all, { color: c.primary, width: 4, alpha: 0.3 });
      g.poly(done, { color: c.primary, width: 4.5 });
      // 一定の時間間隔ごとの位置(水平方向には等間隔に並ぶ)
      const dtDot = [0.1, 0.2, 0.5, 1, 2, 5].find((d) => q.T / d <= 40) || 5;
      for (let t = 0; t <= q.T + 1e-9; t += dtDot) { const p = pos(t); g.dot(p[0], p[1], { r: 2.8, color: c.muted, stroke: false }); }
      // 最高点・着地点
      if (q.vy > 0) {
        const xp = q.vx * q.tp;
        g.line(xp, q.ymax, xp, 0, { color: c.accent, dash: [5, 5], width: 1.6 });
        g.dot(xp, q.ymax, { r: 6, color: c.accent });
        g.text('最高点 (' + num(xp, 1) + ', ' + num(q.ymax, 1) + ')', xp, q.ymax, { dy: -16, align: 'center', color: c.accent, bold: true, size: 13 });
      }
      g.dot(q.R, 0, { r: 5, color: c.text });
      g.text('着地 x = ' + num(q.R, 1), q.R, 0, { dy: 20, align: q.R > g.xmax - 0.19 * (g.xmax - g.xmin) ? 'right' : 'center', color: c.text, bold: true, size: 13 });
      // ボール
      const b = pos(tt), vyNow = q.vy - G * tt;
      if (st.arrows && ttAll < q.T - 1e-6) {
        const k = 0.28 * sc;
        g.arrow(b[0], b[1], b[0] + q.vx * k, b[1], { color: c.teal, width: 3.5 });
        if (Math.abs(vyNow) > 0.3) g.arrow(b[0], b[1], b[0], b[1] + vyNow * k, { color: c.accent, width: 3.5 });
      }
      g.dot(b[0], b[1], { r: 10, color: c.amber });
      // 初速の矢印(ドラッグ用)
      g.arrow(0, st.h0, q.vx * K0, st.h0 + q.vy * K0, { color: c.amber, width: 3, dash: [6, 4] });
      g.textPx('t = ' + ttAll.toFixed(2) + ' 秒　　x = ' + num(b[0], 1) + ' m　　y = ' + num(b[1], 1) + ' m', 10, 16, { bold: true, size: 13, color: c.text });
      if (st.arrows) g.textPx('矢印：水平の速さ（緑）　鉛直の速さ（赤）', 10, 34, { size: 12, bold: true, color: c.muted });
    };
    fit();
    update();
    player.start();
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
     4.2 3次でイージングを設計
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
      R(root, 'note').textContent = (n === 2 ? '2点 → 直線（1次）。1.1章(2)の補間と同じ式になる。' :
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
    const fn = (x) => { const u = x / S; let s = 0; for (let k = n - 1; k >= 0; k--) s = s * u + cf[k]; return s; };
    fn.coef = cf.map((c, k) => c / Math.pow(S, k)); // x のべきの係数(定数項から)
    return fn;
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

  /* ==========================================================
     1.1(3) 回帰直線(最小二乗法)
     ========================================================== */
  function initReg() {
    const root = $id('w-reg');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.8, xmax: 10.6, ymin: -0.8, ymax: 10, ratio: [0.85, 0.55] });
    const DX = [1, 2, 3, 4, 5, 6, 7, 8, 9], DY = [2.3, 2.2, 3.9, 3.6, 5.2, 5.0, 6.6, 6.4, 7.9];
    const st = { a: 0.3, b: 3, show: false, pts: [] };
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\teal{a}', min: -2, max: 3, step: 0.05, value: st.a, color: 'teal', aria: '傾き a' });
    const sb = slider(ctl, { tex: '\\red{b}', min: -3, max: 8, step: 0.05, value: st.b, color: 'accent', aria: '切片 b' });
    const sse = (a, b) => st.pts.reduce((s, p) => s + Math.pow(p[1] - (a * p[0] + b), 2), 0);
    function best() {
      // 誤差の2乗和を最小にする a, b(連立一次方程式の解)
      const n = st.pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
      st.pts.forEach((p) => { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
      const d = n * sxx - sx * sx;
      const a = Math.abs(d) < 1e-9 ? 0 : (n * sxy - sx * sy) / d;
      return { a, b: (sy - a * sx) / n };
    }
    const lineTeX = (a, b, col) => 'y=' + (col ? C('teal', num(a, 2)) : num(a, 2)) + 'x' + (b < 0 ? '-' : '+') + (col ? C('red', num(Math.abs(b), 2)) : num(Math.abs(b), 2));
    function update() {
      const e = sse(st.a, st.b), bb = best(), emin = sse(bb.a, bb.b);
      tex(root, 'eq', lineTeX(st.a, st.b, true));
      R(root, 'sse').textContent = e.toFixed(2) + (st.show ? '　（最小の値は ' + emin.toFixed(2) + '）' : '');
      tex(root, 'best', st.show ? lineTeX(bb.a, bb.b, false) : '\\text{「答え合わせ」で表示}');
      const m = R(root, 'msg');
      if (e <= emin * 1.02 + 1e-6) { m.className = 'msg ok'; m.textContent = '✔ ほぼ最小です！ あなたの直線は回帰直線とほぼ一致しています。'; }
      else { m.className = 'msg ng'; m.textContent = 'ずれの2乗の合計は、まだ ' + (e - emin).toFixed(2) + ' 小さくできます。'; }
      plot.invalidate();
    }
    function setPts(ys) {
      st.pts = DX.map((x, i) => [x, ys[i]]);
      plot.handles.length = 0;
      st.pts.forEach(function (pt) {
        plot.addHandle({ get x() { return pt[0]; }, get y() { return pt[1]; }, get color() { return plot.c.text; }, r: 6, halo: 3,
          drag(x, y) { pt[0] = clamp(snap(x, 0.1), 0, 10); pt[1] = clamp(snap(y, 0.1), 0, 9.6); update(); } });
      });
      update();
    }
    sa.on((v) => { st.a = v; update(); });
    sb.on((v) => { st.b = v; update(); });
    root.querySelector('[data-a="reveal"]').addEventListener('click', function (e) {
      st.show = !st.show; e.currentTarget.textContent = st.show ? '回帰直線を隠す' : '答え合わせ：回帰直線を表示'; update();
    });
    root.querySelector('[data-a="shuffle"]').addEventListener('click', function () {
      const a = 0.2 + Math.random() * 0.8, b = 0.5 + Math.random() * 2.5;
      setPts(DX.map((x) => clamp(Math.round((a * x + b + (Math.random() - 0.5) * 2.4) * 10) / 10, 0.2, 9.4)));
    });
    root.querySelector('[data-a="reset"]').addEventListener('click', function () {
      st.a = 0.3; st.b = 3; st.show = false; sa.set(st.a); sb.set(st.b);
      root.querySelector('[data-a="reveal"]').textContent = '答え合わせ：回帰直線を表示';
      setPts(DY);
    });

    plot.draw = function (g) {
      const c = g.c, { a, b } = st;
      g.grid({ xlabel: 'x', ylabel: 'y' });
      // 縦のずれ(金)
      st.pts.forEach((p) => g.line(p[0], p[1], p[0], a * p[0] + b, { color: c.amber, width: 3.5 }));
      if (st.show) {
        const bb = best();
        g.fn((x) => bb.a * x + bb.b, { color: c.muted, width: 3, dash: [8, 6] });
        g.textPx('灰色の点線：回帰直線（ずれの2乗の合計が最小）', 10, 16, { size: 12.5, bold: true, color: c.muted });
      }
      g.fn((x) => a * x + b, { color: c.primary, width: 4 });
      g.textPx('青い線：あなたの直線　金色の線：縦のずれ', 10, st.show ? 34 : 16, { size: 12.5, bold: true, color: c.primary });
    };
    setPts(DY);
  }

  /* ==========================================================
     1.4 冒頭：スマホのメニューの実例
     ========================================================== */
  function initUiDemo() {
    const root = $id('w-uidemo');
    const btn = root.querySelector('[data-a="toggle"]');
    btn.addEventListener('click', function () {
      const open = root.classList.toggle('open');
      btn.textContent = open ? 'メニューを閉じる' : 'メニューを開く';
    });
    R(root, 'slow').addEventListener('change', (e) => root.classList.toggle('slow', e.target.checked));
  }

  /* ==========================================================
     1.5 冒頭：3次ベジェ曲線4本で描いたハート
     ========================================================== */
  const HEART = [[[50, 88], [22, 70], [4, 46], [14, 26]], [[14, 26], [24, 6], [46, 10], [50, 30]],
    [[50, 30], [54, 10], [76, 6], [86, 26]], [[86, 26], [96, 46], [78, 70], [50, 88]]];
  function initHeart() {
    const root = $id('w-heart');
    const NS = 'http://www.w3.org/2000/svg';
    let seg = HEART.map((s) => s.map((p) => p.slice()));
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-2 -2 104 96');
    svg.setAttribute('class', 'heart-svg');
    root.querySelector('.heart-fig').append(svg);
    const mk = (tag, cls) => { const e = document.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); return e; };
    const path = mk('path', 'h-path'), gc = mk('g', 'h-ctrl');
    svg.append(path, gc);
    const f = (v) => String(Math.round(v * 10) / 10);
    // 端点は隣り合う曲線で共有する。制御点は各曲線に2つずつ
    const nodes = [];
    function build() {
      gc.innerHTML = '';
      nodes.length = 0;
      seg.forEach(function (s, i) {
        [[0, 1], [3, 2]].forEach(function (pr) {
          const l = mk('line', 'h-arm'); l.dataset.s = i; l.dataset.a = pr[0]; l.dataset.b = pr[1]; gc.append(l);
        });
      });
      seg.forEach(function (s, i) {
        [1, 2].forEach(function (k) { const e = mk('circle', 'h-cp'); e.setAttribute('r', 2.6); e.dataset.s = i; e.dataset.k = k; gc.append(e); nodes.push(e); });
        const e = mk('rect', 'h-anchor'); e.setAttribute('width', 4.4); e.setAttribute('height', 4.4); e.dataset.s = i; e.dataset.k = 0; gc.append(e); nodes.push(e);
      });
    }
    function draw() {
      let d = 'M ' + f(seg[0][0][0]) + ' ' + f(seg[0][0][1]);
      const lines = ['M ' + f(seg[0][0][0]) + ' ' + f(seg[0][0][1])];
      seg.forEach(function (s) {
        const t = 'C ' + [1, 2, 3].map((k) => f(s[k][0]) + ' ' + f(s[k][1])).join(', ');
        d += ' ' + t; lines.push(t);
      });
      path.setAttribute('d', d + ' Z');
      R(root, 'code').textContent = lines.join('\n') + '\nZ';
      gc.querySelectorAll('.h-arm').forEach(function (l) {
        const s = seg[+l.dataset.s], a = s[+l.dataset.a], b = s[+l.dataset.b];
        l.setAttribute('x1', a[0]); l.setAttribute('y1', a[1]); l.setAttribute('x2', b[0]); l.setAttribute('y2', b[1]);
      });
      nodes.forEach(function (e) {
        const p = seg[+e.dataset.s][+e.dataset.k];
        if (e.tagName === 'circle') { e.setAttribute('cx', p[0]); e.setAttribute('cy', p[1]); }
        else { e.setAttribute('x', p[0] - 2.2); e.setAttribute('y', p[1] - 2.2); }
      });
    }
    // ドラッグ(端点を動かすときは、つながっている前の曲線の終点も一緒に動かす)
    let drag = null;
    const toSvg = (e) => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
    svg.addEventListener('pointerdown', function (e) {
      const t = e.target.closest('.h-cp, .h-anchor');
      if (!t || gc.style.display === 'none') return;
      drag = { s: +t.dataset.s, k: +t.dataset.k }; svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag) return;
      const q = toSvg(e), x = clamp(q.x, 0, 100), y = clamp(q.y, 0, 92);
      seg[drag.s][drag.k] = [x, y];
      if (drag.k === 0) { const pv = seg[(drag.s + 3) % 4]; pv[3] = [x, y]; }
      draw();
    });
    const end = () => { drag = null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('touchstart', (e) => { if (e.target.closest('.h-cp, .h-anchor')) e.preventDefault(); }, { passive: false });
    R(root, 'ctrl').addEventListener('change', (e) => { gc.style.display = e.target.checked ? '' : 'none'; });
    root.querySelector('[data-a="reset"]').addEventListener('click', function () { seg = HEART.map((s) => s.map((p) => p.slice())); draw(); });
    build(); draw();
  }

  /* ==========================================================
     1.6 定理の図：2点・3点・4点を通る多項式
     ========================================================== */
  function initLagMini() {
    const root = $id('w-lagmini');
    root.querySelectorAll('.mini').forEach(function (box) {
      const n = +box.dataset.n, pts = LAG_DEFAULT[n].map((p) => p.slice());
      const plot = new Plot(box.querySelector('canvas'), { xmin: -5, xmax: 5, ymin: -4.5, ymax: 4.5, ratio: [0.75, 0.85] });
      pts.forEach(function (pt) {
        plot.addHandle({ get x() { return pt[0]; }, get y() { return pt[1]; }, get color() { return plot.c.text; }, r: 7, halo: 4,
          drag(x, y) {
            const nx = clamp(snap(x, 0.05), -4.7, 4.7);
            if (pts.every((o) => o === pt || Math.abs(o[0] - nx) >= 0.4)) pt[0] = nx;
            pt[1] = clamp(snap(y, 0.05), -4.2, 4.2);
          } });
      });
      plot.draw = function (g) {
        g.grid({ labels: false });
        g.fn((x) => lagrange(pts, x), { color: g.c.primary, width: 4 });
      };
      plot.invalidate();
    });
  }

  /* ==========================================================
     1.3(2) チャレンジ：惑星の的当て
     ========================================================== */
  const GAME_STAGES = [
    { name: '地球', g: 9.8, xmax: 24, target: { x0: 14, x1: 16, y: 0 }, walls: [],
      text: '地球（g = 9.8）で、15 m 先の的（14〜16 m）に当てよう。',
      hint: '高さ0から投げるので、飛距離は R = v₀² sin 2θ / g。たとえば θ = 45° なら sin 90° = 1 なので、v₀ = √(gR) です。' },
    { name: '地球', g: 9.8, xmax: 22, target: { x0: 16, x1: 18, y: 0 }, walls: [{ x0: 7, x1: 8, y0: 0, y1: 5 }],
      text: '地球：高さ 5 m の壁（7〜8 m）を越えて、17 m 先の的（16〜18 m）に当てよう。',
      hint: '同じ飛距離になる角度は θ と 90° − θ の2つ。低い角度だと壁に当たるかも。壁の位置 x = 8 での高さ y = x tanθ − g x²/(2 v₀² cos²θ) が 5 より大きいか確かめよう。' },
    { name: '月', g: 1.62, xmax: 80, target: { x0: 60, x1: 64, y: 0 }, walls: [], ceil: 20,
      text: '月（g = 1.62）：高さ 20 m の天井の下を通して、62 m 先の的（60〜64 m）に当てよう。',
      hint: '月では遠くまで飛ぶけれど、高く上がりすぎると天井にぶつかる。最高点 H = (v₀ sinθ)²/(2g) が 20 より小さくなる角度を選ぼう。' },
    { name: '木星', g: 24.8, xmax: 9, target: { x0: 5, x1: 6, y: 1.5 }, walls: [],
      text: '木星（g = 24.8）：高さ 1.5 m の台の上（5〜6 m）にボールを乗せよう。',
      hint: '重力がとても強いので、速さはほぼ最大が必要。軌道の式 y = x tanθ − g x²/(2 v₀² cos²θ) に x = 5.5, y = 1.5 を入れて、v₀ と θ の組を探そう。' },
    { name: '火星', g: 3.71, xmax: 50, target: { x0: 40, x1: 44, y: 0 }, walls: [{ x0: 20, x1: 21, y0: 0, y1: 3 }], ceil: 8,
      text: '火星（g = 3.71）：天井 8 m と高さ 3 m の壁のすき間を抜けて、42 m 先の的（40〜44 m）に当てよう。',
      hint: '最高点 H = (v₀ sinθ)²/(2g) ≤ 8 と、飛距離 R = v₀² sin 2θ / g ≈ 42 の両方を満たす組を探そう。角度は低め、速さは大きめ。' },
  ];
  [
    '<b>例：v₀ = 12.1 m/s、θ = 45°</b><br>高さ0から投げると飛距離は $R=\\dfrac{v_0^{\\,2}\\sin2\\theta}{g}$。θ = 45° なら $\\sin90^\\circ=1$ なので $v_0=\\sqrt{gR}=\\sqrt{9.8\\times15}\\approx12.1$。（$R\\approx14.9$ m）',
    '<b>例：v₀ = 13.9 m/s、θ = 60°</b><br>飛距離 17 m になる角度は θ と 90° − θ の2通りあるが、低い角度では壁に当たる。θ = 60° なら $v_0=\\sqrt{\\dfrac{gR}{\\sin120^\\circ}}=\\sqrt{\\dfrac{9.8\\times17}{0.866}}\\approx13.9$。壁の位置 x = 8 での高さは $8\\tan60^\\circ-\\dfrac{9.8\\times8^2}{2\\times13.9^2\\cos^260^\\circ}\\approx7.4$ m で、5 m の壁を越える。',
    '<b>例：v₀ = 12.5 m/s、θ = 20°</b><br>45° だと最高点が約 30 m で天井（20 m）にぶつかる。低い角度 θ = 20° にすると $v_0=\\sqrt{\\dfrac{1.62\\times62}{\\sin40^\\circ}}\\approx12.5$、最高点は $\\dfrac{(12.5\\sin20^\\circ)^2}{2\\times1.62}\\approx5.6$ m で天井より低い。',
    '<b>例：v₀ = 13.7 m/s、θ = 45°</b><br>軌道の式 $y=x\\tan\\theta-\\dfrac{g}{2v_0^{\\,2}\\cos^2\\theta}x^2$ に θ = 45°、x = 5.5、y = 1.5 を入れると $1.5=5.5-\\dfrac{24.8\\times5.5^2}{v_0^{\\,2}}$ より $v_0^{\\,2}\\approx187.6$、$v_0\\approx13.7$。台の手前 x = 5 では高さ約 1.7 m なので、台の側面にはぶつからない。',
    '<b>例：v₀ = 13.7 m/s、θ = 28°</b><br>天井 8 m より低く通すには最高点 $\\dfrac{(v_0\\sin\\theta)^2}{2g}\\le8$、つまり鉛直の速さ $v_0\\sin\\theta\\le\\sqrt{2\\times3.71\\times8}\\approx7.7$。θ = 28° なら鉛直 6.4、最高点は約 5.6 m。飛距離は $\\dfrac{13.7^2\\sin56^\\circ}{3.71}\\approx41.9$ m。壁の位置 x = 20.5 での高さは約 5.6 m で、3 m の壁も越える。',
  ].forEach((t, i) => { GAME_STAGES[i].answer = t; });
  const PKEY = '1-3:game';
  function simulateThrow(v, th, S) {
    const r = (th * Math.PI) / 180, vx = v * Math.cos(r), vy = v * Math.sin(r), g = S.g;
    const dt = Math.max(0.0005, (2 * Math.max(vy, 1) / g) / 3000);
    const rects = S.walls.slice();
    if (S.target.y > 0) rects.push({ x0: S.target.x0, x1: S.target.x1, y0: 0, y1: S.target.y });
    const pts = [[0, 0]];
    let t = 0, px = 0, py = 0;
    for (let i = 0; i < 400000; i++) {
      t += dt;
      const x = vx * t, y = vy * t - 0.5 * g * t * t;
      if (S.ceil && y > S.ceil) { pts.push([x, S.ceil]); return { pts, T: t, type: 'ceil', x }; }
      const T = S.target;
      if (T.y > 0 && py >= T.y && y < T.y && x >= T.x0 && x <= T.x1) { pts.push([x, T.y]); return { pts, T: t, type: 'hit', x }; }
      for (const w of rects) if (x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1) { pts.push([x, y]); return { pts, T: t, type: 'wall', x }; }
      if (y < 0) {
        const lx = px + (x - px) * (py / (py - y));
        pts.push([lx, 0]);
        return { pts, T: t, type: T.y === 0 && lx >= T.x0 && lx <= T.x1 ? 'hit' : 'land', x: lx };
      }
      if (i % 4 === 0) pts.push([x, y]);
      px = x; py = y;
    }
    return { pts, T: t, type: 'land', x: px };
  }

  function initGame() {
    const root = $id('w-game');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1, xmax: 24, equal: true, yc: 5, ratio: [0.62, 0.5] });
    const st = { k: 0, used: 0, done: false, shots: [], fly: null, burst: [], hint: false };
    const best = Object.assign({}, L.progress.get(PKEY) || {});
    const ctl = root.querySelector('.controls');
    const sv = slider(ctl, { tex: 'v_0', min: 1, max: 14, step: 0.1, value: 10, color: 'primary', fmt: (v) => v.toFixed(1), aria: '速さ v0 (m/s)' });
    const sth = slider(ctl, { tex: '\\theta', min: 1, max: 89, step: 1, value: 45, color: 'primary', fmt: (v) => v + '°', aria: '角度' });
    const row = el('div', 'btn-row');
    row.style.marginTop = '8px';
    const bThrow = el('button', 'btn primary', '🏀 投げる'), bRetry = el('button', 'btn', 'やり直す'), bNext = el('button', 'btn', '次のステージへ →');
    [bThrow, bRetry, bNext].forEach((b) => { b.type = 'button'; row.append(b); });
    ctl.append(row);
    const chips = R(root, 'stages');
    addGameRows(root);
    const formula = function () {
      const r = (sth.get() * Math.PI) / 180, v = sv.get(), S = GAME_STAGES[st.k];
      tex(root, 'formula', '\\text{軌道 } y = ' + num(Math.tan(r), 3) + 'x - ' + num(S.g / (2 * v * v * Math.cos(r) * Math.cos(r)), 4) + 'x^2');
    };
    root.addEventListener('click', function (e) { if (e.target.closest('[data-a="gans"]')) showAnswer(root, GAME_STAGES[st.k]); });

    function fitView() {
      const S = GAME_STAGES[st.k], p = plot;
      if (!p.w) return;
      const span = S.xmax + 1, hw = p.h / p.w;
      p.o.xmin = -1; p.o.xmax = S.xmax; p.o.yc = -0.08 * span + (span * hw) / 2; p._layout();
    }
    plot.onResize = fitView;

    function renderChips() {
      chips.innerHTML = '';
      GAME_STAGES.forEach(function (S, i) {
        const b = el('button', 'chip stage-chip', 'ステージ' + (i + 1) + ' ' + S.name + ' <span class="st">' + starStr(best[i + 1] || 0) + '</span>');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(i === st.k));
        b.addEventListener('click', () => setStage(i));
        chips.append(b);
      });
      const tot = Object.values(best).reduce((a, b) => a + b, 0);
      R(root, 'total').textContent = '★ ' + tot + ' / ' + GAME_STAGES.length * 3;
    }
    function renderThrows() {
      let h = '';
      for (let i = 0; i < 3; i++) h += '<i class="' + (i < 3 - st.used ? '' : 'used') + '"></i>';
      R(root, 'throws').innerHTML = h + '<span>' + (3 - st.used) + ' 回</span>';
    }
    function setResult(text, cls) { const r = R(root, 'result'); r.textContent = text; r.className = 'result ' + (cls || ''); }
    function setStage(k) {
      st.k = k; st.used = 0; st.done = false; st.shots = []; st.fly = null; st.burst = []; st.hint = false;
      const S = GAME_STAGES[k];
      R(root, 'mission').innerHTML = '<span class="mno">ステージ' + (k + 1) + '</span>' + S.text;
      R(root, 'hint').innerHTML = '<button class="btn small" data-a="hint" type="button">ヒントを見る</button>';
      resetAnswer(root); formula();
      setResult('まだ投げていません');
      bThrow.disabled = false; bNext.hidden = true;
      renderChips(); renderThrows(); fitView(); plot.invalidate();
    }
    root.addEventListener('click', function (e) {
      if (!e.target.closest('[data-a="hint"]')) return;
      R(root, 'hint').textContent = GAME_STAGES[st.k].hint;
    });

    const anim = L.animate(root, function (dt) {
      let busy = false;
      if (st.fly) {
        st.fly.p += dt / st.fly.dur;
        if (st.fly.p >= 1) { st.fly.p = 1; finish(); } else busy = true;
      }
      if (st.burst.length) {
        st.burst.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; q.life -= dt; });
        st.burst = st.burst.filter((q) => q.life > 0);
        busy = busy || st.burst.length > 0;
      }
      plot.invalidate();
      return busy;
    });

    function finish() {
      const sim = st.fly.sim, S = GAME_STAGES[st.k];
      st.shots.push(sim); st.fly = null; st.used++;
      renderThrows();
      if (sim.type === 'hit') {
        const stars = 4 - st.used;
        if (!best[st.k + 1] || stars > best[st.k + 1]) { best[st.k + 1] = stars; L.progress.set(PKEY, best); }
        setResult('🎯 命中！ ' + starStr(stars) + '（' + st.used + ' 回目）', 'hit');
        st.done = true; bThrow.disabled = true; bNext.hidden = st.k >= GAME_STAGES.length - 1;
        if (st.k >= GAME_STAGES.length - 1) setResult('🎯 命中！ ' + starStr(stars) + '　全ステージ制覇！', 'hit');
        // 命中の演出(画面座標で紙吹雪)
        const cx = plot.X(sim.x), cy = plot.Y(S.target.y);
        const col = [plot.c.amber, plot.c.teal, plot.c.accent, plot.c.primary, plot.c.violet];
        for (let i = 0; i < 46; i++) {
          const a = Math.random() * Math.PI, sp = 150 + Math.random() * 260;
          st.burst.push({ x: cx, y: cy, vx: Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1), vy: -Math.sin(a) * sp, life: 1 + Math.random() * 0.6, c: col[i % col.length] });
        }
        renderChips(); anim.kick();
      } else {
        const cx = (S.target.x0 + S.target.x1) / 2;
        let msg = sim.type === 'wall' ? '💥 壁に当たった！' : sim.type === 'ceil' ? '💥 天井にぶつかった！' :
          (sim.x < cx ? 'あと ' + (cx - sim.x).toFixed(1) + ' m 足りない（' + sim.x.toFixed(1) + ' m に着地）' : (sim.x - cx).toFixed(1) + ' m 行き過ぎ（' + sim.x.toFixed(1) + ' m に着地）');
        if (st.used >= 3) { msg += '　― 3回とも外れ。「やり直す」で再挑戦！'; bThrow.disabled = true; }
        setResult(msg, 'miss');
      }
    }

    bThrow.addEventListener('click', function () {
      if (st.fly || st.done || st.used >= 3) return;
      const sim = simulateThrow(sv.get(), sth.get(), GAME_STAGES[st.k]);
      st.fly = { sim, p: 0, dur: Math.min(3, Math.max(0.7, sim.T * 0.7)) };
      setResult('…', '');
      anim.kick();
    });
    bRetry.addEventListener('click', () => setStage(st.k));
    bNext.addEventListener('click', () => setStage(Math.min(st.k + 1, GAME_STAGES.length - 1)));

    plot.draw = function (g) {
      const c = g.c, S = GAME_STAGES[st.k], ctx = g.ctx;
      g.grid({ step: niceStepG(S.xmax), xlabel: 'x (m)', ylabel: 'y (m)' });
      // 地面
      ctx.save(); ctx.fillStyle = c.muted; ctx.globalAlpha = 0.22; ctx.fillRect(0, g.Y(0), g.w, g.h - g.Y(0)); ctx.restore();
      g.line(g.xmin, 0, g.xmax, 0, { color: c.muted, width: 2.5 });
      // 天井
      if (S.ceil) {
        ctx.save(); ctx.fillStyle = c.muted; ctx.globalAlpha = 0.22; ctx.fillRect(0, 0, g.w, g.Y(S.ceil)); ctx.restore();
        g.line(g.xmin, S.ceil, g.xmax, S.ceil, { color: c.text, width: 3 });
        g.text('天井 ' + S.ceil + ' m', g.xmax, S.ceil, { dx: -8, dy: 14, align: 'right', color: c.text, bold: true, size: 12 });
      }
      // 壁
      S.walls.forEach(function (w) {
        ctx.save(); ctx.fillStyle = c.text; ctx.globalAlpha = 0.75;
        ctx.fillRect(g.X(w.x0), g.Y(w.y1), g.X(w.x1) - g.X(w.x0), g.Y(w.y0) - g.Y(w.y1)); ctx.restore();
        g.text('壁 ' + w.y1 + ' m', (w.x0 + w.x1) / 2, w.y1, { dy: -12, align: 'center', color: c.text, bold: true, size: 12 });
      });
      // 的(旗)
      const T = S.target;
      if (T.y > 0) { ctx.save(); ctx.fillStyle = c.muted; ctx.globalAlpha = 0.6; ctx.fillRect(g.X(T.x0), g.Y(T.y), g.X(T.x1) - g.X(T.x0), g.Y(0) - g.Y(T.y)); ctx.restore(); }
      g.line(T.x0, T.y, T.x1, T.y, { color: c.teal, width: 8 });
      const fx = (T.x0 + T.x1) / 2;
      g.line(fx, T.y, fx, T.y + (g.ymax - g.ymin) * 0.12, { color: c.text, width: 2 });
      ctx.save(); ctx.fillStyle = c.teal;
      const px = g.X(fx), py = g.Y(T.y + (g.ymax - g.ymin) * 0.12);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 18, py + 7); ctx.lineTo(px, py + 14); ctx.closePath(); ctx.fill(); ctx.restore();
      g.text(T.x0 + '〜' + T.x1 + ' m', fx, T.y, { dy: 18, align: 'center', color: c.teal, bold: true, size: 12 });
      // これまでの投てき(薄く)
      st.shots.forEach(function (sim, i) {
        g.poly(sim.pts, { color: sim.type === 'hit' ? c.teal : c.muted, width: 2.5, dash: sim.type === 'hit' ? [] : [6, 5], alpha: 0.7 });
        const e = sim.pts[sim.pts.length - 1];
        g.text(String(i + 1), e[0], e[1], { dy: -12, align: 'center', color: c.muted, bold: true, size: 12 });
      });
      // 飛んでいるボール
      if (st.fly) {
        const pts = st.fly.sim.pts, n = Math.max(1, Math.floor(pts.length * st.fly.p));
        const part = pts.slice(0, n);
        g.poly(part, { color: c.primary, width: 3.5 });
        const b = part[part.length - 1];
        if (b[1] > g.ymax) {
          g.textPx('▲ ' + b[1].toFixed(1) + ' m', g.X(b[0]), 12, { align: 'center', bold: true, size: 12, color: c.amber });
        } else g.dot(b[0], b[1], { r: 9, color: c.amber });
      } else g.dot(0, 0, { r: 9, color: c.amber });
      // 投げる向きの目安(矢印の向きだけ。長さは速さに比例)
      if (!st.fly && !st.done) {
        const r = (sth.get() * Math.PI) / 180, L0 = (g.xmax - g.xmin) * 0.012 * sv.get();
        g.arrow(0, 0, L0 * Math.cos(r), L0 * Math.sin(r), { color: c.amber, width: 3, dash: [5, 4] });
      }
      // 紙吹雪
      st.burst.forEach(function (q) { ctx.save(); ctx.globalAlpha = Math.min(1, q.life); ctx.fillStyle = q.c; ctx.fillRect(q.x - 3, q.y - 3, 6, 6); ctx.restore(); });
      g.textPx(S.name + '　g = ' + S.g + ' m/s²', g.w - 10, 16, { bold: true, size: 13, color: c.text, align: 'right' });
    };
    const niceStepG = (xmax) => (xmax <= 10 ? 1 : xmax <= 30 ? 2 : xmax <= 60 ? 5 : 10);
    sv.on(() => { plot.invalidate(); formula(); });
    sth.on(() => { plot.invalidate(); formula(); });
    setStage(0);
  }

  /* チャレンジの共通部品は assets/game.js */
  const { starStr, GameShell, addGameRows, resetAnswer, showAnswer, aimToggle, gapMark, gameButtons, Confetti, Sweep } = L.game;

  /* ==========================================================
     1.1(4) チャレンジ：レーザーで星を撃ち抜け
     ========================================================== */
  const LINE_STAGES = [
    { text: '2つの星 (0, 2) と (4, 4) を、1本のレーザーで撃ち抜こう。', stars: [[0, 2], [4, 4]], bombs: [],
      hint: '(0, 2) は y 軸上にあるので b = 2。傾き a は「x が 4 増えると y が 2 増える」から a = 2 ÷ 4。' },
    { text: '3つの星をまとめて撃ち抜こう。', stars: [[-2, -3], [1, 3], [3, 7]], bombs: [],
      hint: '2つの星を選んで、傾き a =（y の増え方）÷（x の増え方）を計算しよう。そのあと、x = 0 のときの y が b。' },
    { text: '右下がりのレーザーで3つの星を撃ち抜こう。', stars: [[-4, 4], [2, 1], [4, 0]], bombs: [],
      hint: '右下がりなので a は負。(2, 1) と (4, 0) から傾きを求め、y = ax + b に代入して b を求めよう。' },
    { text: 'y 軸から離れた2つの星 (3, −2) と (5, −6) を撃ち抜こう。', stars: [[3, -2], [5, -6]], bombs: [],
      hint: 'まず傾き a = (−6 − (−2)) ÷ (5 − 3)。次に y = ax + b に (3, −2) を代入して b を求めよう。' },
  ];
  // 答えと解説
  [
    '<b>a = 0.5, b = 2</b><br>(0, 2) は y 軸上の点なので、切片 b = 2。傾きは $a=\\dfrac{4-2}{4-0}=0.5$。よって $y=0.5x+2$。',
    '<b>a = 2, b = 1</b><br>(1, 3) と (3, 7) から $a=\\dfrac{7-3}{3-1}=2$。$y=2x+b$ に (1, 3) を代入すると $3=2+b$ より $b=1$。(−2, −3) も $2\\times(-2)+1=-3$ で確かに通る。',
    '<b>a = −0.5, b = 2</b><br>(2, 1) と (4, 0) から $a=\\dfrac{0-1}{4-2}=-0.5$。$y=-0.5x+b$ に (4, 0) を代入すると $0=-2+b$ より $b=2$。',
    '<b>a = −2, b = 4</b><br>$a=\\dfrac{-6-(-2)}{5-3}=-2$。$y=-2x+b$ に (3, −2) を代入すると $-2=-6+b$ より $b=4$。y 軸から離れていても、代入すれば切片が求まる。',
  ].forEach((t, i) => { LINE_STAGES[i].answer = t; });
  function initGameLine() {
    const root = $id('w-game-line');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -6, xmax: 6, equal: true, yc: 1, ratio: [0.9, 0.62] });
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\teal{a}', min: -4, max: 4, step: 0.1, value: 1, color: 'teal', aria: '傾き a' });
    const sb = slider(ctl, { tex: '\\red{b}', min: -6, max: 8, step: 0.1, value: 0, color: 'accent', aria: '切片 b' });
    const B = gameButtons(ctl, '⚡ 発射');
    const conf = Confetti(root, plot);
    const st = { shots: [], cur: null, aim: true };
    aimToggle(ctl, (v) => { st.aim = v; plot.invalidate(); });
    // すべての星が見えるよう表示範囲を合わせる(縦横の縮尺は同じまま、x の範囲を広げる)
    function fitLine() {
      const p = plot, S = LINE_STAGES[game ? game.k : 0];
      if (!p.w) return;
      const ys = S.stars.map((q) => q[1]).concat([0]);
      const lo = Math.min.apply(null, ys) - 1.6, hi = Math.max.apply(null, ys) + 1.6;
      const span = Math.max(12, (hi - lo) * p.w / p.h);
      p.o.xmin = -span / 2; p.o.xmax = span / 2; p.o.yc = (lo + hi) / 2; p._layout();
    }
    plot.onResize = fitLine;
    let game = null;
    game = GameShell(root, { key: '1-1:game', stages: LINE_STAGES,
      formula: function () {
        const a = sa.get(), b = sb.get();
        return '\\begin{aligned}&y = ' + C('teal', num(a)) + 'x' + (b < 0 ? ' - ' : ' + ') + C('red', num(Math.abs(b))) + '\\\\' +
          '&x\\text{ が 1 増えると } y\\text{ は } ' + C('teal', num(Math.abs(a))) + (a === 0 ? '\\text{（変化しない）}' : a > 0 ? '\\text{ 増える}' : '\\text{ 減る}') + '\\end{aligned}';
      },
      onStage() { st.shots = []; st.cur = null; B.bMain.disabled = false; B.bNext.hidden = true; fitLine(); plot.invalidate(); } });
    const near = (a, b, p, tol) => Math.abs(a * p[0] + b - p[1]) <= tol;
    const sweep = Sweep(root, plot, 0.6, function () {
      const S = LINE_STAGES[game.k], { a, b } = st.cur;
      const hit = S.stars.filter((p) => near(a, b, p, 0.2)).length, boom = S.bombs.some((p) => near(a, b, p, 0.3));
      st.shots.push(st.cur); game.used++; game.renderThrows();
      if (!boom && hit === S.stars.length) {
        const n = 4 - game.used; game.award(n); game.done = true;
        game.result('⚡ 全部撃ち抜いた！ ' + starStr(n) + '（' + game.used + ' 回目）' + (st.cur.aim ? '' : '　👑 照準なしで命中！'), 'hit');
        B.bMain.disabled = true; B.bNext.hidden = game.k >= LINE_STAGES.length - 1;
        const s0 = S.stars[S.stars.length - 1]; conf.fire(plot.X(s0[0]), plot.Y(s0[1]));
      } else {
        let m = boom ? '💥 爆弾に触れた！' : '星 ' + S.stars.length + ' 個のうち ' + hit + ' 個に命中。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      st.cur = null;
    });
    B.bMain.addEventListener('click', function () {
      if (st.cur || game.done || game.used >= 3) return;
      st.cur = { a: sa.get(), b: sb.get(), aim: st.aim }; game.result('…'); sweep.start();
    });
    sa.on(() => { game.formula(); plot.invalidate(); }); sb.on(() => { game.formula(); plot.invalidate(); });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, LINE_STAGES.length - 1)));

    plot.draw = function (g) {
      const c = g.c, S = LINE_STAGES[game.k];
      g.grid({ xlabel: 'x', ylabel: 'y' });
      st.shots.forEach((s, i) => { g.fn((x) => s.a * x + s.b, { color: c.muted, width: 2, dash: [6, 5], alpha: 0.7 }); });
      if (st.cur) {
        const x1 = g.xmin + (g.xmax - g.xmin) * sweep.st.p;
        g.fn((x) => st.cur.a * x + st.cur.b, { x0: g.xmin, x1, color: c.accent, width: 4 });
      }
      // ねらいの点線と、傾きの手がかり(x が +1 → y が +a)、星までの縦のずれ
      if (st.aim && !st.cur && !game.done) {
        const a = sa.get(), b = sb.get();
        g.fn((x) => a * x + b, { color: c.accent, width: 2.5, dash: [8, 7], alpha: 0.75 });
        g.line(0, b, 1, b, { color: c.text, width: 2, alpha: 0.7 });
        g.line(1, b, 1, a + b, { color: c.teal, width: 3.5 });
        g.text('+1', 0.5, b, { dy: a >= 0 ? 14 : -14, align: 'center', size: 12, bold: true, color: c.text });
        g.text((a >= 0 ? '+' : '−') + num(Math.abs(a)), 1, b + a / 2, { dx: 8, size: 13, bold: true, color: c.teal });
        g.dot(0, b, { r: 5, color: c.accent });
        S.stars.forEach((p) => gapMark(g, p[0], a * p[0] + b, p[1], p[0] <= 0));
      }
      const last = st.shots[st.shots.length - 1];
      S.bombs.forEach(function (p) {
        const boom = last && near(last.a, last.b, p, 0.3);
        g.dot(p[0], p[1], { r: 10, color: c.text });
        g.text(boom ? '💥' : '💣', p[0], p[1], { align: 'center', size: 14, halo: false });
      });
      S.stars.forEach(function (p) {
        const got = last && near(last.a, last.b, p, 0.2);
        g.text('★', p[0], p[1], { align: 'center', size: 26, color: got ? c.teal : c.amber, bold: true });
        g.text('(' + L.minus(p[0]) + ', ' + L.minus(p[1]) + ')', p[0], p[1], { dx: 14, dy: -14, size: 12, color: c.muted, bold: true });
      });
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     1.2(3) チャレンジ：放物線でコインを集めろ
     ========================================================== */
  const PARAB_STAGES = [
    { text: '3枚のコインをすべて通る放物線を発射しよう。', coins: [[-2, 2], [0, -2], [2, 2]],
      hint: 'コインは左右対称。真ん中の (0, −2) が頂点なので p = 0, q = −2。あとは (2, 2) を通るように a を決めよう。' },
    { text: '3枚のコインを集めよう。頂点はどのコイン？', coins: [[0, 5], [2, 1], [3, 2]],
      hint: 'いちばん低い (2, 1) が頂点なら p = 2, q = 1。y − q = a(x − p)² に (0, 5) を代入して a を求めよう。' },
    { text: '上に凸の放物線で、3枚のコインを集めよう。', coins: [[-3, -1], [-1, 3], [1, -1]],
      hint: '上に凸なので a < 0。いちばん高い (−1, 3) が頂点。(1, −1) を代入して a を求めよう。' },
    { text: '頂点にはコインがない！ 3枚のコインから放物線を見つけよう。', coins: [[-1, -1], [3, -1], [5, 5]],
      hint: '同じ高さの (−1, −1) と (3, −1) の真ん中に対称軸がある → p = 1。残りは a と q。2つのコインを y = a(x − 1)² + q に代入して連立しよう。' },
  ];
  [
    '<b>a = 1, p = 0, q = −2</b><br>コインが左右対称に並び、真ん中の (0, −2) が頂点なので $p=0,\\ q=-2$。$y=a x^2-2$ に (2, 2) を代入すると $2=4a-2$ より $a=1$。',
    '<b>a = 1, p = 2, q = 1</b><br>最も低い (2, 1) が頂点。$y=a(x-2)^2+1$ に (0, 5) を代入すると $5=4a+1$ より $a=1$。(3, 2) も $1\\cdot1^2+1=2$ で通る。',
    '<b>a = −1, p = −1, q = 3</b><br>最も高い (−1, 3) が頂点で、上に凸なので $a<0$。$y=a(x+1)^2+3$ に (1, −1) を代入すると $-1=4a+3$ より $a=-1$。',
    '<b>a = 0.5, p = 1, q = −3</b><br>同じ高さの (−1, −1) と (3, −1) の真ん中 $x=1$ が対称軸なので $p=1$。$y=a(x-1)^2+q$ に代入すると、(−1, −1) から $-1=4a+q$、(5, 5) から $5=16a+q$。引き算して $12a=6$ より $a=0.5$、$q=-3$。',
  ].forEach((t, i) => { PARAB_STAGES[i].answer = t; });
  function initGameParab() {
    const root = $id('w-game-parab');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -6, xmax: 6, equal: true, yc: 1.4, ratio: [0.95, 0.7] });
    const ctl = root.querySelector('.controls');
    const sa = slider(ctl, { tex: '\\blue{a}', min: -2, max: 2, step: 0.25, value: 0.25, color: 'primary', fmt: (v) => v.toFixed(2) });
    const sp = slider(ctl, { tex: '\\teal{p}', min: -5, max: 5, step: 0.5, value: 0, color: 'teal' });
    const sq = slider(ctl, { tex: '\\red{q}', min: -5, max: 5, step: 0.5, value: 0, color: 'accent' });
    sa.on((v) => { if (v === 0) sa.set(0.25); });
    [sa, sp, sq].forEach((sl) => sl.on(() => { if (game) { game.formula(); plot.invalidate(); } }));
    const B = gameButtons(ctl, '🎯 発射');
    const conf = Confetti(root, plot);
    const st = { shots: [], cur: null, aim: true };
    aimToggle(ctl, (v) => { st.aim = v; plot.invalidate(); });
    // eslint-disable-next-line no-unused-vars
    const sgnT = (v, col) => (v < 0 ? ' + ' : ' - ') + C(col, num(Math.abs(v)));
    const game = GameShell(root, { key: '1-2:game', stages: PARAB_STAGES,
      formula: function () {
        const a = sa.get() || 0.25, p = sp.get(), q = sq.get();
        return '\\begin{aligned}&y = ' + C('blue', num(a)) + '(x' + sgnT(p, 'teal') + ')^2' + (q < 0 ? ' - ' : ' + ') + C('red', num(Math.abs(q))) + '\\\\' +
          '&\\text{頂点 }(' + C('teal', num(p)) + ',\\ ' + C('red', num(q)) + ')\\text{、頂点から } x \\text{ が 1 離れると } y \\text{ は } ' + C('blue', (a > 0 ? '+' : '') + num(a)) + '\\end{aligned}';
      },
      onStage() { st.shots = []; st.cur = null; B.bMain.disabled = false; B.bNext.hidden = true; plot.invalidate(); } });
    const f = (s, x) => s.a * (x - s.p) * (x - s.p) + s.q;
    const on = (s, c) => Math.abs(f(s, c[0]) - c[1]) <= 0.2;
    const sweep = Sweep(root, plot, 0.7, function () {
      const S = PARAB_STAGES[game.k], s = st.cur, hit = S.coins.filter((c) => on(s, c)).length;
      st.shots.push(s); game.used++; game.renderThrows();
      if (hit === S.coins.length) {
        const n = 4 - game.used; game.award(n); game.done = true;
        game.result('🪙 コインをすべて集めた！ ' + starStr(n) + '（' + game.used + ' 回目）' + (s.aim ? '' : '　👑 照準なしで命中！'), 'hit');
        B.bMain.disabled = true; B.bNext.hidden = game.k >= PARAB_STAGES.length - 1;
        conf.fire(plot.X(S.coins[1][0]), plot.Y(S.coins[1][1]));
      } else {
        let m = 'コイン ' + S.coins.length + ' 枚のうち ' + hit + ' 枚を集めた。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      st.cur = null;
    });
    B.bMain.addEventListener('click', function () {
      if (st.cur || game.done || game.used >= 3) return;
      st.cur = { a: sa.get() || 0.25, p: sp.get(), q: sq.get(), aim: st.aim }; game.result('…'); sweep.start();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, PARAB_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, S = PARAB_STAGES[game.k];
      g.grid({ xlabel: 'x', ylabel: 'y' });
      st.shots.forEach((s) => g.fn((x) => f(s, x), { color: c.muted, width: 2, dash: [6, 5], alpha: 0.7 }));
      if (st.cur) g.fn((x) => f(st.cur, x), { x0: g.xmin, x1: g.xmin + (g.xmax - g.xmin) * sweep.st.p, color: c.primary, width: 4 });
      // ねらいの点線と、頂点・対称軸・「頂点から x が 1 離れると y が a 変化」、コインまでの縦のずれ
      if (st.aim && !st.cur && !game.done) {
        const s = { a: sa.get() || 0.25, p: sp.get(), q: sq.get() };
        g.line(s.p, g.ymin, s.p, g.ymax, { color: c.muted, width: 1.5, dash: [3, 5] });
        g.fn((x) => f(s, x), { color: c.primary, width: 2.5, dash: [8, 7], alpha: 0.75 });
        g.line(s.p, s.q, s.p + 1, s.q, { color: c.text, width: 2, alpha: 0.7 });
        g.line(s.p + 1, s.q, s.p + 1, s.q + s.a, { color: c.primary, width: 3.5 });
        g.text((s.a > 0 ? '+' : '−') + num(Math.abs(s.a)), s.p + 1, s.q + s.a / 2, { dx: 8, size: 13, bold: true, color: c.primary });
        g.dot(s.p, s.q, { r: 6, color: c.text });
        g.text('頂点 (' + L.minus(num(s.p)) + ', ' + L.minus(num(s.q)) + ')', s.p, s.q, { dy: s.a > 0 ? 20 : -20, align: 'center', size: 12, bold: true, color: c.text });
        S.coins.forEach((p) => gapMark(g, p[0], f(s, p[0]), p[1], p[0] <= s.p));
      }
      const last = st.shots[st.shots.length - 1];
      S.coins.forEach(function (p) {
        const got = last && on(last, p);
        g.dot(p[0], p[1], { r: 11, color: got ? c.teal : c.amber });
        g.text(got ? '✓' : '¥', p[0], p[1], { align: 'center', size: 13, bold: true, color: '#fff', halo: false });
        g.text('(' + L.minus(p[0]) + ', ' + L.minus(p[1]) + ')', p[0], p[1], { dx: 15, dy: -14, size: 12, color: c.muted, bold: true });
      });
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     1.4(3) チャレンジ：お手本と同じ動きを作れ
     ========================================================== */
  const EASE_STAGES = [
    { v: [3, 0], text: '勢いよく出発して、ゴールでぴたりと止まる動きを作ろう。', hint: '最初の点の間隔が広い ＝ 出だしが速い。最後の間隔がつまっている ＝ 終わりの速さは 0 に近い。最初の間隔 ÷ 0.1 がおおよその v₀。' },
    { v: [0, 3], text: 'じわっと動き出して、勢いよくゴールに飛び込む動きを作ろう。', hint: 'ステージ1の逆。出だしの間隔がつまっていて、最後が広い。' },
    { v: [0, 0], text: 'ゆっくり動き出し、ゆっくり止まる動きを作ろう。', hint: '両端の点がつまっていて、真ん中が広い。この章の smoothstep を思い出そう。' },
    { v: [4, -1], text: 'ゴールを一度行き過ぎてから戻ってくる動きを作ろう。', hint: 'ゴールを越えてから戻る ＝ 最後は後ろ向きに動いている ＝ 終わりの速さ v₁ は負。出だしはかなり速い。' },
  ];
  [
    '<b>v₀ = 3, v₁ = 0</b><br>お手本の点は、最初の間隔がとても広く、最後はつまっている → 出だしが速く、終わりの速さは 0。式は $f(t)=t^3-3t^2+3t=1-(1-t)^3$（easeOutCubic と同じ）。最初の 0.1 秒で約 0.27 進むので、出だしの速さはおよそ 3。',
    '<b>v₀ = 0, v₁ = 3</b><br>ステージ1の逆で、最初がつまり最後が広い。式は $f(t)=t^3$（easeInCubic）。$f\'(t)=3t^2$ なので $f\'(0)=0,\\ f\'(1)=3$。',
    '<b>v₀ = 0, v₁ = 0</b><br>両端がつまって真ん中が広い。式は $f(t)=3t^2-2t^3$（smoothstep）。真ん中 $t=\\tfrac12$ で速さが最大 $f\'(\\tfrac12)=1.5$。',
    '<b>v₀ = 4, v₁ = −1</b><br>ゴールを行き過ぎて戻るので、最後の速さは負。式は $f(t)=t^3-4t^2+4t$。$f\'(t)=3t^2-8t+4=0$ となる $t=\\tfrac23$ で最大値 $f(\\tfrac23)=\\tfrac{32}{27}\\approx1.19$、つまりゴールを約19%行き過ぎてから戻る。',
  ].forEach((t, i) => { EASE_STAGES[i].answer = t; });
  const cubicEase = (v0, v1) => (t) => (v0 + v1 - 2) * t * t * t + (3 - 2 * v0 - v1) * t * t + v0 * t;
  function initGameEase() {
    const root = $id('w-game-ease');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.14, xmax: 1.26, ymin: -1.3, ymax: 1.3, ratio: [0.5, 0.3] });
    const ctl = root.querySelector('.controls');
    const s0 = slider(ctl, { tex: '\\amber{v_0}', min: -2, max: 4, step: 0.1, value: 1, color: 'amber', aria: '出だしの速さ v0' });
    const s1 = slider(ctl, { tex: '\\teal{v_1}', min: -2, max: 4, step: 0.1, value: 1, color: 'teal', aria: '終わりの速さ v1' });
    const B = gameButtons(ctl, '✅ 判定');
    const bPlay = el('button', 'btn', '▶ 動かして比べる');
    bPlay.type = 'button';
    B.bMain.parentElement.prepend(bPlay);
    const conf = Confetti(root, plot);
    const st = { t: 1, play: false, judged: null, bestErr: Infinity };
    const game = GameShell(root, { key: '1-4:game', stages: EASE_STAGES,
      formula: function () {
        // 1行目: v0, v1 を使った式 / 2行目: t の多項式 / 3行目: 初速と終速
        const v0 = s0.get(), v1 = s1.get(), A = C('amber', 'v_0'), V = C('teal', 'v_1');
        return '\\begin{aligned}f(t) &= (' + A + '+' + V + '-2)\\,t^3+(3-2' + A + '-' + V + ')\\,t^2+' + A + '\\,t\\\\' +
          '&= ' + polyTeX([[v0 + v1 - 2, 't^3'], [3 - 2 * v0 - v1, 't^2'], [v0, 't']]) + '\\\\' +
          '&\\text{初速 } f\'(0)=' + A + '=' + C('amber', num(v0)) + ',\\quad \\text{終速 } f\'(1)=' + V + '=' + C('teal', num(v1)) + '\\end{aligned}';
      },
      onStage() { st.judged = null; st.bestErr = Infinity; B.bMain.disabled = false; B.bNext.hidden = true; st.t = 0; st.play = true; anim.kick(); } });
    const target = () => cubicEase(EASE_STAGES[game.k].v[0], EASE_STAGES[game.k].v[1]);
    const mine = () => cubicEase(s0.get(), s1.get());
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt / 2; if (st.t >= 1) { st.t = 1; st.play = false; }
      plot.invalidate(); return st.play;
    });
    bPlay.addEventListener('click', function () { st.t = 0; st.play = true; anim.kick(); });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const ft = target(), fm = mine();
      let e = 0; for (let i = 0; i <= 200; i++) { const t = i / 200; e = Math.max(e, Math.abs(ft(t) - fm(t))); }
      game.used++; game.renderThrows();
      st.judged = { v0: s0.get(), v1: s1.get() }; st.bestErr = Math.min(st.bestErr, e);
      const n = e <= 0.02 ? 3 : e <= 0.06 ? 2 : e <= 0.12 ? 1 : 0;
      if (n > 0) game.award(n);
      const msg = 'ずれ（位置の差の最大）＝ ' + e.toFixed(3) + '　' + (n ? starStr(n) : '★なし');
      if (n === 3) { game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= EASE_STAGES.length - 1; game.result('🎉 ぴったり！ ' + msg, 'hit'); conf.fire(plot.X(1), plot.Y(0)); }
      else if (game.used >= 3) { B.bMain.disabled = true; B.bNext.hidden = game.k >= EASE_STAGES.length - 1; game.result(msg + '　― 判定を使い切りました（記録：' + starStr(game.best[game.k + 1] || 0) + '）', n ? 'hit' : 'miss'); }
      else game.result(msg + (n ? '　もっと近づけられるかも！' : '　まだずれています'), n ? 'hit' : 'miss');
      st.t = 0; st.play = true; anim.kick();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, EASE_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, ft = target(), fm = mine(), t = st.t;
      // 同じ時刻どうしの点を細い線で結び、どの時刻でどれだけずれているかを見せる
      for (let k = 1; k < 10; k++) g.line(ft(k / 10), 0.55, fm(k / 10), -0.55, { color: c.muted, width: 1, dash: [3, 4], alpha: 0.6 });
      [[0.55, 'お手本', ft, c.muted], [-0.55, 'あなた', fm, c.primary]].forEach(function (L0) {
        const y = L0[0], fn = L0[2];
        g.line(0, y, 1, y, { color: c.grid, width: 16 });
        g.line(0, y, 1, y, { color: c.axis, width: 2 });
        g.dot(0, y, { r: 8, ring: true, color: c.muted, lw: 2 }); g.dot(1, y, { r: 8, ring: true, color: c.muted, lw: 2 });
        // 0.1秒ごと(時間を10等分)の位置。あなたの点はスライダーに合わせてその場で動く
        for (let k = 0; k <= 10; k++) g.dot(fn(k / 10), y, { r: 4.5, color: L0[3], stroke: false });
        g.dot(fn(t), y, { r: 13, color: L0[3] });
        g.textPx(L0[1], 8, g.Y(y) - 20, { bold: true, size: 12.5, color: L0[3] });
      });
      g.textPx('スタート', g.X(0), g.h - 10, { align: 'center', size: 12, color: c.muted, bold: true });
      g.textPx('ゴール', g.X(1), g.h - 10, { align: 'center', size: 12, color: c.muted, bold: true });
      g.textPx('小さな点：0.1秒ごとの位置（間隔が広いほど速い）', g.w - 10, 14, { align: 'right', size: 12, color: c.muted, bold: true });
      conf.draw(g);
    };
    s0.on(() => { plot.invalidate(); game.formula(); }); s1.on(() => { plot.invalidate(); game.formula(); });
    game.setStage(0);
  }

  /* ==========================================================
     1.5(4) チャレンジ：曲線をなぞれ
     ========================================================== */
  const TRACE_STAGES = [
    { P: [[1, -2], [3, 3], [7, 3], [9, -2]], name: 'アーチ', text: 'アーチ（山の形）をなぞろう。', hint: '左右対称な山。2つの制御点も左右対称に置くとよい。曲線は制御点より低いところを通る。' },
    { P: [[1, -2], [4, 4], [6, -4], [9, 2]], name: 'S字', text: 'S字の曲線をなぞろう。', hint: '左の端点からは右上へ、右の端点へは下から入ってくる。制御点は曲線の「外側」に置く。' },
    { P: [[7.5, 2.2], [0.6, 4], [0.6, -4], [7.5, -2.2]], name: 'Cの字', text: 'アルファベットの「C」をなぞろう。', hint: '上の端点からは左へ出発する。制御点はかなり左の、上下に大きく離れた位置にある。' },
    { P: [[1, -2], [9.6, 3.6], [0.4, 3.6], [9, -2]], name: 'ループ', text: '1本の3次ベジェ曲線で、輪（ループ）を描こう。', hint: '2つの制御点を「入れ替えて」交差させると輪ができる。左の端点の制御点は右上の遠くに。' },
  ];
  [
    '<b>P₁ = (3, 3), P₂ = (7, 3)</b><br>左右対称な山なので、制御点も左右対称に置く。曲線は制御点より低いところを通り、頂上は高さ $\\tfrac34\\times3+\\tfrac14\\times(-2)=1.75$ になる（$t=\\tfrac12$ の重みは $\\tfrac18,\\tfrac38,\\tfrac38,\\tfrac18$）。',
    '<b>P₁ = (4, 4), P₂ = (6, −4)</b><br>左の端点 (1, −2) からは右上（P₁ の方向）へ出発し、右の端点 (9, 2) へは P₂ の方向（右下）から入ってくる。制御点は曲線の外側の、かなり遠くに置く。',
    '<b>P₁ = (0.6, 4), P₂ = (0.6, −4)</b><br>C の字は、上の端点から左へ出発し、左側で大きく回り込んで下の端点へ戻る。制御点を左の上下に大きく離して置くと、丸みのある C になる。',
    '<b>P₁ = (9.6, 3.6), P₂ = (0.4, 3.6)</b><br>左の端点の制御点を右側に、右の端点の制御点を左側に置いて「交差」させると、曲線が自分自身と交わって輪ができる。3次ベジェ曲線1本でもループが描ける。',
  ].forEach((t, i) => { TRACE_STAGES[i].answer = t; });
  const bez3 = (P, t) => { const u = 1 - t; return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0], u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]]; };
  function initGameTrace() {
    const root = $id('w-game-trace');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 10, equal: true, yc: 0, ratio: [1.0, 0.9] });
    const ctl = root.querySelector('.controls');
    const B = gameButtons(ctl, '✅ 判定');
    const conf = Confetti(root, plot);
    const st = { P: null, err: null };
    const pt = (p) => '(' + num(p[0], 1) + ',\\ ' + num(p[1], 1) + ')';
    const game = GameShell(root, { key: '1-5:game', stages: TRACE_STAGES,
      formula: function () {
        // 1行目: ベルンシュタイン基底による式 / 2・3行目: 制御点の座標を代入した式
        if (!st.P) return '';
        const P = st.P, v = (q) => '(' + num(q[0], 1) + ',\\,' + num(q[1], 1) + ')', P1 = C('amber', '\\boldsymbol{P}_1'), P2 = C('amber', '\\boldsymbol{P}_2');
        return '\\begin{aligned}\\boldsymbol{P}(t) &= (1-t)^3\\boldsymbol{P}_0+3(1-t)^2t\\,' + P1 + '\\\\&\\quad +3(1-t)t^2\\,' + P2 + '+t^3\\boldsymbol{P}_3\\\\' +
          '&= (1-t)^3' + v(P[0]) + '+3(1-t)^2t\\,' + C('amber', v(P[1])) + '\\\\' +
          '&\\quad +3(1-t)t^2\\,' + C('amber', v(P[2])) + '+t^3' + v(P[3]) + '\\end{aligned}';
      },
      onStage(k, S) {
      // 端点はお手本と同じ。制御点は直線上の 1/3, 2/3 の位置から始める
      const a = S.P[0], d = S.P[3];
      st.P = [a.slice(), [a[0] + (d[0] - a[0]) / 3, a[1] + (d[1] - a[1]) / 3], [a[0] + (d[0] - a[0]) * 2 / 3, a[1] + (d[1] - a[1]) * 2 / 3], d.slice()];
      st.err = null; B.bMain.disabled = false; B.bNext.hidden = true; build(); plot.invalidate();
    } });
    function build() {
      plot.handles.length = 0;
      [1, 2].forEach(function (i) {
        plot.addHandle({ get x() { return st.P[i][0]; }, get y() { return st.P[i][1]; }, get color() { return plot.c.amber; }, r: 9,
          label: 'P' + SUB[i], drag(x, y) { st.P[i] = [clamp(x, 0.2, 9.8), clamp(y, plot.ymin + 0.2, plot.ymax - 0.2)]; } });
      });
    }
    function score() {
      const S = TRACE_STAGES[game.k], mine = [];
      for (let i = 0; i <= 200; i++) mine.push(bez3(st.P, i / 200));
      let e = 0;
      for (let i = 0; i <= 60; i++) {
        const q = bez3(S.P, i / 60);
        let m = Infinity; mine.forEach((p) => { m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1])); });
        e = Math.max(e, m);
      }
      return e;
    }
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const e = score(); st.err = e; game.used++; game.renderThrows();
      const n = e <= 0.15 ? 3 : e <= 0.35 ? 2 : e <= 0.7 ? 1 : 0;
      if (n > 0) game.award(n);
      const msg = 'お手本からの最大のずれ ＝ ' + e.toFixed(2) + '　' + (n ? starStr(n) : '★なし');
      if (n === 3) { game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= TRACE_STAGES.length - 1; game.result('✏️ きれいになぞれた！ ' + msg, 'hit'); conf.fire(plot.X(5), plot.Y(0)); }
      else if (game.used >= 3) { B.bMain.disabled = true; B.bNext.hidden = game.k >= TRACE_STAGES.length - 1; game.result(msg + '　― 判定を使い切りました（記録：' + starStr(game.best[game.k + 1] || 0) + '）', n ? 'hit' : 'miss'); }
      else game.result(msg + (n ? '　もう少し近づけられるかも！' : '　まだずれています'), n ? 'hit' : 'miss');
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, TRACE_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c, S = TRACE_STAGES[game.k], ctx = g.ctx;
      g.grid({ step: 1, axes: false, labels: false });
      const guide = []; for (let i = 0; i <= 120; i++) guide.push(bez3(S.P, i / 120));
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      g.poly(guide, { color: c.teal, width: 18, alpha: 0.22 });
      ctx.restore();
      g.poly([st.P[0], st.P[1]], { color: c.muted, width: 1.5, dash: [5, 4] });
      g.poly([st.P[3], st.P[2]], { color: c.muted, width: 1.5, dash: [5, 4] });
      const mine = []; for (let i = 0; i <= 120; i++) mine.push(bez3(st.P, i / 120));
      g.poly(mine, { color: c.primary, width: 4 });
      [st.P[0], st.P[3]].forEach((p) => { ctx.save(); ctx.fillStyle = c.text; ctx.fillRect(g.X(p[0]) - 6, g.Y(p[1]) - 6, 12, 12); ctx.restore(); });
      g.textPx('太い薄緑の線：お手本　青い線：あなたの曲線', 10, 16, { size: 12.5, bold: true, color: c.text });
      game.formula();
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     1.6(3) チャレンジ：未来を予測せよ
     ========================================================== */
  const FUT_STAGES = [
    { name: '売上', f: (x) => 0.6 * x + 0.5, noise: 0.9, seed: 1, text: 'ある店の売上の記録。この先の3日間の売上を予測しよう。', hint: '点はだいたい一直線に並んでいる。高い次数の曲線は、未来の範囲で急に上下に暴れていないかに注目。' },
    { name: '気温', f: (x) => 0.28 * x * x + 0.3 * x - 2.2, noise: 0.5, seed: 23, text: 'ある地点の気温の変化。この先の3回分を予測しよう。', hint: '点の並びは直線ではなく、底のある曲線（放物線）に見える。' },
    { name: '人気', f: (x) => 2.2 * Math.sin(0.55 * x + 0.3), noise: 0.35, seed: 5, text: 'ある動画の人気の移り変わり。この先の3回分を予測しよう。', hint: '上がって下がって…という波がある。何次の多項式なら「波1つ分」を表せる？ 未来の範囲での曲線の動きが自然かも確かめよう。' },
    { name: 'ばらつき', f: () => 1, noise: 2.0, seed: 1, text: '誤差がとても大きいデータ。この先の3回分を予測しよう。', hint: '点が大きくばらついているときは、細かい上下に合わせすぎない方がよい。シンプルなモデル（低い次数）が強い。' },
  ];
  // 1.6 の答えは、そのステージで実際に最も良かった次数を使って表示する
  const FUT_EXPLAIN = [
    'データはほぼ一直線に並んでいるので、<b>1次（直線）</b> が素直な予測になる。次数を上げると過去の点にはよく合うが、未来の範囲で曲線が急に上下し、予測が大きく外れる。',
    'データは底のある曲線に並んでいるので、<b>2次（放物線）</b> が合う。1次では曲がりを表せず、3次以上では未来の範囲で暴れやすい。',
    '上がって下がる「波」があるので、<b>3次程度</b> で波の形を表すとよい。ただし未来は過去のデータの外側なので、どの次数でも予測は難しい。',
    'データのばらつき（誤差）がとても大きい。こういうときは細かい上下を追いかけず、<b>0次（一定）や1次</b> のシンプルなモデルが強い。6次は過去の点を全部通るが、未来では大外れする（過学習）。',
  ];
  function initGameFuture() {
    const root = $id('w-game-future');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 5, ymin: -5, ymax: 6, ratio: [0.85, 0.52] });
    const XP = [-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5], XF = [2.5, 3.5, 4.5];
    const ctl = root.querySelector('.controls');
    const sm = slider(ctl, { tex: 'm', min: 0, max: 6, step: 1, value: 1, color: 'primary', fmt: (v) => v + '次', aria: '次数 m' });
    const B = gameButtons(ctl, '🔮 予測する');
    const conf = Confetti(root, plot);
    const st = { yp: [], yf: [], fits: [], err: [], best: 0, shown: false };
    FUT_STAGES.forEach(function (S, i) {
      S.answer = () => '<b>最も良い次数：' + st.best + '次</b>（このデータで、未来の3点とのずれが最小）<br>' + FUT_EXPLAIN[i];
    });
    const game = GameShell(root, { key: '1-6:game', stages: FUT_STAGES, max: 1, idle: 'まだ予測していません',
      formula: function () {
        const f = st.fits[sm.get()];
        if (!f) return '';
        // 高い次数の係数はとても小さいので、有効数字3桁で表示する
        const sig = (v) => { const t = Number(Math.abs(v).toPrecision(3)); return Math.abs(t) >= 1e-4 ? String(t) : t.toExponential(2).replace(/e([+-]\d+)/, '\\times10^{$1}'); };
        let out = '';
        for (let k = f.coef.length - 1; k >= 0; k--) {
          const c = f.coef[k], body = k === 0 ? '' : k === 1 ? 'x' : 'x^{' + k + '}';
          out += (out ? (c < 0 ? ' - ' : ' + ') : (c < 0 ? '-' : '')) + sig(c) + body;
        }
        return 'P(x) = ' + out;
      },
      onStage(k, S) {
        const rnd = mulberry32(S.seed);
        const ns = () => (rnd() + rnd() + rnd() - 1.5) * S.noise / 1.5;
        st.yp = XP.map((x) => S.f(x) + ns()); st.yf = XF.map((x) => S.f(x) + ns());
        st.fits = []; st.err = [];
        for (let m = 0; m <= 6; m++) {
          const fit = polyfit(XP, st.yp, m); st.fits.push(fit);
          st.err.push(XF.reduce((s, x, i) => s + Math.pow(fit(x) - st.yf[i], 2), 0));
        }
        st.best = st.err.indexOf(Math.min.apply(null, st.err));
        st.shown = false; B.bMain.disabled = false; B.bNext.hidden = true; plot.invalidate();
      } });
    B.bMain.addEventListener('click', function () {
      if (st.shown) return;
      const m = sm.get(), e = st.err[m], eb = st.err[st.best];
      st.shown = true; game.used = 1; game.renderThrows();
      const n = e <= eb * 1.5 + 0.5 ? 3 : e <= eb * 4 + 2 ? 2 : e <= eb * 15 + 6 ? 1 : 0;
      if (n > 0) game.award(n);
      const msg = '予測のずれ（2乗の合計）＝ ' + e.toFixed(2) + '　最も良かった次数は ' + st.best + '次（ずれ ' + eb.toFixed(2) + '）';
      game.result((n === 3 ? '🔮 見事な予測！ ' : n ? '予測完了！ ' : '大きく外れた… ') + starStr(n) + '　' + msg, n ? 'hit' : 'miss');
      B.bMain.disabled = true; B.bNext.hidden = game.k >= FUT_STAGES.length - 1;
      if (n === 3) conf.fire(plot.X(3.5), plot.Y(st.yf[1]));
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, FUT_STAGES.length - 1)));
    sm.on(() => { plot.invalidate(); game.formula(); });
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, fit = st.fits[sm.get()];
      ctx.save(); ctx.fillStyle = c.teal; ctx.globalAlpha = 0.1; ctx.fillRect(g.X(2), 0, g.w - g.X(2), g.h); ctx.restore();
      g.grid({ xlabel: 'x', ylabel: 'y' });
      g.line(2, g.ymin, 2, g.ymax, { color: c.teal, dash: [6, 5], width: 1.5 });
      g.text('過去（見えているデータ）', 0, g.ymax, { dx: -40, dy: 14, align: 'center', size: 12, bold: true, color: c.muted });
      g.text(st.shown ? '未来（公開！）' : '未来（まだ見えない）', 3.5, g.ymax, { dy: 14, align: 'center', size: 12, bold: true, color: c.teal });
      if (fit) g.fn(fit, { x0: -5, x1: 5, color: c.primary, width: 4 });
      XP.forEach((x, i) => g.dot(x, st.yp[i], { r: 6, color: c.text }));
      if (st.shown) {
        XF.forEach(function (x, i) { g.line(x, st.yf[i], x, fit(x), { color: c.accent, width: 2.5 }); g.dot(x, st.yf[i], { r: 7, color: c.accent }); });
        st.fits[st.best] && g.fn(st.fits[st.best], { x0: -5, x1: 5, color: c.muted, width: 2, dash: [6, 5] });
      } else XF.forEach((x) => g.text('?', x, 0, { align: 'center', size: 18, bold: true, color: c.teal }));
      g.textPx('青い線：あなたの予測（' + sm.get() + '次）' + (st.shown ? '　灰色の点線：最も良かった次数' : ''), 10, g.h - 12, { size: 12.5, bold: true, color: c.primary });
      conf.draw(g);
    };
    game.setStage(0);
  }

  function boot() {
    // 図が置かれているものだけ初期化する(章ごとのページでも共通で使えるように)
    [[initLinear, 'w-linear'], [initLerp, 'w-lerp'], [initReg, 'w-reg'], [initUiDemo, 'w-uidemo'], [initHeart, 'w-heart'], [initLagMini, 'w-lagmini'], [initShift, 'w-shift'], [initQuad, 'w-quad'], [initBall, 'w-ball'], [initGame, 'w-game'], [initGameLine, 'w-game-line'], [initGameParab, 'w-game-parab'], [initGameEase, 'w-game-ease'], [initGameTrace, 'w-game-trace'], [initGameFuture, 'w-game-future'], [initRace, 'w-race'],
      [initDesign, 'w-design'], [initDC, 'w-dc'], [initBezier, 'w-bezier'], [initCssBezier, 'w-cssbezier'], [initLagrange, 'w-lag'], [initFit, 'w-fit']].forEach(function (e) {
      if (!$id(e[1])) return;
      try { e[0](); } catch (err) { console.error(e[0].name, err); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
