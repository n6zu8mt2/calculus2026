/* 解析学 2026 — 共通スクリプト
 * ヘッダー / 目次 / テーマ切替 / 数式(MathJax) / スライダー / アニメーション管理
 * 依存: MathJax 3 (CDN)。読み込めなくても操作部は動作する。
 */
(function () {
  'use strict';
  const Lab = (window.Lab = {});

  /* ---------- DOM ---------- */
  Lab.el = function (tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  Lab.$ = (sel, root) => (root || document).querySelector(sel);
  Lab.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- 数の整形 ---------- */
  // 小数 d 桁に丸め、"-0" を避ける
  Lab.num = function (v, d) {
    d = d == null ? 2 : d;
    const k = Math.pow(10, d);
    let r = Math.round(v * k) / k;
    if (Object.is(r, -0) || r === 0) r = 0;
    return String(r);
  };
  // TeX 用: " + 3" / " - 3" (0 は空文字)
  Lab.signed = function (v, d) {
    const s = Lab.num(Math.abs(v), d);
    if (s === '0') return '';
    return (v < 0 ? ' - ' : ' + ') + s;
  };
  // 表示用マイナス記号
  Lab.minus = (s) => String(s).replace(/-/g, '−');

  /* ---------- 数式 (MathJax) ---------- */
  let mjReady = false;
  const pending = new Set();
  function renderTex(node) {
    try {
      node.replaceChildren(window.MathJax.tex2chtml(node._tex, { display: !!node._display }));
    } catch (e) {
      node.textContent = node._tex;
    }
    node._rendered = true;
  }
  let flushQueued = false;
  function queueFlush() {
    if (flushQueued) return;
    flushQueued = true;
    requestAnimationFrame(function () {
      flushQueued = false;
      try {
        window.MathJax.startup.document.clear();
        window.MathJax.startup.document.updateDocument();
      } catch (e) { /* noop */ }
    });
  }
  // node の中身を TeX で置き換える(変化がなければ何もしない)
  Lab.setTex = function (node, tex, display) {
    if (node._tex === tex && node._rendered) return;
    node._tex = tex;
    node._display = !!display;
    node._rendered = false;
    if (mjReady) { renderTex(node); queueFlush(); } else pending.add(node);
  };
  document.addEventListener('mathjax-ready', function () {
    mjReady = true;
    pending.forEach(renderTex);
    pending.clear();
    queueFlush();
  });
  // MathJax が読み込めなかった場合の保険
  setTimeout(function () {
    if (!mjReady) pending.forEach(function (n) { n.textContent = n._tex; });
  }, 8000);

  /* ---------- スライダー ---------- */
  Lab.slider = function (parent, o) {
    const row = Lab.el('div', 'ctrl');
    const lab = Lab.el('span', 'ctrl-label c-' + (o.color || 'primary'));
    const input = document.createElement('input');
    const out = Lab.el('output', 'ctrl-val');
    input.type = 'range';
    input.min = o.min; input.max = o.max; input.step = o.step; input.value = o.value;
    input.setAttribute('aria-label', o.aria || o.tex);
    row.append(lab, input, out);
    parent.append(row);
    Lab.setTex(lab, o.tex);
    const dec = (String(o.step).split('.')[1] || '').length;
    const get = () => +(+input.value).toFixed(dec);
    const show = function () {
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty('--pct', pct + '%');
      out.textContent = Lab.minus(o.fmt ? o.fmt(get()) : get().toFixed(dec));
    };
    show();
    return {
      row, input, get,
      set(v) { input.value = v; show(); },
      on(fn) { input.addEventListener('input', function () { show(); fn(get()); }); },
    };
  };

  /* ---------- アニメーション管理 ---------- */
  // fn(dt) が false を返すと停止。kick() で再開。画面外・非表示タブでは止まる。
  Lab.reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  Lab.animate = function (target, fn) {
    let vis = true, raf = 0, last = 0;
    function loop(ts) {
      raf = 0;
      if (!vis || document.hidden) { last = 0; return; }
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      if (fn(dt) !== false) raf = requestAnimationFrame(loop);
      else last = 0;
    }
    function kick() { if (!raf && vis) raf = requestAnimationFrame(loop); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; kick(); }).observe(target);
    }
    document.addEventListener('visibilitychange', kick);
    return { kick };
  };

  /* ---------- テーマ ---------- */
  const root = document.documentElement;
  function isDark() {
    const t = root.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyThemeIcon(btn) { btn.textContent = isDark() ? '☀' : '☾'; btn.setAttribute('aria-label', isDark() ? 'ライトモードにする' : 'ダークモードにする'); }

  /* ---------- ヘッダー ---------- */
  function buildHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const base = document.currentScript ? '' : '';
    const rootPath = host.dataset.root || './';
    const cur = host.dataset.current || '';
    const pages = [
      { id: 'home', href: rootPath + 'index.html', title: 'トップ' },
      { id: 'polynomial', href: rootPath + 'polynomial/index.html', title: '多項式' },
    ];
    host.className = 'site-header';
    host.innerHTML =
      '<div class="site-header-inner">' +
      '<a class="brand" href="' + rootPath + 'index.html"><span class="brand-mark">∫</span><span>解析学 2026</span></a>' +
      '<nav class="site-nav" aria-label="サイト内ナビゲーション"></nav>' +
      '</div>';
    const nav = host.querySelector('.site-nav');
    pages.forEach(function (p) {
      const a = Lab.el('a', '', p.title);
      a.href = p.href;
      if (p.id === cur) a.setAttribute('aria-current', 'page');
      nav.append(a);
    });
    const btn = Lab.el('button', 'icon-btn');
    btn.type = 'button';
    applyThemeIcon(btn);
    btn.addEventListener('click', function () {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* noop */ }
      applyThemeIcon(btn);
      document.dispatchEvent(new Event('themechange'));
    });
    nav.append(btn);
    if (window.matchMedia) {
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        applyThemeIcon(btn);
        document.dispatchEvent(new Event('themechange'));
      });
    }
  }

  /* ---------- 目次 + スクロール連動 ---------- */
  function buildToc() {
    const toc = document.getElementById('toc');
    if (!toc) return;
    const secs = Lab.$$('main section[data-toc]');
    toc.append(Lab.el('div', 'toc-title', 'このページの内容'));
    const links = secs.map(function (s) {
      const a = Lab.el('a', '', s.dataset.toc);
      a.href = '#' + s.id;
      toc.append(a);
      return a;
    });
    if (!('IntersectionObserver' in window)) return;
    const visible = new Map();
    const io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible.set(e.target, e.isIntersecting); });
      let idx = -1;
      secs.forEach(function (s, i) { if (visible.get(s) && idx < 0) idx = i; });
      if (idx < 0) return;
      links.forEach(function (a, i) { a.classList.toggle('active', i === idx); });
      const a = links[idx];
      if (toc.scrollWidth > toc.clientWidth && getComputedStyle(toc).flexDirection === 'row') {
        toc.scrollTo({ left: a.offsetLeft - toc.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' });
      }
    }, { rootMargin: '-25% 0px -60% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  function init() {
    buildHeader();
    buildToc();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
