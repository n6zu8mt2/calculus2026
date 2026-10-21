/* 第3章 三角関数 — 複数の節で使う部品（window.Trig）
 * 依存: assets/common.js (Lab), assets/plot.js
 *
 * 色の約束: 角 θ = 青(primary), cos = 緑(teal), sin = 赤(accent), tan = 金(amber)
 *
 * 部品の一覧
 *   Trig.R(root,'name') / Trig.tex(root,'name',tex)   … data-r の要素を取る／TeX を入れる
 *   Trig.boot([[init, 'w-id'], …])                    … ページにある図だけ初期化
 *   Trig.wrapPi(a)                                    … 角度を -π〜π に折り返す
 *   Trig.radTeX(θ) / Trig.degTeX(θ) / Trig.angleTeX(θ) … π の分数・度で表す TeX
 *   Trig.exactTeX(v)                                  … 0, ½, √2/2, √3/2, 1, √3, 1/√3 などを正確な形で
 *   Trig.unitCircle(g, θ, opts)                       … 単位円・半径・弧・cos/sin の影を描く
 *   Trig.angleHandle(plot, get, set, opts)            … 円周に沿ってドラッグできるハンドル
 *   Trig.Audio                                        … 音（押すまで鳴らない・音量の上限つき）
 *   Trig.Mic                                          … マイク（端末の中だけで周波数に分ける）
 *   Trig.Tilt                                         … スマホの傾きセンサー（iPhone の許可にも対応）
 *   Trig.permBox(parent, text)                        … 「音が出ます」などの注意書き
 */
