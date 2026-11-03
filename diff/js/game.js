/* 第4章 微分 — ミニゲーム「微分の山脈」
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, diff/js/diff-common.js (Diff)
 * 色の約束: 関数 f = 青, 接線 = 緑, 割線・増分 = 赤, 導関数 f' = 金
 *
 *   1. 山脈の地図：各節のチャレンジ（'4-1:game' … '4-10:game'、4.6・4.8 はなし）の★を読んで表示
 *   2. 総合ステージ「山脈を越えろ」（'4-range:game'、5ステージ）
 *   3. 章のバッジ「微分マスター」（'4-badge' に { master: 1 } を記録）
 */
(function () {
  'use strict';
  const L = window.Lab, D = window.Diff;
  const { el, num, Plot } = L;
  const { starStr, GameShell, gameButtons, Confetti } = L.game;
  const R = D.R, $id = (id) => document.getElementById(id);
  const DEG = Math.PI / 180, E = Math.E;
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };

  /* ==========================================================
     1. 山脈の地図
     ========================================================== */
  const MKEY = '4-range:game', BKEY = '4-badge', NSTAGE = 5;
  const SPOTS = [
    { key: '4-1:game', no: '4.1', name: '接線を当てろ', skill: '割線から接線へ', href: '4-1.html#w-game-tangent', x: 60, y: 300 },
    { key: '4-2:game', no: '4.2', name: '傾きのグラフを描け', skill: '導関数のグラフ', href: '4-2.html#w-game-slope', x: 120, y: 196 },
    { key: '4-3:game', no: '4.3', name: '公式タイムアタック', skill: 'いろいろな関数の微分', href: '4-3.html#w-game-ta', x: 196, y: 248 },
    { key: '4-4:game', no: '4.4', name: '装置をつなげ', skill: '合成関数の微分', href: '4-4.html#w-game-chain', x: 250, y: 150 },
    { key: '4-5:game', no: '4.5', name: '最強の缶を作れ', skill: '増減と極値・最適化', href: '4-5.html#w-game-can', x: 372, y: 140 },
    { key: '4-7:game', no: '4.7', name: '近似で当てろ', skill: '1次近似・テイラー展開', href: '4-7.html#w-game-approx', x: 424, y: 236 },
    { key: '4-9:game', no: '4.9', name: '谷底を探せ', skill: '勾配降下法', href: '4-9.html#w-game-gd', x: 482, y: 176 },
    { key: '4-10:game', no: '4.10', name: 'AI を育てろ', skill: '誤差逆伝播法', href: '4-10.html#w-game', x: 548, y: 296 },
  ];
  const sumStars = (v) => Object.values(v || {}).reduce((a, b) => a + (+b || 0), 0);
  const clearedAll = (v) => { for (let i = 1; i <= NSTAGE; i++) if (!((v || {})[i] > 0)) return false; return true; };

  function initMap() {
    const pinBox = R($id('mt-map'), 'pins'), spotBox = $id('mt-spots'), meter = $id('mt-meter');
    const pins = SPOTS.map(function (s) {
      const a = el('a', 'isl-pin', '<b>' + s.no + '</b><span></span>');
      a.href = s.href;
      a.style.left = (s.x / 600 * 100) + '%'; a.style.top = (s.y / 380 * 100) + '%';
      pinBox.append(a);
      return a;
    });
    const peak = el('a', 'isl-pin isl-pin-fort', '<b>総合</b><span></span>');
    peak.href = '#w-game-range'; peak.style.left = (314 / 600 * 100) + '%'; peak.style.top = (62 / 380 * 100) + '%';
    pinBox.append(peak);
    const cards = SPOTS.map(function (s) {
      const a = el('a', 'isl-spot', '<span class="isl-no">' + s.no + '</span><span class="isl-nm"><b>' + s.name + '</b><small>' + s.skill + '</small></span><span class="isl-st"></span>');
      a.href = s.href;
      spotBox.append(a);
      return a;
    });
    const fcard = el('a', 'isl-spot isl-spot-fort', '<span class="isl-no">総合</span><span class="isl-nm"><b>山脈を越えろ</b><small>いくつもの節の道具を組み合わせる</small></span><span class="isl-st"></span>');
    fcard.href = '#w-game-range';
    spotBox.append(fcard);

    function render() {
      const all = L.progress.all();
      let tot = 0;
      SPOTS.forEach(function (s, i) {
        const n = sumStars(all[s.key]);
        tot += n;
        pins[i].querySelector('span').textContent = '★' + n;
        pins[i].classList.toggle('got', n > 0);
        pins[i].setAttribute('aria-label', s.no + ' ' + s.name + '　★' + n + ' / 15');
        cards[i].querySelector('.isl-st').innerHTML = '★ ' + n + '<small> / 15</small>';
        cards[i].classList.toggle('got', n > 0);
      });
      const fi = all[MKEY], fn = sumStars(fi), fc = clearedAll(fi);
      peak.querySelector('span').textContent = fc ? 'クリア' : '★' + fn;
      peak.classList.toggle('got', fc);
      peak.setAttribute('aria-label', '総合ステージ 山脈を越えろ　★' + fn + ' / 15');
      fcard.querySelector('.isl-st').innerHTML = '★ ' + fn + '<small> / 15</small>';
      fcard.classList.toggle('got', fc);
      R(meter, 'total').textContent = '★ ' + tot + ' / ' + SPOTS.length * 15;
      R(meter, 'bar').style.width = (tot / (SPOTS.length * 15) * 100) + '%';
      renderBadge(all);
    }
    document.addEventListener('progress', render);
    render();
  }

  /* ---------- 章のバッジ ---------- */
  function renderBadge(all) {
    const box = document.querySelector('.isl-badge');
    if (!box) return;
    const okSec = SPOTS.map((s) => sumStars(all[s.key]) > 0), okFin = clearedAll(all[MKEY]);
    const meets = okSec.every(Boolean) && okFin;
    const stored = !!(all[BKEY] && all[BKEY].master);
    // 条件を満たしたら記録する（あとで★が消えてもバッジは残る）
    if (meets && !stored) { L.progress.set(BKEY, { master: 1 }); return; }
    const got = meets || stored;
    box.classList.toggle('got', got);
    R(box, 'bst').textContent = got ? '獲得！ おめでとう。第4章の道具をすべて使いこなしました。' : 'まだです（下の条件をすべて満たすともらえます）';
    let h = '';
    SPOTS.forEach(function (s, i) { h += '<li class="' + (okSec[i] ? 'ok' : '') + '"><a href="' + s.href + '">' + s.no + ' ' + s.name + '</a>で★1つ以上</li>'; });
    h += '<li class="' + (okFin ? 'ok' : '') + '"><a href="#w-game-range">総合ステージ「山脈を越えろ」</a>の5ステージをすべてクリア</li>';
    R(box, 'blist').innerHTML = h;
  }

  /* ==========================================================
     2. 総合ステージ「山脈を越えろ」
     ========================================================== */
  // 数の入力（分数・かっこ・pi も可）
  function parseNum(str) {
    let s = String(str || '').trim().replace(/[０-９．]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[−ー－]/g, '-').replace(/[／]/g, '/').replace(/[°度]/g, '').replace(/\s+/g, '');
    if (!s) return NaN;
    s = s.replace(/π|pi/gi, 'P').replace(/(\d|\))P/g, '$1*P').replace(/P(\d|\()/g, 'P*$1').replace(/P/g, '(' + Math.PI + ')');
    if (!/^[0-9.+\-*/()e]*$/.test(s)) return NaN;
    let v;
    try { v = Function('"use strict";return (' + s + ');')(); } catch (e) { return NaN; }
    return typeof v === 'number' && isFinite(v) ? v : NaN;
  }
  const near = (v, a, t) => Math.abs(v - a) <= t;

  // 各ステージの山（関数）
  const F1 = (x) => -x * x * x / 3 + x * x + 3 * x + 1;                 // 頂上 x=3, 高さ 10
  const F2 = (x) => Math.exp(x) - 2 * x, dF2 = (x) => Math.exp(x) - 2;   // 谷底 x=log 2
  const X1_2 = 2 - 0.5 * dF2(2);                                          // 1歩目 ≈ −0.69
  const F3 = Math.cosh, ANG3 = Math.atan(Math.sinh(1)) / DEG;             // ≈ 49.6°
  const F4 = (x) => x * x * x;
  const N1 = 4 / 3, N2 = N1 - (N1 * N1 * N1 - 2) / (3 * N1 * N1);         // ≈ 1.264
  const F5 = (x) => 8 * Math.exp(-x * x / 8), dF5 = (x) => -2 * x * Math.exp(-x * x / 8);  // f'(2) ≈ −2.43

  const STAGES = [
    { name: '頂上の高さ', unit: '', ph: '例：12.5', view: { xmin: -1.4, xmax: 5.4, ymin: -1.6, ymax: 13 },
      ans: 10, tol: 0.05,
      skills: ['4.2 多項式の微分', '4.5 増減と極値'],
      text: '山道の高さは $f(x)=-\\dfrac{x^3}{3}+x^2+3x+1$（$-1\\le x\\le5$）。頂上に旗を立てたい。<b>頂上の高さ</b>はいくつ？',
      hint: '頂上では傾きが $0$。$f\'(x)=-x^2+2x+3$ を因数分解して、$f\'(x)=0$ になる $x$ を探そう。',
      answer: '<b>高さ $10$</b>（頂上は $x=3$）<br>$f\'(x)=-x^2+2x+3=-(x-3)(x+1)$。<br>$-1\\lt x\\lt3$ で $f\'\\gt0$（上り）、$x\\gt3$ で $f\'\\lt0$（下り）なので、$x=3$ が頂上。<br>$f(3)=-9+9+9+1=10$。',
      judge(v) {
        if (near(v, 10, this.tol)) return [true, '🚩 頂上に旗を立てた！'];
        if (near(v, 3, 0.01)) return [false, 'それは頂上の $x$ 座標。聞いているのは高さ $f(3)$ です。'];
        return [false, v > 10 ? '高すぎる！ その高さの線は山に届かない。' : '低すぎる！ その高さの線は山を2か所で横切っている（まだ上がある）。'];
      } },
    { name: '霧の谷へ1歩', unit: '', ph: '例：0.25', view: { xmin: -1.7, xmax: 2.7, ymin: -0.6, ymax: 4.6 },
      ans: X1_2, tol: 0.015,
      skills: ['4.3 $e^x$ の微分', '4.9 勾配降下法'],
      text: '霧の谷 $f(x)=e^x-2x$ の $x=2$ にいる。足もとの傾きだけを見て、勾配降下法 $x\\leftarrow x-\\eta f\'(x)$ で1歩下りる。学習率は $\\eta=0.5$。1歩下りたあとの $x$ はいくつ？（小数第2位まで。$e^2\\approx7.389$）',
      hint: 'まず $f\'(x)=e^x-2$、だから $f\'(2)=e^2-2$。$x=2-0.5\\times f\'(2)$ を計算しよう。',
      answer: '<b>$x\\approx-0.69$</b><br>$f\'(x)=e^x-2$、$f\'(2)=7.389-2=5.389$。<br>$x=2-0.5\\times5.389=2-2.695=-0.695$。<br>本当の谷底は $f\'(x)=0$、つまり $e^x=2$ の $x=\\log2\\approx0.69$。<br>学習率が大きすぎて、谷底を<b>とび越して反対側</b>まで行ってしまった（4.9節の「振動」）。',
      judge(v) {
        if (near(v, X1_2, this.tol)) return [true, '👣 1歩下りた！ でも谷底をとび越している…'];
        if (near(v, 2 + 0.5 * dF2(2), 0.02)) return [false, '上り坂へ進んでしまった！ 傾きが正のときは、$x$ を<b>減らす</b>向きが下り。'];
        if (near(v, Math.log(2), 0.02)) return [false, 'それは本当の谷底 $\\log2$。聞いているのは、勾配降下法で1歩進んだ位置です。'];
        if (near(v, 2 - 0.5 * Math.exp(2), 0.02)) return [false, '$f\'(2)$ は $e^2$ ではなく $e^2-2$（$-2x$ の微分を忘れていない？）'];
        return [false, 'ちがう位置に着いた。' + (v > X1_2 ? 'もっと左（小さい $x$）。' : 'もっと右（大きい $x$）。')];
      } },
    { name: '吊り橋のケーブル', unit: '°', ph: '例：45.0', view: { xmin: -1.9, xmax: 1.9, ymin: -0.3, ymax: 2.35 },
      ans: ANG3, tol: 0.3,
      skills: ['4.3 双曲線関数の微分', '3.7・4.6 $\\tan^{-1}$', '4.2 接線'],
      text: '谷にかかる吊り橋のケーブルは $y=\\cosh x=\\dfrac{e^x+e^{-x}}{2}$ の形（カテナリー）。右の塔（$x=1$）でケーブルは水平から何度の角でつながっている？（度で、小数第1位まで。$e\\approx2.718$）',
      hint: '$(\\cosh x)\'=\\sinh x=\\dfrac{e^x-e^{-x}}{2}$。$x=1$ の傾き $m=\\sinh1$ を求めて、傾き $m$ の直線の角は $\\tan^{-1}m$。',
      answer: '<b>約 $49.6^\\circ$</b><br>傾き $m=\\sinh1=\\dfrac{e-e^{-1}}{2}\\approx\\dfrac{2.718-0.368}{2}\\approx1.175$。<br>傾き $m$ の直線と水平の角 $\\theta$ は $\\tan\\theta=m$ なので<br>$\\theta=\\tan^{-1}1.175\\approx49.6^\\circ$（$\\approx0.866$ ラジアン）。',
      judge(v) {
        if (near(v, ANG3, this.tol)) return [true, '🌉 ケーブルの角がぴったり！'];
        if (near(v, Math.sinh(1), 0.01)) return [false, 'それは傾き $\\sinh1$。角度にするには $\\tan^{-1}$ を使おう。'];
        if (near(v, ANG3 * DEG, 0.01)) return [false, 'それはラジアン。度に直して入れよう（$\\times\\dfrac{180}{\\pi}$）。'];
        if (near(v, Math.atan(Math.cosh(1)) / DEG, 0.3)) return [false, '$\\cosh1$ は高さ。傾きは微分 $\\sinh1$ です。'];
        return [false, 'ずれている。' + (v > ANG3 ? 'もっと小さい角（ゆるやか）。' : 'もっと大きい角（急）。')];
      } },
    { name: '山小屋の位置', unit: '', ph: '例：1.250', view: { xmin: 0.55, xmax: 1.75, ymin: -0.3, ymax: 3.4 },
      ans: N2, tol: 0.0012,
      skills: ['4.2 $(x^n)\'=nx^{n-1}$', '4.9 ニュートン法'],
      text: '斜面の高さが $y=x^3$ の山で、高さ $2$ のところに山小屋を建てる。$x^3=2$ をニュートン法で解こう。$f(x)=x^3-2$、出発点 $x_0=1$。<b>2回</b>くり返した $x_2$ はいくつ？（小数第3位まで）',
      hint: '$x_{n+1}=x_n-\\dfrac{f(x_n)}{f\'(x_n)}$、$f\'(x)=3x^2$。1回目は $x_1=1-\\dfrac{1-2}{3}=\\dfrac43$。もう1回！',
      answer: '<b>$x_2\\approx1.264$</b><br>$x_1=1-\\dfrac{-1}{3}=\\dfrac43\\approx1.333$。<br>$f\\left(\\dfrac43\\right)=\\dfrac{64}{27}-2=\\dfrac{10}{27}$、$f\'\\left(\\dfrac43\\right)=3\\cdot\\dfrac{16}{9}=\\dfrac{16}{3}$。<br>$x_2=\\dfrac43-\\dfrac{10}{27}\\cdot\\dfrac{3}{16}=\\dfrac43-\\dfrac{5}{72}=\\dfrac{91}{72}\\approx1.264$。<br>本当の値は $\\sqrt[3]2\\approx1.260$。2回で小数第2位まで合った。',
      judge(v) {
        if (near(v, N2, this.tol)) return [true, '🏠 山小屋の場所が決まった！'];
        if (near(v, N1, 0.002)) return [false, 'それは1回目の $x_1$。もう1回くり返そう。'];
        if (near(v, Math.cbrt(2), 0.0012)) return [false, 'それは電卓で求めた $\\sqrt[3]2$。ニュートン法で2回くり返した値を入れよう。'];
        return [false, 'ちがう。' + (v > N2 ? 'もう少し小さい。' : 'もう少し大きい。')];
      } },
    { name: '下り坂の傾き', unit: '', ph: '例：-1.50', view: { xmin: -4.4, xmax: 4.4, ymin: -0.6, ymax: 9.6 },
      ans: dF5(2), tol: 0.012,
      skills: ['4.3 $e^x$ の微分', '4.4 合成関数の微分', '4.2 接線'],
      text: '最後の山は $f(x)=8e^{-x^2/8}$。$x=2$ の地点で、スキーで下りる斜面の傾き $f\'(2)$ はいくつ？（小数第2位まで。$e^{-0.5}\\approx0.607$）',
      hint: '中身 $u=-\\dfrac{x^2}{8}$、外側 $8e^u$ の合成関数。$f\'(x)=8e^{u}\\cdot u\'$、$u\'=-\\dfrac{x}{4}$。',
      answer: '<b>$f\'(2)\\approx-2.43$</b><br>$f\'(x)=8e^{-x^2/8}\\cdot\\left(-\\dfrac{2x}{8}\\right)=-2x\\,e^{-x^2/8}$。<br>$f\'(2)=-4e^{-0.5}\\approx-4\\times0.607=-2.43$。<br>負なので下り坂。1 進むと約 $2.43$ 下がる。',
      judge(v) {
        if (near(v, dF5(2), this.tol)) return [true, '⛷ 接線とぴったり重なった！'];
        if (near(v, -dF5(2), this.tol)) return [false, '向きが逆！ $x=2$ では右へ行くと下がる（下り坂）ので、傾きは負。'];
        if (near(v, F5(2), 0.02)) return [false, 'それは高さ $f(2)$、または外側だけ微分した値。中身 $-\\dfrac{x^2}{8}$ の微分をかけ忘れていない？'];
        return [false, 'ずれている。' + (v > dF5(2) ? 'もっと急な下り（より小さい値）。' : 'もっとゆるやか（より大きい値）。')];
      } },
  ];

  function initGameRange() {
    const root = $id('w-game-range'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -1, xmax: 5, ymin: -1, ymax: 12, ratio: [0.85, 0.56] });

    const box = el('div', 'ang-row');
    const lab = el('label', 'ang-lab', '答え');
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'ang-in'; inp.id = 'range-ans'; lab.htmlFor = inp.id;
    inp.setAttribute('inputmode', 'decimal'); inp.setAttribute('autocomplete', 'off');
    const unit = el('span', 'ang-lab', '');
    box.append(lab, inp, unit);
    ctl.append(box);
    const B = gameButtons(ctl, '✔ 決定');
    const conf = Confetti(root, plot);

    const st = { tries: [] };
    const S = () => STAGES[game.k];
    const game = GameShell(root, { key: MKEY, stages: STAGES, idle: '紙と電卓で計算して、答えを入れよう',
      formula: function () {
        const v = parseNum(inp.value);
        return isFinite(v) ? '\\text{答え}=' + num(v, 4) + (S().unit === '°' ? '^\\circ' : '') : '\\text{答え}=\\ ?';
      },
      onStage(k, s) {
        st.tries = [];
        inp.value = ''; inp.disabled = false; inp.placeholder = s.ph;
        unit.textContent = s.unit;
        B.bMain.disabled = false; B.bNext.hidden = true;
        R(root, 'skills').innerHTML = '<span class="lbl-sm">使う道具</span>' + s.skills.map((x) => '<span class="isl-skill">' + x + '</span>').join('');
        typeset(R(root, 'skills')); typeset(R(root, 'mission'));
        plot.setView(s.view);
      } });
    inp.addEventListener('input', () => game.formula());
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });

    function go() {
      const s = S();
      if (game.done || game.used >= game.max) return;
      const v = parseNum(inp.value);
      if (!isFinite(v)) { game.result('数を入れてください（例：1.25、-3/4）。', 'miss'); return; }
      game.used++; game.renderThrows();
      st.tries.push(v);
      const r = s.judge(v);
      if (r[0]) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; inp.disabled = true;
        B.bNext.hidden = game.k >= STAGES.length - 1;
        let m = r[1] + ' ' + starStr(n) + '（' + game.used + ' 回目）';
        if (clearedAll(L.progress.get(MKEY))) m += '　⛰ 山脈を越えた！ 下の「章のバッジ」を見てみよう。';
        game.result(m, 'hit');
        plot.invalidate();
        const p = goal(s);
        conf.fire(plot.X(p[0]), plot.Y(p[1]));
      } else {
        let m = r[1];
        if (game.used >= game.max) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; inp.disabled = true; }
        else inp.focus({ preventScroll: true });
        game.result(m, 'miss');
        plot.invalidate();
      }
    }
    B.bMain.addEventListener('click', go);
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, STAGES.length - 1)));

    // クリアしたときの紙吹雪の場所
    function goal(s) {
      const k = STAGES.indexOf(s);
      return [[3, 10], [X1_2, F2(X1_2)], [1, F3(1)], [N2, 2], [2, F5(2)]][k];
    }

    /* ----- 絵の部品 ----- */
    // 山（曲線の下をぬる）
    function mountain(g, f, x0, x1) {
      const c = g.c, ctx = g.ctx, n = 160;
      ctx.save(); ctx.beginPath(); ctx.moveTo(g.X(x0), g.h);
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; ctx.lineTo(g.X(x), g.Y(f(x))); }
      ctx.lineTo(g.X(x1), g.h); ctx.closePath();
      ctx.fillStyle = c.teal; ctx.globalAlpha = 0.14; ctx.fill(); ctx.restore();
      D.curve(g, f, { x0, x1 });
    }
    // 登山者（足もと (x, y)）
    function hiker(g, x, y, col) {
      const ctx = g.ctx, c = g.c, px = g.X(x), py = g.Y(y);
      ctx.save(); ctx.strokeStyle = col || c.violet; ctx.fillStyle = col || c.violet; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(px, py - 25, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.moveTo(px, py - 19); ctx.lineTo(px, py - 8); ctx.moveTo(px, py - 8); ctx.lineTo(px - 5, py); ctx.moveTo(px, py - 8); ctx.lineTo(px + 5, py);
      ctx.moveTo(px - 6, py - 15); ctx.lineTo(px + 6, py - 13); ctx.stroke(); ctx.restore();
    }
    function flag(g, x, y) {
      const ctx = g.ctx, c = g.c, px = g.X(x), py = g.Y(y);
      ctx.save(); ctx.strokeStyle = c.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 30); ctx.stroke();
      ctx.fillStyle = c.accent; ctx.beginPath(); ctx.moveTo(px, py - 30); ctx.lineTo(px + 18, py - 24); ctx.lineTo(px, py - 18); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    const tried = (g, f) => st.tries.forEach((v, i) => { if (i < st.tries.length - 1 || !game.done) f(v, i === st.tries.length - 1); });

    function draw1(g) {
      const c = g.c;
      g.grid({ step: 1, stepY: 2, labels: true });
      mountain(g, F1, -1, 5);
      tried(g, (v, last) => {
        g.line(g.xmin, v, g.xmax, v, { color: c.accent, width: last ? 2 : 1.2, dash: [6, 5], alpha: last ? 1 : 0.5 });
        if (last) g.tex('y=' + num(v, 2), g.xmax, v, { dx: -6, dy: -10, align: 'right', size: 13, color: c.accent });
      });
      if (game.done) {
        g.line(1.8, 10, 4.2, 10, { color: c.teal, width: 2.5 });
        g.tex('\\teal{f\'(3)=0}', 4.2, 10, { dx: 6, align: 'left', size: 13 });
        g.line(3, 0, 3, 10, { color: c.muted, width: 1.2, dash: [4, 4] });
        flag(g, 3, 10);
      }
      hiker(g, 0, F1(0));
      g.texPx('\\blue{y=f(x)}', g.w - 8, 8, { align: 'right', valign: 'top', size: 14 });
    }
    function draw2(g) {
      const c = g.c;
      g.grid({ step: 1, labels: true });
      mountain(g, F2, g.xmin, g.xmax);
      // 霧
      if (!game.done) {
        const ctx = g.ctx;
        ctx.save(); ctx.fillStyle = c.muted; ctx.globalAlpha = 0.16;
        ctx.fillRect(0, 0, g.X(1.4), g.h); ctx.restore();
        g.text('霧', 0.2, 4, { align: 'center', size: 15, bold: true, color: c.muted });
      }
      D.tangent(g, F2, 2, { df: dF2 });
      g.tex('\\teal{\\text{傾き }f\'(2)}', 2, F2(2), { dx: -10, dy: -22, align: 'right', size: 13, avoid: true });
      tried(g, (v, last) => {
        if (v < g.xmin || v > g.xmax) return;
        g.dot(v, F2(v), { r: last ? 6 : 4, color: c.accent, alpha: last ? 1 : 0.5 });
        if (last) g.tex('x=' + num(v, 3), v, F2(v), { dy: 20, align: 'center', size: 13, color: c.accent, avoid: true });
      });
      if (game.done) {
        g.arrow(2, F2(2) + 0.25, X1_2, F2(X1_2) + 0.25, { color: c.amber, width: 2.5, head: 11 });
        hiker(g, X1_2, F2(X1_2));
        const m = Math.log(2);
        g.dot(m, F2(m), { r: 5, color: c.teal });
        g.tex('\\text{本当の谷底 }x=\\log 2', m, F2(m), { dy: 20, align: 'center', size: 12, color: c.teal, avoid: true });
      } else hiker(g, 2, F2(2));
    }
    function draw3(g) {
      const c = g.c, ctx = g.ctx;
      // 谷と塔
      ctx.save(); ctx.fillStyle = c.brown; ctx.globalAlpha = 0.3;
      ctx.fillRect(0, g.Y(0), g.X(-1.15), g.h); ctx.fillRect(g.X(1.15), g.Y(0), g.w - g.X(1.15), g.h); ctx.restore();
      [-1, 1].forEach((x) => { ctx.save(); ctx.fillStyle = c.brown; ctx.globalAlpha = 0.8; ctx.fillRect(g.X(x) - 4, g.Y(F3(1)), 8, g.Y(0) - g.Y(F3(1))); ctx.restore(); });
      g.line(g.xmin, 0, -1.15, 0, { color: c.brown, width: 2 }); g.line(1.15, 0, g.xmax, 0, { color: c.brown, width: 2 });
      D.curve(g, F3, { x0: -1, x1: 1 });
      // ぶら下がりの綱と橋板
      for (let x = -0.8; x <= 0.81; x += 0.2) g.line(x, F3(x), x, 0.55, { color: c.muted, width: 1 });
      g.line(-1, 0.55, 1, 0.55, { color: c.brown, width: 4 });
      g.tex('\\blue{y=\\cosh x}', 0, 1, { dy: -14, align: 'center', size: 13 });
      const tx = 1, ty = F3(1);
      g.line(tx, ty, tx + 0.7, ty, { color: c.muted, width: 1.2, dash: [4, 4] });
      tried(g, (v, last) => {
        const a = v * DEG, Lh = 0.9;
        g.line(tx, ty, tx - Lh * Math.cos(a), ty - Lh * Math.sin(a), { color: c.accent, width: last ? 2.5 : 1.2, alpha: last ? 1 : 0.5, dash: [6, 4] });
      });
      if (game.done) {
        const m = Math.sinh(1);
        g.line(tx - 0.8, ty - 0.8 * m, tx + 0.6, ty + 0.6 * m, { color: c.teal, width: 2.5 });
        const n = 24, pts = [];
        for (let i = 0; i <= n; i++) { const a = ANG3 * DEG * i / n; pts.push([tx + 0.35 * Math.cos(a), ty + 0.35 * Math.sin(a)]); }
        g.poly(pts, { color: c.amber, width: 2.5 });
        g.tex('49.6^\\circ', tx + 0.45, ty + 0.2, { align: 'left', size: 13, color: c.amber });
      } else g.tex('\\theta=\\ ?', tx + 0.4, ty + 0.15, { align: 'left', size: 14, color: c.amber });
      g.tex('x=1', tx, 0, { dy: 14, align: 'center', size: 12, color: c.muted });
    }
    function draw4(g) {
      const c = g.c;
      g.grid({ step: 0.25, stepY: 1, labels: true });
      mountain(g, F4, g.xmin, g.xmax);
      g.line(g.xmin, 2, g.xmax, 2, { color: c.amber, width: 1.5, dash: [6, 4] });
      g.tex('y=2', g.xmax, 2, { dx: -6, dy: -10, align: 'right', size: 13, color: c.amber });
      // 1回目の接線（ヒントと同じ）
      D.tangent(g, F4, 1, { df: (x) => 3 * x * x, width: 1.8 });
      g.dot(N1, 2, { r: 4, color: c.teal });
      g.tex('x_1=\\frac43', N1, 2, { dx: 8, dy: 16, align: 'left', size: 12, color: c.teal });
      g.tex('x_0=1', 1, 1, { dx: -10, dy: 6, align: 'right', size: 12, color: c.teal });
      tried(g, (v, last) => {
        if (v < g.xmin || v > g.xmax) return;
        g.line(v, -0.5, v, 3.6, { color: c.accent, width: last ? 2 : 1.2, dash: [5, 4], alpha: last ? 1 : 0.5 });
        if (last) g.tex('x=' + num(v, 3), v, 3.3, { dx: 6, align: 'left', size: 13, color: c.accent });
      });
      if (game.done) {
        D.tangent(g, F4, N1, { df: (x) => 3 * x * x, width: 1.8 });
        g.dot(N2, 2, { r: 5, color: c.amber });
        g.tex('x_2', N2, 2, { dx: -6, dy: 14, align: 'right', size: 13, color: c.amber });
        g.text('🏠', N2, 2, { dy: -10, align: 'center', size: 20 });
      }
      hiker(g, 1, 1);
    }
    function draw5(g) {
      const c = g.c;
      g.grid({ step: 1, stepY: 2, labels: true });
      mountain(g, F5, g.xmin, g.xmax);
      tried(g, (v, last) => {
        const y0 = F5(2);
        g.line(g.xmin, y0 + v * (g.xmin - 2), g.xmax, y0 + v * (g.xmax - 2), { color: c.accent, width: last ? 2 : 1.2, dash: [6, 5], alpha: last ? 1 : 0.5 });
      });
      if (game.done) {
        D.tangent(g, F5, 2, { df: dF5 });
        g.tex('\\teal{f\'(2)\\approx-2.43}', 2, F5(2), { dx: 14, dy: -6, align: 'left', size: 13, avoid: true });
      }
      hiker(g, 2, F5(2));
      g.texPx('\\blue{y=8e^{-x^2/8}}', 8, 8, { align: 'left', valign: 'top', size: 14 });
    }
    const DRAW = [draw1, draw2, draw3, draw4, draw5];
    plot.draw = function (g) { DRAW[game.k](g); conf.draw(g); };
    game.setStage(0);
  }

  D.boot([
    [initMap, 'mt-map'],
    [initGameRange, 'w-game-range'],
  ]);
})();
