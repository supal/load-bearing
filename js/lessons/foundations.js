/* Module 1: Foundations. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['request-journey'] = {
  minutes: 6,
  diagram: {
    nodes: [
      { id: 'browser', kind: 'client', label: 'Browser', sub: 'your laptop', x: 100, y: 250 },
      { id: 'dns', kind: 'dns', label: 'DNS resolver', sub: 'recursive', x: 270, y: 85 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', sub: 'public IP', x: 410, y: 250 },
      { id: 'app', kind: 'server', label: 'App server', sub: '10.0.1.12', x: 620, y: 250 },
      { id: 'cache', kind: 'cache', label: 'Cache', sub: 'in-memory', x: 800, y: 95 },
      { id: 'db', kind: 'db', label: 'Database', sub: 'primary', x: 800, y: 395 }
    ],
    edges: [['browser', 'dns'], ['browser', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db']]
  },
  steps: [
    {
      title: 'It starts with a name',
      focus: ['browser'],
      badges: { browser: 'shop.example.com/cart' },
      body: `<p>You click a link to <code>shop.example.com/cart</code>. Networks don't route by names, they route by IP addresses. So before anything else, the browser has to turn that name into a number.</p>
             <p>Watch the path in this lesson. Every hop costs some time, and every hop is somewhere things can go wrong.</p>`
    },
    {
      title: 'Ask DNS for the address',
      flows: [
        { from: 'browser', to: 'dns', label: 'A? shop.example.com', seq: 0 },
        { from: 'dns', to: 'browser', kind: 'res', label: '203.0.113.7', seq: 1 }
      ],
      badges: { dns: 'TTL 300 s' },
      body: `<p>The browser checks its own cache, then the operating system's, then asks a <strong>recursive resolver</strong>. If the resolver doesn't have the answer, it asks the root servers, then the <code>.com</code> servers, then <code>example.com</code>'s own nameservers.</p>
             <p>The answer comes with a <strong>TTL</strong>: for the next five minutes, anyone using this resolver gets the address without asking again.</p>`,
      metrics: [{ label: 'Cold lookup', value: '20–120 ms' }, { label: 'Cached lookup', value: '≈ 0 ms', tone: 'res' }],
      tip: 'A low TTL lets you change addresses quickly; a high TTL means fewer lookups. Most teams pick minutes, not seconds.'
    },
    {
      title: 'Open a connection',
      slot: 850,
      flows: [
        { from: 'browser', to: 'lb', label: 'SYN', seq: 0 },
        { from: 'lb', to: 'browser', kind: 'res', label: 'SYN-ACK', seq: 1 },
        { from: 'browser', to: 'lb', label: 'ACK · TLS hello', seq: 2 },
        { from: 'lb', to: 'browser', kind: 'res', label: 'TLS keys agreed', seq: 3 }
      ],
      body: `<p>TCP's three-way handshake costs one round trip. TLS 1.3 adds another before any HTTP is sent. On a link with a 50 ms round trip, that's about 100 ms of setup before the server has seen a single byte of your request.</p>
             <p>That's why browsers keep connections open and reuse them (keep-alive, HTTP/2 multiplexing). It's also why HTTP/3 over QUIC folds the transport and encryption handshakes into one.</p>`,
      metrics: [{ label: 'Round trip (RTT)', value: '50 ms' }, { label: 'Setup ≈ 2 × RTT', value: '100 ms', tone: 'warn' }]
    },
    {
      title: 'The load balancer picks a server',
      flows: [
        { from: 'browser', to: 'lb', label: 'GET /cart', seq: 0 },
        { from: 'lb', to: 'app', label: 'GET /cart', seq: 1 }
      ],
      badges: { lb: 'healthy: 3 of 3' },
      body: `<p>The address DNS returned belongs to a <strong>load balancer</strong>, not a single machine. The load balancer decrypts the TLS traffic, picks one healthy app server, and forwards the request over the private network.</p>
             <p>The browser never learns which server answered. That layer of indirection is what lets you add, remove and replace servers without anyone noticing.</p>`
    },
    {
      title: 'Try the cache first',
      flows: [
        { from: 'app', to: 'cache', label: 'GET cart:42', seq: 0 },
        { from: 'cache', to: 'app', kind: 'warn', label: 'miss', seq: 1 }
      ],
      badges: { cache: 'cart:42 → (none)' },
      body: `<p>The app needs this user's cart. It asks the cache first, because a lookup in memory takes well under a millisecond.</p>
             <p>This time the key isn't there. Maybe it expired, or maybe this is the user's first visit. A <strong>miss</strong> costs an extra hop, so a cache only pays off when most lookups hit.</p>`
    },
    {
      title: 'Fall back to the database',
      slot: 900,
      flows: [
        { from: 'app', to: 'db', label: 'SELECT … user = 42', seq: 0 },
        { from: 'db', to: 'app', kind: 'res', label: '3 rows', seq: 1 },
        { from: 'app', to: 'cache', label: 'SET cart:42 (60 s)', seq: 2 }
      ],
      badges: { cache: 'cart:42 → 3 items' },
      body: `<p>The database is the <strong>source of truth</strong>. It's durable and consistent, but slower: a query may read from disk, take locks, or wait behind other queries.</p>
             <p>The app writes the result back to the cache with an expiry, so the next request in the next minute takes the fast path.</p>`
    },
    {
      title: 'Send the response home',
      flows: [
        { from: 'app', to: 'lb', kind: 'res', label: '200 OK · 4 KB', seq: 0 },
        { from: 'lb', to: 'browser', kind: 'res', label: '200 OK', seq: 1 }
      ],
      body: `<p>The response retraces the path. In this example the whole trip took about 150 ms, and most of that was network setup, not your code.</p>
             <p>A second request over the same connection skips DNS, TCP and TLS entirely.</p>`,
      bars: {
        title: 'Where the time went (illustrative, ms)',
        items: [
          { label: 'DNS lookup', value: 20 },
          { label: 'TCP handshake', value: 50 },
          { label: 'TLS handshake', value: 50 },
          { label: 'Server work', value: 18, tone: 'res' },
          { label: 'Transfer', value: 12 }
        ]
      }
    },
    {
      title: 'Your map for the rest of the course',
      body: `<p>Every system design discussion is about some part of this path:</p>
             <ul>
               <li><strong>DNS</strong> turns names into addresses, and can also steer traffic during failover.</li>
               <li><strong>Connections</strong> cost round trips, which often dominate latency.</li>
               <li><strong>Load balancers</strong> put many servers behind one address.</li>
               <li><strong>Caches</strong> give popular reads a fast path.</li>
               <li><strong>Databases</strong> hold the truth and are usually the hardest part to scale.</li>
             </ul>
             <p>Each later lesson zooms into one of these boxes, or asks what happens when there are a thousand of them.</p>`
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['latency-throughput'] = {
  minutes: 6,
  diagram: {
    nodes: [
      { id: 'a', kind: 'client', label: 'Client A', x: 100, y: 100 },
      { id: 'b', kind: 'client', label: 'Client B', x: 100, y: 245 },
      { id: 'c', kind: 'phone', label: 'Client C', x: 100, y: 390 },
      { id: 'q', kind: 'queue', label: 'Request queue', sub: 'waiting room', w: 166, x: 355, y: 245 },
      { id: 'w', kind: 'server', label: 'Workers', sub: '10 threads', x: 590, y: 245 },
      { id: 'db', kind: 'db', label: 'Database', x: 805, y: 245 }
    ],
    edges: [['a', 'q'], ['b', 'q'], ['c', 'q'], ['q', 'w'], ['w', 'db']]
  },
  steps: [
    {
      title: 'Two different questions',
      slot: 700,
      flows: [
        { from: 'a', to: 'q', seq: 0 },
        { from: 'q', to: 'w', seq: 1 },
        { from: 'w', to: 'db', seq: 2 },
        { from: 'db', to: 'w', kind: 'res', seq: 3 },
        { from: 'w', to: 'q', kind: 'res', seq: 4 },
        { from: 'q', to: 'a', kind: 'res', seq: 5 }
      ],
      body: `<p><strong>Latency</strong> is how long one request takes from start to finish, as one user experiences it. <strong>Throughput</strong> is how many requests the system completes per second.</p>
             <p>The two are related, but they're not the same thing. A motorway can carry thousands of cars an hour (throughput) while each car still needs 30 minutes to cross the city (latency).</p>`,
      metrics: [{ label: 'Latency', value: '50 ms', tone: 'req' }, { label: 'Throughput', value: '200 req/s', tone: 'res' }]
    },
    {
      title: 'Concurrency connects them',
      flows: [
        { from: 'a', to: 'q', stream: 2, period: 1600 },
        { from: 'b', to: 'q', stream: 2, period: 1600, offset: 0.33 },
        { from: 'c', to: 'q', stream: 2, period: 1600, offset: 0.66 },
        { from: 'q', to: 'w', stream: 3, period: 1400 },
        { from: 'w', to: 'db', stream: 3, period: 1400, offset: 0.5 }
      ],
      badges: { w: '10 in flight' },
      body: `<p><strong>Little's Law</strong> holds for any stable system: the average number of requests inside it equals the arrival rate times the average time each one spends there.</p>
             <p>That turns capacity questions into arithmetic. If each request takes 50 ms and you want 200 per second, you need room for ten at once. Halve the latency and the same workers handle twice the throughput.</p>`,
      math: ['L = λ × W', 'in flight = throughput × latency', '200 req/s × 0.05 s = 10 requests in flight', '→ at least 10 workers (or connections) busy at once']
    },
    {
      title: 'When arrivals outpace the work',
      flows: [
        { from: 'a', to: 'q', stream: 3, period: 1100 },
        { from: 'b', to: 'q', stream: 3, period: 1100, offset: 0.2 },
        { from: 'c', to: 'q', stream: 3, period: 1100, offset: 0.45 },
        { from: 'q', to: 'w', stream: 2, period: 2200 }
      ],
      states: { q: 'hot', w: 'hot' },
      badges: { q: '38 waiting', w: '10 / 10 busy' },
      body: `<p>When requests arrive faster than the workers finish them, the extra ones wait in a queue. Throughput levels off at the system's capacity, but latency keeps climbing, because every new request waits behind everyone already in line.</p>
             <p>Users see a slow system rather than a broken one, until the queue overflows or timeouts start firing.</p>`
    },
    {
      title: 'Utilization has a knee',
      flows: [{ from: 'q', to: 'w', stream: 2, period: 1800 }],
      states: { w: 'hot' },
      body: `<p>Queueing theory gives a blunt rule: as a server gets close to 100% busy, waiting time grows without limit. Going from 50% to 90% busy multiplies the average wait by nine.</p>
             <p>That's why capacity plans leave headroom, often around 60–70% at peak, instead of trying to use every last CPU cycle.</p>`,
      bars: {
        title: 'Average wait vs utilization (M/M/1 queue, × service time)',
        items: [
          { label: '50% busy', value: 1, display: '1×' },
          { label: '70% busy', value: 2.3, display: '2.3×' },
          { label: '80% busy', value: 4, display: '4×' },
          { label: '90% busy', value: 9, display: '9×', tone: 'warn' },
          { label: '95% busy', value: 19, display: '19×', tone: 'warn' },
          { label: '99% busy', value: 99, display: '99×', tone: 'err' }
        ]
      }
    },
    {
      title: 'Averages hide the pain',
      flows: [
        { from: 'w', to: 'db', stream: 3, period: 1500 },
        { from: 'db', to: 'w', kind: 'res', stream: 2, period: 1500, offset: 0.4 },
        { from: 'db', to: 'w', kind: 'warn', label: 'slow', stream: 1, period: 3000, offset: 0.1 }
      ],
      body: `<p>Mean latency hides the requests that hurt. Percentiles don't. A p99 of 410 ms means 1 request in 100 took longer than that, and your heaviest users hit those requests the most.</p>
             <p>The tail matters even more when requests fan out. If a page calls 100 backends and each is slow 1% of the time, 1 − 0.99<sup>100</sup> ≈ <strong>63%</strong> of page loads hit at least one slow call.</p>`,
      bars: {
        title: 'Latency percentiles for one endpoint (illustrative, ms)',
        items: [
          { label: 'p50', value: 42 },
          { label: 'p90', value: 88 },
          { label: 'p99', value: 410, tone: 'warn' },
          { label: 'p99.9', value: 1350, tone: 'err' }
        ]
      }
    },
    {
      title: 'Levers you can pull',
      body: `<p>Most performance work trades one of these numbers against the other. Measure both, track percentiles rather than averages, and keep utilization below the knee.</p>`,
      table: {
        head: ['Technique', 'Throughput', 'Latency'],
        rows: [
          ['Add workers or servers', '↑', '→ until something downstream saturates'],
          ['Batching', '↑', '↑ each item waits for its batch'],
          ['Caching', '↑', '↓'],
          ['Parallel fan-out', '→', '↓ median, but more exposure to the tail'],
          ['Shedding excess load', '→', '↓ for the requests you keep']
        ]
      }
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['napkin-math'] = {
  minutes: 7,
  diagram: {
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', sub: '10M daily', x: 100, y: 240 },
      { id: 'api', kind: 'server', label: 'API servers', x: 385, y: 115 },
      { id: 'meta', kind: 'db', label: 'Metadata DB', x: 700, y: 115 },
      { id: 'blob', kind: 'blob', label: 'Object storage', sub: 'photos', w: 166, x: 700, y: 375 },
      { id: 'cdn', kind: 'edge', label: 'CDN', sub: 'edge caches', x: 385, y: 375 }
    ],
    edges: [['users', 'api'], ['api', 'meta'], ['api', 'blob'], ['users', 'cdn'], ['cdn', 'blob']]
  },
  steps: [
    {
      title: 'Estimate before you build',
      hide: ['cdn'],
      body: `<p>Before drawing any boxes, work out how big the problem is. A design that's right for 100 requests a second is wrong for 100,000, and building for 100,000 when you only need 100 is expensive.</p>
             <p>Napkin math means getting within about 10× of the answer in a few minutes, using round numbers and writing your assumptions down.</p>`,
      tip: 'Aim for the right order of magnitude, not the right digit.'
    },
    {
      title: 'Know the ladder',
      hide: ['cdn'],
      body: `<p>The exact numbers change with hardware, but the ratios between them change slowly. Reading memory is about 1,000× faster than a network round trip, and a round trip across a continent is about 100× slower than one inside a datacenter.</p>
             <p>Those gaps are the reason caches, CDNs and keeping data close to where it's used all exist.</p>`,
      bars: {
        title: 'Rough latency of common operations (log scale)',
        log: true,
        items: [
          { label: 'Memory reference', value: 0.0001, display: '100 ns' },
          { label: 'Read 1 MB from memory', value: 0.05, display: '50 µs' },
          { label: 'SSD random read', value: 0.1, display: '100 µs' },
          { label: 'Round trip in a datacenter', value: 0.5, display: '500 µs' },
          { label: 'Read 1 MB from SSD', value: 1, display: '1 ms' },
          { label: 'Hard-disk seek', value: 10, display: '10 ms', tone: 'warn' },
          { label: 'Round trip across a continent', value: 70, display: '70 ms', tone: 'warn' },
          { label: 'Round trip, Europe ↔ Australia', value: 250, display: '250 ms', tone: 'err' }
        ]
      }
    },
    {
      title: 'Shortcuts worth memorizing',
      hide: ['cdn'],
      body: `<p>A handful of conversions cover most interview questions and design reviews. Rounding a day to 10<sup>5</sup> seconds is off by about 15%, which is close enough.</p>`,
      math: [
        '1 day = 86,400 s ≈ 10⁵ s',
        '1 million per day ≈ 12 per second',
        '1 billion per day ≈ 12,000 per second',
        '2¹⁰ ≈ 10³ → KB → MB → GB → TB → PB',
        'peak ≈ 2–3 × average',
        '1 Gbit/s ≈ 125 MB/s'
      ]
    },
    {
      title: 'Example: a photo app, traffic',
      hide: ['cdn'],
      flows: [
        { from: 'users', to: 'api', stream: 4, period: 1500 },
        { from: 'api', to: 'meta', stream: 3, period: 1500, offset: 0.5 }
      ],
      body: `<p>Take a photo-sharing app with 10 million daily users. Each one views about 50 photos and uploads one every five days.</p>
             <p>Reads outnumber writes by about 250 to 1, so the design should be built around making reads cheap.</p>`,
      math: [
        'Reads: 10M × 50 = 500M / day ≈ 5,800 / s',
        'Peak (× 3) ≈ 17,000 reads / s',
        'Writes: 10M × 0.2 = 2M / day ≈ 23 / s',
        'Read : write ≈ 250 : 1'
      ]
    },
    {
      title: 'Storage',
      hide: ['cdn'],
      slot: 900,
      flows: [
        { from: 'users', to: 'api', label: 'upload', seq: 0 },
        { from: 'api', to: 'blob', label: '500 KB', seq: 1 },
        { from: 'api', to: 'meta', label: '1 KB row', seq: 1 }
      ],
      badges: { blob: '+1 TB / day' },
      body: `<p>Photos go to object storage, and a small metadata row goes to the database. The two grow at very different rates.</p>
             <p>Petabytes of photos rule out any single machine. Gigabytes of metadata fit comfortably in one well-run database for years.</p>`,
      math: [
        '2M uploads × 500 KB ≈ 1 TB / day',
        '× 365 ≈ 365 TB / year',
        '× 3 replicas ≈ 1.1 PB / year',
        'Metadata: 2M × 1 KB ≈ 2 GB / day'
      ]
    },
    {
      title: "Bandwidth, and why there's a CDN",
      flows: [
        { from: 'cdn', to: 'users', kind: 'res', stream: 4, period: 1400 },
        { from: 'blob', to: 'cdn', kind: 'res', stream: 1, period: 2800 }
      ],
      badges: { cdn: '≈ 27 Gbit/s peak' },
      body: `<p>At peak, 17,000 views a second at 200 KB each is about 27 Gbit/s leaving your servers, all day, every day. That number is what forces the next design decision.</p>
             <p>Serving images from a CDN means the origin only handles cache misses, which are a small fraction of the traffic.</p>`,
      math: [
        '17,000 views/s × 200 KB ≈ 3.4 GB/s',
        '3.4 GB/s × 8 ≈ 27 Gbit/s at peak',
        '→ serve images from the edge'
      ]
    },
    {
      title: 'Sanity-check and move on',
      body: `<ul>
               <li><strong>Write down every assumption</strong> so others can challenge the inputs, not just the result.</li>
               <li><strong>Round aggressively.</strong> 86,400 becomes 10<sup>5</sup>, and 3.4 becomes 3.</li>
               <li><strong>Find the number that drives the design.</strong> Here it's read bandwidth, not write rate or metadata size.</li>
               <li><strong>Compare against something you know.</strong> If your estimate says one server, check whether that's plausible.</li>
             </ul>`
    }
  ]
};
