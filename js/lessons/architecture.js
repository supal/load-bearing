/* Module 6: Architecture. All numbers are illustrative orders of magnitude. */
window.LESSONS = window.LESSONS || {};

/* ------------------------------------------------------------------ */
const MICRO = ['gw', 'su', 'so', 'sb', 'du', 'do', 'db_b', 'legacy', 'ldb'];
LESSONS['service-boundaries'] = {
  minutes: 8,
  diagram: {
    h: 500,
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', x: 90, y: 250, w: 130 },
      { id: 'mono', kind: 'server', label: 'Monolith', sub: 'users · orders · billing', w: 230, x: 430, y: 250 },
      { id: 'mdb', kind: 'db', label: 'Database', x: 770, y: 250 },
      { id: 'gw', kind: 'lb', label: 'API gateway', x: 310, y: 250 },
      { id: 'su', kind: 'server', label: 'Users', x: 560, y: 80 },
      { id: 'so', kind: 'server', label: 'Orders', x: 560, y: 250 },
      { id: 'sb', kind: 'server', label: 'Billing', x: 560, y: 420 },
      { id: 'legacy', kind: 'server', label: 'Monolith', sub: 'shrinking', x: 560, y: 420 },
      { id: 'du', kind: 'db', label: 'Users DB', w: 150, x: 800, y: 80 },
      { id: 'do', kind: 'db', label: 'Orders DB', w: 150, x: 800, y: 250 },
      { id: 'db_b', kind: 'db', label: 'Billing DB', w: 150, x: 800, y: 420 },
      { id: 'ldb', kind: 'db', label: 'Legacy DB', w: 150, x: 800, y: 420 }
    ],
    edges: [
      ['users', 'mono'], ['mono', 'mdb'], ['users', 'gw'], ['gw', 'su'], ['gw', 'so'], ['gw', 'sb'],
      ['su', 'du'], ['so', 'do'], ['sb', 'db_b'], ['so', 'sb'], ['so', 'su'], ['gw', 'legacy'], ['legacy', 'ldb']
    ]
  },
  steps: [
    {
      title: 'The monolith',
      hide: MICRO,
      slot: 800,
      flows: [
        { from: 'users', to: 'mono', seq: 0 }, { from: 'mono', to: 'mdb', seq: 1 },
        { from: 'mdb', to: 'mono', kind: 'res', seq: 2 }, { from: 'mono', to: 'users', kind: 'res', seq: 3 }
      ],
      body: `<p>A monolith is one deployable application containing every feature, usually backed by one database. Calls between features are function calls: fast and reliable. A checkout that touches users, orders and billing is one database transaction.</p>
             <p>It's the right starting point for most products and small teams.</p>`
    },
    {
      title: 'When it starts to hurt',
      hide: MICRO,
      states: { mono: 'hot' },
      badges: { mono: '60 engineers · 1 deploy a week' },
      flows: [{ from: 'users', to: 'mono', stream: 4, period: 1400 }],
      body: `<p>The pain is usually organisational before it's technical. Many teams change the same codebase, so releases need coordination, builds and tests take an hour, and one team's bug rolls back everyone's work.</p>
             <p>Everything scales together too: a memory-hungry report feature forces bigger machines for the whole app.</p>
             <p>A first step that's often enough is a <strong>modular monolith</strong>: strict internal module boundaries, still one deployment.</p>`
    },
    {
      title: 'Split by business capability',
      hide: ['mono', 'mdb', 'legacy', 'ldb'],
      slot: 900,
      flows: [
        { from: 'users', to: 'gw', seq: 0 },
        { from: 'gw', to: 'su', seq: 1 }, { from: 'gw', to: 'so', seq: 1 }, { from: 'gw', to: 'sb', seq: 1 },
        { from: 'su', to: 'du', seq: 2 }, { from: 'so', to: 'do', seq: 2 }, { from: 'sb', to: 'db_b', seq: 2 }
      ],
      body: `<p>Microservices split the system into small services, each owning one business capability <em>and its data</em>. Each team deploys its service on its own schedule and scales it independently.</p>
             <p>The rule that makes it work: no service reads another service's database. Data is shared only through APIs or events.</p>`
    },
    {
      title: 'The network tax',
      hide: ['mono', 'mdb', 'legacy', 'ldb'],
      slot: 850,
      states: { sb: 'hot' },
      badges: { sb: 'slow deploy in progress' },
      flows: [
        { from: 'gw', to: 'so', label: 'checkout', seq: 0 },
        { from: 'so', to: 'su', label: 'get address', seq: 1 },
        { from: 'so', to: 'sb', label: 'charge', seq: 2 },
        { from: 'sb', to: 'so', kind: 'err', label: 'timeout', seq: 3 }
      ],
      body: `<p>What used to be a function call is now a network call that can be slow, fail or partly succeed. The checkout transaction now spans three databases, which needs a saga (two lessons ahead).</p>
             <p>You also need service discovery, tracing, versioned APIs and on-call for every service. Microservices trade code complexity for operational complexity.</p>`
    },
    {
      title: 'Drawing good boundaries',
      hide: ['mono', 'mdb', 'legacy', 'ldb'],
      focus: ['su', 'so', 'sb'],
      body: `<p>Group things that change together; separate things that change for different reasons. A boundary is in the wrong place if most features need coordinated changes on both sides, or if two services make dozens of calls to each other per request.</p>`,
      table: {
        head: ['Healthy sign', 'Warning sign'],
        rows: [
          ['One team owns it end to end', 'Several teams must agree on every change'],
          ['Owns its data outright', 'Shares tables with another service'],
          ['Few, coarse calls to others', 'Chatty calls on every request'],
          ['Deploys alone', 'Must deploy in lockstep with another service']
        ]
      }
    },
    {
      title: 'Migrate gradually',
      hide: ['mono', 'mdb', 'su', 'sb', 'du', 'db_b', 'so-sb', 'so-su'],
      slot: 900,
      badges: { gw: 'route by path' },
      flows: [
        { from: 'users', to: 'gw', seq: 0 },
        { from: 'gw', to: 'so', label: '/orders/*', seq: 1 },
        { from: 'gw', to: 'legacy', label: 'everything else', seq: 1 },
        { from: 'so', to: 'do', seq: 2 }, { from: 'legacy', to: 'ldb', seq: 2 }
      ],
      body: `<p>Rewriting a monolith in one go rarely ends well. Instead, put a routing layer in front, extract one capability at a time, and send its traffic to the new service. The monolith shrinks until little or nothing is left. This is the <strong>strangler fig</strong> pattern.</p>`,
      tip: 'Split when team coordination is the bottleneck, not because the codebase is big. A clean monolith beats a tangle of services.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['discovery'] = {
  minutes: 6,
  diagram: {
    h: 520,
    nodes: [
      { id: 'caller', kind: 'server', label: 'Checkout', x: 120, y: 250, w: 150 },
      { id: 'reg', kind: 'kv', label: 'Registry', sub: 'name → instances', w: 180, x: 440, y: 70 },
      { id: 'i1', kind: 'server', label: 'Payments #1', sub: '10.0.3.7', w: 170, x: 780, y: 130 },
      { id: 'i2', kind: 'server', label: 'Payments #2', sub: '10.0.5.2', w: 170, x: 780, y: 280 },
      { id: 'i3', kind: 'server', label: 'Payments #3', sub: '10.0.8.4', w: 170, x: 780, y: 430 },
      { id: 'lb', kind: 'lb', label: 'Load balancer', sub: 'payments.internal', w: 180, x: 440, y: 460 }
    ],
    edges: [
      ['caller', 'reg'], ['i1', 'reg'], ['i2', 'reg'], ['i3', 'reg'],
      ['caller', 'i1'], ['caller', 'i2'], ['caller', 'i3'],
      ['caller', 'lb'], ['lb', 'i1'], ['lb', 'i2'], ['lb', 'i3']
    ]
  },
  steps: [
    {
      title: 'Addresses keep changing',
      hide: ['reg', 'lb'],
      states: { i1: 'down' },
      badges: { i1: 'replaced · new IP', caller: 'config: 10.0.3.7' },
      slot: 900,
      flows: [
        { from: 'caller', to: 'i1', label: 'connect 10.0.3.7', seq: 0 },
        { from: 'i1', to: 'caller', kind: 'err', label: 'refused', seq: 1 }
      ],
      body: `<p>In modern infrastructure, instances come and go constantly: autoscaling adds them, deploys replace them, failures kill them. Each new instance gets a new address.</p>
             <p>An IP address in a config file is wrong within hours. Services need a way to find each other by name.</p>`
    },
    {
      title: 'Instances register themselves',
      hide: ['lb', 'caller-i1', 'caller-i2', 'caller-i3'],
      badges: { reg: 'payments: 3 healthy' },
      flows: [
        { from: 'i1', to: 'reg', label: 'heartbeat', stream: 1, period: 1600 },
        { from: 'i2', to: 'reg', stream: 1, period: 1600, offset: 0.33 },
        { from: 'i3', to: 'reg', stream: 1, period: 1600, offset: 0.66 }
      ],
      body: `<p>A <strong>service registry</strong> holds the current list of healthy instances for each service name. Instances register when they start and send heartbeats; an instance that stops sending them is removed.</p>
             <p>On platforms like Kubernetes, the platform does the registering for you, based on health probes.</p>`
    },
    {
      title: 'Client-side discovery',
      hide: ['lb', 'caller-i1', 'caller-i3'],
      slot: 850,
      flows: [
        { from: 'caller', to: 'reg', label: 'where is payments?', seq: 0 },
        { from: 'reg', to: 'caller', kind: 'res', label: '3 addresses', seq: 1 },
        { from: 'caller', to: 'i2', label: 'call', seq: 2 }
      ],
      body: `<p>The caller asks the registry, caches the list, and picks an instance itself. There's no extra hop and the client can balance load intelligently.</p>
             <p>But every service, in every language, needs a client library that does this correctly.</p>`
    },
    {
      title: 'Server-side discovery',
      hide: ['caller-i1', 'caller-i2', 'caller-i3', 'caller-reg'],
      slot: 850,
      flows: [
        { from: 'caller', to: 'lb', label: 'payments.internal', seq: 0 },
        { from: 'lb', to: 'i3', seq: 1 },
        { from: 'reg', to: 'i1', kind: 'res', stream: 1, period: 2400 }
      ],
      body: `<p>The caller sends requests to one stable name, which resolves to a load balancer or proxy that knows the healthy instances. Callers stay simple.</p>
             <p>A <strong>service mesh</strong> takes this further by running a proxy next to every instance, which handles discovery, retries, timeouts and mutual TLS without code changes.</p>`
    },
    {
      title: 'Stale entries',
      hide: ['lb', 'caller-i1', 'caller-reg'],
      states: { i2: 'down' },
      badges: { i2: 'died 4 s ago', reg: 'evicts after 3 missed beats' },
      slot: 850,
      flows: [
        { from: 'caller', to: 'i2', kind: 'err', label: 'no answer', seq: 0 },
        { from: 'caller', to: 'i3', label: 'retry elsewhere', seq: 1 },
        { from: 'i3', to: 'caller', kind: 'res', seq: 2 }
      ],
      body: `<p>There's always a gap between an instance dying and everyone's cached list noticing. DNS-based discovery is especially slow because clients cache records for their TTL.</p>
             <p>Callers should therefore expect stale entries: short timeouts, retry on a different instance, and drop an instance quickly after it fails. When shutting down on purpose, deregister first, then stop accepting work.</p>`,
      table: {
        head: ['Approach', 'Example', 'Trade-off'],
        rows: [
          ['DNS', 'Internal DNS names', 'Simple; slow to update (TTL caching)'],
          ['Client-side', 'Registry + client library', 'No extra hop; a library per language'],
          ['Server-side', 'Load balancer, platform service', 'Simple clients; one more hop'],
          ['Service mesh', 'Sidecar proxies', 'Rich features; more moving parts']
        ]
      }
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['sagas'] = {
  minutes: 8,
  diagram: {
    h: 500,
    nodes: [
      { id: 'orch', kind: 'gear', label: 'Checkout saga', sub: 'orchestrator', w: 180, x: 140, y: 250 },
      { id: 'ord', kind: 'server', label: 'Orders', x: 520, y: 70 },
      { id: 'inv', kind: 'server', label: 'Inventory', x: 520, y: 190 },
      { id: 'pay', kind: 'server', label: 'Payments', x: 520, y: 310 },
      { id: 'ship', kind: 'server', label: 'Shipping', x: 520, y: 430 },
      { id: 'bus', kind: 'queue', label: 'Event bus', w: 150, x: 810, y: 250 }
    ],
    edges: [['orch', 'ord'], ['orch', 'inv'], ['orch', 'pay'], ['orch', 'ship'], ['ord', 'bus'], ['inv', 'bus'], ['pay', 'bus'], ['ship', 'bus']]
  },
  steps: [
    {
      title: 'One action, four databases',
      hide: ['bus', 'orch'],
      focus: ['ord', 'inv', 'pay', 'ship'],
      badges: { ord: 'own DB', inv: 'own DB', pay: 'own DB', ship: 'own DB' },
      body: `<p>Placing an order means: create the order, reserve stock, charge the card, book shipping. In a monolith that's one transaction. With a database per service, there's no single transaction that covers all four.</p>
             <p>Distributed two-phase commit exists, but it holds locks across services while waiting, and a stalled coordinator blocks everyone. Most service-based systems avoid it.</p>`
    },
    {
      title: 'A saga: a chain of local transactions',
      hide: ['bus'],
      slot: 550,
      flows: [
        { from: 'orch', to: 'ord', label: 'create (pending)', seq: 0 }, { from: 'ord', to: 'orch', kind: 'res', seq: 1 },
        { from: 'orch', to: 'inv', label: 'reserve stock', seq: 2 }, { from: 'inv', to: 'orch', kind: 'res', seq: 3 },
        { from: 'orch', to: 'pay', label: 'charge card', seq: 4 }, { from: 'pay', to: 'orch', kind: 'res', seq: 5 },
        { from: 'orch', to: 'ship', label: 'book courier', seq: 6 }, { from: 'ship', to: 'orch', kind: 'res', seq: 7 }
      ],
      body: `<p>A <strong>saga</strong> breaks the work into steps. Each step is an ordinary local transaction in one service that commits on its own.</p>
             <p>Here an <strong>orchestrator</strong> drives the sequence and records progress after each step, so it can resume after a crash.</p>`
    },
    {
      title: 'Failure: compensate backwards',
      hide: ['bus', 'orch-ship'],
      slot: 750,
      states: { pay: 'down' },
      badges: { pay: 'card declined', inv: 'released', ord: 'cancelled' },
      flows: [
        { from: 'orch', to: 'pay', label: 'charge card', seq: 0 },
        { from: 'pay', to: 'orch', kind: 'err', label: 'declined', seq: 1 },
        { from: 'orch', to: 'inv', kind: 'warn', label: 'release stock', seq: 2 },
        { from: 'orch', to: 'ord', kind: 'warn', label: 'cancel order', seq: 3 }
      ],
      body: `<p>There's no rollback across services, so each step has a <strong>compensating action</strong> that semantically undoes it: release the stock, cancel the order, refund the charge.</p>
             <p>Compensation isn't invisible. For a moment other users may have seen the stock reserved or the order pending. Sagas give up isolation in exchange for availability.</p>`
    },
    {
      title: 'Choreography instead',
      hide: ['orch'],
      slot: 600,
      flows: [
        { from: 'ord', to: 'bus', label: 'OrderCreated', seq: 0 }, { from: 'bus', to: 'inv', seq: 1 },
        { from: 'inv', to: 'bus', label: 'StockReserved', seq: 2 }, { from: 'bus', to: 'pay', seq: 3 },
        { from: 'pay', to: 'bus', label: 'PaymentTaken', seq: 4 }, { from: 'bus', to: 'ship', seq: 5 }
      ],
      body: `<p>Without a central coordinator, each service listens for events and publishes its own when done. Services stay loosely coupled and there's no orchestrator to run.</p>
             <p>The flow is now implicit, scattered across services. That's fine for three steps; at ten steps, "what happens after payment?" becomes hard to answer.</p>`
    },
    {
      title: 'Rules that keep sagas sane',
      hide: ['bus'],
      focus: ['orch'],
      body: `<ul>
               <li><strong>Idempotent steps</strong>: messages get redelivered, and a step may run twice.</li>
               <li><strong>Compensations must eventually succeed</strong>: retry them until they do.</li>
               <li><strong>Pending states</strong>: mark records as pending so other code knows they may still be undone.</li>
               <li><strong>Order the steps</strong>: put the step that's most likely to fail, or hardest to undo, as late as you can. Emails go last.</li>
             </ul>`,
      table: {
        head: ['', 'Orchestration', 'Choreography'],
        rows: [
          ['Flow defined in', 'One place', 'Spread across services'],
          ['Coupling', 'Orchestrator knows every step', 'Services know only events'],
          ['Visibility', 'Easy to see state', 'Needs tracing'],
          ['Best for', 'Long or branching workflows', 'Short, simple chains']
        ]
      }
    },
    {
      title: 'Publishing reliably: the outbox',
      hide: ['orch'],
      slot: 900,
      badges: { ord: 'tx: order row + outbox row' },
      flows: [
        { from: 'ord', to: 'bus', label: 'relay publishes outbox', seq: 0 },
        { from: 'bus', to: 'inv', seq: 1 }
      ],
      body: `<p>Each step must update its database <em>and</em> publish an event. If the service crashes between the two, the saga stalls or lies.</p>
             <p>The <strong>outbox pattern</strong>: write the event into an outbox table in the same local transaction as the data change. A separate relay reads the outbox and publishes, retrying until it succeeds.</p>`,
      code: `BEGIN;
  INSERT INTO orders (id, status) VALUES (81, 'pending');
  INSERT INTO outbox (topic, payload) VALUES ('OrderCreated', '{"id":81}');
COMMIT;
-- relay: SELECT … FROM outbox WHERE sent = false → publish → mark sent`,
      tip: 'Treat a saga as a state machine you persist, not a sequence of calls. Every state needs a defined next step for success and for failure.'
    }
  ]
};

/* ------------------------------------------------------------------ */
LESSONS['batch-stream'] = {
  minutes: 7,
  diagram: {
    h: 480,
    nodes: [
      { id: 'src', kind: 'users', label: 'Click events', w: 160, x: 100, y: 240 },
      { id: 'log', kind: 'queue', label: 'Event log', x: 330, y: 240 },
      { id: 'lake', kind: 'blob', label: 'Data lake', sub: 'files by hour', w: 160, x: 570, y: 90 },
      { id: 'job', kind: 'timer', label: 'Nightly job', w: 160, x: 800, y: 90 },
      { id: 'proc', kind: 'gear', label: 'Stream job', sub: 'stateful', w: 160, x: 570, y: 390 },
      { id: 'view', kind: 'chart', label: 'Dashboards', w: 160, x: 800, y: 390 }
    ],
    edges: [['src', 'log'], ['log', 'lake'], ['lake', 'job'], ['log', 'proc'], ['proc', 'view'], ['job', 'view']]
  },
  steps: [
    {
      title: 'Data that keeps arriving',
      focus: ['src', 'log'],
      flows: [{ from: 'src', to: 'log', stream: 5, period: 1400 }],
      body: `<p>Clicks, payments, sensor readings and logs arrive continuously. You want to turn them into answers: daily revenue, fraud alerts, recommendations.</p>
             <p>There are two broad ways. Collect the data and process it in large chunks on a schedule (<strong>batch</strong>), or process each event as it arrives (<strong>stream</strong>).</p>`
    },
    {
      title: 'Batch: big, bounded, rerunnable',
      hide: ['proc'],
      slot: 1100,
      states: { job: 'hot' },
      badges: { job: '02:00 · reading 24 h of files' },
      flows: [
        { from: 'log', to: 'lake', seq: 0 },
        { from: 'lake', to: 'job', seq: 1 },
        { from: 'job', to: 'view', kind: 'res', label: 'yesterday’s report', seq: 2 }
      ],
      body: `<p>A batch job reads a fixed input, such as all of yesterday's files, computes a result and writes it out. The input doesn't change while it runs, so the job is simple to reason about.</p>
             <p>If there's a bug, fix the code and rerun it over the same input. Batch is very efficient at large volume. The cost is latency: answers are hours old.</p>`
    },
    {
      title: 'Stream: always on, seconds behind',
      hide: ['lake', 'job'],
      badges: { view: 'updated 1 s ago' },
      flows: [
        { from: 'src', to: 'log', stream: 4, period: 1300 },
        { from: 'log', to: 'proc', stream: 4, period: 1300, offset: 0.4 },
        { from: 'proc', to: 'view', kind: 'res', stream: 2, period: 1300, offset: 0.7 }
      ],
      body: `<p>A stream job runs continuously, reading events from the log and updating results as they arrive. Fraud gets flagged in seconds, and dashboards show the last minute.</p>
             <p>It's harder to build. The input never ends, so state such as running counts must survive restarts, and you have to decide when a result is "done".</p>`
    },
    {
      title: 'Time is tricky',
      hide: ['lake', 'job'],
      slot: 900,
      badges: { proc: 'window 12:00–12:05 · watermark 12:04' },
      flows: [
        { from: 'log', to: 'proc', label: '12:03', seq: 0 },
        { from: 'log', to: 'proc', label: '12:04', seq: 1 },
        { from: 'log', to: 'proc', kind: 'warn', label: '11:58 (late)', seq: 2 }
      ],
      body: `<p>Events carry the time they happened, but arrive later, sometimes much later (a phone offline in a tunnel). Counting "clicks per 5 minutes" by arrival time gives wrong answers.</p>
             <p>Stream processors group events into <strong>windows</strong> by event time, and use a <strong>watermark</strong>, an estimate of "we've probably seen everything up to 12:04", to decide when to emit a window. Very late events are dropped or used to correct an earlier result.</p>`
    },
    {
      title: 'Crash, restore, continue',
      hide: ['lake', 'job'],
      states: { proc: 'down' },
      badges: { proc: 'restart from checkpoint @ offset 88,120' },
      slot: 900,
      flows: [
        { from: 'log', to: 'proc', kind: 'warn', label: 'replay from 88,120', seq: 0 },
        { from: 'proc', to: 'view', kind: 'res', label: 'idempotent upsert', seq: 1 }
      ],
      body: `<p>Stream jobs periodically take a <strong>checkpoint</strong>: their state plus the log offset they had reached. After a crash they restore the checkpoint and replay from that offset.</p>
             <p>Some events are processed twice during replay. Writing results with idempotent upserts makes the output come out as if each event was processed exactly once.</p>`
    },
    {
      title: 'Choosing, or using both',
      flows: [
        { from: 'log', to: 'lake', stream: 1, period: 1800 },
        { from: 'log', to: 'proc', stream: 2, period: 1800, offset: 0.5 },
        { from: 'proc', to: 'view', kind: 'res', stream: 1, period: 1800 },
        { from: 'job', to: 'view', kind: 'res', stream: 1, period: 3600 }
      ],
      body: `<p>Many companies run both: streaming for fresh numbers and alerts, batch for accurate daily reports and model training. Another approach treats everything as a stream and reprocesses history by replaying the log.</p>`,
      table: {
        head: ['', 'Batch', 'Stream'],
        rows: [
          ['Input', 'Bounded (a day of files)', 'Unbounded (never ends)'],
          ['Latency', 'Minutes to hours', 'Milliseconds to seconds'],
          ['Fixing bugs', 'Rerun the job', 'Replay the log, handle state'],
          ['Hard parts', 'Scheduling, big shuffles', 'Late events, state, checkpoints'],
          ['Good for', 'Billing, reports, training', 'Alerts, fraud, live metrics']
        ]
      },
      tip: 'Ask how stale the answer may be. If hours are fine, batch is simpler and cheaper.'
    }
  ]
};
