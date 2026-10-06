/* チャレンジ(ゲーム)の共通部品 — 各回のページで共有
 * ステージ選択・★・ヒント・答えと解説・残り回数・紙吹雪・線を伸ばす演出など
 * 依存: common.js (Lab), plot.js
 */
(function () {
  'use strict';
  const L = window.Lab;
  const { el, setTex } = L;
  const R = (root, k) => root.querySelector('[data-r="' + k + '"]');
  const tex = (root, k, s) => setTex(R(root, k), s);

  /* ==========================================================
     チャレンジ(ゲーム)の共通部品
     ステージ選択・★・ヒント・記録(Lab.progress)・残り回数・紙吹雪
     ========================================================== */
  const starStr = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  function GameShell(root, o) {
    const best = Object.assign({}, L.progress.get(o.key) || {});
    const g = { k: 0, best, used: 0, max: o.max || 3, done: false };
    addGameRows(root);
    // スライダーに連動して、読み出し欄の「式」を更新する
    g.formula = function () { if (o.formula) tex(root, 'formula', o.formula()); };
    g.renderChips = function () {
      const chips = R(root, 'stages');
      chips.innerHTML = '';
      o.stages.forEach(function (S, i) {
        const b = el('button', 'chip stage-chip', 'ステージ' + (i + 1) + (S.name ? ' ' + S.name : '') + ' <span class="st">' + starStr(best[i + 1] || 0) + '</span>');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(i === g.k));
        b.addEventListener('click', () => g.setStage(i));
        chips.append(b);
      });
      R(root, 'total').textContent = '★ ' + Object.values(best).reduce((a, b) => a + b, 0) + ' / ' + o.stages.length * 3;
    };
    g.renderThrows = function () {
      const box = R(root, 'throws');
      if (!box) return;
      let h = '';
      for (let i = 0; i < g.max; i++) h += '<i class="' + (i < g.max - g.used ? '' : 'used') + '"></i>';
      box.innerHTML = h + '<span>' + (g.max - g.used) + ' 回</span>';
    };
    g.result = function (t, cls) { const r = R(root, 'result'); setMath(r, t); r.className = 'result ' + (cls || ''); };
    g.setStage = function (k) {
      g.k = k; g.used = 0; g.done = false;
      const S = o.stages[k];
      R(root, 'mission').innerHTML = '<span class="mno">ステージ' + (k + 1) + '</span>' + S.text;
      R(root, 'hint').innerHTML = '<button class="btn small" data-a="ghint" type="button">ヒントを見る</button>';
      resetAnswer(root);
      g.result(o.idle || 'まだ挑戦していません');
      g.renderChips(); g.renderThrows();
      o.onStage(k, S);
      g.formula();
    };
    // ★を記録(そのステージの最高記録より良いときだけ更新)
    g.award = function (n) {
      if (n > (best[g.k + 1] || 0)) { best[g.k + 1] = n; L.progress.set(o.key, best); }
      g.renderChips();
    };
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-a="ghint"]')) setMath(R(root, 'hint'), o.stages[g.k].hint);
      if (e.target.closest('[data-a="gans"]')) showAnswer(root, o.stages[g.k]);
    });
    return g;
  }
  // $…$ を含む文は数式として組む(含まなければただの文字)
  function setMath(node, t) {
    if (String(t).indexOf('$') < 0) { node.textContent = t; return; }
    node.innerHTML = t;
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([node]).catch(function () {});
  }
  // 読み出し欄の先頭に「式」、最後に「答え」の行を足す
  function addGameRows(root) {
    const ro = R(root, 'result').closest('.readout');
    if (!R(root, 'formula')) {
      const fr = el('div', 'row');
      fr.innerHTML = '<span class="k">式</span><span class="tex big" data-r="formula"></span>';
      ro.prepend(fr);
    }
    if (!R(root, 'answer')) {
      const ar = el('div', 'row');
      ar.innerHTML = '<span class="k">答え</span><span class="game-answer" data-r="answer"></span>';
      ro.append(ar);
    }
  }
  function resetAnswer(root) {
    R(root, 'answer').innerHTML = '<button class="btn small" data-a="gans" type="button">答えと解説を見る</button><span class="ans-note">まずは自分で考えてから！</span>';
  }
  function showAnswer(root, S) {
    const a = typeof S.answer === 'function' ? S.answer() : S.answer;
    R(root, 'answer').innerHTML = '<div class="ans-box">' + a + '</div>';
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([R(root, 'answer')]).catch(function () {});
  }
  // 「ねらいの点線（照準）」のオン・オフ。オフで命中すると上級クリア(👑)
  function aimToggle(ctl, onChange) {
    const lab = el('label', 'check');
    lab.style.marginTop = '6px';
    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.checked = true;
    lab.append(chk, document.createTextNode('ねらいの点線（照準）を表示　※オフで命中すると 👑'));
    ctl.append(lab);
    chk.addEventListener('change', () => onChange(chk.checked));
    return chk;
  }
  // 目標の点と、いまの線との縦のずれを「↑ 1.5」のように示す
  function gapMark(g, x, yLine, yTarget, left) {
    const c = g.c, d = yTarget - yLine;
    if (Math.abs(d) <= 0.2) { g.text('ぴったり！', x, yTarget, { dy: 24, align: 'center', size: 12, bold: true, color: c.teal }); return; }
    g.line(x, yLine, x, yTarget, { color: c.amber, width: 2, dash: [4, 4] });
    g.text((d > 0 ? '↑ あと ' : '↓ あと ') + Math.abs(d).toFixed(1), x, (yLine + yTarget) / 2, { dx: left ? -8 : 8, align: left ? 'right' : 'left', size: 12, bold: true, color: c.amber });
  }
  // 操作ボタン(発射・やり直す・次のステージへ)を作る
  function gameButtons(ctl, mainLabel) {
    const row = el('div', 'btn-row');
    row.style.marginTop = '8px';
    const bMain = el('button', 'btn primary', mainLabel), bRetry = el('button', 'btn', 'やり直す'), bNext = el('button', 'btn', '次のステージへ →');
    [bMain, bRetry, bNext].forEach((b) => { b.type = 'button'; row.append(b); });
    ctl.append(row);
    return { bMain, bRetry, bNext };
  }
  function Confetti(root, plot) {
    const parts = [];
    const anim = L.animate(root, function (dt) {
      if (!parts.length) return false;
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; q.life -= dt;
        if (q.life <= 0) parts.splice(i, 1);
      }
      plot.invalidate();
      return true;
    });
    return {
      fire(px, py) {
        const c = plot.c, col = [c.amber, c.teal, c.accent, c.primary, c.violet];
        for (let i = 0; i < 46; i++) {
          const a = Math.random() * Math.PI, sp = 150 + Math.random() * 260;
          parts.push({ x: px, y: py, vx: Math.cos(a) * sp * (Math.random() < 0.5 ? -1 : 1), vy: -Math.sin(a) * sp, life: 1 + Math.random() * 0.6, c: col[i % col.length] });
        }
        anim.kick();
      },
      draw(g) {
        const ctx = g.ctx;
        parts.forEach(function (q) { ctx.save(); ctx.globalAlpha = Math.min(1, q.life); ctx.fillStyle = q.c; ctx.fillRect(q.x - 3, q.y - 3, 6, 6); ctx.restore(); });
      },
    };
  }
  // 線を左から右へ伸ばす演出(p: 0→1)
  function Sweep(root, plot, dur, onEnd) {
    const st = { p: 1, on: false };
    const anim = L.animate(root, function (dt) {
      if (!st.on) return false;
      st.p = Math.min(1, st.p + dt / dur);
      plot.invalidate();
      if (st.p >= 1) { st.on = false; onEnd(); return false; }
      return true;
    });
    return { st, start() { st.p = 0; st.on = true; anim.kick(); } };
  }


  L.game = { starStr, GameShell, addGameRows, resetAnswer, showAnswer, aimToggle, gapMark, gameButtons, Confetti, Sweep };
})();
