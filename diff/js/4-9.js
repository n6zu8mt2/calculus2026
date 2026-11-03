/* 第4章 4.9節 微分を使う — 図とチャレンジ
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 *
 * この節だけの部品
 *   chipRow(box, items, cur, onPick) … 選択ボタンの列（it.tex と it.note）
 *   ticks(g, o)                       … 拡大しても読める目盛り（間隔を自動で 1・2・5 × 10^k に）
 *   expHTML(v)                        … 2.1 × 10⁻⁶ のような表示（表の中）
 *   digitsTeX(s, t)                   … s のうち t と先頭から一致する桁を緑にした TeX
 *   rng(seed)                         … 種つきの乱数（ノイズを毎回同じにする）
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, setTex, slider, Plot, clamp } = L;
  const R = D.R, tex = D.tex, $id = (id) => document.getElementById(id);
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };
  const fmt = D.fmt;
  const snap = (v, s) => Math.round(v / s) * s;
  const setHTML = (node, h) => { node.innerHTML = h; typeset(node); };

  /* ---------- 小さな部品 ---------- */
  function chipRow(box, items, cur, onPick) {
    box.innerHTML = '';
    const btns = items.map(function (it, i) {
      const b = el('button', 'chip', it.tex ? '' : it.label);
      b.type = 'button';
      if (it.tex) { const s = el('span'); b.append(s); setTex(s, it.chip || it.tex); }
      if (it.note) b.append(el('small', 'd49-note', it.note));
      b.addEventListener('click', () => { btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i))); onPick(it, i); });
      box.append(b);
      return b;
    });
    btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === cur)));
    return btns;
  }
  function niceStep(span) {
    const p = Math.pow(10, Math.floor(Math.log10(span))), m = span / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  // 方眼と目盛り（目盛りの数字も TeX）。拡大しても桁数が足りるようにする
  function ticks(g, o) {
    o = o || {};
    const c = g.c;
    const sx = o.sx || niceStep((g.xmax - g.xmin) / (g.w < 500 ? 4 : 7));
    const sy = o.sy || niceStep((g.ymax - g.ymin) / (g.h < 300 ? 4 : 6));
    g.grid({ stepX: sx, stepY: sy, labels: false, xlabel: o.xl != null ? o.xl : 'x', ylabel: o.yl != null ? o.yl : 'y' });
    const dec = (t) => { let d = 0; while (d < 12 && Math.abs(Math.round(t * 10 ** d) - t * 10 ** d) > 1e-6) d++; return d; };
    const dx = dec(sx), dy = dec(sy);
    const y0 = clamp(g.Y(0), 0, g.h - 20), x0 = clamp(g.X(0), 34, g.w);
    for (let i = Math.ceil(g.xmin / sx); i * sx <= g.xmax + 1e-12; i++) {
      const v = i * sx, px = g.X(v);
      if (!i || px < 16 || px > g.w - 34) continue;
      g.texPx(num(v, dx), px, y0 + 4, { align: 'center', valign: 'top', size: 12, color: c.muted });
    }
    for (let j = Math.ceil(g.ymin / sy); j * sy <= g.ymax + 1e-12; j++) {
      const v = j * sy, py = g.Y(v);
      if (!j || py < 26 || py > g.h - 10) continue;
      g.texPx(num(v, dy), x0 - 5, py, { align: 'right', size: 12, color: c.muted });
    }
    if (g.xmin <= 0 && g.xmax >= 0 && g.ymin <= 0 && g.ymax >= 0)
      g.texPx('\\mathrm{O}', g.X(0) - 5, g.Y(0) + 4, { align: 'right', valign: 'top', size: 12, color: c.muted });
  }
  function expHTML(v) {
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a === 0) return '0';
    if (a >= 0.001 && a < 1e5) return L.minus(fmt(v, a < 0.1 ? 5 : 4));
    const e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e);
    return L.minus(m.toFixed(2)) + ' × 10<sup>' + L.minus(String(e)) + '</sup>';
  }
  const xStr = (x) => (Math.abs(x) < 1000 ? x.toFixed(14) : x.toPrecision(8));
  // 先頭から一致する文字数（符号と小数点もふくめる）
  function commonPrefix(s, t) { let k = 0; while (k < s.length && k < t.length && s[k] === t[k]) k++; return k; }
  function digitsHTML(x, root) {
    const s = xStr(x);
    if (root == null || Math.abs(x - root) > 0.5) return L.minus(s);
    const k = commonPrefix(s, xStr(root));
    return '<b class="d49-ok">' + L.minus(s.slice(0, k)) + '</b>' + s.slice(k);
  }
  function digitsTeX(s, t) {
    const k = commonPrefix(s, t);
    return (k ? '\\teal{' + s.slice(0, k) + '}' : '') + s.slice(k);
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

  // でこぼこの地形（左に深い谷、右に浅い谷）
  const Q = (x) => 0.1 * x ** 4 - x * x + 0.5 * x + 3, dQ = (x) => 0.4 * x ** 3 - 2 * x + 0.5;
  const Q_TEX = '\\frac{x^4}{10}-x^2+\\frac{x}{2}+3';
  const Q_MIN = -2.3519104613353234, Q_LOC = 2.098662056477517, Q_TOP = 0.25324840485780653;

  /* ==========================================================
     4.9(1) ニュートン法
     ========================================================== */
  function initNewton() {
    const root = $id('w-newton');
    const FNS = [
      { tex: 'x^2-2', dtex: '2x', f: (x) => x * x - 2, df: (x) => 2 * x, root: Math.SQRT2, x0: 2,
        view: { xmin: -0.7, xmax: 3.3, ymin: -2.4, ymax: 7 }, lim: [-3, 3.2], rootTeX: '\\sqrt2' },
      { tex: 'x^3-2x-5', dtex: '3x^2-2', f: (x) => x ** 3 - 2 * x - 5, df: (x) => 3 * x * x - 2, root: 2.0945514815423265, x0: 3,
        view: { xmin: -1.2, xmax: 3.6, ymin: -12, ymax: 22 }, lim: [-1, 3.5], note: 'ニュートン自身の例' },
      { tex: '\\cos x-x', dtex: '-\\sin x-1', f: (x) => Math.cos(x) - x, df: (x) => -Math.sin(x) - 1, root: 0.7390851332151607, x0: 2,
        view: { xmin: -1.2, xmax: 3.2, ymin: -3.6, ymax: 2.4 }, lim: [-1.2, 3] },
      { tex: 'x^3-2x+2', dtex: '3x^2-2', f: (x) => x ** 3 - 2 * x + 2, df: (x) => 3 * x * x - 2, root: -1.7692923542386314, x0: 0,
        view: { xmin: -2.6, xmax: 2.4, ymin: -3, ymax: 6 }, lim: [-2.4, 2.2], note: '失敗例' },
      { tex: '\\tan^{-1}x', dtex: '\\frac{1}{1+x^2}', f: Math.atan, df: (x) => 1 / (1 + x * x), root: 0, x0: 1.5,
        view: { xmin: -6.5, xmax: 6.5, ymin: -2, ymax: 2 }, lim: [-3, 3], note: '失敗例' },
    ];
    const MAXN = 12;
    const st = { k: 0, xs: [2], z: 1, play: false, t: 0, msg: '' };
    const F = () => FNS[st.k];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.86, 0.5] }, F().view));
    const ctl = root.querySelector('.controls');
    const sx0 = slider(ctl, { tex: '\\teal{x_0}', min: -3, max: 3.2, step: 0.05, value: 2, color: 'teal', aria: 'スタートの x0', fmt: (v) => num(v, 2) });
    const last = () => st.xs[st.xs.length - 1];
    function setView() {
      const V = F().view;
      if (st.z === 1) { plot.setView(V); return; }
      const hw = (V.xmax - V.xmin) / 2 / st.z, hh = (V.ymax - V.ymin) / 2 / st.z, cx = last();
      plot.setView({ xmin: cx - hw, xmax: cx + hw, ymin: -hh, ymax: hh });
    }
    function restart(x0) {
      const f = F();
      st.xs = [clamp(snap(x0, 0.05), f.lim[0], f.lim[1])];
      st.msg = ''; stop(); sx0.set(st.xs[0]); setView(); update();
    }
    // 次の1ステップ。進めなければ false
    function step() {
      const f = F(), x = last();
      if (st.msg) return false;
      if (st.xs.length > MAXN) { st.msg = 'max'; return false; }
      const d = f.df(x);
      if (Math.abs(x) > 1e5) { st.msg = 'far'; return false; }
      if (Math.abs(d) < 1e-12) { st.msg = 'zero'; return false; }
      const nx = x - f.f(x) / d;
      if (!isFinite(nx) || Math.abs(nx) > 1e9) { st.msg = 'far'; return false; }
      st.xs.push(nx);
      if (Math.abs(nx - x) <= 1e-15 * Math.max(1, Math.abs(x))) st.msg = 'done';
      return true;
    }
    const bPlay = R(root, 'play');
    const showPlay = () => { bPlay.textContent = st.play ? '⏸ 止める' : '▶ 自動'; };
    function stop() { if (st.play) { st.play = false; showPlay(); } }
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt;
      if (st.t >= 0.8) {
        st.t = 0;
        if (!step()) { stop(); update(); return false; }
        if (st.z > 1) setView();
        update();
      }
      return st.play;
    });
    R(root, 'step').addEventListener('click', () => { stop(); step(); if (st.z > 1) setView(); update(); });
    bPlay.addEventListener('click', () => {
      if (st.play) { stop(); return; }
      if (st.msg) restart(st.xs[0]);
      st.play = true; st.t = 0.8; showPlay(); anim.kick();
    });
    R(root, 'reset').addEventListener('click', () => restart(st.xs[0]));
    R(root, 'zin').addEventListener('click', () => { st.z = Math.min(st.z * 4, Math.pow(4, 8)); setView(); update(); });
    R(root, 'zout').addEventListener('click', () => { st.z = Math.max(1, st.z / 4); setView(); update(); });
    R(root, 'zall').addEventListener('click', () => { st.z = 1; setView(); update(); });
    sx0.on((v) => restart(v));
    chipRow(R(root, 'fns'), FNS, 0, (it, i) => {
      st.k = i; st.z = 1;
      const f = F();
      sx0.input.min = f.lim[0]; sx0.input.max = f.lim[1];
      restart(f.x0);
    });
    plot.addHandle({ get x() { return st.xs[0]; }, get y() { return F().f(st.xs[0]); }, get color() { return plot.c ? plot.c.teal : '#198'; }, r: 7,
      drag(x) { restart(x); } });

    const tbody = R(root, 'tbody');
    function table() {
      const f = F();
      let s = '';
      st.xs.forEach(function (x, n) {
        const on = n === st.xs.length - 1;
        s += '<tr' + (on ? ' class="on"' : '') + '><td>' + n + '</td><td class="mono">' + digitsHTML(x, f.root) + '</td><td>' + expHTML(f.f(x)) + '</td><td>' + expHTML(Math.abs(x - f.root)) + '</td></tr>';
      });
      tbody.innerHTML = s;
    }
    function update() {
      const f = F(), n = st.xs.length - 1, x = last();
      tex(root, 'rec', '\\begin{aligned}&\\blue{f(x)=' + f.tex + '},\\quad \\teal{f\'(x)=' + f.dtex + '}\\\\&x_{n+1}=x_n-\\frac{f(x_n)}{f\'(x_n)}\\end{aligned}');
      let now = 'x_{' + n + '}=' + fmt(x, Math.abs(x) < 1000 ? 10 : 2);
      if (n > 0) { const p = st.xs[n - 1]; now = '\\begin{aligned}&x_{' + n + '}=x_{' + (n - 1) + '}\\red{-\\frac{f(x_{' + (n - 1) + '})}{f\'(x_{' + (n - 1) + '})}}\\\\&\\phantom{x_{' + n + '}}=' + fmt(p, 6) + '\\red{' + (p - x >= 0 ? '-' : '+') + fmt(Math.abs(p - x), 6) + '}\\\\&\\phantom{x_{' + n + '}}=' + fmt(x, 10) + '\\end{aligned}'; }
      tex(root, 'now', now);
      const how = R(root, 'how');
      let h;
      if (st.k === 4 && n >= 2 && Math.abs(x) > Math.abs(st.xs[0])) h = '交点が<b>反対側の、もっと遠く</b>に出て、どんどん離れていきます。スタートを $0$ に近づける（$|x_0|\\lt1.39$ くらい）とうまくいきます。';
      else if (st.msg === 'zero') h = '<b>接線が水平</b>（$f\'(x_{' + n + '})=0$）なので、$x$ 軸と交わらず、次へ進めません（0 で割ることになる）。';
      else if (st.msg === 'far') h = '<b>遠くへ飛んでいきました</b>。接線がほぼ水平だと、交点がとても遠くになります。';
      else if (st.k === 3 && n >= 2 && Math.abs(x - f.root) > 0.5) h = '<b>行ったり来たり</b>して、解（$x\\approx-1.77$）に近づきません。スタートを左に動かしてみよう。';
      else if (st.msg === 'done' || (n > 0 && Math.abs(x - f.root) < 1e-13)) h = '<b>これ以上変わりません</b>。コンピュータで表せる桁（16桁くらい）まで、解と一致しました。';
      else if (n === 0) h = '「1ステップ」を押すと、緑の点での接線を引き、$x$ 軸との交点を次の $x_1$ にします。';
      else if (Math.abs(f.df(st.xs[n - 1])) < 0.3 && Math.abs(x - st.xs[n - 1]) > 1.5) h = '接線が<b>水平に近かった</b>ので、交点が遠くに飛びました。';
      else h = '表の<b>緑の桁</b>が、解と合っている部分です。解に近づくと、1回ごとにおよそ2倍に増えます。点が重なって見えにくいときは「拡大」。';
      setHTML(how, h + (st.z > 1 ? '（いま ' + st.z + ' 倍に拡大中）' : ''));
      table();
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, f = F(), xs = st.xs, n = xs.length - 1;
      ticks(g);
      D.curve(g, f.f, { color: c.primary, width: 3.5 });
      if (f.root >= g.xmin && f.root <= g.xmax) g.dot(f.root, 0, { r: 6, ring: true, color: c.muted, lw: 2 });
      for (let i = 0; i < n; i++) {
        const a = xs[i], b = xs[i + 1], fa = f.f(a), latest = i === n - 1, al = latest ? 1 : 0.3;
        g.line(a, 0, a, fa, { color: c.muted, width: 1.2, dash: [3, 4], alpha: al });
        if (latest) {
          const m = f.df(a);
          g.line(g.xmin, fa + m * (g.xmin - a), g.xmax, fa + m * (g.xmax - a), { color: c.teal, width: 2.5 });
          g.arrow(a, 0, b, 0, { color: c.accent, width: 3, head: 14 });
        } else g.line(a, fa, b, 0, { color: c.teal, width: 2, alpha: al });
        g.dot(a, fa, { r: latest ? 5 : 3.5, color: c.teal, stroke: latest });
      }
      // x 軸上の点と名前（重なる名前は省く。新しい点を優先）
      const used = [];
      for (let i = n; i >= 0; i--) {
        const px = g.X(xs[i]);
        if (px < -5 || px > g.w + 5) continue;
        g.dot(xs[i], 0, { r: i === n ? 5 : 3.5, color: c.text });
        if (used.some((q) => Math.abs(q - px) < 30) || px < 12 || px > g.w - 12) continue;
        used.push(px);
        g.tex('x_{' + i + '}', xs[i], 0, { align: 'center', valign: 'bottom', dy: -8, size: 14, color: i === n ? c.text : c.muted });
      }
      g.texPx('y=' + f.tex, g.w - 10, g.h - 8, { align: 'right', valign: 'bottom', size: 14, color: c.primary });
    };
    restart(2);
  }

  /* ==========================================================
     4.9(1) 小話：高速逆平方根
     ========================================================== */
  function initQuake() {
    const root = $id('w-quake');
    const buf = new ArrayBuffer(4), fl = new Float32Array(buf), it = new Uint32Array(buf);
    function guess(x) { fl[0] = x; it[0] = 0x5f3759df - (it[0] >>> 1); return fl[0]; }
    const sx = slider(root.querySelector('.controls'), { tex: 'x', min: -1, max: 2, step: 0.01, value: 0.4, color: 'primary', aria: 'x（10 倍ごとの目盛り）',
      fmt: (v) => { const x = Math.pow(10, v); return num(x, x < 1 ? 3 : x < 10 ? 2 : 1); } });
    function update(v) {
      const x = +num(Math.pow(10, v), Math.pow(10, v) < 1 ? 3 : Math.pow(10, v) < 10 ? 2 : 1), t = 1 / Math.sqrt(x);
      const y0 = guess(x), y1 = y0 * (1.5 - 0.5 * x * y0 * y0);
      const pct = (y) => num(Math.abs(y - t) / t * 100, 3);
      tex(root, 'true', '\\dfrac{1}{\\sqrt{' + num(x, 3) + '}}=' + fmt(t, 7));
      tex(root, 'y0', 'y_0=' + fmt(y0, 7) + '\\quad(\\text{誤差 }' + pct(y0) + '\\%)');
      tex(root, 'y1', 'y_1=' + fmt(y1, 7) + '\\quad(\\text{誤差 }\\teal{' + pct(y1) + '\\%})');
    }
    sx.on(update);
    update(0.4);
  }

  /* ==========================================================
     4.9(2) 勾配降下法
     ========================================================== */
  function initGD() {
    const root = $id('w-gd');
    const FNS = [
      { tex: 'x^2', f: (x) => x * x, df: (x) => 2 * x, view: { xmin: -3.6, xmax: 3.6, ymin: -1.2, ymax: 11 }, x0: 3, eta: 0.1, lim: [-3.4, 3.4], sy: 2 },
      { label: 'でこぼこ', tex: Q_TEX, chip: '\\text{でこぼこ}', f: Q, df: dQ, view: { xmin: -3.7, xmax: 3.7, ymin: -1.5, ymax: 8.5 }, x0: 3, eta: 0.05, lim: [-3.4, 3.4], sy: 2 },
    ];
    const MAXN = 60;
    const st = { k: 0, xs: [3], eta: 0.1, play: false, t: 0, msg: '', fog: false };
    const F = () => FNS[st.k];
    const plot = new Plot(root.querySelector('canvas'), Object.assign({ ratio: [0.8, 0.46] }, F().view));
    const ctl = root.querySelector('.controls');
    const se = slider(ctl, { tex: '\\eta', min: 0.01, max: 1.2, step: 0.01, value: 0.1, color: 'accent', aria: '学習率 η', fmt: (v) => num(v, 2) });
    const sx = slider(ctl, { tex: '\\teal{x_0}', min: -3.4, max: 3.4, step: 0.05, value: 3, color: 'teal', aria: 'スタートの x0', fmt: (v) => num(v, 2) });
    const last = () => st.xs[st.xs.length - 1];
    function restart(x0) {
      const f = F();
      st.xs = [clamp(snap(x0, 0.05), f.lim[0], f.lim[1])]; st.msg = '';
      stop(); sx.set(st.xs[0]); update();
    }
    function step() {
      if (st.msg) return false;
      const f = F(), x = last(), nx = x - st.eta * f.df(x);
      if (!isFinite(nx) || Math.abs(nx) > 1e4) { st.msg = 'div'; return false; }
      st.xs.push(nx);
      if (Math.abs(nx - x) < 1e-7) st.msg = 'stop';
      else if (st.xs.length > MAXN) st.msg = 'max';
      return true;
    }
    const bPlay = R(root, 'play');
    const showPlay = () => { bPlay.textContent = st.play ? '⏸ 止める' : '▶ 転がす'; };
    function stop() { if (st.play) { st.play = false; showPlay(); } }
    const anim = L.animate(root, function (dt) {
      if (!st.play) return false;
      st.t += dt;
      if (st.t >= 0.28) { st.t = 0; if (!step()) { stop(); update(); return false; } update(); }
      return st.play;
    });
    R(root, 'step').addEventListener('click', () => { stop(); step(); update(); });
    bPlay.addEventListener('click', () => {
      if (st.play) { stop(); return; }
      if (st.msg) restart(st.xs[0]);
      st.play = true; st.t = 0.28; showPlay(); anim.kick();
    });
    R(root, 'reset').addEventListener('click', () => restart(st.xs[0]));
    R(root, 'fog').addEventListener('change', (e) => { st.fog = e.target.checked; plot.invalidate(); });
    se.on((v) => { st.eta = v; restart(st.xs[0]); });
    sx.on((v) => restart(v));
    chipRow(R(root, 'fns'), FNS, 0, (it, i) => {
      st.k = i; const f = F();
      plot.setView(f.view); st.eta = f.eta; se.set(f.eta); restart(f.x0);
    });
    plot.addHandle({ get x() { return st.xs[0]; }, get y() { return F().f(st.xs[0]); }, get color() { return plot.c ? plot.c.teal : '#198'; }, r: 7,
      drag(x) { restart(x); } });

    const tbody = R(root, 'tbody');
    function row(n) {
      const f = F(), x = st.xs[n], d = f.df(x);
      return '<tr' + (n === st.xs.length - 1 ? ' class="on"' : '') + '><td>' + n + '</td><td>' + L.minus(fmt(x, 4)) + '</td><td>' + L.minus(fmt(d, 4)) + '</td><td>' + L.minus(fmt(-st.eta * d, 4)) + '</td><td>' + L.minus(fmt(f.f(x), 4)) + '</td></tr>';
    }
    function table() {
      const n = st.xs.length;
      let s = '';
      if (n <= 12) for (let i = 0; i < n; i++) s += row(i);
      else { for (let i = 0; i < 6; i++) s += row(i); s += '<tr class="gap"><td colspan="5">⋮</td></tr>'; for (let i = n - 5; i < n; i++) s += row(i); }
      tbody.innerHTML = s;
    }
    // 最後の数歩で、行ったり来たりしているか
    function swinging() {
      const xs = st.xs, n = xs.length;
      if (n < 5) return false;
      let flips = 0;
      for (let i = n - 4; i < n - 1; i++) if ((xs[i + 1] - xs[i]) * (xs[i] - xs[i - 1]) < 0) flips++;
      return flips >= 3 && Math.abs(xs[n - 1] - xs[n - 2]) > 0.02;
    }
    function update() {
      const f = F(), n = st.xs.length - 1, x = last(), d = f.df(x);
      tex(root, 'now', 'x_{' + n + '}=' + fmt(x, 3) + ',\\quad \\teal{f\'(x_{' + n + '})=' + fmt(d, 3) + '}');
      tex(root, 'next', st.msg === 'div' ? '\\text{—}' : 'x_{' + (n + 1) + '}=' + fmt(x, 3) + '\\red{' + (st.eta * d > 0 ? '-' : '+') + num(st.eta, 2) + '\\times' + fmt(Math.abs(d), 3) + '}=' + fmt(x - st.eta * d, 3));
      let h;
      const near = Math.abs(d) < 0.02;
      if (st.msg === 'div') h = '<b>発散</b>：1歩が大きすぎて谷を飛びこえ、反対側のもっと高い所へ…をくり返して、画面の外へ飛んでいきました。$\\eta$ を小さくしよう。';
      else if (n === 0) h = '「1歩」または「▶ 転がす」で動かします。スタートは緑の点をドラッグ。';
      else if (near && st.k === 1 && Math.abs(x - Q_LOC) < 0.2) h = '<b>浅い谷で止まりました</b>。ここも傾きは $0$ ですが、左にもっと深い谷があります（局所的な谷）。スタートを左へ動かしてみよう。';
      else if (near) h = '<b>谷底に着きました</b>（' + n + ' 歩）。傾きがほぼ $0$ なので、もう動きません。';
      else if (swinging()) h = '<b>振動</b>：谷の左右を行ったり来たりしています。$\\eta$ が大きめです。';
      else if (n >= 20) h = '<b>なかなか着きません</b>。1歩が小さすぎるようです。$\\eta$ を大きくしてみよう。';
      else h = '傾きと<b>反対向き</b>に、傾き × $\\eta$ だけ進みます。坂がゆるやかになると、歩幅も小さくなります。';
      setHTML(R(root, 'how'), h);
      table();
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c, f = F(), xs = st.xs, n = xs.length - 1, x = last();
      g.grid({ step: 1, stepY: f.sy, xlabel: 'x', ylabel: 'y' });
      if (st.fog) {
        D.curve(g, f.f, { color: c.muted, width: 1.5, alpha: 0.07 });
        xs.forEach((t) => D.curve(g, f.f, { x0: t - 0.35, x1: t + 0.35, n: 30, color: c.primary, width: 3.5, alpha: 0.35 }));
        D.curve(g, f.f, { x0: x - 0.5, x1: x + 0.5, n: 40, color: c.primary, width: 3.5 });
        g.texPx('\\text{霧で見えない}', 10, g.h - 8, { align: 'left', valign: 'bottom', size: 13, color: c.muted });
      } else {
        D.curve(g, f.f, { color: c.primary, width: 3.5 });
        g.texPx('y=' + f.tex, g.w - 10, 8, { align: 'right', valign: 'top', size: 14, color: c.primary });
      }
      // 通った点と矢印（新しいほど濃く）
      const from = Math.max(0, n - 12);
      for (let i = from; i < n; i++) {
        const a = xs[i], b = xs[i + 1], al = 0.25 + 0.6 * (i - from + 1) / (n - from);
        if (Math.abs(g.X(b) - g.X(a)) > 3 || Math.abs(g.Y(f.f(b)) - g.Y(f.f(a))) > 3) g.arrow(a, f.f(a), b, f.f(b), { color: c.accent, width: 2, head: 11, alpha: al });
        g.dot(a, f.f(a), { r: 3.5, color: c.accent, stroke: false });
      }
      // 足元の傾き（接線を短く）と、次の1歩の予告
      if (st.msg !== 'div' && x >= g.xmin && x <= g.xmax) {
        const fx = f.f(x), m = f.df(x), w = 0.6;
        g.line(x - w, fx - m * w, x + w, fx + m * w, { color: c.teal, width: 2.5 });
        const nx = x - st.eta * m;
        if (Math.abs(g.X(nx) - g.X(x)) > 8) g.arrow(x, fx, nx, fx, { color: c.accent, width: 2, dash: [5, 4], head: 10, alpha: 0.8 });
        if (n > 0) g.dot(x, fx, { r: 9, color: c.violet });
      }
    };
    restart(3);
  }

  /* ==========================================================
     4.9(3) 数値微分の誤差と h
     ========================================================== */
  function initNumDiff() {
    const root = $id('w-numdiff');
    const a = 1, T = Math.cos(a), f = Math.sin;
    const fwd = (h) => (f(a + h) - f(a)) / h, cen = (h) => (f(a + h) - f(a - h)) / (2 * h);
    const lg = (e) => (e > 0 ? Math.max(-17, Math.log10(e)) : -17);
    const P1 = [], P2 = [];
    for (let p = -16; p <= 0.0001; p += 0.02) { const h = Math.pow(10, p); P1.push([p, lg(Math.abs(fwd(h) - T))]); P2.push([p, lg(Math.abs(cen(h) - T))]); }
    const st = { p: -3 };
    const plot = new Plot(root.querySelector('canvas'), { xmin: -16.8, xmax: 0.6, ymin: -17.5, ymax: 1.5, ratio: [0.85, 0.48] });
    const sh = slider(root.querySelector('.controls'), { tex: '\\red{h}', min: -16, max: 0, step: 1, value: -3, color: 'accent', aria: 'h の大きさ（10 の何乗か）',
      fmt: (v) => (v === 0 ? '1' : '10^' + v) });
    sh.on((v) => { st.p = v; update(); });
    function update() {
      const h = Math.pow(10, st.p), v1 = fwd(h), v2 = cen(h), tS = T.toFixed(15);
      tex(root, 'true', '\\cos1=' + tS);
      tex(root, 'fwd', '\\dfrac{\\sin(1+h)-\\sin1}{h}=' + digitsTeX(v1.toFixed(15), tS));
      tex(root, 'cen', '\\dfrac{\\sin(1+h)-\\sin(1-h)}{2h}=' + digitsTeX(v2.toFixed(15), tS));
      const how = R(root, 'how');
      let s;
      if (st.p >= -2) s = '$h$ が<b>大きい</b>：曲線を直線で近似したずれが残っています。中心差分のほうが、ずっと小さいずれです。';
      else if (st.p >= -4) s = '$h$ を小さくするほど正確に。中心差分は $h$ が $\\frac{1}{10}$ になると、誤差が $\\frac{1}{100}$ になります。';
      else if (st.p >= -9) s = 'このあたりが<b>ちょうどよい</b> $h$。前進差分は $10^{-8}$、中心差分は $10^{-5}$ くらいがいちばん正確です。';
      else if (st.p >= -14) s = '$h$ が<b>小さすぎる</b>：丸め誤差が $\\frac{1}{h}$ 倍にふくらんで、合っている桁（緑）が減っていきます。';
      else s = '$1+h$ が、コンピュータの中では $1$ とほとんど区別できません。差がほぼ $0$ になり、まったく正しくない値です。';
      setHTML(how, s + '　緑：正しい値と合っている桁');
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c;
      g.grid({ stepX: 1, stepY: 1, labels: false, axes: false });
      for (let p = -16; p <= 0; p += 4) g.texPx(p === 0 ? '1' : '10^{' + p + '}', g.X(p), g.h - 4, { align: 'center', valign: 'bottom', size: 12, color: c.muted });
      for (let q = -16; q <= 0; q += 4) if (g.Y(q) > 20 && g.Y(q) < g.h - 30) g.texPx(q === 0 ? '1' : '10^{' + q + '}', 4, g.Y(q), { align: 'left', size: 12, color: c.muted });
      g.texPx('\\red{h}\\ \\text{→ 大きい}', g.w - 8, g.h - 24, { align: 'right', valign: 'bottom', size: 13, color: c.muted });
      g.texPx('\\text{誤差（上ほど大きい）}', 50, 6, { align: 'left', valign: 'top', size: 13, color: c.muted });
      g.poly(P1, { color: c.accent, width: 2.2 });
      g.poly(P2, { color: c.amber, width: 2.6 });
      g.tex('\\text{前進差分}', -1.3, P1[Math.round((16 - 1.3) / 0.02)][1], { color: c.accent, size: 14, align: 'right', dx: -6, dy: -14, avoid: true });
      g.tex('\\text{中心差分}', -3.2, P2[Math.round((16 - 3.2) / 0.02)][1], { color: c.amber, size: 14, align: 'right', dx: -10, avoid: true });
      const i = Math.round((st.p + 16) / 0.02);
      g.line(st.p, g.ymin, st.p, g.ymax, { color: c.accent, width: 1.2, dash: [4, 4] });
      g.dot(st.p, P1[i][1], { r: 5.5, color: c.accent });
      g.dot(st.p, P2[i][1], { r: 5.5, color: c.amber });
    };
    update();
  }

  /* ==========================================================
     4.9(3) センサーのノイズ
     ========================================================== */
  function initNoise() {
    const root = $id('w-noise');
    const cvs = root.querySelectorAll('canvas');
    const DT = 0.05, N = 160;
    const st = { sig: 0.01, k: 1, seed: 7, x: [] };
    const px = new Plot(cvs[0], { xmin: -0.2, xmax: 8.2, ymin: -1.45, ymax: 1.45, ratio: [0.5, 0.26] });
    const pv = new Plot(cvs[1], { xmin: -0.2, xmax: 8.2, ymin: -3.2, ymax: 3.2, ratio: [0.5, 0.26] });
    const ctl = root.querySelector('.controls');
    const ss = slider(ctl, { tex: '\\text{ノイズ}', min: 0, max: 0.05, step: 0.005, value: 0.01, color: 'primary', aria: 'ノイズの大きさ', fmt: (v) => '±' + num(v, 3) });
    const sk = slider(ctl, { tex: '\\red{h}', min: 1, max: 10, step: 1, value: 1, color: 'accent', aria: '差分の間隔 h', fmt: (v) => num(v * DT, 2) });
    function gen() {
      const r = rng(st.seed);
      st.n = [];
      for (let i = 0; i <= N; i++) st.n.push(gauss(r));
    }
    ss.on((v) => { st.sig = v; update(); });
    sk.on((v) => { st.k = v; update(); });
    R(root, 'regen').addEventListener('click', () => { st.seed++; gen(); update(); });
    function data() { const xs = []; for (let i = 0; i <= N; i++) xs.push(Math.sin(i * DT) + st.sig * st.n[i]); return xs; }
    function update() {
      const h = st.k * DT;
      tex(root, 'eq', '\\amber{v_i}=\\dfrac{x_{i+' + st.k + '}-x_{i-' + st.k + '}}{2\\times' + num(h, 2) + '}');
      let s;
      if (st.sig === 0) s = 'ノイズがなければ、差分の速さ（金）は正しい速さ $\\cos t$（点線）とほぼ重なります。';
      else if (st.k <= 2) s = '位置のノイズは ±' + num(st.sig, 3) + ' と小さいのに、速さでは最大 ±' + num(st.sig / h, 2) + ' くらいまで<b>拡大</b>されます（$\\frac{1}{h}$ 倍）。';
      else s = '間隔 $h$ を広げると、ノイズの影響が $\\frac{1}{h}$ 倍に<b>減って</b>なめらかになります。ただし、$h$ が大きすぎると急な変化がぼやけます。';
      setHTML(R(root, 'how'), s);
      px.invalidate(); pv.invalidate();
    }
    px.draw = function (g) {
      const c = g.c, xs = data();
      ticks(g, { sx: 1, sy: 1, xl: 't', yl: '' });
      const pts = xs.map((v, i) => [i * DT, v]);
      g.poly(pts, { color: c.primary, width: 1.2, alpha: 0.5 });
      pts.forEach((p) => g.dot(p[0], p[1], { r: 2.2, color: c.primary, stroke: false }));
    };
    pv.draw = function (g) {
      const c = g.c, xs = data(), k = st.k, h = k * DT;
      ticks(g, { sx: 1, sy: 1, xl: 't', yl: '' });
      D.curve(g, Math.cos, { x0: 0, x1: N * DT, color: c.muted, width: 2, dash: [5, 5] });
      const pts = [];
      for (let i = k; i <= N - k; i++) pts.push([i * DT, clamp((xs[i + k] - xs[i - k]) / (2 * h), -3.15, 3.15)]);
      g.poly(pts, { color: c.amber, width: 2.2 });
      g.texPx('\\text{点線：正しい速さ }\\cos t', g.w - 8, g.h - 6, { align: 'right', valign: 'bottom', size: 13, color: c.muted });
    };
    gen(); update();
  }

  /* ==========================================================
     4.9(3) 画像のエッジ検出
     ========================================================== */
  function initEdge() {
    const root = $id('w-edge');
    const W = 64, H = 40, S = 6;
    const base = new Float32Array(W * H), noise = new Float32Array(W * H);
    const r = rng(11);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = 0.88 - 0.22 * x / W;
      if (x >= 9 && x <= 24 && y >= 7 && y <= 31) v = 0.15;
      if ((x - 45) ** 2 + (y - 20) ** 2 <= 110) v = 0.5;
      if (x >= 30 && x <= 31 && y >= 4 && y <= 35) v = 0.3;
      base[y * W + x] = v; noise[y * W + x] = gauss(r);
    }
    const st = { row: 20, noise: false, blur: false };
    const cImg = R(root, 'img'), cEdge = R(root, 'edge');
    [cImg, cEdge].forEach((cv) => { cv.width = W * S; cv.height = H * S; });
    const plot = new Plot(root.querySelector('.stage canvas'), { xmin: -4.5, xmax: W + 2, ymin: -0.75, ymax: 1.15, ratio: [0.55, 0.3] });
    const ctl = root.querySelector('.controls');
    const sr = slider(ctl, { tex: '\\text{行}', min: 0, max: H - 1, step: 1, value: 20, color: 'accent', aria: '調べる行', fmt: (v) => String(v) });
    sr.on((v) => { st.row = v; draw(); });
    R(root, 'noise').addEventListener('change', (e) => { st.noise = e.target.checked; draw(); });
    R(root, 'blur').addEventListener('change', (e) => { st.blur = e.target.checked; draw(); });
    const at = (A, x, y) => A[clamp(y, 0, H - 1) * W + clamp(x, 0, W - 1)];
    function images() {
      const I = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) I[i] = clamp(base[i] + (st.noise ? 0.06 * noise[i] : 0), 0, 1);
      let J = I;
      if (st.blur) {
        J = new Float32Array(W * H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          let s = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += at(I, x + dx, y + dy);
          J[y * W + x] = s / 9;
        }
      }
      const gx = new Float32Array(W * H), E = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const a = (at(J, x + 1, y) - at(J, x - 1, y)) / 2, b = (at(J, x, y + 1) - at(J, x, y - 1)) / 2;
        gx[y * W + x] = a; E[y * W + x] = Math.min(1, 3 * Math.hypot(a, b));
      }
      return { I, J, gx, E };
    }
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const octx = off.getContext('2d');
    function paint(cv, A, c) {
      const im = octx.createImageData(W, H);
      for (let i = 0; i < W * H; i++) { const v = Math.round(A[i] * 255); im.data[4 * i] = im.data[4 * i + 1] = im.data[4 * i + 2] = v; im.data[4 * i + 3] = 255; }
      octx.putImageData(im, 0, 0);
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, W * S, H * S);
      ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.setLineDash([8, 5]);
      ctx.strokeRect(1, st.row * S - 1, W * S - 2, S + 2);
      ctx.setLineDash([]);
    }
    let cur = null;
    function draw() {
      cur = images();
      const c = L.palette();
      paint(cImg, cur.I, c); paint(cEdge, cur.E, c);
      tex(root, 'eq', '\\amber{d_j}=\\dfrac{\\blue{I_{j+1}}-\\blue{I_{j-1}}}{2}');
      let s;
      if (st.noise && !st.blur) s = 'ノイズの差分も拾ってしまい、エッジの画像が<b>ザラザラ</b>に。「差分の前にぼかす」を試そう。';
      else if (st.noise && st.blur) s = '先にぼかして（となりと平均して）から差分をとると、ノイズが減り、輪郭が見えるようになります。';
      else s = '明るさ（青）が急に変わる所で、差分（金）が大きくなります。明るさが一定の所では差分は $0$。暗くなる所はマイナス、明るくなる所はプラスです。';
      setHTML(R(root, 'how'), s);
      plot.invalidate();
    }
    plot.draw = function (g) {
      const c = g.c;
      g.grid({ stepX: 8, stepY: 0.5, xlabel: 'j', ylabel: '' });
      if (!cur) return;
      const bri = [], dif = [], y = st.row, A = st.blur ? cur.J : cur.I;
      for (let x = 0; x < W; x++) { bri.push([x - 0.5, A[y * W + x]], [x + 0.5, A[y * W + x]]); dif.push([x, cur.gx[y * W + x]]); }
      g.poly(bri, { color: c.primary, width: 2.5 });
      g.poly(dif, { color: c.amber, width: 2.5 });
      g.texPx('\\blue{\\text{明るさ }I_j}', 10, 6, { align: 'left', valign: 'top', size: 13 });
      g.texPx('\\amber{\\text{差分 }d_j}', 10, g.h - 6, { align: 'left', valign: 'bottom', size: 13 });
    };
    document.addEventListener('themechange', draw);
    draw();
  }

  /* ==========================================================
     4.9(4) チャレンジ：谷底を探せ
     ========================================================== */
  const LC = (x) => 2 * Math.log(Math.cosh(x - 1.7));
  const GD_STAGES = [
    { name: '放物線', f: (x) => x * x, df: (x) => 2 * x, ftex: 'x^2', dtex: '2x', x0: 3, xs: 0, N: 10, eta: [0.02, 1.2, 0.1], s3: 2, s2: 5,
      view: { xmin: -3.6, xmax: 3.6, ymin: -1.2, ymax: 11 }, sy: 2,
      text: '放物線 $y=x^2$ の谷底へ、<b>10 歩以内</b>に着こう（2歩以内で★3）',
      hint: '$f\'(x)=2x$ なので $x_{n+1}=x_n-2\\eta x_n=(1-2\\eta)x_n$。毎回 $(1-2\\eta)$ 倍になります。これが $0$ になる $\\eta$ は？',
      answer: '<b>$\\eta=0.5$ で1歩</b>。$x_{n+1}=(1-2\\eta)x_n$ なので、$\\eta=0.5$ なら $x_1=0$ でいきなり谷底。<br>$0\\lt\\eta\\lt1$ なら近づき（$\\eta$ が $0.5$ から離れるほど遅い）、$\\eta=1$ で行ったり来たり、$\\eta\\gt1$ で発散する。★3 は $0.44\\lt\\eta\\lt0.56$ くらい。' },
    { name: '急な谷', f: (x) => 4 * x * x, df: (x) => 8 * x, ftex: '4x^2', dtex: '8x', x0: 2, xs: 0, N: 10, eta: [0.02, 0.4, 0.3], s3: 2, s2: 4,
      view: { xmin: -3, xmax: 3, ymin: -2, ymax: 20 }, sy: 5,
      text: '急な谷 $y=4x^2$。<b>10 歩以内</b>に谷底へ（2歩以内で★3）',
      hint: 'まずはそのまま転がしてみよう。谷が急だと傾きが大きいので、同じ $\\eta$ でも歩幅が大きくなります。$x_{n+1}=(1-8\\eta)x_n$ です。',
      answer: '<b>$\\eta=0.125$ で1歩</b>。$f\'(x)=8x$ なので $x_{n+1}=(1-8\\eta)x_n$。$\\eta=\\frac18$ で $x_1=0$。<br>$\\eta\\gt0.25$ だと $|1-8\\eta|\\gt1$ で発散（はじめの $\\eta=0.3$ がそう）。<b>急な谷ほど、学習率は小さく</b>しないといけない。★3 は $0.11\\leqq\\eta\\leqq0.14$ くらい。' },
    { name: 'でこぼこ', f: Q, df: dQ, ftex: Q_TEX, dtex: '\\frac{2x^3}{5}-2x+\\frac12', x0: -3.4, xs: Q_MIN, N: 15, eta: [0.01, 0.6, 0.02], s3: 3, s2: 6,
      view: { xmin: -3.7, xmax: 3.7, ymin: -1.5, ymax: 8.5 }, sy: 2,
      text: 'でこぼこの地形。左の<b>深い谷</b>へ、<b>15 歩以内</b>に着こう（3歩以内で★3）',
      hint: 'はじめの $\\eta=0.02$ では遅すぎます。スタートの坂は急（傾き $-8.4$）なので、$\\eta$ を少し大きくするだけで大きく進みます。大きくしすぎると谷を飛びこえます。',
      answer: '<b>$\\eta=0.12$ くらい</b>（1歩）。スタート $x_0=-3.4$ の傾きは $f\'(-3.4)\\approx-8.4$ なので、$\\eta=0.12$ なら $x_1\\approx-3.4+1.0=-2.4$ で、ほぼ谷底 $x\\approx-2.35$。<br>$0.10\\sim0.19$ なら3歩以内。$\\eta\\gt0.4$ くらいになると、谷底での曲がり方が急なため振動して止まらない。' },
    { name: 'スタート地点', f: Q, df: dQ, ftex: Q_TEX, dtex: '\\frac{2x^3}{5}-2x+\\frac12', x0: 3, xs: Q_MIN, N: 15, eta: [0.01, 0.6, 0.1], s3: 3, s2: 6, pick: [-1, 3.4],
      view: { xmin: -3.7, xmax: 3.7, ymin: -1.5, ymax: 8.5 }, sy: 2,
      text: '同じ地形で、<b>スタート地点 $x_0$ も選べる</b>（$-1\\leqq x_0$）。<b>深い谷</b>へ 15 歩以内に（3歩以内で★3）',
      hint: 'そのまま転がすと、右の浅い谷で止まってしまいます。ボールは「足元の傾き」しか見ていません。山の頂上（$x\\approx0.25$）のどちら側から始めるかが大事です。',
      answer: '<b>$x_0$ を山の頂上 $x\\approx0.25$ より左に</b>する。右から始めると、どんな小さな $\\eta$ でも右の浅い谷（極小 $x\\approx2.10$）に落ちて止まる（局所的な谷）。<br>例えば $x_0=-1,\\ \\eta=0.32$ なら2歩、$x_0=-0.5,\\ \\eta=0.33$ なら3歩。<b>勾配降下法の答えは、スタート地点しだい</b>。AI の学習では、スタートを何通りも試したり、ゆらぎを加えたりする。' },
    { name: '霧の中', f: LC, df: (x) => 2 * Math.tanh(x - 1.7), ftex: '?', dtex: '?', x0: -3, xs: 1.7, N: 20, eta: [0.05, 1.5, 0.1], s3: 5, s2: 10, fog: true,
      view: { xmin: -3.6, xmax: 4.4, ymin: -0.8, ymax: 9.5 }, sy: 2,
      text: '<b>霧の中</b>：地形は見えない。足元の傾きだけをたよりに、20 歩以内で谷底へ（5歩以内で★3）',
      hint: '1回転がすと、通った所の足元だけが見えます。遠くでは坂の傾きがほぼ一定（約 $-2$）です。$\\eta=0.1$ だと1歩で約 $0.2$ しか進みません。',
      answer: '地形は $f(x)=2\\log\\cosh(x-1.7)$（谷底 $x=1.7$）。傾きは $f\'(x)=2\\tanh(x-1.7)$ で、遠くではほぼ $\\pm2$、谷底の近くでは $2(x-1.7)$。<br>遠くでは1歩 $\\approx2\\eta$ 進むので、$\\eta$ が大きいほど早く着く。でも谷底では $x_{n+1}-1.7\\approx(1-2\\eta)(x_n-1.7)$ なので、$\\eta\\geqq1$ だと止まらない。<b>$\\eta=0.81$ 前後で3歩</b>、$0.53\\sim0.64$ で4〜5歩。' },
  ];
  function initGameGD() {
    const root = $id('w-game-gd');
    const TOL = 0.05;
    const plot = new Plot(root.querySelector('.stage canvas'), { xmin: -3.6, xmax: 3.6, ymin: -1, ymax: 11, ratio: [0.8, 0.46] });
    const ctl = root.querySelector('.controls');
    const se = slider(ctl, { tex: '\\eta', min: 0.02, max: 1.2, step: 0.01, value: 0.1, color: 'accent', aria: '学習率 η', fmt: (v) => num(v, 2) });
    const sx = slider(ctl, { tex: '\\teal{x_0}', min: -1, max: 3.4, step: 0.1, value: 3, color: 'teal', aria: 'スタート地点 x0', fmt: (v) => num(v, 1) });
    const B = L.game.gameButtons(ctl, '▶ 転がす');
    const conf = L.game.Confetti(root, plot);
    const st = { eta: 0.1, x0: 3, xs: [3], shown: 1, run: false, t: 0, reveal: false, seen: [] };
    let game = null;
    const S = () => GD_STAGES[game ? game.k : 0];
    function reset() {
      st.xs = [st.x0]; st.shown = 1; st.run = false;
      B.bMain.disabled = false;
      prog(); plot.invalidate();
    }
    se.on((v) => { st.eta = v; if (!st.run) reset(); game.formula(); });
    sx.on((v) => { st.x0 = v; if (!st.run) reset(); game.formula(); });
    // 全部の歩数を先に計算しておく
    function simulate() {
      const s = S(), xs = [st.x0];
      let x = st.x0, div = false;
      for (let i = 0; i < s.N; i++) {
        x = x - st.eta * s.df(x);
        if (!isFinite(x) || Math.abs(x) > 60) { div = true; break; }
        xs.push(x);
      }
      let k = -1;
      if (!div) for (let j = xs.length - 1; j >= 0; j--) { if (Math.abs(xs[j] - s.xs) < TOL) k = j; else break; }
      return { xs, div, k };
    }
    let result = null;
    function prog() {
      const s = S(), n = st.shown - 1;
      R(root, 'prog').textContent = n + ' / ' + s.N + ' 歩';
    }
    const anim = L.animate(root, function (dt) {
      if (!st.run) return false;
      st.t += dt;
      if (st.t >= 0.32) {
        st.t = 0;
        st.shown++;
        const x = st.xs[st.shown - 1];
        if (S().fog) st.seen.push(x);
        prog(); plot.invalidate();
        if (st.shown >= st.xs.length) { st.run = false; finish(); return false; }
      }
      return true;
    });
    function finish() {
      const s = S(), r = result, x = st.xs[st.xs.length - 1];
      B.bMain.disabled = false;
      if (s.fog) st.reveal = true;
      if (r.k >= 0) {
        const n = r.k <= s.s3 ? 3 : r.k <= s.s2 ? 2 : 1;
        game.award(n);
        game.result('🎉 谷底に到着！ ' + L.game.starStr(n) + '（' + r.k + ' 歩で到着）' + (n < 3 ? '　★3 は ' + s.s3 + ' 歩以内' : ''), 'hit');
        B.bNext.hidden = game.k >= GD_STAGES.length - 1;
        conf.fire(plot.X(s.xs), plot.Y(s.f(s.xs)) - 20);
      } else if (r.div) game.result('✗ 発散：歩幅が大きすぎて、谷を飛びこえて飛んでいきました。$\\eta$ を小さくしよう。', 'miss');
      else if (s.df === dQ && Math.abs(x - Q_LOC) < 0.3) game.result('✗ 右の浅い谷で止まりました。ここは本当の谷底ではありません（局所的な谷）。', 'miss');
      else {
        const xs = st.xs, m = xs.length;
        const swing = m > 3 && (xs[m - 1] - xs[m - 2]) * (xs[m - 2] - xs[m - 3]) < 0 && Math.abs(xs[m - 1] - xs[m - 2]) > TOL;
        game.result(swing ? '✗ 谷の左右を行ったり来たり（振動）して、止まりませんでした。$\\eta$ を少し小さくしよう。'
          : '✗ ' + s.N + ' 歩では着きませんでした。1歩が小さすぎるようです。$\\eta$ を大きくしよう。', 'miss');
      }
      plot.invalidate();
    }
    B.bMain.addEventListener('click', function () {
      if (st.run) return;
      result = simulate();
      // 到着したら、そこで止める（あとは同じ所にいるだけなので）
      st.xs = result.k >= 0 ? result.xs.slice(0, result.k + 1) : result.xs; st.shown = 1; st.run = st.xs.length > 1; st.t = 0;
      if (S().fog) st.seen.push(st.x0);
      B.bMain.disabled = true; B.bNext.hidden = true;
      game.result('転がしています…');
      prog();
      if (st.run) anim.kick(); else finish();
    });
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, GD_STAGES.length - 1)));
    game = L.game.GameShell(root, { key: '4-9:game', stages: GD_STAGES, idle: '$\\eta$ を決めて「▶ 転がす」を押そう',
      formula: function () {
        const s = S();
        return '\\begin{aligned}' + (s.fog ? '' : '&\\blue{f(x)=' + s.ftex + '}\\\\') + '&x_{n+1}=x_n-\\eta\\,f\'(x_n)' +
          '\\\\&\\eta=' + num(st.eta, 2) + ',\\quad \\teal{x_0=' + num(st.x0, 1) + '}\\end{aligned}';
      },
      onStage(k, s) {
        st.run = false; st.reveal = false; st.seen = [];
        se.input.min = s.eta[0]; se.input.max = s.eta[1]; st.eta = s.eta[2]; se.set(st.eta);
        st.x0 = s.x0;
        sx.row.style.display = s.pick ? '' : 'none';
        if (s.pick) { sx.input.min = s.pick[0]; sx.input.max = s.pick[1]; sx.set(st.x0); }
        plot.setView(s.view);
        B.bNext.hidden = true;
        typeset(R(root, 'mission'));
        reset();
      } });
    plot.draw = function (g) {
      const c = g.c, s = S(), xs = st.xs, n = st.shown - 1, x = xs[n];
      g.grid({ step: 1, stepY: s.sy, xlabel: 'x', ylabel: 'y' });
      const hide = s.fog && !st.reveal;
      // 谷底（旗）と、到着とみなす範囲
      if (!hide) {
        g.ctx.save(); g.ctx.fillStyle = c.teal; g.ctx.globalAlpha = 0.14;
        g.ctx.fillRect(g.X(s.xs - TOL) - 2, 0, g.X(s.xs + TOL) - g.X(s.xs - TOL) + 4, g.h); g.ctx.restore();
        const fx = s.f(s.xs), px = g.X(s.xs), py = g.Y(fx);
        g.ctx.save(); g.ctx.strokeStyle = c.text; g.ctx.lineWidth = 2;
        g.ctx.beginPath(); g.ctx.moveTo(px, py); g.ctx.lineTo(px, py - 34); g.ctx.stroke();
        g.ctx.fillStyle = c.accent; g.ctx.beginPath(); g.ctx.moveTo(px, py - 34); g.ctx.lineTo(px + 16, py - 28); g.ctx.lineTo(px, py - 22); g.ctx.closePath(); g.ctx.fill();
        g.ctx.restore();
      }
      if (hide) {
        st.seen.forEach((t) => D.curve(g, s.f, { x0: t - 0.35, x1: t + 0.35, n: 30, color: c.primary, width: 3.5, alpha: 0.45 }));
        D.curve(g, s.f, { x0: x - 0.5, x1: x + 0.5, n: 40, color: c.primary, width: 3.5 });
        g.texPx('\\text{霧で見えない（足元だけ見える）}', 10, g.h - 8, { align: 'left', valign: 'bottom', size: 13, color: c.muted });
      } else D.curve(g, s.f, { color: c.primary, width: 3.5 });
      for (let i = 0; i < n; i++) {
        const a = xs[i], b = xs[i + 1];
        if (Math.abs(g.X(b) - g.X(a)) > 3 || Math.abs(g.Y(s.f(b)) - g.Y(s.f(a))) > 3) g.arrow(a, s.f(a), b, s.f(b), { color: c.accent, width: 2, head: 11, alpha: 0.75 });
        g.dot(a, s.f(a), { r: 3.5, color: c.accent, stroke: false });
      }
      if (x >= g.xmin && x <= g.xmax && s.f(x) <= g.ymax + 1) {
        const fx = s.f(x), m = s.df(x), w = 0.55;
        g.line(x - w, fx - m * w, x + w, fx + m * w, { color: c.teal, width: 2.5 });
        g.dot(x, fx, { r: 9, color: n === 0 ? c.teal : c.violet });
      }
      conf.draw(g);
    };
    game.setStage(0);
  }

  /* ==========================================================
     確認問題の答えのグラフ
     ========================================================== */
  function initQuizFigs() {
    document.querySelectorAll('#check canvas[data-q]').forEach(function (cv) {
      const plot = new Plot(cv, { xmin: 0.9, xmax: 2.25, ymin: -0.7, ymax: 2.3, height: (w) => clamp(w * 0.55, 170, 280) });
      const f = (x) => x * x - 2;
      plot.draw = function (g) {
        const c = g.c, P = [2, 1.5, 17 / 12];
        ticks(g, { sx: 0.25, sy: 0.5 });
        D.curve(g, f, { color: c.primary, width: 3 });
        for (let i = 0; i < 2; i++) {
          const a = P[i], b = P[i + 1];
          g.line(a, 0, a, f(a), { color: c.muted, width: 1, dash: [3, 4] });
          g.line(a, f(a), b, 0, { color: c.teal, width: 2.5 });
          g.dot(a, f(a), { r: 4.5, color: c.teal });
        }
        P.forEach((x, i) => { g.dot(x, 0, { r: 4, color: c.text }); g.tex('x_{' + i + '}', x, 0, { align: i === 2 ? 'right' : 'center', valign: 'bottom', dx: i === 2 ? -4 : 0, dy: -8, size: 14 }); });
        g.tex('y=x^2-2', 2.2, f(2.2), { color: c.primary, size: 14, align: 'right', dx: -14, avoid: true });
      };
      plot.invalidate();
    });
  }

  D.boot([
    [initNewton, 'w-newton'],
    [initQuake, 'w-quake'],
    [initGD, 'w-gd'],
    [initNumDiff, 'w-numdiff'],
    [initNoise, 'w-noise'],
    [initEdge, 'w-edge'],
    [initGameGD, 'w-game-gd'],
    [initQuizFigs, 'check'],
  ]);
})();
