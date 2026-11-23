(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const LESSONS = window.LESSONS || {};
  const CURRICULUM = window.CURRICULUM;
  const FLAT = [];
  CURRICULUM.forEach((m, mi) => m.lessons.forEach(l => FLAT.push(Object.assign({}, l, { module: m, mi, n: FLAT.length + 1 }))));
  const BY = {};
  FLAT.forEach(l => { BY[l.slug] = l; });
  const isReady = slug => !!LESSONS[slug];
  const READY = FLAT.filter(l => isReady(l.slug));
  const HOME_TITLE = 'Load Bearing — System design, one animated step at a time';

  let progress = store.get('lb.progress', null);
  if (!progress || typeof progress !== 'object') progress = {};
  progress.done = progress.done || {};
  const save = () => store.set('lb.progress', progress);
  const doneCount = () => READY.filter(l => progress.done[l.slug]).length;
  const nextUnfinished = () => READY.find(l => !progress.done[l.slug]) || READY[0];

  /* ---------------- theme ---------------- */
  const root = document.documentElement;
  $('#theme-toggle').addEventListener('click', () => {
    const t = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = t;
    store.set('lb.theme', t);
  });

  /* ---------------- view lifecycle ---------------- */
  const app = $('#app');
  let view = { type: null, cleanup: [] };
  function teardown() {
    (view.cleanup || []).forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    view = { type: null, cleanup: [] };
  }

  function router() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    document.body.classList.remove('nav-open');
    if (parts[0] === 'learn' && BY[parts[1]]) return showLesson(parts[1], parseInt(parts[2], 10) || 1);
    showHome(parts[0]);
  }

  /* ================= HOME ================= */
  const HERO_SPEC = {
    w: 900, h: 450,
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', sub: '1.2M online', x: 100, y: 225 },
      { id: 'cdn', kind: 'edge', label: 'CDN edge', sub: '212 PoPs', x: 330, y: 80 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', x: 330, y: 310 },
      { id: 'a1', kind: 'server', label: 'App · a', sub: 'stateless', x: 570, y: 225 },
      { id: 'a2', kind: 'server', label: 'App · b', sub: 'stateless', x: 570, y: 385 },
      { id: 'cache', kind: 'cache', label: 'Cache', sub: 'hit 94%', x: 800, y: 105 },
      { id: 'db', kind: 'db', label: 'Database', sub: 'primary', x: 800, y: 320 }
    ],
    edges: [['users', 'cdn'], ['users', 'lb'], ['lb', 'a1'], ['lb', 'a2'], ['a1', 'cache'], ['a1', 'db'], ['a2', 'db'], ['cdn', 'a1', 40]]
  };
  const HERO_STEP = {
    flows: [
      { from: 'users', to: 'cdn', stream: 2, period: 2600 },
      { from: 'cdn', to: 'users', kind: 'res', stream: 2, period: 2600, offset: 0.25 },
      { from: 'users', to: 'lb', stream: 3, period: 2300 },
      { from: 'lb', to: 'a1', stream: 2, period: 2300, offset: 0.2 },
      { from: 'lb', to: 'a2', stream: 2, period: 2300, offset: 0.7 },
      { from: 'a1', to: 'cache', stream: 2, period: 2000 },
      { from: 'cache', to: 'a1', kind: 'res', stream: 2, period: 2000, offset: 0.5 },
      { from: 'a1', to: 'db', kind: 'warn', stream: 1, period: 3200 },
      { from: 'a2', to: 'db', stream: 1, period: 2600, offset: 0.4 },
      { from: 'db', to: 'a2', kind: 'res', stream: 1, period: 2600, offset: 0.9 },
      { from: 'cdn', to: 'a1', kind: 'warn', stream: 1, period: 4200, offset: 0.3 }
    ]
  };

  const TOPICS = ['DNS', 'TCP & TLS', 'Load balancing', 'Caching', 'CDNs', 'Replication', 'Sharding', 'Consistent hashing',
    'CAP', 'Raft', 'Isolation levels', 'Message queues', 'Event streams', 'WebSockets', 'Rate limiting', 'Retries & backoff',
    'Circuit breakers', 'Tracing', 'Sagas', 'OAuth', 'Canary deploys', 'Napkin math'];

  function homeHTML() {
    const last = progress.last && BY[progress.last.slug] && isReady(progress.last.slug) ? progress.last : null;
    const primary = last
      ? `<a class="btn primary lg" href="#/learn/${last.slug}/${last.step || 1}">Continue: ${esc(BY[last.slug].title)} <span class="arr">→</span></a>`
      : `<a class="btn primary lg" href="#/learn/${READY[0].slug}/1">Start lesson 1 <span class="arr">→</span></a>`;
    const words = [['System', ''], ['design,', ''], ['one', 'grad'], ['animated', 'grad'], ['step', 'grad'], ['at', ''], ['a', ''], ['time.', '']];
    const topicRow = TOPICS.map(t => `<span>${t}</span><i>✦</i>`).join('');

    return `
    <section class="hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-inner">
        <a class="eyebrow" href="#/outline"><span class="dot"></span>40 animated lessons · ${READY.length} ready now · free</a>
        <h1 class="hero-title">${words.map((w, i) => `<span class="w ${w[1]}" style="--i:${i}">${w[0]}</span>`).join(' ')}</h1>
        <p class="hero-sub">Watch requests move through load balancers, caches, queues and databases. Press <em>Next</em>, see one hop light up, and build a mental model of how real systems scale, and how they fail.</p>
        <div class="hero-ctas">${primary}<a class="btn lg" href="#/outline">See all 40 lessons</a></div>
        <div class="hero-stats">
          <div><strong data-count="40">40</strong><span>lessons</span></div>
          <div><strong data-count="9">9</strong><span>modules</span></div>
          <div><strong data-count="7" data-suffix=" min">7 min</strong><span>per lesson</span></div>
          <div><strong>$0</strong><span>no paywall</span></div>
        </div>
      </div>
      <div class="hero-stage reveal">
        <div class="chrome">
          <span class="dots"><i></i><i></i><i></i></span>
          <span class="chrome-title">production · tuesday 14:02</span>
          <span class="chrome-pill"><span class="live-dot"></span>live</span>
        </div>
        <div class="stage-scroll"><div id="hero-diagram"></div></div>
        <div class="float-tag t1"><span>p99 latency</span><strong id="tag-p99">84 ms</strong></div>
        <div class="float-tag t2"><span>cache hit ratio</span><strong id="tag-hit">94.2%</strong></div>
        <div class="float-tag t3"><span>throughput</span><strong id="tag-rps">12,480/s</strong></div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee-track">${topicRow}${topicRow}</div></div>

    <section class="section" id="how">
      <div class="section-head reveal"><span class="kicker">How it works</span><h2>Three moves. That's the whole interface.</h2></div>
      <div class="how-grid">
        ${[
          ['01', 'Pick a topic', 'Start with <em>The Life of a Request</em>, or jump to whatever your next interview or design review needs. Search finds any lesson.', 'M4 6h16M4 12h10M4 18h7'],
          ['02', 'Step through it', 'Each press of Next moves the diagram forward by one action. The active connection lights up and the explanation follows it.', 'M5 12h12M13 6l6 6-6 6'],
          ['03', 'Replay until it clicks', 'Run a step again, go back, compare. Progress stays in this browser, so there\'s no account to create.', 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4']
        ].map((c, i) => `
          <article class="how-card glow-card reveal" style="--d:${i}">
            <div class="how-top"><span class="how-num">${c[0]}</span><svg viewBox="0 0 24 24"><path d="${c[3]}"/></svg></div>
            <h3>${c[1]}</h3><p>${c[2]}</p>
          </article>`).join('')}
      </div>
    </section>

    <section class="section" id="features">
      <div class="section-head reveal"><span class="kicker">Inside every lesson</span><h2>Diagrams that move the way traffic does.</h2>
        <p>Static architecture diagrams show where the boxes are. These show what happens between them, step by step.</p></div>
      <div class="feature-grid">
        ${[
          ['Moving diagrams, not static boxes', 'Packets travel the real path, and each kind has its own color: requests, responses, cache misses and failures.', 'req'],
          ['Numbers you can reason with', 'Latency ladders, hit-ratio math and capacity estimates, with every assumption written down.', 'res'],
          ['Failure is part of the story', 'Servers go down, caches go stale, queues back up. You see what breaks, and what keeps the system running.', 'err'],
          ['Built for coming back to', 'Short steps, keyboard controls and saved progress. Five minutes on a lunch break is a full lesson.', 'warn']
        ].map((f, i) => `
          <article class="feature glow-card reveal" style="--d:${i}">
            <div class="feature-viz fv-${i}" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
            <h3><span class="chip-dot ${f[2]}"></span>${f[0]}</h3><p>${f[1]}</p>
          </article>`).join('')}
      </div>
    </section>

    <section class="section" id="peek">
      <div class="section-head reveal"><span class="kicker">Try it here</span><h2>Four moments from the caching lesson.</h2></div>
      <div class="peek reveal">
        <div class="peek-tabs" id="peek-tabs" role="tablist"></div>
        <div class="peek-body">
          <div class="peek-stage"><div class="stage-scroll"><div id="peek-diagram"></div></div></div>
          <div class="peek-text" id="peek-text"></div>
        </div>
      </div>
    </section>

    <section class="section" id="who">
      <div class="section-head reveal"><span class="kicker">Who it's for</span><h2>Useful whether you're learning, interviewing or reviewing.</h2></div>
      <div class="who-grid">
        ${[
          ['Learning backend fundamentals', 'Get a working picture of how DNS, load balancers, caches and databases fit together before you have to debug them at 3 a.m.'],
          ['Preparing for system design interviews', 'Practice the vocabulary and trade-offs interviewers probe: estimates, bottlenecks, consistency and failure handling.'],
          ['Reviewing a real architecture', 'Use a lesson as a shared picture when your team debates a cache, a queue or a migration plan.']
        ].map((w, i) => `<article class="who-card reveal" style="--d:${i}"><h3>${w[0]}</h3><p>${w[1]}</p></article>`).join('')}
      </div>
    </section>

    <section class="section" id="outline">
      <div class="section-head reveal"><span class="kicker">Course outline</span><h2>40 lessons across nine modules.</h2>
        <p>Each module builds on the one before it. Every lesson is a short animated walkthrough you can step through at your own pace.</p></div>
      <div class="modules">
        ${CURRICULUM.map((m, mi) => {
          const readyN = m.lessons.filter(l => isReady(l.slug)).length;
          return `
          <article class="module reveal" style="--d:${mi % 3}">
            <header><span class="mod-num">${pad(mi + 1)}</span><div><h3>${m.title}</h3><p>${m.blurb}</p></div>
              <span class="mod-count ${readyN === m.lessons.length ? 'full' : ''}">${readyN}/${m.lessons.length}</span></header>
            <ol>${m.lessons.map(l => {
              const meta = BY[l.slug];
              return `<li><a href="#/learn/${l.slug}/1" class="${isReady(l.slug) ? 'ready' : 'soon'}">
                <span class="ln">${pad(meta.n)}</span><span class="lt">${l.title}</span>
                ${isReady(l.slug) ? (progress.done[l.slug] ? '<span class="tag done">done</span>' : '<span class="tag ready">play</span>') : '<span class="tag soon">soon</span>'}
              </a></li>`;
            }).join('')}</ol>
          </article>`;
        }).join('')}
      </div>
    </section>

    <section class="section" id="faq">
      <div class="section-head reveal"><span class="kicker">FAQ</span><h2>Questions people ask first.</h2></div>
      <div class="faq">
        ${[
          ['Do I need to know a particular language or framework?', 'No. The ideas apply in any language. Diagrams use generic components, and the occasional code or config snippet is there to illustrate an idea, not to be copied into production.'],
          ['How should I use this for interview prep?', 'Do Foundations, Scaling and Data in order, then the case studies. Before you press Next, try to say the trade-off out loud. For the estimation part of an interview, redo the napkin-math lesson with your own numbers.'],
          ['Are the latency numbers real?', 'They\'re realistic orders of magnitude for teaching. Your hardware, network and workload will differ, so measure p50, p95 and p99 under realistic load before you plan capacity.'],
          ['How long does the whole course take?', 'About five hours. Each lesson takes 6 to 9 minutes and your place is saved, so it works well in short sessions. Use the arrow keys to step and R to replay an animation.'],
          ['Where is my progress stored?', 'Only in this browser\'s local storage. Nothing is sent to a server. Clearing site data resets it.']
        ].map((q, i) => `<details class="reveal" style="--d:${i}"><summary>${q[0]}<span class="plus" aria-hidden="true"></span></summary><div class="faq-a"><p>${q[1]}</p></div></details>`).join('')}
      </div>
    </section>

    <section class="section" id="refs">
      <div class="section-head reveal"><span class="kicker">Go deeper</span><h2>Primary sources behind the lessons.</h2></div>
      <div class="refs">
        ${[
          ['RFC 1035', 'Domain names: implementation and specification', 'https://www.rfc-editor.org/rfc/rfc1035'],
          ['RFC 8446', 'The Transport Layer Security (TLS) Protocol Version 1.3', 'https://www.rfc-editor.org/rfc/rfc8446'],
          ['RFC 9110', 'HTTP Semantics', 'https://www.rfc-editor.org/rfc/rfc9110'],
          ['RFC 9111', 'HTTP Caching', 'https://www.rfc-editor.org/rfc/rfc9111'],
          ['Google SRE', 'Site Reliability Engineering (free online book)', 'https://sre.google/sre-book/table-of-contents/']
        ].map((r, i) => `<a class="ref reveal" style="--d:${i}" href="${r[2]}" target="_blank" rel="noopener"><span class="ref-tag">${r[0]}</span><span>${r[1]}</span><span class="arr">↗</span></a>`).join('')}
      </div>
    </section>

    <section class="cta-band reveal">
      <h2>Start with one request.</h2>
      <p>Eight steps, about six minutes, and you'll see the path every later lesson builds on.</p>
      <a class="btn primary lg" href="#/learn/${READY[0].slug}/1">Open lesson 1 <span class="arr">→</span></a>
    </section>

    ${footerHTML()}`;
  }

  function footerHTML() {
    return `<footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">${logoSVG()}<div><strong>Load Bearing</strong><p>System design, one animated step at a time.</p></div></div>
        <nav><a href="#/outline">Outline</a><a href="#/faq">FAQ</a><a href="#/refs">Sources</a><a href="#/learn/${READY[0].slug}/1">Start</a></nav>
      </div>
      <p class="fine">Diagrams are simplified teaching models. Numbers are illustrative orders of magnitude.</p>
    </footer>`;
  }

  function logoSVG() {
    return `<svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--req)"/><stop offset="1" stop-color="var(--violet)"/></linearGradient></defs><rect x="1" y="1" width="30" height="30" rx="9" fill="url(#lbg)"/><path d="M8 22.5h16M8 16h10M8 9.5h5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle class="logo-dot" cx="23" cy="9.5" r="2.6" fill="#fff"/></svg>`;
  }

  function showHome(section) {
    if (view.type !== 'home') {
      teardown();
      view.type = 'home';
      document.body.dataset.view = 'home';
      app.innerHTML = homeHTML();
      initHome();
    }
    document.title = HOME_TITLE;
    const target = section && document.getElementById(section);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }));
    else window.scrollTo(0, 0);
  }

  function initHome() {
    // hero diagram
    const hero = new window.Diagram($('#hero-diagram'), HERO_SPEC);
    hero.setStep(HERO_STEP);
    view.cleanup.push(() => hero.destroy());

    // live-looking tags
    const fmt = n => n.toLocaleString('en-US');
    const tick = setInterval(() => {
      const p99 = $('#tag-p99'), hit = $('#tag-hit'), rps = $('#tag-rps');
      if (!p99) return;
      p99.textContent = (78 + Math.round(Math.random() * 14)) + ' ms';
      hit.textContent = (93 + Math.random() * 2).toFixed(1) + '%';
      rps.textContent = fmt(12000 + Math.round(Math.random() * 900)) + '/s';
    }, 1800);
    view.cleanup.push(() => clearInterval(tick));

    // peek widget
    const P = LESSONS.caching;
    if (P) {
      const picks = [{ label: 'Cache hit', i: 1 }, { label: 'Cache miss', i: 2 }, { label: 'Invalidate on write', i: 4 }, { label: 'Thundering herd', i: 7 }];
      const pd = new window.Diagram($('#peek-diagram'), P.diagram);
      view.cleanup.push(() => pd.destroy());
      const tabs = $('#peek-tabs');
      tabs.innerHTML = picks.map((p, k) => `<button role="tab" data-k="${k}"><span class="tab-bar"><i></i></span>${p.label}</button>`).join('');
      let cur = 0, auto = true;
      const pick = k => {
        cur = k;
        const s = P.steps[picks[k].i];
        pd.setStep(s);
        $$('button', tabs).forEach((b, j) => { b.classList.toggle('on', j === k); b.setAttribute('aria-selected', j === k); });
        const t = $('#peek-text');
        t.innerHTML = `<span class="kicker">Step ${picks[k].i + 1} of ${P.steps.length}</span><h3>${s.title}</h3>${s.body}<a class="text-link" href="#/learn/caching/${picks[k].i + 1}">Open in the full lesson →</a>`;
        t.classList.remove('enter'); void t.offsetWidth; t.classList.add('enter');
      };
      tabs.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        auto = false; tabs.classList.add('manual');
        pick(+b.dataset.k);
      });
      pick(0);
      const rot = setInterval(() => { if (auto && !document.hidden) pick((cur + 1) % picks.length); }, 7000);
      view.cleanup.push(() => clearInterval(rot));
    }

    // scroll reveal
    const reveals = $$('.reveal');
    if ('IntersectionObserver' in window && !reduced()) {
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(r => io.observe(r));
      view.cleanup.push(() => io.disconnect());
    } else reveals.forEach(r => r.classList.add('in'));

    // count-up stats
    if (!reduced()) {
      $$('[data-count]').forEach(elm => {
        const target = +elm.dataset.count, suffix = elm.dataset.suffix || '';
        const t0 = performance.now(), dur = 1300;
        elm.textContent = '0' + suffix;
        const step = now => {
          const k = Math.min(1, (now - t0) / dur);
          elm.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
          if (k < 1 && elm.isConnected) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 500);
      });
    }

    // pointer-follow glow on cards
    $$('.glow-card').forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }

  /* ================= LEARN ================= */
  function sidebarHTML() {
    return `
      <div class="side-head">
        <div class="side-progress">
          <div class="sp-top"><span>Your progress</span><strong id="sp-count"></strong></div>
          <div class="sp-bar"><i id="sp-fill"></i></div>
        </div>
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4"/></svg>
          <input id="lesson-search" type="search" placeholder="Search lessons" autocomplete="off" aria-label="Search lessons">
          <kbd>/</kbd>
        </label>
      </div>
      <nav class="side-nav" aria-label="Lessons">
        ${CURRICULUM.map((m, mi) => `
          <div class="side-mod">
            <div class="side-mod-title"><span>${pad(mi + 1)}</span>${m.title}</div>
            ${m.lessons.map(l => `
              <a class="side-link ${isReady(l.slug) ? 'ready' : 'soon'}" data-slug="${l.slug}"
                 data-q="${esc((l.title + ' ' + l.blurb + ' ' + m.title).toLowerCase())}" href="#/learn/${l.slug}/1">
                <span class="st" aria-hidden="true"></span><span class="tl">${l.title}</span>
                ${isReady(l.slug) ? '' : '<span class="soon-tag">soon</span>'}
              </a>`).join('')}
          </div>`).join('')}
        <p class="side-empty" id="side-empty" hidden>No lessons match.</p>
      </nav>`;
  }

  function updateSidebar() {
    $$('.side-link').forEach(a => {
      a.classList.toggle('active', a.dataset.slug === view.slug);
      a.classList.toggle('done', !!progress.done[a.dataset.slug]);
    });
    const c = $('#sp-count'), f = $('#sp-fill');
    if (c) c.textContent = `${doneCount()} / ${READY.length}`;
    if (f) f.style.width = (doneCount() / READY.length * 100) + '%';
  }

  function initSidebar() {
    const input = $('#lesson-search');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      let any = false;
      $$('.side-mod').forEach(mod => {
        let modAny = false;
        $$('.side-link', mod).forEach(a => {
          const hit = !q || a.dataset.q.includes(q);
          a.hidden = !hit;
          modAny = modAny || hit;
        });
        mod.hidden = !modAny;
        any = any || modAny;
      });
      $('#side-empty').hidden = any;
    });
    $('#sidebar').addEventListener('click', e => { if (e.target.closest('.side-link')) document.body.classList.remove('nav-open'); });
    $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
  }

  function showLesson(slug, step) {
    if (view.type !== 'learn') {
      teardown();
      view.type = 'learn';
      document.body.dataset.view = 'learn';
      app.innerHTML = `<div class="learn"><aside class="sidebar" id="sidebar">${sidebarHTML()}</aside><div class="scrim" id="scrim"></div><main class="lesson-main" id="lesson-main"></main></div>`;
      initSidebar();
      const onKey = e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.matches('input, textarea')) { if (e.key === 'Escape') e.target.blur(); return; }
        if (e.key === '/') { e.preventDefault(); $('#lesson-search').focus(); return; }
        if (!view.lesson) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        else if (e.key === 'r' || e.key === 'R') view.diagram.replay();
      };
      document.addEventListener('keydown', onKey);
      view.cleanup.push(() => document.removeEventListener('keydown', onKey));
      view.cleanup.push(() => { if (view.diagram) view.diagram.destroy(); });
    }
    if (view.slug !== slug) {
      mountLesson(slug);
      window.scrollTo(0, 0);
    }
    if (view.lesson) goStep(step);
    updateSidebar();
    const active = $('.side-link.active');
    if (active && active.scrollIntoViewIfNeeded) active.scrollIntoViewIfNeeded(false);
  }

  function crumbHTML(meta, extra) {
    return `<div class="lesson-top">
      <button class="btn sm nav-toggle" id="nav-toggle" aria-label="Open lesson list">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Lessons</button>
      <div class="crumb"><a href="#/outline">${pad(meta.mi + 1)} · ${meta.module.title}</a><span class="sep">/</span><span>Lesson ${meta.n} of ${FLAT.length}</span>${extra || ''}</div>
    </div>`;
  }

  function mountLesson(slug) {
    if (view.diagram) { view.diagram.destroy(); view.diagram = null; }
    view.slug = slug;
    const meta = BY[slug];
    const L = LESSONS[slug];
    const main = $('#lesson-main');
    document.title = `${meta.title} · Load Bearing`;

    if (!L) {
      view.lesson = null;
      const nx = nextUnfinished();
      main.innerHTML = `${crumbHTML(meta)}
        <h1 class="lesson-title">${meta.title}</h1>
        <p class="lesson-blurb">${meta.blurb}</p>
        <section class="stage soon-stage">
          <div class="stage-scroll"><div id="stage-host"></div></div>
          <div class="soon-overlay">
            <span class="eyebrow"><span class="dot warn"></span>In production</span>
            <h2>This lesson is being animated.</h2>
            <p>It will appear in the sidebar when it's released. In the meantime, keep building on what's ready.</p>
            <div class="soon-ctas"><a class="btn primary" href="#/learn/${nx.slug}/1">Try “${nx.title}” →</a><a class="btn" href="#/outline">Course outline</a></div>
          </div>
        </section>`;
      view.diagram = new window.Diagram($('#stage-host'), {
        w: 900, h: 380,
        nodes: [
          { id: 'a', kind: 'client', label: 'Client', x: 140, y: 190 },
          { id: 'b', kind: 'server', label: 'Service', x: 450, y: 190 },
          { id: 'c', kind: 'db', label: 'Storage', x: 760, y: 190 }
        ],
        edges: [['a', 'b'], ['b', 'c']]
      });
      view.diagram.setStep({ flows: [{ from: 'a', to: 'b', stream: 3, period: 2400 }, { from: 'b', to: 'c', stream: 2, period: 2400, offset: 0.5 }] });
      wireNavToggle();
      return;
    }

    view.lesson = L;
    main.innerHTML = `${crumbHTML(meta, `<span class="sep">/</span><span>${L.minutes} min</span>`)}
      <h1 class="lesson-title">${meta.title}</h1>
      <p class="lesson-blurb">${meta.blurb}</p>
      <div class="steps-bar" id="steps-bar">${L.steps.map((s, i) => `<button class="seg" data-i="${i + 1}" title="${esc(s.title)}" aria-label="Step ${i + 1}: ${esc(s.title)}"><i></i></button>`).join('')}</div>
      <section class="stage">
        <div class="stage-caption"><span class="live-dot"></span><span id="stage-caption"></span></div>
        <button class="stage-replay" id="replay-btn" title="Replay (R)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/></svg>Replay</button>
        <div class="stage-scroll"><div id="stage-host"></div></div>
        <div class="legend"><span><i class="lgd req"></i>request</span><span><i class="lgd res"></i>response</span><span><i class="lgd warn"></i>miss / slow</span><span><i class="lgd err"></i>failure</span></div>
      </section>
      <article class="step-card" id="step-card" aria-live="polite"></article>
      <div class="controls">
        <button class="btn" id="prev-btn">← Back</button>
        <div class="step-count" id="step-count"></div>
        <button class="btn primary" id="next-btn">Next →</button>
      </div>
      <p class="kbd-hint"><kbd>←</kbd> <kbd>→</kbd> step &nbsp;·&nbsp; <kbd>R</kbd> replay &nbsp;·&nbsp; <kbd>/</kbd> search</p>`;

    view.diagram = new window.Diagram($('#stage-host'), L.diagram);
    $('#prev-btn').addEventListener('click', prev);
    $('#next-btn').addEventListener('click', next);
    $('#replay-btn').addEventListener('click', () => view.diagram.replay());
    $('#steps-bar').addEventListener('click', e => { const b = e.target.closest('.seg'); if (b) goStep(+b.dataset.i); });
    wireNavToggle();
  }

  function wireNavToggle() {
    const t = $('#nav-toggle');
    if (t) t.addEventListener('click', () => document.body.classList.toggle('nav-open'));
  }

  function extrasHTML(s) {
    let h = '';
    if (s.metrics) {
      h += `<div class="metrics">${s.metrics.map((m, i) => `<div class="metric ${m.tone || ''}" style="--i:${i}"><span>${m.label}</span><strong>${m.value}</strong></div>`).join('')}</div>`;
    }
    if (s.bars) {
      const b = s.bars, vals = b.items.map(x => x.value);
      const max = Math.max(...vals), min = Math.min(...vals);
      const width = v => {
        if (!b.log) return Math.max(2, v / max * 100);
        const lo = Math.log10(min), hi = Math.log10(max);
        return 8 + (Math.log10(v) - lo) / ((hi - lo) || 1) * 92;
      };
      h += `<div class="bars"><div class="bars-title">${b.title}</div>${b.items.map((it, i) => `
        <div class="bar-row" style="--i:${i}"><span class="bar-label">${it.label}</span>
          <div class="bar-track"><div class="bar-fill ${it.tone || ''}" style="--w:${width(it.value).toFixed(1)}%"></div></div>
          <span class="bar-val">${it.display || it.value}</span></div>`).join('')}</div>`;
    }
    if (s.math) h += `<div class="math">${s.math.map((l, i) => `<div class="math-line" style="--i:${i}">${l}</div>`).join('')}</div>`;
    if (s.table) {
      h += `<div class="table-wrap"><table><thead><tr>${s.table.head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map((r, i) => `<tr style="--i:${i}">${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (s.code) h += `<pre class="code"><code>${esc(s.code)}</code></pre>`;
    if (s.tip) h += `<div class="tip"><span>Rule of thumb</span><p>${s.tip}</p></div>`;
    return h;
  }

  function goStep(n) {
    const L = view.lesson, total = L.steps.length;
    n = Math.max(1, Math.min(total, n || 1));
    view.step = n;
    const s = L.steps[n - 1];
    view.diagram.setStep(s);
    $('#stage-caption').textContent = `Step ${n} · ${s.title}`;
    const sc = $('.stage .stage-scroll');
    if (sc && sc.scrollWidth > sc.clientWidth + 4) {
      sc.scrollTo({ left: view.diagram.focusFrac * sc.scrollWidth - sc.clientWidth / 2, behavior: reduced() ? 'auto' : 'smooth' });
    }

    const card = $('#step-card');
    card.innerHTML = `<div class="step-kicker">Step ${n} of ${total}</div><h2>${s.title}</h2><div class="step-body">${s.body}</div>${extrasHTML(s)}`;
    card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');

    $$('#steps-bar .seg').forEach((b, i) => { b.classList.toggle('done', i < n - 1); b.classList.toggle('current', i === n - 1); });
    $('#step-count').textContent = `${n} / ${total}`;
    $('#prev-btn').disabled = n === 1;
    const meta = BY[view.slug];
    const following = FLAT[meta.n];
    $('#next-btn').innerHTML = n < total ? 'Next →' : following ? `Next lesson: ${esc(following.title)} →` : 'Back to outline →';
    $('#next-btn').classList.toggle('finish', n === total);

    history.replaceState(null, '', `#/learn/${view.slug}/${n}`);
    progress.last = { slug: view.slug, step: n };
    if (n === total && !progress.done[view.slug]) {
      progress.done[view.slug] = true;
      celebrate();
    }
    save();
    updateSidebar();
  }

  function next() {
    if (!view.lesson) return;
    if (view.step < view.lesson.steps.length) return goStep(view.step + 1);
    const following = FLAT[BY[view.slug].n];
    location.hash = following ? `#/learn/${following.slug}/1` : '#/outline';
  }
  function prev() { if (view.lesson && view.step > 1) goStep(view.step - 1); }

  function celebrate() {
    if (reduced()) return;
    const host = $('.stage');
    if (!host) return;
    const burst = document.createElement('div');
    burst.className = 'burst';
    burst.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg;--c:var(--${['req', 'res', 'warn', 'violet'][i % 4]})"></i>`).join('') + '<span>Lesson complete</span>';
    host.appendChild(burst);
    setTimeout(() => burst.remove(), 1900);
  }

  window.addEventListener('hashchange', router);
  router();
})();
