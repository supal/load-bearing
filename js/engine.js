/* Diagram engine: renders a node/edge system diagram as SVG and animates
   "packets" travelling along edges for each lesson step.

   Step fields understood here:
     flows:  [{ from, to, kind: 'req'|'res'|'warn'|'err', label, seq, stream, period, offset }]
             seq    -> packets with the same seq move together; seq 0 then 1 then 2 ... then loop
             stream -> continuous traffic: n packets evenly spaced, looping every `period` ms
     focus:  [nodeId]           nodes to highlight (others dim)
     hide:   [nodeId | edgeId]  hidden elements (edges touching hidden nodes hide too)
     states: { nodeId: 'down'|'hot'|'ok' }
     badges: { nodeId: 'text' }
     scale:  { nodeId: 1.3 }
     slot:   ms per seq slot (default 1000)
*/
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  const ICONS = {
    client: 'M3 5h18v11H3z M8 20h8 M12 16v4',
    phone: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M11 18h2',
    users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5 M16 4.3a3.5 3.5 0 0 1 0 6.4 M18 14.8c2 .7 3.5 2.4 3.5 5.2',
    server: 'M4 4h16v6H4z M4 14h16v6H4z M8 7h.01 M8 17h.01',
    db: 'M4 6c0-1.66 3.58-3 8-3s8 1.34 8 3-3.58 3-8 3-8-1.34-8-3z M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6 M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3',
    cache: 'M13 2 4 14h7l-1 8 9-12h-7z',
    dns: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3.5 3.5 3.5 14.5 0 18 M12 3c-3.5 3.5-3.5 14.5 0 18',
    lb: 'M3 12h5 M8 12 19 5 M8 12h11 M8 12l11 7 M19 5h.01 M19 12h.01 M19 19h.01',
    queue: 'M3 7h18v10H3z M8 7v10 M13 7v10',
    blob: 'M3 4h18v4H3z M5 8l1.2 12h11.6L19 8 M10 12h4',
    edge: 'M12 2.5 20.5 7.3v9.4L12 21.5 3.5 16.7V7.3z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    kv: 'M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14',
    timer: 'M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M12 9v4l2.5 2 M9.5 2h5',
    lock: 'M5 11h14v10H5z M8 11V7.5a4 4 0 0 1 8 0V11 M12 15v2.5',
    key: 'M8 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M11.6 12.6 20 21 M17 18l2.5-2.5 M14.5 15.5 17 13',
    chart: 'M4 20h16 M7 16v-4 M12 16V6 M17 16v-7',
    gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
    code: 'M8 7 3 12l5 5 M16 7l5 5-5 5 M14 4l-4 16',
    flag: 'M5 21V3.5 M5 4h12.5l-2.5 4.5 2.5 4.5H5',
    bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z M10 21h4',
    shield: 'M12 2.5 20 5.8v6c0 4.8-3.4 8.4-8 9.7-4.6-1.3-8-4.9-8-9.7v-6z M8.5 12l2.4 2.4 4.6-4.8'
  };

  let uid = 0;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const prefersReduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Point where the ray from (cx,cy) toward (tx,ty) leaves a w×h box centred at (cx,cy).
  function clip(cx, cy, tx, ty, hw, hh, pad) {
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const t = Math.min(dx ? (hw + pad) / Math.abs(dx) : Infinity, dy ? (hh + pad) / Math.abs(dy) : Infinity);
    return [cx + dx * t, cy + dy * t];
  }

  class Diagram {
    constructor(host, spec, opts) {
      this.host = host;
      this.spec = spec;
      this.opts = opts || {};
      this.id = ++uid;
      this.nodes = {};
      this.edges = {};
      this.packets = [];
      this.running = false;
      this.visible = true;
      this.slot = 1000;
      this.pause = 700;
      this.maxSeq = 0;
      this.t0 = performance.now();
      this.loop = this.loop.bind(this);
      this.build();
    }

    build() {
      const W = this.spec.w || 900, H = this.spec.h || 460;
      const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'diagram', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' });
      this.host.appendChild(svg);
      this.svg = svg;

      const defs = el('defs', {}, svg);
      const pat = el('pattern', { id: `lbdots${this.id}`, width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
      el('circle', { cx: 1.5, cy: 1.5, r: 1.1, class: 'grid-dot' }, pat);
      el('rect', { x: 0, y: 0, width: W, height: H, fill: `url(#lbdots${this.id})` }, svg);

      this.gEdges = el('g', { class: 'edges' }, svg);
      this.gNodes = el('g', { class: 'nodes' }, svg);
      this.gPackets = el('g', { class: 'packets' }, svg);

      const specById = {};
      this.spec.nodes.forEach(n => {
        const w = n.w || 152, h = n.h || 58;
        specById[n.id] = Object.assign({ w, h }, n);
        const g = el('g', { class: `node kind-${n.kind || 'server'}`, transform: `translate(${n.x} ${n.y})` }, this.gNodes);
        const inner = el('g', { class: 'node-inner' }, g);
        el('rect', { class: 'node-glow', x: -w / 2 - 6, y: -h / 2 - 6, width: w + 12, height: h + 12, rx: 17 }, inner);
        el('rect', { class: 'node-box', x: -w / 2, y: -h / 2, width: w, height: h, rx: 12 }, inner);
        const ic = el('g', { class: 'node-icon', transform: `translate(${-w / 2 + 14} -12)` }, inner);
        el('rect', { class: 'icon-bg', x: -5, y: -5, width: 34, height: 34, rx: 9 }, ic);
        el('path', { d: ICONS[n.kind] || ICONS.server }, ic);
        const tx = -w / 2 + 56;
        const label = el('text', { class: 'node-label', x: tx, y: n.sub ? -2 : 5 }, inner);
        label.textContent = n.label;
        if (n.sub) {
          const s = el('text', { class: 'node-sub', x: tx, y: 14 }, inner);
          s.textContent = n.sub;
        }
        const down = el('g', { class: 'down-mark', transform: `translate(${w / 2 - 4} ${-h / 2 + 4})` }, g);
        el('circle', { r: 9 }, down);
        el('path', { d: 'M-3.3 -3.3 3.3 3.3 M3.3 -3.3 -3.3 3.3' }, down);
        const badge = el('g', { class: 'badge', transform: `translate(0 ${-h / 2 - 17})` }, g);
        const bin = el('g', { class: 'badge-in' }, badge);
        const br = el('rect', { class: 'badge-bg', x: 0, y: -11, height: 22, rx: 11 }, bin);
        const bt = el('text', { class: 'badge-text', x: 0, y: 4, 'text-anchor': 'middle' }, bin);
        this.nodes[n.id] = { spec: n, g, inner, badge, br, bt, w, h, text: null };
      });

      this.spec.edges.forEach(raw => {
        const E = Array.isArray(raw) ? { a: raw[0], b: raw[1], curve: raw[2] || 0 } : Object.assign({ curve: 0 }, raw);
        const id = E.id || `${E.a}-${E.b}`;
        const A = specById[E.a], B = specById[E.b];
        if (!A || !B) { console.warn('edge with unknown node', id); return; }
        let d;
        if (!E.curve) {
          const p0 = clip(A.x, A.y, B.x, B.y, A.w / 2, A.h / 2, 6);
          const p1 = clip(B.x, B.y, A.x, A.y, B.w / 2, B.h / 2, 6);
          d = `M${p0[0]} ${p0[1]} L${p1[0]} ${p1[1]}`;
        } else {
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
          let nx = -(B.y - A.y), ny = B.x - A.x;
          const len = Math.hypot(nx, ny) || 1;
          nx /= len; ny /= len;
          const cx = mx + nx * E.curve, cy = my + ny * E.curve;
          const p0 = clip(A.x, A.y, cx, cy, A.w / 2, A.h / 2, 6);
          const p1 = clip(B.x, B.y, cx, cy, B.w / 2, B.h / 2, 6);
          d = `M${p0[0]} ${p0[1]} Q${cx} ${cy} ${p1[0]} ${p1[1]}`;
        }
        const g = el('g', { class: 'edge' }, this.gEdges);
        const path = el('path', { d, class: 'edge-line' }, g);
        el('path', { d, class: 'edge-flow' }, g);
        this.edges[id] = { E, g, path, len: path.getTotalLength() };
      });

      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver(entries => {
          this.visible = entries[0].isIntersecting;
          if (this.visible) this.start(); else this.stop();
        });
        this.io.observe(svg);
      }
    }

    resolveFlow(f) {
      if (this.edges[`${f.from}-${f.to}`]) return Object.assign({}, f, { edgeId: `${f.from}-${f.to}`, reverse: false });
      if (this.edges[`${f.to}-${f.from}`]) return Object.assign({}, f, { edgeId: `${f.to}-${f.from}`, reverse: true });
      console.warn('no edge for flow', f.from, '->', f.to);
      return null;
    }

    setBadge(n, text) {
      if (!text) { n.badge.classList.remove('show'); n.text = null; return; }
      if (n.text === text && n.badge.classList.contains('show')) return;
      n.text = text;
      n.bt.textContent = text;
      let w = 0;
      try { w = n.bt.getComputedTextLength(); } catch (e) { /* not rendered */ }
      if (!w) w = text.length * 6.5;
      w += 22;
      n.br.setAttribute('x', -w / 2);
      n.br.setAttribute('width', w);
      n.badge.classList.remove('show');
      requestAnimationFrame(() => requestAnimationFrame(() => n.badge.classList.add('show')));
    }

    setStep(step) {
      const st = step || {};
      this.step = st;
      const hide = new Set(st.hide || []);
      const flows = (st.flows || []).map(f => this.resolveFlow(f)).filter(Boolean);
      const focus = new Set(st.focus || []);
      const states = st.states || {}, badges = st.badges || {}, scale = st.scale || {};
      const involved = new Set(focus);
      flows.forEach(f => { involved.add(f.from); involved.add(f.to); });
      Object.keys(states).forEach(k => involved.add(k));
      Object.keys(badges).forEach(k => involved.add(k));
      // horizontal centre of the action, 0..1 (used to auto-scroll narrow screens)
      const xs = [...involved].filter(id => this.nodes[id] && !hide.has(id)).map(id => this.nodes[id].spec.x);
      this.focusFrac = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 / (this.spec.w || 900) : 0.5;

      for (const id in this.nodes) {
        const n = this.nodes[id], c = n.g.classList;
        c.toggle('is-hidden', hide.has(id));
        c.toggle('is-dim', !hide.has(id) && involved.size > 0 && !involved.has(id));
        c.toggle('is-focus', focus.has(id));
        ['down', 'hot', 'ok'].forEach(s => c.toggle('is-' + s, states[id] === s));
        n.inner.style.transform = scale[id] ? `scale(${scale[id]})` : '';
        this.setBadge(n, hide.has(id) ? null : badges[id]);
      }

      const active = new Set(flows.map(f => f.edgeId));
      for (const id in this.edges) {
        const e = this.edges[id];
        const hidden = hide.has(id) || hide.has(e.E.a) || hide.has(e.E.b);
        e.g.classList.toggle('is-hidden', hidden);
        e.g.classList.toggle('is-active', active.has(id));
        e.g.classList.toggle('is-dim', !hidden && involved.size > 0 && !active.has(id));
      }

      this.gPackets.textContent = '';
      this.packets = [];
      flows.forEach(f => {
        const count = f.stream || 1;
        for (let i = 0; i < count; i++) {
          const g = el('g', { class: `packet pk-${f.kind || 'req'}` }, this.gPackets);
          g.style.opacity = 0;
          el('circle', { r: 11, class: 'packet-halo' }, g);
          el('circle', { r: 5, class: 'packet-core' }, g);
          if (f.label && i === 0) {
            const t = el('text', { class: 'packet-label', y: -16, 'text-anchor': 'middle' }, g);
            t.textContent = f.label;
          }
          this.packets.push({ f, i, count, g });
        }
      });
      this.maxSeq = flows.reduce((m, f) => (f.stream ? m : Math.max(m, f.seq || 0)), 0);
      this.slot = st.slot || this.opts.slot || 1000;
      this.replay();
    }

    replay() {
      this.t0 = performance.now();
      if (prefersReduced()) { this.stop(); this.render(this.t0, true); return; }
      this.render(this.t0);
      this.start();
    }

    start() {
      if (this.running || !this.visible || prefersReduced()) return;
      this.running = true;
      this.raf = requestAnimationFrame(this.loop);
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    loop(now) {
      if (!this.running) return;
      this.render(now);
      this.raf = requestAnimationFrame(this.loop);
    }

    render(now, still) {
      const elapsed = now - this.t0;
      const cycle = (this.maxSeq + 1) * this.slot + this.pause;
      const t = elapsed % cycle;
      const receiving = new Set(), live = new Set();
      for (const p of this.packets) {
        const f = p.f;
        let local;
        if (still) local = 0.5;
        else if (f.stream) local = ((elapsed / (f.period || 1800)) + p.i / p.count + (f.offset || 0)) % 1;
        else local = (t - (f.seq || 0) * this.slot) / this.slot;
        if (local < 0 || local > 1) { p.g.style.opacity = 0; continue; }
        const e = this.edges[f.edgeId];
        const k = f.stream ? local : ease(local);
        const pt = e.path.getPointAtLength(e.len * (f.reverse ? 1 - k : k));
        p.g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
        p.g.style.opacity = Math.min(1, local * 8, (1 - local) * 8);
        live.add(f.edgeId);
        if (local > 0.8) receiving.add(f.to);
      }
      for (const id in this.edges) this.edges[id].g.classList.toggle('is-live', live.has(id));
      for (const id in this.nodes) this.nodes[id].g.classList.toggle('is-receiving', receiving.has(id));
    }

    destroy() {
      this.stop();
      if (this.io) this.io.disconnect();
      if (this.svg && this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
    }
  }

  window.Diagram = Diagram;
})();
