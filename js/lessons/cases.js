/* Module 9: Case Studies. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['design-process'] = {
  minutes: 8,
  diagram: {
    h: 500,
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', x: 90, y: 230, w: 130 },
      { id: 'cdn', kind: 'edge', label: 'CDN', x: 90, y: 430, w: 130 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', x: 300, y: 230, w: 160 },
      { id: 'app', kind: 'server', label: 'App servers', x: 520, y: 230, w: 160 },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 770, y: 70 },
      { id: 'db', kind: 'db', label: 'Database', sub: 'primary + replicas', w: 190, x: 770, y: 230 },
      { id: 'store', kind: 'blob', label: 'Photo storage', w: 170, x: 300, y: 430 },
      { id: 'q', kind: 'queue', label: 'Queue', x: 520, y: 430, w: 130 },
      { id: 'worker', kind: 'gear', label: 'Workers', x: 770, y: 430 }
    ],
    edges: [['users', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db'], ['users', 'cdn'], ['cdn', 'store'], ['app', 'q'], ['q', 'worker'], ['worker', 'db'], ['store', 'q']]
  },
  steps: [
    {
      title: 'Start with questions, not boxes',
      hide: ['cdn', 'lb', 'app', 'cache', 'db', 'store', 'q', 'worker'],
      focus: ['users'],
      body: `<p>Example brief: <em>design a photo-sharing service</em>. Before drawing anything, pin down what you're building. The answers change the design more than any technology choice.</p>`,
      table: {
        head: ['Ask about', 'For example'],
        rows: [
          ['Core features', 'Upload photos, follow people, view a feed. Not: messaging, stories'],
          ['Users and scale', '10M daily users, growing 2× a year'],
          ['Read vs write', 'Views far outnumber uploads'],
          ['Latency', 'Feed loads in under 500 ms'],
          ['Consistency', 'A new photo can take a few seconds to appear'],
          ['Durability', 'Never lose an uploaded photo']
        ]
      }
    },
    {
      title: 'Estimate the load',
      hide: ['cdn', 'lb', 'app', 'cache', 'db', 'store', 'q', 'worker'],
      focus: ['users'],
      body: `<p>Rough numbers tell you which parts need special attention. Round freely; you're looking for orders of magnitude.</p>`,
      math: [
        'views: 10M users × 20 = 200M / day ÷ 100k s ≈ 2,000 /s (peak ≈ 6,000)',
        'uploads: 10M × 10% = 1M / day ≈ 12 /s',
        'storage: 1M × 2 MB = 2 TB / day ≈ 730 TB / year',
        'egress: 6,000 /s × 200 KB ≈ 1.2 GB/s at peak'
      ],
      metrics: [{ label: 'Read : write', value: '≈ 170 : 1' }, { label: 'Hard part', value: 'storage + bandwidth', tone: 'warn' }]
    },
    {
      title: 'Define the API and data',
      hide: ['cdn', 'lb', 'cache', 'store', 'q', 'worker'],
      focus: ['app', 'db'],
      body: `<p>A few endpoints and tables make the design concrete and expose the access patterns.</p>`,
      code: `POST /photos            → { upload_url, photo_id }
GET  /feed?cursor=…     → [ { photo_id, url, author, likes } ]
POST /users/{id}/follow

users(id, name, …)
photos(id, owner_id, storage_key, created_at)   -- index (owner_id, created_at)
follows(follower_id, followee_id)               -- index both directions`
    },
    {
      title: 'Draw the simplest thing that works',
      hide: ['cdn', 'cache', 'store', 'q', 'worker'],
      slot: 800,
      flows: [
        { from: 'users', to: 'lb', seq: 0 }, { from: 'lb', to: 'app', seq: 1 },
        { from: 'app', to: 'db', seq: 2 }, { from: 'db', to: 'app', kind: 'res', seq: 3 },
        { from: 'app', to: 'lb', kind: 'res', seq: 4 }, { from: 'lb', to: 'users', kind: 'res', seq: 5 }
      ],
      body: `<p>Stateless app servers behind a load balancer, and a relational database. Walk one request through it end to end and check it meets the requirements on paper.</p>
             <p>Then compare against the estimates. 6,000 reads per second and 730 TB a year of photos clearly won't fit this picture as it stands.</p>`
    },
    {
      title: 'Deep-dive the bottlenecks',
      flows: [
        { from: 'users', to: 'cdn', kind: 'res', stream: 3, period: 1500 },
        { from: 'app', to: 'cache', stream: 2, period: 1500 },
        { from: 'store', to: 'q', stream: 1, period: 1500 },
        { from: 'q', to: 'worker', stream: 1, period: 1500, offset: 0.5 }
      ],
      badges: { cdn: 'serves photo bytes', cache: 'feeds + profiles', worker: 'thumbnails' },
      body: `<p>Address each problem the numbers revealed, using the patterns from earlier modules:</p>
             <ul>
               <li>Photo bytes → object storage with direct uploads, served through a CDN.</li>
               <li>Read volume → cache hot feeds and profiles; add read replicas.</li>
               <li>Slow processing → queue + workers generate thumbnails asynchronously.</li>
               <li>Feed building → fan-out choices (see "Design a News Feed").</li>
             </ul>`
    },
    {
      title: 'Discuss trade-offs and failures',
      states: { cache: 'down' },
      badges: { cache: 'what if this dies?', db: 'shard key: owner_id?' },
      flows: [
        { from: 'app', to: 'db', kind: 'warn', stream: 3, period: 1300 }
      ],
      body: `<p>Finish by stress-testing your own design. What happens when the cache is cold, a zone fails, or one account goes viral? What would you shard on when the database runs out of room? What would you monitor?</p>
             <p>There's rarely one right answer. What matters is stating the trade-off and why it fits these requirements.</p>`,
      tip: 'Requirements → estimates → API → simple design → bottlenecks → trade-offs. Saying each trade-off out loud is most of the work.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['url-shortener'] = {
  minutes: 8,
  diagram: {
    h: 500,
    nodes: [
      { id: 'user', kind: 'client', label: 'Browser', x: 100, y: 250, w: 140 },
      { id: 'api', kind: 'server', label: 'Link service', w: 170, x: 360, y: 250 },
      { id: 'ids', kind: 'kv', label: 'ID ranges', x: 360, y: 440 },
      { id: 'cache', kind: 'cache', label: 'Cache', sub: 'hot links', x: 640, y: 80 },
      { id: 'db', kind: 'kv', label: 'Links store', sub: 'code → URL', w: 170, x: 640, y: 250 },
      { id: 'q', kind: 'queue', label: 'Click events', w: 160, x: 640, y: 430 },
      { id: 'stats', kind: 'chart', label: 'Analytics', w: 130, x: 825, y: 430 }
    ],
    edges: [['user', 'api'], ['api', 'ids'], ['api', 'cache'], ['api', 'db'], ['api', 'q'], ['q', 'stats']]
  },
  steps: [
    {
      title: 'Requirements and numbers',
      hide: ['ids', 'cache', 'q', 'stats'],
      focus: ['user', 'api', 'db'],
      body: `<p>Turn a long URL into a short code, and redirect anyone who visits the code. Links don't change once created. Redirects must be fast and must not go down; click counts can be a little late.</p>`,
      math: [
        'writes: 100M links / month ≈ 40 /s',
        'reads: 100 clicks per link → ≈ 4,000 /s average, ≈ 20,000 /s peak',
        'storage: 100M × 12 months × 5 years × 500 B ≈ 3 TB',
        'codes: 62⁷ ≈ 3.5 trillion → 7 characters is plenty'
      ]
    },
    {
      title: 'The API',
      hide: ['ids', 'cache', 'q', 'stats'],
      slot: 900,
      flows: [
        { from: 'user', to: 'api', label: 'GET /aZ3kQ9x', seq: 0 },
        { from: 'api', to: 'user', kind: 'res', label: '302 Location: …', seq: 1 }
      ],
      body: `<p>Two endpoints do the job. The redirect status matters: <strong>301</strong> (permanent) lets browsers cache it and skip you next time, saving load but hiding later clicks; <strong>302</strong> (temporary) brings every click back to you for counting.</p>`,
      code: `POST /links  { "url": "https://example.com/very/long/path" }
     → 201 { "code": "aZ3kQ9x", "short": "https://sho.rt/aZ3kQ9x" }

GET  /aZ3kQ9x
     → 302 Location: https://example.com/very/long/path`
    },
    {
      title: 'Generating short codes',
      hide: ['cache', 'q', 'stats'],
      slot: 900,
      badges: { api: 'block 5,000,000–5,000,999' },
      flows: [
        { from: 'api', to: 'ids', label: 'next block', seq: 0 },
        { from: 'ids', to: 'api', kind: 'res', label: '1,000 ids', seq: 1 }
      ],
      body: `<p>Hashing the URL and keeping 7 characters causes collisions you must detect and retry. Random codes need an existence check on every write. A <strong>counter</strong> is collision-free: take IDs from a block allocated to this server, and encode each in base 62.</p>
             <p>Sequential codes are guessable, so scramble the number with a reversible shuffle before encoding if links shouldn't be enumerable.</p>`,
      code: `const A = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
function base62(n) {
  let s = '';
  do { s = A[n % 62] + s; n = Math.floor(n / 62); } while (n > 0);
  return s;            // base62(5000123) → "kYL9"
}`
    },
    {
      title: 'Write path',
      hide: ['cache', 'q', 'stats'],
      slot: 800,
      flows: [
        { from: 'user', to: 'api', label: 'POST /links', seq: 0 },
        { from: 'api', to: 'db', label: 'PUT aZ3kQ9x → url', seq: 1 },
        { from: 'db', to: 'api', kind: 'res', seq: 2 },
        { from: 'api', to: 'user', kind: 'res', label: 'short link', seq: 3 }
      ],
      body: `<p>The data is one lookup by key, written once and never updated. A key-value or wide-column store partitioned by code fits it well and scales horizontally. A relational database works too at this size.</p>
             <p>Check the target URL against malware and phishing lists before saving. Shorteners are a favourite tool for hiding bad links.</p>`
    },
    {
      title: 'Read path: cache the hot links',
      hide: ['ids', 'q', 'stats'],
      slot: 750,
      badges: { cache: 'hit ratio 95%' },
      flows: [
        { from: 'user', to: 'api', label: 'GET /aZ3kQ9x', seq: 0 },
        { from: 'api', to: 'cache', seq: 1 },
        { from: 'cache', to: 'api', kind: 'res', label: 'hit', seq: 2 },
        { from: 'api', to: 'user', kind: 'res', label: '302', seq: 3 }
      ],
      body: `<p>Clicks are very skewed: a small share of links gets most of the traffic. A cache in front of the store absorbs most reads, and since links never change, there's no invalidation to worry about.</p>
             <p>For more headroom, serve redirects from the CDN edge with a short cache time.</p>`
    },
    {
      title: 'Count clicks off the hot path',
      hide: ['ids'],
      flows: [
        { from: 'user', to: 'api', stream: 3, period: 1400 },
        { from: 'api', to: 'cache', stream: 3, period: 1400, offset: 0.3 },
        { from: 'api', to: 'q', kind: 'warn', stream: 3, period: 1400, offset: 0.6 },
        { from: 'q', to: 'stats', stream: 2, period: 1400, offset: 0.2 }
      ],
      body: `<p>Writing analytics in the redirect would make every click as slow as the analytics database. Instead, the redirect fires a click event onto a queue or stream and returns immediately.</p>
             <p>A consumer aggregates counts by link, country and hour, and writes them in batches. If analytics falls behind or goes down, redirects keep working.</p>`
    },
    {
      title: 'Decisions at a glance',
      flows: [
        { from: 'user', to: 'api', stream: 2, period: 1600 },
        { from: 'api', to: 'cache', stream: 2, period: 1600, offset: 0.4 },
        { from: 'api', to: 'q', stream: 1, period: 1600, offset: 0.7 }
      ],
      body: `<p>Everything here follows from one fact: reads outnumber writes 100 to 1, and links never change.</p>`,
      table: {
        head: ['Decision', 'Choice', 'Because'],
        rows: [
          ['Code generation', 'Counter blocks + base62', 'No collisions, no coordination per write'],
          ['Storage', 'KV store keyed by code', 'Single-key lookups, easy partitioning'],
          ['Redirect', '302', 'Keeps click analytics'],
          ['Reads', 'Cache + CDN', 'Heavy skew, immutable data'],
          ['Analytics', 'Async via queue', 'Keeps redirects fast and independent']
        ]
      },
      tip: 'Find the single fact that dominates the workload, then let every decision follow from it.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['news-feed'] = {
  minutes: 9,
  diagram: {
    h: 500,
    nodes: [
      { id: 'author', kind: 'phone', label: 'Author', x: 90, y: 90, w: 130 },
      { id: 'reader', kind: 'client', label: 'Reader', x: 90, y: 410, w: 130 },
      { id: 'post', kind: 'server', label: 'Post service', w: 160, x: 320, y: 90 },
      { id: 'feed', kind: 'server', label: 'Feed service', w: 160, x: 320, y: 410 },
      { id: 'posts', kind: 'db', label: 'Posts DB', x: 580, y: 90, w: 140 },
      { id: 'q', kind: 'queue', label: 'Fan-out queue', w: 170, x: 560, y: 250 },
      { id: 'graph', kind: 'kv', label: 'Follow graph', w: 160, x: 800, y: 90 },
      { id: 'fan', kind: 'gear', label: 'Fan-out workers', w: 180, x: 800, y: 250 },
      { id: 'cache', kind: 'cache', label: 'Feed cache', sub: 'list per user', w: 170, x: 580, y: 410 }
    ],
    edges: [
      ['author', 'post'], ['post', 'posts'], ['post', 'q'], ['q', 'fan'], ['fan', 'graph'], ['fan', 'cache'],
      ['reader', 'feed'], ['feed', 'cache'], { a: 'feed', b: 'posts', curve: -90 }
    ]
  },
  steps: [
    {
      title: 'The problem',
      focus: ['author', 'reader'],
      body: `<p>Users follow others and see a feed of their recent posts, newest or best first. The feed is the home screen, so it's loaded constantly and must be fast.</p>`,
      math: [
        '100M daily users · each opens the feed 10× → 1B feed reads / day ≈ 12,000 /s',
        '10% post once a day → 10M posts / day ≈ 120 /s',
        'average 200 followers; a few accounts have 50M'
      ]
    },
    {
      title: 'Fan-out on read (pull)',
      hide: ['q', 'fan', 'cache'],
      slot: 850,
      states: { posts: 'hot' },
      badges: { posts: 'merge 300 followees × recent posts' },
      flows: [
        { from: 'reader', to: 'feed', label: 'GET /feed', seq: 0 },
        { from: 'feed', to: 'posts', kind: 'warn', label: 'posts from 300 people', seq: 1 },
        { from: 'posts', to: 'feed', kind: 'res', seq: 2 },
        { from: 'feed', to: 'reader', kind: 'res', label: 'merged · sorted', seq: 3 }
      ],
      body: `<p>The simplest approach builds the feed when it's requested: look up who the reader follows, fetch each one's recent posts, merge and sort.</p>
             <p>Posting is trivially cheap. Reading is expensive: hundreds of lookups on every feed load, 12,000 times a second.</p>`
    },
    {
      title: 'Fan-out on write (push)',
      hide: ['reader', 'feed'],
      slot: 650,
      flows: [
        { from: 'author', to: 'post', label: 'new post', seq: 0 },
        { from: 'post', to: 'posts', seq: 1 }, { from: 'post', to: 'q', seq: 1 },
        { from: 'q', to: 'fan', seq: 2 },
        { from: 'fan', to: 'graph', label: 'followers?', seq: 3 },
        { from: 'graph', to: 'fan', kind: 'res', label: '200 ids', seq: 4 },
        { from: 'fan', to: 'cache', label: 'prepend post id ×200', seq: 5 }
      ],
      body: `<p>Do the work when a post is created instead. Workers look up the author's followers and insert the post ID at the top of each follower's precomputed feed list.</p>
             <p>One post becomes about 200 small writes, which is fine: writes are 100 times rarer than reads.</p>`
    },
    {
      title: 'Reads become one lookup',
      hide: ['author', 'post', 'q', 'fan', 'graph'],
      slot: 750,
      flows: [
        { from: 'reader', to: 'feed', label: 'GET /feed', seq: 0 },
        { from: 'feed', to: 'cache', label: 'first 50 ids', seq: 1 },
        { from: 'cache', to: 'feed', kind: 'res', seq: 2 },
        { from: 'feed', to: 'posts', label: 'fetch 50 posts', seq: 3 },
        { from: 'feed', to: 'reader', kind: 'res', label: '≈ 30 ms', seq: 4 }
      ],
      body: `<p>Loading a feed is now one list read plus a batch fetch of the posts (themselves heavily cached). Store only IDs in feed lists, keep them to the most recent few hundred, and only for users active recently, which saves a lot of memory.</p>`
    },
    {
      title: 'The celebrity problem',
      hide: ['reader', 'feed'],
      states: { fan: 'hot', q: 'hot' },
      badges: { author: '50M followers', fan: '50M writes for one post', q: 'backlog: 40 min' },
      flows: [
        { from: 'author', to: 'post', seq: 0 },
        { from: 'post', to: 'q', seq: 1 },
        { from: 'q', to: 'fan', kind: 'warn', stream: 4, period: 1100 },
        { from: 'fan', to: 'cache', kind: 'err', stream: 5, period: 1100, offset: 0.4 }
      ],
      body: `<p>Push breaks for accounts with tens of millions of followers: one post triggers tens of millions of writes, and followers see it minutes late.</p>
             <p>The usual answer is a <strong>hybrid</strong>. Push for normal accounts. For accounts above a follower threshold, skip fan-out; at read time, fetch their recent posts and merge them into the precomputed feed. Few people follow more than a handful of such accounts, so the merge stays small.</p>`
    },
    {
      title: 'Ranking',
      hide: ['author', 'post', 'q', 'fan'],
      slot: 850,
      badges: { feed: 'candidates → score → top 50' },
      flows: [
        { from: 'reader', to: 'feed', seq: 0 },
        { from: 'feed', to: 'cache', label: '500 candidates', seq: 1 },
        { from: 'feed', to: 'reader', kind: 'res', label: 'ranked', seq: 2 }
      ],
      body: `<p>Most feeds aren't purely chronological. A ranking stage takes a few hundred candidates, computes features such as the author's relationship to the reader, the post's age and early engagement, and scores them with a model.</p>
             <p>Keep ranking within a strict latency budget, and fall back to chronological order if it times out.</p>`
    },
    {
      title: 'Trade-offs',
      flows: [
        { from: 'post', to: 'q', stream: 1, period: 1600 },
        { from: 'fan', to: 'cache', stream: 2, period: 1600, offset: 0.3 },
        { from: 'reader', to: 'feed', stream: 3, period: 1600 },
        { from: 'feed', to: 'cache', stream: 3, period: 1600, offset: 0.5 }
      ],
      body: `<p>Use cursors, not page numbers, for pagination so new posts don't shift pages. Deleted posts stay in feed lists, so filter them when you fetch posts.</p>`,
      table: {
        head: ['', 'Pull', 'Push', 'Hybrid'],
        rows: [
          ['Post cost', 'Tiny', 'One write per follower', 'Push for most'],
          ['Read cost', 'Hundreds of lookups', 'One list read', 'One list + a small merge'],
          ['Freshness', 'Instant', 'Fan-out delay', 'Instant for big accounts'],
          ['Breaks on', 'Read volume', 'Huge accounts', 'More code paths']
        ]
      },
      tip: 'When reads dwarf writes, move work to write time, then handle the outliers that make write-time work explode.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['chat'] = {
  minutes: 9,
  diagram: {
    h: 520,
    nodes: [
      { id: 'alice', kind: 'phone', label: 'Alice', x: 90, y: 100, w: 120 },
      { id: 'bob', kind: 'client', label: 'Bob', x: 90, y: 400, w: 120 },
      { id: 'gw1', kind: 'server', label: 'Gateway 1', sub: 'WebSockets', x: 320, y: 100 },
      { id: 'gw2', kind: 'server', label: 'Gateway 2', sub: 'WebSockets', x: 320, y: 400 },
      { id: 'chat', kind: 'server', label: 'Chat service', w: 170, x: 570, y: 250 },
      { id: 'store', kind: 'db', label: 'Messages', sub: 'by conversation', w: 180, x: 805, y: 90 },
      { id: 'route', kind: 'kv', label: 'Sessions', sub: 'user → gateway', w: 180, x: 805, y: 250 },
      { id: 'push', kind: 'bell', label: 'Push service', w: 180, x: 805, y: 410 }
    ],
    edges: [
      ['alice', 'gw1'], ['bob', 'gw2'], ['gw1', 'chat'], ['gw2', 'chat'],
      ['chat', 'store'], ['chat', 'route'], ['chat', 'push'], { a: 'push', b: 'bob', curve: -95 }
    ]
  },
  steps: [
    {
      title: 'What we need',
      hide: ['push-bob'],
      focus: ['alice', 'bob'],
      body: `<p>One-to-one and group chat. Messages appear within a fraction of a second when both people are online, are never lost, arrive in order, and sync across a user's devices. Show sent, delivered and read receipts, and who's online.</p>`,
      math: [
        '50M daily users × 40 messages = 2B messages / day ≈ 23,000 /s',
        'peak ≈ 3× → ≈ 70,000 /s',
        '10M concurrent connections ÷ 100k per gateway ≈ 100 gateways'
      ]
    },
    {
      title: 'Keep a connection open',
      hide: ['push-bob', 'store', 'route', 'push'],
      badges: { gw1: '100k sockets', gw2: '100k sockets' },
      flows: [
        { from: 'alice', to: 'gw1', label: 'ping', stream: 1, period: 2200 },
        { from: 'gw1', to: 'alice', kind: 'res', stream: 1, period: 2200, offset: 0.5 },
        { from: 'bob', to: 'gw2', stream: 1, period: 2200, offset: 0.25 },
        { from: 'gw2', to: 'bob', kind: 'res', stream: 1, period: 2200, offset: 0.75 }
      ],
      body: `<p>Each client holds a WebSocket to a <strong>gateway</strong>. Gateways do little except hold connections, authenticate them and pass frames along, so one machine can hold a very large number of connections.</p>
             <p>Heartbeats detect dead connections; mobile networks drop them silently all the time.</p>`
    },
    {
      title: 'Send a message',
      hide: ['push-bob', 'push'],
      slot: 650,
      flows: [
        { from: 'alice', to: 'gw1', label: '"hi"', seq: 0 },
        { from: 'gw1', to: 'chat', seq: 1 },
        { from: 'chat', to: 'store', label: 'append #812', seq: 2 },
        { from: 'chat', to: 'route', label: 'where is Bob?', seq: 3 },
        { from: 'route', to: 'chat', kind: 'res', label: 'gateway 2', seq: 4 },
        { from: 'chat', to: 'gw2', seq: 5 },
        { from: 'gw2', to: 'bob', kind: 'res', label: '"hi"', seq: 6 }
      ],
      body: `<p>The chat service <strong>stores the message first</strong>, then delivers it. Once stored, it can't be lost, whatever happens to the connections.</p>
             <p>A sessions store maps each online user (and each of their devices) to the gateway holding their connection, so the message can be routed to the right machine.</p>`
    },
    {
      title: 'Ordering with sequence numbers',
      hide: ['push-bob', 'push', 'route'],
      badges: { store: 'conv 77: … #811, #812' },
      flows: [
        { from: 'chat', to: 'store', label: 'next seq for conv 77', seq: 0 },
        { from: 'store', to: 'chat', kind: 'res', label: '#812', seq: 1 }
      ],
      body: `<p>Clocks on phones can't be trusted to order messages. Instead, the server assigns each message an increasing <strong>sequence number per conversation</strong>. Clients sort by it, and a gap (#810 then #812) tells a client to fetch what it missed.</p>
             <p>Partition the message store by conversation ID so a conversation's history is one range read.</p>`,
      code: `{
  "conversation_id": 77,
  "seq": 812,
  "client_msg_id": "a1b2-…",   // dedupes resends after reconnect
  "sender": "alice",
  "body": "hi",
  "sent_at": "2026-03-14T09:26:53Z"
}`
    },
    {
      title: 'Delivery receipts',
      hide: ['push-bob', 'push', 'store', 'route'],
      slot: 700,
      flows: [
        { from: 'bob', to: 'gw2', label: 'delivered #812', seq: 0 },
        { from: 'gw2', to: 'chat', seq: 1 },
        { from: 'chat', to: 'gw1', seq: 2 },
        { from: 'gw1', to: 'alice', kind: 'res', label: '✓✓', seq: 3 }
      ],
      body: `<p>Receipts are just messages travelling the other way. "Sent" means the server stored it, "delivered" means a device of Bob's received it, and "read" means Bob opened the conversation.</p>
             <p>Track receipts as "read up to #812" per member rather than one record per message. In groups, that's much less data.</p>`
    },
    {
      title: 'Offline delivery',
      hide: ['gw2'],
      slot: 750,
      states: { bob: 'down' },
      badges: { bob: 'app closed', route: 'Bob: offline' },
      flows: [
        { from: 'chat', to: 'route', label: 'where is Bob?', seq: 0 },
        { from: 'route', to: 'chat', kind: 'warn', label: 'offline', seq: 1 },
        { from: 'chat', to: 'push', label: 'notify', seq: 2 },
        { from: 'push', to: 'bob', kind: 'res', label: 'notification', seq: 3 }
      ],
      body: `<p>If Bob has no live connection, the message is already safe in storage; send a push notification through the phone platform's notification service.</p>
             <p>When Bob reconnects, his app sends the last sequence number it has for each conversation, and the server returns everything newer. The same sync brings his laptop and phone up to date.</p>`
    },
    {
      title: 'Presence and groups',
      hide: ['push-bob'],
      flows: [
        { from: 'alice', to: 'gw1', stream: 1, period: 2000 },
        { from: 'bob', to: 'gw2', stream: 1, period: 2000, offset: 0.5 },
        { from: 'gw1', to: 'chat', stream: 1, period: 2000, offset: 0.25 },
        { from: 'gw2', to: 'chat', stream: 1, period: 2000, offset: 0.75 },
        { from: 'chat', to: 'route', stream: 1, period: 2000 }
      ],
      body: `<p>Presence ("online", "last seen") comes from heartbeats with a timeout. Broadcasting every change to every contact is expensive, so send presence only to people looking at you, and smooth out flapping connections.</p>`,
      table: {
        head: ['Concern', 'Approach'],
        rows: [
          ['Small groups', 'Fan out each message to every member’s devices'],
          ['Huge groups / channels', 'Store once; members pull, like a feed'],
          ['Duplicates on reconnect', 'Client message ID, deduplicated by the server'],
          ['Gateway restarts', 'Clients reconnect with backoff and jitter, then sync'],
          ['End-to-end encryption', 'Server routes ciphertext it can’t read']
        ]
      },
      tip: 'Store first, then deliver. Make delivery retryable and sync driven by sequence numbers, and most chat edge cases take care of themselves.'
    }
  ]
};
