/* 第3章 三角関数 — ミニゲーム「砲台の島」
 * 依存: assets/common.js (Lab), assets/plot.js, assets/game.js, trig/js/trig-common.js (Trig)
 * 色の約束: 角 θ = 青, cos（横・x）= 緑, sin（縦・y）= 赤, tan = 金
 *
 *   1. 島の地図：各節のチャレンジ（'3-1:game' … '3-9:game'、3.4 はなし）の★を読んで表示
 *   2. 総合ステージ「島を守れ」（'3-island:game'、5ステージ）
 *   3. 章のバッジ「三角関数マスター」（'3-badge' に { master: 1 } を記録）
 */
(function () {
  'use strict';
  const L = window.Lab, T = window.Trig;
  const { el, num, slider, Plot } = L;
  const { starStr, GameShell, gameButtons, Confetti } = L.game;
  const R = T.R, $id = (id) => document.getElementById(id);
  const PI = Math.PI, TAU = 2 * PI, DEG = PI / 180, S3 = Math.sqrt(3);
  const typeset = (node) => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {}); };

  /* ==========================================================
     1. 島の地図
     ========================================================== */
  const IKEY = '3-island:game', BKEY = '3-badge', NSTAGE = 5;
  const SPOTS = [
    { key: '3-1:game', no: '3.1', name: '高さを当てろ', skill: '三角比で高さを測る', href: '3-1.html#w-game-height', x: 150, y: 262 },
    { key: '3-2:game', no: '3.2', name: 'ラジアン・ピザ', skill: '弧度法・扇形', href: '3-2.html#w-game-pizza', x: 200, y: 140 },
    { key: '3-3:game', no: '3.3', name: '単位円で値を当てろ', skill: '単位円の座標', href: '3-3.html#w-game-uc', x: 300, y: 92 },
    { key: '3-5:game', no: '3.5', name: '弾幕を作れ', skill: '回転・加法定理', href: '3-5.html#w-game-danmaku', x: 420, y: 118 },
    { key: '3-6:game', no: '3.6', name: '波を合わせろ', skill: '振幅・周期・位相', href: '3-6.html#w-game-wave', x: 552, y: 254 },
    { key: '3-7:game', no: '3.7', name: '砲台で狙い撃て', skill: 'atan2 で向きから角度', href: '3-7.html#w-game-turret', x: 440, y: 268 },
    { key: '3-8:game', no: '3.8', name: '音色を作れ', skill: '波を足す・フーリエ', href: '3-8.html#w-game-timbre', x: 340, y: 306 },
    { key: '3-9:game', no: '3.9', name: 'アームを届かせろ', skill: '余弦定理 + atan2', href: '3-9.html#w-game-arm', x: 236, y: 300 },
  ];
  const sumStars = (v) => Object.values(v || {}).reduce((a, b) => a + (+b || 0), 0);
  const clearedAll = (v) => { for (let i = 1; i <= NSTAGE; i++) if (!((v || {})[i] > 0)) return false; return true; };

  function initMap() {
    const pinBox = R($id('isl-map'), 'pins'), spotBox = $id('isl-spots'), meter = $id('isl-meter');
    const pins = SPOTS.map(function (s) {
      const a = el('a', 'isl-pin', '<b>' + s.no + '</b><span></span>');
      a.href = s.href;
      a.style.left = (s.x / 600 * 100) + '%'; a.style.top = (s.y / 380 * 100) + '%';
      pinBox.append(a);
      return a;
    });
    const fort = el('a', 'isl-pin isl-pin-fort', '<b>総合</b><span></span>');
    fort.href = '#w-game-island'; fort.style.left = '50%'; fort.style.top = (226 / 380 * 100) + '%';
    pinBox.append(fort);
    const cards = SPOTS.map(function (s) {
      const a = el('a', 'isl-spot', '<span class="isl-no">' + s.no + '</span><span class="isl-nm"><b>' + s.name + '</b><small>' + s.skill + '</small></span><span class="isl-st"></span>');
      a.href = s.href;
      spotBox.append(a);
      return a;
    });
    const fcard = el('a', 'isl-spot isl-spot-fort', '<span class="isl-no">総合</span><span class="isl-nm"><b>島を守れ</b><small>いくつもの節の道具を組み合わせる</small></span><span class="isl-st"></span>');
    fcard.href = '#w-game-island';
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
      const fi = all[IKEY], fn = sumStars(fi), fc = clearedAll(fi);
      fort.querySelector('span').textContent = fc ? 'クリア' : '★' + fn;
      fort.classList.toggle('got', fc);
      fort.setAttribute('aria-label', '総合ステージ 島を守れ　★' + fn + ' / 15');
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
    const okSec = SPOTS.map((s) => sumStars(all[s.key]) > 0), okFin = clearedAll(all[IKEY]);
    const meets = okSec.every(Boolean) && okFin;
    const stored = !!(all[BKEY] && all[BKEY].master);
    // 条件を満たしたら記録する（あとで★が消えてもバッジは残る）
    if (meets && !stored) { L.progress.set(BKEY, { master: 1 }); return; }
    const got = meets || stored;
    box.classList.toggle('got', got);
    R(box, 'bst').textContent = got ? '獲得！ おめでとう。第3章の道具をすべて使いこなしました。' : 'まだです（下の条件をすべて満たすともらえます）';
    let h = '';
    SPOTS.forEach(function (s, i) { h += '<li class="' + (okSec[i] ? 'ok' : '') + '"><a href="' + s.href + '">' + s.no + ' ' + s.name + '</a>で★1つ以上</li>'; });
    h += '<li class="' + (okFin ? 'ok' : '') + '"><a href="#w-game-island">総合ステージ「島を守れ」</a>の5ステージをすべてクリア</li>';
    R(box, 'blist').innerHTML = h;
  }

  /* ==========================================================
     2. 総合ステージ「島を守れ」
     ========================================================== */
  function fit(g, x0, x1, y0, y1) {
    const asp = g.h / g.w;
    let xs = x1 - x0, ys = xs * asp;
    if (ys < y1 - y0) { ys = y1 - y0; xs = ys / asp; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    g.xmin = cx - xs / 2; g.xmax = cx + xs / 2; g.ymin = cy - ys / 2; g.ymax = cy + ys / 2;
  }
  function arcAt(g, cx, cy, r, a0, a1, o) {
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 0.04)), pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    g.poly(pts, o);
  }
  function circle(g, x, y, r, fill, alpha) {
    const ctx = g.ctx;
    ctx.save(); ctx.beginPath(); ctx.arc(g.X(x), g.Y(y), r * g.pxPerX, 0, TAU);
    ctx.fillStyle = fill; ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fill(); ctx.restore();
  }
  function rect(g, x0, y0, x1, y1, fill, alpha) {
    const ctx = g.ctx;
    ctx.save(); ctx.fillStyle = fill; ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillRect(g.X(x0), g.Y(y1), g.X(x1) - g.X(x0), g.Y(y0) - g.Y(y1)); ctx.restore();
  }
  // 海（y < y0 を水色に）と、さざ波
  function sea(g, y0) {
    const c = g.c;
    rect(g, g.xmin, g.ymin, g.xmax, y0 == null ? g.ymax : y0, c.primary, 0.09);
  }
  // 原点（または (x,y)）の砲台。a は砲身の向き
  function cannon(g, x, y, a) {
    const c = g.c, ctx = g.ctx, px = g.X(x), py = g.Y(y);
    ctx.save();
    ctx.strokeStyle = c.text; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 24 * Math.cos(a), py - 24 * Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 12, 0, TAU); ctx.fillStyle = c.primary; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = c.bg; ctx.stroke();
    ctx.restore();
  }
  // 小さな島（中心 (0,0)、半径 r）
  function islet(g, r) {
    const c = g.c;
    circle(g, 0, 0, r, c.amber, 0.35);
    circle(g, 0, 0, r * 0.72, c.teal, 0.35);
  }
  // 船（x, y）。dir は進む向き（左右の反転用）
  function boat(g, x, y, col, sunk) {
    const ctx = g.ctx, c = g.c, px = g.X(x), py = g.Y(y);
    ctx.save();
    if (sunk) ctx.globalAlpha = 0.45;
    ctx.fillStyle = c.brown;
    ctx.beginPath(); ctx.moveTo(px - 15, py); ctx.lineTo(px + 15, py); ctx.lineTo(px + 10, py + 8); ctx.lineTo(px - 10, py + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 20); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px + 1, py - 20); ctx.lineTo(px + 13, py - 6); ctx.lineTo(px + 1, py - 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function boom(g, x, y) {
    const ctx = g.ctx, c = g.c, px = g.X(x), py = g.Y(y);
    ctx.save(); ctx.fillStyle = c.amber;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 8 : 18, a = i * PI / 8; ctx.lineTo(px + r * Math.cos(a), py + r * Math.sin(a)); }
    ctx.closePath(); ctx.globalAlpha = 0.9; ctx.fill(); ctx.restore();
  }
  // 砲台 (x,y) から向き a へ、画面の端までの長さ
  function reach(g, x, y, a) {
    const cx = Math.cos(a), cy = Math.sin(a); let t = 1e9;
    if (cx > 1e-9) t = Math.min(t, (g.xmax - x) / cx); if (cx < -1e-9) t = Math.min(t, (g.xmin - x) / cx);
    if (cy > 1e-9) t = Math.min(t, (g.ymax - y) / cy); if (cy < -1e-9) t = Math.min(t, (g.ymin - y) / cy);
    return t;
  }
  function beam(g, a, p, len, col) {
    const L1 = len * p;
    g.line(0, 0, L1 * Math.cos(a), L1 * Math.sin(a), { color: col, width: 3 });
    g.dot(L1 * Math.cos(a), L1 * Math.sin(a), { r: 5, color: col });
  }
  // 角度の入力（π / pi を含めばラジアン、それ以外は度）
  function parseAngle(str) {
    let s = String(str || '').trim().replace(/[０-９．]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
      .replace(/[−ー－]/g, '-').replace(/[／]/g, '/').replace(/[°度]/g, '').replace(/\s+/g, '');
    if (!s) return NaN;
    let hasPi = false;
    s = s.replace(/π|pi/gi, function () { hasPi = true; return 'P'; });
    s = s.replace(/(\d|\))P/g, '$1*P').replace(/P(\d|\()/g, 'P*$1').replace(/P/g, '(' + PI + ')');
    if (!/^[0-9.+\-*/()e]*$/.test(s)) return NaN;
    let v;
    try { v = Function('"use strict";return (' + s + ');')(); } catch (e) { return NaN; }
    if (typeof v !== 'number' || !isFinite(v)) return NaN;
    return hasPi ? v : v * DEG;
  }
  const fk = (t1, t2) => ({ ex: 2 * Math.cos(t1), ey: 2 * Math.sin(t1), x: 2 * Math.cos(t1) + 2 * Math.cos(t1 + t2), y: 2 * Math.sin(t1) + 2 * Math.sin(t1 + t2) });
  const P_LBL = ['0', 'π/4', 'π/2', '3π/4', 'π', '5π/4', '3π/2', '7π/4', '2π'];
  const P_TEX = ['0', '\\frac{\\pi}{4}', '\\frac{\\pi}{2}', '\\frac{3\\pi}{4}', '\\pi', '\\frac{5\\pi}{4}', '\\frac{3\\pi}{2}', '\\frac{7\\pi}{4}', '2\\pi'];

  // ステージ1：塔の高さ h = 3 tan 60° = 3√3、砲台 (0,0) から塔の上 (−4, h) へ
  const TOWER_H = 3 * S3, TOWER = [-4, TOWER_H];
  // ステージ2：船は半径 4、角 75°, 195°, 315°
  const FOG_SHIPS = [75, 195, 315].map((d) => d * DEG);
  // ステージ3：杭
  const PILES = [[PI / 4, 1], [3 * PI / 4, 3], [5 * PI / 4, 1], [7 * PI / 4, -1]];
  const PILE_TEX = ['\\frac{\\pi}{4},\\,1', '\\frac{3\\pi}{4},\\,3', '\\frac{5\\pi}{4},\\,1', '\\frac{7\\pi}{4},\\,-1'];
  // ステージ5：海賊船（半径 4、はじめ π/3、毎秒 π/6、t = 5 で撃つ）
  const SHIP = { r: 4, a0: PI / 3, w: PI / 6, tf: 5 };

  const ISL_STAGES = [
    { name: '見張り塔', mode: 'angle', btn: '🔥 発射', ans: Math.atan2(TOWER_H, -4), tol: 1.2 * DEG,
      skills: ['3.1 三角比（tan で高さ）', '3.7 atan2（向きから角度）'],
      text: '敵の見張り塔のてっぺんの旗を撃て。偵察兵が塔から $3$ 離れた所で、てっぺんを見上げる角 $60^\\circ$ を測った。砲台（原点）から塔までは $4$。砲台を何度に向ける？（小数第1位まで）',
      hint: 'まず塔の高さ $h=3\\tan60^\\circ$。次に、砲台から旗への向きは $(-4,\\ h)$。左上（第2象限）なので $\\arctan$ の答えをそのまま使うと反対向きになる。',
      answer: '<b>約 $127.6^\\circ$</b>（$\\approx2.227$ ラジアン）<br>高さ $h=3\\tan60^\\circ=3\\sqrt3\\approx5.20$。砲台から旗への向きは $(-4,\\ 3\\sqrt3)$。<br>$\\arctan\\dfrac{3\\sqrt3}{4}\\approx52.4^\\circ$。旗は左上（第2象限）なので<br>$\\theta=\\mathrm{atan2}(3\\sqrt3,\\ -4)$<br>$=180^\\circ-52.4^\\circ=127.6^\\circ$。' },
    { name: '霧の中の3隻', mode: 'angle', btn: '🔥 3方向に発射', ans: 75 * DEG, tol: 1.2 * DEG, sym: 120 * DEG,
      skills: ['3.5 加法定理', '3.5 弾幕（回転）', '3.3 単位円'],
      text: '霧で船が見えない！ レーダーによると、船の1隻は $(\\sqrt6-\\sqrt2,\\ \\sqrt6+\\sqrt2)$ にいて、3隻は島を中心に $120^\\circ$ ずつ回った位置にいる。$120^\\circ$ ずつ開いた3方向の弾幕を、何度に向ければ3隻とも当たる？',
      hint: '船までの距離は $\\sqrt{(\\sqrt6-\\sqrt2)^2+(\\sqrt6+\\sqrt2)^2}=4$。だから船の角を $\\theta$ とすると $\\cos\\theta=\\dfrac{\\sqrt6-\\sqrt2}{4}$。加法定理で $\\cos(45^\\circ+30^\\circ)$ を計算してみよう。',
      answer: '<b>$75^\\circ$</b>（$195^\\circ$、$315^\\circ$ でも同じ弾幕）<br>$(\\sqrt6-\\sqrt2)^2=8-2\\sqrt{12}$、$(\\sqrt6+\\sqrt2)^2=8+2\\sqrt{12}$ なので、距離 $r=\\sqrt{16}=4$。<br>加法定理で<br>$\\cos75^\\circ=\\cos(45^\\circ+30^\\circ)$<br>$=\\dfrac{\\sqrt2}{2}\\cdot\\dfrac{\\sqrt3}{2}-\\dfrac{\\sqrt2}{2}\\cdot\\dfrac12$<br>$=\\dfrac{\\sqrt6-\\sqrt2}{4}$<br>$\\sin75^\\circ=\\sin(45^\\circ+30^\\circ)$<br>$=\\dfrac{\\sqrt2}{2}\\cdot\\dfrac{\\sqrt3}{2}+\\dfrac{\\sqrt2}{2}\\cdot\\dfrac12$<br>$=\\dfrac{\\sqrt6+\\sqrt2}{4}$<br><br>よって船は $(4\\cos75^\\circ,\\ 4\\sin75^\\circ)$、角は $75^\\circ$。ほかの2隻は $75^\\circ+120^\\circ=195^\\circ$、$315^\\circ$。' },
    { name: '波の橋', mode: 'wave', btn: '🌉 橋をかける',
      skills: ['3.6 振幅・周期・位相', '3.2 弧度法（π で目盛り）'],
      text: '4本の杭の上をすべて通る、波の形の橋 $y=A\\sin\\bigl(B(x-p)\\bigr)+q$ をかけよう。杭の位置は図の通り（$x$ はラジアン）。$A,\\ B,\\ p,\\ q$ を決めて「橋をかける」。',
      hint: '中心の線 $q$ は、一番高い杭（$3$）と一番低い杭（$-1$）のまん中。$A$ はその差の半分。山 $x=\\frac{3\\pi}{4}$ から谷 $x=\\frac{7\\pi}{4}$ までが半周期。',
      answer: '<b>$A=2,\\ B=1,\\ p=\\dfrac{\\pi}{4},\\ q=1$</b>　つまり $y=2\\sin\\left(x-\\dfrac{\\pi}{4}\\right)+1$<br>中心の線 $q=\\dfrac{3+(-1)}{2}=1$、振幅 $A=\\dfrac{3-(-1)}{2}=2$。<br>山 $\\left(\\dfrac{3\\pi}{4}\\right)$ から谷 $\\left(\\dfrac{7\\pi}{4}\\right)$ まで $\\pi$ が半周期なので、周期 $2\\pi$、$B=\\dfrac{2\\pi}{2\\pi}=1$。<br>中心の線 $y=1$ を上向きに通る（上り始める）のが $x=\\dfrac{\\pi}{4}$ なので $p=\\dfrac{\\pi}{4}$。' },
    { name: '荷物の回収', mode: 'arm', btn: '🤖 つかむ', tg: [3, S3], ans: [[0, 60], [60, -60]],
      skills: ['3.4 余弦定理', '3.7 atan2', '3.9 ロボットアーム'],
      text: '港のクレーン（腕の長さ $2$ と $2$、根元は原点）で、岩の上の荷物 $(3,\\ \\sqrt3)$ をつかもう。$\\theta_1$、$\\theta_2$ を何度にする？（答えは2通り。どちらでもよい）',
      hint: '原点から荷物までの距離 $D=\\sqrt{3^2+(\\sqrt3)^2}$。3辺が $2,\\ 2,\\ D$ の三角形で、余弦定理から肘の角 $\\varphi$ を求める。荷物の向きは $\\mathrm{atan2}(\\sqrt3,\\ 3)$。',
      answer: '<b>$\\theta_1=0^\\circ,\\ \\theta_2=60^\\circ$</b>（肘下）または <b>$\\theta_1=60^\\circ,\\ \\theta_2=-60^\\circ$</b>（肘上）<br>$D^2=9+3=12$。余弦定理 $12=2^2+2^2-2\\cdot2\\cdot2\\cos\\varphi$ より $\\cos\\varphi=-\\dfrac12$、$\\varphi=120^\\circ$。曲げる角は $\\theta_2=\\pm(180^\\circ-120^\\circ)=\\pm60^\\circ$。<br>三角形は2辺が $2$ の二等辺三角形で頂角 $120^\\circ$ なので、肩の角 $\\alpha=30^\\circ$。荷物の向きは $\\mathrm{atan2}(\\sqrt3,\\ 3)=30^\\circ$（$\\tan=\\dfrac{\\sqrt3}{3}=\\dfrac{1}{\\sqrt3}$）。<br>$\\theta_1=30^\\circ\\mp30^\\circ$ で $0^\\circ$ または $60^\\circ$。' },
    { name: '回る海賊船', mode: 'angle', btn: '🔥 発射', ship: true, ans: SHIP.a0 + SHIP.w * SHIP.tf, tol: 1.2 * DEG,
      skills: ['3.2 弧度法（角速度）', '3.5 円運動', '3.3 単位円'],
      text: '海賊船が島のまわりを半径 $4$ で反時計回りに回っている。$t=0$ 秒には角 $\\dfrac{\\pi}{3}$ の位置にいて、1秒に $\\dfrac{\\pi}{6}$ ラジアン進む。砲台は $t=5$ 秒に撃つ。砲台を何度（または何ラジアン）に向ける？',
      hint: '5秒で進む角は $5\\times\\dfrac{\\pi}{6}$。はじめの角 $\\dfrac{\\pi}{3}$ に足そう。',
      answer: '<b>$\\dfrac{7\\pi}{6}$（$=210^\\circ$、$-150^\\circ$ でも同じ向き）</b><br>5秒で進む角は $5\\cdot\\dfrac{\\pi}{6}=\\dfrac{5\\pi}{6}$。<br>$t=5$ の角は<br>$\\dfrac{\\pi}{3}+\\dfrac{5\\pi}{6}=\\dfrac{2\\pi+5\\pi}{6}=\\dfrac{7\\pi}{6}$。<br>船の位置：単位円の値 $\\cos\\dfrac{7\\pi}{6}=-\\dfrac{\\sqrt3}{2}$、$\\sin\\dfrac{7\\pi}{6}=-\\dfrac12$ を使って<br>$x=4\\cdot\\left(-\\dfrac{\\sqrt3}{2}\\right)=-2\\sqrt3$<br>$y=4\\cdot\\left(-\\dfrac12\\right)=-2$<br>つまり $(-2\\sqrt3,\\ -2)$（第3象限）。' },
  ];

  function initGameIsland() {
    const root = $id('w-game-island'), ctl = root.querySelector('.controls');
    const plot = new Plot(root.querySelector('canvas'), { xmin: -5, xmax: 5, ymin: -4, ymax: 4, ratio: [0.85, 0.56] });

    // 角度の入力
    const angBox = el('div', 'ang-row');
    const lab = el('label', 'ang-lab', '角度');
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'ang-in'; inp.id = 'island-angle'; lab.htmlFor = inp.id;
    inp.setAttribute('inputmode', 'text'); inp.setAttribute('autocomplete', 'off'); inp.placeholder = '例：135 や 3pi/4';
    angBox.append(lab, inp);
    // 波の橋
    const waveBox = el('div', 'isl-sliders');
    const sA = slider(waveBox, { tex: 'A', min: 0.5, max: 3, step: 0.5, value: 1, color: 'accent', aria: '振幅 A' });
    const sB = slider(waveBox, { tex: 'B', min: 0.5, max: 3, step: 0.5, value: 2, color: 'teal', aria: 'B（周期は 2π/B）' });
    const sP = slider(waveBox, { tex: 'p', min: 0, max: 8, step: 1, value: 0, color: 'primary', aria: '横のずれ p（π/4 きざみ）', fmt: (k) => P_LBL[k] });
    const sQ = slider(waveBox, { tex: 'q', min: -2, max: 2, step: 0.5, value: 0, color: 'violet', aria: '中心の線 q' });
    // クレーン
    const armBox = el('div', 'isl-sliders');
    const fmtD = (v) => v + '°';
    const s1 = slider(armBox, { tex: '\\theta_1', min: -180, max: 180, step: 1, value: 90, color: 'primary', aria: '肩の角 θ1（度）', fmt: fmtD });
    const s2 = slider(armBox, { tex: '\\theta_2', min: -180, max: 180, step: 1, value: 0, color: 'violet', aria: '肘の角 θ2（度）', fmt: fmtD });
    ctl.append(angBox, waveBox, armBox);
    const B = gameButtons(ctl, '🔥 発射');
    const conf = Confetti(root, plot);

    const st = { phase: 'idle', p: 0, a: 0, shots: [], hits: [], t: 0, arm0: [90 * DEG, 0], arm: [90 * DEG, 0], armTo: null, bridge: null, barrel: PI / 4 };
    const S = () => ISL_STAGES[game.k];
    const wv = () => ({ A: sA.get(), B: sB.get(), p: sP.get() * PI / 4, q: sQ.get() });
    const curAng = () => parseAngle(inp.value);

    const game = GameShell(root, { key: IKEY, stages: ISL_STAGES,
      formula: function () {
        const s = S();
        if (s.mode === 'wave') {
          const w = wv();
          return 'y=\\red{' + num(w.A, 1) + '}\\sin\\bigl(\\teal{' + num(w.B, 1) + '}(x-\\blue{' + P_TEX[sP.get()] + '})\\bigr)' + (w.q < 0 ? '-' : '+') + '\\violet{' + num(Math.abs(w.q), 1) + '}';
        }
        if (s.mode === 'arm') return '\\blue{\\theta_1}=' + s1.get() + '^\\circ,\\quad \\violet{\\theta_2}=' + s2.get() + '^\\circ';
        const a = curAng();
        if (!isFinite(a)) return '\\blue{\\theta}=\\ ?\\quad\\text{（角度を入れる）}';
        return '\\blue{\\theta}=' + num(a / DEG, 1) + '^\\circ\\ (=' + num(a, 3) + '\\ \\text{rad})';
      },
      onStage(k, s) {
        st.phase = 'idle'; st.p = 0; st.shots = []; st.hits = []; st.t = 0; st.bridge = null; st.barrel = PI / 4;
        st.arm = [90 * DEG, 0]; st.armTo = null; s1.set(90); s2.set(0);
        sA.set(1); sB.set(2); sP.set(0); sQ.set(0);
        inp.value = ''; inp.disabled = false;
        [sA, sB, sP, sQ, s1, s2].forEach((x) => { x.input.disabled = false; });
        angBox.hidden = s.mode !== 'angle'; waveBox.hidden = s.mode !== 'wave'; armBox.hidden = s.mode !== 'arm';
        B.bMain.textContent = s.btn; B.bMain.disabled = false; B.bNext.hidden = true;
        R(root, 'skills').innerHTML = '<span class="lbl-sm">使う道具</span>' + s.skills.map((x) => '<span class="isl-skill">' + x + '</span>').join('');
        typeset(R(root, 'mission'));
        plot.invalidate();
      } });
    const onIn = () => { game.formula(); plot.invalidate(); };
    inp.addEventListener('input', onIn);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    [sA, sB, sP, sQ, s1, s2].forEach((x) => x.on(onIn));

    function lockInputs(v) { inp.disabled = v; [sA, sB, sP, sQ, s1, s2].forEach((x) => { x.input.disabled = v; }); }
    function go() {
      const s = S();
      if (game.done || game.used >= game.max || st.phase !== 'idle') return;
      if (s.mode === 'angle') {
        const a = curAng();
        if (!isFinite(a)) { game.result('角度を数で入れてください（例：135、−90、3pi/4）。', 'miss'); return; }
        st.a = a; st.barrel = a;
        st.phase = s.ship ? 'sail' : 'shoot'; st.t = 0; st.p = 0;
      } else if (s.mode === 'wave') {
        st.bridge = wv(); st.phase = 'build'; st.p = 0;
      } else {
        st.arm0 = st.arm.slice(); st.armTo = [s1.get() * DEG, s2.get() * DEG]; st.phase = 'move'; st.p = 0;
      }
      game.used++; game.renderThrows();
      B.bMain.disabled = true; lockInputs(true);
      anim.kick();
    }
    function finish(ok, msg, fx, fy) {
      const s = S();
      st.phase = 'idle';
      if (ok) {
        const n = 4 - game.used; game.award(n); game.done = true; B.bMain.disabled = true; B.bNext.hidden = game.k >= ISL_STAGES.length - 1;
        let m = msg + ' ' + starStr(n) + '（' + game.used + ' 回目）';
        if (clearedAll(L.progress.get(IKEY))) m += '　🏝 島を守りきった！ 下の「章のバッジ」を見てみよう。';
        game.result(m, 'hit');
        conf.fire(plot.X(fx), plot.Y(fy));
      } else {
        let m = msg;
        if (game.used >= game.max) { m += '　― 3回使い切りました。「やり直す」で再挑戦！'; B.bMain.disabled = true; }
        else { B.bMain.disabled = false; lockInputs(false); }
        game.result(m, 'miss');
      }
      if (s.mode === 'angle' && !ok && game.used < game.max) inp.focus({ preventScroll: true });
      plot.invalidate();
    }
    function judge() {
      const s = S();
      if (s.mode === 'angle') {
        st.shots.push(st.a);
        if (s.sym) {
          // 3方向の弾幕：どの船に当たったか
          const hit = FOG_SHIPS.map((b) => [0, 1, 2].some((k) => Math.abs(T.wrapPi(st.a + k * s.sym - b)) <= s.tol));
          hit.forEach((h, i) => { if (h) st.hits[i] = true; });
          const n = hit.filter(Boolean).length;
          if (n === 3) return finish(true, '💥 3隻とも命中！', 4 * Math.cos(FOG_SHIPS[0]), 4 * Math.sin(FOG_SHIPS[0]));
          // 120° ずつ同じ形なので、ずれは −60°〜60° にそろえる
          let d = ((T.wrapPi(st.a - s.ans) % s.sym) + s.sym) % s.sym;
          if (d > s.sym / 2) d -= s.sym;
          return finish(false, 'はずれ。霧の中から船は出てこない。' + (d > 0 ? '時計回り' : '反時計回り') + 'にあと約 ' + num(Math.abs(d) / DEG, 0) + '° 回すと当たる。', 0, 0);
        }
        const d = T.wrapPi(st.a - s.ans);
        const tg = s.ship ? shipPos(SHIP.tf) : TOWER;
        if (Math.abs(d) <= s.tol) return finish(true, s.ship ? '💥 海賊船に命中！' : '💥 旗に命中！', tg[0], tg[1]);
        let m;
        if (Math.abs(T.wrapPi(d - PI)) <= 4 * DEG) m = '反対向き！ $\\arctan\\frac{y}{x}$ の答えをそのまま使っていない？ 的のある象限を確かめよう。';
        else m = 'はずれ。' + (d > 0 ? '時計回り' : '反時計回り') + 'にあと約 ' + num(Math.abs(d) / DEG, 0) + '° 回すと当たる。';
        return finish(false, m, 0, 0);
      }
      if (s.mode === 'wave') {
        const w = st.bridge, f = (x) => w.A * Math.sin(w.B * (x - w.p)) + w.q;
        const miss = PILES.filter((p) => Math.abs(f(p[0]) - p[1]) > 0.05).length;
        if (!miss) return finish(true, '🌉 橋がかかった！', 3 * PI / 4, 3);
        return finish(false, 'くずれた！ 杭 ' + (4 - miss) + ' / 4 本にしか乗っていない。', 0, 0);
      }
      const p = fk(st.arm[0], st.arm[1]), dist = Math.hypot(p.x - s.tg[0], p.y - s.tg[1]);
      if (dist <= 0.12) return finish(true, '📦 荷物をつかんだ！', s.tg[0], s.tg[1]);
      const bump = p.ey < -0.05 || p.y < -0.05 ? '（腕が海にもぐった！）' : '';
      return finish(false, 'とどかない' + bump + '。腕の先と荷物の距離は約 ' + num(dist, 2) + '。', 0, 0);
    }
    function shipPos(t) { const a = SHIP.a0 + SHIP.w * t; return [SHIP.r * Math.cos(a), SHIP.r * Math.sin(a)]; }

    const anim = L.animate(root, function (dt) {
      if (st.phase === 'sail') {
        st.t = Math.min(SHIP.tf, st.t + 2.5 * dt);
        if (st.t >= SHIP.tf) { st.phase = 'shoot'; st.p = 0; }
        plot.invalidate(); return true;
      }
      if (st.phase === 'shoot' || st.phase === 'build' || st.phase === 'move') {
        st.p = Math.min(1, st.p + dt / (st.phase === 'build' ? 1.1 : 0.6));
        if (st.phase === 'move') {
          const e = 1 - Math.pow(1 - st.p, 3);
          st.arm = [st.arm0[0] + (st.armTo[0] - st.arm0[0]) * e, st.arm0[1] + (st.armTo[1] - st.arm0[1]) * e];
        }
        if (st.p >= 1) { judge(); return false; }
        plot.invalidate(); return true;
      }
      return false;
    });
    B.bMain.addEventListener('click', go);
    B.bRetry.addEventListener('click', () => game.setStage(game.k));
    B.bNext.addEventListener('click', () => game.setStage(Math.min(game.k + 1, ISL_STAGES.length - 1)));

    /* ----- 場面ごとの絵 ----- */
    function drawTower(g) {
      const c = g.c, ctx = g.ctx, s = S();
      fit(g, -6.4, 2.4, -1.5, 6.9);
      sea(g, -0.25);
      rect(g, -5.6, -0.25, -2.4, 0, c.brown, 0.35);                  // 敵の島
      rect(g, -1.6, -0.25, 1.6, 0, c.brown, 0.35);                   // 自分の島
      g.line(-5.6, 0, -2.4, 0, { color: c.brown, width: 2 });
      g.line(-1.6, 0, 1.6, 0, { color: c.brown, width: 2 });
      // 塔
      rect(g, -4.3, 0, -3.7, TOWER_H, c.brown, 0.8);
      ctx.save(); ctx.fillStyle = c.accent;
      const fx = g.X(-4), fy = g.Y(TOWER_H);
      ctx.fillRect(fx - 1, fy - 22, 2.5, 22);
      ctx.beginPath(); ctx.moveTo(fx + 1.5, fy - 22); ctx.lineTo(fx + 18, fy - 16); ctx.lineTo(fx + 1.5, fy - 10); ctx.closePath(); ctx.fill(); ctx.restore();
      g.dot(-4, TOWER_H, { r: 4, color: c.accent });
      // 偵察兵 (−1, 0)
      g.line(-1, 0, -4, TOWER_H, { color: c.violet, width: 1.5, dash: [5, 4] });
      arcAt(g, -1, 0, 0.75, PI - 60 * DEG, PI, { color: c.primary, width: 2.5 });
      g.tex('60^\\circ', -1 + 1.05 * Math.cos(PI - 30 * DEG), 1.05 * Math.sin(PI - 30 * DEG), { align: 'center', size: 13, color: c.primary });
      g.dot(-1, 0.12, { r: 6, color: c.violet });
      g.tex('\\text{偵察兵}', -1, 0, { dy: 18, align: 'center', size: 12, color: c.violet });
      // 寸法
      g.line(-4, -0.75, -1, -0.75, { color: c.muted, width: 1.2 });
      g.tex('3', -2.5, -0.75, { dy: -9, align: 'center', size: 13, color: c.text });
      g.line(-4, -1.25, 0, -1.25, { color: c.muted, width: 1.2 });
      g.tex('4', -2, -1.25, { dy: 9, align: 'center', size: 13, color: c.text });
      [-4, -1, 0].forEach((x) => g.line(x, x === -1 ? -0.6 : -1.4, x, x === -1 ? -0.9 : -0.6, { color: c.muted, width: 1.2 }));
      g.tex(game.done ? 'h=3\\sqrt3' : 'h=\\ ?', -4.3, TOWER_H / 2, { dx: -8, align: 'right', size: 14, color: c.amber });
      // これまでの弾道・弾
      st.shots.forEach((a) => { const L1 = reach(g, 0, 0, a); g.line(0, 0, L1 * Math.cos(a), L1 * Math.sin(a), { color: c.muted, width: 1.5, dash: [3, 4], alpha: 0.7 }); });
      if (st.phase === 'shoot') beam(g, st.a, st.p, Math.min(reach(g, 0, 0, st.a), Math.abs(T.wrapPi(st.a - s.ans)) <= s.tol ? Math.hypot(TOWER[0], TOWER[1]) : 1e9), c.amber);
      if (game.done) { g.line(0, 0, TOWER[0], TOWER[1], { color: c.teal, width: 2.5 }); boom(g, TOWER[0], TOWER[1]); }
      cannon(g, 0, 0, st.barrel);
      g.tex('\\text{砲台}', 0, 0, { dx: 16, dy: 14, align: 'left', size: 12, color: c.primary });
    }
    function drawFog(g) {
      const c = g.c, ctx = g.ctx, s = S();
      fit(g, -5.4, 5.4, -5.2, 5.2);
      sea(g);
      islet(g, 1.3);
      // 船（当たった船と、クリア後は全部）
      FOG_SHIPS.forEach((b, i) => { if (st.hits[i] || game.done) { boat(g, 4 * Math.cos(b), 4 * Math.sin(b), c.accent, true); boom(g, 4 * Math.cos(b), 4 * Math.sin(b)); } });
      // 霧（半径 3〜5 の輪）
      ctx.save();
      ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), 5.1 * g.pxPerX, 0, TAU); ctx.arc(g.X(0), g.Y(0), 2.9 * g.pxPerX, 0, TAU, true);
      ctx.fillStyle = c.muted; ctx.globalAlpha = game.done ? 0.12 : 0.42; ctx.fill('evenodd'); ctx.restore();
      if (!game.done) g.text('霧', 0, 4, { align: 'center', size: 15, bold: true, color: c.surface, halo: false });
      FOG_SHIPS.forEach((b, i) => { if (st.hits[i] || game.done) boat(g, 4 * Math.cos(b), 4 * Math.sin(b), c.accent, false); });
      st.shots.forEach((a) => [0, 1, 2].forEach((k) => { const b = a + k * s.sym, L1 = reach(g, 0, 0, b); g.line(0, 0, L1 * Math.cos(b), L1 * Math.sin(b), { color: c.muted, width: 1.5, dash: [3, 4], alpha: 0.7 }); }));
      if (st.phase === 'shoot') [0, 1, 2].forEach((k) => { const b = st.a + k * s.sym; beam(g, b, st.p, reach(g, 0, 0, b), c.amber); });
      if (game.done) {
        [0, 1, 2].forEach((k) => { const b = s.ans + k * s.sym; g.line(0, 0, 4 * Math.cos(b), 4 * Math.sin(b), { color: c.teal, width: 2.5 }); });
        arcAt(g, 0, 0, 1.0, 0, s.ans, { color: c.primary, width: 2.5 });
        g.tex('75^\\circ', 1.35 * Math.cos(s.ans / 2), 1.35 * Math.sin(s.ans / 2), { align: 'center', size: 13, color: c.primary });
      }
      cannon(g, 0, 0, st.barrel);
      g.texPx('\\text{原点＝砲台　霧の輪は半径 }3\\text{〜}5', 8, g.h - 8, { align: 'left', valign: 'bottom', size: 12, color: c.muted });
    }
    function drawBridge(g) {
      const c = g.c;
      fit(g, -0.7, TAU + 0.7, -2.9, 4.2);
      const y0 = 1 - Math.SQRT2;                       // 両岸の高さ
      rect(g, g.xmin, g.ymin, g.xmax, -1.9, c.primary, 0.12);
      rect(g, g.xmin, g.ymin, 0, y0, c.brown, 0.35);
      rect(g, TAU, g.ymin, g.xmax, y0, c.brown, 0.35);
      g.line(g.xmin, y0, 0, y0, { color: c.brown, width: 2 }); g.line(TAU, y0, g.xmax, y0, { color: c.brown, width: 2 });
      g.grid({ stepX: PI / 4, stepY: 1, labels: false, axes: false });
      g.line(g.xmin, 0, g.xmax, 0, { color: c.axis, width: 1.2 });
      [[PI / 2, '\\frac{\\pi}{2}'], [PI, '\\pi'], [3 * PI / 2, '\\frac{3\\pi}{2}'], [TAU, '2\\pi']].forEach((t) => { g.line(t[0], -0.08, t[0], 0.08, { color: c.axis, width: 1.2 }); g.tex(t[1], t[0], g.ymin, { dy: -6, align: 'center', valign: 'bottom', size: 13, color: c.muted }); });
      [-1, 1, 2, 3].forEach((v) => g.tex(String(v), -0.08, v, { align: 'right', size: 12, color: c.muted }));
      g.line(0, -2.9, 0, 4.2, { color: c.axis, width: 1.2 });
      // 杭
      PILES.forEach((p, i) => {
        rect(g, p[0] - 0.09, g.ymin, p[0] + 0.09, p[1], c.brown, 0.75);
        g.dot(p[0], p[1], { r: 6, color: c.amber });
        g.tex('(' + PILE_TEX[i] + ')', p[0], p[1], { dx: 9, dy: -14, align: 'left', size: 13, color: c.text, avoid: true });
      });
      const w = st.bridge;
      if (w) {
        const f = (x) => w.A * Math.sin(w.B * (x - w.p)) + w.q;
        const ok = PILES.every((p) => Math.abs(f(p[0]) - p[1]) <= 0.05);
        const x1 = st.phase === 'build' ? TAU * st.p : TAU;
        g.fn(f, { x0: 0, x1, color: ok ? c.teal : c.accent, width: 4, dash: ok || st.phase === 'build' ? [] : [8, 6] });
        if (ok && game.done) g.line(0, w.q, TAU, w.q, { color: c.violet, width: 1.2, dash: [4, 4] });
      }
    }
    function drawArm(g) {
      const c = g.c, ctx = g.ctx, s = S();
      fit(g, -2.2, 4.6, -1.8, 4.3);
      rect(g, g.xmin, g.ymin, g.xmax, -0.9, c.primary, 0.12);      // 海
      rect(g, g.xmin, g.ymin, 0.35, 0, c.brown, 0.4);              // 港
      g.line(g.xmin, 0, 0.35, 0, { color: c.brown, width: 2 });
      rect(g, 2.5, g.ymin, 3.5, S3 - 0.24, c.muted, 0.55);         // 岩
      g.grid({ step: 1, labels: false, axes: false });
      // 腕の届く範囲
      ctx.save(); ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), 4 * g.pxPerX, 0, TAU); ctx.strokeStyle = c.teal; ctx.globalAlpha = 0.35; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      // 荷物
      const bx = g.X(s.tg[0]), by = g.Y(s.tg[1]);
      ctx.save(); ctx.fillStyle = c.amber; ctx.fillRect(bx - 11, by - 11, 22, 22); ctx.strokeStyle = c.brown; ctx.lineWidth = 2; ctx.strokeRect(bx - 11, by - 11, 22, 22);
      ctx.beginPath(); ctx.moveTo(bx - 11, by - 11); ctx.lineTo(bx + 11, by + 11); ctx.moveTo(bx + 11, by - 11); ctx.lineTo(bx - 11, by + 11); ctx.stroke(); ctx.restore();
      g.tex('(3,\\,\\sqrt3)', s.tg[0], s.tg[1], { dy: -24, align: 'center', size: 13, color: c.text });
      if (game.done) s.ans.forEach((a) => { const p = fk(a[0] * DEG, a[1] * DEG); g.poly([[0, 0], [p.ex, p.ey], [p.x, p.y]], { color: c.teal, width: 2, dash: [5, 4] }); });
      // クレーン
      const p = fk(st.arm[0], st.arm[1]);
      g.line(0, 0, p.ex, p.ey, { color: c.primary, width: 7 });
      g.line(p.ex, p.ey, p.x, p.y, { color: c.violet, width: 6 });
      g.dot(p.ex, p.ey, { r: 6, color: c.text });
      g.dot(p.x, p.y, { r: 5, color: c.accent });
      ctx.save(); ctx.fillStyle = c.text; ctx.fillRect(g.X(0) - 14, g.Y(0) - 4, 28, 8); ctx.restore();
      g.dot(0, 0, { r: 7, color: c.text });
      g.tex('\\text{港}', -1.2, 0, { dy: 16, align: 'center', size: 12, color: c.brown });
    }
    function drawShip(g) {
      const c = g.c, s = S();
      fit(g, -5.4, 5.4, -5.2, 5.2);
      sea(g);
      islet(g, 1.3);
      // 航路
      const ctx = g.ctx;
      ctx.save(); ctx.beginPath(); ctx.arc(g.X(0), g.Y(0), SHIP.r * g.pxPerX, 0, TAU); ctx.strokeStyle = c.muted; ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
      arcAt(g, 0, 0, SHIP.r + 0.45, SHIP.a0 + 0.1, SHIP.a0 + 0.55, { color: c.accent, width: 2 });
      const q = SHIP.a0 + 0.55, q2 = q - 0.08;
      g.arrow((SHIP.r + 0.45) * Math.cos(q2), (SHIP.r + 0.45) * Math.sin(q2), (SHIP.r + 0.45) * Math.cos(q), (SHIP.r + 0.45) * Math.sin(q), { color: c.accent, width: 2, head: 10 });
      const p0 = shipPos(0);
      g.line(0, 0, p0[0], p0[1], { color: c.primary, width: 1.2, dash: [4, 4], alpha: 0.7 });
      g.line(0, 0, 2.6, 0, { color: c.primary, width: 1.2, dash: [4, 4], alpha: 0.7 });
      arcAt(g, 0, 0, 2.0, 0, SHIP.a0, { color: c.primary, width: 2.5 });
      g.tex('\\dfrac{\\pi}{3}', 2.5 * Math.cos(SHIP.a0 / 2), 2.5 * Math.sin(SHIP.a0 / 2), { align: 'center', size: 14, color: c.primary });
      g.tex('t=0', p0[0], p0[1], { dx: 14, dy: -6, align: 'left', size: 12, color: c.accent, avoid: true });
      const t = game.done ? SHIP.tf : st.t, p = shipPos(t);
      if (t > 0) g.tex('t=' + num(t, 1), p[0], p[1], { dy: 22, align: 'center', size: 12, color: c.accent, avoid: true });
      st.shots.forEach((a) => { const L1 = reach(g, 0, 0, a); g.line(0, 0, L1 * Math.cos(a), L1 * Math.sin(a), { color: c.muted, width: 1.5, dash: [3, 4], alpha: 0.7 }); });
      if (st.phase === 'shoot') beam(g, st.a, st.p, Math.min(reach(g, 0, 0, st.a), Math.abs(T.wrapPi(st.a - s.ans)) <= s.tol ? SHIP.r : 1e9), c.amber);
      boat(g, p[0], p[1], c.accent, false);
      if (game.done) {
        g.line(0, 0, p[0], p[1], { color: c.teal, width: 2.5 }); boom(g, p[0], p[1]);
        g.tex('(-2\\sqrt3,\\,-2)', p[0], p[1], { dy: -26, align: 'center', size: 13, color: c.text, avoid: true });
      }
      cannon(g, 0, 0, st.barrel);
    }
    plot.draw = function (g) {
      const s = S();
      if (game.k === 0) drawTower(g);
      else if (s.sym) drawFog(g);
      else if (s.mode === 'wave') drawBridge(g);
      else if (s.mode === 'arm') drawArm(g);
      else drawShip(g);
      conf.draw(g);
    };
    game.setStage(0);
  }

  T.boot([
    [initMap, 'isl-map'],
    [initGameIsland, 'w-game-island'],
  ]);
})();
