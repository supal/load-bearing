/* Module 3: Data. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
LESSONS['relational-vs-nosql'] = {
  minutes: 7,
  diagram: {
    h: 500,
    nodes: [
      { id: 'app', kind: 'server', label: 'App server', x: 150, y: 250 },
      { id: 'rel', kind: 'db', label: 'Relational', sub: 'tables + joins', w: 196, x: 640, y: 70 },
      { id: 'doc', kind: 'db', label: 'Document', sub: 'JSON documents', w: 196, x: 640, y: 190 },
      { id: 'wide', kind: 'db', label: 'Wide-column', sub: 'partition + sort key', w: 196, x: 640, y: 310 },
      { id: 'kv', kind: 'kv', label: 'Key-value', sub: 'get / put by key', w: 196, x: 640, y: 430 }
    ],
    edges: [['app', 'rel'], ['app', 'doc'], ['app', 'wide'], ['app', 'kv']]
  },
  steps: [
    {
      title: 'Start from how you read the data',
      flows: [
        { from: 'app', to: 'rel', seq: 0 }, { from: 'app', to: 'doc', seq: 0 },
        { from: 'app', to: 'wide', seq: 0 }, { from: 'app', to: 'kv', seq: 0 }
      ],
      body: `<p>Every database is a set of trade-offs about how data is laid out on disk. The layout decides which questions are cheap to ask and which are expensive.</p>
             <p>So the useful question isn't "SQL or NoSQL?" It's "what will I ask this data, how often, and how fast must the answer come back?"</p>`
    },
    {
      title: 'Relational: tables, joins, transactions',
      focus: ['rel'],
      slot: 900,
      badges: { rel: 'orders ⋈ customers' },
      flows: [
        { from: 'app', to: 'rel', label: 'SELECT … JOIN', seq: 0 },
        { from: 'rel', to: 'app', kind: 'res', label: 'rows', seq: 1 }
      ],
      body: `<p>Relational databases store data as rows in tables with a fixed schema, and connect tables through keys. Each fact is stored once, and queries join the pieces back together.</p>
             <p>You get ad-hoc queries you didn't plan for, constraints the database enforces, and multi-row transactions. The cost: one big database is harder to spread across many machines.</p>`,
      code: `SELECT c.name, o.total
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > now() - interval '7 days';`
    },
    {
      title: 'Document: store the whole thing together',
      focus: ['doc'],
      slot: 900,
      badges: { doc: 'order/81 · one read' },
      flows: [
        { from: 'app', to: 'doc', label: 'GET order/81', seq: 0 },
        { from: 'doc', to: 'app', kind: 'res', label: 'whole order', seq: 1 }
      ],
      body: `<p>A document store saves each record as a self-contained JSON-like document. Data that's always read together lives together, so one read returns the whole order with its items and address.</p>
             <p>Schemas are flexible, which helps when records vary. Relationships between documents are weaker: joins are limited or done in your code.</p>`,
      code: `{
  "_id": "order/81",
  "customer": { "id": 7, "name": "Ana" },
  "items": [ { "sku": "mug", "qty": 2 } ],
  "ship_to": { "city": "Porto" }
}`
    },
    {
      title: 'Wide-column: huge write volume, known queries',
      focus: ['wide'],
      badges: { wide: 'partition: sensor_17' },
      flows: [{ from: 'app', to: 'wide', stream: 5, period: 1400 }],
      body: `<p>Wide-column stores group rows by a <strong>partition key</strong> and keep them sorted by a <strong>sort key</strong> inside each partition. They spread partitions over many machines and absorb very high write rates.</p>
             <p>The catch: you design one table per query. "Readings for sensor 17 in the last hour" is fast. "All sensors above 90°" is a full scan unless you built a table for it.</p>`
    },
    {
      title: 'Key-value: the simplest contract',
      focus: ['kv'],
      slot: 800,
      badges: { kv: 'session:91 → {…}' },
      flows: [
        { from: 'app', to: 'kv', label: 'GET session:91', seq: 0 },
        { from: 'kv', to: 'app', kind: 'res', label: '0.4 ms', seq: 1 }
      ],
      body: `<p>A key-value store does one thing: given a key, return the value. It doesn't look inside the value, so it can be very fast and easy to partition.</p>
             <p>It's ideal for sessions, caches, feature flags and counters. Anything that needs to search by something other than the key needs another store or a second index you maintain yourself.</p>`
    },
    {
      title: 'Choose by access pattern',
      flows: [
        { from: 'app', to: 'rel', stream: 2, period: 2000 },
        { from: 'app', to: 'kv', stream: 2, period: 2000, offset: 0.5 }
      ],
      body: `<p>Many real systems use more than one: a relational database as the source of truth, a key-value store for sessions and caching, and maybe a search index on the side.</p>`,
      table: {
        head: ['Model', 'Strong at', 'Weak at', 'Typical use'],
        rows: [
          ['Relational', 'Ad-hoc queries, joins, transactions', 'Spreading writes over many nodes', 'Orders, accounts, inventory'],
          ['Document', 'Whole-record reads, flexible fields', 'Cross-document relationships', 'Catalogs, profiles, content'],
          ['Wide-column', 'Massive writes, time series', 'Queries you didn\'t design for', 'Metrics, events, messages'],
          ['Key-value', 'Lookups by key, very low latency', 'Anything but the key', 'Sessions, caches, counters'],
          ['Graph', 'Many-hop relationships', 'Bulk analytics', 'Social graphs, fraud rings']
        ]
      },
      tip: 'Default to a relational database. Move a workload elsewhere when you can name the access pattern it fails to serve.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['indexes'] = {
  minutes: 6,
  diagram: {
    h: 480,
    nodes: [
      { id: 'app', kind: 'server', label: 'App', x: 100, y: 245, w: 130 },
      { id: 'q', kind: 'gear', label: 'Query engine', x: 350, y: 245 },
      { id: 'idx', kind: 'kv', label: 'Index', sub: 'B-tree on email', w: 170, x: 680, y: 100 },
      { id: 'tbl', kind: 'db', label: 'users table', sub: '10M rows', w: 170, x: 680, y: 390 }
    ],
    edges: [['app', 'q'], ['q', 'idx'], ['q', 'tbl'], ['idx', 'tbl']]
  },
  steps: [
    {
      title: 'Without an index: read everything',
      hide: ['idx'],
      states: { tbl: 'hot' },
      badges: { tbl: 'scanning 10,000,000 rows' },
      flows: [
        { from: 'app', to: 'q', label: "email = 'ana@x.io'", seq: 0 },
        { from: 'q', to: 'tbl', stream: 6, period: 900 }
      ],
      body: `<p>To find one user by email, the database has no choice but to read every row and compare. This is a <strong>full table scan</strong>.</p>
             <p>It's fine at 1,000 rows. At 10 million rows it means reading gigabytes for one result, and it gets slower every day the table grows.</p>`,
      metrics: [{ label: 'Rows examined', value: '10,000,000', tone: 'err' }, { label: 'Time', value: '≈ seconds', tone: 'warn' }]
    },
    {
      title: 'An index is a sorted copy',
      focus: ['idx'],
      badges: { idx: 'email → row id' },
      body: `<p>An index stores one column (or several) in sorted order, each entry pointing back to its row. Most databases keep it as a <strong>B-tree</strong>: a shallow tree of pages where each page holds hundreds of sorted keys.</p>
             <p>Because it's sorted, the database can binary-search its way down instead of reading everything.</p>`,
      code: `CREATE INDEX users_email_idx ON users (email);`
    },
    {
      title: 'Lookup: a few page reads',
      slot: 750,
      flows: [
        { from: 'app', to: 'q', seq: 0 },
        { from: 'q', to: 'idx', label: "email = 'ana@x.io'", seq: 1 },
        { from: 'idx', to: 'tbl', label: 'row 48213', seq: 2 },
        { from: 'tbl', to: 'q', kind: 'res', seq: 3 },
        { from: 'q', to: 'app', kind: 'res', label: '1 row', seq: 4 }
      ],
      body: `<p>With a fan-out of about 500 keys per page, three or four levels cover 10 million rows. The top levels are almost always in memory, so a lookup costs one or two disk reads.</p>`,
      math: [
        'levels ≈ log₅₀₀(10,000,000)',
        '500³ = 125,000,000 > 10,000,000',
        '→ about 3 levels + 1 row fetch'
      ],
      metrics: [{ label: 'Pages read', value: '≈ 4', tone: 'res' }, { label: 'Time', value: '< 1 ms', tone: 'res' }]
    },
    {
      title: 'Composite and covering indexes',
      slot: 850,
      badges: { idx: '(user_id, created_at)' },
      flows: [
        { from: 'q', to: 'idx', label: 'user 7, newest 20', seq: 0 },
        { from: 'idx', to: 'q', kind: 'res', label: 'all columns found', seq: 1 }
      ],
      body: `<p>An index on <code>(user_id, created_at)</code> sorts by user first, then by time. It serves "orders for user 7, newest first" directly. Column order matters: it can't help a query that filters only on <code>created_at</code>.</p>
             <p>If the index contains every column the query needs, the database never touches the table. That's a <strong>covering index</strong>, and it skips the extra row fetch.</p>`,
      code: `CREATE INDEX orders_user_time ON orders (user_id, created_at DESC)
  INCLUDE (total);   -- covers SELECT total … ORDER BY created_at`
    },
    {
      title: 'Every write pays',
      states: { idx: 'hot' },
      badges: { idx: '+ 5 other indexes', tbl: 'INSERT' },
      flows: [
        { from: 'app', to: 'q', label: 'INSERT', seq: 0 },
        { from: 'q', to: 'tbl', seq: 1 },
        { from: 'q', to: 'idx', kind: 'warn', label: 'update index', seq: 1 }
      ],
      body: `<p>Each index is a separate structure that must be updated on every insert, update and delete of its columns. Six indexes can mean six extra page writes per row, plus the memory to keep them warm.</p>
             <p>Index for the queries you actually run. Drop indexes nothing uses.</p>`
    },
    {
      title: "When the index doesn't help",
      focus: ['q'],
      body: `<p>Common reasons a query ignores your index:</p>
             <ul>
               <li>A function wraps the column: <code>lower(email) = …</code> needs an index on <code>lower(email)</code>.</li>
               <li>A leading wildcard: <code>LIKE '%son'</code> can't use sorted order.</li>
               <li>Low selectivity: if a filter matches half the table, a scan is cheaper.</li>
               <li>Wrong column order in a composite index.</li>
             </ul>
             <p>Ask the database. <code>EXPLAIN</code> shows the plan it chose.</p>`,
      code: `EXPLAIN SELECT * FROM users WHERE email = 'ana@x.io';
-- Index Scan using users_email_idx on users  (rows=1)`,
      tip: 'Read the query plan before adding an index, and again after. Guessing is how tables end up with twelve indexes.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['storage-engines'] = {
  minutes: 8,
  diagram: {
    h: 480,
    nodes: [
      { id: 'app', kind: 'server', label: 'Writes', x: 95, y: 240, w: 130 },
      { id: 'wal', kind: 'queue', label: 'Write-ahead log', sub: 'append only', w: 170, x: 320, y: 240 },
      { id: 'btree', kind: 'db', label: 'B-tree pages', sub: 'update in place', w: 170, x: 580, y: 85 },
      { id: 'mem', kind: 'kv', label: 'Memtable', sub: 'sorted, in memory', w: 170, x: 580, y: 260 },
      { id: 'sst', kind: 'blob', label: 'SSTables', sub: 'immutable files', w: 164, x: 810, y: 260 },
      { id: 'cmp', kind: 'gear', label: 'Compaction', w: 150, x: 810, y: 415 }
    ],
    edges: [['app', 'wal'], ['wal', 'btree'], ['wal', 'mem'], ['mem', 'sst'], ['sst', 'cmp'], ['app', 'btree'], { a: 'app', b: 'mem', curve: 70 }]
  },
  steps: [
    {
      title: 'Two families of storage engine',
      focus: ['btree', 'mem', 'sst'],
      body: `<p>Underneath every database is a storage engine that decides how bytes are laid out on disk. Almost all of them belong to one of two families.</p>
             <p><strong>B-trees</strong> keep data in fixed-size pages and change them in place. <strong>LSM trees</strong> (log-structured merge trees) never change a file: they write new sorted files and merge them later.</p>`
    },
    {
      title: 'B-tree write: log, then update the page',
      hide: ['mem', 'sst', 'cmp'],
      slot: 900,
      badges: { btree: 'page 1043 rewritten' },
      flows: [
        { from: 'app', to: 'wal', label: 'UPDATE k=42', seq: 0 },
        { from: 'wal', to: 'btree', label: 'modify page', seq: 1 }
      ],
      body: `<p>The change is first appended to the <strong>write-ahead log</strong> (WAL) so it survives a crash. Then the engine finds the page that holds key 42 and rewrites it.</p>
             <p>If the page is full, it splits in two and the parent page is updated. Writes land at random places on disk, and a small change still rewrites a whole 8 KB page.</p>`
    },
    {
      title: 'B-tree read: one path down',
      hide: ['mem', 'sst', 'cmp', 'wal'],
      slot: 900,
      flows: [
        { from: 'app', to: 'btree', label: 'find k=42', seq: 0 },
        { from: 'btree', to: 'app', kind: 'res', label: '3 pages', seq: 1 }
      ],
      body: `<p>Every key lives in exactly one place, so a read walks root → branch → leaf. That makes read cost low and predictable, and range scans are fast because neighbouring keys sit on neighbouring pages.</p>
             <p>This is why B-trees are the default in most relational databases.</p>`,
      metrics: [{ label: 'Read', value: '≈ 3–4 pages', tone: 'res' }, { label: 'Write', value: 'random I/O', tone: 'warn' }]
    },
    {
      title: 'LSM write: append and buffer',
      hide: ['btree', 'app-btree'],
      flows: [
        { from: 'app', to: 'wal', stream: 4, period: 1300 },
        { from: 'wal', to: 'mem', stream: 4, period: 1300, offset: 0.5 }
      ],
      badges: { mem: '48 MB / 64 MB' },
      body: `<p>An LSM tree appends each write to the log, then inserts it into an in-memory sorted structure, the <strong>memtable</strong>. That's it: no disk page is read or rewritten.</p>
             <p>All disk writes are sequential appends, which disks and SSDs handle far better than random writes. Write throughput is the LSM tree's strength.</p>`
    },
    {
      title: 'Flush to immutable files',
      hide: ['btree', 'app-btree'],
      slot: 1100,
      badges: { mem: 'full → flushing', sst: 'L0: 4 files' },
      flows: [{ from: 'mem', to: 'sst', label: 'write sorted file', seq: 0 }],
      body: `<p>When the memtable fills up, it's written to disk in one go as a sorted, immutable file called an <strong>SSTable</strong>. A fresh memtable takes over.</p>
             <p>Updates and deletes are just newer entries. A delete writes a marker called a <strong>tombstone</strong>.</p>`
    },
    {
      title: 'LSM read: check newest first',
      hide: ['btree', 'app-btree'],
      slot: 800,
      badges: { sst: 'bloom filter: skip 3 files' },
      flows: [
        { from: 'app', to: 'mem', label: 'k=42?', seq: 0 },
        { from: 'mem', to: 'app', kind: 'warn', label: 'not here', seq: 1 },
        { from: 'mem', to: 'sst', label: 'check files', seq: 2 },
        { from: 'sst', to: 'mem', kind: 'res', label: 'found', seq: 3 }
      ],
      body: `<p>A key might be in the memtable or in any SSTable, so reads check them from newest to oldest. To avoid opening every file, each SSTable keeps a <strong>Bloom filter</strong>, a compact structure that says "definitely not here" or "maybe here".</p>
             <p>Reads are still more work than in a B-tree, especially for keys that don't exist.</p>`
    },
    {
      title: 'Compaction, and the trade-off',
      hide: ['btree', 'app-btree'],
      states: { cmp: 'hot' },
      badges: { cmp: 'merging 4 → 1' },
      flows: [
        { from: 'sst', to: 'cmp', stream: 3, period: 1500 },
        { from: 'cmp', to: 'sst', kind: 'res', stream: 1, period: 1500, offset: 0.5 }
      ],
      body: `<p>In the background, <strong>compaction</strong> merges SSTables, keeps only the newest version of each key and drops tombstones. It keeps reads fast and reclaims space, but uses disk bandwidth that competes with foreground work.</p>`,
      table: {
        head: ['', 'B-tree', 'LSM tree'],
        rows: [
          ['Writes', 'Random, in place', 'Sequential appends'],
          ['Reads', 'Fast, predictable', 'May check several files'],
          ['Space', 'Some empty space in pages', 'Old versions until compaction'],
          ['Background work', 'Little', 'Compaction'],
          ['Found in', 'Most relational databases', 'Cassandra, RocksDB, many time-series stores']
        ]
      },
      tip: 'Read-heavy with range scans: B-tree. Write-heavy and append-like: LSM tree.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['replication'] = {
  minutes: 8,
  diagram: {
    h: 480,
    nodes: [
      { id: 'w', kind: 'client', label: 'Writer', x: 100, y: 110, w: 130 },
      { id: 'r', kind: 'phone', label: 'Reader', x: 100, y: 380, w: 130 },
      { id: 'leader', kind: 'db', label: 'Leader', sub: 'accepts writes', x: 430, y: 245 },
      { id: 'f1', kind: 'db', label: 'Follower 1', sub: 'zone B', x: 770, y: 110 },
      { id: 'f2', kind: 'db', label: 'Follower 2', sub: 'zone C', x: 770, y: 380 }
    ],
    edges: [['w', 'leader'], ['r', 'f2'], ['leader', 'f1'], ['leader', 'f2'], ['w', 'f1'], ['f1', 'f2'], ['r', 'leader']]
  },
  steps: [
    {
      title: 'Why keep copies?',
      hide: ['w-f1', 'f1-f2', 'r-leader'],
      focus: ['leader', 'f1', 'f2'],
      body: `<p><strong>Replication</strong> keeps the same data on several machines. It buys three things:</p>
             <ul>
               <li><strong>Availability</strong>: if one machine dies, another has the data.</li>
               <li><strong>Read capacity</strong>: reads spread across copies.</li>
               <li><strong>Latency</strong>: a copy can sit close to users in another region.</li>
             </ul>
             <p>Copying data once is easy. The hard part is keeping copies in step while the data changes.</p>`
    },
    {
      title: 'One leader takes the writes',
      hide: ['w-f1', 'f1-f2', 'r-leader'],
      slot: 900,
      flows: [
        { from: 'w', to: 'leader', label: 'UPDATE', seq: 0 },
        { from: 'leader', to: 'f1', label: 'log entry', seq: 1 },
        { from: 'leader', to: 'f2', label: 'log entry', seq: 1 }
      ],
      body: `<p>In <strong>single-leader</strong> replication, all writes go to one node. It records each change in a replication log and streams the log to the followers, which apply the changes in the same order.</p>
             <p>Because one node decides the order of writes, there are no conflicts to resolve.</p>`
    },
    {
      title: 'Synchronous or asynchronous?',
      hide: ['w-f1', 'f1-f2', 'r-leader'],
      slot: 750,
      badges: { f1: 'sync', f2: 'async' },
      flows: [
        { from: 'w', to: 'leader', seq: 0 },
        { from: 'leader', to: 'f1', seq: 1 },
        { from: 'f1', to: 'leader', kind: 'res', label: 'stored', seq: 2 },
        { from: 'leader', to: 'w', kind: 'res', label: 'committed', seq: 3 },
        { from: 'leader', to: 'f2', label: 'later', seq: 4 }
      ],
      body: `<p>A <strong>synchronous</strong> follower must confirm before the write is acknowledged, so the data is on two machines when the client hears "committed". It also means a slow follower slows every write.</p>
             <p>An <strong>asynchronous</strong> follower catches up in the background. Writes stay fast, but a leader crash can lose the last few writes. A common middle ground: one sync follower, the rest async.</p>`
    },
    {
      title: 'Scale reads with followers',
      hide: ['w-f1', 'f1-f2', 'r-leader'],
      flows: [
        { from: 'r', to: 'f2', stream: 3, period: 1400 },
        { from: 'w', to: 'leader', stream: 1, period: 1400 },
        { from: 'leader', to: 'f2', stream: 1, period: 1400, offset: 0.5 }
      ],
      body: `<p>Read-heavy workloads can send reads to followers, often called <strong>read replicas</strong>. Ten replicas give roughly ten times the read capacity, while writes still go through one leader.</p>`
    },
    {
      title: 'Replication lag',
      hide: ['w-f1', 'f1-f2'],
      slot: 850,
      states: { f2: 'hot' },
      badges: { f2: 'lag: 2 s' },
      flows: [
        { from: 'w', to: 'leader', label: 'name = "Bo"', seq: 0 },
        { from: 'leader', to: 'w', kind: 'res', label: 'saved', seq: 1 },
        { from: 'r', to: 'f2', label: 'GET name', seq: 2 },
        { from: 'f2', to: 'r', kind: 'warn', label: '"Al" (old)', seq: 3 }
      ],
      body: `<p>Async followers are always a little behind, usually milliseconds, sometimes seconds under load. A user who changes their name and reloads may see the old one.</p>
             <p>Fixes: read a user's own recent writes from the leader (<strong>read-your-writes</strong>), pin each user to one replica so time never goes backwards for them (<strong>monotonic reads</strong>), or wait until a replica has reached a known log position.</p>`
    },
    {
      title: 'Failover',
      hide: ['r-f2', 'r-leader'],
      states: { leader: 'down', f1: 'ok' },
      badges: { leader: 'crashed', f1: 'promoted to leader' },
      slot: 900,
      flows: [
        { from: 'w', to: 'f1', label: 'UPDATE', seq: 0 },
        { from: 'f1', to: 'f2', label: 'log entry', seq: 1 }
      ],
      body: `<p>When the leader dies, a follower is promoted and clients are pointed at it. Done automatically, this takes seconds to tens of seconds.</p>
             <p>Two risks: with async replication, writes the old leader acknowledged but never shipped are lost. And if the old leader comes back still thinking it's in charge, you have two leaders, known as <strong>split brain</strong>. The Reliability module covers fencing.</p>`
    },
    {
      title: 'Other topologies',
      hide: ['r-f2', 'leader-f2', 'r-leader'],
      flows: [
        { from: 'w', to: 'leader', label: 'write', seq: 0 },
        { from: 'w', to: 'f1', label: 'write', seq: 0 }
      ],
      badges: { leader: 'leader EU', f1: 'leader US' },
      body: `<p><strong>Multi-leader</strong> setups accept writes in several places, such as one leader per region. They must resolve conflicts when two regions change the same record.</p>
             <p><strong>Leaderless</strong> stores send each write to several replicas and read from several. If writes need W confirmations and reads ask R replicas out of N, choosing W + R > N guarantees overlap.</p>`,
      math: ['N = 3 replicas, W = 2, R = 2', 'W + R = 4 > 3', '→ every read sees at least one up-to-date copy'],
      table: {
        head: ['Topology', 'Writes go to', 'Main headache'],
        rows: [
          ['Single-leader', 'One node', 'Failover, write ceiling'],
          ['Multi-leader', 'One per region', 'Write conflicts'],
          ['Leaderless', 'Any W of N nodes', 'Stale reads, repair']
        ]
      }
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['partitioning'] = {
  minutes: 7,
  diagram: {
    h: 500,
    nodes: [
      { id: 'users', kind: 'users', label: 'Requests', x: 100, y: 250, w: 140 },
      { id: 'router', kind: 'lb', label: 'Router', sub: 'key → shard', x: 350, y: 250 },
      { id: 'p1', kind: 'db', label: 'Shard 1', x: 690, y: 70 },
      { id: 'p2', kind: 'db', label: 'Shard 2', x: 690, y: 190 },
      { id: 'p3', kind: 'db', label: 'Shard 3', x: 690, y: 310 },
      { id: 'p4', kind: 'db', label: 'Shard 4', x: 690, y: 430 }
    ],
    edges: [['users', 'router'], ['router', 'p1'], ['router', 'p2'], ['router', 'p3'], ['router', 'p4']]
  },
  steps: [
    {
      title: 'When one machine is too small',
      hide: ['p2', 'p3', 'p4'],
      states: { p1: 'hot' },
      badges: { p1: '6 TB · 40k writes/s' },
      flows: [
        { from: 'users', to: 'router', stream: 4, period: 1200 },
        { from: 'router', to: 'p1', stream: 4, period: 1200, offset: 0.4 }
      ],
      body: `<p>Replication copies <em>all</em> the data to every node. That helps reads, but every node still stores everything and every write still goes to one leader.</p>
             <p>When the data or the write rate outgrows the largest machine, you split the data itself. Each piece is a <strong>partition</strong> or <strong>shard</strong>, and each shard is usually replicated too.</p>`
    },
    {
      title: 'Split by key range',
      slot: 900,
      badges: { p1: 'a – f', p2: 'g – m', p3: 'n – s', p4: 't – z' },
      flows: [
        { from: 'users', to: 'router', label: 'user "kim"', seq: 0 },
        { from: 'router', to: 'p2', label: 'g – m', seq: 1 }
      ],
      body: `<p><strong>Range partitioning</strong> gives each shard a contiguous slice of keys, like volumes of an encyclopedia. The router keeps a small map of boundaries.</p>
             <p>Range queries are cheap because neighbouring keys live together: "all users from ka to ke" touches one shard.</p>`
    },
    {
      title: 'The trouble with ranges',
      states: { p4: 'hot' },
      badges: { p1: 'Jan', p2: 'Feb', p3: 'Mar', p4: 'today ← every write' },
      flows: [
        { from: 'users', to: 'router', stream: 4, period: 1200 },
        { from: 'router', to: 'p4', kind: 'warn', stream: 4, period: 1200, offset: 0.4 }
      ],
      body: `<p>If the key is a timestamp, all of today's writes land on the last shard while the others sit idle. Any key that grows steadily, like auto-increment IDs, does the same thing.</p>
             <p>Ranges also drift out of balance as data grows unevenly, so shards must be split and moved over time.</p>`
    },
    {
      title: 'Split by hash',
      badges: { p1: 'hash 0 – 63', p2: 'hash 64 – 127', p3: 'hash 128 – 191', p4: 'hash 192 – 255' },
      flows: [
        { from: 'users', to: 'router', stream: 4, period: 1400 },
        { from: 'router', to: 'p1', stream: 1, period: 1400, offset: 0.1 },
        { from: 'router', to: 'p2', stream: 1, period: 1400, offset: 0.35 },
        { from: 'router', to: 'p3', stream: 1, period: 1400, offset: 0.6 },
        { from: 'router', to: 'p4', stream: 1, period: 1400, offset: 0.85 }
      ],
      body: `<p><strong>Hash partitioning</strong> runs the key through a hash function and uses the result to pick a shard. Similar keys scatter, so load spreads evenly even when keys arrive in order.</p>
             <p>The price: range queries now hit every shard. A common compromise is a compound key: hash the user ID to pick the shard, then sort by time inside it.</p>`,
      code: `shard = hash(user_id) % 4        // simple, but see the next lesson
// compound key: (hash(user_id) → shard, created_at → order within shard)`
    },
    {
      title: 'Hot keys',
      states: { p3: 'hot' },
      badges: { p3: 'user:famous · 50k req/s' },
      flows: [
        { from: 'users', to: 'router', stream: 5, period: 1200 },
        { from: 'router', to: 'p3', kind: 'err', stream: 5, period: 1200, offset: 0.4 }
      ],
      body: `<p>Hashing spreads <em>keys</em> evenly, not <em>traffic</em>. One very popular key, such as a celebrity account or a viral post, still lands on one shard.</p>
             <p>Fixes: cache the hot key in front of the database, or split it by adding a suffix (<code>post:9#0 … post:9#9</code>) so writes spread across ten shards and reads gather them back.</p>`
    },
    {
      title: 'Queries across shards',
      slot: 900,
      flows: [
        { from: 'router', to: 'p1', label: 'top 10?', seq: 0 }, { from: 'router', to: 'p2', seq: 0 },
        { from: 'router', to: 'p3', seq: 0 }, { from: 'router', to: 'p4', seq: 0 },
        { from: 'p1', to: 'router', kind: 'res', seq: 1 }, { from: 'p2', to: 'router', kind: 'res', seq: 1 },
        { from: 'p3', to: 'router', kind: 'res', seq: 1 }, { from: 'p4', to: 'router', kind: 'res', seq: 1 }
      ],
      body: `<p>Any query that doesn't include the partition key must ask every shard and merge the answers, called <strong>scatter-gather</strong>. Its latency is set by the slowest shard.</p>
             <p>Choose the partition key so your most common queries hit one shard. Avoid transactions that span shards. And create many more partitions than machines (say 1,000 partitions on 10 nodes) so rebalancing means moving whole partitions, not re-splitting data.</p>`,
      tip: 'Pick the partition key from your hottest query, and look hard at whether any single key value could get a large share of traffic.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['consistent-hashing'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'k', kind: 'kv', label: 'hash(key)', sub: 'position on ring', w: 172, x: 450, y: 240 },
      { id: 'A', kind: 'server', label: 'Node A', w: 130, x: 450, y: 64 },
      { id: 'E', kind: 'server', label: 'Node E', sub: 'new', w: 130, x: 700, y: 110 },
      { id: 'B', kind: 'server', label: 'Node B', w: 130, x: 790, y: 300 },
      { id: 'C', kind: 'server', label: 'Node C', w: 130, x: 450, y: 425 },
      { id: 'D', kind: 'server', label: 'Node D', w: 130, x: 110, y: 240 }
    ],
    edges: [
      { a: 'A', b: 'B', curve: -80 }, { a: 'B', b: 'C', curve: -60 }, { a: 'C', b: 'D', curve: -70 }, { a: 'D', b: 'A', curve: -70 },
      { a: 'A', b: 'E', curve: -25 }, { a: 'E', b: 'B', curve: -25 },
      ['k', 'A'], ['k', 'B'], ['k', 'C'], ['k', 'D'], ['k', 'E']
    ]
  },
  steps: [
    {
      title: 'Why hash % N breaks',
      hide: ['E', 'k-A', 'k-B', 'k-C', 'k-D'],
      states: { k: 'hot' },
      badges: { k: '% 4 → % 5 · 80% of keys move' },
      body: `<p>The previous lesson placed keys with <code>hash(key) % N</code>. That works until N changes. Add a fifth node and almost every key maps to a different node.</p>
             <p>For a cache, that's a sudden wave of misses. For a database, it's moving most of your data at once.</p>`,
      math: ['key hash 17: 17 % 4 = 1 → 17 % 5 = 2  (moves)', 'key hash 20: 20 % 4 = 0 → 20 % 5 = 0  (stays)', 'on average only 1 in 5 keys stays put']
    },
    {
      title: 'Put the nodes on a ring',
      hide: ['E', 'k', 'A-E', 'E-B'],
      flows: [
        { from: 'A', to: 'B', stream: 1, period: 2400 },
        { from: 'B', to: 'C', stream: 1, period: 2400, offset: 0.25 },
        { from: 'C', to: 'D', stream: 1, period: 2400, offset: 0.5 },
        { from: 'D', to: 'A', stream: 1, period: 2400, offset: 0.75 }
      ],
      body: `<p>Imagine the hash space (say 0 to 2³²) bent into a circle. Hash each node's name to get its position on the ring.</p>
             <p>Each node owns the arc of the ring that ends at its position. The ring is the only shared knowledge: every client can compute it independently.</p>`
    },
    {
      title: 'A key goes to the next node clockwise',
      hide: ['E', 'A-E', 'E-B'],
      slot: 900,
      badges: { k: '"user:42" → 0x9C…' },
      flows: [
        { from: 'k', to: 'B', label: 'next clockwise', seq: 0 }
      ],
      body: `<p>To place a key, hash it to a point on the ring and walk clockwise until you meet a node. That node owns the key.</p>
             <p>No lookup table and no coordination. Any client with the node list reaches the same answer.</p>`
    },
    {
      title: 'Adding a node moves one slice',
      hide: ['A-B', 'k'],
      states: { E: 'ok' },
      badges: { E: 'joins between A and B', B: 'gives up part of its arc' },
      flows: [{ from: 'B', to: 'E', label: '~1/5 of keys', stream: 2, period: 1600 }],
      body: `<p>Node E lands between A and B. Only keys on the arc from A to E move, and they all come from B. Nodes C and D aren't touched.</p>
             <p>On average, adding a node to a ring of N moves about 1/N of the keys, which is the minimum possible.</p>`,
      math: ['hash % N: most keys move', 'ring: about K / N keys move', 'K = 10M keys, N = 5 → ≈ 2M keys move']
    },
    {
      title: 'Removing a node',
      hide: ['A-B', 'k-A', 'k-B', 'k-D', 'k-E'],
      states: { B: 'down' },
      badges: { B: 'removed', C: 'inherits B’s arc' },
      flows: [{ from: 'k', to: 'C', kind: 'warn', label: 'walk past B', seq: 0 }],
      body: `<p>When B leaves, its keys simply belong to the next node clockwise, C. Everyone else keeps their keys.</p>
             <p>But C now carries double load. With only a handful of nodes, the ring is lumpy: arcs differ in size and a failure dumps all the load on one neighbour.</p>`
    },
    {
      title: 'Virtual nodes smooth it out',
      hide: ['k', 'A-B'],
      badges: { A: '×150 points', B: '×150 points', C: '×150 points', D: '×150 points', E: '×300 · bigger box' },
      flows: [
        { from: 'A', to: 'E', stream: 1, period: 2400 },
        { from: 'E', to: 'B', stream: 1, period: 2400, offset: 0.2 },
        { from: 'B', to: 'C', stream: 1, period: 2400, offset: 0.4 },
        { from: 'C', to: 'D', stream: 1, period: 2400, offset: 0.6 },
        { from: 'D', to: 'A', stream: 1, period: 2400, offset: 0.8 }
      ],
      body: `<p>Instead of one point per node, give each node many points on the ring (virtual nodes). Arcs even out, a departed node's load spreads across all the others, and a bigger machine can simply get more points.</p>
             <p>For replication, store each key on the next N <em>distinct</em> nodes clockwise. Distributed key-value stores, caches and some load balancers use this scheme.</p>`,
      tip: 'Reach for consistent hashing when the set of nodes changes often and moving data is expensive. Rendezvous hashing is a simpler alternative with the same property.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['id-generation'] = {
  minutes: 6,
  diagram: {
    h: 480,
    nodes: [
      { id: 'alloc', kind: 'kv', label: 'Range allocator', w: 170, x: 120, y: 240 },
      { id: 's1', kind: 'server', label: 'App 1', x: 450, y: 90 },
      { id: 's2', kind: 'server', label: 'App 2', x: 450, y: 240 },
      { id: 's3', kind: 'server', label: 'App 3', x: 450, y: 390 },
      { id: 'db', kind: 'db', label: 'Database', sub: 'AUTO_INCREMENT', w: 170, x: 780, y: 240 }
    ],
    edges: [['alloc', 's1'], ['alloc', 's2'], ['alloc', 's3'], ['s1', 'db'], ['s2', 'db'], ['s3', 'db']]
  },
  steps: [
    {
      title: 'Let the database count',
      hide: ['alloc'],
      slot: 800,
      flows: [
        { from: 's1', to: 'db', label: 'INSERT', seq: 0 },
        { from: 'db', to: 's1', kind: 'res', label: 'id = 1001', seq: 1 },
        { from: 's3', to: 'db', label: 'INSERT', seq: 2 },
        { from: 'db', to: 's3', kind: 'res', label: 'id = 1002', seq: 3 }
      ],
      body: `<p>The simplest ID is a counter the database increments on every insert. IDs are small (8 bytes), unique and in order, so new rows append neatly to the end of the index.</p>
             <p>This is the right choice for a single database, and many systems never need anything else.</p>`
    },
    {
      title: 'Where a counter hurts',
      hide: ['alloc'],
      states: { db: 'hot' },
      badges: { db: 'every insert waits here' },
      flows: [
        { from: 's1', to: 'db', stream: 3, period: 1300 },
        { from: 's2', to: 'db', stream: 3, period: 1300, offset: 0.3 },
        { from: 's3', to: 'db', stream: 3, period: 1300, offset: 0.6 }
      ],
      body: `<p>Once data is sharded, there's no single counter to ask. Each shard counting separately produces duplicates.</p>
             <p>You also can't create the ID before the insert, which complicates batching and offline clients. And sequential public IDs leak business numbers: anyone can see you created 312 orders yesterday, and guess other users' IDs.</p>`
    },
    {
      title: 'Random UUIDs: no coordination',
      hide: ['alloc'],
      badges: { s1: 'f47ac10b-58cc…', s2: '9b1deb4d-3b7d…', s3: '1c6a7e52-0f3a…' },
      flows: [
        { from: 's1', to: 'db', seq: 0 }, { from: 's2', to: 'db', seq: 0 }, { from: 's3', to: 'db', seq: 0 }
      ],
      body: `<p>A version-4 UUID is 122 random bits. Any machine can create one locally, and the chance of a collision is negligible: you'd need billions of IDs per second for decades to expect one.</p>
             <p>The costs: 16 bytes instead of 8, and random order. New rows land in random places in a B-tree index, which causes page splits and poor cache use on large tables.</p>`
    },
    {
      title: 'Hand out ranges',
      slot: 900,
      badges: { s1: 'using 1000–1999', s2: 'using 2000–2999', s3: 'using 3000–3999' },
      flows: [
        { from: 'alloc', to: 's1', label: '1000–1999', seq: 0 },
        { from: 'alloc', to: 's2', label: '2000–2999', seq: 1 },
        { from: 'alloc', to: 's3', label: '3000–3999', seq: 2 }
      ],
      body: `<p>A central allocator gives each server a block of IDs. The server assigns them from memory and only asks again when the block runs out, so the allocator sees one request per thousand IDs.</p>
             <p>IDs stay small and roughly ordered. A server that crashes leaves gaps, which is fine: IDs need to be unique, not consecutive.</p>`
    },
    {
      title: 'Time-ordered IDs',
      hide: ['alloc'],
      badges: { s1: 'machine 1', s2: 'machine 2', s3: 'machine 3' },
      flows: [
        { from: 's1', to: 'db', stream: 2, period: 1600 },
        { from: 's2', to: 'db', stream: 2, period: 1600, offset: 0.33 },
        { from: 's3', to: 'db', stream: 2, period: 1600, offset: 0.66 }
      ],
      body: `<p>Pack a timestamp, a machine number and a per-millisecond sequence into one 64-bit integer. Each machine generates IDs alone, and sorting by ID sorts by creation time.</p>
             <p>UUIDv7 and ULID apply the same idea in 128 bits: a timestamp prefix followed by random bits.</p>`,
      code: `| 1 bit | 41 bits: ms since epoch | 10 bits: machine | 12 bits: sequence |
  0       0x18C3A5F2E1               0x003              0x07A`,
      math: ['2¹² = 4,096 IDs per ms per machine', '2¹⁰ = 1,024 machines', '2⁴¹ ms ≈ 69 years of timestamps']
    },
    {
      title: 'Pitfalls and picking one',
      hide: ['alloc'],
      states: { s2: 'hot' },
      badges: { s2: 'clock jumped back 40 ms' },
      body: `<p>Time-based IDs trust the clock. If it jumps backwards, a machine could repeat IDs, so the generator must wait or refuse until time catches up. Machine numbers must also be unique, which needs some coordination at startup.</p>`,
      table: {
        head: ['Scheme', 'Size', 'Ordered', 'Coordination'],
        rows: [
          ['Auto-increment', '8 B', 'Yes', 'Every insert'],
          ['Random UUID (v4)', '16 B', 'No', 'None'],
          ['Range blocks', '8 B', 'Roughly', 'Once per block'],
          ['Timestamp + machine + seq', '8 B', 'By time', 'Machine number at startup'],
          ['UUIDv7 / ULID', '16 B', 'By time', 'None']
        ]
      },
      tip: 'Use time-ordered IDs for big tables that are written fast, and keep public-facing IDs unguessable.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['consistency-models'] = {
  minutes: 7,
  diagram: {
    h: 460,
    nodes: [
      { id: 'a', kind: 'client', label: 'Alice', sub: 'Lisbon', x: 110, y: 100, w: 140 },
      { id: 'b', kind: 'phone', label: 'Bob', sub: 'Chicago', x: 110, y: 360, w: 140 },
      { id: 'eu', kind: 'db', label: 'Replica EU', x: 500, y: 100 },
      { id: 'us', kind: 'db', label: 'Replica US', x: 500, y: 360 },
      { id: 'note', kind: 'chart', label: 'Account', sub: 'balance', w: 140, x: 800, y: 230 }
    ],
    edges: [['a', 'eu'], ['b', 'us'], ['eu', 'us'], ['eu', 'note'], ['us', 'note']]
  },
  steps: [
    {
      title: 'Copies are briefly different',
      hide: ['note'],
      slot: 900,
      badges: { eu: 'balance = 50', us: 'balance = 80 → 50' },
      flows: [
        { from: 'a', to: 'eu', label: 'withdraw 30', seq: 0 },
        { from: 'eu', to: 'us', label: 'replicate', seq: 1 }
      ],
      body: `<p>With data in two regions, every write takes time to reach the other copy, around 50–100 ms across an ocean. During that window, the two replicas give different answers.</p>
             <p>A <strong>consistency model</strong> is the promise a system makes about what readers may see during that window.</p>`
    },
    {
      title: 'Then the network splits',
      hide: ['note'],
      states: { eu: 'hot', us: 'hot' },
      badges: { eu: "can't reach US", us: "can't reach EU" },
      flows: [{ from: 'eu', to: 'us', kind: 'err', label: 'no route', seq: 0 }],
      body: `<p>Networks fail: a cable cut, a misconfigured router, a cloud region hiccup. Both replicas are running and serving clients, but they can't talk to each other. This is a <strong>network partition</strong>.</p>
             <p>The <strong>CAP theorem</strong> says that during a partition, a replicated system must choose between consistency and availability. It can't promise both.</p>`
    },
    {
      title: 'Choose consistency',
      hide: ['note'],
      slot: 900,
      states: { us: 'down' },
      badges: { us: 'refusing: may be stale' },
      flows: [
        { from: 'b', to: 'us', label: 'read balance', seq: 0 },
        { from: 'us', to: 'b', kind: 'err', label: '503 try later', seq: 1 }
      ],
      body: `<p>A <strong>CP</strong> system refuses to answer when it can't confirm it has the latest data. Usually the side holding a majority of replicas keeps working and the minority side returns errors.</p>
             <p>Nobody ever sees a wrong balance, but some users see errors until the network heals. This suits money, inventory and anything that must not be double-spent.</p>`
    },
    {
      title: 'Choose availability',
      hide: ['note'],
      slot: 900,
      badges: { us: 'answering from local copy' },
      flows: [
        { from: 'b', to: 'us', label: 'read balance', seq: 0 },
        { from: 'us', to: 'b', kind: 'warn', label: '80 (stale)', seq: 1 }
      ],
      body: `<p>An <strong>AP</strong> system keeps answering from whatever it has. Everyone gets a response, but some responses are out of date, and both sides may accept conflicting writes.</p>
             <p>When the partition heals, the conflicts must be merged: last write wins (simple, but it silently drops data), keep all versions for the app to resolve, or use data types designed to merge (CRDTs). This suits likes, carts and presence.</p>`
    },
    {
      title: 'Most of the time: latency vs consistency',
      flows: [
        { from: 'a', to: 'eu', seq: 0 },
        { from: 'eu', to: 'us', label: 'wait for ack', seq: 1 },
        { from: 'us', to: 'eu', kind: 'res', seq: 2 },
        { from: 'eu', to: 'a', kind: 'res', label: 'done', seq: 3 }
      ],
      hide: ['note'],
      body: `<p>Partitions are rare. The everyday trade-off is speed: waiting for the other region to confirm every write adds a full cross-ocean round trip.</p>
             <p>The PACELC framing states both halves: if Partitioned, choose Availability or Consistency; Else, choose Latency or Consistency.</p>`,
      metrics: [{ label: 'Local write', value: '≈ 2 ms', tone: 'res' }, { label: 'Confirmed in 2 regions', value: '≈ 90 ms', tone: 'warn' }]
    },
    {
      title: 'A spectrum, not a switch',
      focus: ['eu', 'us', 'note'],
      body: `<p>Between "always perfectly up to date" and "eventually the same", there are useful promises. Weaker models are cheaper and faster; pick the weakest one your feature can live with.</p>`,
      table: {
        head: ['Model', 'Promise', 'Example need'],
        rows: [
          ['Linearizable', 'Acts like one copy; reads see the latest write', 'Locks, balances, unique usernames'],
          ['Causal', 'Effects never appear before their causes', 'A reply never shows before the comment'],
          ['Read-your-writes', 'You always see your own changes', 'Editing your profile'],
          ['Monotonic reads', 'Your view never goes backwards', 'Refreshing a timeline'],
          ['Eventual', 'Copies converge if writes stop', 'View counts, likes']
        ]
      },
      tip: 'CAP is about partitions only. Ask "what should this feature do when replicas disagree?" and decide per feature, not per database.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['consensus'] = {
  minutes: 8,
  diagram: {
    h: 500,
    nodes: [
      { id: 'n1', kind: 'server', label: 'Node 1', w: 130, x: 450, y: 60 },
      { id: 'n2', kind: 'server', label: 'Node 2', w: 130, x: 740, y: 190 },
      { id: 'n3', kind: 'server', label: 'Node 3', w: 130, x: 620, y: 430 },
      { id: 'n4', kind: 'server', label: 'Node 4', w: 130, x: 280, y: 430 },
      { id: 'n5', kind: 'server', label: 'Node 5', w: 130, x: 160, y: 190 },
      { id: 'cl', kind: 'client', label: 'Client', w: 120, x: 830, y: 430 }
    ],
    edges: [
      ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n4'], ['n1', 'n5'],
      ['n3', 'n2'], ['n3', 'n4'], ['n3', 'n5'],
      ['cl', 'n3']
    ]
  },
  steps: [
    {
      title: 'Agreeing on one leader and one log',
      hide: ['cl'],
      states: { n1: 'ok' },
      badges: { n1: 'leader · term 1' },
      flows: [
        { from: 'n1', to: 'n2', label: 'heartbeat', stream: 1, period: 1500 },
        { from: 'n1', to: 'n3', stream: 1, period: 1500 },
        { from: 'n1', to: 'n4', stream: 1, period: 1500 },
        { from: 'n1', to: 'n5', stream: 1, period: 1500 }
      ],
      body: `<p>Replicas only stay identical if they apply the same changes in the same order. <strong>Consensus</strong> algorithms such as Raft and Paxos let a group of machines agree on that order, even when some of them crash.</p>
             <p>In Raft, one node is the <strong>leader</strong>. It sends regular heartbeats so the others know it's alive.</p>`
    },
    {
      title: 'The leader goes quiet',
      hide: ['cl'],
      states: { n1: 'down' },
      badges: { n2: 'timeout 210 ms', n3: 'timeout 160 ms', n4: 'timeout 280 ms', n5: 'timeout 245 ms' },
      body: `<p>Node 1 crashes and the heartbeats stop. Each follower waits for a <strong>random</strong> election timeout, typically 150–300 ms.</p>
             <p>The randomness matters: it makes it likely that one node times out first and asks for votes before the others start competing.</p>`
    },
    {
      title: 'Ask for votes',
      hide: ['cl'],
      slot: 900,
      states: { n1: 'down', n3: 'hot' },
      badges: { n3: 'candidate · term 2' },
      flows: [
        { from: 'n3', to: 'n2', label: 'vote for me?', seq: 0 }, { from: 'n3', to: 'n4', seq: 0 }, { from: 'n3', to: 'n5', seq: 0 },
        { from: 'n3', to: 'n1', kind: 'err', seq: 0 },
        { from: 'n2', to: 'n3', kind: 'res', label: 'yes', seq: 1 }, { from: 'n4', to: 'n3', kind: 'res', label: 'yes', seq: 1 },
        { from: 'n5', to: 'n3', kind: 'res', label: 'yes', seq: 1 }
      ],
      body: `<p>Node 3 times out first. It increments the <strong>term</strong> number to 2, votes for itself and asks everyone else. Each node grants at most one vote per term, and only to a candidate whose log is at least as up to date as its own.</p>
             <p>With 4 of 5 votes, node 3 has a majority and becomes leader for term 2.</p>`
    },
    {
      title: 'Commit by majority',
      states: { n1: 'down', n3: 'ok' },
      badges: { n3: 'leader · term 2' },
      slot: 800,
      flows: [
        { from: 'cl', to: 'n3', label: 'SET x = 5', seq: 0 },
        { from: 'n3', to: 'n2', label: 'append #7', seq: 1 }, { from: 'n3', to: 'n4', seq: 1 }, { from: 'n3', to: 'n5', seq: 1 },
        { from: 'n2', to: 'n3', kind: 'res', label: 'ok', seq: 2 }, { from: 'n4', to: 'n3', kind: 'res', seq: 2 },
        { from: 'n3', to: 'cl', kind: 'res', label: 'committed', seq: 3 }
      ],
      body: `<p>Clients send commands to the leader. It appends the command to its log, sends it to the followers, and as soon as a <strong>majority</strong> (itself plus two others) has stored it, the entry is <strong>committed</strong>. Then every node applies it in log order.</p>
             <p>Any future leader must win votes from a majority, and any two majorities overlap, so a committed entry can never be lost.</p>`
    },
    {
      title: 'No split brain',
      hide: ['cl'],
      states: { n1: 'hot', n3: 'ok' },
      badges: { n1: 'back · thinks term 1', n3: 'leader · term 2' },
      slot: 900,
      flows: [
        { from: 'n1', to: 'n5', label: 'append (term 1)', seq: 0 },
        { from: 'n5', to: 'n1', kind: 'err', label: 'rejected: term 2', seq: 1 }
      ],
      body: `<p>Node 1 restarts and still believes it's the leader. It tries to replicate, but every node it reaches has seen term 2 and rejects it. Node 1 sees the higher term and steps down to follower.</p>
             <p>Even if node 1 were cut off with one friend, two nodes aren't a majority of five. It could never commit anything.</p>`
    },
    {
      title: 'Majority math',
      hide: ['cl'],
      states: { n1: 'down', n2: 'down', n3: 'ok' },
      badges: { n3: '3 of 5 alive → still works' },
      flows: [
        { from: 'n3', to: 'n4', stream: 1, period: 1500 },
        { from: 'n3', to: 'n5', stream: 1, period: 1500, offset: 0.5 }
      ],
      body: `<p>A cluster of 2f + 1 nodes keeps working with f failures. Even sizes add cost without adding tolerance: 4 nodes survive the same single failure as 3.</p>`,
      table: {
        head: ['Cluster size', 'Majority', 'Failures tolerated'],
        rows: [['3', '2', '1'], ['4', '3', '1'], ['5', '3', '2'], ['7', '4', '3']]
      }
    },
    {
      title: 'Where you meet consensus',
      hide: ['cl'],
      states: { n3: 'ok' },
      badges: { n3: 'leader' },
      flows: [
        { from: 'n3', to: 'n2', stream: 1, period: 1600 }, { from: 'n3', to: 'n4', stream: 1, period: 1600, offset: 0.33 },
        { from: 'n3', to: 'n5', stream: 1, period: 1600, offset: 0.66 }, { from: 'n3', to: 'n1', stream: 1, period: 1600, offset: 0.5 }
      ],
      body: `<p>You rarely implement consensus yourself. You use systems built on it: coordination services such as etcd, ZooKeeper and Consul, and the replication layer inside many modern databases.</p>
             <p>Typical uses: electing a leader for a job, distributed locks and leases, cluster membership, and configuration every node must agree on. Each write costs a majority round trip, so keep these stores small and the traffic light.</p>`,
      tip: 'A lock from a coordination service can expire while its holder is paused. Pass a fencing token (an increasing number) with every write so storage can reject stale holders.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['isolation'] = {
  minutes: 8,
  diagram: {
    h: 460,
    nodes: [
      { id: 'ta', kind: 'server', label: 'Transaction A', w: 170, x: 130, y: 100 },
      { id: 'tb', kind: 'server', label: 'Transaction B', w: 170, x: 130, y: 360 },
      { id: 'db', kind: 'db', label: 'Database', sub: 'accounts', w: 170, x: 520, y: 230 },
      { id: 'wal', kind: 'queue', label: 'Log on disk', w: 150, x: 800, y: 230 }
    ],
    edges: [['ta', 'db'], ['tb', 'db'], ['db', 'wal']]
  },
  steps: [
    {
      title: 'ACID in one breath',
      hide: ['tb'],
      slot: 750,
      flows: [
        { from: 'ta', to: 'db', label: 'BEGIN', seq: 0 },
        { from: 'ta', to: 'db', label: 'debit A', seq: 1 },
        { from: 'ta', to: 'db', label: 'credit B', seq: 2 },
        { from: 'ta', to: 'db', label: 'COMMIT', seq: 3 },
        { from: 'db', to: 'wal', label: 'fsync', seq: 4 }
      ],
      body: `<p>A transaction groups several operations so they behave as one.</p>`,
      table: {
        head: ['', 'Means'],
        rows: [
          ['Atomic', 'All of it happens or none of it does'],
          ['Consistent', 'Rules (constraints) hold before and after'],
          ['Isolated', 'Concurrent transactions don\'t see each other\'s half-done work'],
          ['Durable', 'Once committed, it survives a crash']
        ]
      },
      tip: 'Isolation is the letter with the most fine print. Databases offer several levels, and the default is rarely the strictest.'
    },
    {
      title: 'Dirty reads',
      slot: 850,
      badges: { db: 'balance 100 → 0 (uncommitted)' },
      flows: [
        { from: 'ta', to: 'db', label: 'UPDATE bal = 0', seq: 0 },
        { from: 'tb', to: 'db', label: 'SELECT bal', seq: 1 },
        { from: 'db', to: 'tb', kind: 'warn', label: '0', seq: 2 },
        { from: 'ta', to: 'db', kind: 'err', label: 'ROLLBACK', seq: 3 }
      ],
      body: `<p>B reads A's change before A commits. Then A rolls back, so B acted on a value that never officially existed.</p>
             <p><strong>Read committed</strong>, the default in many databases, prevents this: you only ever see committed data.</p>`
    },
    {
      title: 'Snapshots and MVCC',
      slot: 850,
      badges: { db: 'v1: 100 · v2: 70' },
      flows: [
        { from: 'tb', to: 'db', label: 'SELECT (t=1)', seq: 0 },
        { from: 'ta', to: 'db', label: 'UPDATE → 70, COMMIT', seq: 1 },
        { from: 'tb', to: 'db', label: 'SELECT again', seq: 2 },
        { from: 'db', to: 'tb', kind: 'res', label: 'still 100', seq: 3 }
      ],
      body: `<p>Under read committed, reading the same row twice in one transaction can return different values, which breaks reports and backups that need a stable view.</p>
             <p><strong>Snapshot isolation</strong> gives each transaction a frozen view as of its start. Databases do this with <strong>MVCC</strong>: keep several versions of each row and show each transaction the right one. Readers never block writers.</p>`
    },
    {
      title: 'Lost updates',
      slot: 750,
      states: { db: 'hot' },
      badges: { db: '100 + 10 + 10 = 110 ?!' },
      flows: [
        { from: 'ta', to: 'db', label: 'read 100', seq: 0 }, { from: 'tb', to: 'db', label: 'read 100', seq: 0 },
        { from: 'ta', to: 'db', label: 'write 110', seq: 1 }, { from: 'tb', to: 'db', kind: 'err', label: 'write 110', seq: 2 }
      ],
      body: `<p>Two transactions read a counter, add 10 in application code and write it back. One increment vanishes.</p>
             <p>Fixes: let the database do the arithmetic atomically, lock the row while you work, or write only if the value hasn't changed (compare-and-set).</p>`,
      code: `-- atomic
UPDATE accounts SET bal = bal + 10 WHERE id = 1;

-- explicit lock
SELECT bal FROM accounts WHERE id = 1 FOR UPDATE;

-- compare-and-set
UPDATE accounts SET bal = 110, ver = 8 WHERE id = 1 AND ver = 7;`
    },
    {
      title: 'Write skew',
      slot: 850,
      badges: { ta: 'Dr. A goes off call', tb: 'Dr. B goes off call', db: 'on call: 0 !' },
      flows: [
        { from: 'ta', to: 'db', label: 'count on call = 2 ✓', seq: 0 }, { from: 'tb', to: 'db', label: 'count = 2 ✓', seq: 0 },
        { from: 'ta', to: 'db', label: 'set A off', seq: 1 }, { from: 'tb', to: 'db', kind: 'err', label: 'set B off', seq: 1 }
      ],
      body: `<p>The rule: at least one doctor stays on call. Both transactions check the rule, both see two doctors, and each removes a <em>different</em> row. No row was written twice, so snapshot isolation sees no conflict, yet the rule is broken.</p>
             <p>Only <strong>serializable</strong> isolation catches this in general, or an explicit lock on the rows that the check depends on.</p>`
    },
    {
      title: 'Choosing a level',
      focus: ['db'],
      body: `<p>Stricter levels prevent more anomalies but cost throughput, through more locking or more transactions aborted and retried.</p>`,
      table: {
        head: ['Level', 'Dirty read', 'Changing reads', 'Lost update', 'Write skew'],
        rows: [
          ['Read uncommitted', 'possible', 'possible', 'possible', 'possible'],
          ['Read committed', '—', 'possible', 'possible', 'possible'],
          ['Snapshot / repeatable read', '—', '—', 'often prevented', 'possible'],
          ['Serializable', '—', '—', '—', '—']
        ]
      },
      tip: "Know your database's default level and what it actually prevents. Names vary between products, so read the docs, not just the label."
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['blob-storage'] = {
  minutes: 7,
  diagram: {
    h: 500,
    nodes: [
      { id: 'user', kind: 'phone', label: 'App', x: 110, y: 140, w: 130 },
      { id: 'cdn', kind: 'edge', label: 'CDN', x: 110, y: 400, w: 130 },
      { id: 'api', kind: 'server', label: 'API', x: 390, y: 70 },
      { id: 'store', kind: 'blob', label: 'Object storage', sub: 'bucket / key', w: 170, x: 400, y: 300 },
      { id: 'db', kind: 'db', label: 'Metadata DB', x: 700, y: 70 },
      { id: 'q', kind: 'queue', label: 'Events', x: 700, y: 240 },
      { id: 'worker', kind: 'gear', label: 'Worker', sub: 'resize · transcode', w: 186, x: 700, y: 420 }
    ],
    edges: [['user', 'api'], ['user', 'store'], ['cdn', 'user'], ['cdn', 'store'], ['api', 'db'], ['store', 'q'], ['q', 'worker'], ['worker', 'store'], { a: 'worker', b: 'db', curve: 190 }]
  },
  steps: [
    {
      title: "Big files don't belong in your database",
      hide: ['store', 'cdn', 'q', 'worker'],
      states: { api: 'hot', db: 'hot' },
      badges: { api: '40 MB upload in progress', db: 'table: 2 TB of video' },
      flows: [
        { from: 'user', to: 'api', label: 'POST video', stream: 3, period: 1500 },
        { from: 'api', to: 'db', stream: 2, period: 1500, offset: 0.4 }
      ],
      body: `<p>Storing photos and videos inside the database bloats backups, slows replication and wastes expensive memory. Streaming them through app servers ties up workers for the whole upload.</p>
             <p>Images, video, documents and backups are <strong>blobs</strong>: large, opaque, written once and read many times.</p>`
    },
    {
      title: 'Object storage',
      hide: ['cdn', 'q', 'worker', 'user-store'],
      focus: ['store'],
      badges: { store: 'photos/u7/9f3c.jpg' },
      body: `<p>Object storage keeps files under a key in a flat namespace and serves them over HTTP. It's cheap per gigabyte, scales without planning, and copies data across devices and zones for very high durability.</p>
             <p>Objects are replaced, not edited. Keep searchable facts (owner, size, status) in your database, and only the key that points at the file.</p>`,
      code: `PUT  /photos/u7/9f3c.jpg     (bytes)
GET  /photos/u7/9f3c.jpg
DELETE /photos/u7/9f3c.jpg

-- database row
photos(id, owner_id, key='photos/u7/9f3c.jpg', status, bytes)`
    },
    {
      title: 'Upload straight to storage',
      hide: ['cdn', 'q', 'worker'],
      slot: 850,
      flows: [
        { from: 'user', to: 'api', label: 'I want to upload', seq: 0 },
        { from: 'api', to: 'db', label: 'row: pending', seq: 1 },
        { from: 'api', to: 'user', kind: 'res', label: 'signed URL · 15 min', seq: 2 },
        { from: 'user', to: 'store', label: 'PUT 40 MB', seq: 3 },
        { from: 'store', to: 'user', kind: 'res', label: '200', seq: 4 }
      ],
      body: `<p>The API checks permissions and returns a <strong>pre-signed URL</strong>: a link that allows one specific upload, to one key, for a short time. The app sends the bytes directly to storage.</p>
             <p>Your servers handle a tiny request instead of a 40 MB stream.</p>`
    },
    {
      title: 'Process in the background',
      hide: ['cdn'],
      slot: 800,
      badges: { worker: '3 sizes + thumbnail' },
      flows: [
        { from: 'store', to: 'q', label: 'object created', seq: 0 },
        { from: 'q', to: 'worker', seq: 1 },
        { from: 'worker', to: 'store', label: 'write variants', seq: 2 },
        { from: 'worker', to: 'db', kind: 'res', label: 'status = ready', seq: 3 }
      ],
      body: `<p>Storage emits an event when the upload lands. Workers pick it up, generate thumbnails or transcode video, write the results back as new objects, and mark the record ready.</p>
             <p>The user's upload finishes immediately. Heavy work scales separately, and retries are safe because the original never changes.</p>`
    },
    {
      title: 'Serve through a CDN',
      hide: ['q', 'worker', 'user-store'],
      flows: [
        { from: 'cdn', to: 'user', kind: 'res', stream: 3, period: 1400 },
        { from: 'store', to: 'cdn', kind: 'res', stream: 1, period: 2800 }
      ],
      badges: { cdn: 'hit 97%' },
      body: `<p>Put the CDN in front of the bucket so popular files are served from the edge. For private files, the API hands out short-lived signed download URLs, and the CDN checks the signature.</p>`
    },
    {
      title: 'Large files and old files',
      hide: ['cdn', 'q', 'worker'],
      slot: 650,
      flows: [
        { from: 'user', to: 'store', label: 'part 1', seq: 0 }, { from: 'user', to: 'store', label: 'part 2', seq: 1 },
        { from: 'user', to: 'store', kind: 'warn', label: 'part 3 (retry)', seq: 2 }, { from: 'user', to: 'store', label: 'complete', seq: 3 }
      ],
      body: `<p>A few more tools come up in designs that handle a lot of media:</p>`,
      table: {
        head: ['Need', 'Use'],
        rows: [
          ['Multi-GB uploads on flaky networks', 'Multipart / resumable upload: retry only the failed part'],
          ['Old files rarely read', 'Lifecycle rules move them to cheaper storage tiers'],
          ['Same file uploaded many times', 'Key by content hash to deduplicate'],
          ['Undo accidental deletes', 'Object versioning'],
          ['Find files by owner or date', 'Query the metadata DB, not storage listings']
        ]
      }
    }
  ]
};