(function () {
  'use strict';
  const L = window.Lab;
  const T = {};
  T.R = (root, k) => root.querySelector('[data-r="' + k + '"]');
  T.tex = (root, k, s) => L.setTex(T.R(root, k), s);
  T.PI = Math.PI;

  T.boot = function (list) {
    function run() {
      list.forEach(function (e) {
        if (!document.getElementById(e[1])) return;
        try { e[0](); } catch (err) { console.error(e[0].name, err); }
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  };

  /* ---------- 角度 ---------- */
  T.wrapPi = function (a) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  // θ を π の分数で（分母 12 まで）。合わなければ小数
  T.radTeX = function (th, den) {
    den = den || 12;
    const r = th / Math.PI;
    for (let q = 1; q <= den; q++) {
      const p = Math.round(r * q);
      if (Math.abs(r * q - p) < 1e-7) {
        if (p === 0) return '0';
        const s = p < 0 ? '-' : '', P = Math.abs(p);
        if (q === 1) return s + (P === 1 ? '' : P) + '\\pi';
        return s + '\\frac{' + (P === 1 ? '' : P) + '\\pi}{' + q + '}';
      }
    }
    return L.num(th, 3);
  };
  T.degTeX = function (th) { const d = th * 180 / Math.PI; return (Math.abs(d - Math.round(d)) < 1e-6 ? Math.round(d) : L.num(d, 1)) + '^\\circ'; };
  T.angleTeX = function (th) { return T.radTeX(th) + '\\,(=' + T.degTeX(th) + ')'; };
  // よく出る値を正確な形で
  const EXACT = [[0, '0'], [0.5, '\\frac12'], [Math.SQRT2 / 2, '\\frac{\\sqrt2}{2}'], [Math.sqrt(3) / 2, '\\frac{\\sqrt3}{2}'], [1, '1'],
    [Math.sqrt(3), '\\sqrt3'], [1 / Math.sqrt(3), '\\frac{1}{\\sqrt3}'], [2, '2']];
  T.exactTeX = function (v, digits) {
    if (!isFinite(v)) return '\\text{なし}';
    for (const e of EXACT) {
      if (Math.abs(Math.abs(v) - e[0]) < 1e-9) return (v < 0 && e[0] !== 0 ? '-' : '') + e[1];
    }
    return L.num(v, digits == null ? 3 : digits);
  };

  /* ---------- 単位円 ----------
     opts: { r=1, arc=true, proj=true, labels=true, point=true, tan=false, color:{} } */
  T.unitCircle = function (g, th, o) {
    o = o || {};
    const c = g.c, r = o.r || 1, x = r * Math.cos(th), y = r * Math.sin(th);
    g.grid({ stepX: 0.5, stepY: 0.5, xlabel: 'x', ylabel: 'y' });
    const ctx = g.ctx;
    ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), g.pxPerX * r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    if (o.arc !== false) {
      const k = 0.22 * r, n = Math.max(8, Math.ceil(Math.abs(th) / 0.05)), pts = [];
      for (let i = 0; i <= n; i++) { const a = th * i / n; pts.push([k * Math.cos(a), k * Math.sin(a)]); }
      g.poly(pts, { color: c.primary, width: 3 });
      if (o.labels !== false) g.tex('\\theta', 1.5 * k * Math.cos(th / 2), 1.5 * k * Math.sin(th / 2), { color: c.primary, size: 16, align: 'center' });
    }
    if (o.proj !== false) {
      g.line(x, 0, x, y, { color: c.accent, width: 3.5 });            // sin（縦）
      g.line(0, 0, x, 0, { color: c.teal, width: 3.5 });              // cos（横）
      g.line(x, y, 0, y, { color: c.accent, width: 1.2, dash: [4, 4] });
      if (o.labels !== false) {
        g.tex('\\cos\\theta', x / 2, 0, { color: c.teal, size: 15, align: 'center', dy: y >= 0 ? 14 : -14 });
        g.tex('\\sin\\theta', x, y / 2, { color: c.accent, size: 15, align: x >= 0 ? 'left' : 'right', dx: x >= 0 ? 8 : -8 });
      }
    }
    if (o.tan && Math.abs(Math.cos(th)) > 1e-6) {
      const t = Math.tan(th);
      if (Math.abs(t) < 6) {
        g.line(r, -6, r, 6, { color: c.amber, width: 1, dash: [3, 4] });
        g.line(0, 0, r, r * t, { color: c.amber, width: 1.5, dash: [5, 4] });
        g.dot(r, r * t, { r: 5, color: c.amber });
        if (o.labels !== false) g.tex('\\tan\\theta', r, r * t, { color: c.amber, dx: 10, size: 15 });
      }
    }
    g.line(0, 0, x, y, { color: c.text, width: 2.5 });
    if (o.point !== false) g.dot(x, y, { r: 6, color: c.primary });
    return { x, y };
  };

  /* ---------- 円周に沿うハンドル ---------- */
  T.angleHandle = function (plot, get, set, o) {
    o = o || {};
    const r = o.r || 1;
    return plot.addHandle({
      get x() { return r * Math.cos(get()); }, get y() { return r * Math.sin(get()); },
      get color() { return plot.c ? plot.c.primary : '#3355d6'; }, r: o.size || 9, tex: o.tex,
      drag(x, y) {
        let a = Math.atan2(y, x);
        if (o.continuous) { const prev = get(); a = prev + T.wrapPi(a - prev); }      // 一周を越えて回せる
        if (o.snap) a = Math.round(a / o.snap) * o.snap;
        set(a);
      },
    });
  };

  /* ---------- 注意書き ---------- */
  T.permBox = function (parent, text) {
    const d = L.el('p', 'perm-note', text);
    parent.prepend(d);
    return d;
  };

  /* ---------- 音 ----------
     Trig.Audio.ctx()                 … AudioContext（最初のクリックで作る）
     Trig.Audio.tone({freq, amp, wave, pan}) → { set({freq,amp,pan}), stop() }
     Trig.Audio.periodic(amps)        … 倍音の大きさ [0, a1, a2, …] から PeriodicWave
     音量は master で 0.25 に制限する */
  const A = { _ctx: null, _master: null };
  A.ctx = function () {
    if (!A._ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      A._ctx = new C();
      A._master = A._ctx.createGain(); A._master.gain.value = 0.25;
      const lim = A._ctx.createDynamicsCompressor();
      A._master.connect(lim); lim.connect(A._ctx.destination);
    }
    if (A._ctx.state === 'suspended') A._ctx.resume();
    return A._ctx;
  };
  A.periodic = function (amps) {
    const a = A.ctx(); if (!a) return null;
    return a.createPeriodicWave(new Float32Array(amps.length), new Float32Array(amps), { disableNormalization: false });
  };
  A.tone = function (o) {
    const a = A.ctx(); if (!a) return { set() {}, stop() {} };
    const osc = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    let pan = null;
    if (o.wave) osc.setPeriodicWave(o.wave); else osc.type = o.type || 'sine';
    osc.frequency.value = o.freq || 440;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.amp == null ? 0.5 : o.amp, t + 0.05);
    osc.connect(g);
    if (a.createStereoPanner && o.pan != null) { pan = a.createStereoPanner(); pan.pan.value = o.pan; g.connect(pan); pan.connect(A._master); }
    else g.connect(A._master);
    osc.start();
    return {
      osc, gain: g,
      set(p) {
        const now = a.currentTime;
        if (p.freq != null) osc.frequency.setTargetAtTime(p.freq, now, 0.02);
        if (p.amp != null) g.gain.setTargetAtTime(p.amp, now, 0.03);
        if (p.pan != null && pan) pan.pan.setTargetAtTime(p.pan, now, 0.03);
        if (p.wave) osc.setPeriodicWave(p.wave);
      },
      stop() { const now = a.currentTime; g.gain.setTargetAtTime(0, now, 0.03); osc.stop(now + 0.2); },
    };
  };
  T.Audio = A;

  /* ---------- マイク ----------
     Trig.Mic.start() → Promise（許可が出たら）。Trig.Mic.spectrum() → Float32Array(dB)、Trig.Mic.wave() → Float32Array
     音は端末の中で周波数に分けるだけで、どこにも送らない・保存しない */
  const M = { stream: null, an: null };
  M.start = async function (fftSize) {
    const a = A.ctx();
    if (!a || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('この端末ではマイクを使えません');
    M.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const src = a.createMediaStreamSource(M.stream);
    M.an = a.createAnalyser(); M.an.fftSize = fftSize || 4096; M.an.smoothingTimeConstant = 0.6;
    src.connect(M.an);                       // スピーカーにはつながない
    M._f = new Float32Array(M.an.frequencyBinCount); M._w = new Float32Array(M.an.fftSize);
    return M;
  };
  M.spectrum = function () { if (!M.an) return null; M.an.getFloatFrequencyData(M._f); return M._f; };
  M.wave = function () { if (!M.an) return null; M.an.getFloatTimeDomainData(M._w); return M._w; };
  M.hzPerBin = function () { return M.an ? A._ctx.sampleRate / M.an.fftSize : 0; };
  M.stop = function () { if (M.stream) M.stream.getTracks().forEach((t) => t.stop()); M.stream = null; M.an = null; };
  T.Mic = M;

  /* ---------- 傾きセンサー ----------
     Trig.Tilt.start(cb) → Promise。cb({beta, gamma}) が傾きが変わるたびに呼ばれる（度）
     iPhone はボタン操作の中で呼ぶこと。センサーがない端末では reject */
  const Tl = { cb: null, on: false };
  Tl.start = async function (cb) {
    const D = window.DeviceOrientationEvent;
    if (!D) throw new Error('この端末には傾きセンサーがありません');
    if (typeof D.requestPermission === 'function') {
      const res = await D.requestPermission();
      if (res !== 'granted') throw new Error('傾きセンサーの使用が許可されませんでした');
    }
    Tl.cb = cb;
    if (!Tl.on) {
      window.addEventListener('deviceorientation', function (e) {
        if (Tl.cb && e.beta != null) Tl.cb({ beta: e.beta, gamma: e.gamma, alpha: e.alpha });
      });
      Tl.on = true;
    }
    return Tl;
  };
  Tl.stop = function () { Tl.cb = null; };
  T.Tilt = Tl;

  window.Trig = T;
})();
