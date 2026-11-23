/* Module 2: Scaling Out. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['scale-up-out'] = {
  minutes: 6,
  diagram: {
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', x: 100, y: 240 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', x: 330, y: 240 },
      { id: 's1', kind: 'server', label: 'Server 1', sub: '4 vCPU · 16 GB', x: 570, y: 240 },
      { id: 's2', kind: 'server', label: 'Server 2', sub: '4 vCPU · 16 GB', x: 570, y: 100 },
      { id: 's3', kind: 'server', label: 'Server 3', sub: '4 vCPU · 16 GB', x: 570, y: 380 },
      { id: 'db', kind: 'db', label: 'Database', x: 805, y: 240 }
    ],
    edges: [['users', 's1'], ['users', 'lb'], ['lb', 's1'], ['lb', 's2'], ['lb', 's3'], ['s1', 'db'], ['s2', 'db'], ['s3', 'db']]
  },
  steps: [
    {
      title: 'One box does everything',
      hide: ['lb', 's2', 's3'],
      slot: 800,
      flows: [
        { from: 'users', to: 's1', seq: 0 },
        { from: 's1', to: 'db', seq: 1 },
        { from: 'db', to: 's1', kind: 'res', seq: 2 },
        { from: 's1', to: 'users', kind: 'res', seq: 3 }
      ],
      body: `<p>Most systems start like this: one app server and one database. It's easy to deploy, debug and reason about.</p>
             <p>As traffic grows, CPU usage climbs, and there are two basic ways to add capacity.</p>`,
      metrics: [{ label: 'CPU at peak', value: '78%', tone: 'warn' }, { label: 'Capacity', value: '~2,000 req/s' }]
    },
    {
      title: 'Scale up: buy a bigger box',
      hide: ['lb', 's2', 's3'],
      scale: { s1: 1.3 },
      badges: { s1: '64 vCPU · 512 GB' },
      flows: [
        { from: 'users', to: 's1', stream: 4, period: 1500 },
        { from: 's1', to: 'db', stream: 2, period: 1500, offset: 0.5 }
      ],
      body: `<p><strong>Vertical scaling</strong> replaces the machine with a bigger one. There are no code changes and no new ways to fail, and transactions stay on one machine.</p>
             <p>For many products this is the right first move. Today's largest servers have hundreds of cores and terabytes of memory.</p>`,
      metrics: [{ label: 'CPU at peak', value: '22%', tone: 'res' }, { label: 'Code changes', value: 'none' }]
    },
    {
      title: 'The ceiling',
      hide: ['lb', 's2', 's3'],
      scale: { s1: 1.3 },
      states: { s1: 'down' },
      badges: { s1: 'rebooting for a patch' },
      flows: [{ from: 'users', to: 's1', kind: 'err', label: 'timeout', stream: 3, period: 1600 }],
      body: `<p>Scaling up has three limits. At the high end, price grows faster than capacity. There's a biggest machine you can buy. And one box is one <strong>failure domain</strong>.</p>
             <p>A kernel patch, a failed disk or a bad deploy, and every user is offline at once.</p>`
    },
    {
      title: 'Scale out: add more boxes',
      hide: ['users-s1'],
      flows: [
        { from: 'users', to: 'lb', stream: 3, period: 1500 },
        { from: 'lb', to: 's1', stream: 1, period: 1500, offset: 0.1 },
        { from: 'lb', to: 's2', stream: 1, period: 1500, offset: 0.43 },
        { from: 'lb', to: 's3', stream: 1, period: 1500, offset: 0.76 }
      ],
      body: `<p><strong>Horizontal scaling</strong> runs several ordinary servers behind a load balancer. Need more capacity? Add another server.</p>
             <p>Capacity grows in small steps on standard hardware, and it can shrink again at night when traffic drops.</p>`
    },
    {
      title: 'The bill comes due',
      hide: ['users-s1'],
      flows: [
        { from: 's1', to: 'db', stream: 2, period: 1400 },
        { from: 's2', to: 'db', stream: 2, period: 1400, offset: 0.3 },
        { from: 's3', to: 'db', stream: 2, period: 1400, offset: 0.6 }
      ],
      states: { db: 'hot' },
      badges: { db: '3× connections' },
      body: `<p>Scaling out has costs. Servers have to be interchangeable, so nothing can be stored on one machine's disk or in its memory. You need a load balancer and deploy tooling. And the shared database now takes the load from every server.</p>
             <p>Scaling the app tier moves the bottleneck down to the data tier. That's what the Data module is about.</p>`
    },
    {
      title: 'Failure becomes routine',
      hide: ['users-s1'],
      states: { s2: 'down' },
      badges: { s2: 'out of rotation' },
      flows: [
        { from: 'users', to: 'lb', stream: 3, period: 1500 },
        { from: 'lb', to: 's1', stream: 2, period: 1500 },
        { from: 'lb', to: 's3', stream: 2, period: 1500, offset: 0.5 }
      ],
      body: `<p>With three servers, losing one costs a third of your capacity, not the whole service. The usual path is to scale up until cost or risk starts to hurt, while running at least two instances early on for availability.</p>`,
      table: {
        head: ['', 'Scale up', 'Scale out'],
        rows: [
          ['Effort to start', 'Low', 'Medium to high'],
          ['Upper limit', 'Largest machine', 'Very high'],
          ['One failure takes down', 'Everything', 'One slice of capacity'],
          ['Cost curve', 'Steep at the top', 'Roughly linear'],
          ['Keeping data consistent', 'Easy (one box)', 'Needs care']
        ]
      }
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['load-balancing'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'c1', kind: 'client', label: 'Client', x: 100, y: 95 },
      { id: 'c2', kind: 'phone', label: 'Client', x: 100, y: 245 },
      { id: 'c3', kind: 'client', label: 'Client', x: 100, y: 395 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', w: 164, x: 390, y: 245 },
      { id: 's1', kind: 'server', label: 'App 1', x: 690, y: 95 },
      { id: 's2', kind: 'server', label: 'App 2', x: 690, y: 245 },
      { id: 's3', kind: 'server', label: 'App 3', x: 690, y: 395 }
    ],
    edges: [['c1', 'lb'], ['c2', 'lb'], ['c3', 'lb'], ['lb', 's1'], ['lb', 's2'], ['lb', 's3']]
  },
  steps: [
    {
      title: 'One address, many servers',
      flows: [
        { from: 'c1', to: 'lb', seq: 0 }, { from: 'c2', to: 'lb', seq: 0 }, { from: 'c3', to: 'lb', seq: 0 },
        { from: 'lb', to: 's1', seq: 1 }, { from: 'lb', to: 's2', seq: 1 }, { from: 'lb', to: 's3', seq: 1 }
      ],
      body: `<p>Clients connect to one address. The load balancer spreads their requests across a pool of servers.</p>
             <p>It has three jobs: <strong>distribute</strong> the work, <strong>detect</strong> failed servers, and <strong>hide</strong> the pool so it can change without clients noticing.</p>`
    },
    {
      title: 'Round robin',
      slot: 650,
      flows: [
        { from: 'c1', to: 'lb', label: '#1', seq: 0 }, { from: 'lb', to: 's1', label: '#1', seq: 1 },
        { from: 'c2', to: 'lb', label: '#2', seq: 2 }, { from: 'lb', to: 's2', label: '#2', seq: 3 },
        { from: 'c3', to: 'lb', label: '#3', seq: 4 }, { from: 'lb', to: 's3', label: '#3', seq: 5 },
        { from: 'c1', to: 'lb', label: '#4', seq: 6 }, { from: 'lb', to: 's1', label: '#4', seq: 7 }
      ],
      body: `<p>The simplest policy: send each new request to the next server on the list, and wrap around at the end. It needs no information about the servers, which is both its strength and its weakness.</p>
             <p>It works well when the servers are identical and every request costs about the same.</p>`
    },
    {
      title: 'Least connections',
      states: { s1: 'hot' },
      badges: { s1: '5 active', s2: '1 active', s3: '2 active' },
      flows: [
        { from: 'c2', to: 'lb', label: 'new request', seq: 0 },
        { from: 'lb', to: 's2', label: 'fewest open', seq: 1 }
      ],
      body: `<p>Real requests vary. A report export might take 10 seconds while a page view takes 20 ms. Round robin keeps handing work to a server that's stuck on slow jobs.</p>
             <p><strong>Least connections</strong> sends each new request to the server with the fewest requests in flight. A cheaper variant, <em>power of two choices</em>, picks two servers at random and uses the less busy one. It works almost as well with far less coordination.</p>`
    },
    {
      title: 'Weighted balancing',
      scale: { s3: 1.18 },
      badges: { s1: 'weight 1', s2: 'weight 1', s3: 'weight 2' },
      flows: [
        { from: 'lb', to: 's1', stream: 1, period: 2000 },
        { from: 'lb', to: 's2', stream: 1, period: 2000, offset: 0.5 },
        { from: 'lb', to: 's3', stream: 2, period: 2000, offset: 0.25 }
      ],
      body: `<p>If the pool mixes server sizes, give the bigger ones more weight so they get a larger share of the traffic.</p>
             <p>Weights are also how <strong>canary releases</strong> work: give the new version weight 1 out of 100, watch its error rate, then turn it up.</p>`
    },
    {
      title: 'Health checks',
      states: { s2: 'down' },
      badges: { s2: '3 failed checks' },
      flows: [
        { from: 'lb', to: 's1', label: 'GET /healthz', seq: 0 }, { from: 's1', to: 'lb', kind: 'res', label: '200', seq: 1 },
        { from: 'lb', to: 's2', label: 'GET /healthz', seq: 0 }, { from: 's2', to: 'lb', kind: 'err', label: 'no reply', seq: 1 },
        { from: 'lb', to: 's3', seq: 0 }, { from: 's3', to: 'lb', kind: 'res', label: '200', seq: 1 }
      ],
      body: `<p>The load balancer checks every server every few seconds. After several failures in a row it takes the server out of rotation, and after several successes it puts it back.</p>
             <p>A good health endpoint shows the process can do real work. It shouldn't fail on every server at once just because one shared dependency had a brief problem.</p>`,
      tip: 'Passive checks, which watch real responses for errors, catch failures faster than periodic health checks alone.'
    },
    {
      title: 'Layer 4 vs layer 7',
      slot: 800,
      badges: { s1: 'api pool', s3: 'static pool' },
      flows: [
        { from: 'c1', to: 'lb', label: 'GET /api/cart', seq: 0 }, { from: 'lb', to: 's1', label: '/api/*', seq: 1 },
        { from: 'c3', to: 'lb', label: 'GET /img/logo.png', seq: 2 }, { from: 'lb', to: 's3', label: '/img/*', seq: 3 }
      ],
      body: `<p>A layer-4 balancer forwards whole TCP connections based on IP address and port. A layer-7 balancer understands HTTP, so it can route each request by path, header or cookie.</p>`,
      table: {
        head: ['', 'Layer 4 (transport)', 'Layer 7 (application)'],
        rows: [
          ['Sees', 'IP addresses and ports', 'Method, path, headers, cookies'],
          ['Routes per', 'Connection', 'Request'],
          ['TLS', 'Passed through', 'Usually decrypted here'],
          ['Extras', 'Very fast forwarding', 'Path routing, retries, rewrites, auth checks'],
          ['Cost', 'Low CPU', 'More CPU per request']
        ]
      }
    },
    {
      title: 'Who balances the balancer?',
      focus: ['lb'],
      badges: { lb: 'active + standby' },
      body: `<p>A single load balancer is itself a single point of failure. Common fixes: an active/standby pair sharing a floating IP, several balancers listed in DNS, or a managed cloud load balancer that handles this for you.</p>
             <p><strong>Sticky sessions</strong>, which pin each user to one server with a cookie, exist but have downsides. They make the load uneven, and users lose their session when that server dies. The next lesson removes the need for them.</p>`
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['stateless'] = {
  minutes: 6,
  diagram: {
    h: 480,
    nodes: [
      { id: 'user', kind: 'client', label: 'Browser', sub: 'alice', x: 100, y: 245 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', x: 320, y: 245 },
      { id: 's1', kind: 'server', label: 'App 1', x: 560, y: 95 },
      { id: 's3', kind: 'server', label: 'App 3', x: 560, y: 245 },
      { id: 's2', kind: 'server', label: 'App 2', x: 560, y: 395 },
      { id: 'store', kind: 'kv', label: 'Session store', sub: 'shared', x: 800, y: 245 }
    ],
    edges: [['user', 'lb'], ['lb', 's1'], ['lb', 's2'], ['lb', 's3'], ['s1', 'store'], ['s2', 'store'], ['s3', 'store']]
  },
  steps: [
    {
      title: 'State lives in one server',
      hide: ['s3', 'store'],
      slot: 850,
      badges: { s1: 'sid 91 → alice' },
      flows: [
        { from: 'user', to: 'lb', label: 'POST /login', seq: 0 },
        { from: 'lb', to: 's1', seq: 1 },
        { from: 's1', to: 'lb', kind: 'res', label: 'Set-Cookie: sid=91', seq: 2 },
        { from: 'lb', to: 'user', kind: 'res', seq: 3 }
      ],
      body: `<p>Alice logs in. App 1 keeps her session object in its own memory and gives her browser a cookie with the session ID.</p>
             <p>This works perfectly, as long as there's only one server.</p>`
    },
    {
      title: 'The next request lands elsewhere',
      hide: ['s3', 'store'],
      slot: 850,
      badges: { s1: 'sid 91 → alice', s2: 'sid 91 → ?' },
      flows: [
        { from: 'user', to: 'lb', label: 'GET /cart', seq: 0 },
        { from: 'lb', to: 's2', seq: 1 },
        { from: 's2', to: 'lb', kind: 'err', label: '401', seq: 2 },
        { from: 'lb', to: 'user', kind: 'err', label: 'logged out?!', seq: 3 }
      ],
      body: `<p>The load balancer sends her next request to App 2, which has never heard of session 91. Alice appears to be logged out.</p>
             <p>The same thing happens to anything else kept on one machine: an upload saved to local disk, in-memory counters, a scheduled job that only runs on one box.</p>`
    },
    {
      title: 'Sticky sessions: a patch',
      hide: ['s3', 'store'],
      states: { s1: 'down' },
      badges: { s1: 'restarted · memory empty' },
      flows: [
        { from: 'user', to: 'lb', label: 'sid=91', seq: 0 },
        { from: 'lb', to: 's1', kind: 'err', label: 'pinned', seq: 1 }
      ],
      body: `<p>You could pin each user to one server using a cookie or a hash of their IP address. That works until App 1 restarts for a deploy, and every user pinned to it loses their session.</p>
             <p>The load also becomes uneven, and you can't remove a server without logging people out.</p>`
    },
    {
      title: 'Move state out of the server',
      hide: ['s3'],
      slot: 750,
      badges: { store: 'sid 91 → alice' },
      flows: [
        { from: 'user', to: 'lb', label: 'GET /cart', seq: 0 },
        { from: 'lb', to: 's2', seq: 1 },
        { from: 's2', to: 'store', label: 'GET sid:91', seq: 2 },
        { from: 'store', to: 's2', kind: 'res', label: 'alice', seq: 3 },
        { from: 's2', to: 'lb', kind: 'res', label: '200', seq: 4 },
        { from: 'lb', to: 'user', kind: 'res', seq: 5 }
      ],
      body: `<p>Put sessions in a <strong>shared store</strong>, such as an in-memory key-value database or your main database. Any server can look up any session in about a millisecond.</p>
             <p>The servers no longer hold anything that can't be lost.</p>`
    },
    {
      title: 'Or carry state in the request',
      hide: ['s3'],
      badges: { s1: 'signature ✓' },
      flows: [
        { from: 'user', to: 'lb', label: 'Bearer eyJhbGci…', seq: 0 },
        { from: 'lb', to: 's1', seq: 1 },
        { from: 's1', to: 'lb', kind: 'res', label: '200', seq: 2 },
        { from: 'lb', to: 'user', kind: 'res', seq: 3 }
      ],
      body: `<p>A <strong>signed token</strong> puts the user's identity in the request itself, signed with a server-side key. Any server can check the signature without looking anything up.</p>
             <p>The trade-offs: you can't easily revoke a token before it expires, so keep them short-lived, and they add size to every request.</p>`,
      code: `// header.payload.signature, sent on every request
{
  "sub": "user_42",
  "name": "alice",
  "exp": 1767225600   // expiry: keep it short
}`
    },
    {
      title: 'Servers become interchangeable',
      badges: { s3: 'new · joined 30 s ago' },
      flows: [
        { from: 'user', to: 'lb', stream: 3, period: 1500 },
        { from: 'lb', to: 's1', stream: 1, period: 1500 },
        { from: 'lb', to: 's3', stream: 1, period: 1500, offset: 0.33 },
        { from: 'lb', to: 's2', stream: 1, period: 1500, offset: 0.66 },
        { from: 's1', to: 'store', stream: 1, period: 1500, offset: 0.5 },
        { from: 's3', to: 'store', stream: 1, period: 1500, offset: 0.83 },
        { from: 's2', to: 'store', stream: 1, period: 1500, offset: 0.16 }
      ],
      body: `<p>Stateless servers can be added in seconds, removed without warning, replaced on every deploy and scaled automatically. Before you get there, move these out of the server:</p>
             <ul>
               <li>Sessions → shared store or signed tokens</li>
               <li>Uploaded files → object storage</li>
               <li>Scheduled jobs → a scheduler or queue</li>
               <li>Counters and rate limits → a shared store</li>
             </ul>`,
      tip: "Stateless servers don't mean a stateless system. The state still exists; you've moved it somewhere built to keep it."
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['caching'] = {
  minutes: 8,
  diagram: {
    h: 480,
    nodes: [
      { id: 'user', kind: 'users', label: 'Clients', x: 110, y: 245 },
      { id: 'app', kind: 'server', label: 'App server', x: 390, y: 245 },
      { id: 'cache', kind: 'cache', label: 'Cache', sub: 'in-memory KV', x: 700, y: 105 },
      { id: 'db', kind: 'db', label: 'Database', sub: 'source of truth', w: 166, x: 700, y: 385 }
    ],
    edges: [['user', 'app'], ['app', 'cache'], ['app', 'db']]
  },
  steps: [
    {
      title: 'Why cache?',
      slot: 800,
      flows: [
        { from: 'user', to: 'app', seq: 0 },
        { from: 'app', to: 'db', seq: 1 },
        { from: 'db', to: 'app', kind: 'res', seq: 2 },
        { from: 'app', to: 'user', kind: 'res', seq: 3 }
      ],
      body: `<p>Many workloads read the same data far more often than they change it: product pages, profiles, configuration. Every database read costs query planning, maybe a disk read, and one of a limited pool of connections.</p>
             <p>A cache keeps recent answers in memory, where they're closer and much cheaper to fetch.</p>`,
      metrics: [{ label: 'Database read', value: '~5–10 ms' }, { label: 'Cache read', value: '< 1 ms', tone: 'res' }, { label: 'Reads : writes', value: '100 : 1' }]
    },
    {
      title: 'Cache hit',
      flows: [
        { from: 'app', to: 'cache', label: 'GET product:7', seq: 0 },
        { from: 'cache', to: 'app', kind: 'res', label: 'hit', seq: 1 }
      ],
      badges: { cache: 'product:7 ✓' },
      body: `<p>With <strong>cache-aside</strong> (also called lazy loading), the app checks the cache first. On a hit it's done in under a millisecond, and the database never sees the request.</p>`
    },
    {
      title: 'Cache miss',
      slot: 800,
      flows: [
        { from: 'app', to: 'cache', label: 'GET product:9', seq: 0 },
        { from: 'cache', to: 'app', kind: 'warn', label: 'miss', seq: 1 },
        { from: 'app', to: 'db', label: 'SELECT', seq: 2 },
        { from: 'db', to: 'app', kind: 'res', seq: 3 },
        { from: 'app', to: 'cache', label: 'SET ttl=300', seq: 4 }
      ],
      badges: { cache: 'product:9 stored' },
      body: `<p>On a miss, the app reads from the database, then saves the result in the cache with a time-to-live (TTL).</p>
             <p>Only data someone actually asked for gets cached. The cache can be emptied at any time and the app still works, just more slowly.</p>`
    },
    {
      title: 'Hit ratio is everything',
      flows: [
        { from: 'app', to: 'cache', stream: 3, period: 1500 },
        { from: 'cache', to: 'app', kind: 'res', stream: 3, period: 1500, offset: 0.5 },
        { from: 'app', to: 'db', stream: 1, period: 3000 }
      ],
      body: `<p>Assume a cache read takes 0.5 ms and a database read 8 ms. Raising the hit ratio from 90% to 99% halves the average latency and cuts database reads by 10×.</p>
             <p>The hit ratio depends on how big the set of frequently read data is compared with the cache, and on your TTLs.</p>`,
      math: [
        'avg = hit% × cache + miss% × (cache + db)',
        '90%: 0.9 × 0.5 + 0.1 × 8.5 = 1.3 ms',
        '99%: 0.99 × 0.5 + 0.01 × 8.5 = 0.58 ms',
        'DB reads: 1 in 10 → 1 in 100'
      ]
    },
    {
      title: 'Invalidate on write',
      slot: 900,
      flows: [
        { from: 'app', to: 'db', label: 'UPDATE price = 19', seq: 0 },
        { from: 'app', to: 'cache', kind: 'warn', label: 'DEL product:7', seq: 1 }
      ],
      badges: { db: 'price = 19', cache: 'product:7 removed' },
      body: `<p>When data changes, the cached copy is wrong until it expires or is removed. You can use a short TTL (simple, with a limit on how stale data gets), <strong>delete on write</strong> (the next read fetches fresh data), or write-through (update the cache and the database together).</p>
             <p>Deleting is safer than updating. Two concurrent updates can write the cache in the wrong order; a delete just forces a fresh read.</p>`,
      tip: '“There are only two hard things in Computer Science: cache invalidation and naming things.” — Phil Karlton'
    },
    {
      title: 'Write strategies',
      flows: [
        { from: 'app', to: 'cache', label: 'write', seq: 0 },
        { from: 'app', to: 'db', label: 'write', seq: 0 }
      ],
      body: `<p>Where writes go first decides how fresh the cache is and what you risk losing.</p>`,
      table: {
        head: ['Strategy', 'How writes flow', 'Good for', 'Risk'],
        rows: [
          ['Cache-aside', 'Write DB, delete key', 'General purpose', 'Brief stale window'],
          ['Write-through', 'Write cache and DB together', 'Reading your own writes', 'Slower writes; caches unread data'],
          ['Write-back', 'Write cache now, DB later', 'Write bursts, counters', 'Data loss if the cache dies first']
        ]
      }
    },
    {
      title: 'Eviction',
      states: { cache: 'hot' },
      badges: { cache: 'full · evicting LRU' },
      flows: [{ from: 'app', to: 'cache', stream: 4, period: 1300 }],
      body: `<p>Memory is limited. When the cache is full, something has to go: the <strong>least recently used</strong> key (LRU), the <strong>least frequently used</strong> (LFU), or anything past its TTL.</p>
             <p>LRU is the usual default. LFU holds up better when a one-off scan would otherwise push out popular keys. If evictions are high and the hit ratio is low, the cache is too small for the data you read most.</p>`
    },
    {
      title: 'The thundering herd',
      states: { db: 'hot' },
      badges: { cache: 'hot key expired', db: '1,000 identical queries' },
      flows: [
        { from: 'user', to: 'app', stream: 4, period: 1100 },
        { from: 'app', to: 'cache', kind: 'warn', stream: 3, period: 1100, offset: 0.3 },
        { from: 'app', to: 'db', kind: 'err', stream: 4, period: 1100, offset: 0.6 }
      ],
      body: `<p>A popular key expires, and thousands of requests miss at the same moment and all query the database. This can take down the system the cache was protecting.</p>
             <p>Fixes: <strong>request coalescing</strong> (one request fetches, the rest wait for its result), a lock on refilling the key, refreshing popular keys before they expire, and adding random jitter to TTLs so keys don't all expire together.</p>`
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['cdn'] = {
  minutes: 6,
  diagram: {
    h: 480,
    nodes: [
      { id: 'uEU', kind: 'client', label: 'Reader', sub: 'Berlin', x: 100, y: 100 },
      { id: 'uSG', kind: 'phone', label: 'Reader', sub: 'Singapore', x: 100, y: 385 },
      { id: 'eFRA', kind: 'edge', label: 'Edge PoP', sub: 'Frankfurt', x: 420, y: 100 },
      { id: 'eSIN', kind: 'edge', label: 'Edge PoP', sub: 'Singapore', x: 420, y: 385 },
      { id: 'origin', kind: 'server', label: 'Origin', sub: 'Virginia, US', x: 780, y: 245 }
    ],
    edges: [['uEU', 'eFRA'], ['uSG', 'eSIN'], ['eFRA', 'origin'], ['eSIN', 'origin'], { a: 'uSG', b: 'origin', curve: -60 }]
  },
  steps: [
    {
      title: 'Distance costs time',
      hide: ['eFRA', 'eSIN', 'uEU'],
      flows: [
        { from: 'uSG', to: 'origin', label: 'GET /hero.jpg', seq: 0 },
        { from: 'origin', to: 'uSG', kind: 'res', label: '1.2 MB', seq: 1 }
      ],
      body: `<p>Light in optical fiber travels about 200 km per millisecond. Singapore to Virginia is roughly 15,000 km, so a round trip takes around 230 ms once real-world routing is included.</p>
             <p>Before the first byte arrives, the connection setup and the request itself need about three round trips. No amount of server tuning beats physics.</p>`,
      metrics: [{ label: 'Round trip', value: '≈ 230 ms', tone: 'warn' }, { label: 'First byte ≈ 3 RTT', value: '≈ 700 ms', tone: 'err' }]
    },
    {
      title: 'Put copies near users',
      hide: ['uSG-origin'],
      focus: ['eFRA', 'eSIN'],
      badges: { eFRA: 'cache', eSIN: 'cache' },
      body: `<p>A <strong>content delivery network</strong> runs hundreds of points of presence (PoPs) around the world. DNS or anycast routing sends each user to a nearby one.</p>
             <p>Each edge server keeps copies of responses from your <strong>origin</strong>, which is your own server.</p>`
    },
    {
      title: 'First request: edge miss',
      hide: ['uSG-origin'],
      slot: 850,
      flows: [
        { from: 'uSG', to: 'eSIN', label: 'GET /hero.jpg', seq: 0 },
        { from: 'eSIN', to: 'origin', kind: 'warn', label: 'miss', seq: 1 },
        { from: 'origin', to: 'eSIN', kind: 'res', seq: 2 },
        { from: 'eSIN', to: 'uSG', kind: 'res', seq: 3 }
      ],
      badges: { eSIN: 'stored · max-age 1 y' },
      body: `<p>The first user in a region pays for the long trip. The edge fetches the file from the origin, sends it on, and keeps a copy for as long as the response's <code>Cache-Control</code> header allows.</p>
             <p>The edge-to-origin link is usually a well-tuned, long-lived connection, so even a miss is faster than going direct.</p>`
    },
    {
      title: 'Every request after: edge hit',
      hide: ['uSG-origin'],
      flows: [
        { from: 'uSG', to: 'eSIN', seq: 0 }, { from: 'eSIN', to: 'uSG', kind: 'res', label: 'hit', seq: 1 },
        { from: 'uEU', to: 'eFRA', seq: 0 }, { from: 'eFRA', to: 'uEU', kind: 'res', label: 'hit', seq: 1 }
      ],
      badges: { origin: 'quiet' },
      body: `<p>Later readers in the same region are served from a few milliseconds away. The origin stops seeing most of the traffic, so it can be smaller and cheaper.</p>`,
      metrics: [{ label: 'Edge round trip', value: '≈ 5–20 ms', tone: 'res' }, { label: 'Origin load', value: '≈ misses only', tone: 'res' }]
    },
    {
      title: 'Tell the edge what to cache',
      hide: ['uSG-origin'],
      focus: ['origin'],
      body: `<p>The origin controls caching through response headers. Put a content hash in static file names and cache them forever; each deploy produces new names, so nothing goes stale.</p>
             <p>Note that <code>no-cache</code> means “check with the origin before reusing”, not “don't store”.</p>`,
      code: `# fingerprinted asset: cache forever
GET /assets/app.3f9a1c.js
Cache-Control: public, max-age=31536000, immutable

# HTML: revalidate every time
GET /index.html
Cache-Control: no-cache

# personal data: never store at the edge
GET /api/me
Cache-Control: private, no-store`
    },
    {
      title: 'Purges, spikes and more',
      hide: ['uSG-origin'],
      flows: [
        { from: 'origin', to: 'eFRA', kind: 'warn', label: 'purge /hero.jpg', seq: 0 },
        { from: 'origin', to: 'eSIN', kind: 'warn', label: 'purge /hero.jpg', seq: 0 }
      ],
      body: `<p>When something has to disappear immediately, call the CDN's purge API. CDNs also help in other ways:</p>
             <ul>
               <li>They absorb traffic spikes and many denial-of-service attacks before they reach the origin.</li>
               <li>They complete the TLS handshake close to the user, which saves round trips.</li>
               <li>Many can run small pieces of code at the edge for redirects, A/B tests or auth checks.</li>
             </ul>`
    }
  ]
};
