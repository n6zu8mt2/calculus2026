/* Plot — レスポンシブな Canvas グラフ + ドラッグ可能なハンドル
 * - 幅は親要素に追従、高さは ratio(幅に対する比)で決定
 * - equal:true なら x,y を同じ縮尺にする(y 範囲は yc を中心に自動決定)
 * - Pointer Events(マウス/タッチ/ペン)。ハンドルに触れたときだけページのスクロールを止める
 */
(function () {
  'use strict';
  const Lab = window.Lab;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  Lab.palette = function () {
    const c = {
      bg: css('--plot-bg'), grid: css('--plot-grid'), axis: css('--plot-axis'),
      text: css('--text'), muted: css('--muted'), surface: css('--surface'),
      primary: css('--primary'), accent: css('--accent'), teal: css('--teal'),
      amber: css('--amber'), violet: css('--violet'), pink: css('--pink'), brown: css('--brown'),
    };
    c.series = [c.primary, c.accent, c.teal, c.amber, c.violet, c.pink];
    return c;
  };

  const FONT = '-apple-system, "Hiragino Sans", "Noto Sans JP", "Segoe UI", sans-serif';

  class Plot {
    // 「漸近線 $y=q$」のような $…$ 入りの文字を TeX に（日本語などは \text{} に入れる）
    static hasMath(str) { return typeof str === 'string' && /\$[^$]+\$/.test(str); }
    static mixedTeX(str) {
      return String(str).split('$').map((part, i) => (i % 2 ? part : (part ? '\\text{' + part.replace(/[{}\\]/g, '') + '}' : ''))).join('');
    }
    static texOpts(o) {
      return { color: o.color, size: (o.size || 13) + 2, dx: o.dx, dy: o.dy, align: o.align,
        valign: o.base === 'top' ? 'top' : o.base === 'bottom' || o.base === 'alphabetic' ? 'bottom' : 'middle', avoid: o.avoid };
    }

    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.o = Object.assign({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, equal: false, yc: 0, ratio: [0.9, 0.6] }, opts);
      this.handles = [];
      this.draw = function () {};
      this.onResize = null;
      this.active = null;
      this.w = 0; this.h = 0; this.dpr = 1;
      this._queued = false;
      this._bind();
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(canvas.parentElement);
      document.addEventListener('themechange', () => this.render());
      this.resize();
    }

    /* ----- 表示範囲 ----- */
    setView(v) { Object.assign(this.o, v); this._layout(); this.invalidate(); }
    _layout() {
      const o = this.o;
      this.xmin = o.xmin; this.xmax = o.xmax;
      if (o.equal && this.w) {
        const span = ((o.xmax - o.xmin) * this.h) / this.w;
        this.ymin = o.yc - span / 2; this.ymax = o.yc + span / 2;
      } else { this.ymin = o.ymin; this.ymax = o.ymax; }
    }
    resize() {
      const parent = this.canvas.parentElement;
      const w = Math.max(160, Math.floor(parent.clientWidth));
      const r = this.o.ratio;
      const ratio = Array.isArray(r) ? (w < 520 ? r[0] : r[1]) : r;
      const h = this.o.height ? Math.round(this.o.height(w)) : Math.round(w * ratio);
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (w === this.w && h === this.h && dpr === this.dpr) return;
      this.w = w; this.h = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.height = h + 'px';
      this._layout();
      if (this.onResize) this.onResize(this);
      this.render();
    }

    /* ----- 座標変換 ----- */
    X(x) { return ((x - this.xmin) / (this.xmax - this.xmin)) * this.w; }
    Y(y) { return this.h - ((y - this.ymin) / (this.ymax - this.ymin)) * this.h; }
    ix(px) { return this.xmin + (px / this.w) * (this.xmax - this.xmin); }
    iy(py) { return this.ymin + ((this.h - py) / this.h) * (this.ymax - this.ymin); }
    get pxPerX() { return this.w / (this.xmax - this.xmin); }

    /* ----- 描画 ----- */
    invalidate() {
      if (this._queued) return;
      this._queued = true;
      requestAnimationFrame(() => { this._queued = false; this.render(); });
    }
    render() {
      if (!this.w) return;
      const ctx = this.ctx;
      this.c = Lab.palette();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = this.c.bg;
      ctx.fillRect(0, 0, this.w, this.h);
      this._texQ = [];
      this.draw(this, ctx);
      this._drawHandles();
      this._syncTex();
    }

    /* ----- TeX のラベル(キャンバスの上に重ねた HTML を MathJax で組む) -----
       g.tex('y=2^x', x, y, { color, size, dx, dy, align: 'left'|'center'|'right', valign: 'middle'|'top'|'bottom' }) */
    tex(str, x, y, o) { this.texPx(str, this.X(x), this.Y(y), o); }
    texPx(str, px, py, o) { (this._texQ || (this._texQ = [])).push({ str: String(str), px, py, o: o || {} }); }
    _syncTex() {
      const q = this._texQ || [];
      if (!this._texLayer) {
        if (!q.length) return;
        const lay = document.createElement('div');
        lay.className = 'plot-tex';
        this.canvas.parentElement.appendChild(lay);
        this._texLayer = lay; this._texCache = new Map();
      }
      const used = new Set(), avoidList = [];
      q.forEach((L) => {
        const o = L.o, color = o.color || this.c.text, size = o.size || 15;
        const key = L.str + '|' + color + '|' + size;
        // 同じ文字が1枚の図に何回も出るときは key, key#1, key#2, … を順に使う
        let k = 0, ck = key, n = this._texCache.get(ck);
        while (n && used.has(n)) { k++; ck = key + '#' + k; n = this._texCache.get(ck); }
        if (!n) {
          n = document.createElement('span');
          n.className = 'plot-tex-l';
          n.style.color = color; n.style.fontSize = size + 'px';
          this._texLayer.appendChild(n);
          Lab.setTex(n, L.str);
          this._texCache.set(ck, n);
        }
        used.add(n);
        const ax = o.align === 'right' ? '-100%' : o.align === 'center' ? '-50%' : '0';
        const ay = o.valign === 'top' ? '0' : o.valign === 'bottom' ? '-100%' : '-50%';
        n.style.left = (L.px + (o.dx || 0)) + 'px';
        n.style.top = (L.py + (o.dy || 0)) + 'px';
        n.dataset.top = L.py + (o.dy || 0);
        n.style.transform = 'translate(' + ax + ',' + ay + ')';
        n.style.display = '';
        if (o.avoid) avoidList.push(n);
      });
      // avoid: true のラベルは、先に置いたラベルと重なったら上下にずらす
      if (avoidList.length > 1) {
        const placed = [];
        avoidList.forEach((n) => {
          let r = n.getBoundingClientRect(), shift = 0;
          for (let k = 0; k < 6 && placed.some((q) => r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top); k++) {
            const d = r.height + 2; shift = (k % 2 ? -1 : 1) * d * Math.ceil((k + 1) / 2);
            n.style.top = (parseFloat(n.dataset.top) + shift) + 'px';
            r = n.getBoundingClientRect();
          }
          placed.push(r);
        });
      }
      this._texCache.forEach((n, k) => {
        if (used.has(n)) return;
        n.style.display = 'none';
        if (this._texCache.size > 120) { n.remove(); this._texCache.delete(k); }
      });
    }

    grid(o) {
      o = Object.assign({ step: 1, axes: true, labels: true, xlabel: '', ylabel: '', dxLabels: null }, o);
      const ctx = this.ctx, c = this.c;
      const sx = o.stepX || o.step, sy = o.stepY || o.step;
      ctx.lineWidth = 1;
      ctx.strokeStyle = c.grid;
      ctx.beginPath();
      for (let x = Math.ceil(this.xmin / sx) * sx; x <= this.xmax + 1e-9; x += sx) {
        const px = Math.round(this.X(x)) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, this.h);
      }
      for (let y = Math.ceil(this.ymin / sy) * sy; y <= this.ymax + 1e-9; y += sy) {
        const py = Math.round(this.Y(y)) + 0.5; ctx.moveTo(0, py); ctx.lineTo(this.w, py);
      }
      ctx.stroke();
      if (o.axes) {
        ctx.strokeStyle = c.axis; ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (this.ymin <= 0 && this.ymax >= 0) { const py = Math.round(this.Y(0)) + 0.5; ctx.moveTo(0, py); ctx.lineTo(this.w, py); }
        if (this.xmin <= 0 && this.xmax >= 0) { const px = Math.round(this.X(0)) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, this.h); }
        ctx.stroke();
      }
      if (o.labels) {
        const k = Math.max(1, Math.ceil(34 / (this.pxPerX * sx)));
        const ky = Math.max(1, Math.ceil(28 / ((this.h / (this.ymax - this.ymin)) * sy)));
        ctx.fillStyle = c.muted; ctx.font = '11px ' + FONT;
        const ay = this.ymin <= 0 && this.ymax >= 0 ? this.Y(0) : this.h - 2;
        const ax = this.xmin <= 0 && this.xmax >= 0 ? this.X(0) : 2;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const yOn = ay < this.h - 16;
        for (let i = Math.ceil(this.xmin / sx); i * sx <= this.xmax + 1e-9; i++) {
          if (i % k !== 0 || (i === 0 && this.xmin <= 0)) continue;
          const v = i * sx;
          ctx.fillText(Lab.minus(Lab.num(v, 2)), this.X(v), yOn ? ay + 4 : this.h - 15);
        }
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        const xOn = ax > 26;
        for (let i = Math.ceil(this.ymin / sy); i * sy <= this.ymax + 1e-9; i++) {
          if (i % ky !== 0 || i === 0) continue;
          const v = i * sy;
          ctx.fillText(Lab.minus(Lab.num(v, 2)), xOn ? ax - 5 : 26, this.Y(v));
        }
        if (this.xmin <= 0 && this.ymin <= 0 && this.xmax >= 0 && this.ymax >= 0) {
          ctx.textAlign = 'right'; ctx.textBaseline = 'top';
          this.texPx('\\mathrm{O}', this.X(0) - 5, this.Y(0) + 4, { align: 'right', valign: 'top', size: 13, color: c.muted });
        }
      }
      // 軸の名前も TeX で(日本語は \text{} に入れる)
      const axTeX = (t) => String(t).replace(/[^\x00-\x7f]+/g, (m) => '\\text{' + m + '}');
      if (o.xlabel) this.texPx(axTeX(o.xlabel), this.w - 8, this.Y(0) - 6 > 14 && this.Y(0) < this.h ? this.Y(0) - 6 : this.h - 6, { align: 'right', valign: 'bottom', size: 15, color: c.muted });
      if (o.ylabel) this.texPx(axTeX(o.ylabel), this.X(0) + 8 < this.w - 20 && this.X(0) > 0 ? this.X(0) + 8 : 8, 4, { align: 'left', valign: 'top', size: 15, color: c.muted });
    }

    line(x0, y0, x1, y1, o) {
      o = o || {};
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = o.color || this.c.text; ctx.lineWidth = o.width || 2;
      ctx.setLineDash(o.dash || []); ctx.lineCap = 'round';
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      ctx.beginPath(); ctx.moveTo(this.X(x0), this.Y(y0)); ctx.lineTo(this.X(x1), this.Y(y1)); ctx.stroke();
      ctx.restore();
    }
    arrow(x0, y0, x1, y1, o) {
      o = o || {};
      const ax = this.X(x0), ay = this.Y(y0), bx = this.X(x1), by = this.Y(y1);
      const d = Math.hypot(bx - ax, by - ay);
      if (d < 2) return;
      const ctx = this.ctx, ang = Math.atan2(by - ay, bx - ax), hs = Math.min(o.head || Math.max(16, (o.width || 2.5) * 5), d * 0.75);
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = o.color || this.c.text;
      ctx.lineWidth = o.width || 2.5; ctx.setLineDash(o.dash || []); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx - Math.cos(ang) * hs * 0.5, by - Math.sin(ang) * hs * 0.5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - hs * Math.cos(ang - 0.48), by - hs * Math.sin(ang - 0.48));
      ctx.lineTo(bx - hs * Math.cos(ang + 0.48), by - hs * Math.sin(ang + 0.48));
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // y=f(x) を描く。範囲外・不連続で線を切る
    fn(f, o) {
      o = o || {};
      const ctx = this.ctx;
      const x0 = o.x0 != null ? o.x0 : this.xmin, x1 = o.x1 != null ? o.x1 : this.xmax;
      const n = o.samples || Math.max(60, Math.round(this.w / 2));
      const lim = (this.ymax - this.ymin) * 3;
      ctx.save();
      ctx.strokeStyle = o.color || this.c.primary; ctx.lineWidth = o.width || 3;
      ctx.setLineDash(o.dash || []); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, y = f(x);
        if (!isFinite(y) || Math.abs(y) > lim + Math.abs(this.ymax) + Math.abs(this.ymin)) { pen = false; continue; }
        const px = this.X(x), py = this.Y(y);
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
      }
      ctx.stroke();
      ctx.restore();
    }
    poly(pts, o) {
      o = o || {};
      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = o.color || this.c.text; ctx.lineWidth = o.width || 2;
      ctx.setLineDash(o.dash || []); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (o.alpha != null) ctx.globalAlpha = o.alpha;
      ctx.beginPath();
      pts.forEach((p, i) => { const px = this.X(p[0]), py = this.Y(p[1]); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      ctx.stroke();
      ctx.restore();
    }
    dot(x, y, o) {
      o = o || {};
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath(); ctx.arc(this.X(x), this.Y(y), o.r || 5, 0, Math.PI * 2);
      if (o.ring) {
        ctx.fillStyle = this.c.bg; ctx.fill();
        ctx.strokeStyle = o.color || this.c.accent; ctx.lineWidth = o.lw || 2.5; ctx.stroke();
      } else {
        ctx.fillStyle = o.color || this.c.accent; ctx.fill();
        if (o.stroke !== false) { ctx.strokeStyle = this.c.bg; ctx.lineWidth = 2; ctx.stroke(); }
      }
      ctx.restore();
    }
    text(str, x, y, o) {
      o = o || {};
      if (Plot.hasMath(str)) { this.tex(Plot.mixedTeX(str), x, y, Plot.texOpts(o)); return; }
      const ctx = this.ctx;
      ctx.save();
      ctx.font = (o.bold ? '700 ' : o.italic ? 'italic ' : '') + (o.size || 13) + 'px ' + FONT;
      ctx.fillStyle = o.color || this.c.text;
      ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
      const px = this.X(x) + (o.dx || 0), py = this.Y(y) + (o.dy || 0);
      if (o.halo !== false) { ctx.lineWidth = 4; ctx.strokeStyle = this.c.bg; ctx.lineJoin = 'round'; ctx.strokeText(str, px, py); }
      ctx.fillText(str, px, py);
      ctx.restore();
    }

    // 画面のピクセル座標に文字を置く
    textPx(str, px, py, o) {
      o = o || {};
      if (Plot.hasMath(str)) { this.texPx(Plot.mixedTeX(str), px, py, Plot.texOpts(o)); return; }
      const ctx = this.ctx;
      ctx.save();
      ctx.font = (o.bold ? '700 ' : '') + (o.size || 13) + 'px ' + FONT;
      ctx.fillStyle = o.color || this.c.text;
      ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
      if (o.halo !== false) { ctx.lineWidth = 4; ctx.strokeStyle = this.c.bg; ctx.lineJoin = 'round'; ctx.strokeText(str, px, py); }
      ctx.fillText(str, px, py);
      ctx.restore();
    }

    /* ----- ハンドル ----- */
    // h: { x, y (値 or getter), color, label, drag(x,y), r }
    addHandle(h) { this.handles.push(h); return h; }
    _drawHandles() {
      const ctx = this.ctx;
      this.handles.forEach((h) => {
        if (h.hidden && h.hidden()) return;
        const px = this.X(h.x), py = this.Y(h.y), on = this.active === h;
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, (h.r || 9) + (on ? 4 : 0) + (h.halo != null ? h.halo : 6), 0, Math.PI * 2);
        ctx.fillStyle = (h.color || this.c.accent) + '2e'; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, (h.r || 9) + (on ? 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = h.color || this.c.accent; ctx.fill();
        ctx.lineWidth = (h.r || 9) < 7 ? 2 : 3; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.restore();
        const tx = typeof h.tex === 'function' ? h.tex() : h.tex;
        if (tx) this.tex(tx, h.x, h.y, { dx: h.ldx != null ? h.ldx : 14, dy: h.ldy != null ? h.ldy : -14, size: 15, color: this.c.text, align: h.lalign });
        const lb = typeof h.label === 'function' ? h.label() : h.label;
        if (lb && !tx) {
          this.text(lb, h.x, h.y, { dx: h.ldx != null ? h.ldx : 14, dy: h.ldy != null ? h.ldy : -14, bold: true, size: 13, color: this.c.text, align: h.lalign });
        }
      });
    }
    _pt(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    _hit(p, touch) {
      let best = null, bd = Infinity;
      const rad = touch ? 26 : 16;
      this.handles.forEach((h) => {
        if (h.hidden && h.hidden()) return;
        const d = Math.hypot(this.X(h.x) - p.x, this.Y(h.y) - p.y);
        if (d < Math.max(rad, (h.r || 9) + 8) && d < bd) { best = h; bd = d; }
      });
      return best;
    }
    _bind() {
      const cv = this.canvas;
      cv.addEventListener('touchstart', (e) => {
        if (!this.handles.length) return;
        const t = e.touches[0], r = cv.getBoundingClientRect();
        if (this._hit({ x: t.clientX - r.left, y: t.clientY - r.top }, true)) e.preventDefault();
      }, { passive: false });
      cv.addEventListener('pointerdown', (e) => {
        const h = this._hit(this._pt(e), e.pointerType !== 'mouse');
        if (!h) return;
        this.active = h;
        cv.setPointerCapture(e.pointerId);
        e.preventDefault();
        this._move(e);
      });
      cv.addEventListener('pointermove', (e) => {
        if (this.active) { this._move(e); e.preventDefault(); return; }
        if (e.pointerType === 'mouse') cv.style.cursor = this._hit(this._pt(e), false) ? 'grab' : 'default';
      });
      const end = () => { if (this.active) { this.active = null; cv.style.cursor = 'default'; this.render(); } };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
    }
    _move(e) {
      const p = this._pt(e);
      this.active.drag(this.ix(p.x), this.iy(p.y));
      this.invalidate();
    }
  }

  Lab.Plot = Plot;
  Lab.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  Lab.snap = (v, s) => Math.round(v / s) * s;
})();
