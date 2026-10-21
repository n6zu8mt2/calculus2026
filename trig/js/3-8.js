/* 第3章 3.8節 波を足す — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 *
 * この節だけの部品
 *   loopVoice(fill, dur, amp)  … 1秒の波をくり返し鳴らす（位相をきちんと決めたいとき。周波数が整数なら継ぎ目なし）
 *   soundGuard(root, stop)     … 図が画面の外に出た・タブが隠れた・ページを離れたら音（マイク）を止める
 *   sndButton(...)             … 「▶ 鳴らす／■ 止める」のボタン（音が使えない環境ではメッセージだけ）
 *   SERIES                     … 矩形波・のこぎり波・三角波の係数 b_n と TeX
 *   noteName(f)                … 周波数 → 音名（ラ = 440 Hz からの半音の数とセント）
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = T.R, tex = T.tex, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * Math.PI;
  const C = (c, s) => '\\' + c + '{' + s + '}';
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const NOAUDIO = 'この端末（ブラウザ）では音を出せません。図と説明はそのまま使えます。';
  const SOUND_NOTE = '🔊 音が出ます（音量に注意）。ボタンを押したときだけ鳴り、図が画面の外に出ると止まります。';

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
  function setMsg(node, t) { if (node) node.textContent = t || ''; }

  // 周波数 → 音名
  const NOTE_JA = ['ラ', 'ラ♯', 'シ', 'ド', 'ド♯', 'レ', 'レ♯', 'ミ', 'ファ', 'ファ♯', 'ソ', 'ソ♯'];
  const NOTE_EN = ['A', 'A♯', 'B', 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯'];
  function noteName(f) {
    const n = 12 * Math.log2(f / 440), k = Math.round(n), i = ((k % 12) + 12) % 12;
    return { ja: NOTE_JA[i], en: NOTE_EN[i] + (4 + Math.floor((k + 9) / 12)), cents: Math.round(100 * (n - k)) };
  }
  const hzTeX = (f, d) => num(f, d == null ? 0 : d) + '\\ \\text{Hz}';

  /* ---------- 音 ---------- */
  // fill(left, right, sampleRate) で dur 秒の波を作り、くり返し鳴らす
  function loopVoice(fill, dur, amp, sync) {
    const A = T.Audio, a = A.ctx();
    if (!a || !A._master) return null;
    const sr = a.sampleRate, n = Math.round(sr * dur);
    const buf = a.createBuffer(2, n, sr);
    fill(buf.getChannelData(0), buf.getChannelData(1), sr);
    const src = a.createBufferSource(), g = a.createGain(), t = a.currentTime;
    src.buffer = buf; src.loop = true;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.04);
    src.connect(g); g.connect(A._master);
    const t0 = sync ? sync.t0 : t;                       // 前の音と同じ位置から続ける
    src.start(t, ((t - t0) % dur + dur) % dur);
    return {
      t0, ctx: a, dur,
      pos() { return (((a.currentTime - t0) % dur) + dur) % dur; },
      stop() {
        const now = a.currentTime;
        try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.05); src.stop(now + 0.08); } catch (e) { /* noop */ }
      },
    };
  }
  // 画面外・非表示・ページを離れるときに止める
  function soundGuard(root, stop) {
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { if (!es[0].isIntersecting) stop(); }).observe(root);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
  }
  // ▶/■ のトグル。start() は成功なら true
  function sndButton(btn, msg, labels, start, stop) {
    const st = { on: false };
    const show = () => { btn.textContent = st.on ? labels[1] : labels[0]; btn.classList.toggle('primary', !st.on); };
    btn.addEventListener('click', function () {
      if (st.on) { st.on = false; stop(); show(); return; }
      let ok = false;
      try { ok = start(); } catch (e) { ok = false; }
      if (!ok) { setMsg(msg, NOAUDIO); return; }
      setMsg(msg, ''); st.on = true; show();
    });
    show();
    return { st, off() { if (st.on) { st.on = false; stop(); show(); } }, show };
  }
  const hasAudio = () => !!(window.AudioContext || window.webkitAudioContext);

  /* ---------- フーリエ級数の係数 ---------- */
  const SERIES = {
    square: {
      label: '矩形波', b: (n) => (n % 2 ? 4 / (n * PI) : 0), f: (x) => { const m = ((x % TAU) + TAU) % TAU; return m < PI ? 1 : -1; },
      nth: (k) => 2 * k - 1, pre: '\\frac{4}{\\pi}', term: (n, first) => (first ? '' : '+') + (n === 1 ? '\\sin x' : '\\frac{\\sin ' + n + 'x}{' + n + '}'),
      jump: true,
    },
    saw: {
      label: 'のこぎり波', b: (n) => (n % 2 ? 2 : -2) / (n * PI), f: (x) => { const m = ((x + PI) % TAU + TAU) % TAU; return (m - PI) / PI; },
      nth: (k) => k, pre: '\\frac{2}{\\pi}', term: (n, first) => (first ? '' : n % 2 ? '+' : '-') + (n === 1 ? '\\sin x' : '\\frac{\\sin ' + n + 'x}{' + n + '}'),
      jump: true,
    },
    tri: {
      label: '三角波', b: (n) => (n % 2 ? ((n - 1) / 2 % 2 ? -8 : 8) / (n * n * PI * PI) : 0),
      f: (x) => { const m = ((x % TAU) + TAU) % TAU; return m < PI / 2 ? m / (PI / 2) : m < 3 * PI / 2 ? 2 - m / (PI / 2) : m / (PI / 2) - 4; },
      nth: (k) => 2 * k - 1, pre: '\\frac{8}{\\pi^2}', term: (n, first) => (first ? '' : ((n - 1) / 2 % 2 ? '-' : '+')) + (n === 1 ? '\\sin x' : '\\frac{\\sin ' + n + 'x}{' + n + '^2}'),
      jump: false,
    },
  };
  const KINDS = ['square', 'saw', 'tri'];
  // 最初の N 項（0 でない項）までの和
  function partial(S, N) {
    const hs = [];
    for (let k = 1; k <= N; k++) { const n = S.nth(k); hs.push([n, S.b(n)]); }
    return { hs, f: (x) => { let s = 0; for (const h of hs) s += h[1] * Math.sin(h[0] * x); return s; } };
  }
  function seriesTeX(S, N) {
    const ns = [];
    for (let k = 1; k <= N; k++) ns.push(S.nth(k));
    let body;
    if (N <= 4) body = ns.map((n, i) => S.term(n, i === 0)).join('');
    else body = ns.slice(0, 3).map((n, i) => S.term(n, i === 0)).join('') + '+\\cdots' + S.term(ns[N - 1], false).replace(/^[+]/, '+').replace(/^-/, '-');
    if (N === 1) return 'y=' + S.pre + '\\sin x';
    return 'y=' + S.pre + '\\left(' + body + '\\right)';
  }
  // 倍音の大きさ [b1, b2, …] → PeriodicWave 用の配列 [0, b1, b2, …]
  function waveOf(amps) { return T.Audio.periodic([0].concat(amps)); }

  /* ---------- 共通：時間の軸（ms） ---------- */
  function msAxes(g, o) {
    const c = g.c, step = o.step;
    g.grid({ stepX: step, stepY: o.stepY || 1, labels: false, xlabel: '', ylabel: '' });
    let m = 1;
    while (g.pxPerX * step * m < 40) m++;
    const y0 = g.Y(0);
    for (let i = 1; i * step <= g.xmax - step * 0.3; i++) {
      if (i % m || g.X(i * step) > g.w - 44) continue;
      g.texPx(num(i * step, 2), g.X(i * step), y0 + 4, { align: 'center', valign: 'top', size: 12, color: c.muted });
    }
    const inR = g.X(0) < 24;
    (o.yt || [1, -1]).forEach((v) => g.texPx(num(v), inR ? g.X(0) + 4 : g.X(0) - 5, g.Y(v), { align: inR ? 'left' : 'right', valign: inR ? 'bottom' : 'middle', size: 12, color: c.muted }));
    g.texPx(o.xlabel || 't\\,(\\text{ms})', g.w - 4, y0 + 3, { align: 'right', valign: 'top', size: 14, color: c.muted });
    g.texPx('y', g.X(0) + (inR ? 24 : 6), 4, { align: 'left', valign: 'top', size: 14, color: c.muted });
  }
  // π 目盛りの軸
  function piAxes(g, o) {
    o = o || {};
    const c = g.c, H = PI / 2;
    g.grid({ stepX: H, stepY: o.stepY || 1, labels: false, xlabel: '', ylabel: '' });
    let m = 1;
    while (g.pxPerX * H * m < 38) m *= 2;
    const y0 = g.Y(0);
    for (let i = 1; i * H <= g.xmax - 0.2; i++) {
      if (i % m || g.X(i * H) > g.w - 30) continue;
      g.texPx(T.radTeX(i * H), g.X(i * H), y0 + 4, { align: 'center', valign: 'top', size: 12, color: c.muted });
    }
    const inR = g.X(0) < 24;
    (o.yt || [1, -1]).forEach((v) => g.texPx(num(v), inR ? g.X(0) + 4 : g.X(0) - 5, g.Y(v), { align: inR ? 'left' : 'right', valign: inR ? 'bottom' : 'middle', size: 12, color: c.muted }));
    g.texPx('x', g.w - 4, y0 + 3, { align: 'right', valign: 'top', size: 14, color: c.muted });
    g.texPx('y', g.X(0) + (inR ? 24 : 6), 4, { align: 'left', valign: 'top', size: 14, color: c.muted });
  }

  /* ==========================================================
     3.8(1) 純音
     ========================================================== */
  function initTone() {
    const root = $id('w-tone');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.8, xmax: 10.4, ymin: -1.3, ymax: 1.3, ratio: [0.62, 0.36] });
    T.permBox(root.querySelector('.panel.snd'), SOUND_NOTE);
    const st = { k: 24, A: 0.6 };              // k: 110 Hz からの半音の数
    const fq = () => 110 * Math.pow(2, st.k / 12);
    const ctl = root.querySelector('.controls');
    const sF = slider(ctl, { tex: '\\amber{f}', min: 0, max: 48, step: 1, value: st.k, color: 'amber', aria: '周波数 f（半音ずつ、110〜1760 Hz）', fmt: (k) => num(110 * Math.pow(2, k / 12), 0) + ' Hz' });
    const sA = slider(ctl, { tex: '\\violet{A}', min: 0, max: 1, step: 0.05, value: st.A, color: 'violet', aria: '振幅 A' });
    const PRE = [{ label: '110 Hz', k: 0 }, { label: '220 Hz', k: 12 }, { label: '440 Hz', k: 24 }, { label: '880 Hz', k: 36 }, { label: '1760 Hz', k: 48 }];
    const pre = chipRow(R(root, 'presets'), PRE, 2, (it) => { st.k = it.k; sF.set(st.k); update(); });
    sF.on((k) => { st.k = k; unpress(pre); const i = PRE.findIndex((p) => p.k === k); if (i >= 0) pre[i].setAttribute('aria-pressed', 'true'); update(); });
    sA.on((v) => { st.A = v; update(); });
    let voice = null;
    const btn = sndButton(R(root, 'play'), R(root, 'amsg'), ['▶ 鳴らす', '■ 止める'],
      function () { if (!hasAudio()) return false; voice = T.Audio.tone({ freq: fq(), amp: 0.5 * st.A }); return !!(voice && voice.osc); },
      function () { if (voice) voice.stop(); voice = null; });
    soundGuard(root, () => btn.off());
    function update() {
      const f = fq(), nm = noteName(f), per = 1 / f;
      if (voice) voice.set({ freq: f, amp: 0.5 * st.A });
      tex(root, 'eq', 'y=' + C('violet', num(st.A, 2)) + '\\sin(2\\pi\\cdot' + C('amber', num(f, f < 1000 ? 1 : 0)) + '\\,t)');
      tex(root, 'f', C('amber', 'f') + '=' + hzTeX(f, 1) + '\\quad\\text{（' + nm.ja + '・' + nm.en + '）}');
      tex(root, 'per', 'T=\\frac{1}{f}=\\frac{1}{' + num(f, 1) + '}\\approx' + num(per * 1000, 3) + '\\ \\text{ms}');
      R(root, 'how').textContent = '10 ミリ秒の間に ' + num(f / 100, 1) + ' 回ふるえる。1 オクターブ上（×2）にすると、波の数が 2 倍になる。振幅 A を変えても、波の数（高さ）は変わらない。';
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, f = fq(), A = st.A, Tms = 1000 / f;
      msAxes(g, { step: 1, yt: [1, -1] });
      g.fn((t) => (t < 0 ? NaN : A * Math.sin(2 * PI * f * t / 1000)), { color: c.accent, width: 3, samples: Math.max(400, g.w * 2) });
      // 周期 T（最初の 1 回分）
      const yb = -Math.max(A, 0.15) - 0.12;
      if (Tms < 10) {
        g.line(0, yb, Tms, yb, { color: c.amber, width: 2.5 });
        g.line(0, yb - 0.07, 0, yb + 0.07, { color: c.amber, width: 2.5 });
        g.line(Tms, yb - 0.07, Tms, yb + 0.07, { color: c.amber, width: 2.5 });
        g.tex('T', Tms, yb, { color: c.amber, size: 15, align: 'left', dx: 6, avoid: true });
      }
      // 振幅
      if (A > 0.04) {
        const xa = Tms / 4 + (Tms < 1.2 ? Tms * Math.ceil(1.2 / Tms) : 0);
        g.arrow(xa, 0, xa, A, { color: c.violet, width: 2.5, head: 10 });
        g.tex('A', xa, A, { color: c.violet, size: 15, align: 'left', dx: 6, dy: -4, avoid: true });
      }
    };
    update();
  }

  /* ==========================================================
     3.8(2) うなり
     ========================================================== */
  function initBeat() {
    const root = $id('w-beat');
    const cvs = root.querySelectorAll('canvas');
    const pz = new Plot(cvs[0], { xmin: -1.2, xmax: 20.4, ymin: -2.4, ymax: 2.4, height: (w) => clamp(w * 0.36, 150, 230) });
    const pl = new Plot(cvs[1], { xmin: -0.06, xmax: 1.13, ymin: -2.6, ymax: 2.6, height: (w) => clamp(w * 0.36, 150, 230) });
    const capZ = root.querySelector('.stage .cap');
    const fitZ = () => { const narrow = pz.w < 520; pz.setView({ xmin: narrow ? -0.7 : -1.2, xmax: narrow ? 10.3 : 20.4 }); capZ.textContent = '最初の ' + (narrow ? 10 : 20) + ' ミリ秒（拡大）'; };
    pz.onResize = fitZ; fitZ();
    T.permBox(root.querySelector('.panel.snd'), SOUND_NOTE);
    const st = { f1: 440, f2: 444, stereo: false };
    const ctl = root.querySelector('.controls');
    const s1 = slider(ctl, { tex: '\\red{f_1}', min: 420, max: 460, step: 1, value: st.f1, color: 'accent', aria: '1つ目の周波数 f1', fmt: (v) => v + ' Hz' });
    const s2 = slider(ctl, { tex: '\\teal{f_2}', min: 420, max: 460, step: 1, value: st.f2, color: 'teal', aria: '2つ目の周波数 f2', fmt: (v) => v + ' Hz' });
    const PRE = [{ label: '440 と 441', v: [440, 441] }, { label: '440 と 444', v: [440, 444] }, { label: '440 と 450', v: [440, 450] }, { label: '440 と 440', v: [440, 440] }];
    const pre = chipRow(R(root, 'presets'), PRE, 1, (it) => { [st.f1, st.f2] = it.v; s1.set(st.f1); s2.set(st.f2); update(); });
    s1.on((v) => { st.f1 = v; unpress(pre); update(); });
    s2.on((v) => { st.f2 = v; unpress(pre); update(); });
    R(root, 'stereo').addEventListener('change', (e) => { st.stereo = e.target.checked; update(); });
    let voice = null, pend = 0;
    const make = (sync) => loopVoice(function (l, r, sr) {
      const w1 = TAU * st.f1 / sr, w2 = TAU * st.f2 / sr;
      for (let i = 0; i < l.length; i++) {
        const a = Math.sin(w1 * i), b = Math.sin(w2 * i);
        if (st.stereo) { l[i] = 0.4 * a; r[i] = 0.4 * b; } else { l[i] = r[i] = 0.25 * (a + b); }
      }
    }, 1, 1, sync);
    const anim = L.animate(root, function () { pl.invalidate(); return !!voice; });
    const btn = sndButton(R(root, 'play'), R(root, 'amsg'), ['▶ 鳴らす', '■ 止める'],
      function () { voice = make(); if (voice) anim.kick(); return !!voice; },
      function () { if (voice) voice.stop(); voice = null; pl.invalidate(); });
    soundGuard(root, () => btn.off());
    function refresh() {
      if (!voice || pend) return;
      pend = requestAnimationFrame(() => { pend = 0; if (!voice) return; const old = voice; voice = make(old); old.stop(); });
    }
    function update() {
      const d = Math.abs(st.f1 - st.f2), s = st.f1 + st.f2;
      tex(root, 'beat', '|' + C('red', 'f_1') + '-' + C('teal', 'f_2') + '|=' + C('amber', d) + '\\ \\text{回/秒}');
      tex(root, 'eq', '\\begin{aligned}&' + C('red', '\\sin(' + 2 * st.f1 + '\\pi t)') + '+' + C('teal', '\\sin(' + 2 * st.f2 + '\\pi t)') +
        '\\\\&=' + C('amber', d ? '2\\cos(' + (d === 1 ? '' : d) + '\\pi t)' : '2') + '\\cdot\\sin(' + s + '\\pi t)\\end{aligned}');
      R(root, 'how').textContent = d === 0 ? '同じ周波数なので、山と山がいつも重なり、大きさ2倍のまま。うなりはない（チューニングが合った状態）。'
        : d > 20 ? '差が大きくなると、うなりが速すぎて「ゆれ」ではなく、ざらざらした音に聞こえる。'
          : '1秒間に ' + d + ' 回、音が大きく（山と山が重なる）・小さく（山と谷が重なる）なる。金色の点線が音の大きさ。';
      pz.invalidate(); pl.invalidate();
      refresh();
    }
    pz.draw = function (g) {
      const c = g.c, w1 = TAU * st.f1 / 1000, w2 = TAU * st.f2 / 1000, n = Math.max(500, g.w * 2);
      msAxes(g, { step: g.xmax < 15 ? 1 : 2, yt: [2, 1, -1, -2] });
      g.fn((t) => (t < 0 ? NaN : Math.sin(w1 * t)), { color: c.accent, width: 1.6, alpha: 0.8, samples: n });
      g.fn((t) => (t < 0 ? NaN : Math.sin(w2 * t)), { color: c.teal, width: 1.6, alpha: 0.8, samples: n });
      g.fn((t) => (t < 0 ? NaN : Math.sin(w1 * t) + Math.sin(w2 * t)), { color: c.violet, width: 3, samples: n });
    };
    pl.draw = function (g) {
      const c = g.c, ctx = g.ctx, w1 = TAU * st.f1, w2 = TAU * st.f2, d = Math.abs(st.f1 - st.f2);
      g.grid({ stepX: 0.1, stepY: 1, labels: false, xlabel: '', ylabel: '' });
      [0.2, 0.4, 0.6, 0.8, 1].forEach((v) => g.texPx(num(v, 1), g.X(v), g.Y(0) + 4, { align: 'center', valign: 'top', size: 12, color: c.muted }));
      g.texPx('t\\,(\\text{秒})', g.w - 4, g.Y(0) + 3, { align: 'right', valign: 'top', size: 14, color: c.muted });
      // 和の波（細かすぎるので、1ピクセルごとに最大・最小を縦線で）
      ctx.save(); ctx.strokeStyle = c.violet; ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.beginPath();
      const x0 = Math.ceil(g.X(0)), x1 = Math.floor(g.X(1));
      for (let px = x0; px <= x1; px++) {
        const ta = g.ix(px), tb = g.ix(px + 1);
        let lo = Infinity, hi = -Infinity;
        for (let j = 0; j <= 8; j++) { const t = ta + (tb - ta) * j / 8, y = Math.sin(w1 * t) + Math.sin(w2 * t); if (y < lo) lo = y; if (y > hi) hi = y; }
        ctx.moveTo(px + 0.5, g.Y(hi)); ctx.lineTo(px + 0.5, g.Y(lo));
      }
      ctx.stroke(); ctx.restore();
      // 大きさ ±|2cos(π(f1−f2)t)|
      const env = (t) => (t < 0 || t > 1 ? NaN : Math.abs(2 * Math.cos(PI * d * t)));
      g.fn(env, { color: c.amber, width: 2.2, dash: [6, 4], samples: 600 });
      g.fn((t) => -env(t), { color: c.amber, width: 2.2, dash: [6, 4], samples: 600 });
      // 1回のうなり
      if (d >= 1 && d <= 12) {
        const tb = 1 / d, y = 2.3;
        g.line(0, y, tb, y, { color: c.amber, width: 2.5 });
        g.line(0, y - 0.15, 0, y + 0.15, { color: c.amber, width: 2.5 });
        g.line(tb, y - 0.15, tb, y + 0.15, { color: c.amber, width: 2.5 });
        g.tex('\\frac{1}{' + d + '}\\,\\text{秒}', tb / 2, y, { color: c.amber, size: 13, align: 'center', valign: 'top', dy: 4, avoid: true });
      }
      if (voice) {
        const t = voice.pos();
        g.line(t, g.ymin, t, g.ymax, { color: c.text, width: 1.5, alpha: 0.7 });
      }
    };
    update();
  }

  /* ==========================================================
     3.8(2) 逆位相
     ========================================================== */
  function initCancel() {
    const root = $id('w-cancel');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -0.5, xmax: 4 * PI + 0.3, ymin: -2.4, ymax: 2.4, ratio: [0.7, 0.4] });
    T.permBox(root.querySelector('.panel.snd'), SOUND_NOTE);
    const st = { k: 6, stereo: false };          // φ = kπ/12
    const phi = () => st.k * PI / 12;
    const ctl = root.querySelector('.controls');
    const sP = slider(ctl, { tex: '\\teal{\\varphi}', min: 0, max: 24, step: 1, value: st.k, color: 'teal', aria: '位相のずれ φ（π/12 ごと）', fmt: (k) => (k * 15) + '°' });
    sP.on((k) => { st.k = k; update(); });
    R(root, 'stereo').addEventListener('change', (e) => { st.stereo = e.target.checked; update(); });
    const F = 300;
    let voice = null, pend = 0;
    const make = (sync) => loopVoice(function (l, r, sr) {
      const w = TAU * F / sr, p = phi();
      for (let i = 0; i < l.length; i++) {
        const a = Math.sin(w * i), b = Math.sin(w * i + p);
        if (st.stereo) { l[i] = 0.4 * a; r[i] = 0.4 * b; } else { l[i] = r[i] = 0.25 * (a + b); }
      }
    }, 1, 1, sync);
    const btn = sndButton(R(root, 'play'), R(root, 'amsg'), ['▶ 鳴らす（300 Hz）', '■ 止める'],
      function () { voice = make(); return !!voice; },
      function () { if (voice) voice.stop(); voice = null; });
    soundGuard(root, () => btn.off());
    function refresh() {
      if (!voice || pend) return;
      pend = requestAnimationFrame(() => { pend = 0; if (!voice) return; const old = voice; voice = make(old); old.stop(); });
    }
    function update() {
      const p = phi(), amp = Math.abs(2 * Math.cos(p / 2));
      tex(root, 'phi', C('teal', '\\varphi') + '=' + T.angleTeX(p));
      const k = st.k <= 12 ? st.k : 24 - st.k;
      const exT = ({ 0: '2', 4: '\\sqrt3', 6: '\\sqrt2', 8: '1', 12: '0' })[k] || null;
      tex(root, 'amp', '\\left|2\\cos\\frac{' + C('teal', '\\varphi') + '}{2}\\right|=' + (exT ? exT + (exT.indexOf('sqrt') >= 0 ? '\\approx' + num(amp, 2) : '') : '\\approx' + num(amp, 2)));
      R(root, 'how').textContent = st.k === 12 ? (st.stereo ? '逆位相。でも左右の耳に分けているので、空気の中では足されず、音は消えない。' : '逆位相：山と谷がちょうど逆なので、和はいつも 0。音が消える！')
        : st.k === 0 || st.k === 24 ? '山と山がそろっているので、強め合って振幅 2 倍。'
          : st.k < 12 ? 'ずれが π に近づくほど、和（青）は小さくなる。' : 'π をこえると、また強め合いにもどっていく（2π で 1 周）。';
      plot.invalidate();
      refresh();
    }
    plot.draw = function (g) {
      const c = g.c, p = phi();
      piAxes(g, { yt: [2, 1, -1, -2] });
      g.fn((x) => (x < 0 ? NaN : Math.sin(x)), { color: c.accent, width: 2, alpha: 0.85 });
      g.fn((x) => (x < 0 ? NaN : Math.sin(x + p)), { color: c.violet, width: 2, alpha: 0.85, dash: [7, 5] });
      g.fn((x) => (x < 0 ? NaN : Math.sin(x) + Math.sin(x + p)), { color: c.primary, width: 4 });
      g.texPx('\\red{\\sin x}\\quad\\violet{\\sin(x+\\varphi)}\\quad\\blue{\\text{和}}', g.w - 8, 6, { align: 'right', valign: 'top', size: 13 });
    };
    update();
  }

  /* ==========================================================
     3.8(3) フーリエ級数
     ========================================================== */
  function initFourier() {
    const root = $id('w-fourier');
    const cvs = root.querySelectorAll('canvas');
    const pw = new Plot(cvs[0], { xmin: -0.5, xmax: 4 * PI + 0.3, ymin: -1.6, ymax: 1.6, ratio: [0.62, 0.38] });
    const ps = new Plot(cvs[1], { xmin: -0.6, xmax: 31, ymin: -0.25, ymax: 1.5, height: (w) => clamp(w * 0.24, 110, 160) });
    T.permBox(root.querySelector('.panel.snd'), SOUND_NOTE);
    const st = { kind: 'square', N: 3 };
    const ctl = root.querySelector('.controls');
    const sN = slider(ctl, { tex: 'N', min: 1, max: 50, step: 1, value: st.N, color: 'primary', aria: '足す項の数 N' });
    sN.on((v) => { st.N = v; update(); });
    chipRow(R(root, 'kind'), KINDS.map((k) => ({ label: SERIES[k].label, k })), 0, (it) => { st.kind = it.k; update(); });
    let voice = null;
    const amps = () => { const S = SERIES[st.kind], top = S.nth(st.N), a = []; for (let n = 1; n <= top; n++) a.push(S.b(n)); return a; };
    const btn = sndButton(R(root, 'play'), R(root, 'amsg'), ['🔊 聞いてみる（220 Hz）', '■ 止める'],
      function () { if (!hasAudio()) return false; voice = T.Audio.tone({ freq: 220, amp: 0.4, wave: waveOf(amps()) }); return !!(voice && voice.osc); },
      function () { if (voice) voice.stop(); voice = null; });
    soundGuard(root, () => btn.off());
    let cur = partial(SERIES.square, 3);
    function update() {
      const S = SERIES[st.kind], top = S.nth(st.N);
      cur = partial(S, st.N);
      if (voice) voice.set({ wave: waveOf(amps()) });
      tex(root, 'eq', (root.clientWidth >= 520 ? '\\displaystyle ' : '') + seriesTeX(S, st.N));
      ps.setView({ ymin: st.kind === 'saw' ? -0.85 : -0.25, ymax: st.kind === 'tri' ? 1.05 : 1.5 });
      tex(root, 'top', '\\sin ' + (top === 1 ? '' : top) + 'x\\ (' + hzTeX(220 * top) + ')');
      let e = 0;
      for (let i = 0; i < 2000; i++) { const x = TAU * (i + 0.5) / 2000, d = cur.f(x) - S.f(x); e += d * d; }
      e = Math.sqrt(e / 2000);
      tex(root, 'err', '\\text{平均 } ' + num(e, 3) + '\\quad(N=' + st.N + ')');
      const how = st.kind === 'tri' ? '三角波は係数が 1/n² で小さくなるので、N = 3 くらいでもう見分けがつかない。'
        : st.N === 1 ? 'N = 1 はただの sin。N を増やして、角ばっていく様子を見よう。'
          : st.N < 10 ? '金色の細い線が、いま最後に足した項。小さい波を足すたびに、角に近づく。'
            : '角のすぐ近くで目標より飛び出している（ギブズ現象）。N を増やしても飛び出しの高さは約 9% のまま、幅だけ細くなる。';
      R(root, 'how').textContent = how;
      pw.invalidate(); ps.invalidate();
    }
    pw.draw = function (g) {
      const c = g.c, S = SERIES[st.kind], n = Math.max(600, g.w * 3);
      piAxes(g, { yt: [1, -1] });
      if (S.jump) {
        const ctx = g.ctx; ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.globalAlpha = 0.8; ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const x = 4 * PI * i / n, y = S.f(x), px = g.X(x), py = g.Y(y);
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.stroke(); ctx.restore();
      } else g.fn((x) => (x < 0 ? NaN : S.f(x)), { color: c.muted, width: 2.5, dash: [6, 5], alpha: 0.8 });
      if (st.N > 1) {
        const h = cur.hs[cur.hs.length - 1];
        g.fn((x) => (x < 0 ? NaN : h[1] * Math.sin(h[0] * x)), { color: c.amber, width: 1.5, alpha: 0.9, samples: n });
      }
      g.fn((x) => (x < 0 ? NaN : cur.f(x)), { color: c.primary, width: 3, samples: n });
      if (st.kind === 'square' && st.N >= 6) {
        g.line(0, 1.179, 4 * PI, 1.179, { color: c.accent, width: 1.2, dash: [3, 4], alpha: 0.8 });
        g.tex('1.18', 4 * PI, 1.179, { color: c.accent, size: 12, align: 'right', valign: 'bottom', dy: -2, avoid: true });
      }
    };
    ps.draw = function (g) {
      const c = g.c, ctx = g.ctx, S = SERIES[st.kind], top = S.nth(st.N), bw = Math.max(2, g.pxPerX * 0.6);
      ctx.save(); ctx.strokeStyle = c.axis; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(g.X(0.3), g.Y(0)); ctx.lineTo(g.w, g.Y(0)); ctx.stroke(); ctx.restore();
      for (let n = 1; n <= 30; n++) {
        const b = S.b(n);
        if (Math.abs(b) < 1e-12) continue;
        const px = g.X(n) - bw / 2, y0 = g.Y(0), y1 = g.Y(b);
        ctx.save();
        if (n <= top) { ctx.fillStyle = b >= 0 ? c.primary : c.accent; ctx.fillRect(px, Math.min(y0, y1), bw, Math.abs(y1 - y0)); }
        else { ctx.strokeStyle = c.muted; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, Math.min(y0, y1) + 0.5, bw - 1, Math.max(1, Math.abs(y1 - y0) - 1)); }
        ctx.restore();
      }
      [1, 5, 10, 15, 20, 25, 30].forEach((n) => g.texPx(String(n), g.X(n), g.Y(0) + 4, { align: 'center', valign: 'top', size: 12, color: c.muted }));
      g.texPx('n', g.w - 4, g.Y(0) - 4, { align: 'right', valign: 'bottom', size: 14, color: c.muted });
      g.texPx('b_1=' + num(S.b(1), 3), g.X(1) + bw, g.Y(S.b(1)), { align: 'left', valign: 'top', dx: 4, size: 13, color: c.primary });
    };
    update();
  }

  /* ==========================================================
     3.8(4) 回転円（エピサイクル）
     ========================================================== */
  function initEpi() {
    const root = $id('w-epi');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.6, 0.42] });
    const st = { kind: 'square', N: 3, th: 0, play: !L.reduceMotion };
    const ctl = root.querySelector('.controls');
    const sN = slider(ctl, { tex: 'N', min: 1, max: 20, step: 1, value: st.N, color: 'primary', aria: '円の数 N' });
    sN.on((v) => { st.N = v; update(); });
    chipRow(R(root, 'kind'), KINDS.map((k) => ({ label: SERIES[k].label, k })), 0, (it) => { st.kind = it.k; update(); });
    const bP = R(root, 'pause');
    const showP = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    bP.addEventListener('click', () => { st.play = !st.play; showP(); if (st.play) anim.kick(); });
    showP();
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.th += dt * 1.4;
      plot.invalidate();
      return true;
    });
    let cur = partial(SERIES.square, 3);
    function update() {
      const S = SERIES[st.kind];
      cur = partial(S, st.N);
      const h = cur.hs, r1 = Math.abs(h[0][1]), r2 = h[1] ? Math.abs(h[1][1]) : 0;
      tex(root, 'circ', 'N=' + st.N + '\\ \\text{個}');
      R(root, 'how').textContent = 'いちばん大きい円の半径 ' + num(r1, 3) + (h[1] ? '、次の円は半径 ' + num(r2, 3) + '（' + h[1][0] + ' 倍の速さ）' : '') + '。左：円の先に円をつないで回す。いちばん先の点の高さ＝それぞれの円の高さの和。右：その高さを時間とともに記録したグラフ（新しいものほど左）。';
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, W = g.w, Hh = g.h, narrow = W < 520;
      const unit = Math.min(Hh * 0.28, W * (narrow ? 0.12 : 0.1));
      const cx = 1.35 * unit + 8, cy = Hh / 2, x0 = cx + 1.4 * unit + 18;
      const pxPerRad = (W - x0 - 10) / (2.2 * PI);
      // 波の領域の軸
      ctx.save(); ctx.strokeStyle = c.axis; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(x0, cy); ctx.lineTo(W - 6, cy); ctx.moveTo(x0, cy - unit * 1.45); ctx.lineTo(x0, cy + unit * 1.45); ctx.stroke();
      ctx.strokeStyle = c.grid; ctx.setLineDash([3, 4]); ctx.beginPath();
      [-1, 1].forEach((v) => { ctx.moveTo(x0, cy - v * unit); ctx.lineTo(W - 6, cy - v * unit); });
      ctx.stroke(); ctx.restore();
      g.texPx('1', x0 - 5, cy - unit, { align: 'right', size: 12, color: c.muted });
      g.texPx('-1', x0 - 5, cy + unit, { align: 'right', size: 12, color: c.muted });
      // 円
      let x = cx, y = cy;
      cur.hs.forEach(function (h, i) {
        const n = h[0], b = h[1], r = Math.abs(b) * unit, a = n * st.th + (b < 0 ? PI : 0);
        ctx.save(); ctx.strokeStyle = i === 0 ? c.primary : c.muted; ctx.globalAlpha = i === 0 ? 0.7 : 0.5; ctx.lineWidth = i === 0 ? 1.6 : 1;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
        const nx = x + r * Math.cos(a), ny = y - r * Math.sin(a);
        ctx.save(); ctx.strokeStyle = c.text; ctx.lineWidth = i === 0 ? 2.2 : 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke(); ctx.restore();
        x = nx; y = ny;
      });
      // 先端から波へ
      ctx.save(); ctx.strokeStyle = c.accent; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x0, y); ctx.stroke(); ctx.restore();
      // 記録された波（右へ流れる）
      ctx.save(); ctx.strokeStyle = c.accent; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let px = 0; px <= W - 6 - x0; px += 1) {
        const t = st.th - px / pxPerRad, py = cy - cur.f(t) * unit;
        if (px) ctx.lineTo(x0 + px, py); else ctx.moveTo(x0 + px, py);
      }
      ctx.stroke(); ctx.restore();
      g.dot(g.ix(x), g.iy(y), { r: 5, color: c.accent });
      g.dot(g.ix(x0), g.iy(y), { r: 5, color: c.accent });
      g.texPx('y', x0 + 6, cy - unit * 1.45, { align: 'left', valign: 'top', size: 14, color: c.muted });
      g.texPx('\\text{← 新しい　　古い →}', W - 8, Hh - 6, { align: 'right', valign: 'bottom', size: 12, color: c.muted });
    };
    update();
    if (st.play) anim.kick();
  }

  /* ==========================================================
     3.8(5a) 自分の声のスペクトル
     ========================================================== */
  function initMic() {
    const root = $id('w-mic');
    const plot = new Plot(root.querySelector('canvas'), { xmin: 0, xmax: 1, ymin: 0, ymax: 1, ratio: [0.7, 0.4] });
    const box = root.querySelector('.panel.snd');
    T.permBox(box, '🎤 マイクを使います。ボタンを押したときだけ許可を求めます。音はこの端末の中で周波数に分けて表示するだけで、どこにも送らず、保存もしません。「■ 止める」を押すか、図が画面の外に出るとマイクは止まります。　🔊 お手本の音は音が出ます（音量に注意）。');
    const msg = R(root, 'amsg');
    const FMIN = 60, FMAX = 5000, DBMIN = -105, DBMAX = -15;
    const src = { kind: null, spectrum: null, wave: null, hzPerBin: 0, sr: 48000 };
    let demo = null, frame = 0, f0 = 0, peak = 0, live = null;
    const DEMOS = [
      { label: '純音 220 Hz', amps: [1] },
      { label: '矩形波 220 Hz', amps: Array.from({ length: 30 }, (_, i) => SERIES.square.b(i + 1)) },
      { label: 'のこぎり波 220 Hz', amps: Array.from({ length: 30 }, (_, i) => SERIES.saw.b(i + 1)) },
    ];
    const demoBtns = chipRow(R(root, 'demo'), DEMOS, -1, (it) => startDemo(it));
    function stopAll() {
      if (src.kind === 'mic') T.Mic.stop();
      if (demo) { try { demo.osc.stop(); demo.g.disconnect(); } catch (e) { /* noop */ } demo = null; }
      src.kind = null; src.spectrum = src.wave = null; live = null;
      unpress(demoBtns);
      R(root, 'mic').classList.add('primary');
      plot.invalidate();
    }
    soundGuard(root, () => { if (src.kind) { stopAll(); setMsg(msg, '画面の外に出た（またはタブが隠れた）ので止めました。'); } });
    R(root, 'stop').addEventListener('click', () => { stopAll(); setMsg(msg, '止めました。'); });
    R(root, 'mic').addEventListener('click', async function () {
      stopAll();
      setMsg(msg, 'マイクの許可を待っています…');
      try {
        await T.Mic.start(8192);
        src.kind = 'mic';
        src.spectrum = () => T.Mic.spectrum();
        src.wave = () => T.Mic.wave();
        src.hzPerBin = T.Mic.hzPerBin();
        src.sr = T.Audio._ctx.sampleRate;
        R(root, 'mic').classList.remove('primary');
        setMsg(msg, '🎤 マイク使用中：「あー」「いー」と声を出してみよう。');
        anim.kick();
      } catch (e) {
        T.Mic.stop();
        const n = e && e.name;
        setMsg(msg, n === 'NotAllowedError' || n === 'SecurityError' ? 'マイクの使用が許可されませんでした。ブラウザの設定で許可するか、下の「お手本の音」で試してください。'
          : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'マイクが見つかりません。下の「お手本の音」で試してください。'
            : ((e && e.message) || 'この環境ではマイクを使えません') + '。下の「お手本の音」で試してください。');
      }
    });
    function startDemo(it) {
      stopAll();
      const a = T.Audio.ctx();
      if (!a || !T.Audio._master) { setMsg(msg, NOAUDIO); unpress(demoBtns); return; }
      const osc = a.createOscillator(), g = a.createGain(), an = a.createAnalyser();
      osc.setPeriodicWave(waveOf(it.amps)); osc.frequency.value = 220;
      an.fftSize = 8192; an.smoothingTimeConstant = 0.6;
      g.gain.setValueAtTime(0, a.currentTime); g.gain.linearRampToValueAtTime(0.35, a.currentTime + 0.05);
      osc.connect(g); g.connect(T.Audio._master); g.connect(an); osc.start();
      demo = { osc, g, an };
      const fb = new Float32Array(an.frequencyBinCount), wb = new Float32Array(an.fftSize);
      src.kind = 'demo';
      src.spectrum = () => { an.getFloatFrequencyData(fb); return fb; };
      src.wave = () => { an.getFloatTimeDomainData(wb); return wb; };
      src.hzPerBin = a.sampleRate / an.fftSize; src.sr = a.sampleRate;
      demoBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === it.label)));
      setMsg(msg, '🔊 お手本の音：' + it.label + '（■ 止める で止まる）');
      anim.kick();
    }
    // 基本の高さ（自己相関）
    function pitch(w, sr) {
      const N = Math.min(w.length, 2048);
      let rms = 0;
      for (let i = 0; i < N; i++) rms += w[i] * w[i];
      rms = Math.sqrt(rms / N);
      if (rms < 0.01) return 0;
      const lo = Math.floor(sr / 1000), hi = Math.min(Math.floor(sr / 70), N - 1), r = new Float32Array(hi + 1);
      let best = 0;
      for (let lag = lo; lag <= hi; lag++) {
        let s = 0, e1 = 0, e2 = 0;
        for (let i = 0; i + lag < N; i++) { s += w[i] * w[i + lag]; e1 += w[i] * w[i]; e2 += w[i + lag] * w[i + lag]; }
        r[lag] = s / Math.sqrt(e1 * e2 + 1e-12);
        if (r[lag] > best) best = r[lag];
      }
      if (best < 0.6) return 0;
      for (let lag = lo + 1; lag < hi; lag++) {
        if (r[lag] >= 0.9 * best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) {
          const a = r[lag - 1], b = r[lag], c = r[lag + 1], d = a - 2 * b + c, off = d ? 0.5 * (a - c) / d : 0;
          return sr / (lag + off);
        }
      }
      return 0;
    }
    const anim = L.animate(root, function () {
      if (!src.kind) return false;
      const sp = src.spectrum();
      if (!sp) return false;
      live = sp;
      frame++;
      if (frame % 4 === 0) {
        // いちばん強い山
        let bi = -1, bv = -Infinity;
        const b0 = Math.ceil(FMIN / src.hzPerBin), b1 = Math.min(sp.length - 2, Math.floor(FMAX / src.hzPerBin));
        for (let i = b0; i <= b1; i++) if (sp[i] > bv) { bv = sp[i]; bi = i; }
        if (bv > -75 && bi > 0) {
          const a = sp[bi - 1], b = sp[bi], c = sp[bi + 1], d = a - 2 * b + c;
          peak = (bi + (d ? 0.5 * (a - c) / d : 0)) * src.hzPerBin;
        } else peak = 0;
        f0 = pitch(src.wave(), src.sr);
        tex(root, 'peak', peak ? C('amber', hzTeX(peak)) : '\\text{（音が小さい）}');
        tex(root, 'f0', f0 ? C('violet', 'f_0\\approx' + hzTeX(f0)) + '\\ \\ (\\text{倍音 } 2f_0,\\ 3f_0,\\ldots)' : '\\text{（わからない）}');
        if (f0) { const nm = noteName(f0); R(root, 'note').textContent = nm.ja + '（' + nm.en + '）に近い。ずれ ' + (nm.cents >= 0 ? '+' : '−') + Math.abs(nm.cents) + ' セント（2.5節）'; }
        else R(root, 'note').textContent = '—';
      }
      plot.invalidate();
      return true;
    });
    const LX = (g, f) => 46 + (g.w - 72) * (Math.log10(f) - Math.log10(FMIN)) / (Math.log10(FMAX) - Math.log10(FMIN));
    const LY = (g, db) => 10 + (g.h - 40) * (1 - (clamp(db, DBMIN, DBMAX) - DBMIN) / (DBMAX - DBMIN));
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx, W = g.w, Hh = g.h, yb = Hh - 30;
      // 目盛り
      ctx.save(); ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath();
      [100, 200, 500, 1000, 2000, 5000].forEach((f) => { const x = LX(g, f); ctx.moveTo(x, 10); ctx.lineTo(x, yb); });
      [-100, -80, -60, -40, -20].forEach((d) => { const y = LY(g, d); ctx.moveTo(46, y); ctx.lineTo(W - 10, y); });
      ctx.stroke();
      ctx.strokeStyle = c.axis; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(46, 10); ctx.lineTo(46, yb); ctx.lineTo(W - 10, yb); ctx.stroke(); ctx.restore();
      const narrow = W < 520;
      [100, 200, 500, 1000, 2000, 5000].forEach((f) => { if (narrow && (f === 200 || f === 2000)) return; g.texPx(String(f), LX(g, f), yb + 4, { align: 'center', valign: 'top', size: 12, color: c.muted }); });
      g.texPx('\\text{周波数 (Hz)}', W - 10, yb - 4, { align: 'right', valign: 'bottom', size: 13, color: c.muted });
      g.texPx('\\text{強さ}', 50, 12, { align: 'left', valign: 'top', size: 13, color: c.muted });
      if (!live) {
        g.texPx(W < 520 ? '\\text{ボタンを押すと表示}' : '\\text{「🎤 マイクを使う」か「お手本の音」を押すと表示}', (W + 46) / 2, Hh / 2 - 10, { align: 'center', size: 13, color: c.muted });
        return;
      }
      // 倍音の位置
      if (f0) {
        for (let k = 1; k <= 30; k++) {
          const f = k * f0;
          if (f > FMAX) break;
          const x = LX(g, f);
          g.ctx.save(); ctx.strokeStyle = c.violet; ctx.globalAlpha = k === 1 ? 0.9 : 0.5; ctx.lineWidth = k === 1 ? 2 : 1.2; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x, yb); ctx.stroke(); ctx.restore();
          if (k <= 4 && (k === 1 || LX(g, f) - LX(g, f - f0) > 26)) g.texPx(k === 1 ? 'f_0' : k + 'f_0', x, 26, { align: 'center', valign: 'top', size: 12, color: c.violet, avoid: true });
        }
      }
      // スペクトル（ピクセルごとの最大）
      const hz = src.hzPerBin;
      ctx.save(); ctx.strokeStyle = c.primary; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.fillStyle = c.primary;
      let started = false;
      for (let px = 46; px <= W - 26; px++) {
        const fa = Math.pow(10, Math.log10(FMIN) + (px - 46) / (W - 72) * (Math.log10(FMAX) - Math.log10(FMIN)));
        const fb = Math.pow(10, Math.log10(FMIN) + (px + 1 - 46) / (W - 72) * (Math.log10(FMAX) - Math.log10(FMIN)));
        let ia = Math.floor(fa / hz), ib = Math.max(ia, Math.floor(fb / hz));
        let v = -Infinity;
        for (let i = ia; i <= ib && i < live.length; i++) if (live[i] > v) v = live[i];
        if (!isFinite(v)) v = DBMIN;
        const y = LY(g, v);
        if (started) ctx.lineTo(px, y); else { ctx.moveTo(px, y); started = true; }
      }
      ctx.stroke();
      ctx.lineTo(W - 26, yb); ctx.lineTo(46, yb); ctx.closePath(); ctx.globalAlpha = 0.12; ctx.fill();
      ctx.restore();
      if (peak) {
        const x = LX(g, peak);
        let bi = Math.round(peak / hz), v = live[bi] || DBMIN;
        g.dot(g.ix(x), g.iy(LY(g, v)), { r: 5, color: c.amber });
        g.texPx(Math.round(peak) + '\\,\\text{Hz}', x, LY(g, v) - 8, { align: x > W - 70 ? 'right' : 'center', valign: 'bottom', size: 13, color: c.amber, avoid: true });
      }
    };
    tex(root, 'peak', '\\text{—}'); tex(root, 'f0', '\\text{—}'); R(root, 'note').textContent = '—';
    plot.invalidate();
  }

  /* ==========================================================
     3.8(5b) 絵を回転円で描き直す
     ========================================================== */
  function initDraw() {
    const root = $id('w-draw');
    const cv = root.querySelector('canvas');
    const plot = new Plot(cv, { xmin: -1.3, xmax: 1.3, equal: true, yc: 0, height: (w) => clamp(w * 0.8, 260, 420) });
    const fit = () => { const k = 1.25 * Math.max(1, plot.w / plot.h); plot.setView({ xmin: -k, xmax: k, yc: 0 }); };
    plot.onResize = fit; fit();
    const M = 256;
    const st = { pts: null, coef: [], K: 20, t: 0, play: !L.reduceMotion, drawing: false, stroke: [], orig: true, mode: 'play' };
    const ctl = root.querySelector('.controls');
    const sK = slider(ctl, { tex: 'K', min: 1, max: 100, step: 1, value: st.K, color: 'primary', aria: '円の数 K' });
    ctl.prepend(sK.row);
    sK.on((v) => { st.K = v; update(); });
    R(root, 'orig').addEventListener('change', (e) => { st.orig = e.target.checked; plot.invalidate(); });
    const dmsg = R(root, 'dmsg');
    // 例の形
    function heart() { const p = []; for (let i = 0; i < 400; i++) { const t = TAU * i / 400; p.push([16 * Math.pow(Math.sin(t), 3) / 15, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 15 + 0.1]); } return p; }
    function star() { const p = []; for (let i = 0; i <= 10; i++) { const a = PI / 2 + PI * i / 5, r = i % 2 ? 0.42 : 1.05; p.push([r * Math.cos(a), r * Math.sin(a) - 0.05]); } return p; }
    function note() {           // 音符（たま＋ぼう＋はた）を1筆で
      const p = [];
      for (let i = 0; i <= 40; i++) { const a = -PI / 2 + TAU * i / 40; p.push([-0.35 + 0.32 * Math.cos(a) , -0.65 + 0.22 * Math.sin(a)]); }
      p.push([-0.03, -0.65], [-0.03, 0.85], [0.45, 0.45], [0.45, 0.25], [0.02, 0.55], [0.02, -0.65]);
      return p;
    }
    const PRE = [{ label: 'ハート', f: heart }, { label: '星', f: star }, { label: '音符', f: note }];
    const pre = chipRow(R(root, 'presets'), PRE, 0, (it) => { setShape(it.f()); });
    // 弧の長さで M 点に等分（閉じた線として）
    function resample(raw) {
      const p = raw.concat([raw[0]]), seg = [0];
      for (let i = 1; i < p.length; i++) seg.push(seg[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
      const tot = seg[seg.length - 1], out = [];
      let j = 1;
      for (let k = 0; k < M; k++) {
        const s = tot * k / M;
        while (j < p.length - 1 && seg[j] < s) j++;
        const u = (s - seg[j - 1]) / ((seg[j] - seg[j - 1]) || 1);
        out.push([p[j - 1][0] + u * (p[j][0] - p[j - 1][0]), p[j - 1][1] + u * (p[j][1] - p[j - 1][1])]);
      }
      return out;
    }
    // 離散フーリエ変換：c_k = (1/M) Σ z_j e^{-2πi kj/M}
    function dft(pts) {
      const cs = [];
      for (let k = -M / 2; k < M / 2; k++) {
        let re = 0, im = 0;
        for (let j = 0; j < M; j++) {
          const a = -TAU * k * j / M, x = pts[j][0], y = pts[j][1], ca = Math.cos(a), sa = Math.sin(a);
          re += x * ca - y * sa; im += x * sa + y * ca;
        }
        cs.push({ k, re: re / M, im: im / M, r: Math.hypot(re, im) / M, ph: Math.atan2(im, re) });
      }
      const c0 = cs.find((q) => q.k === 0);
      const rest = cs.filter((q) => q.k !== 0).sort((a, b) => b.r - a.r);
      return [c0].concat(rest);
    }
    function setShape(raw) {
      st.pts = resample(raw);
      st.coef = dft(st.pts);
      st.t = 0;
      update();
    }
    // K 個の円での位置
    function at(t, K) {
      let x = 0, y = 0;
      for (let i = 0; i <= K && i < st.coef.length; i++) {
        const q = st.coef[i], a = q.ph + TAU * q.k * t;
        x += q.r * Math.cos(a); y += q.r * Math.sin(a);
      }
      return [x, y];
    }
    let curve = [];
    function update() {
      if (!st.pts) return;
      curve = [];
      for (let i = 0; i <= 400; i++) curve.push(at(i / 400, st.K));
      let e = 0, size = 0;
      for (let j = 0; j < M; j++) { const q = at(j / M, st.K); e += Math.hypot(q[0] - st.pts[j][0], q[1] - st.pts[j][1]); size = Math.max(size, Math.hypot(st.pts[j][0] - st.coef[0].re, st.pts[j][1] - st.coef[0].im)); }
      e /= M;
      tex(root, 'k', 'K=' + st.K + '\\ \\text{個（大きい順）}');
      tex(root, 'err', '\\text{平均 }' + num(100 * e / (size || 1), 1) + '\\,\\%');
      R(root, 'how').textContent = st.K <= 2 ? '円が1〜2個だと、だ円のような形しか描けない。K を増やしてみよう。'
        : st.K < 15 ? '大きい円が大まかな形、小さい円が細かい部分を描く。' : '円をたくさん使うと、元の絵とほとんど区別がつかない。角の近くには、少しだけ「飛び出し」が残る。';
      plot.invalidate();
      if (st.play) anim.kick();
    }
    const anim = L.animate(root, function (dt) {
      if (!st.play || st.mode !== 'play' || !st.pts) return false;
      st.t = (st.t + dt / 8) % 1;
      plot.invalidate();
      return true;
    });
    const bP = R(root, 'pause');
    const showP = () => { bP.textContent = st.play ? '⏸ 止める' : '▶ 動かす'; };
    bP.addEventListener('click', () => { st.play = !st.play; showP(); if (st.play) anim.kick(); });
    showP();
    // 描くモード
    const bD = R(root, 'draw');
    function setMode(m) {
      st.mode = m;
      cv.classList.toggle('drawing', m === 'draw');
      bD.textContent = m === 'draw' ? '✖ 描くのをやめる' : '✏️ 描く';
      setMsg(dmsg, m === 'draw' ? '枠の中を指（マウス）でなぞって、1本の線で絵を描こう。指を離すと、始めと終わりがつながって円で描き直す。' : '');
      plot.invalidate();
      if (m === 'play') anim.kick();
    }
    bD.addEventListener('click', () => setMode(st.mode === 'draw' ? 'play' : 'draw'));
    const P = (e) => { const r = cv.getBoundingClientRect(); return [plot.ix(e.clientX - r.left), plot.iy(e.clientY - r.top)]; };
    cv.addEventListener('pointerdown', function (e) {
      if (st.mode !== 'draw') return;
      st.drawing = true; st.stroke = [P(e)];
      try { cv.setPointerCapture(e.pointerId); } catch (er) { /* noop */ }
      e.preventDefault(); plot.invalidate();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!st.drawing) return;
      const q = P(e), l = st.stroke[st.stroke.length - 1];
      if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.005) st.stroke.push(q);
      e.preventDefault(); plot.invalidate();
    });
    const end = function () {
      if (!st.drawing) return;
      st.drawing = false;
      let len = 0;
      for (let i = 1; i < st.stroke.length; i++) len += Math.hypot(st.stroke[i][0] - st.stroke[i - 1][0], st.stroke[i][1] - st.stroke[i - 1][1]);
      if (st.stroke.length < 8 || len < 0.4) { setMsg(dmsg, 'もう少し大きく描いてみよう。'); st.stroke = []; plot.invalidate(); return; }
      unpress(pre);
      setShape(st.stroke);
      st.stroke = [];
      setMode('play');
      setMsg(dmsg, '描き直しています。K を変えて、円の数による変化を見よう。');
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    plot.draw = function (g) {
      const c = g.c, ctx = g.ctx;
      g.grid({ step: 0.5, labels: false, axes: false, xlabel: '', ylabel: '' });
      if (st.mode === 'draw') {
        ctx.save(); ctx.strokeStyle = c.primary; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.strokeRect(3, 3, g.w - 6, g.h - 6); ctx.restore();
        if (st.stroke.length > 1) g.poly(st.stroke, { color: c.text, width: 3 });
        else g.texPx('\\text{ここに描く}', g.w / 2, g.h / 2, { align: 'center', size: 15, color: c.muted });
        return;
      }
      if (!st.pts) return;
      if (st.orig) g.poly(st.pts.concat([st.pts[0]]), { color: c.muted, width: 2, alpha: 0.5 });
      g.poly(curve, { color: c.primary, width: 1.5, alpha: 0.35 });
      // ここまでの軌跡
      const tr = [], n = Math.max(2, Math.round(st.t * 400));
      for (let i = 0; i <= n; i++) tr.push(curve[i]);
      g.poly(tr, { color: c.accent, width: 3 });
      // 円
      let x = 0, y = 0;
      for (let i = 0; i <= st.K && i < st.coef.length; i++) {
        const q = st.coef[i], a = q.ph + TAU * q.k * st.t, nx = x + q.r * Math.cos(a), ny = y + q.r * Math.sin(a);
        if (i > 0) {
          const rp = q.r * g.pxPerX;
          if (rp > 1.2) { ctx.save(); ctx.strokeStyle = c.muted; ctx.globalAlpha = i < 4 ? 0.6 : 0.35; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(g.X(x), g.Y(y), rp, 0, TAU); ctx.stroke(); ctx.restore(); }
          g.line(x, y, nx, ny, { color: c.text, width: i < 4 ? 1.8 : 1.1, alpha: 0.85 });
        }
        x = nx; y = ny;
      }
      g.dot(x, y, { r: 5, color: c.accent });
    };
    setShape(heart());
  }

  /* ==========================================================
     3.8(6) チャレンジ：音色を作れ
     ========================================================== */
  const NH = 6;
  const TIMBRE_STAGES = [
    { v: [1, 0.5, 0, 0, 0, 0], name: '', text: 'お手本は2つの $\\sin$ の和。基本の音 $\\sin x$ に、1オクターブ上の音 $\\sin2x$ を足してある。',
      hint: '$a_1$ と $a_2$ だけを使う。$\\sin2x$ は1周期に山が2つ。$a_1=1$ にしてから、$a_2$ を動かして形を合わせよう。',
      answer: '<b>$a_1=1,\\ a_2=0.5$</b>（ほかは 0）　つまり $y=\\sin x+0.5\\sin2x$<br>山が左に寄った、左右非対称の形になる。2倍音が入ると、音は少し明るくなる。' },
    { v: [1, 0, 1 / 3, 0, 1 / 5, 0], name: '', text: 'お手本は角ばった矩形波に近い形。<b>奇数番目の倍音だけ</b>でできている。',
      hint: '(3) の表を見よう。矩形波の係数は $1,\\ \\frac13,\\ \\frac15$ に比例する。$a_1=1$ なら $a_3\\approx0.33,\\ a_5=0.2$。',
      answer: '<b>$a_1=1,\\ a_3=\\frac13\\approx0.35,\\ a_5=\\frac15=0.2$</b>（偶数番目は 0）<br>$\\sin x+\\dfrac{\\sin3x}{3}+\\dfrac{\\sin5x}{5}$ は矩形波の最初の3項（$\\frac{4}{\\pi}$ 倍する前）。クラリネットも奇数倍音が強い楽器。' },
    { v: [1, 1 / 2, 1 / 3, 1 / 4, 1 / 5, 1 / 6], name: '', text: 'お手本は右下がりののこぎり波に近い形。今度は<b>全部の倍音</b>を使う。',
      hint: '係数は $\\frac{1}{n}$ の形：$a_n=1,\\ \\frac12,\\ \\frac13,\\ \\frac14,\\ \\frac15,\\ \\frac16$。（(3) ののこぎり波とは符号の並びがちがうので、向きが逆になる）',
      answer: '<b>$a_n=\\dfrac{1}{n}$</b>：$1,\\ 0.5,\\ 0.33,\\ 0.25,\\ 0.2,\\ 0.17$<br>$\\sin x+\\dfrac{\\sin2x}{2}+\\dfrac{\\sin3x}{3}+\\cdots$ は右下がりののこぎり波に近づく。バイオリンのように弦をこする楽器は、のこぎり波に近い音。' },
    { v: [1, 0, -1 / 9, 0, 1 / 25, 0], name: '', text: 'お手本はとがった三角波に近い形。<b>マイナスの係数</b>も必要。',
      hint: '三角波は奇数倍音だけで、係数は $\\frac{1}{n^2}$ に比例し、符号が $+,\\ -,\\ +$ と変わる：$a_1=1,\\ a_3=-\\frac19,\\ a_5=\\frac1{25}$。',
      answer: '<b>$a_1=1,\\ a_3=-\\frac19\\approx-0.1,\\ a_5=\\frac{1}{25}\\approx0.05$</b><br>係数がすぐ小さくなるので、音は純音に近いやわらかい音（フルートのような音）になる。' },
    { v: [0.5, 0, 1, 0, 0, 0], name: '', text: '最後は「ひみつの音色」。波の形をよく見て、どの倍音が主役か見ぬこう。',
      hint: '1周期（$0$〜$2\\pi$）の中に、小さな山がいくつあるか数えよう。3つなら $\\sin3x$ が主役。全体のゆるやかなうねりが $\\sin x$。',
      answer: '<b>$a_1=0.5,\\ a_3=1$</b>（ほかは 0）　つまり $y=0.5\\sin x+\\sin3x$<br>1周期に小さな山が3つあるので3倍音が主役。それが全体として大きな $\\sin x$ のうねりに乗っている。' },
  ];
  function initGameTimbre() {
    const root = $id('w-game-timbre');
    const cvs = root.querySelectorAll('canvas');
    const plot = new Plot(cvs[0], { xmin: -0.5, xmax: 4 * PI + 0.3, ymin: -2.2, ymax: 2.2, ratio: [0.66, 0.4] });
    const ps = new Plot(cvs[1], { xmin: 0.3, xmax: NH + 0.7, ymin: -0.45, ymax: 1.2, height: (w) => clamp(w * 0.22, 110, 150) });
    T.permBox(root.querySelector('.panel.snd'), SOUND_NOTE);
    const ctl = root.querySelector('.controls');
    const sl = [];
    for (let n = 1; n <= NH; n++) sl.push(slider(ctl, { tex: 'a_' + n, min: -1, max: 1, step: 0.05, value: 0, color: n % 2 ? 'primary' : 'teal', aria: n + ' 倍音の大きさ a' + n }));
    const cur = () => sl.map((s) => s.get());
    sl.forEach((s) => s.on(() => { if (game) { game.formula(); plot.invalidate(); ps.invalidate(); } }));
    const B = L.game.gameButtons(ctl, '✅ 判定');
    const st = { shots: [] };
    const conf = L.game.Confetti(root, plot);
    const fw = (a) => (x) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * Math.sin((i + 1) * x); return s; };
    const tgt = () => TIMBRE_STAGES[game.k].v;
    // 音（1.5 秒）
    const amsg = R(root, 'amsg');
    let voice = null, timer = 0;
    function stopV() { clearTimeout(timer); if (voice) voice.stop(); voice = null; }
    function play(a) {
      stopV();
      if (!hasAudio()) { setMsg(amsg, NOAUDIO); return; }
      if (a.every((v) => Math.abs(v) < 1e-9)) { setMsg(amsg, 'すべて 0 なので音は出ません。'); return; }
      try { voice = T.Audio.tone({ freq: 220, amp: 0.4, wave: waveOf(a) }); } catch (e) { voice = null; }
      if (!voice || !voice.osc) { voice = null; setMsg(amsg, NOAUDIO); return; }
      setMsg(amsg, '');
      timer = setTimeout(stopV, 1500);
    }
    R(root, 'ptgt').addEventListener('click', () => play(tgt()));
    R(root, 'pme').addEventListener('click', () => play(cur()));
    soundGuard(root, stopV);
    let game = null;
    const termTeX = (a) => {
      let s = '';
      a.forEach((v, i) => {
        if (Math.abs(v) < 1e-9) return;
        const n = i + 1, f = n === 1 ? '\\sin x' : '\\sin ' + n + 'x', m = Math.abs(v), cf = Math.abs(m - 1) < 1e-9 ? '' : num(m, 2);
        s += (v < 0 ? '-' : s ? '+' : '') + cf + f;
      });
      return 'y=' + (s || '0');
    };
    game = L.game.GameShell(root, { key: '3-8:game', stages: TIMBRE_STAGES,
      formula: () => termTeX(cur()),
      onStage() {
        st.shots = []; B.bMain.disabled = false; B.bNext.hidden = true;
        sl.forEach((s) => s.set(0));
        typeset(R(root, 'mission')); plot.invalidate(); ps.invalidate();
      } });
    B.bMain.addEventListener('click', function () {
      if (game.done || game.used >= 3) return;
      const a = cur(), t = tgt();
      let e2 = 0, worst = 0, wi = 0;
      a.forEach((v, i) => { const d = v - t[i]; e2 += d * d; if (Math.abs(d) > Math.abs(worst)) { worst = d; wi = i; } });
      const e = Math.sqrt(e2 / 2);                                   // 波の差の平均の大きさ（2乗平均）
      game.used++; game.renderThrows();
      st.shots.push(a);
      if (e < 0.04) {
        const n = 4 - game.used; game.award(n); game.done = true;
        game.result('🎵 同じ音色！ ' + L.game.starStr(n) + '（' + game.used + ' 回目、ずれ ' + num(e, 3) + '）', 'hit');
        B.bMain.disabled = true; B.bNext.hidden = game.k >= TIMBRE_STAGES.length - 1;
        conf.fire(plot.X(PI), plot.Y(1));
      } else {
        let m = 'ずれ ' + num(e, 3) + '（0.04 未満で合格）。いちばんずれているのは $a_' + (wi + 1) + '$：もう少し' + (worst > 0 ? '小さく' : '大きく') + '。';
        if (game.used >= 3) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        game.result(m, 'miss');
      }
      plot.invalidate(); ps.invalidate();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, TIMBRE_STAGES.length - 1)));
    plot.draw = function (g) {
      const c = g.c;
      piAxes(g, { yt: [1, -1] });
      g.fn((x) => (x < 0 ? NaN : fw(tgt())(x)), { color: c.amber, width: 5, dash: [10, 7], alpha: 0.9 });
      st.shots.forEach((s, i) => { if (i < st.shots.length - 1 || !game.done) g.fn((x) => (x < 0 ? NaN : fw(s)(x)), { color: c.muted, width: 1.6, alpha: 0.5 }); });
      g.fn((x) => (x < 0 ? NaN : fw(cur())(x)), { color: game.done ? c.teal : c.primary, width: 3 });
      g.texPx('\\text{点線：お手本}', g.w - 10, 8, { align: 'right', valign: 'top', size: 13, color: c.amber });
      conf.draw(g);
    };
    ps.draw = function (g) {
      const c = g.c, ctx = g.ctx, a = cur(), t = tgt(), bw = g.pxPerX * 0.42;
      ctx.save(); ctx.strokeStyle = c.axis; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, g.Y(0)); ctx.lineTo(g.w, g.Y(0)); ctx.stroke(); ctx.restore();
      for (let n = 1; n <= NH; n++) {
        const v = a[n - 1], y0 = g.Y(0), y1 = g.Y(v);
        ctx.save(); ctx.fillStyle = n % 2 ? c.primary : c.teal; ctx.fillRect(g.X(n) - bw / 2, Math.min(y0, y1), bw, Math.abs(y1 - y0)); ctx.restore();
        if (game.done) {
          const yt = g.Y(t[n - 1]);
          ctx.save(); ctx.strokeStyle = c.amber; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(g.X(n) - bw / 2 - 3, Math.min(y0, yt), bw + 6, Math.max(1, Math.abs(yt - y0))); ctx.restore();
        }
        g.texPx('a_' + n, g.X(n), g.h - 4, { align: 'center', valign: 'bottom', size: 13, color: c.muted });
      }
    };
    game.setStage(0);
  }

  /* ==========================================================
     確認問題の答えのグラフ
     ========================================================== */
  function initQuizFigs() {
    document.querySelectorAll('#check canvas[data-q]').forEach(function (cv) {
      const plot = new Plot(cv, { xmin: -0.4, xmax: TAU + 0.3, ymin: -1.5, ymax: 1.5, height: (w) => clamp(w * 0.42, 150, 240) });
      const S = SERIES.square, p3 = partial(S, 3);
      plot.draw = function (g) {
        const c = g.c, ctx = g.ctx;
        piAxes(g, { yt: [1, -1] });
        ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.beginPath();
        for (let i = 0; i <= 600; i++) { const x = TAU * i / 600, px = g.X(x), py = g.Y(S.f(x)); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke(); ctx.restore();
        g.fn((x) => (x < 0 ? NaN : p3.f(x)), { color: c.primary, width: 3 });
        g.dot(PI / 2, p3.f(PI / 2), { r: 5, color: c.accent });
        g.tex('\\approx1.10', PI / 2, p3.f(PI / 2), { color: c.accent, size: 14, align: 'left', valign: 'bottom', dx: 6, dy: -4, avoid: true });
      };
      plot.invalidate();
    });
  }

  T.boot([
    [initTone, 'w-tone'],
    [initBeat, 'w-beat'],
    [initCancel, 'w-cancel'],
    [initFourier, 'w-fourier'],
    [initEpi, 'w-epi'],
    [initMic, 'w-mic'],
    [initDraw, 'w-draw'],
    [initGameTimbre, 'w-game-timbre'],
    [initQuizFigs, 'check'],
  ]);
})();
