/* Module 5: Reliability. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['failover'] = {
  minutes: 8,
  diagram: {
    h: 480,
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', x: 90, y: 245, w: 130 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', x: 310, y: 245 },
      { id: 'a1', kind: 'server', label: 'App', sub: 'zone A', x: 560, y: 95 },
      { id: 'a2', kind: 'server', label: 'App', sub: 'zone B', x: 560, y: 395 },
      { id: 'p', kind: 'db', label: 'Primary', sub: 'zone A', w: 140, x: 800, y: 95 },
      { id: 's', kind: 'db', label: 'Standby', sub: 'zone B', w: 140, x: 800, y: 395 }
    ],
    edges: [['users', 'lb'], ['lb', 'a1'], ['lb', 'a2'], ['a1', 'p'], ['a2', 'p'], ['p', 's'], ['a2', 's'], ['a1', 's']]
  },
  steps: [
    {
      title: 'Find the single points of failure',
      hide: ['a2', 's'],
      badges: { lb: 'SPOF', a1: 'SPOF', p: 'SPOF' },
      states: { lb: 'hot', a1: 'hot', p: 'hot' },
      flows: [
        { from: 'users', to: 'lb', seq: 0 }, { from: 'lb', to: 'a1', seq: 1 }, { from: 'a1', to: 'p', seq: 2 }
      ],
      body: `<p>A request passes through several components in a chain, and <em>all</em> of them must work. Availabilities multiply, so a chain is less available than its weakest link.</p>
             <p>A <strong>single point of failure</strong> (SPOF) is any component whose loss takes the whole service down. The first job of reliability work is listing them.</p>`,
      math: ['three parts, each 99.9% available', '0.999 × 0.999 × 0.999 ≈ 0.997', '→ about 26 hours of downtime a year']
    },
    {
      title: 'Add redundancy',
      hide: ['a2-s', 'a1-s'],
      focus: ['a2', 's'],
      body: `<p>Run two of each in separate failure domains, such as availability zones with separate power and networking. The service now fails only if <em>both</em> copies fail at once.</p>`,
      math: ['two copies, each 99.9%', '1 − (0.001 × 0.001) = 0.999999', '(if failures are independent, which is the hard part)'],
      table: {
        head: ['Availability', 'Downtime per year', 'Per month'],
        rows: [['99%', '3.65 days', '7.3 hours'], ['99.9%', '8.8 hours', '44 minutes'], ['99.99%', '53 minutes', '4.4 minutes'], ['99.999%', '5.3 minutes', '26 seconds']]
      }
    },
    {
      title: 'Active-active app servers',
      hide: ['a2-s', 'a1-s'],
      states: { a1: 'down' },
      badges: { a1: 'zone A outage' },
      flows: [
        { from: 'users', to: 'lb', stream: 3, period: 1400 },
        { from: 'lb', to: 'a2', stream: 3, period: 1400, offset: 0.4 },
        { from: 'a2', to: 'p', stream: 2, period: 1400, offset: 0.7 }
      ],
      body: `<p>Stateless app servers in both zones serve traffic all the time. When zone A fails, health checks remove it and zone B takes everything. Failover takes seconds and needs no special procedure.</p>
             <p>That only works if zone B can carry the full load alone. Running each zone at 40% leaves room; running each at 70% means the survivor is overloaded.</p>`
    },
    {
      title: 'Database failover',
      hide: ['a2-p', 'a1-p'],
      states: { p: 'down', s: 'ok' },
      badges: { p: 'unreachable', s: 'promoted' },
      slot: 900,
      flows: [
        { from: 'p', to: 's', kind: 'err', label: 'heartbeats stop', seq: 0 },
        { from: 'a1', to: 's', label: 'reconnect', seq: 1 },
        { from: 'a2', to: 's', label: 'reconnect', seq: 1 }
      ],
      body: `<p>Databases are usually <strong>active-passive</strong>: one primary takes writes and a standby replicates it. When the primary fails, the standby is promoted and clients are redirected through a DNS name or virtual IP.</p>
             <p>Two numbers describe it. <strong>RTO</strong> (recovery time objective) is how long you're down. <strong>RPO</strong> (recovery point objective) is how much recent data you can lose. Synchronous replication gives an RPO of zero at the cost of write latency.</p>`,
      metrics: [{ label: 'Detect', value: '≈ 10 s' }, { label: 'Promote + redirect', value: '≈ 20 s' }, { label: 'RTO', value: '≈ 30 s', tone: 'warn' }]
    },
    {
      title: 'Split brain and fencing',
      hide: ['a2-p'],
      states: { p: 'hot', s: 'ok' },
      badges: { p: 'back · thinks it is primary', s: 'primary · epoch 8' },
      slot: 900,
      flows: [
        { from: 'a1', to: 'p', kind: 'err', label: 'write (epoch 7)', seq: 0 },
        { from: 'a1', to: 's', label: 'write (epoch 8)', seq: 1 }
      ],
      body: `<p>What if the old primary wasn't dead, just cut off, and comes back? Two primaries accepting writes is <strong>split brain</strong>, and it corrupts data in ways that are painful to untangle.</p>
             <p>Defenses: decide with a <strong>quorum</strong> (a third witness in another zone), <strong>fence</strong> the old primary (revoke its storage access or power it off), and stamp every write with an increasing epoch so stale primaries are rejected.</p>`
    },
    {
      title: 'Practice failing',
      hide: ['a2-p', 'a1-s'],
      states: { s: 'ok' },
      badges: { a1: 'drill: kill zone A', s: 'primary' },
      flows: [
        { from: 'users', to: 'lb', stream: 2, period: 1500 },
        { from: 'lb', to: 'a1', stream: 1, period: 1500, offset: 0.3 },
        { from: 'lb', to: 'a2', stream: 1, period: 1500, offset: 0.8 },
        { from: 'a2', to: 's', stream: 1, period: 1500 }
      ],
      body: `<p>Failover paths that never run tend not to work when you need them. Schedule drills, often called game days: kill a zone in staging or even production, time the recovery, and fix what broke.</p>
             <p>Watch for <strong>correlated failures</strong> that defeat redundancy: one bad config pushed everywhere, one shared dependency, one expired certificate.</p>`,
      tip: 'Redundancy you haven’t tested is a guess. Measure real failover time, and plan capacity so the survivors can carry the load.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['rate-limits'] = {
  minutes: 7,
  diagram: {
    h: 500,
    nodes: [
      { id: 'c', kind: 'client', label: 'Client', sub: 'key: k_live_7', x: 110, y: 100, w: 160 },
      { id: 'bot', kind: 'users', label: 'Scraper', sub: '1 IP · 900 req/s', x: 110, y: 390, w: 170 },
      { id: 'gw', kind: 'lb', label: 'Gateway', sub: 'rate limiter', x: 420, y: 245 },
      { id: 'store', kind: 'kv', label: 'Counters', sub: 'shared', x: 420, y: 430 },
      { id: 'api', kind: 'server', label: 'API', x: 780, y: 245 }
    ],
    edges: [['c', 'gw'], ['bot', 'gw'], ['gw', 'api'], ['gw', 'store']]
  },
  steps: [
    {
      title: 'Why limit?',
      hide: ['store'],
      states: { api: 'hot' },
      badges: { api: 'CPU 98% · everyone slow' },
      flows: [
        { from: 'bot', to: 'gw', kind: 'warn', stream: 6, period: 1000 },
        { from: 'gw', to: 'api', stream: 6, period: 1000, offset: 0.5 },
        { from: 'c', to: 'gw', stream: 1, period: 2000 }
      ],
      body: `<p>One client sending too much, whether a buggy retry loop, a scraper or an attacker, can exhaust capacity that everyone shares.</p>
             <p>Rate limits protect the service, keep things fair between customers, cap cost, and slow down abuse like password guessing.</p>`
    },
    {
      title: 'Fixed window',
      hide: ['store'],
      slot: 750,
      badges: { gw: '100 per minute' },
      flows: [
        { from: 'bot', to: 'gw', stream: 4, period: 1000 },
        { from: 'gw', to: 'bot', kind: 'err', label: '429', stream: 2, period: 1000, offset: 0.5 },
        { from: 'gw', to: 'api', stream: 1, period: 2000 }
      ],
      body: `<p>Count requests per client per calendar minute and reject once the count passes the limit. One counter per client, reset every minute: cheap and easy.</p>
             <p>The flaw is at the edges: 100 requests at 12:00:59 and another 100 at 12:01:00 are 200 in two seconds, and both windows say OK.</p>`
    },
    {
      title: 'Sliding window',
      hide: ['store'],
      badges: { gw: 'weighted: prev + current' },
      flows: [
        { from: 'c', to: 'gw', seq: 0 }, { from: 'gw', to: 'api', seq: 1 }
      ],
      body: `<p>A sliding window looks at the last 60 seconds from <em>now</em>. Keeping every timestamp is exact but memory-hungry. The common approximation blends the previous window's count with the current one.</p>`,
      math: [
        '15 s into the current minute; previous minute had 80, current has 30',
        'estimate = 80 × (45 / 60) + 30 = 90',
        '90 < 100 → allow'
      ]
    },
    {
      title: 'Token bucket',
      hide: ['store'],
      slot: 650,
      badges: { gw: 'bucket 7 / 10 · +1 per second' },
      flows: [
        { from: 'c', to: 'gw', seq: 0 }, { from: 'gw', to: 'api', seq: 1 },
        { from: 'c', to: 'gw', seq: 2 }, { from: 'gw', to: 'api', seq: 3 },
        { from: 'c', to: 'gw', seq: 4 }, { from: 'gw', to: 'c', kind: 'err', label: 'empty → 429', seq: 5 }
      ],
      body: `<p>Each client has a bucket of tokens that refills at a steady rate up to a maximum. Each request takes one token; with none left, it's rejected.</p>
             <p>This allows short bursts (up to the bucket size) while enforcing an average rate, which matches how real clients behave. Only two numbers are stored per client.</p>`,
      code: `function allow(b, now) {
  b.tokens = Math.min(b.capacity, b.tokens + (now - b.last) * b.rate);
  b.last = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}`
    },
    {
      title: 'Limits across many gateways',
      slot: 750,
      flows: [
        { from: 'c', to: 'gw', seq: 0 },
        { from: 'gw', to: 'store', label: 'INCR k_live_7', seq: 1 },
        { from: 'store', to: 'gw', kind: 'res', label: '57', seq: 2 },
        { from: 'gw', to: 'api', seq: 3 }
      ],
      body: `<p>With ten gateway instances, local counters would allow ten times the limit. Keep counters in a shared fast store and update them atomically, in one round trip.</p>
             <p>Decide what happens when the counter store is down. Failing <strong>open</strong> (allow everything) keeps the API up; failing <strong>closed</strong> protects the backend. Many systems fall back to approximate local limits.</p>`
    },
    {
      title: 'Reject politely',
      hide: ['store'],
      slot: 900,
      flows: [
        { from: 'bot', to: 'gw', seq: 0 },
        { from: 'gw', to: 'bot', kind: 'err', label: '429 · retry in 12 s', seq: 1 }
      ],
      body: `<p>Tell clients what happened and when to come back, so well-behaved ones slow down instead of hammering harder. Limit by the most meaningful identity you have: API key or user first, IP address as a fallback.</p>`,
      code: `HTTP/1.1 429 Too Many Requests
Retry-After: 12
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 12`,
      tip: 'Apply coarse limits at the edge (per IP, to stop floods) and fine-grained ones per customer and per expensive endpoint.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['retries'] = {
  minutes: 8,
  diagram: {
    h: 480,
    nodes: [
      { id: 'co', kind: 'server', label: 'Checkout', x: 120, y: 200, w: 150 },
      { id: 'pay', kind: 'server', label: 'Payments', x: 470, y: 200 },
      { id: 'bank', kind: 'edge', label: 'Card network', w: 170, x: 790, y: 200 },
      { id: 'idem', kind: 'kv', label: 'Idempotency', sub: 'key → result', x: 470, y: 400 }
    ],
    edges: [['co', 'pay'], ['pay', 'bank'], ['pay', 'idem']]
  },
  steps: [
    {
      title: 'Slow is worse than down',
      hide: ['idem'],
      states: { pay: 'hot', co: 'hot' },
      badges: { pay: 'p99: 30 s', co: 'threads 200 / 200 waiting' },
      flows: [{ from: 'co', to: 'pay', stream: 5, period: 3000 }],
      body: `<p>A service that's down fails fast and you can react. A service that's <em>slow</em> holds on to your threads, connections and memory while you wait. Soon the caller is out of resources and fails too, and the failure spreads up the chain.</p>`
    },
    {
      title: 'Always set a timeout',
      hide: ['idem'],
      slot: 900,
      badges: { co: 'timeout 800 ms' },
      flows: [
        { from: 'co', to: 'pay', seq: 0 },
        { from: 'pay', to: 'co', kind: 'err', label: 'gave up at 800 ms', seq: 1 }
      ],
      body: `<p>Every network call needs a timeout. Base it on the dependency's normal p99 latency plus some headroom, and keep it under what your own caller is willing to wait.</p>
             <p>Better still, pass a <strong>deadline</strong> along with the request, so services deep in the chain don't keep working on a request whose caller has already given up.</p>`
    },
    {
      title: 'Did it happen or not?',
      hide: ['idem'],
      slot: 700,
      badges: { bank: 'charged twice' },
      states: { bank: 'hot' },
      flows: [
        { from: 'co', to: 'pay', label: 'charge $40', seq: 0 },
        { from: 'pay', to: 'bank', seq: 1 },
        { from: 'bank', to: 'pay', kind: 'res', label: 'ok', seq: 2 },
        { from: 'pay', to: 'co', kind: 'err', label: 'reply lost', seq: 3 },
        { from: 'co', to: 'pay', kind: 'warn', label: 'retry $40', seq: 4 },
        { from: 'pay', to: 'bank', kind: 'warn', seq: 5 }
      ],
      body: `<p>A timeout doesn't tell you whether the work happened. The request may have failed, or succeeded with the reply lost on the way back.</p>
             <p>Retrying reads is harmless. Retrying a payment blindly can charge the customer twice.</p>`
    },
    {
      title: 'Idempotency keys',
      slot: 750,
      flows: [
        { from: 'co', to: 'pay', label: 'retry · key 7f3a', seq: 0 },
        { from: 'pay', to: 'idem', label: 'seen 7f3a?', seq: 1 },
        { from: 'idem', to: 'pay', kind: 'res', label: 'yes · receipt 991', seq: 2 },
        { from: 'pay', to: 'co', kind: 'res', label: 'receipt 991', seq: 3 }
      ],
      body: `<p>The client generates a unique key per logical operation and sends it with every attempt. The server stores the key with the result. A repeat with the same key returns the saved result instead of doing the work again.</p>
             <p>Now retries are always safe, which is what lets everything else in this lesson work.</p>`,
      code: `POST /charges
Idempotency-Key: 7f3a9c1e-…
{ "amount": 4000, "currency": "usd" }`
    },
    {
      title: 'Back off, with jitter',
      hide: ['idem'],
      states: { pay: 'hot' },
      badges: { pay: 'recovering' },
      flows: [{ from: 'co', to: 'pay', kind: 'warn', stream: 2, period: 2200 }],
      body: `<p>Retrying immediately, and in lockstep with every other client, turns a brief blip into a <strong>retry storm</strong> that keeps the struggling service down. Wait longer after each failure, and randomise the wait so clients spread out.</p>`,
      math: ['delay = random(0, min(cap, base × 2^attempt))', 'base 100 ms, cap 10 s', 'attempt 1: 0–200 ms · 2: 0–400 ms · 3: 0–800 ms …'],
      bars: {
        title: 'Maximum wait before each retry',
        items: [
          { label: 'Retry 1', value: 200, display: '200 ms' },
          { label: 'Retry 2', value: 400, display: '400 ms' },
          { label: 'Retry 3', value: 800, display: '800 ms' },
          { label: 'Retry 4', value: 1600, display: '1.6 s', tone: 'warn' },
          { label: 'Retry 5', value: 3200, display: '3.2 s', tone: 'warn' }
        ]
      }
    },
    {
      title: 'Circuit breakers',
      hide: ['idem'],
      states: { pay: 'down' },
      badges: { co: 'breaker OPEN · fail fast' },
      body: `<p>When most calls to a dependency are failing, stop calling it for a while. The breaker <strong>opens</strong> and fails requests immediately, perhaps with a fallback like "payment pending". That frees your resources and gives the dependency room to recover.</p>
             <p>After a cool-down it goes <strong>half-open</strong> and lets a few trial requests through. If they succeed it closes; if not, it opens again.</p>`,
      table: {
        head: ['State', 'Behaviour', 'Moves when'],
        rows: [
          ['Closed', 'Calls pass through', 'Error rate passes a threshold → open'],
          ['Open', 'Calls fail at once', 'Cool-down ends → half-open'],
          ['Half-open', 'A few trial calls', 'Trials succeed → closed; fail → open']
        ]
      }
    },
    {
      title: 'Putting it together',
      slot: 800,
      flows: [
        { from: 'co', to: 'pay', label: 'key + deadline', seq: 0 },
        { from: 'pay', to: 'idem', seq: 1 },
        { from: 'pay', to: 'bank', seq: 2 },
        { from: 'bank', to: 'pay', kind: 'res', seq: 3 },
        { from: 'pay', to: 'co', kind: 'res', seq: 4 }
      ],
      body: `<ul>
               <li>A timeout on every call, within an overall deadline.</li>
               <li>Retry only transient errors (timeouts, 503s), never 400s.</li>
               <li>Retry at one layer, not every layer: three layers retrying three times is 27 attempts.</li>
               <li>Exponential backoff with jitter, and a retry budget, such as "retries may add at most 10% to traffic".</li>
               <li>Idempotency keys on anything that changes state.</li>
               <li>Circuit breakers around each dependency.</li>
             </ul>`,
      tip: 'Every retry adds load to something that may already be failing. Retries should help a service recover, not stop it from recovering.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['observability'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'user', kind: 'client', label: 'User', x: 90, y: 200, w: 120 },
      { id: 'gw', kind: 'lb', label: 'Gateway', x: 300, y: 200, w: 140 },
      { id: 'ord', kind: 'server', label: 'Orders', x: 530, y: 80, w: 140 },
      { id: 'inv', kind: 'server', label: 'Inventory', x: 530, y: 320, w: 150 },
      { id: 'db', kind: 'db', label: 'Inventory DB', x: 790, y: 320, w: 170 },
      { id: 'tel', kind: 'chart', label: 'Telemetry', sub: 'metrics · logs · traces', w: 210, x: 300, y: 420 }
    ],
    edges: [['user', 'gw'], ['gw', 'ord'], ['ord', 'inv'], ['inv', 'db'], ['gw', 'tel'], ['inv', 'tel'], { a: 'ord', b: 'tel', curve: -60 }]
  },
  steps: [
    {
      title: '"Checkout is slow"',
      hide: ['tel'],
      states: { user: 'hot' },
      badges: { user: 'spinner for 4 s' },
      flows: [
        { from: 'user', to: 'gw', seq: 0 }, { from: 'gw', to: 'ord', seq: 1 },
        { from: 'ord', to: 'inv', seq: 2 }, { from: 'inv', to: 'db', seq: 3 }
      ],
      body: `<p>A request crosses four components before it returns. When it's slow, which one is to blame? Guessing and adding print statements doesn't work across dozens of services.</p>
             <p><strong>Observability</strong> means the system emits enough telemetry that you can answer new questions about its behaviour without shipping new code.</p>`
    },
    {
      title: 'Metrics: how much and how fast',
      badges: { gw: 'p99 4.1 s ↑', ord: 'errors 0.2%', inv: 'p99 3.8 s ↑' },
      flows: [
        { from: 'gw', to: 'tel', stream: 2, period: 1600 },
        { from: 'ord', to: 'tel', stream: 2, period: 1600, offset: 0.33 },
        { from: 'inv', to: 'tel', stream: 2, period: 1600, offset: 0.66 }
      ],
      body: `<p>Metrics are numbers aggregated over time: request rate, error rate, latency percentiles, CPU, queue depth. They're cheap to store and quick to query, so they drive dashboards and alerts.</p>
             <p>For every service, track <strong>Rate, Errors and Duration</strong>; for every resource, <strong>Utilization, Saturation and Errors</strong>. Metrics tell you <em>that</em> inventory got slow, not <em>why</em>.</p>`,
      code: `http_requests_total{service="inventory", route="/reserve", status="200"}  1849213
http_request_duration_seconds{service="inventory", quantile="0.99"}  3.8`
    },
    {
      title: 'Logs: what exactly happened',
      focus: ['inv', 'tel'],
      badges: { inv: 'ERROR lock wait timeout' },
      flows: [{ from: 'inv', to: 'tel', kind: 'warn', stream: 3, period: 1400 }],
      body: `<p>Logs are timestamped records of individual events, full of detail. Write them as structured data rather than prose, so you can filter by any field.</p>
             <p>They're the most expensive signal at volume. Sample noisy debug logs, and keep errors in full.</p>`,
      code: `{"ts":"2026-03-14T09:26:53.120Z","level":"error","service":"inventory",
 "msg":"lock wait timeout","sku":"mug-blue","waited_ms":3500,
 "trace_id":"4bf92f3577b34da6"}`
    },
    {
      title: 'Traces: where the time went',
      slot: 700,
      badges: { gw: '4.1 s', ord: '4.0 s', inv: '3.8 s', db: '3.7 s ← here' },
      states: { db: 'hot' },
      flows: [
        { from: 'user', to: 'gw', label: 'trace 4bf9…', seq: 0 }, { from: 'gw', to: 'ord', seq: 1 },
        { from: 'ord', to: 'inv', seq: 2 }, { from: 'inv', to: 'db', seq: 3 },
        { from: 'db', to: 'inv', kind: 'res', seq: 4 }, { from: 'inv', to: 'ord', kind: 'res', seq: 5 },
        { from: 'ord', to: 'gw', kind: 'res', seq: 6 }, { from: 'gw', to: 'user', kind: 'res', seq: 7 }
      ],
      body: `<p>A trace follows one request through every service. The first service creates a trace ID and passes it along in a header. Each service records a <strong>span</strong> with its start and duration.</p>
             <p>Laid out as a waterfall, the culprit is obvious: almost all of the 4.1 seconds is one database call.</p>`,
      bars: {
        title: 'Span durations for trace 4bf9…',
        items: [
          { label: 'gateway', value: 4100, display: '4.1 s' },
          { label: 'orders', value: 4000, display: '4.0 s' },
          { label: 'inventory', value: 3800, display: '3.8 s' },
          { label: 'db: SELECT … FOR UPDATE', value: 3700, display: '3.7 s', tone: 'err' },
          { label: 'orders: own work', value: 150, display: '0.15 s', tone: 'res' }
        ]
      }
    },
    {
      title: 'Connect the three',
      flows: [
        { from: 'gw', to: 'tel', stream: 1, period: 1800 },
        { from: 'ord', to: 'tel', stream: 1, period: 1800, offset: 0.33 },
        { from: 'inv', to: 'tel', stream: 1, period: 1800, offset: 0.66 }
      ],
      badges: { tel: 'trace_id joins them' },
      body: `<p>The usual investigation path: an <strong>alert</strong> fires on a metric → the dashboard shows which service → an example <strong>trace</strong> shows which call → the <strong>logs</strong> for that trace ID show the exact error.</p>
             <p>That only works if all three share identifiers. Put the trace ID in every log line, and use one standard instrumentation library across services, such as OpenTelemetry.</p>`
    },
    {
      title: 'SLOs: alert on what users feel',
      focus: ['user', 'gw'],
      badges: { gw: 'SLO: 99.9% < 1 s' },
      body: `<p>A <strong>service level objective</strong> sets a target for a user-visible behaviour, such as "99.9% of checkouts finish in under one second over 30 days". The remaining 0.1% is your <strong>error budget</strong>.</p>
             <p>Page someone when the budget is burning fast, not every time a CPU spikes. Spend the remaining budget on risky releases; when it's gone, slow down and fix reliability.</p>`,
      math: ['30 days × 24 h × 60 min = 43,200 min', 'budget = 0.1% × 43,200 ≈ 43 min of failure per month', 'burning 14× faster than normal → page now'],
      tip: 'Alert on symptoms users notice (errors, latency). Use cause metrics like CPU and disk to diagnose, not to wake people up.'
    }
  ]
};
